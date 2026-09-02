import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, Enum, Integer, String, Text
)
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.database import Base


class SurveyTemplate(Base):
    """Reusable WhatsApp/SMS survey message templates with variable slots."""

    __tablename__ = "survey_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False, unique=True)
    channel = Column(
        Enum("whatsapp", "sms", "web_portal", name="contact_channel"),
        nullable=False,
    )
    # Message body. For WhatsApp this is a content_template_sid OR raw text is
    # allowed when a Twilio messaging service / preview template is configured.
    template_sid = Column(String(100), nullable=True)
    body = Column(Text, nullable=False)
    # Ordered variable slots, e.g. [{"key": "firstName", "label": "First Name"}].
    variables = Column(JSONB, default=[])
    # Used for the interactive reply flow, e.g. ["1", "2"] selecting employed status.
    allowed_replies = Column(JSONB, default=[])
    interval = Column(String(20), nullable=True)  # 3_month | 6_month | 12_month | null
    version = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
