from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.database import get_db
from app.dependencies import require_role
from app.models.candidate import Candidate
from app.models.job_posting import JobPosting
from app.services.matching_service import (
    score_jobs_for_candidate,
    score_candidates_for_job,
)

router = APIRouter()


@router.get("/candidates/{candidate_id}/jobs")
async def match_jobs_for_candidate(
    candidate_id: UUID,
    min_score: int = Query(0, ge=0, le=100),
    limit: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("candidate", "gov_admin")),
):
    result = await db.execute(select(Candidate).where(Candidate.id == candidate_id))
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    matches = await score_jobs_for_candidate(db, candidate, limit=limit, min_score=min_score)
    return {"candidate_id": str(candidate_id), "count": len(matches), "matches": matches}


@router.get("/jobs/{job_id}/candidates")
async def match_candidates_for_job(
    job_id: UUID,
    min_score: int = Query(0, ge=0, le=100),
    limit: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("employer", "gov_admin")),
):
    result = await db.execute(select(JobPosting).where(JobPosting.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found")

    matches = await score_candidates_for_job(db, job, limit=limit, min_score=min_score)
    return {"job_id": str(job_id), "count": len(matches), "matches": matches}
