import json
from utils.llm import call_llm


def build_context_from_chunks(chunks):
    parts = []
    print([doc.metadata for doc in chunks])
    
    grouped = {}
    for chunk in chunks:
        source = chunk.metadata.get("source", "Unknown Document")
        if source not in grouped:
            grouped[source] = []
        grouped[source].append(chunk)

    for source, source_chunks in grouped.items():
        parts.append(f"--- Source: {source} ---\n")
        for chunk in source_chunks:
            page = chunk.metadata.get("page", "Unknown")
            chunk_id = chunk.metadata.get("chunk_id", "Unknown")
            parts.append(f"[Page {page}, Chunk {chunk_id}]\n")
            
            data = {}
            if "original_content" in chunk.metadata:
                try:
                    data = json.loads(chunk.metadata["original_content"])
                except Exception:
                    pass
            
            raw_text = data.get("raw_text", "")
            if raw_text:
                parts.append(f"TEXT:\n{raw_text}\n\n")
            
            tables = data.get("tables_html", [])
            if tables:
                parts.append("TABLES:\n")
                for j, table in enumerate(tables):
                    parts.append(f"Table {j+1}:\n{table}\n\n")
        parts.append("\n")
    return "".join(parts)


def stream_answer(chunks, query: str):
    context_text = build_context_from_chunks(chunks)
    for token in call_llm(context_text, query):
        yield token


def retrieve(db, query: str, k: int = 3):
    retriever = db.as_retriever(search_kwargs={"k": k})
    return retriever.invoke(query)

