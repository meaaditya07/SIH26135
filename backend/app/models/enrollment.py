import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, Date, ForeignKey, String
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id = Column(UUID(as_uuid=True), ForeignKey("candidates.id"), nullable=False)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id"), nullable=False)
    training_partner_id = Column(UUID(as_uuid=True), ForeignKey("training_partners.id"), nullable=False)
    enrollment_date = Column(Date, nullable=False)
    completion_date = Column(Date, nullable=True)
    is_completed = Column(Boolean, default=False)
    certificate_id = Column(String(100), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    candidate = relationship("Candidate", back_populates="enrollments")
    course = relationship("Course", back_populates="enrollments")
    training_partner = relationship("TrainingPartner", back_populates="enrollments")
    outcomes = relationship("EmploymentOutcome", back_populates="enrollment", lazy="selectin")
    survey_schedules = relationship("SurveySchedule", back_populates="enrollment", lazy="selectin")
