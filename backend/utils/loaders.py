"""
Central loader dispatcher — routes to the correct format-specific loader
based on file extension.
"""
import os
from loaders import pdf_loader, docx_loader
from loaders.tabular_loader import SUPPORTED as TABULAR_EXTENSIONS

# Extensions handled by the unstructured pipeline (text/table/image → vector DB)
_UNSTRUCTURED_LOADERS = {
    ".pdf": pdf_loader.load,
    ".docx": docx_loader.load,
    ".doc": docx_loader.load,
}


def is_tabular(file_path: str) -> bool:
    return os.path.splitext(file_path)[1].lower() in TABULAR_EXTENSIONS


def partition_document(file_path: str):
    """
    Dispatch to the correct loader and return unstructured elements.
    Raises ValueError for unsupported or tabular formats (tabular files
    must be handled separately via the tabular pipeline).
    """
    ext = os.path.splitext(file_path)[1].lower()
    if ext in TABULAR_EXTENSIONS:
        raise ValueError(
            f"Tabular file ({ext}) must be processed via the tabular pipeline, not partition_document."
        )
    loader_fn = _UNSTRUCTURED_LOADERS.get(ext)
    if loader_fn is None:
        raise ValueError(f"Unsupported file type: {ext}")
    return loader_fn(file_path)
