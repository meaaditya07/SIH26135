import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, Numeric
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.database import Base


class CandidateJobMatch(Base):
    __tablename__ = "candidate_job_matches"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id = Column(UUID(as_uuid=True), ForeignKey("candidates.id"), nullable=False)
    job_posting_id = Column(UUID(as_uuid=True), ForeignKey("job_postings.id"), nullable=False)
    match_score = Column(Numeric(5, 2), nullable=False)
    skill_overlap = Column(JSONB, default=[])
    skill_gaps = Column(JSONB, default=[])
    location_compatible = Column(Boolean, default=True)
    salary_compatible = Column(Boolean, default=True)
    recommended_at = Column(DateTime, default=datetime.utcnow)

    candidate = relationship("Candidate", back_populates="job_matches")
    job_posting = relationship("JobPosting", back_populates="matches")
