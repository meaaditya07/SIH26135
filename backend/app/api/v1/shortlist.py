"""Sprint 10 — Employer candidate shortlist (saved favourites).

Lets employers bookmark promising candidates from matches / applications
without losing them. Each row is scoped to the current employer identity
resolved from the JWT `User.employer_id`.
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_role
from app.models.user import User
from app.models.candidate import Candidate
from app.models.employer import Employer
from app.models.employer_shortlist import EmployerShortlist
from app.models.job_posting import JobPosting
from app.models.notification import Notification
from app.services.worker_queue import enqueue_delivery

router = APIRouter()


class NoteUpdate(BaseModel):
    note: Optional[str] = Field(None, max_length=2000)


async def _current_employer_id(db: AsyncSession, user: dict) -> UUID:
    result = await db.execute(select(User).where(User.id == UUID(str(user["sub"]))))
    u = result.scalar_one_or_none()
    if not u or not u.employer_id:
        raise HTTPException(status_code=403, detail="No employer profile linked to account")
    return u.employer_id


def _candidate_row(c: Candidate, s: EmployerShortlist) -> dict:
    return {
        "candidate_id": str(c.id),
        "full_name": c.full_name,
        "phone": c.phone if c.allow_employer_contact else None,
        "email": c.email if c.allow_employer_contact else None,
        "state": c.state,
        "district": c.district,
        "digilocker_status": c.digilocker_status,
        "skill_tags": c.skill_tags or [],
        "note": s.note,
        "shortlisted_at": s.created_at.isoformat() if s.created_at else None,
    }


@router.get("/")
async def list_shortlist(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("employer")),
):
    employer_id = await _current_employer_id(db, user)

    rows = (
        await db.execute(
            select(EmployerShortlist, Candidate)
            .join(Candidate, Candidate.id == EmployerShortlist.candidate_id)
            .where(EmployerShortlist.employer_id == employer_id)
            .order_by(EmployerShortlist.created_at.desc())
        )
    ).all()

    return {"count": len(rows), "candidates": [
        _candidate_row(c, s) for s, c in rows
    ]}


@router.post("/{candidate_id}")
async def add_shortlist(
    candidate_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("employer")),
):
    employer_id = await _current_employer_id(db, user)

    cand = (
        await db.execute(select(Candidate).where(Candidate.id == candidate_id))
    ).scalar_one_or_none()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")

    exists = (
        await db.execute(
            select(EmployerShortlist).where(
                EmployerShortlist.employer_id == employer_id,
                EmployerShortlist.candidate_id == candidate_id,
            )
        )
    ).scalar_one_or_none()
    if exists:
        return {"status": "already_shortlisted", "candidate_id": str(candidate_id)}

    entry = EmployerShortlist(employer_id=employer_id, candidate_id=candidate_id)
    db.add(entry)
    await db.flush()
    await db.refresh(entry)
    return {"status": "shortlisted", "candidate_id": str(candidate_id)}


@router.delete("/{candidate_id}")
async def remove_shortlist(
    candidate_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("employer")),
):
    employer_id = await _current_employer_id(db, user)

    entry = (
        await db.execute(
            select(EmployerShortlist).where(
                EmployerShortlist.employer_id == employer_id,
                EmployerShortlist.candidate_id == candidate_id,
            )
        )
    ).scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Candidate is not shortlisted")

    await db.delete(entry)
    await db.flush()
    return {"status": "removed", "candidate_id": str(candidate_id)}


@router.patch("/{candidate_id}/note")
async def update_shortlist_note(
    candidate_id: UUID,
    body: NoteUpdate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("employer")),
):
    employer_id = await _current_employer_id(db, user)

    entry = (
        await db.execute(
            select(EmployerShortlist).where(
                EmployerShortlist.employer_id == employer_id,
                EmployerShortlist.candidate_id == candidate_id,
            )
        )
    ).scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Candidate is not shortlisted")

    entry.note = body.note
    await db.flush()
    await db.refresh(entry)
    return {
        "status": "updated",
        "candidate_id": str(candidate_id),
        "note": entry.note,
    }


@router.post("/{job_id}/notify")
async def notify_shortlist_about_job(
    job_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("employer")),
):
    """Sends a targeted job-alert to the employer's shortlisted candidates.

    Fire-and-forget: rows are queued and enqueued for delivery; broker outages
    leave them `queued` without breaking the API.
    """
    employer_id = await _current_employer_id(db, user)

    job = (
        await db.execute(select(JobPosting).where(JobPosting.id == job_id))
    ).scalar_one_or_none()
    if not job or job.employer_id != employer_id:
        raise HTTPException(status_code=404, detail="Job not found for this employer")

    employer = (
        await db.execute(select(Employer).where(Employer.id == employer_id))
    ).scalar_one_or_none()

    shortlisted = (
        await db.execute(
            select(Candidate)
            .join(EmployerShortlist, EmployerShortlist.candidate_id == Candidate.id)
            .where(EmployerShortlist.employer_id == employer_id)
        )
    ).scalars().all()

    sent = 0
    for cand in shortlisted:
        notif = Notification(
            recipient_id=cand.id,
            recipient_type="candidate",
            phone=cand.phone,
            channel="whatsapp",
            kind="job_alert",
            title="Shortlist: New Opening",
            body=(
                f"You're shortlisted with {employer.name if employer else 'us'} and "
                f"there's a new opening: {job.title} in {job.location or job.state or 'your region'}. "
                f"Apply on the SkillTrace portal."
            ),
            status="queued",
        )
        db.add(notif)
        await db.flush()
        await db.refresh(notif)
        try:
            enqueue_delivery(str(notif.id))
        except Exception:
            pass
        sent += 1

    return {
        "notified": sent,
        "job_id": str(job_id),
        "title": job.title,
    }