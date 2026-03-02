from PIL import Image
try:
    import pytesseract
    TESSERACT_AVAILABLE = True
except:
    TESSERACT_AVAILABLE = False
from typing import Dict, Any
from .base_agent import BaseAgent

class ImageAgent(BaseAgent):
    """Agent for processing image files"""
    
    def __init__(self):
        super().__init__("ImageAgent")
    
    def process(self, file_path: str) -> Dict[str, Any]:
        """Extract text from images using OCR"""
        self.log(f"Processing Image: {file_path}")
        
        try:
            image = Image.open(file_path)
            
            # Extract text using Tesseract OCR
            if TESSERACT_AVAILABLE:
                text = pytesseract.image_to_string(image)
            else:
                text = "[Tesseract OCR not installed - Please install to extract text from images]"
            
            self.log(f"Extracted text from image")
            
            return {
                "type": "image",
                "file_path": file_path,
                "content": text.strip(),
                "metadata": {
                    "image_size": image.size,
                    "format": image.format
                }
            }
        except Exception as e:
            self.log(f"Error processing image: {str(e)}")
            raise
