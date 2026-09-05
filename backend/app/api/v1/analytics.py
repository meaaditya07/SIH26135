from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import date, timedelta
from uuid import UUID

from app.database import get_db
from app.dependencies import require_role
from app.models.candidate import Candidate
from app.models.training_partner import TrainingPartner
from app.models.employer import Employer
from app.models.enrollment import Enrollment
from app.models.course import Course
from app.models.job_posting import JobPosting
from app.models.job_application import JobApplication
from app.models.employment_outcome import EmploymentOutcome
from app.models.scheme_analytics import SchemeAnalytics
from app.models.user import User
from app.schemas import SchemeAnalyticsResponse, DashboardStats

router = APIRouter()


@router.get("/public-summary")
async def get_public_summary(db: AsyncSession = Depends(get_db)):
    """Public aggregate stats for the marketing/landing page (no auth required)."""
    candidates = await db.execute(select(func.count(Candidate.id)))
    partners = await db.execute(select(func.count(TrainingPartner.id)))
    employers = await db.execute(select(func.count(Employer.id)))
    enrollments = await db.execute(select(func.count(Enrollment.id)))
    courses = await db.execute(select(func.count(Course.id)))
    schemes = await db.execute(
        select(func.count(func.distinct(SchemeAnalytics.scheme_id)))
    )
    total_outcomes = await db.execute(select(func.count(EmploymentOutcome.id)))
    employed = await db.execute(
        select(func.count(EmploymentOutcome.id)).where(EmploymentOutcome.is_employed == True)
    )

    # Aggregate skills taught across courses for a "skills ecosystem" tally.
    course_rows = await db.execute(select(Course.skills_taught))
    skill_set: set[str] = set()
    for (skills,) in course_rows.all():
        for s in (skills or []):
            skill_set.add(s)

    t_out = total_outcomes.scalar() or 0
    e_out = employed.scalar() or 0

    return {
        "total_candidates": candidates.scalar() or 0,
        "total_training_partners": partners.scalar() or 0,
        "total_employers": employers.scalar() or 0,
        "total_enrollments": enrollments.scalar() or 0,
        "total_courses": courses.scalar() or 0,
        "active_schemes": schemes.scalar() or 0,
        "skills_taught": len(skill_set),
        "overall_placement_rate": round(e_out / max(t_out, 1) * 100, 2) if t_out else None,
    }


