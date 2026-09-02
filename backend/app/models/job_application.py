import uuid
from datetime import datetime

from sqlalchemy import (
    JSON, Column, DateTime, Enum, ForeignKey, Numeric, Text, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class JobApplication(Base):
    __tablename__ = "job_applications"
    __table_args__ = (
        # A candidate may only apply to a given posting once.
        UniqueConstraint("candidate_id", "job_posting_id", name="uq_application_candidate_job"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id = Column(UUID(as_uuid=True), ForeignKey("candidates.id"), nullable=False, index=True)
    job_posting_id = Column(UUID(as_uuid=True), ForeignKey("job_postings.id"), nullable=False, index=True)

    status = Column(
        Enum(
            "applied", "shortlisted", "interview", "offered", "hired", "rejected",
            name="application_status",
        ),
        nullable=False,
        default="applied",
        index=True,
    )
    cover_note = Column(Text, nullable=True)

    # Snapshot of the computed match at application time (for employer ranking
    # without recomputing later).
    match_score = Column(Numeric(5, 2), nullable=True)
    skill_overlap = Column(JSON, default=list)
    skill_gaps = Column(JSON, default=list)

    applied_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    candidate = relationship("Candidate", back_populates="applications")
    job_posting = relationship("JobPosting", back_populates="applications")

    @property
    def status_label(self) -> str:
        return self.status.value if hasattr(self.status, "value") else str(self.status)
