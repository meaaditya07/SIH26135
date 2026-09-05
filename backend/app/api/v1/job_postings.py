from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID

from app.database import get_db
from app.dependencies import require_role
from app.models.user import User
from app.models.job_posting import JobPosting
from app.models.candidate import Candidate
from app.models.notification import Notification
from app.services.notification_service import render_template
from app.services.matching_service import score_candidates_for_job
from app.core.exceptions import raise_not_found

router = APIRouter()

_JOB_ALERT_SPEC = {
    "kind": "job_alert",
    "title": "New Job Match",
    "template": "New opportunity: {jobTitle} is now available for you. "
                "Check your SkillTrace portal for matching jobs.",
}
_JOB_MATCH_MIN_SCORE = 50
_JOB_MATCH_LIMIT = 5


async def _queue_job_alert_notifications(
    db: AsyncSession, posting: JobPosting, min_score: int = _JOB_MATCH_MIN_SCORE
) -> int:
    """Notify the top-matching candidates when a new job is posted.

    Fire-and-forget delivery via the worker; failures leave rows queued.
    """
    if not posting.is_active:
        return 0

    matches = await score_candidates_for_job(db, posting, limit=_JOB_MATCH_LIMIT, min_score=min_score)

    posting_state = (posting.state or "").strip().lower()

    variables = {"jobTitle": posting.title}
    body = render_template(_JOB_ALERT_SPEC["template"], variables)

    sent = 0
    for m in matches:
        cand = (
            await db.execute(select(Candidate).where(Candidate.id == UUID(m["candidate_id"])))
        ).scalar_one_or_none()
        if not cand:
            continue

        # Respect the candidate's preferred-locations filter when set.
        prefs = cand.preferred_job_states or []
        if prefs and posting_state:
            norm_prefs = {str(p).strip().lower() for p in prefs}
            if posting_state not in norm_prefs:
                continue
        notif = Notification(
            recipient_id=cand.id,
            recipient_type="candidate",
            phone=cand.phone,
            channel="whatsapp",
            kind=_JOB_ALERT_SPEC["kind"],
            title=_JOB_ALERT_SPEC["title"],
            body=body,
            status="queued",
        )
        db.add(notif)
        await db.flush()
        await db.refresh(notif)
        try:
            from worker_queue import enqueue_delivery
            enqueue_delivery(str(notif.id))
        except Exception:
            pass
        sent += 1

    return sent


class JobPostingCreate(BaseModel):
    employer_id: UUID | None = None
    title: str = Field(..., min_length=5, max_length=500)
    description_raw: str | None = None
    required_skills: list[str] = []
    preferred_skills: list[str] = []
    location: str | None = None
    state: str | None = None
    district: str | None = None
    salary_min: float | None = None
    salary_max: float | None = None
    experience_min_months: int | None = None


class JobPostingResponse(BaseModel):
    id: UUID
    title: str
    required_skills: list
    preferred_skills: list
    state: Optional[str]
    district: Optional[str]
    salary_min: Optional[float]
    salary_max: Optional[float]
    is_active: bool
    created_at: object

    model_config = {"from_attributes": True}


@router.get("/", response_model=list[JobPostingResponse])
async def list_job_postings(
    state: Optional[str] = Query(None),
    sector: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(True),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin", "employer")),
):
    query = select(JobPosting)
    if state:
        query = query.where(JobPosting.state == state)
    if is_active is not None:
        query = query.where(JobPosting.is_active == is_active)
    query = query.order_by(JobPosting.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{posting_id}", response_model=JobPostingResponse)
async def get_job_posting(
    posting_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin", "employer")),
):
    result = await db.execute(
        select(JobPosting).where(JobPosting.id == posting_id)
    )
    posting = result.scalar_one_or_none()
    if not posting:
        raise_not_found("Job Posting", str(posting_id))
    return posting


@router.post("/", response_model=JobPostingResponse, status_code=201)
async def create_job_posting(
    body: JobPostingCreate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin", "employer")),
):
    posting = JobPosting(**body.model_dump())
    if not posting.employer_id:
        u = (
            await db.execute(select(User).where(User.id == UUID(str(user["sub"]))))
        ).scalar_one_or_none()
        if u and u.employer_id:
            posting.employer_id = u.employer_id
    posting.source_portal = "manual"
    db.add(posting)
    await db.flush()
    await db.refresh(posting)
    try:
        await _queue_job_alert_notifications(db, posting)
    except Exception:
        pass
    return posting


@router.patch("/{posting_id}", response_model=JobPostingResponse)
async def update_job_posting(
    posting_id: UUID,
    body: JobPostingCreate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin", "employer")),
):
    result = await db.execute(
        select(JobPosting).where(JobPosting.id == posting_id)
    )
    posting = result.scalar_one_or_none()
    if not posting:
        raise_not_found("Job Posting", str(posting_id))

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(posting, field, value)
    await db.flush()
    await db.refresh(posting)
    return posting


@router.delete("/{posting_id}")
async def deactivate_job_posting(
    posting_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin", "employer")),
):
    result = await db.execute(
        select(JobPosting).where(JobPosting.id == posting_id)
    )
    posting = result.scalar_one_or_none()
    if not posting:
        raise_not_found("Job Posting", str(posting_id))
    posting.is_active = False
    await db.flush()
    return {"status": "deactivated", "posting_id": str(posting_id)}
