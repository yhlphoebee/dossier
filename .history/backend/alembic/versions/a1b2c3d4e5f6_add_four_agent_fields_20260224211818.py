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
down_revision: Union[str, Sequence[str], None] = '9e2ee3c33772'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add per-agent summary fields to projects
    op.add_column('projects', sa.Column('strategy_summary', sa.Text(), nullable=True))
    op.add_column('projects', sa.Column('strategy_problem_statement', sa.Text(), nullable=True))
    op.add_column('projects', sa.Column('strategy_assumptions', sa.Text(), nullable=True))
    op.add_column('projects', sa.Column('strategy_detail_summary', sa.Text(), nullable=True))

    op.add_column('projects', sa.Column('research_summary', sa.Text(), nullable=True))
    op.add_column('projects', sa.Column('research_problem_statement', sa.Text(), nullable=True))
    op.add_column('projects', sa.Column('research_assumptions', sa.Text(), nullable=True))
    op.add_column('projects', sa.Column('research_detail_summary', sa.Text(), nullable=True))

    op.add_column('projects', sa.Column('concept_summary', sa.Text(), nullable=True))
    op.add_column('projects', sa.Column('concept_problem_statement', sa.Text(), nullable=True))
    op.add_column('projects', sa.Column('concept_assumptions', sa.Text(), nullable=True))
    op.add_column('projects', sa.Column('concept_detail_summary', sa.Text(), nullable=True))

    op.add_column('projects', sa.Column('present_summary', sa.Text(), nullable=True))
    op.add_column('projects', sa.Column('present_problem_statement', sa.Text(), nullable=True))
    op.add_column('projects', sa.Column('present_assumptions', sa.Text(), nullable=True))
    op.add_column('projects', sa.Column('present_detail_summary', sa.Text(), nullable=True))

    # Add agent column to chat_messages
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
