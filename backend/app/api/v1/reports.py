"""Sprint 8 — Reporting & exports API.

Endpoints for downloading scheme ROI / skill-gap / outcome / candidate /
application reports as CSV, XLSX, or PDF, plus an on-demand analytics JSON
snapshot (the printable "scheme-ROI" report is PDF-native).

Route-ordering note: static paths (`/available`, `/snapshot`) are declared
BEFORE the parameterized `/{report_type}.{fmt}` catchall to avoid path
shadowing.
"""
import io
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response, StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_role
from app.models.scheme_analytics import SchemeAnalytics
from app.models.skill_gap import SkillGapScore
from app.models.employment_outcome import EmploymentOutcome
from app.models.candidate import Candidate
from app.models.training_partner import TrainingPartner
from app.models.job_application import JobApplication
from app.models.enrollment import Enrollment
from app.models.employer import Employer
from app.models.course import Course
from app.services.reporting_service import (
    REPORT_LABELS,
    is_reportable,
    report_columns,
    to_csv,
    to_pdf,
    to_xlsx,
)

router = APIRouter()

_FORMATS = ("csv", "xlsx", "pdf")

_MEDIA_TYPES = {
    "csv": "text/csv",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "pdf": "application/pdf",
}


def _row_to_dict(obj) -> dict:
    """Best-effort conversion of a SQLAlchemy mapped row to a dict."""
    return {c.key: getattr(obj, c.key) for c in obj.__table__.columns}


@router.get("/available")
async def list_reports(
    user: dict = Depends(require_role("gov_admin", "training_partner")),
):
    """Enumerate report types, their labels, and supported export formats."""
    return {
        "reports": [
            {
                "report_type": rt,
                "label": REPORT_LABELS[rt],
                "formats": list(_FORMATS),
            }
            for rt in REPORT_LABELS
        ],
        "formats": list(_FORMATS),
    }


async def _fetch_rows(report_type: str, db: AsyncSession, limit: int) -> list[dict]:
    model = {
        "scheme-roi": SchemeAnalytics,
        "skill-gaps": SkillGapScore,
        "outcomes": EmploymentOutcome,
        "candidates": Candidate,
        "applications": JobApplication,
    }[report_type]

    query = select(model).order_by(getattr(model, "created_at", "id").desc()).limit(limit)
    result = await db.execute(query)
    return [_row_to_dict(r) for r in result.scalars().all()]


def _download_name(report_type: str, fmt: str) -> str:
    return f"skilltrace-{report_type}-{fmt}"


@router.get("/snapshot")
async def analytics_snapshot(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin")),
):
    """On-demand analytics snapshot mirroring the dashboard KPIs.

    Serves as the schedulable snapshot payload (computed on demand today; a
    worker job may later persist it for a historical time-series).
    """
    t_cand, t_partner, t_emp, t_enr, t_course = await _multi_count(db)

    outcomes_result = await db.execute(select(EmploymentOutcome.id))
    outcomes = outcomes_result.scalars().all()
    total_outcomes = len(outcomes)

    employed_result = await db.execute(
        select(EmploymentOutcome.id).where(EmploymentOutcome.is_employed == True)
    )
    total_employed = len(employed_result.scalars().all())

    scheme_result = await db.execute(
        select(SchemeAnalytics.scheme_id, SchemeAnalytics.total_placed_12m)
    )
    by_scheme: dict[str, int] = {}
    for scheme_id, placed in scheme_result.all():
        by_scheme[scheme_id] = by_scheme.get(scheme_id, 0) + int(placed or 0)

    return {
        "generated_at": datetime.utcnow().isoformat(),
        "counts": {
            "total_candidates": t_cand,
            "total_training_partners": t_partner,
            "total_employers": t_emp,
            "total_enrollments": t_enr,
            "total_courses": t_course,
        },
        "outcomes": {
            "total_outcomes": total_outcomes,
            "total_employed": total_employed,
            "overall_placement_rate": (
                round(total_employed / max(total_outcomes, 1) * 100, 2)
                if total_outcomes else None
            ),
        },
        "placements_per_scheme": by_scheme,
    }


async def _multi_count(db: AsyncSession) -> tuple[int, int, int, int, int]:
    async def cnt(model) -> int:
        r = await db.execute(select(model.id))
        return len(r.scalars().all())
    a = await cnt(Candidate)
    b = await cnt(TrainingPartner)
    c = await cnt(Employer)
    d = await cnt(Enrollment)
    e = await cnt(Course)
    return a, b, c, d, e


@router.get("/{report_type}.{fmt}")
async def export_report(
    report_type: str,
    fmt: str,
    limit: int = Query(500, ge=1, le=5000),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin", "training_partner")),
):
    if not is_reportable(report_type):
        raise HTTPException(status_code=404, detail=f"Unknown report type: {report_type}")
    if fmt not in _FORMATS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format '{fmt}'. Supported: {', '.join(_FORMATS)}",
        )

    rows = await _fetch_rows(report_type, db, limit)
    columns = report_columns(report_type)
    filename = _download_name(report_type, fmt)
    label = REPORT_LABELS[report_type]

    if fmt == "csv":
        content = to_csv(report_type, rows).encode("utf-8-sig")
        return StreamingResponse(
            io.BytesIO(content),
            media_type=_MEDIA_TYPES["csv"],
            headers={"Content-Disposition": f'attachment; filename="{filename}.csv"'},
        )

    if fmt == "xlsx":
        content = to_xlsx(report_type, rows)
        return Response(
            content=content,
            media_type=_MEDIA_TYPES["xlsx"],
            headers={"Content-Disposition": f'attachment; filename="{filename}.xlsx"'},
        )

    content = to_pdf(label, columns, rows)
    return Response(
        content=content,
        media_type=_MEDIA_TYPES["pdf"],
        headers={"Content-Disposition": f'attachment; filename="{filename}.pdf"'},
    )
