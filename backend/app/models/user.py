import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, Enum, ForeignKey, Index, Integer, String
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phone = Column(String(15), unique=True, nullable=False, index=True)
    email = Column(String(255), nullable=True, unique=True)
    full_name = Column(String(255), nullable=False)
    role = Column(
        Enum("candidate", "training_partner", "employer", "gov_admin", name="user_role"),
        nullable=False,
        default="candidate",
    )
    password_hash = Column(String(255), nullable=True)
    aadhaar_hash = Column(String(64), nullable=True, unique=True, index=True)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    last_login_at = Column(DateTime, nullable=True)

    candidate_id = Column(UUID(as_uuid=True), ForeignKey("candidates.id"), nullable=True, unique=True)
    training_partner_id = Column(UUID(as_uuid=True), ForeignKey("training_partners.id"), nullable=True)
    employer_id = Column(UUID(as_uuid=True), ForeignKey("employers.id"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    candidate = relationship("Candidate", foreign_keys=[candidate_id])
    training_partner = relationship("TrainingPartner", foreign_keys=[training_partner_id])
    employer = relationship("Employer", foreign_keys=[employer_id])

    __table_args__ = (
        Index("ix_user_role", "role"),
    )


class OTPRecord(Base):
    __tablename__ = "otp_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phone = Column(String(15), nullable=False, index=True)
    otp_hash = Column(String(64), nullable=False)
    purpose = Column(String(20), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    attempts = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
