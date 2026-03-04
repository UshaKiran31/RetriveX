from unstructured.chunking.title import chunk_by_title


def create_chunks_by_title(elements):
    return chunk_by_title(
        elements,
        max_characters=3000,
        new_after_n_chars=2400,
        combine_text_under_n_chars=500,
    )


def separate_content_types(chunk):
    content_data = {"text": "", "tables": [], "images": [], "types": []}
    text_parts = []
    orig_elements = getattr(getattr(chunk, "metadata", None), "orig_elements", []) or []
    for element in orig_elements:
        if hasattr(element, "text") and isinstance(getattr(element, "text"), str):
            text_parts.append(element.text)
            content_data["types"].append("text")
        md = getattr(element, "metadata", None)
        if md and hasattr(md, "text_as_html"):
            html = getattr(md, "text_as_html")
            if html:
                content_data["tables"].append(html)
                content_data["types"].append("table")
        if md and hasattr(md, "image_base64"):
            img = getattr(md, "image_base64")
            if img:
                content_data["images"].append(img)
                content_data["types"].append("image")
    if not text_parts and hasattr(chunk, "text"):
        val = getattr(chunk, "text")
        if isinstance(val, str):
            text_parts.append(val)
            content_data["types"].append("text")
    content_data["text"] = "\n".join([p for p in text_parts if p])
    content_data["types"] = list(set(content_data["types"]))
    return content_data

