import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String, nullable=False)
    archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    thumbnail_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    # Per-agent summaries
    strategy_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    strategy_problem_statement: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    strategy_assumptions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    strategy_detail_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    research_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    research_problem_statement: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    research_assumptions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    research_detail_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    concept_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    concept_problem_statement: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    concept_assumptions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    concept_detail_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    present_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    present_problem_statement: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    present_assumptions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    present_detail_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    messages: Mapped[list["ChatMessage"]] = relationship(
        "ChatMessage", back_populates="project", order_by="ChatMessage.created_at", cascade="all, delete-orphan"
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    role: Mapped[str] = mapped_column(String, nullable=False)  # "user" | "assistant"
    content: Mapped[str] = mapped_column(Text, nullable=False)
    agent: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    project: Mapped["Project"] = relationship("Project", back_populates="messages")
