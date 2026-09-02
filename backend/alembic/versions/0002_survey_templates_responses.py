"""survey templates, responses, schedule attempts

Revision ID: 0002
Revises: 0001
Create Date: 2026-09-02
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ─── survey_schedules: add attempts ───
    op.add_column(
        "survey_schedules",
        sa.Column("attempts", sa.Integer(), server_default="0", nullable=False),
    )

    # ─── survey_templates ───
    op.create_table(
        "survey_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column(
            "channel",
            postgresql.ENUM("whatsapp", "sms", "web_portal", name="contact_channel"),
            nullable=False,
        ),
        sa.Column("template_sid", sa.String(100)),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("variables", postgresql.JSONB(), server_default="[]"),
        sa.Column("allowed_replies", postgresql.JSONB(), server_default="[]"),
        sa.Column("interval", sa.String(20)),
        sa.Column("version", sa.Integer(), server_default="1"),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()")),
        sa.UniqueConstraint("name", name="uq_survey_template_name"),
    )

    # ─── survey_responses ───
    op.create_table(
        "survey_responses",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "survey_schedule_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("survey_schedules.id"),
            nullable=False,
        ),
        sa.Column(
            "candidate_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("candidates.id"),
            nullable=False,
        ),
        sa.Column(
            "channel",
            postgresql.ENUM("whatsapp", "sms", "web_portal", name="contact_channel"),
            nullable=False,
        ),
        sa.Column("provider_message_id", sa.String(100)),
        sa.Column("raw_text", sa.Text()),
        sa.Column("parsed", postgresql.JSONB(), server_default="{}"),
        sa.Column(
            "outcome_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("employment_outcomes.id"),
        ),
        sa.Column("from_phone", sa.String(15)),
        sa.Column("error", sa.Text()),
        sa.Column("received_at", sa.DateTime(), server_default=sa.text("now()")),
    )
    op.create_index(
        "ix_survey_responses_survey_schedule_id",
        "survey_responses",
        ["survey_schedule_id"],
    )
    op.create_index(
        "ix_survey_responses_candidate_id",
        "survey_responses",
        ["candidate_id"],
    )
    op.create_index(
        "ix_survey_resp_schedule",
        "survey_responses",
        ["survey_schedule_id", "received_at"],
    )


def downgrade() -> None:
    op.drop_table("survey_responses")
    op.drop_table("survey_templates")
    op.drop_column("survey_schedules", "attempts")
