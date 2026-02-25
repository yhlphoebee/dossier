import os
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime
from openai import AsyncOpenAI, OpenAIError

from database import get_db
from models import Project, ChatMessage
from prompt import build_messages

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


class ChatResponse(BaseModel):
    user_message: MessageOut
    assistant_message: MessageOut


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/projects/{project_id}/messages", response_model=list[MessageOut])
def get_messages(project_id: str, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project.messages


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

    # Snapshot history before saving the new message
    history = list(project.messages)

    # Save the user message
    user_msg = ChatMessage(project_id=project_id, role="user", content=body.content)
    db.add(user_msg)
    db.flush()

    # Build properly structured OpenAI messages (system + alternating turns + new message)
    openai_messages = build_messages(
        new_message=body.content,
        project=project,
        history=history,
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
    assistant_msg = ChatMessage(project_id=project_id, role="assistant", content=reply_text)
    db.add(assistant_msg)
    db.commit()
    db.refresh(user_msg)
    db.refresh(assistant_msg)

    return ChatResponse(user_message=user_msg, assistant_message=assistant_msg)
