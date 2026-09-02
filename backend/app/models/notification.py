import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, Enum, ForeignKey, Index, Integer, String, Text
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.database import Base


class NotificationTemplate(Base):
    """Reusable message template with named variable slots."""

    __tablename__ = "notification_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False, unique=True)
    channel = Column(
        Enum("whatsapp", "sms", name="notif_channel"),
        nullable=False,
        default="whatsapp",
    )
    kind = Column(String(50), nullable=True, index=True)  # job_alert | application_status | system
    body = Column(Text, nullable=False)
    # Ordered variable slots: [{"key": "candidateName", "label": "Candidate Name"}].
    variables = Column(JSONB, default=[])
    template_sid = Column(String(100), nullable=True)  # Twilio content template sid
    is_active = Column(Boolean, default=True)
    version = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Notification(Base):
    """An outbound notification and its delivery outcome."""

    __tablename__ = "notifications"
    __table_args__ = (
        Index("ix_notifications_recipient_status", "recipient_id", "status"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    recipient_id = Column(UUID(as_uuid=True), ForeignKey("candidates.id"), nullable=True, index=True)
    recipient_type = Column(
        Enum("candidate", "employer", "training_partner", "system", name="notif_recipient_type"),
        nullable=False,
        default="system",
    )
    phone = Column(String(20), nullable=True)
    channel = Column(
        Enum("whatsapp", "sms", name="notif_channel"),
        nullable=False,
        default="whatsapp",
    )
    kind = Column(String(50), nullable=True, index=True)
    title = Column(String(255), nullable=True)
    body = Column(Text, nullable=False)
    template_id = Column(UUID(as_uuid=True), ForeignKey("notification_templates.id"), nullable=True)

    status = Column(
        Enum("queued", "sent", "failed", name="notif_status"),
        nullable=False,
        default="queued",
        index=True,
    )
    provider_message_id = Column(String(100), nullable=True)
    error = Column(Text, nullable=True)
    attempts = Column(Integer, default=0)

    sent_at = Column(DateTime, nullable=True)
    read_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    template = relationship("NotificationTemplate")
