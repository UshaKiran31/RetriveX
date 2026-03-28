import os
import json
from datetime import datetime

from utils.loaders import partition_document, is_tabular
from utils.chunking import create_chunks_by_title, separate_content_types
from utils.summarizer import summarise_chunks, update_metrics
from utils.vectorbase import create_vector_store, load_vector_store, count_vectors
from utils.qa import build_context_from_chunks
from utils.llm import call_llm
from loaders import tabular_loader
from loaders.audio_loader import SUPPORTED as AUDIO_EXTENSIONS
from loaders.image_loader import SUPPORTED as IMAGE_EXTENSIONS


def is_audio(file_path: str) -> bool:
    return os.path.splitext(file_path)[1].lower() in AUDIO_EXTENSIONS


def is_image(file_path: str) -> bool:
    return os.path.splitext(file_path)[1].lower() in IMAGE_EXTENSIONS


def _project_base_dir(project_id: int) -> str:
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    proj_dir = os.path.join(base_dir, "data", "projects", str(project_id))
    os.makedirs(proj_dir, exist_ok=True)
    return proj_dir


def process_tabular_document(file_path: str, project_id: int, document_id: int = None):
    if document_id:
        update_metrics(project_id, document_id, "queued", {"status": "completed"})
        update_metrics(project_id, document_id, "partitioning", {"status": "processing"})
    
    # 1. Partitioning: parse the CSV header and extract metadata
    df = tabular_loader.load(file_path)
    tabular_loader.save_dataframe(df, project_id, document_id)
    rows, cols = df.shape
    
    # Extract data types and missing values info
    dtypes = {c: str(t) for c, t in df.dtypes.items()}
    missing_stats = df.isnull().sum().to_dict()
    
    # 2. Summary (metadata): generate a concise metadata block
    summary_text = (
        f" **Tabular Data Summary: {os.path.basename(file_path)}**\n\n"
        f"- **Rows:** {rows}\n"
        f"- **Columns:** {cols}\n"
        f"- **Column Names:** {', '.join(df.columns)}\n"
        f"- **Data Types:** {', '.join([f'{c} ({t})' for c, t in dtypes.items()])}\n"
        f"- **Missing Values:** {sum(missing_stats.values())} total"
    )

    if document_id:
        update_metrics(project_id, document_id, "partitioning", {
            "status": "completed", 
            "rows": rows, 
            "columns": cols,
            "column_names": list(df.columns),
            "missing_values": missing_stats
        })
        
        # 4. Skip Chunking, Summarisation, Vectorization entirely by marking them as completed for tabular data
        update_metrics(project_id, document_id, "chunking", {"status": "completed", "reason": "tabular data (skipped)"})
        update_metrics(project_id, document_id, "summarisation", {"status": "completed", "reason": "tabular data (skipped)"})
        update_metrics(project_id, document_id, "vectorization", {"status": "completed", "reason": "tabular data (skipped)"})
        update_metrics(project_id, document_id, "view_chunks", {"status": "completed", "reason": "tabular data (skipped)"})

    project_dir = _project_base_dir(project_id)
    schema_path = os.path.join(project_dir, "tabular_schema.json")
    existing = {}
    if os.path.exists(schema_path):
        try:
            with open(schema_path, "r", encoding="utf-8") as f:
                existing = json.load(f)
        except Exception:
            existing = {}
    existing[str(document_id)] = {
        "file_path": file_path,
        "filename": os.path.basename(file_path),
        "columns": list(df.columns),
        "dtypes": dtypes,
        "shape": [rows, cols],
        "summary": summary_text
    }
    with open(schema_path, "w", encoding="utf-8") as f:
        json.dump(existing, f, ensure_ascii=False, indent=2)

    # 5. Return metadata summary and interactive table
    # Return more rows for client-side interaction (e.g., first 500 rows)
    return summary_text, df.head(500).to_dict(orient="records")


