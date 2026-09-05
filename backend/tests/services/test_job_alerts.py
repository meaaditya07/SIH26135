"""Tests for the job-alert notification spec (pure logic, no DB)."""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from app.api.v1.job_postings import _JOB_ALERT_SPEC, _JOB_MATCH_LIMIT, _JOB_MATCH_MIN_SCORE
from app.services.notification_service import render_template


def test_job_alert_spec_has_template():
    assert _JOB_ALERT_SPEC["kind"] == "job_alert"
    assert "{jobTitle}" in _JOB_ALERT_SPEC["template"]
    assert _JOB_MATCH_MIN_SCORE == 50
    assert _JOB_MATCH_LIMIT <= 10


def test_job_alert_template_renders():
    body = render_template(_JOB_ALERT_SPEC["template"], {"jobTitle": "Django Developer"})
    assert "Django Developer" in body
    assert "{jobTitle}" not in body