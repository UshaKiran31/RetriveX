# RetriveX – Offline Multi-Modal Retrieval-Augmented Generation System

RetriveX is a fully offline **Multi-Modal Retrieval-Augmented Generation (RAG)** system that enables intelligent querying across heterogeneous data sources such as documents, images, and audio files using natural language.  
It combines semantic search with local Large Language Models (LLMs) to deliver accurate, context-aware, and source-grounded responses while ensuring complete data privacy.

---

## Key Features

- Fully **offline AI processing** (no cloud or external APIs)
- Multi-modal support: **PDF, DOCX, Images (OCR), Audio**
- Semantic search using **FAISS vector database**
- Retrieval-Augmented Generation to reduce hallucinations
- **Source attribution** for explainable answers
- Modular **agent-based architecture**
- Query history and basic audit logging

---

## System Architecture (High Level)

1. File Upload  
2. Modality-specific Processing Agents  
   - Text extraction / OCR / Speech-to-Text  
3. Text Chunking & Embedding Generation  
4. FAISS Vector Storage  
5. Natural Language Query → Semantic Search  
6. Context-aware Answer Generation using Local LLM  

---

## Technologies Used

### Core Technologies
- **Python** – Backend and AI pipelines
- **FastAPI** – Backend API
- **FAISS** – Vector similarity search
- **Sentence-Transformers** – Embedding generation (all-MiniLM-L6-v2)
- **Retrieval-Augmented Generation (RAG)**

### AI & Processing Tools
- **Local LLMs** (e.g., Mistral, LLaMA, Qwen)
- **Whisper** – Offline speech-to-text
- **Tesseract OCR** – Image text extraction

### Frontend
- **React.js**

---

## Supported File Types

- `.pdf`
- `.docx`
- Image files (OCR enabled)
- Audio files (speech-to-text enabled)

---

## 1. System Overview Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        A[React Frontend<br/>Port 3000]
        B[HTML Dashboard]
        C[Landing Page]
    end
    
    subgraph "API Gateway"
        D[FastAPI Server<br/>Port 8000]
        E[CORS Middleware]
        F[Auth Middleware]
    end
    
    subgraph "Business Logic"
        G[Agent Orchestrator]
        H[RAG Pipeline]
        I[Vector Store Manager]
        J[Query Logger]
    end
    
    subgraph "Data Agents"
        K[PDF Agent]
        L[DOCX Agent]
        M[Image Agent<br/>Tesseract OCR]
        N[Audio Agent<br/>Whisper]
    end
    
    subgraph "AI/ML Layer"
        O[Embedding Model<br/>all-MiniLM-L6-v2<br/>384 dims]
        P[LLM Generator<br/>Qwen2.5-0.5B<br/>1GB model]
        Q[FAISS Vector DB]
    end
    
    subgraph "Storage Layer"
        R[(SQLite DB<br/>Users & Auth)]
        S[File Storage<br/>uploads/]
        T[Logs<br/>JSON Lines]
    end
    
    A --> E
    B --> E
    C --> E
    E --> D
    D --> F
    F --> G
    F --> H
    
    G --> K
    G --> L
    G --> M
    G --> N
    
    K --> O
    L --> O
    M --> O
    N --> O
    
    H --> I
    I --> Q
    H --> P
    H --> J
    
    O --> Q
    
    G --> S
    D --> R
    J --> T
    
    style A fill:#e1f5ff
    style D fill:#fff4e1
    style G fill:#ffe1f5
    style O fill:#e1ffe1
    style P fill:#e1ffe1
    style Q fill:#ffe1e1
