from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.models.enrollment import Enrollment
from app.models.employment_outcome import EmploymentOutcome


async def get_candidate_timeline(db: AsyncSession, candidate_id: UUID) -> dict:
    """Build a complete timeline for a candidate: enrollments, outcomes, surveys."""
    result = await db.execute(
        select(Enrollment).where(Enrollment.candidate_id == candidate_id)
    )
    enrollments = result.scalars().all()

    timeline = []
    for enrollment in enrollments:
        outcomes_result = await db.execute(
            select(EmploymentOutcome).where(
                EmploymentOutcome.enrollment_id == enrollment.id
            ).order_by(EmploymentOutcome.survey_date)
        )
        outcomes = outcomes_result.scalars().all()

        timeline.append({
            "enrollment": {
                "id": str(enrollment.id),
                "course_id": str(enrollment.course_id),
                "enrollment_date": str(enrollment.enrollment_date),
                "completion_date": str(enrollment.completion_date) if enrollment.completion_date else None,
                "is_completed": enrollment.is_completed,
            },
            "outcomes": [
                {
                    "interval": o.survey_interval,
                    "is_employed": o.is_employed,
                    "job_title": o.current_job_title,
                    "monthly_salary": float(o.monthly_salary) if o.monthly_salary else None,
                    "survey_date": str(o.survey_date),
                }
                for o in outcomes
            ],
        })

    return {"candidate_id": str(candidate_id), "timeline": timeline}
