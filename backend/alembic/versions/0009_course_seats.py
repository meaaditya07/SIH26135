"""batch seat capacity on courses (Sprint 10)

Revision ID: 0009
Revises: 0008
Create Date: 2026-09-05
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0009"
down_revision: Union[str, None] = "0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("courses", sa.Column("total_seats", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("courses", "total_seats")