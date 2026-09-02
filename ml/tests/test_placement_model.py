"""Tests for the placement prediction model (pure, no DB)."""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from ml.placement_model import (
    NUMERIC_FEATURES,
    CATEGORICAL_FEATURES,
    build_features,
    predict_probability,
    train,
    save_model,
    load_model,
)


def test_build_features_contract():
    f = build_features(candidate_skills=["Python", "SQL"], sector="IT", scheme_flag=True)
    for col in NUMERIC_FEATURES + CATEGORICAL_FEATURES:
        assert col in f
    assert f["n_skills"] == 2.0
    assert f["scheme_flag"] == 1


def test_build_features_norm_sector():
    f = build_features(sector="UNKNOWN-SECTOR")
    assert f["sector"] == "IT"


def test_train_and_prediction_are_signal_bearing(tmp_path):
    pipeline, metadata = train(random_state=0)
    assert metadata["n_samples"] >= 3000
    assert metadata["train_accuracy"] > 0.7

    # High-driver candidate should score higher than low-driver candidate.
    high = build_features(
        candidate_skills=["a", "b", "c", "d", "e", "f"],
        course_duration_weeks=20,
        sector="IT",
        scheme_flag=True,
        partner_placement_rate=0.85,
    )
    low = build_features(
        candidate_skills=["a"],
        course_duration_weeks=4,
        sector="Agriculture",
        scheme_flag=False,
        partner_placement_rate=0.2,
    )
    p_high = predict_probability(pipeline, high)
    p_low = predict_probability(pipeline, low)
    assert 0.0 <= p_high <= 1.0
    assert 0.0 <= p_low <= 1.0
    assert p_high > p_low


def test_save_and_load_roundtrip(tmp_path):
    pipeline, metadata = train(random_state=1)
    path = os.path.join(tmp_path, "model.joblib")
    save_model(pipeline, metadata, path)
    bucket = load_model(path)
    assert bucket is not None
    assert "pipeline" in bucket and "metadata" in bucket
    feats = build_features(candidate_skills=["Python", "SQL", "Django"], sector="IT")
    p1 = predict_probability(pipeline, feats)
    p2 = predict_probability(bucket["pipeline"], feats)
    assert abs(p1 - p2) < 1e-6


def test_load_missing_returns_none(tmp_path):
    assert load_model(os.path.join(tmp_path, "does_not_exist.joblib")) is None
