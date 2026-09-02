import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, Numeric, String, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class SkillTaxonomy(Base):
    __tablename__ = "skill_taxonomy"
    __table_args__ = (
        UniqueConstraint("name", "category", name="uq_skill_name_category"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, index=True)
    category = Column(String(100), nullable=False)
    sector = Column(String(100), nullable=True, index=True)
    normalized_name = Column(String(255), nullable=False, index=True)
    embedding_id = Column(String(100), nullable=True)
    is_trending = Column(Boolean, default=False)
    trend_score = Column(Numeric(5, 2), nullable=True)
    last_analyzed_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