```

---


## 2. Data Flow Diagram

```mermaid
flowchart LR
    subgraph Input
        A1[PDF Files]
        A2[DOCX Files]
        A3[Images]
        A4[Audio Files]
    end
    
    subgraph Extraction
        B1[PyPDF2<br/>Text Extraction]
        B2[python-docx<br/>Text Extraction]
        B3[Tesseract OCR<br/>Image to Text]
        B4[Whisper<br/>Speech to Text]
    end
    
    subgraph Preprocessing
        C1[Text Chunking<br/>Paragraph Split]
        C2[Metadata Creation<br/>file, type, timestamp]
        C3[Text Normalization]
    end
    
    subgraph Embedding
        D1[Sentence Transformer<br/>all-MiniLM-L6-v2]
        D2[Vector Conversion<br/>384 dimensions]
    end
    
    subgraph Storage
        E1[FAISS Index<br/>Similarity Search]
        E2[Document Store<br/>Original Text]
        E3[Metadata Store<br/>JSON]
    end
    
    subgraph Query
        F1[User Question]
        F2[Question Embedding]
        F3[Vector Search<br/>Cosine Similarity]
        F4[Top-K Retrieval]
    end
    
    subgraph Generation
        G1[Context Builder<br/>600 char limit]
        G2[Prompt Template]
        G3[Qwen2.5-0.5B LLM]
        G4[Response Formatting]
    end
    
    subgraph Output
        H1[Answer Text]
        H2[Source Citations]
        H3[Confidence Score]
    end
    
    A1 --> B1
    A2 --> B2
    A3 --> B3
    A4 --> B4
    
    B1 --> C1
    B2 --> C1
    B3 --> C1
    B4 --> C1
    
    C1 --> C2
    C2 --> C3
    C3 --> D1
    D1 --> D2
    D2 --> E1
    D2 --> E2
    C2 --> E3
    
    F1 --> F2
    F2 --> F3
    E1 --> F3
    F3 --> F4
    
    F4 --> G1
    E2 --> G1
    G1 --> G2
    G2 --> G3
    G3 --> G4
    
    G4 --> H1
    E3 --> H2
    F4 --> H3
    
    style D1 fill:#90EE90
    style E1 fill:#FFB6C1
    style G3 fill:#87CEEB
```

---

## 3. Agent Processing Pipeline

```mermaid
graph TD
    Start([File Upload]) --> Router{File Type?}
    
    Router -->|.pdf| PDF[PDF Agent]
    Router -->|.docx/.doc| DOCX[DOCX Agent]
    Router -->|.png/.jpg| IMG[Image Agent]
    Router -->|.mp3/.wav| AUD[Audio Agent]
    
    PDF --> PDF1[PyPDF2<br/>Extract Text]
    PDF1 --> PDF2[Split Pages]
    PDF2 --> Merge
    
    DOCX --> DOCX1[python-docx<br/>Read Document]
    DOCX1 --> DOCX2[Extract Paragraphs]
    DOCX2 --> DOCX3[Preserve Formatting]
    DOCX3 --> Merge
    
    IMG --> IMG1[Tesseract OCR<br/>Image Preprocessing]
    IMG1 --> IMG2[Text Recognition]
    IMG2 --> IMG3[Confidence Check]
    IMG3 --> Merge
    
    AUD --> AUD1[Load Audio File]
    AUD1 --> AUD2[Whisper Model<br/>Speech Recognition]
    AUD2 --> AUD3[Transcription]
    AUD3 --> Merge
    
    Merge[Merge Results] --> Meta[Add Metadata<br/>filename, type, timestamp]
    Meta --> Chunk[Chunk Text<br/>By Paragraphs]
    Chunk --> Embed[Generate Embeddings<br/>384d vectors]
    Embed --> Store[Store in Vector DB]
    Store --> End([Processing Complete])
    
    style PDF fill:#FFE5E5
    style DOCX fill:#E5F5FF
    style IMG fill:#FFE5FF
    style AUD fill:#FFFFE5
    style Embed fill:#E5FFE5
    style Store fill:#FFE5D5
```

---


## Functional Capabilities

- Upload and manage multi-modal files
- Automatic file type detection and processing
- Semantic search using natural language queries
- Context-grounded answer generation
- Source document and timestamp referencing
- Query history tracking

---

##  Architecture 
## Agent System Each file type has a dedicated agent:
- **PDFAgent**: Extracts text from PDF pages
-  **DOCXAgent**: Parses Word documents
- **ImageAgent**: OCR text extraction from images
- **AudioAgent**: Speech-to-text transcription
- **Orchestrator**: Routes files to appropriate agents

 ## RAG Pipeline
 1. **Ingestion**: Files → Agents → Text chunks
2. **Embedding**: Text → Sentence-Transformers → Vectors
3. **Storage**: Vectors → FAISS index
4. **Retrieval**: Query → Top-K similar chunks
5. **Generation**: Context + Query → LLM → Answer

## Vector Store 
- Uses FAISS for efficient similarity search
-  Stores embeddings with metadata (file type, source, timestamps)
- Persists index to disk for offline operation

## System Requirements

- Python 3.9+
- Sufficient RAM for local LLM execution
- Pre-downloaded AI models (offline usage)

---

## How to Run (Basic)

```bash
# Clone the repository
git clone <repository-url>
cd RetriveX

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the backend
uvicorn main:app --reload

