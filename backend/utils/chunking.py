from unstructured.chunking.title import chunk_by_title


def create_chunks_by_title(elements):
    """
    Chunk elements by title. Image elements are preserved separately because
    chunk_by_title may drop them — they are appended after chunking.
    """
    # Separate out bare Image elements (e.g. extracted from DOCX)
    image_elements = [el for el in elements if "image" in el.__class__.__name__.lower()]
    non_image_elements = [el for el in elements if "image" not in el.__class__.__name__.lower()]

    chunks = chunk_by_title(
        non_image_elements,
        max_characters=3000,
        new_after_n_chars=2400,
        combine_text_under_n_chars=500,
    )

    # Append image elements as their own "chunks" so they get embedded
    return list(chunks) + image_elements


def _extract_from_element(element, content_data: dict, text_parts: list):
    """Extract text/table/image data from a single unstructured element."""
    # Image element: check metadata.image_base64 first, then the element itself
    md = getattr(element, "metadata", None)
    img = getattr(md, "image_base64", None) if md else None
    if img:
        content_data["images"].append(img)
        content_data["types"].append("image")
        return  # image elements — don't also add their placeholder text

    # Table element
    if md and hasattr(md, "text_as_html"):
        html = getattr(md, "text_as_html")
        if html:
            content_data["tables"].append(html)
            content_data["types"].append("table")

    # Text
    if hasattr(element, "text") and isinstance(getattr(element, "text"), str):
        val = element.text
        if val and val != "[embedded image]":
            text_parts.append(val)
            content_data["types"].append("text")


def separate_content_types(chunk):
    content_data = {"text": "", "tables": [], "images": [], "types": []}
    text_parts = []

    # Case 1: chunk is a raw element (e.g. Image injected directly)
    chunk_class = chunk.__class__.__name__.lower()
    if "image" in chunk_class:
        md = getattr(chunk, "metadata", None)
        img = getattr(md, "image_base64", None) if md else None
        if img:
            content_data["images"].append(img)
            content_data["types"] = ["image"]
            content_data["text"] = ""
            return content_data

    # Case 2: chunked element with orig_elements (normal path)
    orig_elements = getattr(getattr(chunk, "metadata", None), "orig_elements", []) or []
    if orig_elements:
        for element in orig_elements:
            _extract_from_element(element, content_data, text_parts)
    else:
        # Case 3: no orig_elements — treat chunk itself as an element
        _extract_from_element(chunk, content_data, text_parts)

    if not text_parts and hasattr(chunk, "text"):
        val = getattr(chunk, "text")
        if isinstance(val, str) and val and val != "[embedded image]":
            text_parts.append(val)
            if "text" not in content_data["types"]:
                content_data["types"].append("text")

    content_data["text"] = "\n".join([p for p in text_parts if p])
    content_data["types"] = list(set(content_data["types"]))
    return content_data

