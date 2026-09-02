"""notification templates + notifications (Sprint 9)

Revision ID: 0004
Revises: 0003
Create Date: 2026-09-02
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "notification_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False, unique=True),
        sa.Column(
            "channel",
            postgresql.ENUM("whatsapp", "sms", name="notif_channel"),
            nullable=False,
            server_default="whatsapp",
        ),
        sa.Column("kind", sa.String(50)),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("variables", postgresql.JSONB(), server_default="[]"),
        sa.Column("template_sid", sa.String(100)),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("version", sa.Integer(), server_default="1"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()")),
    )
    op.create_index(
        "ix_notification_templates_kind", "notification_templates", ["kind"]
    )

    op.create_table(
        "notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "recipient_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("candidates.id"),
            nullable=True,
        ),
        sa.Column(
            "recipient_type",
            postgresql.ENUM(
                "candidate", "employer", "training_partner", "system",
                name="notif_recipient_type",
            ),
            nullable=False,
            server_default="system",
        ),
        sa.Column("phone", sa.String(20)),
        sa.Column("channel", postgresql.ENUM("whatsapp", "sms", name="notif_channel"), nullable=False),
        sa.Column("kind", sa.String(50)),
        sa.Column("title", sa.String(255)),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column(
            "template_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("notification_templates.id"),
            nullable=True,
        ),
        sa.Column(
            "status",
            postgresql.ENUM("queued", "sent", "failed", name="notif_status"),
            nullable=False,
            server_default="queued",
        ),
        sa.Column("provider_message_id", sa.String(100)),
        sa.Column("error", sa.Text()),
        sa.Column("attempts", sa.Integer(), server_default="0"),
        sa.Column("sent_at", sa.DateTime()),
        sa.Column("read_at", sa.DateTime()),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
    )
    op.create_index(
        "ix_notifications_kind", "notifications", ["kind"]
    )
    op.create_index(
        "ix_notifications_status", "notifications", ["status"]
    )
    op.create_index(
        "ix_notifications_recipient_id", "notifications", ["recipient_id"]
    )
    op.create_index(
        "ix_notifications_recipient_status",
        "notifications",
        ["recipient_id", "status"],
    )


def downgrade() -> None:
    op.drop_table("notifications")
    op.drop_table("notification_templates")
