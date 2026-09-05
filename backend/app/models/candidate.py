import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, Enum, JSON, String, Text
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    aadhaar_hash = Column(String(64), unique=True, nullable=False, index=True)
    phone = Column(String(15), nullable=False, index=True)
    email = Column(String(255), nullable=True)
    full_name = Column(String(255), nullable=False)
    date_of_birth = Column(Text, nullable=True)  # Date stored as text for flexibility
    gender = Column(String(20), nullable=True)
    state = Column(String(100), nullable=True, index=True)
    district = Column(String(100), nullable=True, index=True)
    pincode = Column(String(10), nullable=True)

    # Verification
    digilocker_status = Column(
        Enum("pending", "verified", "rejected", name="verification_status"),
        default="pending",
    )
    digilocker_token_encrypted = Column(Text, nullable=True)
    verified_docs = Column(JSONB, default={})

    # Skill Profile
    skill_tags = Column(JSONB, default=[])

    # Privacy
    allow_employer_contact = Column(Boolean, default=True, nullable=False)

    # Job-alert preferences (states the candidate wants alerts for).
    preferred_job_states = Column(JSON, default=list)

    # Meta
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    enrollments = relationship("Enrollment", back_populates="candidate", lazy="selectin")
    outcomes = relationship("EmploymentOutcome", back_populates="candidate", lazy="selectin")
    job_matches = relationship("CandidateJobMatch", back_populates="candidate", lazy="selectin")
    applications = relationship("JobApplication", back_populates="candidate", lazy="selectin")
