import os
import json
from utils.loaders import partition_document
from utils.chunking import create_chunks_by_title, separate_content_types
from utils.summarizer import summarise_chunks, update_metrics
from utils.vectorbase import create_vector_store, load_vector_store, count_vectors
from utils.qa import build_context_from_chunks
from utils.llm import call_llm
from datetime import datetime


def run_complete_ingestion_pipeline(pdf_path: str, persist_directory="dbv1/chroma_db"):
    elements = partition_document(pdf_path)
    chunks = create_chunks_by_title(elements)
    summarised_chunks = summarise_chunks(chunks, filename=os.path.basename(pdf_path) if isinstance(pdf_path, str) else None)
    db = create_vector_store(summarised_chunks, persist_directory=persist_directory)
    return db

def _project_base_dir(project_id: int) -> str:
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    proj_dir = os.path.join(base_dir, "data", "projects", str(project_id))
    os.makedirs(proj_dir, exist_ok=True)
    return proj_dir

def process_document(file_path: str, project_id: int, document_id: int = None):
    project_dir = _project_base_dir(project_id)
    vec_dir = os.path.join(project_dir, "vector_store")
    
    # 1. Queued
    if document_id:
        update_metrics(project_id, document_id, "queued", {"status": "completed"})
        update_metrics(project_id, document_id, "partitioning", {"status": "processing"})

    # 2. Partitioning
    elements = partition_document(file_path)
    
    if document_id:
        # Categorize elements for metrics
        counts = {
            "text_sections": 0, "tables": 0, "images": 0, 
            "titles_headers": 0, "other_elements": 0
        }
        for el in elements:
            type_name = el.__class__.__name__.lower()
            if "table" in type_name: counts["tables"] += 1
            elif "image" in type_name: counts["images"] += 1
            elif "title" in type_name: counts["titles_headers"] += 1
            elif "text" in type_name: counts["text_sections"] += 1
            else: counts["other_elements"] += 1
            
        update_metrics(project_id, document_id, "partitioning", {
            "status": "completed", 
            **counts
        })
        update_metrics(project_id, document_id, "chunking", {"status": "processing"})

    # 3. Chunking
    chunks = create_chunks_by_title(elements)
    
    if document_id:
        # Save chunks to disk for the "View Chunks" tab
        chunks_dir = os.path.join(project_dir, "chunks")
        os.makedirs(chunks_dir, exist_ok=True)
        chunks_data = []
        total_chars = 0
        
        for i, chunk in enumerate(chunks):
            content = separate_content_types(chunk)
            chunk_type = "text"
            if "table" in content["types"]: chunk_type = "table"
            elif "image" in content["types"]: chunk_type = "image"
            
            chunk_entry = {
                "id": i,
                "type": chunk_type,
                "types": content.get("types") or [chunk_type],
                "content": content["text"],
                "metadata": {
                    "page": getattr(getattr(chunk, "metadata", {}), "page_number", None)
                }
            }
            if content.get("tables"):
                chunk_entry["table_html"] = content["tables"][0]
            if content.get("images"):
                chunk_entry["image_url"] = f"data:image/png;base64,{content['images'][0]}"
                
            chunks_data.append(chunk_entry)
            total_chars += len(content["text"])
            
        with open(os.path.join(chunks_dir, f"document_{document_id}.json"), "w") as f:
            json.dump(chunks_data, f)
            
        update_metrics(project_id, document_id, "chunking", {
            "status": "completed",
            "atomic_elements": len(elements),
            "chunks_created": len(chunks),
            "average_chunk_size_chars": int(total_chars / len(chunks)) if chunks else 0
        })

    # 4. Summarisation
    fname = os.path.basename(file_path) if isinstance(file_path, str) else None
    summarised_chunks = summarise_chunks(chunks, project_id, document_id, fname)
    
    # 5. Vectorization
    if document_id:
        update_metrics(project_id, document_id, "vectorization", {
            "status": "processing",
            "started_at": datetime.utcnow().isoformat() + "Z"
        })
        
    before_count = count_vectors(persist_directory=vec_dir)
    started = datetime.utcnow()
    create_vector_store(summarised_chunks, persist_directory=vec_dir)
    after_count = count_vectors(persist_directory=vec_dir)
    duration_ms = int((datetime.utcnow() - started).total_seconds() * 1000)
    
    if document_id:
        update_metrics(project_id, document_id, "vectorization", {
            "status": "completed",
            "embedded": len(summarised_chunks),
            "total": len(summarised_chunks),
            "model": "nomic-embed-text",
            "distance_metric": "cosine",
            "collection_count_before": before_count,
            "collection_count_after": after_count,
            "persist_directory": vec_dir,
            "ended_at": datetime.utcnow().isoformat() + "Z",
            "duration_ms": duration_ms
        })

def load_project_vector_store(project_id: int):
    project_dir = _project_base_dir(project_id)
    vec_dir = os.path.join(project_dir, "vector_store")
    return load_vector_store(persist_directory=vec_dir)

def ask_question(project_id: int, question: str):
    qnorm = (question or "").lower().strip()
    if qnorm in ("hi", "hello", "hey", "hlo"):
        yield "Hello!  How can I help you with your notebook documents?"
        return
    db = load_project_vector_store(project_id)
    # Load settings for top_k if present
    top_k = 3
    try:
        settings_path = os.path.join(_project_base_dir(project_id), "settings.json")
        if os.path.exists(settings_path):
            with open(settings_path, "r", encoding="utf-8") as sf:
                data = json.load(sf) or {}
                tk = int(data.get("top_k", 3))
                top_k = max(1, min(20, tk))
    except Exception:
        top_k = 3
    retriever = db.as_retriever(search_kwargs={"k": top_k})
    chunks = retriever.invoke(question)
    context_text = build_context_from_chunks(chunks)
    for token in call_llm(context_text, question):
        yield token
