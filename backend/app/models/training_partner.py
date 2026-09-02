import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class TrainingPartner(Base):
    __tablename__ = "training_partners"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    registration_number = Column(String(50), unique=True, nullable=False)
    pan_number = Column(String(10), nullable=True)
    state = Column(String(100), nullable=False, index=True)
    district = Column(String(100), nullable=False)
    address = Column(Text, nullable=True)
    contact_person = Column(String(255), nullable=True)
    phone = Column(String(15), nullable=True)
    email = Column(String(255), nullable=True)
    is_approved = Column(Boolean, default=False)
    approved_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    courses = relationship("Course", back_populates="training_partner", lazy="selectin")
    enrollments = relationship("Enrollment", back_populates="training_partner", lazy="selectin")
