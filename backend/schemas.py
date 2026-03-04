from typing import Optional, Literal
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import List

class UserCreate(BaseModel):
    email: str
    password: str

class UserRead(BaseModel):
    id: int
    email: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None

class ProjectRead(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    user_id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ProjectListItem(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    created_at: datetime
    total_conversations: int
    total_documents: int

class ProjectListResponse(BaseModel):
    projects: List[ProjectListItem]
    count: int

class ConversationCreate(BaseModel):
    project_id: int
    title: Optional[str] = None

class ConversationRead(BaseModel):
    id: int
    project_id: int
    title: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class MessageCreate(BaseModel):
    conversation_id: int
    role: Literal["user", "assistant", "system"]
    content: str

class MessageRead(BaseModel):
    id: int
    conversation_id: int
    role: str
    content: str
    sources_json: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class DocumentCreate(BaseModel):
    project_id: int
    filename: str
    file_path: str
    status: Literal["processing", "completed", "failed"] = "processing"

class DocumentRead(BaseModel):
    id: int
    project_id: int
    filename: str
    file_path: str
    status: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ConversationListItem(BaseModel):
    id: int
    title: str
    created_at: datetime
    total_messages: int

class ConversationListResponse(BaseModel):
    conversations: List[ConversationListItem]
    count: int

class MessageListResponse(BaseModel):
    messages: List[MessageRead]
    count: int
