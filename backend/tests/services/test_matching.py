"""Tests for the real-time match scoring service (pure logic, no DB)."""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from app.services.matching_service import _location_compatible
from app.services.skill_gap_engine import compute_match_score


def test_compute_match_score_perfect_match():
    s = compute_match_score(
        candidate_skills=["Python", "SQL", "Docker"],
        job_required=["Python", "SQL"],
        job_preferred=["Docker"],
    )
    assert s["match_score"] == 100.0
    assert set(s["skill_overlap"]) == {"python", "sql"}
    assert s["skill_gaps"] == []


def test_compute_match_score_partial():
    # required overlap 1/2 = 0.5 -> 35, preferred overlap 0/1 -> 0 => total 35
    s = compute_match_score(
        candidate_skills=["Python", "Git"],
        job_required=["Python", "AWS"],
        job_preferred=["Kubernetes"],
    )
    assert s["match_score"] == 35.0
    assert "aws" in s["skill_gaps"]


def test_location_compatible():
    assert _location_compatible("Karnataka", "Karnataka") is True
    assert _location_compatible("Karnataka", "Maharashtra") is False
    assert _location_compatible(None, "Maharashtra") is True
    assert _location_compatible("Karnataka", None) is True
