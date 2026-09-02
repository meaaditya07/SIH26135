import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Index, Numeric, String
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class SkillGapScore(Base):
    __tablename__ = "skill_gap_scores"
    __table_args__ = (
        Index("ix_gap_region_date", "state", "district", "computed_at"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    state = Column(String(100), nullable=False, index=True)
    district = Column(String(100), nullable=True)
    sector = Column(String(100), nullable=False)
    skill_name = Column(String(255), nullable=False)

    demand_score = Column(Numeric(5, 2), nullable=False)
    supply_score = Column(Numeric(5, 2), nullable=False)
    gap_score = Column(Numeric(5, 2), nullable=False)
    gap_direction = Column(String(10), nullable=True)

    computed_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    model_version = Column(String(50), nullable=True)
