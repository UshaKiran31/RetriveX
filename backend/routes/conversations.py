from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from typing import Dict, List
from fastapi import Query
import os
import json

from database import get_db
from database import SessionLocal
from models import Project, Conversation, Message, Document
from schemas import ConversationCreate, ConversationRead, ConversationListItem, ConversationListResponse, MessageCreate, MessageRead, MessageListResponse
from schemas import BaseModel
from utils.pipeline import ask_question, process_document
from utils.pipeline import load_project_vector_store
from pydantic import BaseModel as PydBaseModel
from typing import Optional, Any, Dict as TypingDict, List as TypingList

router = APIRouter(tags=["conversations"])

def get_current_user_dep() -> Dict:
    return {}

@router.post(
    "/projects/{project_id}/conversations",
    response_model=ConversationRead,
    status_code=status.HTTP_201_CREATED,
)
def create_conversation(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user_dep),
):
    user_id = current_user.get("user_id") if isinstance(current_user, dict) else None
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    project_stmt = select(Project).where(Project.id == project_id, Project.user_id == user_id)
    project = db.execute(project_stmt).scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    try:
        conv = Conversation(project_id=project_id)
        db.add(conv)
        db.commit()
        db.refresh(conv)
        return conv
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database error")

@router.get(
    "/projects/{project_id}/conversations",
    response_model=ConversationListResponse,
    status_code=status.HTTP_200_OK,
)
def list_conversations(
    project_id: int,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user_dep),
):
    user_id = current_user.get("user_id") if isinstance(current_user, dict) else None
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    project_stmt = select(Project.id).where(Project.id == project_id, Project.user_id == user_id)
    has_project = db.execute(project_stmt).scalar_one_or_none()
    if not has_project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    msg_counts = (
        select(
            Message.conversation_id.label("conversation_id"),
            func.count(Message.id).label("total_messages"),
        )
        .group_by(Message.conversation_id)
        .subquery()
    )

    stmt = (
        select(
            Conversation.id,
            Conversation.title,
            Conversation.created_at,
            func.coalesce(msg_counts.c.total_messages, 0).label("total_messages"),
        )
        .outerjoin(msg_counts, msg_counts.c.conversation_id == Conversation.id)
        .where(Conversation.project_id == project_id)
        .order_by(Conversation.created_at.desc())
        .limit(limit)
        .offset(offset)
    )

    rows = db.execute(stmt).all()
    conversations: List[ConversationListItem] = [
        ConversationListItem(
            id=row.id,
            title=row.title,
            created_at=row.created_at,
            total_messages=row.total_messages,
        )
        for row in rows
    ]
    return ConversationListResponse(conversations=conversations, count=len(conversations))

@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=MessageRead,
    status_code=status.HTTP_201_CREATED,
)
def create_message(
    conversation_id: int,
    payload: MessageCreate,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user_dep),
):
    user_id = current_user.get("user_id") if isinstance(current_user, dict) else None
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    conv_stmt = (
        select(Conversation.id)
        .join(Project, Conversation.project_id == Project.id)
        .where(Conversation.id == conversation_id, Project.user_id == user_id)
    )
    has_conv = db.execute(conv_stmt).scalar_one_or_none()
    if not has_conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    try:
        msg = Message(conversation_id=conversation_id, role=payload.role, content=payload.content)
        db.add(msg)
        db.commit()
        db.refresh(msg)
        return msg
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database error")

@router.get(
    "/conversations/{conversation_id}/messages",
    response_model=MessageListResponse,
    status_code=status.HTTP_200_OK,
)
def list_messages(
    conversation_id: int,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user_dep),
):
    user_id = current_user.get("user_id") if isinstance(current_user, dict) else None
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    conv_stmt = (
        select(Conversation.id)
        .join(Project, Conversation.project_id == Project.id)
        .where(Conversation.id == conversation_id, Project.user_id == user_id)
    )
    has_conv = db.execute(conv_stmt).scalar_one_or_none()
    if not has_conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    stmt = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
        .limit(limit)
        .offset(offset)
    )
    messages = db.execute(stmt).scalars().all()
    return MessageListResponse(messages=messages, count=len(messages))

class ChatStreamRequest(BaseModel):
    conversation_id: int
    message: str