@router.get("/public-schemes")
async def get_public_schemes(
    limit: int = Query(5, ge=1, le=12),
    state: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Public top-schemes highlights for the marketing/landing page (no auth required).

    Optionally filter by `state`; returns the distinct states present so the
    landing page can offer filter chips.
    """
    states_result = await db.execute(
        select(SchemeAnalytics.state).where(SchemeAnalytics.state.isnot(None)).distinct()
    )
    available_states = sorted({s[0] for s in states_result.all() if s[0]})

    if state:
        if state not in available_states:
            return {"available_states": available_states, "states": available_states, "schemes": []}
        rows_result = await db.execute(
            select(
                SchemeAnalytics.scheme_id,
                func.sum(SchemeAnalytics.total_enrolled),
                func.sum(SchemeAnalytics.total_completed),
                func.sum(SchemeAnalytics.total_placed_3m),
                func.sum(SchemeAnalytics.total_placed_6m),
                func.sum(SchemeAnalytics.total_placed_12m),
                func.sum(SchemeAnalytics.total_cost),
                func.avg(SchemeAnalytics.roi_score),
                func.avg(SchemeAnalytics.avg_salary_at_placement),
            )
            .where(SchemeAnalytics.scheme_id.in_(
                select(SchemeAnalytics.scheme_id).where(SchemeAnalytics.state == state)
            ))
            .group_by(SchemeAnalytics.scheme_id)
        )
    else:
        rows_result = await db.execute(
            select(
                SchemeAnalytics.scheme_id,
                func.sum(SchemeAnalytics.total_enrolled),
                func.sum(SchemeAnalytics.total_completed),
                func.sum(SchemeAnalytics.total_placed_3m),
                func.sum(SchemeAnalytics.total_placed_6m),
                func.sum(SchemeAnalytics.total_placed_12m),
                func.sum(SchemeAnalytics.total_cost),
                func.avg(SchemeAnalytics.roi_score),
                func.avg(SchemeAnalytics.avg_salary_at_placement),
            )
            .group_by(SchemeAnalytics.scheme_id)
        )

    schemes = []
    for row in rows_result.all():
        enrolled = int(row[1] or 0)
        completed = int(row[2] or 0)
        placed3 = int(row[3] or 0)
        placed6 = int(row[4] or 0)
        placed12 = int(row[5] or 0)
        cost = float(row[6] or 0)
        roi = float(row[7]) if row[7] is not None else None
        avg_sal = float(row[8]) if row[8] is not None else None

        schemes.append({
            "scheme_id": row[0],
            "total_enrolled": enrolled,
            "completion_rate": round(completed / max(enrolled, 1) * 100, 1),
            "placed_3m": placed3,
            "placed_6m": placed6,
            "placed_12m": placed12,
            "total_cost": round(cost, 2),
            "roi_score": round(roi, 2) if roi is not None else None,
            "avg_salary_at_placement": round(avg_sal, 2) if avg_sal else None,
        })

    schemes.sort(key=lambda x: x["total_enrolled"], reverse=True)
    return {
        "available_states": available_states,
        "states": available_states,
        "schemes": schemes[:limit],
    }


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
    user: dict = Depends(require_role("gov_admin", "training_partner", "candidate")),
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
            state=r.state,
            district=r.district,
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


_FUNNEL_STAGES = ("applied", "shortlisted", "interview", "offered", "hired")


def _funnel_from(apps) -> dict:
    """Return per-stage counts + % of applicants that reached each stage."""
    total = len(apps)
    counts: dict[str, int] = {s: 0 for s in _FUNNEL_STAGES}
    for a in apps:
        cur = a.status.value if hasattr(a.status, "value") else str(a.status)
        if cur in counts:
            idx = _FUNNEL_STAGES.index(cur)
            for s in _FUNNEL_STAGES[: idx + 1]:
                counts[s] += 1
    pct = {s: round(c / total * 100, 1) if total else 0.0 for s, c in counts.items()}
    return {"total": total, "counts": counts, "pct": pct}


@router.get("/sector-benchmark")
async def sector_benchmark(
    industry: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("employer")),
):
    """Compare the employer's hiring funnel vs sector averages in their industry."""
    u = (await db.execute(select(User).where(User.id == UUID(str(user["sub"]))))).scalar_one_or_none()
    employer = None
    own_industry = industry
    if u and u.employer_id:
        employer = (
            await db.execute(select(Employer).where(Employer.id == u.employer_id))
        ).scalar_one_or_none()
        if employer and not own_industry:
            own_industry = employer.industry

    sector = own_industry or "Unknown"
    sector_jobs = (
        await db.execute(
            select(JobPosting)
            .join(Employer, Employer.id == JobPosting.employer_id)
            .where(Employer.industry == sector)
        )
    ).scalars().all()
    sector_job_ids = [j.id for j in sector_jobs]
    sector_apps = []
    if sector_job_ids:
        sector_apps = (
            await db.execute(select(JobApplication).where(JobApplication.job_posting_id.in_(sector_job_ids)))
        ).scalars().all()

    own_apps = []
    if employer:
        own_jobs = (
            await db.execute(select(JobPosting).where(JobPosting.employer_id == employer.id))
        ).scalars().all()
        own_job_ids = [j.id for j in own_jobs]
        if own_job_ids:
            own_apps = (
                await db.execute(select(JobApplication).where(JobApplication.job_posting_id.in_(own_job_ids)))
            ).scalars().all()

    sector_funnel = _funnel_from(sector_apps)
    own_funnel = _funnel_from(own_apps)

    sector_match = [float(a.match_score) for a in sector_apps if a.match_score is not None]
    own_match = [float(a.match_score) for a in own_apps if a.match_score is not None]
    avg = lambda xs: round(sum(xs) / len(xs), 1) if xs else None

    return {
        "industry": sector,
        "sector": {
            "job_count": len(sector_jobs),
            **sector_funnel,
            "avg_match_score": avg(sector_match),
            "hired_rate": sector_funnel["pct"].get("hired", 0.0),
        },
        "own": {
            "job_count": len([j for j in own_jobs if employer]) if employer else 0,
            **own_funnel,
            "avg_match_score": avg(own_match),
            "hired_rate": own_funnel["pct"].get("hired", 0.0),
        },
    }


@router.get("/partner-coverage")
async def partner_coverage(db: AsyncSession = Depends(get_db)):
    """Public partner footprint by state for the landing page (no auth required)."""
    rows = (
        await db.execute(
            select(TrainingPartner.state, func.count(func.distinct(TrainingPartner.id)))
            .where(TrainingPartner.state.isnot(None))
            .group_by(TrainingPartner.state)
        )
    ).all()

    course_counts = (
        await db.execute(
            select(TrainingPartner.state, func.count(Course.id))
            .join(Course, Course.training_partner_id == TrainingPartner.id)
            .where(TrainingPartner.state.isnot(None))
            .group_by(TrainingPartner.state)
        )
    ).all()
    course_map = {s: c for s, c in course_counts}

    states = [
        {
            "state": s,
            "partner_count": cnt,
            "course_count": course_map.get(s, 0),
        }
        for s, cnt in rows
    ]
    states.sort(key=lambda r: r["partner_count"], reverse=True)
    return {
        "total_partners": sum(r["partner_count"] for r in states),
        "total_states": len(states),
        "total_courses": sum(r["course_count"] for r in states),
        "states": states,
    }
