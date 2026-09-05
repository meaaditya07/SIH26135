import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Course(Base):
    __tablename__ = "courses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    training_partner_id = Column(UUID(as_uuid=True), ForeignKey("training_partners.id"), nullable=False)
    name = Column(String(255), nullable=False)
    sector = Column(String(100), nullable=False, index=True)
    duration_weeks = Column(Integer, nullable=False)
    total_seats = Column(Integer, nullable=True)
    ncvt_code = Column(String(50), nullable=True)
    curriculum_snapshot = Column(JSONB, default={})
    skills_taught = Column(JSONB, default=[])
    scheme_id = Column(String(50), nullable=True, index=True)
    cost_per_candidate = Column(Numeric(10, 2), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    training_partner = relationship("TrainingPartner", back_populates="courses")
    enrollments = relationship("Enrollment", back_populates="course", lazy="selectin")
