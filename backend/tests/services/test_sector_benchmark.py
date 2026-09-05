from types import SimpleNamespace

import pytest

from app.api.v1.analytics import _funnel_from


def _app(status: str):
    return SimpleNamespace(status=status)


def test_funnel_empty():
    result = _funnel_from([])
    assert result["total"] == 0
    assert all(result["pct"][s] == 0.0 for s in result["pct"])


def test_funnel_counts_and_percentages():
    apps = [
        _app("applied"),
        _app("applied"),
        _app("shortlisted"),
        _app("interview"),
        _app("hired"),
        _app("rejected"),  # rejected after reaching, say, shortlisted
    ]
    result = _funnel_from(apps)
    assert result["total"] == 6
    # Everyone who is currently in a funnel stage reached applied (rejected apps
    # are excluded since their last reached stage is unknown).
    assert result["counts"]["applied"] == 5
    # Reached shortlisted: shortlisted, interview, hired (not rejected - unknown).
    assert result["counts"]["shortlisted"] == 3
    assert result["counts"]["interview"] == 2
    assert result["counts"]["offered"] == 1
    assert result["counts"]["hired"] == 1
    assert result["pct"]["hired"] == pytest.approx(100 * 1 / 6, abs=0.1)


def test_funnel_enum_like_status():
    status = SimpleNamespace(value="offered")
    result = _funnel_from([SimpleNamespace(status=status), _app("offered")])
    assert result["counts"]["offered"] == 2
    assert result["counts"]["hired"] == 0