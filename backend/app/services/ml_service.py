"""Bridge between the persisted ML placement model and FastAPI."""
from __future__ import annotations

import os
import sys
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.training_partner import TrainingPartner

ML_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..")
)
if ML_ROOT not in sys.path:
    sys.path.insert(0, ML_ROOT)  # ensure `ml` package importable

# Delay-import so the backend app can boot even if sklearn is unavailable at
# import time on some installs; failures surface only on scoring requests that
# need the model.
_pipeline: Any = None
_metadata: dict[str, Any] | None = None
_load_error: Exception | None = None


def _load() -> tuple[Any, dict[str, Any] | None]:
    global _pipeline, _metadata, _load_error
    if _pipeline is not None:
        return _pipeline, _metadata
    if _load_error is not None:
        return None, _metadata
    try:
        from ml.placement_model import (
            load_model,
            train,
            save_model,
        )
        # Import and cache the scoring function accessible to callers.
        bucket = load_model() or None
        if bucket is None:
            # Model not trained yet: build on first use (idempotent).
            pipeline, metadata = train()
            save_model(pipeline, metadata)
            bucket = {"pipeline": pipeline, "metadata": metadata}
        _pipeline = bucket["pipeline"]
        _metadata = bucket.get("metadata")
        return _pipeline, _metadata
    except Exception as exc:  # pragma: no cover - defensive
        _load_error = exc
        return None, None


def model_ready() -> bool:
    p, _ = _load()
    return p is not None


def score_features(feats: dict[str, Any]) -> dict[str, Any] | None:
    """Return {score, factors} for a feature dict, or None if model unready."""
    pid, _ = _load()
    if pid is None:
        return None
    from ml.placement_model import predict_probability

    prob = predict_probability(pid, feats)
    factors = _describe_top_factors(feats, prob)
    return {"score": round(prob, 4), "factors": factors}


def _describe_top_factors(feats: dict[str, Any], prob: float) -> list[dict[str, Any]]:
    """Return human-readable drivers that raised/lowered the score."""
    factors: list[dict[str, Any]] = []
    n_skills = float(feats.get("n_skills", 0))
    if n_skills >= 5:
        factors.append({"factor": "skill_breadth", "effect": "boost", "detail": f"{int(n_skills)} skills"})
    elif n_skills <= 2:
        factors.append({"factor": "skill_breadth", "effect": "concern", "detail": f"only {int(n_skills)} skills"})

    partner_rate = float(feats.get("partner_placement_rate", 0.6))
    if partner_rate >= 0.7:
        factors.append({"factor": "partner_track_record", "effect": "boost", "detail": f"{round(partner_rate*100)}% partner placement rate"})
    elif partner_rate < 0.5:
        factors.append({"factor": "partner_track_record", "effect": "concern", "detail": f"{round(partner_rate*100)}% partner placement rate"})

    if feats.get("scheme_flag"):
        factors.append({"factor": "scheme_backing", "effect": "boost", "detail": "scheme-funded course"})

    if not bool(feats.get("course_completed", False)):
        factors.append({"factor": "completion", "effect": "concern", "detail": "course not yet completed"})

    if prob >= 0.7:
        factors.append({"factor": "overall", "effect": "high", "detail": "high placement likelihood"})
    elif prob < 0.4:
        factors.append({"factor": "overall", "effect": "low", "detail": "placement support recommended"})
    return factors


async def features_for_candidate(
    db: AsyncSession,
    candidate: Any,
    enrollments: list[Any] | None = None,
) -> dict[str, Any]:
    """Build the feature dict for a candidate from live DB state.

    Uses the candidate's most recent completed (or latest) enrollment to derive
    course-sector/duration/scheme and the partner's historical placement rate.
    """
    from app.models.course import Course
    from app.models.enrollment import Enrollment

    enrollments = enrollments or list(
        (
            await db.execute(
                select(Enrollment)
                .where(Enrollment.candidate_id == candidate.id)
                .order_by(Enrollment.enrollment_date.desc())
            )
        ).scalars()
    )

    course = None
    partner_rate = 0.6
    is_completed = False
    if enrollments:
        latest = enrollments[0]
        is_completed = bool(latest.is_completed)
        cr = await db.execute(select(Course).where(Course.id == latest.course_id))
        course = cr.scalar_one_or_none()
        partner_rate = await _partner_rate(db, latest.training_partner_id)

    from ml.placement_model import build_features

    return {
        **build_features(
            candidate_skills=candidate.skill_tags or [],
            course_duration_weeks=int(course.duration_weeks) if course else 12,
            sector=(course.sector if course else "IT"),
            scheme_flag=bool(course.scheme_id) if course else False,
            partner_placement_rate=partner_rate,
        ),
        "course_completed": is_completed,
    }


async def _partner_rate(db: AsyncSession, partner_id: Any) -> float:
    """Historical placement rate for a training partner.

    Green-field (no outcomes seeded yet) falls back to an approval-based prior:
    approved partners get a modestly higher placement prior.
    """
    tp = (
        await db.execute(select(TrainingPartner).where(TrainingPartner.id == partner_id))
    ).scalar_one_or_none()
    if tp is None:
        return 0.6
    return 0.7 if tp.is_approved else 0.45
