import os
from dotenv import load_dotenv

load_dotenv()

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.getenv("MODEL_PATH", "./models/mistral-7b-instruct-v0.1.Q4_K_M.gguf")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./data/uploads")
VECTOR_DB_PATH = os.getenv("VECTOR_DB_PATH", "./data/vector_db")
LOGS_DIR = os.getenv("LOGS_DIR", "./logs")

# API - Hardcoded to port 8001
API_HOST = "0.0.0.0"
API_PORT = 8001
MAX_FILE_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", 25))  # 25MB limit

# Model Config
MAX_TOKENS = int(os.getenv("MAX_TOKENS", 512))
TEMPERATURE = float(os.getenv("TEMPERATURE", 0.7))
TOP_K = int(os.getenv("TOP_K", 5))

# Create directories
for directory in [UPLOAD_DIR, VECTOR_DB_PATH, LOGS_DIR]:
    os.makedirs(directory, exist_ok=True)

# Auth
GOOGLE_CLIENT_ID = os.getenv(
    "GOOGLE_CLIENT_ID",
    "356131392279-hr59pjv0jqnt1efbvk1jdqbp2g1veqdj.apps.googleusercontent.com",
)

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".csv", ".xlsx", ".xls",
                      ".mp3", ".mp4", ".wav", ".m4a", ".ogg", ".flac", ".webm", ".aac", ".wma",
                      ".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".tif", ".gif", ".webp"}
