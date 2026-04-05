from unstructured.chunking.title import chunk_by_title


def create_chunks_by_title(elements):
    """
    Chunk elements by title, ensuring images and tables are kept with their context.
    """
    chunks = chunk_by_title(
        elements,
        max_characters=3000,
        new_after_n_chars=2400,
        combine_text_under_n_chars=500,
        multipage_sections=True,
    )

    return list(chunks)


def _extract_from_element(element, content_data: dict, text_parts: list):
    """Extract text/table/image data from a single unstructured element."""
    md = getattr(element, "metadata", None)
    img = getattr(md, "image_base64", None) if md else None
    
    # Check if the element itself has image data or if it's an Image element
    is_image_el = "image" in element.__class__.__name__.lower()
    
    if img:
        content_data["images"].append(img)
        content_data["types"].append("image")
        if is_image_el:
            return  # Image elements: don't add their placeholder text if we have the image

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

    # Case 1: normal path with orig_elements (CompositeElement)
    md = getattr(chunk, "metadata", None)
    orig_elements = getattr(md, "orig_elements", []) if md else []
    
    if orig_elements:
        for element in orig_elements:
            _extract_from_element(element, content_data, text_parts)
    else:
        # Case 2: no orig_elements — treat chunk itself as an element
        _extract_from_element(chunk, content_data, text_parts)

    # Fallback: if we still have no text but the chunk has text, use it
    if not text_parts and hasattr(chunk, "text"):
        val = getattr(chunk, "text")
        if isinstance(val, str) and val and val != "[embedded image]":
            text_parts.append(val)
            if "text" not in content_data["types"]:
                content_data["types"].append("text")

    content_data["text"] = "\n".join([p for p in text_parts if p]).strip()
    content_data["types"] = list(set(content_data["types"]))
    return content_data

