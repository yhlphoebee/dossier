import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Literal
from openai import AsyncOpenAI, OpenAIError

router = APIRouter()

SYSTEM_PROMPT = """You are Dossier AI, a creative design assistant built for graphic designers and design students.
Your role is to help users develop, research, and refine their design projects.
Be concise, thoughtful, and encouraging. Ask clarifying questions when needed.
Focus on design thinking, visual communication, typography, branding, and creative process."""


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    project_id: str
    messages: list[ChatMessage]


class ChatResponse(BaseModel):
    reply: str


@router.post("/chat", response_model=ChatResponse)
async def chat(body: ChatRequest):
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
                {"role": "system", "content": SYSTEM_PROMPT},
                *[{"role": m.role, "content": m.content} for m in body.messages],
            ],
            max_tokens=1024,
            temperature=0.7,
        )
        reply = response.choices[0].message.content or ""
        return ChatResponse(reply=reply)

    except OpenAIError as e:
        raise HTTPException(status_code=502, detail=str(e))
