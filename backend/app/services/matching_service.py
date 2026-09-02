"""Real-time job <-> candidate match scoring service."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.candidate import Candidate
from app.models.job_posting import JobPosting
from app.services.skill_gap_engine import compute_match_score


def _location_compatible(candidate_state: str | None, job_state: str | None) -> bool:
    """Return True when candidate can be considered for the job based on state."""
    if not candidate_state or not job_state:
        return True  # unknown locations do not disqualify
    return candidate_state.lower() == job_state.lower()


async def score_jobs_for_candidate(
    db: AsyncSession,
    candidate: Candidate,
    limit: int = 25,
    min_score: int = 0,
) -> list[dict]:
    """Score all active jobs against a single candidate, ranked descending."""
    jobs_result = await db.execute(
        select(JobPosting).where(JobPosting.is_active == True)
    )
    jobs = jobs_result.scalars().all()

    results: list[dict] = []
    for job in jobs:
        score_payload = compute_match_score(
            candidate_skills=candidate.skill_tags or [],
            job_required=job.required_skills or [],
            job_preferred=job.preferred_skills or [],
        )
        raw_score = score_payload["match_score"]
        loc_ok = _location_compatible(candidate.state, job.state)

        # Adjust: state mismatch penalized unless unknown.
        final_score = raw_score
        if not loc_ok and candidate.state and job.state:
            final_score = round(raw_score * 0.7, 2)

        if final_score < min_score:
            continue

        results.append({
            "job_id": str(job.id),
            "title": job.title,
            "company": job.employer.name if job.employer else None,
            "state": job.state,
            "district": job.district,
            "salary_min": float(job.salary_min) if job.salary_min else None,
            "salary_max": float(job.salary_max) if job.salary_max else None,
            "match_score": final_score,
            "skill_overlap": score_payload["skill_overlap"],
            "skill_gaps": score_payload["skill_gaps"],
            "location_compatible": loc_ok,
            "location": job.location,
        })

    results.sort(key=lambda r: r["match_score"], reverse=True)
    return results[:limit]


async def score_candidates_for_job(
    db: AsyncSession,
    job: JobPosting,
    limit: int = 25,
    min_score: int = 0,
) -> list[dict]:
    """Score all active candidates against a single job, ranked descending."""
    candidates_result = await db.execute(
        select(Candidate).where(Candidate.is_active == True)
    )
    candidates = candidates_result.scalars().all()

    results: list[dict] = []
    for candidate in candidates:
        score_payload = compute_match_score(
            candidate_skills=candidate.skill_tags or [],
            job_required=job.required_skills or [],
            job_preferred=job.preferred_skills or [],
        )
        raw_score = score_payload["match_score"]
        loc_ok = _location_compatible(candidate.state, job.state)
        final_score = raw_score
        if not loc_ok and candidate.state and job.state:
            final_score = round(raw_score * 0.7, 2)

        if final_score < min_score:
            continue

        results.append({
            "candidate_id": str(candidate.id),
            "full_name": candidate.full_name,
            "phone": candidate.phone,
            "state": candidate.state,
            "district": candidate.district,
            "skill_overlap": score_payload["skill_overlap"],
            "skill_gaps": score_payload["skill_gaps"],
            "match_score": final_score,
            "location_compatible": loc_ok,
        })

    results.sort(key=lambda r: r["match_score"], reverse=True)
    return results[:limit]
