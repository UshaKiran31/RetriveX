from docx import Document
from typing import Dict, Any
from .base_agent import BaseAgent

class DOCXAgent(BaseAgent):
    """Agent for processing DOCX files"""
    
    def __init__(self):
        super().__init__("DOCXAgent")
    
    def process(self, file_path: str) -> Dict[str, Any]:
        """Extract text from DOCX"""
        self.log(f"Processing DOCX: {file_path}")
        
        try:
            doc = Document(file_path)
            paragraphs = [para.text for para in doc.paragraphs if para.text.strip()]
            full_text = "\n".join(paragraphs)
            
            self.log(f"Extracted {len(paragraphs)} paragraphs from DOCX")
            
            return {
                "type": "docx",
                "file_path": file_path,
                "content": full_text,
                "metadata": {
                    "paragraphs": len(paragraphs)
                }
            }
        except Exception as e:
            self.log(f"Error processing DOCX: {str(e)}")
            raise
