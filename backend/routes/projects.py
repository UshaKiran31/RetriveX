from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks, Query
from fastapi.responses import FileResponse
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from typing import Optional, Dict, List
import os
import shutil

from database import get_db, SessionLocal
from models import Project, Conversation, Document
from schemas import ProjectCreate, ProjectRead, ProjectListItem, ProjectListResponse
from utils.pipeline import process_document
from utils.loaders import partition_document
from utils.chunking import create_chunks_by_title, separate_content_types

router = APIRouter(prefix="/projects", tags=["projects"])

def get_current_user_dep() -> Dict:
    return {}  # Will be overridden by the application to provide authenticated user

@router.post(
    "",
    response_model=ProjectRead,
    status_code=status.HTTP_201_CREATED,
)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user_dep),
):
    name = (payload.name or "").strip()
    if not name:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="name must not be empty")

    description: Optional[str] = (payload.description or None)
    if description is not None:
        description = description.strip() or None

    user_id = current_user.get("user_id") if isinstance(current_user, dict) else None
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    try:
        dup_stmt = select(Project.id).where(
            Project.user_id == user_id,
            func.lower(Project.name) == func.lower(name),
        )
        exists = db.execute(dup_stmt).scalar_one_or_none()
        if exists:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Project with this name already exists")

        project = Project(name=name, description=description, user_id=user_id)
        db.add(project)
        db.commit()
        db.refresh(project)
        return project
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database error")

@router.get(
    "",
    response_model=ProjectListResponse,
    status_code=status.HTTP_200_OK,
)
def list_projects(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user_dep),
):
    user_id = current_user.get("user_id") if isinstance(current_user, dict) else None
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    conv_counts = (
        select(
            Conversation.project_id.label("project_id"),
            func.count(Conversation.id).label("total_conversations"),
        )
        .group_by(Conversation.project_id)
        .subquery()
    )

    doc_counts = (
        select(
            Document.project_id.label("project_id"),
            func.count(Document.id).label("total_documents"),
        )
        .group_by(Document.project_id)
        .subquery()
    )

    stmt = (
        select(
            Project.id,
            Project.name,
            Project.description,
            Project.created_at,
            func.coalesce(conv_counts.c.total_conversations, 0).label("total_conversations"),
            func.coalesce(doc_counts.c.total_documents, 0).label("total_documents"),
        )
        .outerjoin(conv_counts, conv_counts.c.project_id == Project.id)
        .outerjoin(doc_counts, doc_counts.c.project_id == Project.id)
        .where(Project.user_id == user_id)
        .order_by(Project.created_at.desc())
        .limit(limit)
        .offset(offset)
    )

    rows = db.execute(stmt).all()
    projects: List[ProjectListItem] = [
        ProjectListItem(
            id=row.id,
            name=row.name,
            description=row.description,
            created_at=row.created_at,
            total_conversations=row.total_conversations,
            total_documents=row.total_documents,
        )
        for row in rows
    ]
    return ProjectListResponse(projects=projects, count=len(projects))

@router.get(
    "/{project_id}",
    response_model=ProjectRead,
    status_code=status.HTTP_200_OK,
)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user_dep),
):
    user_id = current_user.get("user_id") if isinstance(current_user, dict) else None
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    stmt = select(Project).where(Project.id == project_id, Project.user_id == user_id)
    project = db.execute(stmt).scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project

def _bg_embed_document(document_id: int, project_id: int, file_path: str):
    db = SessionLocal()
    try:
        try:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            project_dir = os.path.join(base_dir, "data", "projects", str(project_id))
            metrics_dir = os.path.join(project_dir, "metrics")
            os.makedirs(metrics_dir, exist_ok=True)
            metrics_path = os.path.join(metrics_dir, f"document_{document_id}.json")

            metrics = {
                "queued": {"status": "completed"},
                "partitioning": {"status": "in_progress"},
                "chunking": {"status": "pending"},
            }
            try:
                import json as _json
                with open(metrics_path, "w", encoding="utf-8") as mf:
                    _json.dump(metrics, mf, ensure_ascii=False, indent=2)
            except Exception:
                pass

            elements = partition_document(file_path=file_path)
            total_elements = len(elements)
            text_count = 0
            tables_count = 0
            images_count = 0
            titles_count = 0
            others_count = 0
            for el in elements:
                tname = type(el).__name__
                md = getattr(el, "metadata", None)
                if tname == "Table" or (md and getattr(md, "text_as_html", None)):
                    tables_count += 1
                elif tname == "Image" or (md and getattr(md, "image_base64", None)):
                    images_count += 1
                elif tname in ("Title", "Header"):
                    titles_count += 1
                elif hasattr(el, "text"):
                    text_count += 1
                else:
                    others_count += 1
            metrics["partitioning"] = {
                "status": "completed",
                "total_elements": total_elements,
                "text_sections": text_count,
                "tables": tables_count,
                "images": images_count,
                "titles_headers": titles_count,
                "other_elements": others_count,
            }
            metrics["chunking"] = {"status": "in_progress"}
            try:
                import json as _json
                with open(metrics_path, "w", encoding="utf-8") as mf:
                    _json.dump(metrics, mf, ensure_ascii=False, indent=2)
            except Exception:
                pass

            chunks = create_chunks_by_title(elements)
            chunk_count = len(chunks)
            sizes = []
            for ch in chunks:
                c = separate_content_types(ch)
                sizes.append(len(c.get("text") or ""))
            avg_size = int(sum(sizes) / len(sizes)) if sizes else 0
            metrics["chunking"] = {
                "status": "completed",
                "atomic_elements": total_elements,
                "chunks_created": chunk_count,
                "average_chunk_size_chars": avg_size,
            }
            metrics["summarisation"] = {"status": "in_progress", "processed": 0, "total": chunk_count}

            try:
                import json as _json
                with open(metrics_path, "w", encoding="utf-8") as mf:
                    _json.dump(metrics, mf, ensure_ascii=False, indent=2)
            except Exception:
                pass

            process_document(file_path=file_path, project_id=project_id, document_id=document_id)
            doc = db.get(Document, document_id)
            if doc:
                doc.status = "completed"
                doc.error_message = None
                db.commit()
        except Exception as e:
            doc = db.get(Document, document_id)
            if doc:
                doc.status = "failed"
                doc.error_message = str(e)
                db.commit()
    finally:
        db.close()