def process_image_document(file_path: str, project_id: int, document_id: int = None):
    """
    OCR an image with pytesseract, embed the extracted text + image as a single chunk.
    """
    from loaders.image_loader import load as image_load
    from langchain_core.documents import Document as LCDocument

    if document_id:
        update_metrics(project_id, document_id, "queued", {"status": "completed"})
        update_metrics(project_id, document_id, "partitioning", {"status": "processing"})

    result = image_load(file_path)
    text = result["text"] or f"[Image: {os.path.basename(file_path)}]"
    b64 = result["image_base64"]
    mime = result["mime"]

    if document_id:
        update_metrics(project_id, document_id, "partitioning", {
            "status": "completed",
            "characters": len(text),
            "width": result["width"],
            "height": result["height"],
            "has_text": bool(result["text"]),
        })
        update_metrics(project_id, document_id, "chunking", {
            "status": "completed",
            "atomic_elements": 1,
            "chunks_created": 1,
            "average_chunk_size_chars": len(text),
        })
        update_metrics(project_id, document_id, "summarisation", {
            "status": "completed", "processed": 1, "total": 1
        })

    # Save chunk JSON for pipeline modal
    fname = os.path.basename(file_path)
    project_dir = _project_base_dir(project_id)
    if document_id:
        chunks_dir = os.path.join(project_dir, "chunks")
        os.makedirs(chunks_dir, exist_ok=True)
        chunk_entry = {
            "id": 0, "type": "image", "types": ["image", "text"] if result["text"] else ["image"],
            "content": text,
            "image_url": f"data:{mime};base64,{b64}",
            "metadata": {"page": 1},
        }
        with open(os.path.join(chunks_dir, f"document_{document_id}.json"), "w") as f:
            json.dump([chunk_entry], f)

    vec_dir = os.path.join(project_dir, "vector_store")
    lc_doc = LCDocument(
        page_content=text,
        metadata={
            "project_id": project_id if project_id is not None else -1,
            "document_id": document_id if document_id is not None else -1,
            "source": fname,
            "filename": fname,
            "page_number": 1,
            "chunk_id": 0,
            "original_content": json.dumps({
                "raw_text": text,
                "tables_html": [],
                "images_base64": [b64],
            }),
        },
    )

    if document_id:
        update_metrics(project_id, document_id, "vectorization", {
            "status": "processing", "started_at": datetime.utcnow().isoformat() + "Z",
        })

    before_count = count_vectors(persist_directory=vec_dir)
    started = datetime.utcnow()
    create_vector_store([lc_doc], persist_directory=vec_dir)
    after_count = count_vectors(persist_directory=vec_dir)
    duration_ms = int((datetime.utcnow() - started).total_seconds() * 1000)

    if document_id:
        update_metrics(project_id, document_id, "vectorization", {
            "status": "completed",
            "embedded": 1, "total": 1,
            "model": "nomic-embed-text",
            "distance_metric": "cosine",
            "collection_count_before": before_count,
            "collection_count_after": after_count,
            "persist_directory": vec_dir,
            "ended_at": datetime.utcnow().isoformat() + "Z",
            "duration_ms": duration_ms,
        })


