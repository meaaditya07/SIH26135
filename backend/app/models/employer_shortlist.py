import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Index, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class EmployerShortlist(Base):
    """A saved/favourite candidate flagged by an employer for later review."""

    __tablename__ = "employer_shortlists"
    __table_args__ = (
        UniqueConstraint("employer_id", "candidate_id", name="uq_employer_candidate"),
        Index("ix_shortlist_employer", "employer_id"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employer_id = Column(UUID(as_uuid=True), ForeignKey("employers.id"), nullable=False)
    candidate_id = Column(UUID(as_uuid=True), ForeignKey("candidates.id"), nullable=False)
    note = Column(Text, nullable=True)  # future private notes
    created_at = Column(DateTime, default=datetime.utcnow)