@router.get(
    "/{project_id}/documents/{document_id}/metrics",
    status_code=status.HTTP_200_OK,
)
def get_document_metrics(
    project_id: int,
    document_id: int,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user_dep),
):
    user_id = current_user.get("user_id") if isinstance(current_user, dict) else None
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    project = db.execute(select(Project.id).where(Project.id == project_id, Project.user_id == user_id)).scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    doc = db.get(Document, document_id)
    if not doc or doc.project_id != project_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    project_dir = os.path.join(base_dir, "data", "projects", str(project_id))
    metrics_dir = os.path.join(project_dir, "metrics")
    metrics_path = os.path.join(metrics_dir, f"document_{document_id}.json")
    import json as _json
    if not os.path.exists(metrics_path):
        return {
            "queued": {"status": "completed"},
            "partitioning": {"status": "pending"},
            "chunking": {"status": "pending"},
            "summarisation": {"status": "pending", "processed": 0, "total": 0},
            "vectorization": {"status": "pending"}
        }
    with open(metrics_path, "r", encoding="utf-8") as mf:
        data = _json.load(mf)
        # Ensure summarisation has processed/total fields
        if "summarisation" in data:
            if "processed" not in data["summarisation"]:
                data["summarisation"]["processed"] = 0
            if "total" not in data["summarisation"]:
                data["summarisation"]["total"] = data.get("chunking", {}).get("chunks_created", 0)
        return data

@router.get(
    "/{project_id}/documents/{document_id}/chunks",
    status_code=status.HTTP_200_OK,
)
def get_document_chunks(
    project_id: int,
    document_id: int,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user_dep),
):
    user_id = current_user.get("user_id") if isinstance(current_user, dict) else None
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    project = db.execute(select(Project.id).where(Project.id == project_id, Project.user_id == user_id)).scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    doc = db.get(Document, document_id)
    if not doc or doc.project_id != project_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
        
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    chunks_path = os.path.join(base_dir, "data", "projects", str(project_id), "chunks", f"document_{document_id}.json")
    
    import json as _json
    if os.path.exists(chunks_path):
        with open(chunks_path, "r", encoding="utf-8") as f:
            return {"chunks": _json.load(f)}
            
    return {"chunks": []}

@router.get(
    "/{project_id}/settings",
    status_code=status.HTTP_200_OK,
)
def get_project_settings(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user_dep),
):
    user_id = current_user.get("user_id") if isinstance(current_user, dict) else None
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    project = db.execute(select(Project.id).where(Project.id == project_id, Project.user_id == user_id)).scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    project_dir = os.path.join(base_dir, "data", "projects", str(project_id))
    settings_path = os.path.join(project_dir, "settings.json")
    import json as _json
    if os.path.exists(settings_path):
        with open(settings_path, "r", encoding="utf-8") as f:
            try:
                return _json.load(f)
            except Exception:
                pass
    return {"model_name": "llama3.2:3b", "embedding_model": "nomic-embed-text", "top_k": 3}

