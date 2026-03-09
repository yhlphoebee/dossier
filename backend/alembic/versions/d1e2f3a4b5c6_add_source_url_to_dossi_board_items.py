"""Add source_url to dossi_board_items

Revision ID: d1e2f3a4b5c6
Revises: b2c3d4e5f6a7
Create Date: 2026-03-08 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd1e2f3a4b5c6'
down_revision: Union[str, Sequence[str], None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    if conn.dialect.name == 'sqlite':
        cursor = conn.execute(sa.text("PRAGMA table_info(dossi_board_items)"))
        cols = [row[1] for row in cursor.fetchall()]
        if 'source_url' not in cols:
            op.add_column('dossi_board_items', sa.Column('source_url', sa.Text(), nullable=True))
    else:
        from sqlalchemy import inspect
        cols = [c['name'] for c in inspect(conn).get_columns('dossi_board_items')]
        if 'source_url' not in cols:
            op.add_column('dossi_board_items', sa.Column('source_url', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('dossi_board_items', 'source_url')
