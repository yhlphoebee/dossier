import random
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from database import get_db
from models import Project

router = APIRouter()

THUMBNAIL_COUNT = 4


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class ProjectOut(BaseModel):
    id: str
    title: str
    description: Optional[str]
    archived: bool
    thumbnail_index: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CreateProjectRequest(BaseModel):
    title: str


class UpdateProjectRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    archived: Optional[bool] = None


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/projects", response_model=list[ProjectOut])
def list_projects(archived: bool = False, db: Session = Depends(get_db)):
    return db.query(Project).filter(Project.archived == archived).all()


@router.get("/projects/{project_id}", response_model=ProjectOut)
def get_project(project_id: str, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.post("/projects", response_model=ProjectOut, status_code=201)
def create_project(body: CreateProjectRequest, db: Session = Depends(get_db)):
    project = Project(
        title=body.title,
        thumbnail_index=random.randint(0, THUMBNAIL_COUNT - 1),
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.patch("/projects/{project_id}", response_model=ProjectOut)
def update_project(project_id: str, body: UpdateProjectRequest, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if body.title is not None:
        project.title = body.title
    if body.description is not None:
        project.description = body.description
    if body.archived is not None:
        project.archived = body.archived
    db.commit()
    db.refresh(project)
    return project


@router.delete("/projects/{project_id}", status_code=204)
def delete_project(project_id: str, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    db.commit()
