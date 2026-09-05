from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from uuid import UUID
from datetime import date, datetime

from app.database import get_db
from app.dependencies import require_role
from app.models.user import User
from app.models.candidate import Candidate
from app.models.employer import Employer
from app.models.job_posting import JobPosting
from app.models.job_application import JobApplication
from app.models.notification import Notification
from app.services.application_service import (
    STATUS_TRANSITIONS,
    can_transition,
    funnel_counts,
    is_valid_status,
)
from app.services.notification_service import (
    APPLICATION_STATUS_NOTIFICATIONS,
    build_application_status_variables,
    render_template,
)
from app.services.skill_gap_engine import compute_match_score
from app.services.worker_queue import enqueue_delivery

router = APIRouter()


class ApplicationCreate(BaseModel):
    job_posting_id: UUID
    cover_note: Optional[str] = Field(None, max_length=2000)


class StatusUpdate(BaseModel):
    status: str
    feedback: Optional[str] = Field(None, max_length=2000)
    start_date: Optional[date] = None
    salary_offered: Optional[float] = None
    interview_at: Optional[datetime] = None
    interview_note: Optional[str] = Field(None, max_length=2000)


class InterviewUpdate(BaseModel):
    interview_at: Optional[datetime] = None
    interview_note: Optional[str] = Field(None, max_length=2000)


class ApplicationResponse(BaseModel):
    id: UUID
    candidate_id: UUID
    job_posting_id: UUID
    status: str
    cover_note: Optional[str]
    feedback: Optional[str] = None
    offer_start_date: Optional[date] = None
    offer_salary: Optional[float] = None
    interview_at: Optional[datetime] = None
    interview_note: Optional[str] = None
    match_score: Optional[float]
    applied_at: object
    updated_at: object


async def _current_user_row(db: AsyncSession, user: dict) -> User:
    result = await db.execute(select(User).where(User.id == UUID(str(user["sub"]))))
    u = result.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="Linked account not found")
    return u


async def _current_candidate_id(db: AsyncSession, user: dict) -> UUID:
    u = await _current_user_row(db, user)
    if not u.candidate_id:
        raise HTTPException(status_code=403, detail="No candidate profile linked to account")
    return u.candidate_id


async def _current_employer_id(db: AsyncSession, user: dict) -> UUID:
    u = await _current_user_row(db, user)
    if not u.employer_id:
        raise HTTPException(status_code=403, detail="No employer profile linked to account")
    return u.employer_id


