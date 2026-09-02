from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.candidate import Candidate
from app.models.job_posting import JobPosting


def compute_match_score(
    candidate_skills: list[str],
    job_required: list[str],
    job_preferred: list[str],
) -> dict:
    """Weighted skill overlap scoring (embedding similarity added when models loaded)."""
    req_set = set(s.lower() for s in job_required)
    cand_set = set(s.lower() for s in candidate_skills)
    pref_set = set(s.lower() for s in job_preferred)

    req_overlap = len(req_set & cand_set) / max(len(req_set), 1)
    pref_overlap = len(pref_set & cand_set) / max(len(pref_set), 1)

    total = (req_overlap * 70 + pref_overlap * 30)

    return {
        "match_score": round(total, 2),
        "skill_overlap": list(req_set & cand_set),
        "skill_gaps": list(req_set - cand_set),
    }


async def compute_regional_skill_gap(
    db: AsyncSession,
    state: str,
    district: str | None = None,
    sector: str = "general",
) -> list[dict]:
    """Compute demand vs supply gap for skills in a region."""

    # Gather candidate skills in region
    query = select(Candidate).where(Candidate.state == state, Candidate.is_active == True)
    if district:
        query = query.where(Candidate.district == district)
    candidates_result = await db.execute(query)
    candidates = candidates_result.scalars().all()

    skill_supply = {}
    for c in candidates:
        for skill in (c.skill_tags or []):
            skill_supply[skill] = skill_supply.get(skill, 0) + 1

    # Gather job demand in region
    job_query = select(JobPosting).where(
        JobPosting.state == state, JobPosting.is_active == True
    )
    if district:
        job_query = job_query.where(JobPosting.district == district)
    jobs_result = await db.execute(job_query)
    jobs = jobs_result.scalars().all()

    skill_demand = {}
    for j in jobs:
        for skill in (j.required_skills or []):
            skill_demand[skill] = skill_demand.get(skill, 0) + 1

    # Normalize
    max_demand = max(skill_demand.values()) if skill_demand else 1
    max_supply = max(skill_supply.values()) if skill_supply else 1

    all_skills = set(list(skill_demand.keys()) + list(skill_supply.keys()))
    results = []

    for skill in all_skills:
        d = (skill_demand.get(skill, 0) / max_demand) * 100
        s = (skill_supply.get(skill, 0) / max_supply) * 100
        gap = round(d * 0.6 - s * 0.4, 2)
        direction = "deficit" if gap > 5 else ("surplus" if gap < -5 else "balanced")

        results.append({
            "skill_name": skill,
            "demand_score": round(d, 2),
            "supply_score": round(s, 2),
            "gap_score": gap,
            "gap_direction": direction,
        })

    results.sort(key=lambda x: x["gap_score"], reverse=True)
    return results