@router.post(
    "/projects/{project_id}/chat/stream",
    response_class=StreamingResponse,
)
def chat_stream(
    project_id: int,
    payload: ChatStreamRequest,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user_dep),
):
    user_id = current_user.get("user_id") if isinstance(current_user, dict) else None
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    project = db.execute(select(Project).where(Project.id == project_id, Project.user_id == user_id)).scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    conv = db.execute(select(Conversation).where(Conversation.id == payload.conversation_id, Conversation.project_id == project_id)).scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    latest_doc_stmt = (
        select(Document)
        .where(Document.project_id == project_id)
        .order_by(Document.created_at.desc())
        .limit(1)
    )
    latest_doc = db.execute(latest_doc_stmt).scalar_one_or_none()
    has_completed_stmt = (
        select(func.count(Document.id))
        .where(Document.project_id == project_id, Document.status == "completed")
    )
    has_completed = db.execute(has_completed_stmt).scalar_one()
    if latest_doc and not has_completed:
        try:
            process_document(file_path=latest_doc.file_path, project_id=project_id)
        except Exception:
            pass

    try:
        user_msg = Message(conversation_id=payload.conversation_id, role="user", content=payload.message)
        db.add(user_msg)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to save user message")

    def streamer():
        buf_parts: List[str] = []
        try:
            for token in ask_question(project_id=project_id, question=payload.message):
                buf_parts.append(token)
                yield token
        finally:
            full = "".join(buf_parts).strip()
            if full:
                s = SessionLocal()
                try:
                    # Save assistant message
                    msg = Message(conversation_id=payload.conversation_id, role="assistant", content=full)
                    s.add(msg)
                    s.commit()
                    s.refresh(msg)
                    # Compute sources and persist
                    try:
                        if (payload.message or "").lower().strip() in ("hi", "hello", "hey", "hlo"):
                            msg.sources_json = json.dumps({"results": [], "by_document": {}, "documents": []})
                            s.commit()
                            raise Exception("Skip retrieval for greeting")
                        vec = load_project_vector_store(project_id)
                        # Load top_k from settings (reuse logic)
                        default_k = 3
                        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                        settings_path = os.path.join(base_dir, "data", "projects", str(project_id), "settings.json")
                        if os.path.exists(settings_path):
                            with open(settings_path, "r", encoding="utf-8") as sf:
                                cfg = json.load(sf) or {}
                                default_k = int(cfg.get("top_k", 3))
                        k = max(3, default_k)
                        retriever = vec.as_retriever(search_kwargs={"k": k})
                        docs = retriever.invoke(payload.message)
                        doc_rows = s.execute(select(Document).where(Document.project_id == project_id)).scalars().all()
                        id_to_doc = {d.id: d for d in doc_rows}
                        def parse_doc(d):
                            md = getattr(d, "metadata", {}) or {}
                            try:
                                raw = md.get("original_content")
                                parsed = {}
                                if raw:
                                    parsed = json.loads(raw)
                            except Exception:
                                parsed = {}
                            doc_id = md.get("document_id")
                            name = id_to_doc.get(doc_id).filename if doc_id in id_to_doc else (md.get("filename") or "Unknown")
                            return {
                                "document_id": doc_id,
                                "file_name": name,
                                "page": md.get("page_number"),
                                "chunk_id": md.get("chunk_id"),
                                "text": parsed.get("raw_text") or d.page_content,
                                "tables_html": parsed.get("tables_html") or [],
                                "images_base64": parsed.get("images_base64") or [],
                            }
                        grouped = {}
                        parsed_all = []
                        for d in docs:
                            item = parse_doc(d)
                            parsed_all.append(item)
                            did = item.get("document_id")
                            if did is not None:
                                grouped.setdefault(did, []).append(item)
                        if parsed_all:
                            if len(doc_rows) == 1:
                                fallback_name = doc_rows[0].filename
                                for it in parsed_all:
                                    if not it.get("file_name") or it.get("file_name") == "Unknown":
                                        it["file_name"] = fallback_name
                            for idx, it in enumerate(parsed_all):
                                if it.get("chunk_id") is None:
                                    it["chunk_id"] = idx
                        results = parsed_all[:3]
                        by_document = {str(k): v[:3] for k, v in grouped.items()}
                        doc_options = [{"id": d.id, "filename": d.filename} for d in doc_rows]
                        msg.sources_json = json.dumps({"results": results, "by_document": by_document, "documents": doc_options})
                        s.commit()
                    except Exception:
                        pass
                finally:
                    s.close()

    return StreamingResponse(streamer(), media_type="text/plain")


