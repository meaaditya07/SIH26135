from datetime import date, timedelta

from celery import shared_task
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.database import async_session_factory
from app.models.enrollment import Enrollment
from app.models.survey_schedule import SurveySchedule

settings = get_settings()


@shared_task(name="workers.tasks.survey_scheduler.dispatch_pending_surveys", bind=True, max_retries=3)
def dispatch_pending_surveys(self):
    """
    Daily check: for enrollments completed at 3/6/12 month intervals,
    create survey schedules and dispatch WhatsApp (or SMS fallback) messages.
    """
    import asyncio
    asyncio.run(_async_dispatch())


async def _async_dispatch():
    from app.services.survey_service import dispatch_one

    today = date.today()
    intervals = {
        "3_month": 90,
        "6_month": 180,
        "12_month": 365,
    }

    async with async_session_factory() as db:
        for interval_key, days in intervals.items():
            target_date = today - timedelta(days=days)

            result = await db.execute(
                select(Enrollment).where(
                    Enrollment.completion_date.between(
                        target_date - timedelta(days=3),
                        target_date + timedelta(days=3),
                    ),
                    Enrollment.is_completed == True,
                ).options(selectinload(Enrollment.survey_schedules))
            )
            enrollments = result.scalars().unique().all()

            for enrollment in enrollments:
                existing = await db.execute(
                    select(SurveySchedule).where(
                        SurveySchedule.enrollment_id == enrollment.id,
                        SurveySchedule.scheduled_interval == interval_key,
                    )
                )
                if existing.scalar_one_or_none():
                    continue

                schedule = SurveySchedule(
                    candidate_id=enrollment.candidate_id,
                    enrollment_id=enrollment.id,
                    scheduled_interval=interval_key,
                    scheduled_date=today,
                    channel=settings.SURVEY_CHANNEL_PREFERENCE,
                    status="scheduled",
                )
                db.add(schedule)
                await db.flush()
                await dispatch_one(db, schedule)
                await db.flush()

        await db.commit()
