import uuid
from datetime import datetime

from sqlalchemy import (
    Column, DateTime, Enum, ForeignKey, Index, String, Text
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.database import Base


class SurveyResponse(Base):
    """Inbound channel response to a dispatched survey (raw + parsed payload)."""

    __tablename__ = "survey_responses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    survey_schedule_id = Column(
        UUID(as_uuid=True), ForeignKey("survey_schedules.id"), nullable=False, index=True
    )
    candidate_id = Column(
        UUID(as_uuid=True), ForeignKey("candidates.id"), nullable=False, index=True
    )
    channel = Column(
        Enum("whatsapp", "sms", "web_portal", name="contact_channel"),
        nullable=False,
    )
    provider_message_id = Column(String(100), nullable=True)  # Twilio SMS sid
    raw_text = Column(Text, nullable=True)
    # Normalized payload produced by parse_reply(), e.g.
    # {"is_employed": true, "job_title": "...", "monthly_salary": 25000, ...}
    parsed = Column(JSONB, default={})
    # Outcome row created from this response, if any.
    outcome_id = Column(UUID(as_uuid=True), ForeignKey("employment_outcomes.id"), nullable=True)
    # Twilio "From" phone, de-identified later.
    from_phone = Column(String(15), nullable=True)
    error = Column(Text, nullable=True)
    received_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_survey_resp_schedule", "survey_schedule_id", "received_at"),
    )

    schedule = relationship("SurveySchedule", foreign_keys=[survey_schedule_id])
