import uuid
import os
import shutil
import httpx
from pathlib import Path
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from database import get_db
from models import DossiBoardItem, Project

router = APIRouter()

VALID_FOLDERS = {"images", "typefaces", "websites"}

# Files are stored under backend/uploads/dossi_board/<project_id>/<folder>/
UPLOAD_ROOT = Path(__file__).parent.parent / "uploads" / "dossi_board"


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class DossiBoardItemOut(BaseModel):
    id: str
    project_id: str
    folder: str
    file_path: str
    filename: str
    label: Optional[str]
    source_url: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/projects/{project_id}/dossi-board", response_model=list[DossiBoardItemOut])
def list_items(
    project_id: str,
    folder: Optional[str] = None,
    db: Session = Depends(get_db),
):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    query = db.query(DossiBoardItem).filter(DossiBoardItem.project_id == project_id)
    if folder:
        if folder not in VALID_FOLDERS:
            raise HTTPException(status_code=400, detail=f"Invalid folder. Must be one of: {', '.join(VALID_FOLDERS)}")
        query = query.filter(DossiBoardItem.folder == folder)

    return query.order_by(DossiBoardItem.created_at).all()


@router.post("/projects/{project_id}/dossi-board", response_model=DossiBoardItemOut, status_code=201)
async def upload_item(
    project_id: str,
    folder: str = Form(...),
    label: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if folder not in VALID_FOLDERS:
        raise HTTPException(status_code=400, detail=f"Invalid folder. Must be one of: {', '.join(VALID_FOLDERS)}")

    # Build storage path: uploads/dossi_board/<project_id>/<folder>/<uuid>_<filename>
    dest_dir = UPLOAD_ROOT / project_id / folder
    dest_dir.mkdir(parents=True, exist_ok=True)

    safe_filename = f"{uuid.uuid4().hex}_{file.filename}"
    dest_path = dest_dir / safe_filename

    with dest_path.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    # Store a relative path from the uploads root so it's portable
    relative_path = f"{project_id}/{folder}/{safe_filename}"

    item = DossiBoardItem(
        project_id=project_id,
        folder=folder,
        file_path=relative_path,
        filename=file.filename or safe_filename,
        label=label,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/projects/{project_id}/dossi-board/{item_id}", response_model=DossiBoardItemOut)
def update_item_label(
    project_id: str,
    item_id: str,
    label: Optional[str] = None,
    db: Session = Depends(get_db),
):
    item = db.query(DossiBoardItem).filter(
        DossiBoardItem.id == item_id,
        DossiBoardItem.project_id == project_id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    item.label = label
    db.commit()
    db.refresh(item)
    return item


class AddFromAssetRequest(BaseModel):
    # The Vite-resolved asset URL (e.g. /assets/graphic-01-abc123.png)
    # Stored with an "asset:" prefix so DossiBoard knows to render it directly
    src_path: str
    filename: str
    folder: str = "images"
    label: Optional[str] = None


@router.post("/projects/{project_id}/dossi-board/from-asset", response_model=DossiBoardItemOut, status_code=201)
def add_item_from_asset(
    project_id: str,
    body: AddFromAssetRequest,
    db: Session = Depends(get_db),
):
    """Store a reference to a visual-exploration asset without copying the file."""
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if body.folder not in VALID_FOLDERS:
        raise HTTPException(status_code=400, detail=f"Invalid folder. Must be one of: {', '.join(VALID_FOLDERS)}")

    # Prefix with "asset:" so the frontend knows to use the path directly
    stored_path = f"asset:{body.src_path}"

    item = DossiBoardItem(
        project_id=project_id,
        folder=body.folder,
        file_path=stored_path,
        filename=body.filename,
        label=body.label,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


class AddWebsiteRequest(BaseModel):
    url: str
    title: Optional[str] = None


@router.post("/projects/{project_id}/dossi-board/from-url", response_model=DossiBoardItemOut, status_code=201)
async def add_item_from_url(
    project_id: str,
    body: AddWebsiteRequest,
    db: Session = Depends(get_db),
):
    """Save a website URL reference to the websites folder, with a thumbnail fetched via microlink."""
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Fetch screenshot thumbnail URL from microlink (free, no key needed)
    thumbnail_url = f"url:{body.url}"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://api.microlink.io",
                params={"url": body.url, "screenshot": "true", "meta": "false"},
            )
            if resp.status_code == 200:
                data = resp.json()
                screenshot = (data.get("data") or {}).get("screenshot") or {}
                fetched = screenshot.get("url") if isinstance(screenshot, dict) else None
                if fetched:
                    thumbnail_url = f"url:{fetched}"
    except Exception:
        pass  # Fall back to storing the source URL itself

    label = body.title or body.url
    item = DossiBoardItem(
        project_id=project_id,
        folder="websites",
        file_path=thumbnail_url,
        filename=label,
        label=label,
        source_url=body.url,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/projects/{project_id}/dossi-board/from-asset", status_code=204)
def remove_item_from_asset(
    project_id: str,
    src_path: str,
    db: Session = Depends(get_db),
):
    """Remove a visual-exploration asset reference by its src_path."""
    stored_path = f"asset:{src_path}"
    item = db.query(DossiBoardItem).filter(
        DossiBoardItem.project_id == project_id,
        DossiBoardItem.file_path == stored_path,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(item)
    db.commit()


@router.delete("/projects/{project_id}/dossi-board/{item_id}", status_code=204)
def delete_item(
    project_id: str,
    item_id: str,
    db: Session = Depends(get_db),
):
    item = db.query(DossiBoardItem).filter(
        DossiBoardItem.id == item_id,
        DossiBoardItem.project_id == project_id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Only remove uploaded files from disk — asset references have no file to delete
    if not item.file_path.startswith("asset:"):
        file_on_disk = UPLOAD_ROOT / item.file_path
        if file_on_disk.exists():
            file_on_disk.unlink()

    db.delete(item)
    db.commit()
