import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, Date, Enum, ForeignKey, Numeric, String,
    UniqueConstraint
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.database import Base


class EmploymentOutcome(Base):
    __tablename__ = "employment_outcomes"
    __table_args__ = (
        UniqueConstraint(
            "candidate_id", "enrollment_id", "survey_interval",
            name="uq_outcome_per_interval",
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id = Column(UUID(as_uuid=True), ForeignKey("candidates.id"), nullable=False, index=True)
    enrollment_id = Column(UUID(as_uuid=True), ForeignKey("enrollments.id"), nullable=False)
    employer_id = Column(UUID(as_uuid=True), ForeignKey("employers.id"), nullable=True)

    survey_interval = Column(
        Enum("3_month", "6_month", "12_month", name="survey_interval"),
        nullable=False,
    )
    survey_date = Column(Date, nullable=False)

    # Outcome fields
    is_employed = Column(Boolean, nullable=False, default=False)
    is_self_employed = Column(Boolean, default=False)
    current_job_title = Column(String(255), nullable=True)
    monthly_salary = Column(Numeric(12, 2), nullable=True)
    salary_currency = Column(String(3), default="INR")
    job_location = Column(String(255), nullable=True)
    is_job_relevant_to_training = Column(Boolean, nullable=True)

    # Skills
    skills_used = Column(JSONB, default=[])
    additional_skills_acquired = Column(JSONB, default=[])

    # Retention
    employer_retention_confirmed = Column(Boolean, default=False)
    months_at_employer = Column(Numeric(4, 1), nullable=True)

    # Metadata
    response_channel = Column(
        Enum("whatsapp", "sms", "web_portal", name="contact_channel"),
        nullable=True,
    )
    self_reported = Column(Boolean, default=False)
    verified_by_employer = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    candidate = relationship("Candidate", back_populates="outcomes")
    employer = relationship("Employer", back_populates="outcomes")
    enrollment = relationship("Enrollment", back_populates="outcomes")
