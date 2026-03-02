from abc import ABC, abstractmethod
from typing import List, Dict, Any
from datetime import datetime

class BaseAgent(ABC):
    """Base class for all processing agents"""
    
    def __init__(self, agent_name: str):
        self.agent_name = agent_name
        self.logs = []
    
    @abstractmethod
    def process(self, file_path: str) -> Dict[str, Any]:
        """Process the input file and return structured data"""
        pass
    
    def log(self, message: str):
        """Log agent activity"""
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "agent": self.agent_name,
            "message": message
        }
        self.logs.append(log_entry)
        print(f"[{self.agent_name}] {message}")
    
    def get_logs(self) -> List[Dict[str, Any]]:
        """Return agent logs"""
        return self.logs
