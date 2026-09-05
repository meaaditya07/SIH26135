from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import date
import csv
import io

from app.database import get_db
from app.dependencies import require_role
from app.models.candidate import Candidate
from app.models.enrollment import Enrollment
from app.models.employment_outcome import EmploymentOutcome

router = APIRouter()

_INTERVALS = ("3_month", "6_month", "12_month")


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


@router.post("/import")
async def import_outcomes_csv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin", "training_partner")),
):
    """
    CSV import for employment outcomes.

    Columns: candidate_phone (required), survey_date (YYYY-MM-DD, required),
    is_employed (yes/no/true/false/1/0, required), survey_interval
    (3_month|6_month|12_month, default 3_month), current_job_title,
    monthly_salary, job_location, is_self_employed, enrollment_id (optional —
    resolved to the candidate's latest completed enrollment if omitted).
    """
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    content = await file.read()
    try:
        decoded = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        decoded = content.decode("latin-1")
    reader = csv.DictReader(io.StringIO(decoded))

    results = {"imported": 0, "errors": []}

    def _parse_bool(v: str | None) -> bool:
        return str(v or "").strip().lower() in ("yes", "true", "1", "y", "employed")

    def _parse_interval(v: str | None) -> str:
        raw = (v or "3_month").strip().lower()
        normalized = {"3month": "3_month", "6month": "6_month", "12month": "12_month"}.get(raw, raw)
        if normalized not in _INTERVALS:
            raise ValueError(f"invalid survey_interval '{raw}'")
        return normalized

    for i, row in enumerate(reader, start=2):
        try:
            phone = (row.get("candidate_phone") or "").strip()
            if not phone:
                results["errors"].append({"row": i, "error": "candidate_phone is required"})
                continue

            cand = (
                await db.execute(select(Candidate).where(Candidate.phone == phone))
            ).scalar_one_or_none()
            if not cand:
                results["errors"].append({"row": i, "error": f"Candidate {phone} not found"})
                continue

            survey_date = date.fromisoformat((row.get("survey_date") or "").strip())
            interval = _parse_interval(row.get("survey_interval"))
            is_employed = _parse_bool(row.get("is_employed"))
            salary_raw = (row.get("monthly_salary") or "").strip()

            enrollment_id = None
            if (row.get("enrollment_id") or "").strip():
                enrollment_id = UUID((row.get("enrollment_id") or "").strip())
            else:
                eres = await db.execute(
                    select(Enrollment)
                    .where(Enrollment.candidate_id == cand.id)
                    .order_by(Enrollment.enrollment_date.desc())
                    .limit(1)
                )
                latest = eres.scalar_one_or_none()
                if latest:
                    enrollment_id = latest.id

            outcome = EmploymentOutcome(
                candidate_id=cand.id,
                enrollment_id=enrollment_id,
                survey_interval=interval,
                survey_date=survey_date,
                is_employed=is_employed,
                is_self_employed=_parse_bool(row.get("is_self_employed")),
                current_job_title=(row.get("current_job_title") or "").strip() or None,
                monthly_salary=float(salary_raw) if salary_raw else None,
                job_location=(row.get("job_location") or "").strip() or None,
                response_channel="web_portal",
                self_reported=False,
            )
            db.add(outcome)
            results["imported"] += 1
        except Exception as e:
            results["errors"].append({"row": i, "error": str(e)})

    await db.flush()
    return results


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
