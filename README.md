# RetrieveX

A offline Multi-Modal Retrieval-Augmented Generation (RAG) system. Upload PDFs, DOCX files, images, audio, and spreadsheets — then query them in natural language using local AI models. Your data never leaves your machine.

---

## What it does

RetrieveX lets you build knowledge bases from heterogeneous documents and chat with them. It automatically detects the file type, processes it through the appropriate pipeline, and routes your query to either semantic vector search or direct tabular analysis depending on what you're asking.

---

## Features

- Multi-modal ingestion: PDF, DOCX, CSV/Excel, Images (OCR), Audio (Whisper transcription)
- Smart query routing: semantic RAG for conceptual questions, Pandas-based analysis for numerical/statistical queries
- Source attribution: every answer cites the exact chunk, page, and document it came from
- Project-based organisation: group documents into isolated projects with separate vector stores
- Streaming responses: token-by-token LLM output via SSE
- Processing pipeline visibility: real-time metrics for partitioning, chunking, summarisation, and vectorisation stages
- Auth: username/password with strong validation + Google OAuth
- Session management and activity logging
- Fully Dockerized: one command to run everything

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS, Framer Motion, Three.js, Zustand |
| Backend | FastAPI, Python 3.11, SQLAlchemy, SQLite |
| AI / Embeddings | Ollama (llama3.2:3b), nomic-embed-text |
| Vector Store | ChromaDB (cosine similarity) |
| Document Parsing | Unstructured, pdfminer, python-docx |
| OCR | Tesseract via pytesseract |
| Audio | OpenAI Whisper (local, offline) |
| Tabular | Pandas |
| Containerisation | Docker, docker-compose, Nginx |

---

## Project Structure

```
RAG system/
├── backend/
│   ├── main.py                  # FastAPI app, auth endpoints
│   ├── database.py              # SQLite ORM + session management
│   ├── config.py                # Env-based configuration
│   ├── models.py                # SQLAlchemy models (Project, Conversation, Message, Document)
│   ├── schemas.py               # Pydantic schemas
│   ├── routes/
│   │   ├── projects.py          # Project + document CRUD, upload, processing
│   │   └── conversations.py     # Chat, streaming, semantic search
│   ├── utils/
│   │   ├── pipeline.py          # Core processing orchestrator
│   │   ├── chunking.py          # Title-based chunking via Unstructured
│   │   ├── vectorbase.py        # ChromaDB create/load/count
│   │   ├── summarizer.py        # LLM-based chunk summarisation
│   │   ├── qa.py                # Context builder for RAG
│   │   ├── llm.py               # Ollama streaming wrapper
│   │   ├── query_router.py      # Classifies query as semantic vs analytical
│   │   └── tabular_query.py     # Pandas query execution
│   ├── loaders/
│   │   ├── pdf_loader.py        # Hi-res PDF partitioning with table/image extraction
│   │   ├── docx_loader.py       # DOCX partitioning + embedded image extraction
│   │   ├── audio_loader.py      # Whisper transcription with timestamp segments
│   │   ├── image_loader.py      # Tesseract OCR + base64 encoding
│   │   └── tabular_loader.py    # CSV/Excel → Pandas DataFrame
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Router, auth state, layout
│   │   ├── pages/               # ProjectsDashboard, ProjectWorkspace, reports, etc.
│   │   ├── components/          # ChatWindow, MessageBubble, KnowledgeBasePanel, etc.
│   │   └── api/axios.js         # Axios instance with session header injection
│   ├── Dockerfile
│   └── nginx.conf               # SPA routing + API proxy
├── docker-compose.yml
└── .env
```

---

## How the RAG Pipeline Works

```
Upload File
    │
    ▼
Modality Detection
    ├── PDF / DOCX  → Unstructured partitioning → Title-based chunking → LLM summarisation → ChromaDB
    ├── Image       → Tesseract OCR → single chunk → ChromaDB
    ├── Audio       → Whisper transcription → 2400-char time-window chunks → ChromaDB
    └── CSV / Excel → Pandas DataFrame → saved as JSON (no vectorisation)

Query
    │
    ▼
Query Router (classify_query)
    ├── "analytical" + tabular data exists → Pandas query → table/scalar result
    └── "semantic" (default)               → ChromaDB k-NN → LLM streaming answer
```

