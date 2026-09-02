from celery import shared_task


@shared_task(name="workers.tasks.analytics_agg.aggregate_scheme_metrics", bind=True, max_retries=2)
def aggregate_scheme_metrics(self):
    """
    Monthly aggregation of scheme-level analytics:
    enrollment, completion, placement, retention, ROI.
    """
    import asyncio

    async def _aggregate():
        from datetime import datetime
        from app.database import async_session_factory
        from app.models.course import Course
        from app.models.enrollment import Enrollment
        from app.models.employment_outcome import EmploymentOutcome
        from app.models.scheme_analytics import SchemeAnalytics
        from sqlalchemy import select, func

        async with async_session_factory() as db:
            # Get all unique scheme_ids
            schemes_result = await db.execute(
                select(Course.scheme_id).where(Course.scheme_id.isnot(None)).distinct()
            )
            scheme_ids = [row[0] for row in schemes_result.all()]

            for scheme_id in scheme_ids:
                # Get courses under this scheme
                courses_result = await db.execute(
                    select(Course.id).where(Course.scheme_id == scheme_id)
                )
                course_ids = [row[0] for row in courses_result.all()]

                # Enrollment counts
                enrolled = await db.execute(
                    select(func.count(Enrollment.id)).where(
                        Enrollment.course_id.in_(course_ids)
                    )
                )
                completed = await db.execute(
                    select(func.count(Enrollment.id)).where(
                        Enrollment.course_id.in_(course_ids),
                        Enrollment.is_completed == True,
                    )
                )

                total_enrolled = enrolled.scalar() or 0
                total_completed = completed.scalar() or 0
                completion_rate = round(total_completed / max(total_enrolled, 1) * 100, 2)

                # Placement counts by interval
                placed_3m = await db.execute(
                    select(func.count(EmploymentOutcome.id)).where(
                        EmploymentOutcome.enrollment_id.in_(
                            select(Enrollment.id).where(Enrollment.course_id.in_(course_ids))
                        ),
                        EmploymentOutcome.survey_interval == "3_month",
                        EmploymentOutcome.is_employed == True,
                    )
                )
                placed_6m = await db.execute(
                    select(func.count(EmploymentOutcome.id)).where(
                        EmploymentOutcome.enrollment_id.in_(
                            select(Enrollment.id).where(Enrollment.course_id.in_(course_ids))
                        ),
                        EmploymentOutcome.survey_interval == "6_month",
                        EmploymentOutcome.is_employed == True,
                    )
                )
                placed_12m = await db.execute(
                    select(func.count(EmploymentOutcome.id)).where(
                        EmploymentOutcome.enrollment_id.in_(
                            select(Enrollment.id).where(Enrollment.course_id.in_(course_ids))
                        ),
                        EmploymentOutcome.survey_interval == "12_month",
                        EmploymentOutcome.is_employed == True,
                    )
                )

                p3 = placed_3m.scalar() or 0
                p6 = placed_6m.scalar() or 0
                p12 = placed_12m.scalar() or 0

                retention_3m = round(p3 / max(total_completed, 1) * 100, 2)
                retention_6m = round(p6 / max(total_completed, 1) * 100, 2)
                retention_12m = round(p12 / max(total_completed, 1) * 100, 2)

                # Average salary
                avg_sal_result = await db.execute(
                    select(func.avg(EmploymentOutcome.monthly_salary)).where(
                        EmploymentOutcome.enrollment_id.in_(
                            select(Enrollment.id).where(Enrollment.course_id.in_(course_ids))
                        ),
                        EmploymentOutcome.survey_interval == "3_month",
                        EmploymentOutcome.is_employed == True,
                    )
                )
                avg_salary = float(avg_sal_result.scalar() or 0)

                # Cost
                total_cost_result = await db.execute(
                    select(func.sum(Course.cost_per_candidate)).where(
                        Course.id.in_(course_ids)
                    )
                )
                total_cost = float(total_cost_result.scalar() or 0)
                cost_per_placement = round(total_cost / max(p12, 1), 2)

                # ROI
                roi_score = round(
                    (avg_salary * 12 * p12) / max(total_cost, 1) * 100, 2
                )

                # Alert
                alert_status = "active"
                alert_reasons = []
                if completion_rate < 60:
                    alert_reasons.append("low_completion")
                if retention_12m < 30:
                    alert_reasons.append("low_placement")
                if retention_6m < 50:
                    alert_reasons.append("low_retention")
                if len(alert_reasons) >= 2:
                    alert_status = "underperforming"
                if cost_per_placement > 3000 and retention_12m < 15:
                    alert_status = "alert"

                analytics = SchemeAnalytics(
                    scheme_id=scheme_id,
                    period=datetime.now().replace(day=1).date(),
                    total_enrolled=total_enrolled,
                    total_completed=total_completed,
                    completion_rate=completion_rate,
                    total_placed_3m=p3,
                    total_placed_6m=p6,
                    total_placed_12m=p12,
                    retention_3m=retention_3m,
                    retention_6m=retention_6m,
                    retention_12m=retention_12m,
                    total_cost=total_cost,
                    cost_per_placement=cost_per_placement,
                    avg_salary_at_placement=avg_salary,
                    roi_score=roi_score,
                    alert_status=alert_status,
                    alert_reason=", ".join(alert_reasons) if alert_reasons else None,
                )
                db.add(analytics)

            await db.commit()

    asyncio.run(_aggregate())
