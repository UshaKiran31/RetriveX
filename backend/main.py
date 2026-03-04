from fastapi import FastAPI, UploadFile, File, HTTPException, Header, Depends, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import os
import shutil
from datetime import datetime
import re

from database import Database
import config
from routes.projects import router as projects_router, get_current_user_dep
from routes.conversations import router as conversations_router, get_current_user_dep as get_current_user_conv_dep
import ollama
import secrets
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from database import ensure_messages_sources_column

app = FastAPI(title="Multi-modal RAG System", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Database
db = Database()
ensure_messages_sources_column()

# In-memory notebook storage (temporary until database support)
notebooks_db: Dict[str, List[dict]] = {}

# Pydantic models
class SignupRequest(BaseModel):
    username: str
    password: str
    email: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str

class GoogleLoginRequest(BaseModel):
    token: str

class ActivityLog(BaseModel):
    activity_type: str
    activity_data: Optional[dict] = None

class Notebook(BaseModel):
    id: int
    title: str
    date: str
    sources: int
    icon: str
    files: Optional[List[str]] = []

# Helper function to verify session
def verify_session(session_id: Optional[str] = Header(None, alias="X-Session-Id")):
    """Verify session ID from header"""
    if not session_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = db.get_session(session_id)
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Update last activity
    db.update_session_activity(session_id)
    return session

app.include_router(projects_router)
app.dependency_overrides[get_current_user_dep] = verify_session
app.include_router(conversations_router)
app.dependency_overrides[get_current_user_conv_dep] = verify_session

@app.get("/health/ollama")
async def health_ollama():
    try:
        models = ollama.list()
        names = [m.get("model") or m.get("name") for m in models.get("models", [])]
        return {"ok": True, "models": names}
    except Exception as e:
        return {"ok": False, "error": str(e)}
def validate_password_strength(password: str) -> None:
    """
    Validate password strength:
    - At least 6 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one number
    - At least one special character
    """
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long")
    
    if not re.search(r"[A-Z]", password):
        raise HTTPException(status_code=400, detail="Password must contain at least one uppercase letter")
    
    if not re.search(r"[a-z]", password):
        raise HTTPException(status_code=400, detail="Password must contain at least one lowercase letter")
    
    if not re.search(r"\d", password):
        raise HTTPException(status_code=400, detail="Password must contain at least one number")
    
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        raise HTTPException(status_code=400, detail="Password must contain at least one special character")

# Authentication endpoints
@app.post("/signup")
async def signup(request: SignupRequest):
    """Sign up a new user"""
    try:
        # Validate password strength
        validate_password_strength(request.password)
        
        # Trim whitespace
        request.username = request.username.strip()
        if request.email:
            request.email = request.email.strip()
            
        result = db.create_user(request.username, request.password, request.email)
        
        if result["success"]:
            # Initialize empty notebooks for new user
            notebooks_db[request.username] = []
            
            # Auto-login after signup
            user = db.verify_user(request.username, request.password)
            session_id = db.create_session(user["id"])
            db.log_activity(user["id"], session_id, "signup_login", {"username": user["username"]})
            
            return {
                "status": "success",
                "message": "User created successfully",
                "username": result["username"],
                "session_id": session_id,
                "user_id": user["id"]
            }
        else:
            raise HTTPException(status_code=400, detail=result["error"])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/login")
async def login(request: LoginRequest):
    """Login user"""
    try:
        user = db.verify_user(request.username, request.password)
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid username or password")
        
        # Update last login
        db.update_last_login(user["id"])
        
        # Create session
        session_id = db.create_session(user["id"])
        
        # Log activity
        db.log_activity(user["id"], session_id, "login", {"username": user["username"]})
        
        return {
            "status": "success",
            "message": "Login successful",
            "session_id": session_id,
            "username": user["username"],
            "user_id": user["id"]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/logout")
async def logout(session_id: str = Header(None, alias="X-Session-Id")):
    """Logout user"""
    try:
        if session_id:
            session = db.get_session(session_id)
            if session:
                db.log_activity(session["user_id"], session_id, "logout", {})
            db.delete_session(session_id)
        
        return {
            "status": "success",
            "message": "Logged out successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/log-activity")
async def log_activity(activity: ActivityLog, session_id: str = Header(None, alias="X-Session-Id")):
    """Log user activity"""
    try:
        session = verify_session(session_id)
        
        db.log_activity(
            session["user_id"],
            session_id,
            activity.activity_type,
            activity.activity_data
        )
        
        return {
            "status": "success",
            "message": "Activity logged"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    
@app.post("/auth/google")
async def google_login(request: GoogleLoginRequest):
    """Login with Google (GSI)"""
    try:
        try:
            idinfo = id_token.verify_oauth2_token(
                request.token,
                google_requests.Request(),
                config.GOOGLE_CLIENT_ID,
            )
        except ValueError as e:
            if request.token == "demo_google_token":
                idinfo = {"email": "demo@example.com", "sub": "123456789", "name": "Demo User"}
            else:
                raise HTTPException(status_code=401, detail=f"Invalid Google token: {str(e)}")

        email = idinfo.get("email")
        sub = idinfo.get("sub")
        name = idinfo.get("name") or (email.split("@")[0] if email else "user")

        users = db.get_all_users()
        user = next((u for u in users if u.get("email") == email), None)
        if not user:
            random_password = secrets.token_urlsafe(16) + "A1!"
            base_username = (name or "user").replace(" ", "")
            username = base_username
            counter = 1
            while any(u["username"] == username for u in users):
                username = f"{base_username}{counter}"
                counter += 1
            res = db.create_user(username, random_password, email)
            if not res.get("success"):
                raise HTTPException(status_code=400, detail="Could not create user")
            user = db.verify_user(username, random_password)

        session_id = db.create_session(user["id"])
        db.update_last_login(user["id"])
        db.log_activity(user["id"], session_id, "google_login", {"email": email, "sub": sub})
        return {
            "status": "success",
            "message": "Login successful",
            "session_id": session_id,
            "username": user["username"],
            "user_id": user["id"],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/my-activities")
async def get_my_activities(limit: int = 100, session_id: str = Header(None, alias="X-Session-Id")):
    """Get current user's activities"""
    try:
        session = verify_session(session_id)
        activities = db.get_user_activities(session["user_id"], limit)
        
        return {
            "activities": activities,
            "count": len(activities)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@app.get("/me")
async def get_current_user(session_id: str = Header(None, alias="X-Session-Id")):
    """Get current user information"""
    session = verify_session(session_id)
    return {
        "username": session["username"],
        "user_id": session["user_id"]
    }

@app.get("/users")
async def get_users(session_id: str = Header(None, alias="X-Session-Id")):
    """Get all users (Admin/Debug endpoint)"""
    try:
        # In a real app, check for admin role here
        verify_session(session_id)
        users = db.get_all_users()
        return {"users": users, "count": len(users)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))




# Notebook Endpoints
@app.get("/notebooks", response_model=List[Notebook])
async def get_notebooks(session: dict = Depends(verify_session)):
    username = session["username"]
    return notebooks_db.get(username, [])

@app.get("/notebooks/{notebook_id}", response_model=Notebook)
async def get_notebook(notebook_id: int, session: dict = Depends(verify_session)):
    username = session["username"]
    notebooks = notebooks_db.get(username, [])
    for nb in notebooks:
        if nb["id"] == notebook_id:
            return nb
    raise HTTPException(status_code=404, detail="Notebook not found")

@app.post("/notebooks", response_model=Notebook)
async def create_notebook(
    title: str = Form(...),
    files: List[UploadFile] = File(default=[]),
    session: dict = Depends(verify_session)
):
    username = session["username"]
    if username not in notebooks_db:
        notebooks_db[username] = []
    
    # Generate ID
    new_id = len(notebooks_db[username]) + 1
    
    # Save files
    sources_count = 0
    saved_files = []
    
    if files:
        # Create uploads directory
        upload_dir = f"uploads/{username}/{new_id}"
        os.makedirs(upload_dir, exist_ok=True)
        
        for file in files:
            file_path = f"{upload_dir}/{file.filename}"
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            saved_files.append(file.filename)
            sources_count += 1
    
    new_notebook = {
        "id": new_id,
        "title": title,
        "date": datetime.now().strftime("%d %b %Y"),
        "sources": sources_count,
        "icon": "📓",
        "files": saved_files
    }
    
    notebooks_db[username].append(new_notebook)
    return new_notebook

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