class SearchRequest(PydBaseModel):
    query: str
    source_document_id: Optional[int] = None
    max_k: int = 12


@router.post("/projects/{project_id}/search")
def semantic_search(
    project_id: int,
    payload: SearchRequest,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user_dep),
):
    user_id = current_user.get("user_id") if isinstance(current_user, dict) else None
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    project = db.execute(select(Project).where(Project.id == project_id, Project.user_id == user_id)).scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    try:
        vec = load_project_vector_store(project_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Vector store not available")

    # Load default top_k from settings if available
    default_k = 3
    try:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        settings_path = os.path.join(base_dir, "data", "projects", str(project_id), "settings.json")
        if os.path.exists(settings_path):
            with open(settings_path, "r", encoding="utf-8") as sf:
                cfg = json.load(sf) or {}
                default_k = int(cfg.get("top_k", 3))
    except Exception:
        default_k = 3
    k = max(3, payload.max_k or default_k)
    retriever = vec.as_retriever(search_kwargs={"k": k})
    docs = retriever.invoke(payload.query)

    doc_rows = db.execute(select(Document).where(Document.project_id == project_id)).scalars().all()
    id_to_doc = {d.id: d for d in doc_rows}

    def parse_doc(d) -> TypingDict[str, Any]:
        md = getattr(d, "metadata", {}) or {}
        try:
            raw = md.get("original_content")
            parsed = {}
            if raw:
                parsed = json.loads(raw)
        except Exception:
            parsed = {}
        doc_id = md.get("document_id")
        name = id_to_doc.get(doc_id).filename if doc_id in id_to_doc else (md.get("filename") or "Unknown")
        return {
            "document_id": doc_id,
            "file_name": name,
            "page": md.get("page_number"),
            "chunk_id": md.get("chunk_id"),
            "text": parsed.get("raw_text") or d.page_content,
            "tables_html": parsed.get("tables_html") or [],
            "images_base64": parsed.get("images_base64") or [],
        }

    grouped: TypingDict[int, TypingList[TypingDict[str, Any]]] = {}
    parsed_all: TypingList[TypingDict[str, Any]] = []
    for d in docs:
        item = parse_doc(d)
        parsed_all.append(item)
        did = item.get("document_id")
        if did is not None:
            grouped.setdefault(did, []).append(item)

    # Fallbacks to avoid "Unknown" and missing chunk numbers
    if parsed_all:
        if len(doc_rows) == 1:
            fallback_name = doc_rows[0].filename
            for it in parsed_all:
                if not it.get("file_name") or it.get("file_name") == "Unknown":
                    it["file_name"] = fallback_name
        for idx, it in enumerate(parsed_all):
            if it.get("chunk_id") is None:
                it["chunk_id"] = idx

    if payload.source_document_id is not None:
        filtered = [x for x in parsed_all if x.get("document_id") == payload.source_document_id]
    else:
        filtered = parsed_all

    results = filtered[:3]
    by_document = {str(k): v[:3] for k, v in grouped.items()}
    doc_options = [{"id": d.id, "filename": d.filename} for d in doc_rows]

    return {"results": results, "by_document": by_document, "documents": doc_options}

@router.delete(
    "/projects/{project_id}/conversations/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_conversation(
    project_id: int,
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user_dep),
):
    user_id = current_user.get("user_id") if isinstance(current_user, dict) else None
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    conv = (
        db.execute(
            select(Conversation)
            .join(Project, Conversation.project_id == Project.id)
            .where(Conversation.id == conversation_id, Conversation.project_id == project_id, Project.user_id == user_id)
        ).scalar_one_or_none()
    )
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    try:
        db.delete(conv)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete conversation")

@router.put(
    "/projects/{project_id}/conversations/{conversation_id}",
    response_model=ConversationRead,
    status_code=status.HTTP_200_OK,
)
def update_conversation(
    project_id: int,
    conversation_id: int,
    payload: ConversationCreate,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user_dep),
):
    user_id = current_user.get("user_id") if isinstance(current_user, dict) else None
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    
    conv = (
        db.execute(
            select(Conversation)
            .join(Project, Conversation.project_id == Project.id)
            .where(Conversation.id == conversation_id, Conversation.project_id == project_id, Project.user_id == user_id)
        ).scalar_one_or_none()
    )
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    
    title = (payload.title or "").strip()
    if not title:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="title must not be empty")
    
    conv.title = title
    try:
        db.commit()
        db.refresh(conv)
        return conv
    except Exception:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update conversation")
