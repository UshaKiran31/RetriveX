from langchain_chroma import Chroma
from langchain_community.embeddings import OllamaEmbeddings
import os


def _embedding():
    return OllamaEmbeddings(model="nomic-embed-text")

def create_vector_store(documents, persist_directory="dbv1/chroma_db"):
    os.makedirs(persist_directory, exist_ok=True)
    return Chroma.from_documents(
        documents=documents,
        embedding=_embedding(),
        persist_directory=persist_directory,
        collection_metadata={"hnsw:space": "cosine"},
    )

def load_vector_store(persist_directory="dbv1/chroma_db"):
    os.makedirs(persist_directory, exist_ok=True)
    return Chroma(
        embedding_function=_embedding(),
        persist_directory=persist_directory,
        collection_metadata={"hnsw:space": "cosine"},
    )

def count_vectors(persist_directory="dbv1/chroma_db"):
    """
    Best-effort count of vectors stored in the Chroma collection.
    """
    try:
        store = load_vector_store(persist_directory=persist_directory)
        data = store.get()
        ids = data.get("ids") if isinstance(data, dict) else None
        return len(ids) if ids is not None else 0
    except Exception:
        return 0
