"""add agent column and per-agent summaries

Revision ID: add_agent_and_summaries
Revises: 
Create Date: 2024-02-24 00:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "add_agent_and_summaries"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add agent to chat_messages
    op.add_column("chat_messages", sa.Column("agent", sa.String(), nullable=True))

    # Add per-agent summary fields to projects
    for prefix in ["strategy", "research", "concept", "present"]:
        op.add_column("projects", sa.Column(f"{prefix}_summary", sa.Text(), nullable=True))
        op.add_column(
            "projects",
            sa.Column(f"{prefix}_problem_statement", sa.Text(), nullable=True),
        )
        op.add_column(
            "projects",
            sa.Column(f"{prefix}_assumptions", sa.Text(), nullable=True),
        )
        op.add_column(
            "projects",
            sa.Column(f"{prefix}_detail_summary", sa.Text(), nullable=True),
        )


def downgrade() -> None:
    # Drop per-agent summary fields from projects
    for prefix in ["strategy", "research", "concept", "present"]:
        op.drop_column("projects", f"{prefix}_detail_summary")
        op.drop_column("projects", f"{prefix}_assumptions")
        op.drop_column("projects", f"{prefix}_problem_statement")
        op.drop_column("projects", f"{prefix}_summary")

    # Drop agent from chat_messages
    op.drop_column("chat_messages", "agent")
