from celery import Celery
from celery.schedules import crontab
import os

app = Celery("skilltrace")

# Broker and backend from environment
app.conf.broker_url = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
app.conf.result_backend = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/1")

# Task discovery
app.autodiscover_tasks(["workers.tasks"])

# Serialization
app.conf.task_serializer = "json"
app.conf.result_serializer = "json"
app.conf.accept_content = ["json"]

# Timezone
app.conf.timezone = "Asia/Kolkata"
app.conf.enable_utc = True

# Retry settings
app.conf.task_acks_late = True
app.conf.task_reject_on_worker_lost = True
app.conf.task_default_retry_delay = 300
app.conf.task_max_retries = 3

# Beat schedule — periodic tasks
app.conf.beat_schedule = {
    "daily-survey-dispatch": {
        "task": "workers.tasks.survey_scheduler.dispatch_pending_surveys",
        "schedule": crontab(hour=9, minute=0, timezone="Asia/Kolkata"),
    },
    "daily-job-scrape": {
        "task": "workers.tasks.job_scraper.run_job_scrape",
        "schedule": crontab(hour=2, minute=0),
    },
    "weekly-skill-gap-recalc": {
        "task": "workers.tasks.nlp_pipeline.recompute_skill_gaps",
        "schedule": crontab(hour=3, minute=0, day_of_week="monday"),
    },
    "monthly-scheme-aggregation": {
        "task": "workers.tasks.analytics_agg.aggregate_scheme_metrics",
        "schedule": crontab(hour=4, minute=0, day_of_week=1),
    },
}