def process_audio_document(file_path: str, project_id: int, document_id: int = None):
    """
    Transcribe audio with Whisper, chunk the transcript by time window,
    embed each chunk exactly like a PDF text chunk.
    """
    from loaders.audio_loader import transcribe
    from langchain_core.documents import Document as LCDocument

    if document_id:
        update_metrics(project_id, document_id, "queued", {"status": "completed"})
        update_metrics(project_id, document_id, "partitioning", {"status": "processing"})

    # 1. Transcribe
    segments = transcribe(file_path)
    total_segments = len(segments)
    full_text = " ".join(s["text"] for s in segments)

    if document_id:
        update_metrics(project_id, document_id, "partitioning", {
            "status": "completed",
            "segments": total_segments,
            "duration_seconds": round(segments[-1]["end"], 1) if segments else 0,
            "characters": len(full_text),
        })
        update_metrics(project_id, document_id, "chunking", {"status": "processing"})

    # 2. Chunk: group segments into ~2400-char windows (mirrors PDF chunking)
    CHUNK_TARGET = 2400
    chunks_data = []
    buf_text = []
    buf_start = segments[0]["start"] if segments else 0.0
    buf_chars = 0

    def _flush(buf_text, buf_start, buf_end, idx):
        return {
            "id": idx,
            "type": "text",
            "types": ["text"],
            "content": " ".join(buf_text),
            "metadata": {
                "start": buf_start,
                "end": buf_end,
                "timestamp": f"{int(buf_start // 60):02d}:{int(buf_start % 60):02d}",
            },
        }

    chunk_idx = 0
    for seg in segments:
        buf_text.append(seg["text"])
        buf_chars += len(seg["text"])
        if buf_chars >= CHUNK_TARGET:
            chunks_data.append(_flush(buf_text, buf_start, seg["end"], chunk_idx))
            chunk_idx += 1
            buf_text = []
            buf_start = seg["end"]
            buf_chars = 0

    if buf_text:
        last_end = segments[-1]["end"] if segments else 0.0
        chunks_data.append(_flush(buf_text, buf_start, last_end, chunk_idx))

    # Save chunks JSON (for pipeline modal)
    if document_id:
        project_dir = _project_base_dir(project_id)
        chunks_dir = os.path.join(project_dir, "chunks")
        os.makedirs(chunks_dir, exist_ok=True)
        with open(os.path.join(chunks_dir, f"document_{document_id}.json"), "w") as f:
            json.dump(chunks_data, f)
        update_metrics(project_id, document_id, "chunking", {
            "status": "completed",
            "atomic_elements": total_segments,
            "chunks_created": len(chunks_data),
            "average_chunk_size_chars": int(sum(len(c["content"]) for c in chunks_data) / len(chunks_data)) if chunks_data else 0,
        })
        update_metrics(project_id, document_id, "summarisation", {
            "status": "processing", "processed": 0, "total": len(chunks_data)
        })

    # 3. Build LangChain Documents and embed (no AI summary needed — transcript is already clean text)
    fname = os.path.basename(file_path)
    project_dir = _project_base_dir(project_id)
    vec_dir = os.path.join(project_dir, "vector_store")
    lc_docs = []
    for i, c in enumerate(chunks_data):
        lc_docs.append(LCDocument(
            page_content=c["content"],
            metadata={
                "project_id": project_id if project_id is not None else -1,
                "document_id": document_id if document_id is not None else -1,
                "source": fname,
                "filename": fname,
                "page_number": None,
                "chunk_id": i,
                "timestamp": c["metadata"]["timestamp"],
                "start": c["metadata"]["start"],
                "end": c["metadata"]["end"],
                "original_content": json.dumps({
                    "raw_text": c["content"],
                    "tables_html": [],
                    "images_base64": [],
                    "timestamp": c["metadata"]["timestamp"],
                }),
            },
        ))
        if document_id:
            update_metrics(project_id, document_id, "summarisation", {
                "status": "processing" if i < len(chunks_data) - 1 else "completed",
                "processed": i + 1,
                "total": len(chunks_data),
            })

    if document_id:
        update_metrics(project_id, document_id, "vectorization", {
            "status": "processing", "started_at": datetime.utcnow().isoformat() + "Z",
        })

    before_count = count_vectors(persist_directory=vec_dir)
    started = datetime.utcnow()
    create_vector_store(lc_docs, persist_directory=vec_dir)
    after_count = count_vectors(persist_directory=vec_dir)
    duration_ms = int((datetime.utcnow() - started).total_seconds() * 1000)

    if document_id:
        update_metrics(project_id, document_id, "vectorization", {
            "status": "completed",
            "embedded": len(lc_docs),
            "total": len(lc_docs),
            "model": "nomic-embed-text",
            "distance_metric": "cosine",
            "collection_count_before": before_count,
            "collection_count_after": after_count,
            "persist_directory": vec_dir,
            "ended_at": datetime.utcnow().isoformat() + "Z",
            "duration_ms": duration_ms,
        })


def process_document(file_path: str, project_id: int, document_id: int = None):
    if is_tabular(file_path):
        process_tabular_document(file_path, project_id, document_id)
        return
    project_dir = _project_base_dir(project_id)
    vec_dir = os.path.join(project_dir, "vector_store")
    if document_id:
        update_metrics(project_id, document_id, "queued", {"status": "completed"})
        update_metrics(project_id, document_id, "partitioning", {"status": "processing"})
    elements = partition_document(file_path)
    if document_id:
        counts = {"text_sections": 0, "tables": 0, "images": 0, "titles_headers": 0, "other_elements": 0}
        for el in elements:
            t = el.__class__.__name__.lower()
            if "table" in t: counts["tables"] += 1
            elif "image" in t: counts["images"] += 1
            elif "title" in t: counts["titles_headers"] += 1
            elif "text" in t: counts["text_sections"] += 1
            else: counts["other_elements"] += 1
        update_metrics(project_id, document_id, "partitioning", {"status": "completed", **counts})
        update_metrics(project_id, document_id, "chunking", {"status": "processing"})
    chunks = create_chunks_by_title(elements)
    if document_id:
        chunks_dir = os.path.join(project_dir, "chunks")
        os.makedirs(chunks_dir, exist_ok=True)
        chunks_data = []
        total_chars = 0
        for i, chunk in enumerate(chunks):
            content = separate_content_types(chunk)
            chunk_type = "table" if "table" in content["types"] else ("image" if "image" in content["types"] else "text")
            entry = {
                "id": i, "type": chunk_type,
                "types": content.get("types") or [chunk_type],
                "content": content["text"],
                "metadata": {"page": getattr(getattr(chunk, "metadata", {}), "page_number", None)},
            }
            if content.get("tables"): entry["table_html"] = content["tables"][0]
            if content.get("images"): entry["image_url"] = f"data:image/png;base64,{content['images'][0]}"
            chunks_data.append(entry)
            total_chars += len(content["text"])
        with open(os.path.join(chunks_dir, f"document_{document_id}.json"), "w") as f:
            json.dump(chunks_data, f)
        update_metrics(project_id, document_id, "chunking", {
            "status": "completed",
            "atomic_elements": len(elements),
            "chunks_created": len(chunks),
            "average_chunk_size_chars": int(total_chars / len(chunks)) if chunks else 0,
        })
    fname = os.path.basename(file_path) if isinstance(file_path, str) else None
    summarised_chunks = summarise_chunks(chunks, project_id, document_id, fname)
    if document_id:
        update_metrics(project_id, document_id, "vectorization", {
            "status": "processing", "started_at": datetime.utcnow().isoformat() + "Z",
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
            "duration_ms": duration_ms,
        })


