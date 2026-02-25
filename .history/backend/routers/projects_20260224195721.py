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


class UpdateAgentSummaryRequest(BaseModel):
    agent: str
    summary: Optional[str] = None
    problem_statement: Optional[str] = None
    assumptions: Optional[str] = None


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


@router.patch("/projects/{project_id}/agent-summary", response_model=ProjectOut)
def update_agent_summary(project_id: str, body: UpdateAgentSummaryRequest, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    agent = body.agent.lower()
    if agent == "strategy":
        if body.summary is not None:
            project.strategy_summary = body.summary
        if body.problem_statement is not None:
            project.strategy_problem_statement = body.problem_statement
        if body.assumptions is not None:
            project.strategy_assumptions = body.assumptions
    elif agent == "research":
        if body.summary is not None:
            project.research_summary = body.summary
        if body.problem_statement is not None:
            project.research_problem_statement = body.problem_statement
        if body.assumptions is not None:
            project.research_assumptions = body.assumptions
    elif agent == "concept":
        if body.summary is not None:
            project.concept_summary = body.summary
        if body.problem_statement is not None:
            project.concept_problem_statement = body.problem_statement
        if body.assumptions is not None:
            project.concept_assumptions = body.assumptions
    elif agent == "present":
        if body.summary is not None:
            project.present_summary = body.summary
        if body.problem_statement is not None:
            project.present_problem_statement = body.problem_statement
        if body.assumptions is not None:
            project.present_assumptions = body.assumptions

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
