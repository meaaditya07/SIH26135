"""Tests for the backend ML service bridge (model served through the API layer)."""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "backend")))

from app.services.ml_service import model_ready, score_features


def test_model_ready_when_trained():
    assert model_ready() is True


def test_score_features_returns_bounded_result():
    r = score_features({
        "n_skills": 5,
        "course_duration_weeks": 16,
        "sector": "IT",
        "scheme_flag": True,
        "partner_placement_rate": 0.75,
        "age": 24,
        "state_labor_index": 0.7,
        "course_completed": True,
    })
    assert r is not None
    assert 0.0 <= r["score"] <= 1.0
    assert isinstance(r["factors"], list)


def test_score_differentiates_high_and_low_risk():
    high = score_features({
        "n_skills": 7, "course_duration_weeks": 24, "sector": "IT",
        "scheme_flag": True, "partner_placement_rate": 0.85,
        "age": 27, "state_labor_index": 0.8, "course_completed": True,
    })
    low = score_features({
        "n_skills": 1, "course_duration_weeks": 4, "sector": "Agriculture",
        "scheme_flag": False, "partner_placement_rate": 0.2,
        "age": 24, "state_labor_index": 0.3, "course_completed": False,
    })
    assert high["score"] > low["score"]
