from fastapi import FastAPI, UploadFile, File, HTTPException, Header, Depends, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import os
import shutil
from datetime import datetime
import re
import secrets
import logging
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

# Configure logging
logging.basicConfig(level=logging.INFO)
app_logger = logging.getLogger(__name__)

from database import Database
import config
from agents.orchestrator import AgentOrchestrator
from utils.vector_store import VectorStore
from utils.rag_pipeline import RAGPipeline
from utils.logger import QueryLogger

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
orchestrator = AgentOrchestrator()
logger = QueryLogger(log_dir=config.LOGS_DIR)

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

def validate_password_strength(password: str) -> None:
    """
    Validate password strength:
    - At least 6 characters
    - At least one uppercase letter
    - At least one number
    - At least one special character
    """
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")
    
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

@app.post("/auth/google")
async def google_login(request: GoogleLoginRequest):
    """Login with Google"""
    app_logger.info(f"Received Google login request with token length: {len(request.token)}")
    try:
        # Verify the token
        try:
            idinfo = id_token.verify_oauth2_token(
                request.token, 
                google_requests.Request(), 
                config.GOOGLE_CLIENT_ID
            )
            app_logger.info(f"Token verified for email: {idinfo.get('email')}")
            
        except ValueError as e:
            app_logger.warning(f"Token verification failed: {e}")
            # For demo purposes, if the token is just "demo_google_token", we can mock a user
            # This is NOT SECURE and just for avoiding blocks if user doesn't have a real client ID set up
            if request.token == "demo_google_token":
                app_logger.info("Using demo token")
                idinfo = {
                    "email": "demo@example.com",
                    "sub": "123456789",
                    "name": "Demo User"
                }
            else:
                raise HTTPException(status_code=401, detail=f"Invalid Google token: {str(e)}")

        email = idinfo['email']
        google_id = idinfo['sub']
        name = idinfo.get('name', email.split('@')[0])
        
        # Check if user exists by email
        # We might need to extend Database class to find by email or google_id
        # For now, let's just use username as email if it doesn't exist
        
        # This is a hacky way to find user by email since we don't have that method exposed in `db` variable here
        # ideally we should add `get_user_by_email` to Database class.
        # I'll check if `get_all_users` can be used or I'll just create a new user if not found (with a random password)
        
        users = db.get_all_users()
        user = next((u for u in users if u.get("email") == email), None)
        
        if not user:
            app_logger.info(f"User not found for email {email}, creating new user")
            # Create new user
            # Generate a random secure password
            # import secrets # Moved to top
            random_password = secrets.token_urlsafe(16) + "A1!" # Ensure it meets complexity
            
            # Username might be taken, so we might need to append numbers
            base_username = name.replace(" ", "")
            username = base_username
            counter = 1
            while any(u['username'] == username for u in users):
                username = f"{base_username}{counter}"
                counter += 1
                
            res = db.create_user(username, random_password, email)
            if not res["success"]:
                 app_logger.error(f"Failed to create user: {res.get('error')}")
                 raise HTTPException(status_code=400, detail="Could not create user")
            
            # Get the new user
            user = db.verify_user(username, random_password)
        
        # Create session
        session_id = db.create_session(user["id"])
        db.update_last_login(user["id"])
        db.log_activity(user["id"], session_id, "google_login", {"email": email})
        
        app_logger.info(f"Login successful for user {user['username']}")
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
        app_logger.error(f"Google login error: {str(e)}")
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
    saved_paths = []
    
    if files:
        # Create uploads directory
        upload_dir = f"{config.UPLOAD_DIR}/{username}/{new_id}"
        os.makedirs(upload_dir, exist_ok=True)
        
        for file in files:
            file_path = f"{upload_dir}/{file.filename}"
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            saved_files.append(file.filename)
            saved_paths.append(file_path)
            sources_count += 1
    
    # Ingest into per-notebook vector store
    if saved_paths:
        vs_path = os.path.join(config.VECTOR_DB_PATH, username, str(new_id))
        vector_store = VectorStore(db_path=vs_path, model_name=config.EMBEDDING_MODEL)
        docs, metas = orchestrator.process_files(saved_paths)
        if docs:
            vector_store.add_documents(docs, metas)
    
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

class ChatRequest(BaseModel):
    notebook_id: int
    question: str
    top_k: Optional[int] = config.TOP_K

@app.post("/notebooks/{notebook_id}/files", response_model=Notebook)
async def add_files_to_notebook(
    notebook_id: int,
    files: List[UploadFile] = File(...),
    session: dict = Depends(verify_session)
):
    try:
        username = session["username"]
        notebooks = notebooks_db.get(username, [])
        nb = next((n for n in notebooks if n["id"] == notebook_id), None)
        if not nb:
            raise HTTPException(status_code=404, detail="Notebook not found")
        
        upload_dir = f"{config.UPLOAD_DIR}/{username}/{notebook_id}"
        os.makedirs(upload_dir, exist_ok=True)
        saved_paths = []
        for file in files:
            file_path = f"{upload_dir}/{file.filename}"
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            nb.setdefault("files", []).append(file.filename)
            saved_paths.append(file_path)
            nb["sources"] = (nb.get("sources") or 0) + 1
        
        if saved_paths:
            vs_path = os.path.join(config.VECTOR_DB_PATH, username, str(notebook_id))
            vector_store = VectorStore(db_path=vs_path, model_name=config.EMBEDDING_MODEL)
            docs, metas = orchestrator.process_files(saved_paths)
            if docs:
                vector_store.add_documents(docs, metas)
        
        return nb
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/notebooks/{notebook_id}/chat")
async def get_notebook_chat(notebook_id: int, session: dict = Depends(verify_session)):
    """Get chat history for a notebook"""
    username = session["username"]
    notebooks = notebooks_db.get(username, [])
    if not any(n["id"] == notebook_id for n in notebooks):
        raise HTTPException(status_code=404, detail="Notebook not found")
    
    return db.get_chat_messages(notebook_id)

@app.post("/chat")
async def chat(req: ChatRequest, session: dict = Depends(verify_session)):
    try:
        username = session["username"]
        notebooks = notebooks_db.get(username, [])
        nb = next((n for n in notebooks if n["id"] == req.notebook_id), None)
        if not nb:
            raise HTTPException(status_code=404, detail="Notebook not found")
        
        # Save User Message
        db.create_chat_message(req.notebook_id, "user", req.question)
        
        vs_path = os.path.join(config.VECTOR_DB_PATH, username, str(req.notebook_id))
        vector_store = VectorStore(db_path=vs_path, model_name=config.EMBEDDING_MODEL)
        rag = RAGPipeline(
            model_path=config.MODEL_PATH,
            vector_store=vector_store,
            logger=logger,
            max_tokens=config.MAX_TOKENS,
            temperature=config.TEMPERATURE
        )
        result = rag.query(req.question, top_k=req.top_k or config.TOP_K)
        
        # Save Assistant Message
        db.create_chat_message(req.notebook_id, "assistant", result["answer"])
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
