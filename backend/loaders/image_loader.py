"""
Image loader: uses PIL + pytesseract (OCR) to extract text from images,
plus stores the image as base64 so it can be shown in sources.

Returns a dict:
  { "text": str, "image_base64": str, "width": int, "height": int }
"""
import base64
import os
from PIL import Image, ImageEnhance, ImageFilter
import pytesseract

SUPPORTED = {".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".tif", ".gif", ".webp"}


def _preprocess(img: Image.Image) -> Image.Image:
    """Improve OCR accuracy: convert to greyscale, sharpen, increase contrast."""
    img = img.convert("L")                          # greyscale
    img = img.filter(ImageFilter.SHARPEN)
    img = ImageEnhance.Contrast(img).enhance(2.0)
    return img


def load(file_path: str) -> dict:
    img = Image.open(file_path)
    w, h = img.size

    # OCR — try enhanced first, fall back to original if empty
    enhanced = _preprocess(img)
    text = pytesseract.image_to_string(enhanced, config="--psm 3").strip()
    if not text:
        text = pytesseract.image_to_string(img, config="--psm 3").strip()

    # Base64 encode original image for display in sources
    with open(file_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("utf-8")

    ext = os.path.splitext(file_path)[1].lower().lstrip(".")
    mime = {"jpg": "jpeg", "tif": "tiff"}.get(ext, ext)

    return {
        "text": text,
        "image_base64": b64,
        "mime": f"image/{mime}",
        "width": w,
        "height": h,
    }
