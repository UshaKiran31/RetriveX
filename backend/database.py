import sqlite3
import hashlib
import uuid
from datetime import datetime
from typing import Optional, List, Dict
import json
import os

class Database:
    def __init__(self, db_path: str = "./data/users.db"):
        self.db_path = db_path
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        self.init_db()
    
    def get_connection(self):
        return sqlite3.connect(self.db_path)
    
    def init_db(self):
        """Initialize database tables"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Users table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                email TEXT,
                created_at TEXT NOT NULL,
                last_login TEXT
            )
        """)
        
        # Sessions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                session_id TEXT UNIQUE NOT NULL,
                created_at TEXT NOT NULL,
                last_activity TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        
        # Activity logs table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS activity_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                session_id TEXT NOT NULL,
                activity_type TEXT NOT NULL,
                activity_data TEXT,
                timestamp TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        
        conn.commit()
        conn.close()
    
    def hash_password(self, password: str) -> str:
        """Hash password using SHA-256"""
        return hashlib.sha256(password.encode()).hexdigest()
    
    def create_user(self, username: str, password: str, email: Optional[str] = None) -> Dict:
        """Create a new user"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            password_hash = self.hash_password(password)
            created_at = datetime.now().isoformat()
            
            cursor.execute(
                "INSERT INTO users (username, password_hash, email, created_at) VALUES (?, ?, ?, ?)",
                (username, password_hash, email, created_at)
            )
            conn.commit()
            user_id = cursor.lastrowid
            
            return {
                "success": True,
                "user_id": user_id,
                "username": username
            }
        except sqlite3.IntegrityError:
            return {
                "success": False,
                "error": "Username already exists"
            }
        finally:
            conn.close()
    
    def verify_user(self, username: str, password: str) -> Optional[Dict]:
        """Verify user credentials"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        password_hash = self.hash_password(password)
        cursor.execute(
            "SELECT id, username, email FROM users WHERE username = ? AND password_hash = ?",
            (username, password_hash)
        )
        
        user = cursor.fetchone()
        conn.close()
        
        if user:
            return {
                "id": user[0],
                "username": user[1],
                "email": user[2]
            }
        return None
    
    def update_last_login(self, user_id: int):
        """Update user's last login time"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            "UPDATE users SET last_login = ? WHERE id = ?",
            (datetime.now().isoformat(), user_id)
        )
        conn.commit()
        conn.close()
    
    def create_session(self, user_id: int) -> str:
        """Create a new session for user"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        session_id = str(uuid.uuid4())
        now = datetime.now().isoformat()
        
        cursor.execute(
            "INSERT INTO sessions (user_id, session_id, created_at, last_activity) VALUES (?, ?, ?, ?)",
            (user_id, session_id, now, now)
        )
        conn.commit()
        conn.close()
        
        return session_id
    
    def get_session(self, session_id: str) -> Optional[Dict]:
        """Get session information"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            """SELECT s.user_id, s.created_at, u.username 
               FROM sessions s 
               JOIN users u ON s.user_id = u.id 
               WHERE s.session_id = ?""",
            (session_id,)
        )
        
        session = cursor.fetchone()
        conn.close()
        
        if session:
            return {
                "user_id": session[0],
                "created_at": session[1],
                "username": session[2]
            }
        return None
    
    def update_session_activity(self, session_id: str):
        """Update session's last activity timestamp"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            "UPDATE sessions SET last_activity = ? WHERE session_id = ?",
            (datetime.now().isoformat(), session_id)
        )
        conn.commit()
        conn.close()
    
    def log_activity(self, user_id: int, session_id: str, activity_type: str, activity_data: Optional[Dict] = None):
        """Log user activity"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        data_json = json.dumps(activity_data) if activity_data else None
        
        cursor.execute(
            "INSERT INTO activity_logs (user_id, session_id, activity_type, activity_data, timestamp) VALUES (?, ?, ?, ?, ?)",
            (user_id, session_id, activity_type, data_json, datetime.now().isoformat())
        )
        conn.commit()
        conn.close()
    
    def get_user_activities(self, user_id: int, limit: int = 100) -> List[Dict]:
        """Get user's activity history"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            """SELECT activity_type, activity_data, timestamp 
               FROM activity_logs 
               WHERE user_id = ? 
               ORDER BY timestamp DESC 
               LIMIT ?""",
            (user_id, limit)
        )
        
        activities = cursor.fetchall()
        conn.close()
        
        return [
            {
                "activity_type": row[0],
                "activity_data": json.loads(row[1]) if row[1] else None,
                "timestamp": row[2]
            }
            for row in activities
        ]
    
    def get_all_users(self) -> List[Dict]:
        """Get all users (admin only)"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT id, username, email, created_at, last_login FROM users ORDER BY created_at DESC")
        users = cursor.fetchall()
        conn.close()
        
        return [
            {
                "id": row[0],
                "username": row[1],
                "email": row[2],
                "created_at": row[3],
                "last_login": row[4]
            }
            for row in users
        ]

    def delete_session(self, session_id: str):
        """Delete a session (logout)"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM sessions WHERE session_id = ?", (session_id,))
        conn.commit()
        conn.close()

from sqlalchemy import create_engine, event, MetaData
from sqlalchemy.orm import sessionmaker, DeclarativeBase
import os as _os

_naming_convention = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}

class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=_naming_convention)

def _default_sqlite_url():
    base_dir = _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))
    data_dir = _os.path.join(base_dir, "data")
    _os.makedirs(data_dir, exist_ok=True)
    return f"sqlite:///{_os.path.join(data_dir, 'users.db')}"

def _make_engine():
    url = _os.getenv("DATABASE_URL") or _default_sqlite_url()
    if url.startswith("sqlite"):
        engine = create_engine(url, future=True, pool_pre_ping=True, echo=False, connect_args={"check_same_thread": False})
        def _fk_on(dbapi_con, con_record):
            cursor = dbapi_con.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()
        event.listen(engine, "connect", _fk_on)
        return engine
    return create_engine(url, future=True, pool_pre_ping=True, echo=False)

engine = _make_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Lightweight startup migration to add 'sources_json' column to messages if missing
def ensure_messages_sources_column():
    try:
        import sqlite3 as _sqlite3
        url = _os.getenv("DATABASE_URL") or _default_sqlite_url()
        if url.startswith("sqlite:///"):
            db_path = url.replace("sqlite:///", "")
            conn = _sqlite3.connect(db_path)
            cur = conn.cursor()
            cur.execute("PRAGMA table_info(messages)")
            cols = [row[1] for row in cur.fetchall()]
            if "sources_json" not in cols:
                cur.execute("ALTER TABLE messages ADD COLUMN sources_json TEXT")
                conn.commit()
            conn.close()
    except Exception:
        pass
