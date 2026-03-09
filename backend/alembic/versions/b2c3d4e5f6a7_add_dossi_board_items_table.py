"""Add dossi_board_items table

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-03-01 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    if conn.dialect.name == 'sqlite':
        cursor = conn.execute(sa.text("SELECT name FROM sqlite_master WHERE type='table' AND name='dossi_board_items'"))
        if cursor.fetchone():
            return
    else:
        from sqlalchemy import inspect
        if 'dossi_board_items' in inspect(conn).get_table_names():
            return

    op.create_table(
        'dossi_board_items',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('project_id', sa.String(), sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('folder', sa.String(), nullable=False),
        sa.Column('file_path', sa.String(), nullable=False),
        sa.Column('filename', sa.String(), nullable=False),
        sa.Column('label', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_dossi_board_items_project_id', 'dossi_board_items', ['project_id'])


def downgrade() -> None:
    op.drop_index('ix_dossi_board_items_project_id', table_name='dossi_board_items')
    op.drop_table('dossi_board_items')
