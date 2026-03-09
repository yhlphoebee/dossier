"""add image_url to chat_messages

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-03-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'c3d4e5f6a7b8'
down_revision = 'b2c3d4e5f6a7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    if conn.dialect.name == 'sqlite':
        cursor = conn.execute(sa.text("PRAGMA table_info(chat_messages)"))
        columns = {row[1] for row in cursor.fetchall()}
    else:
        from sqlalchemy import inspect
        columns = {c["name"] for c in inspect(conn).get_columns("chat_messages")}
    if 'image_url' not in columns:
        op.add_column('chat_messages', sa.Column('image_url', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('chat_messages', 'image_url')
