# Use slim Python base
FROM python:3.11-slim

# System dependencies
# - tesseract-ocr: for image OCR (pytesseract)
# - ffmpeg: for audio processing (Whisper)
# - libgl1, libglib2.0-0: for OpenCV
# - poppler-utils: for pdf2image
# - libmagic1: for python-magic file detection
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    ffmpeg \
    libgl1 \
    libglib2.0-0 \
    poppler-utils \
    libmagic1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy and install Python dependencies first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code
COPY . .

# Create required directories
RUN mkdir -p data/uploads data/vector_db logs models

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
