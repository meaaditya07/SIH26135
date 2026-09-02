import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String, Text
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.database import Base


class JobPosting(Base):
    __tablename__ = "job_postings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employer_id = Column(UUID(as_uuid=True), ForeignKey("employers.id"), nullable=True)
    source_url = Column(String(1000), nullable=True)
    source_portal = Column(String(100), nullable=True)
    title = Column(String(500), nullable=False)
    description_raw = Column(Text, nullable=True)
    description_cleaned = Column(Text, nullable=True)
    required_skills = Column(JSONB, default=[])
    preferred_skills = Column(JSONB, default=[])
    location = Column(String(255), nullable=True)
    state = Column(String(100), nullable=True, index=True)
    district = Column(String(100), nullable=True, index=True)
    salary_min = Column(Numeric(12, 2), nullable=True)
    salary_max = Column(Numeric(12, 2), nullable=True)
    experience_min_months = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)
    scraped_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    employer = relationship("Employer", back_populates="job_postings")
    matches = relationship("CandidateJobMatch", back_populates="job_posting", lazy="selectin")
    applications = relationship("JobApplication", back_populates="job_posting", lazy="selectin")
