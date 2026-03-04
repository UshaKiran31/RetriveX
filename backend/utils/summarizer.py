import json
import os
from langchain_core.documents import Document
from utils.llm import call_llm
from utils.chunking import separate_content_types


def create_ai_enhanced_summary(text: str, tables: list[str], images: list[str]) -> str:
    prompt_text = "You are creating a searchable description for document content retrieval.\n\n"
    prompt_text += "CONTENT TO ANALYZE:\n"
    prompt_text += "TEXT CONTENT:\n"
    prompt_text += f"{text}\n\n"
    if tables:
        prompt_text += "TABLES:\n"
        for i, table in enumerate(tables):
            prompt_text += f"Table {i+1}:\n{table}\n\n"
    prompt = "Generate a comprehensive, searchable description that covers key facts, topics, questions the content could answer, and alternative search terms users might use."
    parts = []
    for token in call_llm(prompt_text, prompt):
        parts.append(token)
    return "".join(parts) if parts else text


def summarise_chunks(chunks, project_id: int = None, document_id: int = None, filename: str = None):
    docs = []
    total = len(chunks)
    
    # Update initial metrics if document_id is provided
    if project_id and document_id:
        update_metrics(project_id, document_id, "summarisation", {"status": "processing", "processed": 0, "total": total})

    for i, chunk in enumerate(chunks):
        content = separate_content_types(chunk)
        if content["tables"] or content["images"]:
            try:
                enhanced = create_ai_enhanced_summary(content["text"], content["tables"], content["images"])
            except Exception:
                enhanced = content["text"]
        else:
            enhanced = content["text"]
        
        page_number = getattr(getattr(chunk, "metadata", {}), "page_number", None)
        doc = Document(
            page_content=enhanced,
            metadata={
                "project_id": project_id,
                "document_id": document_id,
                "chunk_id": i,
                "page_number": page_number,
                "filename": filename,
                "original_content": json.dumps(
                    {
                        "raw_text": content["text"],
                        "tables_html": content["tables"],
                        "images_base64": content["images"],
                    }
                )
            },
        )
        docs.append(doc)
        
        # Update progress metrics
        if project_id and document_id:
            update_metrics(project_id, document_id, "summarisation", {
                "status": "processing" if i < total - 1 else "completed",
                "processed": i + 1,
                "total": total
            })
            
    return docs

def update_metrics(project_id: int, document_id: int, step: str, data: dict):
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    metrics_dir = os.path.join(base_dir, "data", "projects", str(project_id), "metrics")
    os.makedirs(metrics_dir, exist_ok=True)
    metrics_path = os.path.join(metrics_dir, f"document_{document_id}.json")

    current_metrics = {}
    if os.path.exists(metrics_path):
        with open(metrics_path, "r", encoding="utf-8") as f:
            try:
                current_metrics = json.load(f)
            except Exception:
                current_metrics = {}

    current_metrics[step] = data
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(current_metrics, f, ensure_ascii=False, indent=2)