@router.put(
    "/{project_id}/settings",
    status_code=status.HTTP_200_OK,
)
def update_project_settings(
    project_id: int,
    payload: Dict,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user_dep),
):
    user_id = current_user.get("user_id") if isinstance(current_user, dict) else None
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    project = db.execute(select(Project.id).where(Project.id == project_id, Project.user_id == user_id)).scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    project_dir = os.path.join(base_dir, "data", "projects", str(project_id))
    os.makedirs(project_dir, exist_ok=True)
    settings_path = os.path.join(project_dir, "settings.json")
    import json as _json
    allowed = {"model_name", "embedding_model", "top_k"}
    existing = {}
    if os.path.exists(settings_path):
        try:
            with open(settings_path, "r", encoding="utf-8") as f:
                existing = _json.load(f) or {}
        except Exception:
            existing = {}
    updated = {**existing, **{k: v for k, v in (payload or {}).items() if k in allowed}}
    if "model_name" not in updated:
        updated["model_name"] = "llama3.2:3b"
    if "embedding_model" not in updated:
        updated["embedding_model"] = "nomic-embed-text"
    if "top_k" in updated:
        try:
            tk = int(updated["top_k"])
            updated["top_k"] = max(1, min(20, tk))
        except Exception:
            updated["top_k"] = 3
    if "top_k" not in updated:
        updated["top_k"] = 3
    with open(settings_path, "w", encoding="utf-8") as f:
        _json.dump(updated, f, ensure_ascii=False, indent=2)
    return updated

@router.get(
    "/{project_id}/export",
    status_code=status.HTTP_200_OK,
)
def export_project_bundle(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user_dep),
):
    user_id = current_user.get("user_id") if isinstance(current_user, dict) else None
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    project = db.execute(select(Project).where(Project.id == project_id, Project.user_id == user_id)).scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    project_dir = os.path.join(base_dir, "data", "projects", str(project_id))
    if not os.path.exists(project_dir):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project data not found")
    import tempfile, zipfile, time
    tmpdir = tempfile.gettempdir()
    zip_name = f"project_{project_id}_export_{int(time.time())}.zip"
    zip_path = os.path.join(tmpdir, zip_name)
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(project_dir):
            for fn in files:
                abs_path = os.path.join(root, fn)
                rel_path = os.path.relpath(abs_path, project_dir)
                zf.write(abs_path, arcname=os.path.join(f"project_{project_id}", rel_path))
    return FileResponse(zip_path, media_type="application/zip", filename=zip_name)

@router.post(
    "/{project_id}/upload",
    status_code=status.HTTP_202_ACCEPTED,
)
def upload_document(
    project_id: int,
    file: UploadFile = File(...),
    background: BackgroundTasks = None,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user_dep),
):
    user_id = current_user.get("user_id") if isinstance(current_user, dict) else None
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    project = db.execute(select(Project).where(Project.id == project_id, Project.user_id == user_id)).scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    upload_dir = os.path.join(base_dir, "data", "projects", str(project_id), "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, file.filename)

    try:
        with open(file_path, "wb") as f:
            f.write(file.file.read())
    finally:
        file.file.close()

    doc = Document(
        project_id=project_id,
        filename=file.filename,
        file_path=file_path,
        status="processing",
        error_message=None,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    if background is not None:
        background.add_task(_bg_embed_document, doc.id, project_id, file_path)

    return {"id": doc.id, "filename": doc.filename, "status": doc.status, "created_at": doc.created_at}

@router.get(
    "/{project_id}/documents",
    status_code=status.HTTP_200_OK,
)
def list_documents(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user_dep),
):
    user_id = current_user.get("user_id") if isinstance(current_user, dict) else None
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    project = db.execute(select(Project.id).where(Project.id == project_id, Project.user_id == user_id)).scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    stmt = select(Document).where(Document.project_id == project_id).order_by(Document.created_at.desc())
    docs = db.execute(stmt).scalars().all()
    return [
        {"id": d.id, "filename": d.filename, "status": d.status, "created_at": d.created_at, "error_message": d.error_message}
        for d in docs
    ]

@router.delete(
    "/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user_dep),
):
    user_id = current_user.get("user_id") if isinstance(current_user, dict) else None
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    project = db.execute(select(Project).where(Project.id == project_id, Project.user_id == user_id)).scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    
    # Cleanup project folder on disk
    try:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        project_dir = os.path.join(base_dir, "data", "projects", str(project_id))
        if os.path.exists(project_dir):
            shutil.rmtree(project_dir)
    except Exception as e:
        print(f"Failed to cleanup project directory {project_id}: {e}")

    try:
        db.delete(project)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete project")

@router.put(
    "/{project_id}",
    response_model=ProjectRead,
    status_code=status.HTTP_200_OK,
)
def update_project(
    project_id: int,
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: Dict = Depends(get_current_user_dep),
):
    user_id = current_user.get("user_id") if isinstance(current_user, dict) else None
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    
    project = db.execute(select(Project).where(Project.id == project_id, Project.user_id == user_id)).scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    
    name = (payload.name or "").strip()
    if not name:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="name must not be empty")
    
    project.name = name
    project.description = (payload.description or "").strip() or None
    
    try:
        db.commit()
        db.refresh(project)
        return project
    except Exception:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update project")