@router.post("/", response_model=ApplicationResponse, status_code=201)
async def apply_to_job(
    body: ApplicationCreate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("candidate")),
):
    candidate_id = await _current_candidate_id(db, user)

    job_result = await db.execute(
        select(JobPosting).where(JobPosting.id == body.job_posting_id)
    )
    job = job_result.scalar_one_or_none()
    if not job or not job.is_active:
        raise HTTPException(status_code=404, detail="Job posting not found or inactive")

    existing = await db.execute(
        select(JobApplication).where(
            JobApplication.candidate_id == candidate_id,
            JobApplication.job_posting_id == body.job_posting_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Already applied to this job")

    candidate = (
        await db.execute(select(Candidate).where(Candidate.id == candidate_id))
    ).scalar_one()

    match = compute_match_score(
        candidate_skills=candidate.skill_tags or [],
        job_required=job.required_skills or [],
        job_preferred=job.preferred_skills or [],
    )

    app = JobApplication(
        candidate_id=candidate_id,
        job_posting_id=job.id,
        cover_note=body.cover_note,
        status="applied",
        match_score=match["match_score"],
        skill_overlap=match["skill_overlap"],
        skill_gaps=match["skill_gaps"],
    )
    db.add(app)
    await db.flush()
    await db.refresh(app)

    await _queue_employer_application_alert(db, app, candidate, job)
    return app


@router.get("/mine", response_model=list[ApplicationResponse])
async def my_applications(
    status_filter: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("candidate")),
):
    candidate_id = await _current_candidate_id(db, user)
    query = select(JobApplication).where(JobApplication.candidate_id == candidate_id)
    if status_filter:
        query = query.where(JobApplication.status == status_filter)
    query = query.order_by(JobApplication.applied_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/overview", dependencies=[Depends(require_role("employer", "gov_admin"))])
async def employer_applications_overview(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("employer", "gov_admin")),
):
    """All applications across the employer's jobs, enriched with candidate + job info."""
    u = await _current_user_row(db, user)
    employer_id = u.employer_id
    if not employer_id:
        raise HTTPException(status_code=403, detail="No employer profile linked to account")

    postings = (
        (await db.execute(select(JobPosting).where(JobPosting.employer_id == employer_id)))
        .scalars()
        .all()
    )
    posting_ids = [p.id for p in postings]
    posting_map = {p.id: p for p in postings}

    apps = []
    if posting_ids:
        apps = (
            await db.execute(
                select(JobApplication)
                .where(JobApplication.job_posting_id.in_(posting_ids))
                .order_by(JobApplication.applied_at.desc())
            )
        ).scalars().all()

    cand_ids = {a.candidate_id for a in apps}
    cand_map = {}
    if cand_ids:
        for c in (
            await db.execute(select(Candidate).where(Candidate.id.in_(cand_ids)))
        ).scalars().all():
            cand_map[c.id] = c

    rows = []
    for a in apps:
        cand = cand_map.get(a.candidate_id)
        posting = posting_map.get(a.job_posting_id)
        rows.append({
            "id": str(a.id),
            "candidate_id": str(a.candidate_id),
            "job_posting_id": str(a.job_posting_id),
            "status": _status_value(a),
            "match_score": float(a.match_score) if a.match_score is not None else None,
            "skill_overlap": a.skill_overlap or [],
            "skill_gaps": a.skill_gaps or [],
            "cover_note": a.cover_note,
            "feedback": a.feedback,
            "offer_start_date": a.offer_start_date.isoformat() if a.offer_start_date else None,
            "offer_salary": float(a.offer_salary) if a.offer_salary is not None else None,
            "interview_at": a.interview_at.isoformat() if a.interview_at else None,
            "interview_note": a.interview_note,
            "applied_at": a.applied_at,
            "candidate": {
                "full_name": cand.full_name if cand else None,
                "state": cand.state if cand else None,
                "district": cand.district if cand else None,
                "phone": cand.phone if cand and cand.allow_employer_contact else None,
                "skill_tags": cand.skill_tags or [] if cand else [],
            },
            "job": {
                "title": posting.title if posting else None,
                "location": posting.location if posting else None,
                "state": posting.state if posting else None,
            },
        })

    from collections import Counter
    by_status = Counter(r["status"] for r in rows)
    return {
        "employer_id": str(employer_id),
        "total": len(rows),
        "status_counts": dict(by_status),
        "applications": rows,
    }


@router.get("/job/{job_id}")
async def applicants_for_job(
    job_id: UUID,
    status_filter: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("employer", "gov_admin")),
):
    job_result = await db.execute(select(JobPosting).where(JobPosting.id == job_id))
    job = job_result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found")

    query = select(JobApplication).where(JobApplication.job_posting_id == job_id)
    if status_filter:
        query = query.where(JobApplication.status == status_filter)
    query = query.order_by(JobApplication.match_score.desc().nullslast())
    apps = (await db.execute(query)).scalars().all()

    # Enrich with candidate details for the employer board.
    rows = []
    for a in apps:
        cand = (
            await db.execute(select(Candidate).where(Candidate.id == a.candidate_id))
        ).scalar_one_or_none()
        rows.append({
            "id": str(a.id),
            "candidate_id": str(a.candidate_id),
            "job_posting_id": str(a.job_posting_id),
            "status": _status_value(a),
            "match_score": float(a.match_score) if a.match_score is not None else None,
            "skill_overlap": a.skill_overlap or [],
            "skill_gaps": a.skill_gaps or [],
            "cover_note": a.cover_note,
            "feedback": a.feedback,
            "offer_start_date": a.offer_start_date.isoformat() if a.offer_start_date else None,
            "offer_salary": float(a.offer_salary) if a.offer_salary is not None else None,
            "interview_at": a.interview_at.isoformat() if a.interview_at else None,
            "interview_note": a.interview_note,
            "applied_at": a.applied_at,
            "candidate": {
                "full_name": cand.full_name if cand else None,
                "state": cand.state if cand else None,
                "district": cand.district if cand else None,
                "phone": cand.phone if cand and cand.allow_employer_contact else None,
            },
        })
    return {"job_id": str(job_id), "title": job.title, "count": len(rows), "applicants": rows}


@router.get("/pipeline/{job_id}")
async def pipeline_counts(
    job_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("employer", "gov_admin")),
):
    job_result = await db.execute(select(JobPosting).where(JobPosting.id == job_id))
    job = job_result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found")
    apps = (
        await db.execute(select(JobApplication).where(JobApplication.job_posting_id == job_id))
    ).scalars().all()
    counts = funnel_counts(apps)
    hires = sum(1 for a in apps if _status_value(a) == "hired")
    total = len(apps)
    return {
        "job_id": str(job_id),
        "title": job.title,
        "total_applicants": total,
        "stages": counts,
        "hired": hires,
    }


@router.patch("/{application_id}/status", response_model=ApplicationResponse)
async def update_application_status(
    application_id: UUID,
    body: StatusUpdate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("employer", "gov_admin")),
):
    result = await db.execute(
        select(JobApplication).where(JobApplication.id == application_id)
    )
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    if not is_valid_status(body.status):
        raise HTTPException(status_code=400, detail=f"Unknown status '{body.status}'")

    current = _status_value(app)
    if not can_transition(current, body.status):
        allowed = sorted(STATUS_TRANSITIONS.get(current, set()))
        raise HTTPException(
            status_code=400,
            detail=f"Cannot move from '{current}' to '{body.status}'. Allowed: {allowed or 'none (terminal)'}",
        )

    job_row = (
        await db.execute(select(JobPosting).where(JobPosting.id == app.job_posting_id))
    ).scalar_one_or_none()

    app.status = body.status
    if body.feedback is not None:
        app.feedback = body.feedback
    if _status_value(app) == "hired":
        if body.start_date is not None:
            app.offer_start_date = body.start_date
        if body.salary_offered is not None:
            app.offer_salary = body.salary_offered
    if _status_value(app) == "interview":
        if body.interview_at is not None:
            app.interview_at = body.interview_at
        if body.interview_note is not None:
            app.interview_note = body.interview_note
    await db.flush()

    await _queue_status_notification(db, app, candidate=None, job=job_row)
    await db.refresh(app)
    return app


