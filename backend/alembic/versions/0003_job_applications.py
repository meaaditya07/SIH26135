"""job applications (employer hiring pipeline)

Revision ID: 0003
Revises: 0002
Create Date: 2026-09-02
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "job_applications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "candidate_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("candidates.id"),
            nullable=False,
        ),
        sa.Column(
            "job_posting_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("job_postings.id"),
            nullable=False,
        ),
        sa.Column(
            "status",
            postgresql.ENUM(
                "applied", "shortlisted", "interview", "offered", "hired", "rejected",
                name="application_status",
            ),
            nullable=False,
            server_default="applied",
        ),
        sa.Column("cover_note", sa.Text()),
        sa.Column("match_score", sa.Numeric(5, 2)),
        sa.Column("skill_overlap", postgresql.JSON(), server_default="[]"),
        sa.Column("skill_gaps", postgresql.JSON(), server_default="[]"),
        sa.Column("applied_at", sa.DateTime(), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()")),
        sa.UniqueConstraint("candidate_id", "job_posting_id", name="uq_application_candidate_job"),
    )
    op.create_index(
        "ix_job_applications_candidate_id",
        "job_applications",
        ["candidate_id"],
    )
    op.create_index(
        "ix_job_applications_job_posting_id",
        "job_applications",
        ["job_posting_id"],
    )
    op.create_index(
        "ix_job_applications_status",
        "job_applications",
        ["status"],
    )


def downgrade() -> None:
    op.drop_index("ix_job_applications_status", table_name="job_applications")
    op.drop_index("ix_job_applications_job_posting_id", table_name="job_applications")
    op.drop_index("ix_job_applications_candidate_id", table_name="job_applications")
    op.drop_table("job_applications")
