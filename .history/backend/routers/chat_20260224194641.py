import os
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime
from openai import AsyncOpenAI, OpenAIError

from database import get_db
from models import Project, ChatMessage
from prompt import build_messages, build_summary_prompt

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class MessageOut(BaseModel):
    id: str
    role: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class SendMessageRequest(BaseModel):
    content: str
    agent: str


class ChatResponse(BaseModel):
    user_message: MessageOut
    assistant_message: MessageOut


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/projects/{project_id}/messages", response_model=list[MessageOut])
def get_messages(project_id: str, agent: str | None = None, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if agent is None:
        return project.messages

    return [m for m in project.messages if m.agent == agent]


@router.post("/projects/{project_id}/messages", response_model=ChatResponse)
async def send_message(
    project_id: str,
    body: SendMessageRequest,
    db: Session = Depends(get_db),
):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="OpenAI API key not configured. Add OPENAI_API_KEY to your .env file.",
        )

    # Snapshot history for this agent before saving the new message
    history = [m for m in project.messages if m.agent == body.agent]

    # Save the user message
    user_msg = ChatMessage(project_id=project_id, role="user", content=body.content, agent=body.agent)
    db.add(user_msg)
    db.flush()

    # Build properly structured OpenAI messages (system + alternating turns + new message)
    openai_messages = build_messages(
        new_message=body.content,
        project=project,
        history=history,
        agent=body.agent,
    )

    client = AsyncOpenAI(api_key=api_key)
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=openai_messages,
            max_tokens=1024,
            temperature=0.7,
        )
        reply_text = response.choices[0].message.content or ""
    except OpenAIError as e:
        db.rollback()
        raise HTTPException(status_code=502, detail=str(e))

    # Save the assistant reply
    assistant_msg = ChatMessage(project_id=project_id, role="assistant", content=reply_text, agent=body.agent)
    db.add(assistant_msg)
    db.commit()
    db.refresh(user_msg)
    db.refresh(assistant_msg)

    return ChatResponse(user_message=user_msg, assistant_message=assistant_msg)


class SummarizeRequest(BaseModel):
    agent: str


class SummaryOut(BaseModel):
    summary: str
    problem_statment: str
    assumptions: str
    detail_summary: str


@router.post("/projects/{project_id}/summary", response_model=SummaryOut)
async def summarize_agent(
    project_id: str,
    body: SummarizeRequest,
    db: Session = Depends(get_db),
):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    agent = body.agent

    # History for this agent only
    history = [m for m in project.messages if m.agent == agent]

    # Collect all agents' detail summaries for cross-agent context
    all_detail_summaries: dict[str, str] = {
        "strategy": project.strategy_detail_summary or "",
        "research": project.research_detail_summary or "",
        "concept": project.concept_detail_summary or "",
        "present": project.present_detail_summary or "",
    }

    # Build a single user prompt for summarization
    user_prompt = build_summary_prompt(
        agent=agent,
        project=project,
        agent_history=history,
        all_detail_summaries=all_detail_summaries,
    )

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="OpenAI API key not configured. Add OPENAI_API_KEY to your .env file.",
        )

    client = AsyncOpenAI(api_key=api_key)

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": base_prompt.strip()},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=768,
            temperature=0.4,
        )
        raw = response.choices[0].message.content or ""
    except OpenAIError as e:
        raise HTTPException(status_code=502, detail=str(e))

    import json

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=502, detail=f"Failed to parse summary JSON: {e}")

    summary = str(data.get("summary") or "").strip()
    problem_statment = str(data.get("problem_statment") or "").strip()
    assumptions = str(data.get("assumptions") or "").strip()
    detail_summary = str(data.get("detail_summary") or "").strip()

    # Persist onto the project for this agent
    agent_lower = (agent or "").lower()
    if agent_lower == "strategy":
        project.strategy_summary = summary
        project.strategy_problem_statement = problem_statment
        project.strategy_assumptions = assumptions
        project.strategy_detail_summary = detail_summary
    elif agent_lower == "research":
        project.research_summary = summary
        project.research_problem_statement = problem_statment
        project.research_assumptions = assumptions
        project.research_detail_summary = detail_summary
    elif agent_lower == "concept":
        project.concept_summary = summary
        project.concept_problem_statement = problem_statment
        project.concept_assumptions = assumptions
        project.concept_detail_summary = detail_summary
    elif agent_lower == "present":
        project.present_summary = summary
        project.present_problem_statement = problem_statment
        project.present_assumptions = assumptions
        project.present_detail_summary = detail_summary

    db.commit()
    db.refresh(project)

    return SummaryOut(
        summary=summary,
        problem_statment=problem_statment,
        assumptions=assumptions,
        detail_summary=detail_summary,
    )
