from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import date

from app.database import get_db
from app.dependencies import require_role
from app.models.employment_outcome import EmploymentOutcome

router = APIRouter()


class OutcomeCreate(BaseModel):
    candidate_id: UUID
    enrollment_id: UUID
    employer_id: UUID | None = None
    survey_interval: str = Field(..., pattern="^(3_month|6_month|12_month)$")
    survey_date: date
    is_employed: bool
    is_self_employed: bool = False
    current_job_title: str | None = None
    monthly_salary: float | None = None
    job_location: str | None = None
    is_job_relevant_to_training: bool | None = None
    skills_used: list[str] = []
    additional_skills_acquired: list[str] = []
    months_at_employer: float | None = None


class OutcomeResponse(BaseModel):
    id: UUID
    candidate_id: UUID
    enrollment_id: UUID
    employer_id: UUID | None
    survey_interval: str
    survey_date: date
    is_employed: bool
    current_job_title: str | None
    monthly_salary: float | None
    job_location: str | None
    is_job_relevant_to_training: bool | None
    response_channel: str | None
    self_reported: bool
    verified_by_employer: bool
    created_at: object

    model_config = {"from_attributes": True}


@router.get("/", response_model=list[OutcomeResponse])
async def list_outcomes(
    candidate_id: Optional[UUID] = Query(None),
    enrollment_id: Optional[UUID] = Query(None),
    survey_interval: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin", "training_partner")),
):
    query = select(EmploymentOutcome)
    if candidate_id:
        query = query.where(EmploymentOutcome.candidate_id == candidate_id)
    if enrollment_id:
        query = query.where(EmploymentOutcome.enrollment_id == enrollment_id)
    if survey_interval:
        query = query.where(EmploymentOutcome.survey_interval == survey_interval)
    query = query.order_by(EmploymentOutcome.survey_date.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=OutcomeResponse, status_code=201)
async def create_outcome(
    body: OutcomeCreate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("candidate", "gov_admin", "training_partner")),
):
    outcome = EmploymentOutcome(**body.model_dump())
    outcome.self_reported = user.get("role") == "candidate"
    outcome.response_channel = "web_portal"
    db.add(outcome)
    await db.flush()
    await db.refresh(outcome)
    return outcome


@router.get("/candidate/{candidate_id}/timeline")
async def candidate_outcome_timeline(
    candidate_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin", "training_partner", "candidate")),
):
    """Get full longitudinal outcome timeline for a candidate."""
    result = await db.execute(
        select(EmploymentOutcome)
        .where(EmploymentOutcome.candidate_id == candidate_id)
        .order_by(EmploymentOutcome.survey_date)
    )
    outcomes = result.scalars().all()

    timeline = []
    for o in outcomes:
        timeline.append({
            "interval": o.survey_interval,
            "survey_date": str(o.survey_date),
            "is_employed": o.is_employed,
            "job_title": o.current_job_title,
            "monthly_salary": float(o.monthly_salary) if o.monthly_salary else None,
            "job_location": o.job_location,
            "is_relevant": o.is_job_relevant_to_training,
            "skills_used": o.skills_used or [],
            "months_at_employer": float(o.months_at_employer) if o.months_at_employer else None,
            "channel": o.response_channel,
        })

    return {"candidate_id": str(candidate_id), "timeline": timeline}


@router.get("/stats/placement-rates")
async def placement_rate_stats(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin")),
):
    from sqlalchemy import func

    intervals = ["3_month", "6_month", "12_month"]
    stats = {}
    for interval in intervals:
        total = await db.execute(
            select(func.count(EmploymentOutcome.id)).where(
                EmploymentOutcome.survey_interval == interval
            )
        )
        employed = await db.execute(
            select(func.count(EmploymentOutcome.id)).where(
                EmploymentOutcome.survey_interval == interval,
                EmploymentOutcome.is_employed == True,
            )
        )
        t = total.scalar() or 0
        e = employed.scalar() or 0
        stats[interval] = {
            "total_surveys": t,
            "employed": e,
            "rate": round(e / max(t, 1) * 100, 2),
        }

    return stats