---

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- At least 8 GB RAM (Whisper + LLM models are memory-hungry)
- ~10 GB disk space for models

### 1. Clone the repo

```bash
git clone https://github.com/UshaKiran31/RetriveX.git
cd RetriveX
```

### 2. Configure environment

Copy and edit the `.env` file:

```bash
cp .env .env.local
```

Set your Google OAuth client ID if you want Google login (optional):

```
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

### 3. Build and start

```bash
docker-compose up --build
```

This starts three containers:
- `retrievex-frontend` — React app served by Nginx on port 3000
- `retrievex-backend` — FastAPI on port 8000
- `retrievex-ollama` — Ollama LLM server on port 11434

### 4. Pull the required models (first time only)

Wait for containers to be up, then run:

```bash
# LLM for generation
docker exec -it retrievex-ollama ollama pull llama3.2:3b

# Embedding model
docker exec -it retrievex-ollama ollama pull nomic-embed-text
```

### 5. Open the app

Navigate to [http://localhost:3000](http://localhost:3000)

---

## Running Without Docker (Development)

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

Make sure Ollama is running locally with the required models pulled.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The dev server starts at [http://localhost:5173](http://localhost:5173).

---

## API Overview

All endpoints require `X-Session-Id` header after login (except `/login`, `/signup`, `/auth/google`).

| Method | Endpoint | Description |
|---|---|---|
| POST | `/signup` | Register a new user |
| POST | `/login` | Authenticate, returns session ID |
| POST | `/auth/google` | Google OAuth login |
| POST | `/logout` | Invalidate session |
| GET | `/me` | Get current user info |
| POST | `/projects` | Create a project |
| GET | `/projects` | List user's projects |
| POST | `/projects/{id}/upload` | Upload a document (async processing) |
| GET | `/projects/{id}/documents` | List documents and their status |
| GET | `/projects/{id}/documents/{doc_id}/metrics` | Processing pipeline metrics |
| POST | `/projects/{id}/conversations` | Create a conversation |
| POST | `/projects/{id}/chat/stream` | Send a message, get streaming response |
| POST | `/projects/{id}/search` | Semantic search with similarity scores |
| GET | `/projects/{id}/settings` | Get project LLM settings |
| PUT | `/projects/{id}/settings` | Update model, embedding, top_k |

Full interactive docs available at [http://localhost:8000/docs](http://localhost:8000/docs) when running.

---

## Supported File Types

| Type | Extensions | Processing |
|---|---|---|
| Documents | `.pdf`, `.docx`, `.doc` | Unstructured partitioning, table/image extraction |
| Spreadsheets | `.csv`, `.xlsx`, `.xls` | Pandas DataFrame, analytical query routing |
| Images | `.png`, `.jpg`, `.jpeg`, `.bmp`, `.tiff`, `.gif`, `.webp` | Tesseract OCR |
| Audio | `.mp3`, `.mp4`, `.wav`, `.m4a`, `.ogg`, `.flac`, `.webm`, `.aac`, `.wma` | Whisper transcription |

---

## Configuration

All config is driven by environment variables (see `.env`):

| Variable | Default | Description |
|---|---|---|
| `EMBEDDING_MODEL` | `all-MiniLM-L6-v2` | Sentence transformer model |
| `UPLOAD_DIR` | `./data/uploads` | File upload directory |
| `VECTOR_DB_PATH` | `./data/vector_db` | ChromaDB persistence path |
| `LOGS_DIR` | `./logs` | Application logs |
| `MAX_TOKENS` | `512` | LLM max output tokens |
| `TEMPERATURE` | `0.7` | LLM sampling temperature |
| `TOP_K` | `5` | Default retrieval top-k |
| `GOOGLE_CLIENT_ID` | — | Google OAuth client ID |

Per-project model settings (model name, embedding model, top_k) can be changed from the project workspace UI and are stored in `data/projects/{id}/settings.json`.

---

## Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (`!@#$%^&*` etc.)

---

## Roadmap

- Real-time collaborative notebooks
- Video file support
- Advanced graphical visualisations for tabular query results
- Support for additional local LLMs (Mistral, Phi, Gemma)
- Enhanced OCR with layout-aware models

---

## License

Academic project — Major Project submission.
