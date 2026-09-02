"""Weekly NLP-driven skill gap recalculation.

Computes regional demand (from job postings) vs supply (from candidate skills)
and writes normalized SkillGapScore rows, and refreshes the SkillTaxonomy table.
"""
from __future__ import annotations

from celery import shared_task

from app.config import get_settings

settings = get_settings()


@shared_task(name="workers.tasks.nlp_pipeline.recompute_skill_gaps", bind=True, max_retries=2)
def recompute_skill_gaps(self):
    """Weekly recalculation of regional skill gap scores."""
    import asyncio
    asyncio.run(_recompute())


async def _recompute():
    from datetime import datetime

    from sqlalchemy import select

    from app.database import async_session_factory
    from app.models.candidate import Candidate
    from app.models.job_posting import JobPosting
    from app.models.skill_gap import SkillGapScore
    from app.models.skill_taxonomy import SkillTaxonomy
    from workers.nlp.skill_extraction import SKILL_LEXICON

    async with async_session_factory() as db:
        # Refresh skill taxonomy with the canonical lexicon.
        for skill in SKILL_LEXICON:
            exists = await db.execute(
                select(SkillTaxonomy).where(
                    SkillTaxonomy.name == skill,
                    SkillTaxonomy.category == "technical",
                )
            )
            if not exists.scalars().first():
                db.add(SkillTaxonomy(
                    name=skill,
                    category="technical",
                    sector="general",
                    normalized_name=skill.lower().replace(" ", "-").replace("/", "-"),
                ))
        await db.flush()

        states_result = await db.execute(
            select(Candidate.state).where(Candidate.state.isnot(None)).distinct()
        )
        states = [row[0] for row in states_result.all()]

        written = 0
        for state in states:
            candidates = (
                await db.execute(
                    select(Candidate).where(
                        Candidate.state == state,
                        Candidate.is_active == True,
                    )
                )
            ).scalars().all()

            skill_supply: dict[str, int] = {}
            for c in candidates:
                for skill in (c.skill_tags or []):
                    skill = _canonical(skill)
                    if skill:
                        skill_supply[skill] = skill_supply.get(skill, 0) + 1

            jobs = (
                await db.execute(
                    select(JobPosting).where(
                        JobPosting.state == state,
                        JobPosting.is_active == True,
                    )
                )
            ).scalars().all()

            skill_demand: dict[str, int] = {}
            for j in jobs:
                for skill in (j.required_skills or []):
                    skill = _canonical(skill)
                    if skill:
                        skill_demand[skill] = skill_demand.get(skill, 0) + 1
                for skill in (j.preferred_skills or []):
                    skill = _canonical(skill)
                    if skill:
                        # Preferred counts half toward demand.
                        skill_demand[skill] = skill_demand.get(skill, 0) + 0.5

            all_skills = set(skill_demand) | set(skill_supply)
            max_demand = max(skill_demand.values(), default=1)
            max_supply = max(skill_supply.values(), default=1)

            for skill in all_skills:
                d = (skill_demand.get(skill, 0) / max_demand) * 100
                s = (skill_supply.get(skill, 0) / max_supply) * 100
                gap = round(d * 0.6 - s * 0.4, 2)
                direction = "deficit" if gap > 5 else ("surplus" if gap < -5 else "balanced")

                db.add(SkillGapScore(
                    state=state,
                    district=None,
                    sector="general",
                    skill_name=skill,
                    demand_score=round(d, 2),
                    supply_score=round(s, 2),
                    gap_score=gap,
                    gap_direction=direction,
                    computed_at=datetime.utcnow(),
                    model_version="v1.1",
                ))
                written += 1

        await db.commit()
        return {"states": len(states), "scores_written": written}


def _canonical(skill: str) -> str | None:
    """Map a raw skill mention to a canonical lexicon name, or None."""
    from workers.nlp.skill_extraction import SKILL_LEXICON

    skill_l = (skill or "").strip().lower()
    if not skill_l:
        return None
    # Direct canonical match.
    for canonical in SKILL_LEXICON:
        if canonical.lower() == skill_l:
            return canonical
    # Alias match.
    for canonical, aliases in SKILL_LEXICON.items():
        for alias in aliases:
            if alias.lower() == skill_l:
                return canonical
    # Fallback: title-case the incoming skill.
    return skill.strip()
