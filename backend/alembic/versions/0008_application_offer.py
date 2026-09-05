"""offer details (start date, salary) on job applications (Sprint 10)

Revision ID: 0008
Revises: 0007
Create Date: 2026-09-05
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0008"
down_revision: Union[str, None] = "0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("job_applications", sa.Column("offer_start_date", sa.DateTime(), nullable=True))
    op.add_column("job_applications", sa.Column("offer_salary", sa.Numeric(12, 2), nullable=True))


def downgrade() -> None:
    op.drop_column("job_applications", "offer_salary")
    op.drop_column("job_applications", "offer_start_date")