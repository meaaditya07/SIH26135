from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import date, timedelta

from app.database import get_db
from app.dependencies import require_role
from app.models.candidate import Candidate
from app.models.training_partner import TrainingPartner
from app.models.employer import Employer
from app.models.enrollment import Enrollment
from app.models.course import Course
from app.models.job_posting import JobPosting
from app.models.employment_outcome import EmploymentOutcome
from app.models.scheme_analytics import SchemeAnalytics
from app.schemas import SchemeAnalyticsResponse, DashboardStats

router = APIRouter()


@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin", "training_partner")),
):
    candidates = await db.execute(select(func.count(Candidate.id)))
    partners = await db.execute(select(func.count(TrainingPartner.id)))
    employers = await db.execute(select(func.count(Employer.id)))
    enrollments = await db.execute(select(func.count(Enrollment.id)))
    courses = await db.execute(select(func.count(Course.id)))
    schemes = await db.execute(
        select(func.count(func.distinct(SchemeAnalytics.scheme_id)))
    )

    # Placement rate: employed outcomes / total outcomes (all intervals).
    total_outcomes = await db.execute(select(func.count(EmploymentOutcome.id)))
    employed_outcomes = await db.execute(
        select(func.count(EmploymentOutcome.id)).where(EmploymentOutcome.is_employed == True)
    )
    t_out = total_outcomes.scalar() or 0
    e_out = employed_outcomes.scalar() or 0

    return DashboardStats(
        total_candidates=candidates.scalar() or 0,
        total_training_partners=partners.scalar() or 0,
        total_employers=employers.scalar() or 0,
        total_enrollments=enrollments.scalar() or 0,
        total_courses=courses.scalar() or 0,
        active_schemes=schemes.scalar() or 0,
        overall_placement_rate=round(e_out / max(t_out, 1) * 100, 2) if t_out else None,
    )


@router.get("/trends")
async def get_enrollment_trends(
    months: int = Query(6, ge=1, le=24),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin", "training_partner")),
):
    """Monthly enrollment + completion trends for the trailing N months."""
    cutoff = date.today() - timedelta(days=30 * months)
    enroll_result = await db.execute(
        select(
            func.to_char(Enrollment.enrollment_date, "YYYY-MM").label("month"),
            func.count(Enrollment.id).label("cnt"),
        )
        .where(Enrollment.enrollment_date >= cutoff)
        .group_by(text("month"))
        .order_by(text("month"))
    )
    enroll_rows = enroll_result.all()

    complete_result = await db.execute(
        select(
            func.to_char(Enrollment.completion_date, "YYYY-MM").label("month"),
            func.count(Enrollment.id).label("cnt"),
        )
        .where(Enrollment.is_completed == True, Enrollment.completion_date >= cutoff)
        .group_by(text("month"))
        .order_by(text("month"))
    )
    complete_rows = complete_result.all()

    enroll_map = {r.month: r.cnt for r in enroll_rows}
    complete_map = {r.month: r.cnt for r in complete_rows}

    # Build a continuous month series.
    series = []
    cursor = date.today()
    month_list = []
    for _ in range(months):
        month_list.append(cursor.strftime("%Y-%m"))
        cursor = cursor.replace(day=1) - timedelta(days=1)
    month_list.reverse()

    for m in month_list:
        series.append({
            "month": m,
            "enrollments": enroll_map.get(m, 0),
            "completions": complete_map.get(m, 0),
        })

    return {"months": series}


@router.get("/top-skills")
async def get_top_skills(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin", "training_partner")),
):
    """Rank most-demanded skills across active job postings."""
    jobs_result = await db.execute(
        select(JobPosting).where(JobPosting.is_active == True)
    )
    jobs = jobs_result.scalars().all()

    demand: dict[str, int] = {}
    for j in jobs:
        for s in (j.required_skills or []):
            demand[s] = demand.get(s, 0) + 1
        for s in (j.preferred_skills or []):
            demand[s] = demand.get(s, 0) + 0.5

    ranked = sorted(demand.items(), key=lambda kv: kv[1], reverse=True)[:limit]
    return {"skills": [{"skill": s, "demand": round(d, 1)} for s, d in ranked]}


@router.get("/scheme-roi", response_model=list[SchemeAnalyticsResponse])
async def get_scheme_roi(
    scheme_id: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin")),
):
    query = select(SchemeAnalytics).order_by(SchemeAnalytics.computed_at.desc())
    if scheme_id:
        query = query.where(SchemeAnalytics.scheme_id == scheme_id)
    if state:
        query = query.where(SchemeAnalytics.state == state)
    query = query.offset(skip).limit(limit)

    result = await db.execute(query)
    rows = result.scalars().all()

    return [
        SchemeAnalyticsResponse(
            scheme_id=r.scheme_id,
            period=str(r.period),
            total_enrolled=r.total_enrolled,
            total_completed=r.total_completed,
            completion_rate=float(r.completion_rate) if r.completion_rate else None,
            total_placed_3m=r.total_placed_3m,
            total_placed_6m=r.total_placed_6m,
            total_placed_12m=r.total_placed_12m,
            cost_per_placement=float(r.cost_per_placement) if r.cost_per_placement else None,
            roi_score=float(r.roi_score) if r.roi_score else None,
            alert_status=r.alert_status or "active",
        )
        for r in rows
    ]


@router.get("/alerts")
async def get_policy_alerts(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin")),
):
    result = await db.execute(
        select(SchemeAnalytics).where(
            SchemeAnalytics.alert_status.in_(["underperforming", "alert"])
        ).order_by(SchemeAnalytics.computed_at.desc()).limit(50)
    )
    alerts = result.scalars().all()

    return [
        {
            "scheme_id": a.scheme_id,
            "alert_status": a.alert_status,
            "alert_reason": a.alert_reason,
            "cost_per_placement": float(a.cost_per_placement) if a.cost_per_placement else None,
            "roi_score": float(a.roi_score) if a.roi_score else None,
            "computed_at": a.computed_at.isoformat() if a.computed_at else None,
        }
        for a in alerts
    ]