def load_project_vector_store(project_id: int):
    project_dir = _project_base_dir(project_id)
    vec_dir = os.path.join(project_dir, "vector_store")
    return load_vector_store(persist_directory=vec_dir)


def ask_question(project_id: int, question: str, model: str = "llama3.2:3b"):
    from utils.query_router import classify_query
    from utils.tabular_query import run_tabular_query

    qnorm = (question or "").lower().strip()
    if qnorm in ("hi", "hello", "hey", "hlo"):
        yield "Hello! How can I help you with your documents?"
        return

    project_dir = _project_base_dir(project_id)
    schema_path = os.path.join(project_dir, "tabular_schema.json")
    has_tabular = os.path.exists(schema_path)
    vec_dir = os.path.join(project_dir, "vector_store")
    has_vector = os.path.exists(vec_dir) and bool(os.listdir(vec_dir))

    query_type = classify_query(question)

    if query_type == "analytical" and has_tabular:
        with open(schema_path, "r", encoding="utf-8") as f:
            schema = json.load(f)
        for doc_id_str, meta in schema.items():
            try:
                df = tabular_loader.load_dataframe(project_id, int(doc_id_str))
                result = run_tabular_query(df, question, model=model)
                if result["type"] == "error":
                    # Fall through to RAG silently
                    break
                elif result["type"] == "table":
                    payload = json.dumps({
                        "tabular_result": True,
                        "columns": result.get("columns", []),
                        "data": result["data"],
                        "summary": result.get("summary", ""),
                        "source": meta["filename"],
                        "code": result.get("code", ""),
                    })
                    yield f"__TABULAR__{payload}"
                    return
                else:
                    payload = json.dumps({
                        "tabular_result": True,
                        "scalar": True,
                        "summary": result.get("summary") or result["data"],
                        "raw": result["data"],
                        "source": meta["filename"],
                        "code": result.get("code", ""),
                    })
                    yield f"__TABULAR__{payload}"
                    return
            except Exception:
                break  # fall through to RAG

    # Semantic RAG (default + fallback when tabular fails)
    top_k = 3
    try:
        settings_path = os.path.join(project_dir, "settings.json")
        if os.path.exists(settings_path):
            with open(settings_path, "r", encoding="utf-8") as sf:
                data = json.load(sf) or {}
                top_k = max(1, min(20, int(data.get("top_k", 3))))
    except Exception:
        top_k = 3

    try:
        db = load_project_vector_store(project_id)
    except Exception:
        yield "No indexed documents found. Please upload and wait for processing to complete."
        return

    # Use similarity_search_with_score for score-filtered retrieval
    SIMILARITY_THRESHOLD = 0.30
    raw = db.similarity_search_with_score(question, k=top_k)
    chunks = []
    for doc, dist in raw:
        similarity = max(0.0, 1.0 - (dist / 2.0))
        if similarity >= SIMILARITY_THRESHOLD:
            chunks.append(doc)
    # Sort best-first (raw already sorted by distance ascending, so this is already best-first)
    if not chunks:
        # Fall back to top result even if below threshold rather than returning nothing
        chunks = [raw[0][0]] if raw else []

    context_text = build_context_from_chunks(chunks)
    for token in call_llm(context_text, question):
        yield token
