import PyPDF2
from typing import Dict, Any
from .base_agent import BaseAgent

class PDFAgent(BaseAgent):
    """Agent for processing PDF files"""
    
    def __init__(self):
        super().__init__("PDFAgent")
    
    def process(self, file_path: str) -> Dict[str, Any]:
        """Extract text from PDF"""
        self.log(f"Processing PDF: {file_path}")
        
        try:
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                text_content = []
                
                for page_num, page in enumerate(pdf_reader.pages):
                    text = page.extract_text()
                    text_content.append({
                        "page": page_num + 1,
                        "text": text.strip()
                    })
                
                full_text = " ".join([p["text"] for p in text_content])
                
                self.log(f"Extracted {len(text_content)} pages from PDF")
                
                return {
                    "type": "pdf",
                    "file_path": file_path,
                    "content": full_text,
                    "metadata": {
                        "pages": len(text_content),
                        "page_contents": text_content
                    }
                }
        except Exception as e:
            self.log(f"Error processing PDF: {str(e)}")
            raise
