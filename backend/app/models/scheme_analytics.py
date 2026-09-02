import uuid
from datetime import datetime

from sqlalchemy import (
    Column, DateTime, Date, Enum, ForeignKey, Index, Integer, Numeric, String
)
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class SchemeAnalytics(Base):
    __tablename__ = "scheme_analytics"
    __table_args__ = (
        Index("ix_scheme_partner_period", "scheme_id", "training_partner_id", "period"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scheme_id = Column(String(50), nullable=False, index=True)
    training_partner_id = Column(UUID(as_uuid=True), ForeignKey("training_partners.id"), nullable=True)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id"), nullable=True)
    period = Column(Date, nullable=False)
    state = Column(String(100), nullable=True)
    district = Column(String(100), nullable=True)

    # Enrollment metrics
    total_enrolled = Column(Integer, default=0)
    total_completed = Column(Integer, default=0)
    completion_rate = Column(Numeric(5, 2), nullable=True)

    # Placement metrics
    total_placed_3m = Column(Integer, default=0)
    total_placed_6m = Column(Integer, default=0)
    total_placed_12m = Column(Integer, default=0)
    retention_3m = Column(Numeric(5, 2), nullable=True)
    retention_6m = Column(Numeric(5, 2), nullable=True)
    retention_12m = Column(Numeric(5, 2), nullable=True)

    # Financial metrics
    total_cost = Column(Numeric(14, 2), nullable=True)
    cost_per_placement = Column(Numeric(10, 2), nullable=True)
    avg_salary_at_placement = Column(Numeric(10, 2), nullable=True)
    roi_score = Column(Numeric(8, 4), nullable=True)

    # Curriculum fit
    curriculum_market_fit_score = Column(Numeric(5, 2), nullable=True)
    alert_status = Column(
        Enum("active", "completed", "underperforming", "alert", name="scheme_status"),
        default="active",
    )
    alert_reason = Column(String(500), nullable=True)

    computed_at = Column(DateTime, default=datetime.utcnow)
