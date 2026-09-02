"""Tests for the employer hiring pipeline business rules."""
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backend")))

from app.services.application_service import (
    can_transition,
    funnel_counts,
    is_valid_status,
    stage_scores,
)


class FakeApp:
    def __init__(self, status, match_score=None):
        self.status = status
        self.match_score = match_score
        self.candidate_id = "00000000-0000-0000-0000-000000000001"


def test_valid_statuses():
    for s in ["applied", "shortlisted", "interview", "offered", "hired", "rejected"]:
        assert is_valid_status(s)
    assert not is_valid_status("nonsense")


def test_initial_application_must_be_applied():
    assert can_transition(None, "applied") is True
    assert can_transition(None, "interview") is False


def test_forward_transitions_allowed():
    assert can_transition("applied", "shortlisted") is True
    assert can_transition("shortlisted", "interview") is True
    assert can_transition("interview", "offered") is True
    assert can_transition("interview", "hired") is True
    assert can_transition("offered", "hired") is True


def test_rejection_allowed_from_non_terminal():
    assert can_transition("applied", "rejected") is True
    assert can_transition("shortlisted", "rejected") is True
    assert can_transition("interview", "rejected") is True
    assert can_transition("offered", "rejected") is True


def test_terminal_statuses_are_blocked():
    assert can_transition("hired", "applied") is False
    assert can_transition("hired", "rejected") is False
    assert can_transition("rejected", "interview") is False
    assert can_transition("rejected", "hired") is False


def test_no_skipping_stages():
    # Cannot jump from applied straight to offered.
    assert can_transition("applied", "offered") is False
    assert can_transition("applied", "interview") is False
    assert can_transition("shortlisted", "hired") is False


def test_funnel_counts():
    apps = [
        FakeApp("applied"),
        FakeApp("applied"),
        FakeApp("interview"),
        FakeApp("offered"),
        FakeApp("hired"),
        FakeApp("rejected"),
    ]
    counts = funnel_counts(apps)
    assert counts["applied"] == 2
    assert counts["interview"] == 1
    assert counts["offered"] == 1
    assert counts["hired"] == 1
    # 'rejected' is terminal and excluded from the non-terminal funnel keys.
    assert "rejected" not in counts or counts.get("rejected", 0) == 0


def test_stage_scores_snapshot():
    out = stage_scores([FakeApp("shortlisted", 88.0)])
    assert out[0]["match_score"] == 88.0
    assert out[0]["status"] == "shortlisted"
