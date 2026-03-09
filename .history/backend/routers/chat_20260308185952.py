import asyncio
import os
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime
from openai import AsyncOpenAI, OpenAI, OpenAIError

from database import get_db
from models import Project, ChatMessage
from prompt import build_messages, build_summary_prompt, base_prompt

router = APIRouter()

class MessageOut(BaseModel):
    id: str
    role: str
    content: str
    image_url: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SendMessageRequest(BaseModel):
    content: str
    agent: str
    image_url: Optional[str] = None


class CitationOut(BaseModel):
    url: str
    title: Optional[str] = None
    start_index: Optional[int] = None
    end_index: Optional[int] = None


class ChatResponse(BaseModel):
    user_message: MessageOut
    assistant_message: MessageOut
    citations: Optional[List[CitationOut]] = None  # from web search when enabled
    web_search_used: bool = False  # True when the request used the web-search-capable model (Research agent)


def _messages_to_responses_input(messages: List[dict]) -> List[dict]:
    """Convert Chat Completions-style messages to Responses API input list."""
    out: List[dict] = []
    for m in messages:
        role = m.get("role", "user")
        content = m.get("content", "")
        if isinstance(content, str):
            out.append({"role": role, "content": content})
        else:
            parts = []
            for part in content:
                if isinstance(part, dict):
                    if part.get("type") == "text":
                        parts.append({"type": "input_text", "text": part.get("text", "")})
                    elif part.get("type") == "image_url":
                        url = part.get("image_url", {}) or {}
                        if isinstance(url, dict):
                            url = url.get("url", "")
                        parts.append({"type": "input_image", "image_url": url, "detail": "high"})
            out.append({"role": role, "content": parts if parts else ""})
    return out


def _extract_citations_from_response_output(output: Any) -> Optional[List[CitationOut]]:
    """Parse Responses API output for url_citation annotations."""
    if not output or not isinstance(output, list):
        return None
    citations: List[CitationOut] = []
    for item in output:
        if getattr(item, "type", None) != "message":
            continue
        content = getattr(item, "content", None) or []
        for block in content:
            if getattr(block, "type", None) != "output_text":
                continue
            ann = getattr(block, "annotations", None) or []
            for a in ann:
                if getattr(a, "type", None) == "url_citation":
                    citations.append(CitationOut(
                        url=getattr(a, "url", "") or (a.get("url") if isinstance(a, dict) else ""),
                        title=getattr(a, "title", None) or (a.get("title") if isinstance(a, dict) else None),
                        start_index=getattr(a, "start_index", None) or (a.get("start_index") if isinstance(a, dict) else None),
                        end_index=getattr(a, "end_index", None) or (a.get("end_index") if isinstance(a, dict) else None),
                    ))
                elif isinstance(a, dict) and a.get("type") == "url_citation":
                    citations.append(CitationOut(
                        url=a.get("url", ""),
                        title=a.get("title"),
                        start_index=a.get("start_index"),
                        end_index=a.get("end_index"),
                    ))
    return citations if citations else None


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/projects/{project_id}/messages", response_model=List[MessageOut])
def get_messages(project_id: str, agent: Optional[str] = None, db: Session = Depends(get_db)):
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

    # Save the user message — if image-only, store a placeholder so content is non-empty
    stored_content = body.content.strip()
    if not stored_content and body.image_url:
        stored_content = "[Image]"
    user_msg = ChatMessage(
        project_id=project_id,
        role="user",
        content=stored_content,
        agent=body.agent,
        image_url=body.image_url,
    )
    db.add(user_msg)
    db.flush()

    # Build properly structured OpenAI messages (system + alternating turns + new message)
    openai_messages = build_messages(
        new_message=body.content,
        project=project,
        history=history,
        agent=body.agent,
        image_url=body.image_url,
    )

    use_web_search = (body.agent or "").lower() == "research"
    citations: Optional[List[CitationOut]] = None
    reply_text: str = ""

    try:
        if use_web_search:
            # Official Responses API with web_search tool (model="gpt-5", tools=[{"type": "web_search"}])
            input_list = _messages_to_responses_input(openai_messages)
            sync_client = OpenAI(api_key=api_key)

            def _create_response():
                return sync_client.responses.create(
                    model="gpt-5",
                    tools=[{"type": "web_search"}],
                    input=input_list,
                    max_output_tokens=3000,
                )

            response = await asyncio.to_thread(_create_response)
            reply_text = (response.output_text or "").strip()
            output = getattr(response, "output", None)
            if output is not None:
                citations = _extract_citations_from_response_output(output)
        else:
            # Chat Completions for non-Research agents
            client = AsyncOpenAI(api_key=api_key)
            response = await client.chat.completions.create(
                model="gpt-5.2",
                messages=openai_messages,
                max_completion_tokens=3000,
                temperature=0.7,
            )
            msg = response.choices[0].message
            reply_text = (msg.content or "").strip()
    except OpenAIError as e:
        db.rollback()
        raise HTTPException(status_code=502, detail=str(e))

    if not reply_text:
        db.rollback()
        raise HTTPException(status_code=502, detail="Model returned an empty response.")

    # Save the assistant reply
    assistant_msg = ChatMessage(project_id=project_id, role="assistant", content=reply_text, agent=body.agent)
    db.add(assistant_msg)
    db.commit()
    db.refresh(user_msg)
    db.refresh(assistant_msg)

    return ChatResponse(
        user_message=user_msg,
        assistant_message=assistant_msg,
        citations=citations,
        web_search_used=use_web_search,
    )


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
    all_detail_summaries: Dict[str, str] = {
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
            model="gpt-5.2",
            messages=[
                {"role": "system", "content": base_prompt.strip()},
                {"role": "user", "content": user_prompt},
            ],
            max_completion_tokens=3000,
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
