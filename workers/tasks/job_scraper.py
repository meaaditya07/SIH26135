"""Job scraping orchestration: scrape portals, dedup, persist, and recompute gaps."""
from __future__ import annotations

from celery import shared_task

from app.config import get_settings

settings = get_settings()

TRENDING_SECTORS = ["IT", "Finance", "Healthcare", "Retail", "Manufacturing"]


@shared_task(name="workers.tasks.job_scraper.run_job_scrape", bind=True, max_retries=2, autoretry_for=(Exception,), retry_backoff=60)
def run_job_scrape(self):
    """
    Daily job scraping from configured portals, wrapped as an async pipeline.
    """
    import asyncio
    results = asyncio.run(_scrape_pipeline())
    return results


async def _scrape_pipeline() -> dict:
    from workers.scrapers.naukri_scraper import NaukriScraper
    from workers.scrapers.indeed_scraper import IndeedScraper

    scrapers = [
        NaukriScraper(timeout=20),
        IndeedScraper(publisher_id=settings.INDEED_PUBLISHER_ID, timeout=20),
    ]

    raw_jobs: list[dict] = []
    for scraper in scrapers:
        try:
            jobs = await scraper.scrape_trending(sectors=TRENDING_SECTORS)
            raw_jobs.extend(jobs)
        except Exception:
            continue

    kept = 0
    for job in raw_jobs:
        if await _persist_if_new(job):
            kept += 1

    # Recompute regional skill gaps after ingesting new demand signals.
    from workers.tasks.nlp_pipeline import recompute_skill_gaps
    recompute_skill_gaps.delay()

    return {"scraped": len(raw_jobs), "created": kept}


async def _persist_if_new(job: dict) -> bool:
    """Insert a job posting unless it's a duplicate; returns True if created."""
    from sqlalchemy import select

    from app.database import async_session_factory
    from app.models.job_posting import JobPosting

    dedup_key = job.get("source_url")
    title = (job.get("title") or "").strip()

    async with async_session_factory() as db:
        # De-duplicate by source_url first, then by (title + source_portal).
        if dedup_key:
            existing = await db.execute(
                select(JobPosting).where(JobPosting.source_url == dedup_key)
            )
            if existing.scalars().first():
                await db.commit()
                return False

        existing_title = await db.execute(
            select(JobPosting).where(
                JobPosting.title == title,
                JobPosting.source_portal == job.get("source_portal"),
            )
        )
        if existing_title.scalars().first():
            await db.commit()
            return False

        posting = JobPosting(
            title=title,
            description_raw=job.get("description_raw") or "",
            description_cleaned=job.get("description") or "",
            required_skills=job.get("required_skills") or [],
            preferred_skills=job.get("preferred_skills") or [],
            location=job.get("location"),
            state=job.get("state"),
            district=job.get("district"),
            salary_min=job.get("salary_min"),
            salary_max=job.get("salary_max"),
            experience_min_months=job.get("experience_min_months"),
            source_portal=job.get("source_portal"),
            source_url=job.get("source_url"),
            is_active=True,
        )
        db.add(posting)
        await db.commit()
        return True


@shared_task(name="workers.tasks.job_scraper.save_job_posting")
def save_job_posting(job_data: dict):
    """Persist a single scraped job and trigger NLP extraction (kept for API compat)."""
    import asyncio
    return asyncio.run(_persist_if_new(job_data))
