"""employer candidate shortlist/favourites (Sprint 10)

Revision ID: 0006
Revises: 0005
Create Date: 2026-09-04
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "employer_shortlists",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("employer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("employers.id"), nullable=False),
        sa.Column("candidate_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("candidates.id"), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime()),
        sa.UniqueConstraint("employer_id", "candidate_id", name="uq_employer_candidate"),
        sa.Index("ix_shortlist_employer", "employer_id"),
    )


def downgrade() -> None:
    op.drop_table("employer_shortlists")