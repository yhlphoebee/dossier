"""add cover_logo JSON to projects

Revision ID: e8f9a0b1c2d3
Revises: d1e2f3a4b5c6
Create Date: 2026-03-22 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e8f9a0b1c2d3'
down_revision: Union[str, Sequence[str], None] = 'd1e2f3a4b5c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    if conn.dialect.name == 'sqlite':
        cursor = conn.execute(sa.text("PRAGMA table_info(projects)"))
        cols = [row[1] for row in cursor.fetchall()]
        if 'cover_logo' not in cols:
            op.add_column('projects', sa.Column('cover_logo', sa.JSON(), nullable=True))
    else:
        from sqlalchemy import inspect
        cols = {c['name'] for c in inspect(conn).get_columns('projects')}
        if 'cover_logo' not in cols:
            op.add_column('projects', sa.Column('cover_logo', sa.JSON(), nullable=True))


def downgrade() -> None:
    conn = op.get_bind()
    if conn.dialect.name == 'sqlite':
        cursor = conn.execute(sa.text("PRAGMA table_info(projects)"))
        cols = [row[1] for row in cursor.fetchall()]
        if 'cover_logo' in cols:
            op.drop_column('projects', 'cover_logo')
    else:
        from sqlalchemy import inspect
        cols = {c['name'] for c in inspect(conn).get_columns('projects')}
        if 'cover_logo' in cols:
            op.drop_column('projects', 'cover_logo')
