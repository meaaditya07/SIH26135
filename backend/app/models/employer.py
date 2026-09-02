import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Employer(Base):
    __tablename__ = "employers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    industry = Column(String(100), nullable=True, index=True)
    state = Column(String(100), nullable=True, index=True)
    district = Column(String(100), nullable=True)
    website = Column(String(500), nullable=True)
    contact_person = Column(String(255), nullable=True)
    phone = Column(String(15), nullable=True)
    email = Column(String(255), nullable=True)
    is_verified = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    job_postings = relationship("JobPosting", back_populates="employer", lazy="selectin")
    outcomes = relationship("EmploymentOutcome", back_populates="employer", lazy="selectin")
