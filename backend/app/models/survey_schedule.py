import uuid
from datetime import datetime

from sqlalchemy import (
    Column, DateTime, Date, Enum, ForeignKey, Integer, String
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class SurveySchedule(Base):
    __tablename__ = "survey_schedules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id = Column(UUID(as_uuid=True), ForeignKey("candidates.id"), nullable=False, index=True)
    enrollment_id = Column(UUID(as_uuid=True), ForeignKey("enrollments.id"), nullable=False)
    scheduled_interval = Column(
        Enum("3_month", "6_month", "12_month", name="survey_interval_type"),
        nullable=False,
    )
    scheduled_date = Column(Date, nullable=False)
    channel = Column(
        Enum("whatsapp", "sms", "web_portal", name="contact_channel_type"),
        nullable=False,
    )
    status = Column(String(20), default="scheduled")
    message_template_id = Column(String(100), nullable=True)
    attempts = Column(Integer, default=0)
    last_attempt_at = Column(DateTime, nullable=True)
    response_received_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    enrollment = relationship("Enrollment", back_populates="survey_schedules")
    candidate = relationship("Candidate")
