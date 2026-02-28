import whisper
from typing import Dict, Any
from .base_agent import BaseAgent

class AudioAgent(BaseAgent):
    """Agent for processing audio files"""
    
    def __init__(self):
        super().__init__("AudioAgent")
        # Load Whisper model (base model for balance of speed/accuracy)
        self.log("Loading Whisper model...")
        self.model = whisper.load_model("base")
    
    def process(self, file_path: str) -> Dict[str, Any]:
        """Transcribe audio to text"""
        self.log(f"Processing Audio: {file_path}")
        
        try:
            # Transcribe audio
            result = self.model.transcribe(file_path)
            
            text = result["text"]
            segments = result.get("segments", [])
            
            self.log(f"Transcribed audio ({len(segments)} segments)")
            
            return {
                "type": "audio",
                "file_path": file_path,
                "content": text.strip(),
                "metadata": {
                    "segments": len(segments),
                    "language": result.get("language", "unknown"),
                    "timestamps": [
                        {
                            "start": seg["start"],
                            "end": seg["end"],
                            "text": seg["text"]
                        }
                        for seg in segments
                    ]
                }
            }
        except Exception as e:
            self.log(f"Error processing audio: {str(e)}")
            raise
