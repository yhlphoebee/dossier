"""Add four-agent summary fields and agent column

Revision ID: a1b2c3d4e5f6
Revises: 9e2ee3c33772
Create Date: 2026-02-24 21:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '1bd847f5b20a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _columns(conn, table: str) -> set:
    if conn.dialect.name == 'sqlite':
        cursor = conn.execute(sa.text(f"PRAGMA table_info({table})"))
        return {row[1] for row in cursor.fetchall()}
    from sqlalchemy import inspect
    return {c["name"] for c in inspect(conn).get_columns(table)}


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    proj = _columns(conn, 'projects')
    project_cols = [
        'strategy_summary', 'strategy_problem_statement', 'strategy_assumptions', 'strategy_detail_summary',
        'research_summary', 'research_problem_statement', 'research_assumptions', 'research_detail_summary',
        'concept_summary', 'concept_problem_statement', 'concept_assumptions', 'concept_detail_summary',
        'present_summary', 'present_problem_statement', 'present_assumptions', 'present_detail_summary',
    ]
    for col in project_cols:
        if col not in proj:
            op.add_column('projects', sa.Column(col, sa.Text(), nullable=True))

    chat = _columns(conn, 'chat_messages')
    if 'agent' not in chat:
        op.add_column('chat_messages', sa.Column('agent', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove agent column from chat_messages
    op.drop_column('chat_messages', 'agent')

    # Remove per-agent summary fields from projects
    op.drop_column('projects', 'present_detail_summary')
    op.drop_column('projects', 'present_assumptions')
    op.drop_column('projects', 'present_problem_statement')
    op.drop_column('projects', 'present_summary')

    op.drop_column('projects', 'concept_detail_summary')
    op.drop_column('projects', 'concept_assumptions')
    op.drop_column('projects', 'concept_problem_statement')
    op.drop_column('projects', 'concept_summary')

    op.drop_column('projects', 'research_detail_summary')
    op.drop_column('projects', 'research_assumptions')
    op.drop_column('projects', 'research_problem_statement')
    op.drop_column('projects', 'research_summary')

    op.drop_column('projects', 'strategy_detail_summary')
    op.drop_column('projects', 'strategy_assumptions')
    op.drop_column('projects', 'strategy_problem_statement')
    op.drop_column('projects', 'strategy_summary')
