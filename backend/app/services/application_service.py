"""Business rules for the employer hiring pipeline (job applications).

The status lifecycle is a directed graph validated independently of the
database so it can be unit-tested and reused by the API layer.
"""
from __future__ import annotations

from typing import Optional

# Ordered pipeline stages for funnel analytics.
PIPELINE_ORDER = ["applied", "shortlisted", "interview", "offered", "hired"]

TERMINAL_STATUSES = {"hired", "rejected"}

# Allowed status transitions (from -> set of to).
STATUS_TRANSITIONS: dict[str, set[str]] = {
    "applied": {"shortlisted", "rejected"},
    "shortlisted": {"interview", "rejected"},
    "interview": {"offered", "rejected", "hired"},
    "offered": {"hired", "rejected"},
    "hired": set(),  # terminal
    "rejected": set(),  # terminal
}

VALID_STATUSES = set(STATUS_TRANSITIONS.keys())


def is_valid_status(status: str) -> bool:
    return status in VALID_STATUSES


def can_transition(current: Optional[str], target: str) -> bool:
    """Return True if moving a job application to ``target`` is allowed."""
    if not is_valid_status(target):
        return False
    if current is None:
        # A brand-new application always starts at 'applied'.
        return target == "applied"
    if current not in STATUS_TRANSITIONS:
        return False
    return target in STATUS_TRANSITIONS[current]


def funnel_counts(applications) -> dict[str, int]:
    """Compute the hiring funnel (count per non-terminal pipeline stage)."""
    counts = {stage: 0 for stage in PIPELINE_ORDER}
    for app in applications:
        status = _status_of(app)
        if status in counts:
            counts[status] += 1
    return counts


def _status_of(app) -> str:
    v = getattr(app, "status", None)
    if v is None:
        return "applied"
    return v.value if hasattr(v, "value") else str(v)


def stage_scores(applications) -> list[dict[str, object]]:
    """Yield per-application match score summary alongside status (for boards)."""
    return [
        {
            "candidate_id": str(getattr(app, "candidate_id", "")),
            "status": _status_of(app),
            "match_score": float(app.match_score) if app.match_score is not None else None,
        }
        for app in applications
    ]
