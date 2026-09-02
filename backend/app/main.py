from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import structlog
import time

from app.config import get_settings
from app.core.exceptions import SkillTraceException
from app.api.v1 import (
    candidates, training_partners, employers, courses, auth, skill_gap, analytics,
    enrollments, outcomes, job_postings, surveys, webhooks, matches, ml,
    applications, reports, notifications,
)

settings = get_settings()
logger = structlog.get_logger()


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="Vocational Education Outcome Tracking & Labor Analytics Platform",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # ─── CORS ───
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://localhost:3001"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ─── Request Timing ───
    @app.middleware("http")
    async def timing_middleware(request: Request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        duration = time.perf_counter() - start
        logger.info(
            "request",
            method=request.method,
            path=request.url.path,
            status=response.status_code,
            duration_ms=round(duration * 1000, 2),
        )
        return response

    # ─── Global Exception Handler ───
    @app.exception_handler(SkillTraceException)
    async def skilltrace_exception_handler(request: Request, exc: SkillTraceException):
        return JSONResponse(
            status_code=400,
            content={"error": exc.code, "message": exc.message},
        )

    # ─── Health Check ───
    @app.get("/health")
    async def health():
        return {"status": "healthy", "version": settings.APP_VERSION}

    # ─── Register Routers ───
    app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
    app.include_router(candidates.router, prefix="/api/v1/candidates", tags=["Candidates"])
    app.include_router(training_partners.router, prefix="/api/v1/training-partners", tags=["Training Partners"])
    app.include_router(employers.router, prefix="/api/v1/employers", tags=["Employers"])
    app.include_router(courses.router, prefix="/api/v1/courses", tags=["Courses"])
    app.include_router(enrollments.router, prefix="/api/v1/enrollments", tags=["Enrollments"])
    app.include_router(outcomes.router, prefix="/api/v1/outcomes", tags=["Employment Outcomes"])
    app.include_router(job_postings.router, prefix="/api/v1/job-postings", tags=["Job Postings"])
    app.include_router(skill_gap.router, prefix="/api/v1/skill-gap", tags=["Skill Gap Analytics"])
    app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Analytics"])
    app.include_router(surveys.router, prefix="/api/v1/surveys", tags=["Surveys"])
    app.include_router(webhooks.router, prefix="/api/v1/webhooks/twilio", tags=["Twilio Webhooks"])
    app.include_router(matches.router, prefix="/api/v1/matches", tags=["Match Scoring"])
    app.include_router(ml.router, prefix="/api/v1/ml", tags=["ML Placement"])
    app.include_router(
        applications.router, prefix="/api/v1/applications", tags=["Hiring Pipeline"]
    )
    app.include_router(reports.router, prefix="/api/v1/reports", tags=["Reports & Exports"])
    app.include_router(
        notifications.router, prefix="/api/v1/notifications", tags=["Notifications"]
    )

    return app


app = create_app()
