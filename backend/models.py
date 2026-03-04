from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import String, Text, Integer, ForeignKey, DateTime, Index, CheckConstraint, func, select, event
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base

class Project(Base):
    __tablename__ = "projects"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    user_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    conversations: Mapped[List["Conversation"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    documents: Mapped[List["Document"]] = relationship(back_populates="project", cascade="all, delete-orphan")
    def __repr__(self) -> str:
        return f"Project(id={self.id!r}, name={self.name!r})"

class Conversation(Base):
    __tablename__ = "conversations"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    project: Mapped["Project"] = relationship(back_populates="conversations")
    messages: Mapped[List["Message"]] = relationship(back_populates="conversation", cascade="all, delete-orphan")
    def __repr__(self) -> str:
        return f"Conversation(id={self.id!r}, title={self.title!r})"

@event.listens_for(Conversation, "before_insert")
def _set_conversation_title(mapper, connection, target: "Conversation"):
    if not target.title:
        stmt = select(func.count(Conversation.id)).where(Conversation.project_id == target.project_id)
        result = connection.execute(stmt).scalar_one()
        target.title = f"Chat #{result + 1}"

class Message(Base):
    __tablename__ = "messages"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    conversation_id: Mapped[int] = mapped_column(ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    role: Mapped[str] = mapped_column(String(16), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    sources_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    conversation: Mapped["Conversation"] = relationship(back_populates="messages")
    __table_args__ = (
        CheckConstraint("role in ('user','assistant','system')", name="ck_messages_role"),
        Index("ix_messages_conversation_created", "conversation_id", "created_at"),
    )
    def __repr__(self) -> str:
        return f"Message(id={self.id!r}, role={self.role!r})"

class Document(Base):
    __tablename__ = "documents"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(512), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="processing")
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    project: Mapped["Project"] = relationship(back_populates="documents")
    __table_args__ = (
        CheckConstraint("status in ('processing','completed','failed')", name="ck_documents_status"),
        Index("ix_documents_project_status", "project_id", "status"),
    )
    def __repr__(self) -> str:
        return f"Document(id={self.id!r}, filename={self.filename!r})"