@router.patch("/{application_id}/interview", response_model=ApplicationResponse)
async def reschedule_interview(
    application_id: UUID,
    body: InterviewUpdate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("employer", "gov_admin")),
):
    """Update interview_at/interview_note for a candidate already in the interview stage."""
    result = await db.execute(
        select(JobApplication).where(JobApplication.id == application_id)
    )
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    if _status_value(app) != "interview":
        raise HTTPException(
            status_code=400,
            detail="Only interview-stage applications can be rescheduled",
        )

    job_row = (
        await db.execute(select(JobPosting).where(JobPosting.id == app.job_posting_id))
    ).scalar_one_or_none()

    if body.interview_at is not None:
        app.interview_at = body.interview_at
    if body.interview_note is not None:
        app.interview_note = body.interview_note
    await db.flush()

    await _queue_interview_update_notification(db, app, job=job_row)
    await db.refresh(app)
    return app


async def _queue_employer_application_alert(
    db: AsyncSession,
    app: JobApplication,
    candidate: Candidate,
    job: Optional[JobPosting],
) -> None:
    """Notify the job's employer that a candidate applied (fire-and-forget)."""
    if not job or not job.employer_id:
        return

    employer = (
        await db.execute(select(Employer).where(Employer.id == job.employer_id))
    ).scalar_one_or_none()
    if not employer or not employer.phone:
        return

    body = (
        f"New application received for '{job.title}': {candidate.full_name} "
        f"applied with a match score of {app.match_score}%. Review it in your "
        f"hiring pipeline on the SkillTrace portal."
    )
    notif = Notification(
        recipient_id=None,
        recipient_type="employer",
        phone=employer.phone,
        channel="whatsapp",
        kind="new_application",
        title="New Job Application",
        body=body,
        status="queued",
    )
    db.add(notif)
    await db.flush()
    await db.refresh(notif)

    try:
        enqueue_delivery(str(notif.id))
    except Exception:
        pass


async def _queue_status_notification(
    db: AsyncSession,
    app: JobApplication,
    candidate: Optional[Candidate],
    job: Optional[JobPosting],
) -> None:
    """Queue a WhatsApp/SMS notification to the candidate on a notable change.

    Fire-and-forget: delivery is handled by the worker task. If no transport is
    configured the row stays `queued` (status still persisted for tracking).
    """
    spec = APPLICATION_STATUS_NOTIFICATIONS.get(app.status.value if hasattr(app.status, "value") else app.status)
    if not spec:
        return

    cand = candidate
    if cand is None:
        cand = (
            await db.execute(select(Candidate).where(Candidate.id == app.candidate_id))
        ).scalar_one_or_none()

    if not cand:
        return

    variables = build_application_status_variables(
        job.title if job else None, None
    )
    body = render_template(spec["template"], variables)

    notif = Notification(
        recipient_id=cand.id,
        recipient_type="candidate",
        phone=cand.phone,
        channel="whatsapp",
        kind=spec["kind"],
        title=spec["title"],
        body=body,
        status="queued",
    )
    db.add(notif)
    await db.flush()
    await db.refresh(notif)

    try:
        enqueue_delivery(str(notif.id))
    except Exception:
        pass


async def _queue_interview_update_notification(
    db: AsyncSession,
    app: JobApplication,
    job: Optional[JobPosting],
) -> None:
    """Queue a WhatsApp/SMS notification to the candidate when an interview is rescheduled."""
    if not app.interview_at:
        return

    cand = (
        await db.execute(select(Candidate).where(Candidate.id == app.candidate_id))
    ).scalar_one_or_none()
    if not cand or not cand.phone:
        return

    when = app.interview_at.strftime("%d %b %Y, %I:%M %p")
    body = (
        f"Your interview for '{job.title if job else 'the role'}' with SkillTrace has been "
        f"scheduled for {when}. Please keep your documents ready and check the notes for details."
    )
    notif = Notification(
        recipient_id=cand.id,
        recipient_type="candidate",
        phone=cand.phone,
        channel="whatsapp",
        kind="interview_update",
        title="Interview Rescheduled",
        body=body,
        status="queued",
    )
    db.add(notif)
    await db.flush()
    await db.refresh(notif)

    try:
        enqueue_delivery(str(notif.id))
    except Exception:
        pass


def _status_value(app) -> str:
    return app.status.value if hasattr(app.status, "value") else str(app.status)
