import os
from typing import List, Dict, Any, Tuple

from .pdf_agent import PDFAgent
from .docx_agent import DOCXAgent
from .image_agent import ImageAgent
from .audio_agent import AudioAgent


class AgentOrchestrator:
    def __init__(self):
        self.pdf_agent = PDFAgent()
        self.docx_agent = DOCXAgent()
        self.image_agent = ImageAgent()
        self.audio_agent = AudioAgent()

    def _process_text_file(self, file_path: str) -> Dict[str, Any]:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        return {
            "type": "text",
            "file_path": file_path,
            "content": content,
            "metadata": {
                "length": len(content)
            }
        }

    def process_file(self, file_path: str) -> Dict[str, Any]:
        ext = os.path.splitext(file_path)[1].lower()

        if ext == ".pdf":
            return self.pdf_agent.process(file_path)
        elif ext in [".docx"]:
            return self.docx_agent.process(file_path)
        elif ext in [".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tiff", ".webp", ".heic", ".heif"]:
            return self.image_agent.process(file_path)
        elif ext in [".mp3", ".wav", ".m4a", ".flac", ".ogg"]:
            return self.audio_agent.process(file_path)
        else:
            return self._process_text_file(file_path)

    def to_documents(self, processed: Dict[str, Any]) -> Tuple[List[str], List[Dict[str, Any]]]:
        docs: List[str] = []
        metas: List[Dict[str, Any]] = []
        fpath = processed["file_path"]
        ftype = processed["type"]

        if ftype == "pdf":
            for page_info in processed["metadata"].get("page_contents", []):
                text = page_info.get("text", "")
                if text.strip():
                    docs.append(text)
                    metas.append({
                        "file_path": fpath,
                        "type": "pdf",
                        "page": page_info.get("page", None)
                    })
        elif ftype == "audio":
            docs.append(processed["content"])
            metas.append({
                "file_path": fpath,
                "type": "audio",
                "segments": processed["metadata"].get("segments", 0)
            })
        elif ftype == "image":
            docs.append(processed["content"])
            metas.append({
                "file_path": fpath,
                "type": "image",
                "format": processed["metadata"].get("format", "unknown")
            })
        else:
            docs.append(processed["content"])
            metas.append({
                "file_path": fpath,
                "type": ftype
            })
        return docs, metas

    def process_files(self, file_paths: List[str]) -> Tuple[List[str], List[Dict[str, Any]]]:
        all_docs: List[str] = []
        all_meta: List[Dict[str, Any]] = []
        for fp in file_paths:
            try:
                processed = self.process_file(fp)
                docs, metas = self.to_documents(processed)
                all_docs.extend(docs)
                all_meta.extend(metas)
            except Exception:
                # Skip problematic files but continue processing others
                continue
        return all_docs, all_meta
