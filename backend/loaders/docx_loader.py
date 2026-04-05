"""
DOCX loader with image extraction.

partition_docx does not support extract_image_block_to_payload like partition_pdf,
so we extract images directly from the DOCX zip container and inject them as
synthetic Image elements alongside the normal partitioned elements.
"""
import base64
import io
import os
import zipfile
from typing import List

from unstructured.partition.docx import partition_docx
from unstructured.partition.doc import partition_doc
from unstructured.documents.elements import Image as UnstructuredImage, ElementMetadata


def _extract_images_from_docx(file_path: str) -> List[str]:
    """
    Pull every image out of the DOCX (which is a zip) and return
    a list of base64-encoded strings.
    """
    images_b64 = []
    if not zipfile.is_zipfile(file_path):
        return images_b64
        
    try:
        with zipfile.ZipFile(file_path, "r") as z:
            for name in z.namelist():
                # Images live under word/media/
                if name.startswith("word/media/") and not name.endswith("/"):
                    ext = os.path.splitext(name)[1].lower()
                    if ext in (".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tiff", ".webp", ".emf", ".wmf"):
                        data = z.read(name)
                        images_b64.append(base64.b64encode(data).decode("utf-8"))
    except Exception:
        pass
    return images_b64


def _make_image_element(b64: str, page_number: int = None) -> UnstructuredImage:
    """Wrap a base64 string in an unstructured Image element."""
    md = ElementMetadata()
    md.image_base64 = b64
    if page_number is not None:
        md.page_number = page_number
    el = UnstructuredImage(text="[embedded image]", metadata=md)
    return el


def load(file_path: str):
    """
    Partition a DOCX or DOC file.
    Returns a combined list of unstructured elements.
    """
    ext = os.path.splitext(file_path)[1].lower()
    
    if ext == ".doc":
        try:
            # Note: partition_doc requires libreoffice or pandoc installed in the environment
            elements = partition_doc(
                filename=file_path,
                infer_table_structure=True,
            )
        except Exception as e:
            print(f"Error partitioning legacy .doc file: {e}")
            # Fallback to partition_docx in case it's actually a docx with a doc extension
            try:
                elements = partition_docx(filename=file_path, infer_table_structure=True)
            except Exception:
                raise ValueError(f"Failed to process .doc file. Legacy .doc files require LibreOffice/Pandoc. Error: {e}")
    else:
        elements = partition_docx(
            filename=file_path,
            infer_table_structure=True,
        )

    # Image extraction only works for modern .docx (ZIP format)
    if ext == ".docx" or zipfile.is_zipfile(file_path):
        images_b64 = _extract_images_from_docx(file_path)
        if images_b64:
            # Try to guess a page number from the last text element
            last_page = None
            for el in reversed(elements):
                pn = getattr(getattr(el, "metadata", None), "page_number", None)
                if pn is not None:
                    last_page = pn
                    break
            for b64 in images_b64:
                elements.append(_make_image_element(b64, page_number=last_page))

    return elements
