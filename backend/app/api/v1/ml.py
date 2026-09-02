from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any
from uuid import UUID

from app.database import get_db
from app.dependencies import require_role
from app.models.candidate import Candidate
from app.services.ml_service import model_ready, score_features, features_for_candidate

router = APIRouter()


@router.get("/health")
async def ml_health():
    return {"model_ready": model_ready()}


async def _score_candidate(db: AsyncSession, candidate: Candidate) -> dict[str, Any]:
    if not model_ready():
        raise HTTPException(status_code=503, detail="Placement model not available")
    feats = await features_for_candidate(db, candidate)
    result = score_features(feats)
    if result is None:
        raise HTTPException(status_code=503, detail="Placement model not available")
    return {
        "candidate_id": str(candidate.id),
        "full_name": candidate.full_name,
        "placement_score": result["score"],
        "score_pct": round(result["score"] * 100, 1),
        "factors": result["factors"],
    }


@router.get("/placement/{candidate_id}")
async def get_placement_score(
    candidate_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("candidate", "gov_admin", "training_partner")),
):
    result = await db.execute(select(Candidate).where(Candidate.id == candidate_id))
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return await _score_candidate(db, candidate)


class ScoreBatchRequest(BaseModel):
    candidate_ids: list[UUID] = Field(..., min_length=1, max_length=200)


@router.post("/placement/score")
async def score_batch(
    payload: ScoreBatchRequest,
    min_score: float = Query(0.0, ge=0.0, le=1.0),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin", "training_partner")),
):
    """Score several candidates at once and rank by predicted placement."""
    if not model_ready():
        raise HTTPException(status_code=503, detail="Placement model not available")

    results = []
    for cid in payload.candidate_ids:
        row = await db.execute(select(Candidate).where(Candidate.id == cid))
        candidate = row.scalar_one_or_none()
        if not candidate:
            continue
        feats = await features_for_candidate(db, candidate)
        scored = score_features(feats)
        if scored is None:
            continue
        results.append({
            "candidate_id": str(cid),
            "full_name": candidate.full_name,
            "placement_score": scored["score"],
            "score_pct": round(scored["score"] * 100, 1),
        })

    results.sort(key=lambda r: r["placement_score"], reverse=True)
    results = [r for r in results if r["placement_score"] >= min_score]
    return {"count": len(results), "results": results}
