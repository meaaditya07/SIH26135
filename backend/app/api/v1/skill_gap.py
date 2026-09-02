from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.database import get_db
from app.dependencies import require_role
from app.models.skill_gap import SkillGapScore
from app.schemas import SkillGapResponse
from app.utils.geo import resolve_coordinates

router = APIRouter()


@router.get("/regional", response_model=list[SkillGapResponse])
async def get_regional_skill_gaps(
    state: str = Query(...),
    district: Optional[str] = Query(None),
    sector: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin", "training_partner")),
):
    query = (
        select(SkillGapScore)
        .where(SkillGapScore.state == state)
        .order_by(SkillGapScore.gap_score.desc())
        .limit(limit)
    )
    if district:
        query = query.where(SkillGapScore.district == district)
    if sector:
        query = query.where(SkillGapScore.sector == sector)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/heatmap-data")
async def get_heatmap_data(
    state: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin")),
):
    """
    Aggregate skill gap scores by district for heatmap rendering.
    Returns list of {district, lat, lng, avg_gap_score, top_deficit_skills}.
    """
    query = select(
        SkillGapScore.district,
        SkillGapScore.state,
    ).distinct()

    if state:
        query = query.where(SkillGapScore.state == state)

    result = await db.execute(query)
    districts = result.all()

    heatmap_points = []
    for row in districts:
        district_gaps = await db.execute(
            select(SkillGapScore).where(
                SkillGapScore.state == row.state,
                SkillGapScore.district == row.district,
            ).order_by(SkillGapScore.gap_score.desc()).limit(5)
        )
        gaps = district_gaps.scalars().all()
        if gaps:
            avg_gap = sum(float(g.gap_score) for g in gaps) / len(gaps)
            lat, lng = resolve_coordinates(row.state, row.district)
            heatmap_points.append({
                "district": row.district,
                "state": row.state,
                "lat": lat,
                "lng": lng,
                "avg_gap_score": round(avg_gap, 2),
                "top_deficit_skills": [g.skill_name for g in gaps if g.gap_direction == "deficit"][:5],
            })

    return heatmap_points
