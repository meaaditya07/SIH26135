"""interview scheduling + candidate job-alert preferences (Sprint 10)

Revision ID: 0010
Revises: 0009
Create Date: 2026-09-05
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0010"
down_revision: Union[str, None] = "0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("job_applications", sa.Column("interview_at", sa.DateTime(), nullable=True))
    op.add_column("job_applications", sa.Column("interview_note", sa.Text(), nullable=True))
    op.add_column("candidates", sa.Column("preferred_job_states", postgresql.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("candidates", "preferred_job_states")
    op.drop_column("job_applications", "interview_note")
    op.drop_column("job_applications", "interview_at")