"""Sprint 8 — tests for the reporting/export service (pure logic, no DB)."""
import sys
import os
import csv
import io

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from app.services.reporting_service import (
    REPORT_LABELS,
    is_reportable,
    report_columns,
    to_csv,
    to_xlsx,
    to_pdf,
    _coerce,
)


def test_report_registry():
    assert {"scheme-roi", "skill-gaps", "outcomes", "candidates", "applications", "regional-candidates"} <= set(REPORT_LABELS)
    assert is_reportable("scheme-roi") is True
    assert is_reportable("regional-candidates") is True
    assert is_reportable("nonsense") is False


def test_coerce_types():
    from datetime import date
    assert _coerce(date(2026, 9, 2)) == "2026-09-02"
    assert _coerce(["python", "sql"]) == "python, sql"
    assert _coerce(True) == "Yes"
    assert _coerce(False) == "No"
    assert _coerce(123) == 123


def test_to_csv_headers_and_rows():
    rows = [
        {"scheme_id": "PMKVY-4", "total_enrolled": 120, "total_completed": 90,
         "completion_rate": 75.0, "total_placed_6m": 40, "total_placed_12m": 70,
         "cost_per_placement": 4200.0, "roi_score": 61.2, "alert_status": "active",
         "period": "2026-06-01", "state": "KA", "district": "Bengaluru"},
    ]
    text = to_csv("scheme-roi", rows)
    parsed = list(csv.reader(io.StringIO(text)))
    assert parsed[0][0] == "Scheme ID"
    assert "PMKVY-4" in parsed[1]
    row_dict = dict(zip(parsed[0], parsed[1]))
    assert row_dict["Enrolled"] == "120"
    assert row_dict["Completion Rate %"] == "75.0"
    assert row_dict["Period"] == "2026-06-01"


def test_to_xlsx_bytes():
    rows = [
        {"state": "Karnataka", "district": "Bengaluru", "sector": "IT",
         "skill_name": "Python", "demand_score": 88.0, "supply_score": 50.0,
         "gap_score": 38.0, "gap_direction": "deficit"},
    ]
    data = to_xlsx("skill-gaps", rows)
    assert data[:2] == b"PK"  # xlsx zip magic
    assert len(data) > 100


def test_to_pdf_bytes():
    rows = [
        {"id": "11111111-1111-1111-1111-111111111111",
         "full_name": "Asha R.", "phone": "9999999999", "state": "KA",
         "district": "BLR", "digilocker_status": "verified",
         "skill_tags": ["python", "sql"], "is_active": True,
         "created_at": "2026-01-01T00:00:00"},
    ]
    data = to_pdf("Candidate Registry", report_columns("candidates"), rows)
    assert data[:4] == b"%PDF"
    assert len(data) > 300


def test_columns_are_consistent_with_labels():
    for rt in REPORT_LABELS:
        cols = report_columns(rt)
        assert cols, f"report {rt} has no columns"
        headers = [h for h, _ in cols]
        assert len(headers) == len(set(headers)), f"duplicate headers in {rt}"


def test_regional_candidates_columns():
    cols = report_columns("regional-candidates")
    assert [h for h, _ in cols] == ["State", "District", "Candidate Count"]
    row = {"state": "Karnataka", "district": "Bengaluru", "candidate_count": 4}
    text = to_csv("regional-candidates", [row])
    parsed = list(csv.reader(io.StringIO(text)))
    assert dict(zip(parsed[0], parsed[1]))["Candidate Count"] == "4"
