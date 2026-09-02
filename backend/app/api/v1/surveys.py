from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import date

from app.database import get_db
from app.dependencies import require_role
from app.models.survey_schedule import SurveySchedule
from app.models.survey_template import SurveyTemplate
from app.models.survey_response import SurveyResponse
from app.services.survey_service import materialize_outcome

router = APIRouter()


# ─── Template Schemas ───

class TemplateCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    channel: str = Field(..., pattern="^(whatsapp|sms|web_portal)$")
    template_sid: str | None = None
    body: str = Field(..., min_length=1)
    variables: list = []
    allowed_replies: list = []
    interval: str | None = Field(None, pattern="^(3_month|6_month|12_month)$")
    version: int = 1
    is_active: bool = True


class TemplateResponse(BaseModel):
    id: UUID
    name: str
    channel: str
    template_sid: str | None
    body: str
    variables: list
    allowed_replies: list
    interval: str | None
    version: int
    is_active: bool

    model_config = {"from_attributes": True}


class ScheduleResponse(BaseModel):
    id: UUID
    candidate_id: UUID
    enrollment_id: UUID
    scheduled_interval: str
    scheduled_date: date
    channel: str
    status: str
    attempts: int
    last_attempt_at: object | None
    response_received_at: object | None

    model_config = {"from_attributes": True}


class WebPortalRespondRequest(BaseModel):
    schedule_id: UUID | None = None
    is_employed: bool
    current_job_title: str | None = None
    monthly_salary: float | None = None
    job_location: str | None = None
    is_job_relevant_to_training: bool | None = None
    skills_used: list[str] = []


# ─── Template Endpoints ───

@router.get("/templates", response_model=list[TemplateResponse])
async def list_templates(
    channel: Optional[str] = Query(None),
    interval: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin", "training_partner")),
):
    query = select(SurveyTemplate)
    if channel:
        query = query.where(SurveyTemplate.channel == channel)
    if interval:
        query = query.where(SurveyTemplate.interval == interval)
    result = await db.execute(query.order_by(SurveyTemplate.name))
    return result.scalars().all()


@router.post("/templates", response_model=TemplateResponse, status_code=201)
async def create_template(
    body: TemplateCreate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin")),
):
    template = SurveyTemplate(**body.model_dump())
    db.add(template)
    await db.flush()
    await db.refresh(template)
    return template


@router.patch("/templates/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: UUID,
    body: TemplateCreate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin")),
):
    result = await db.execute(select(SurveyTemplate).where(SurveyTemplate.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    for key, value in body.model_dump().items():
        setattr(template, key, value)
    template.version += 1
    await db.flush()
    await db.refresh(template)
    return template


@router.get("/templates/{template_id}/preview")
async def preview_template(
    template_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin", "training_partner")),
):
    result = await db.execute(select(SurveyTemplate).where(SurveyTemplate.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"body": template.body, "variables": template.variables}


# ─── Schedule Endpoints ───

@router.get("/schedules", response_model=list[ScheduleResponse])
async def list_schedules(
    candidate_id: Optional[UUID] = Query(None),
    enrollment_id: Optional[UUID] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin", "training_partner")),
):
    query = select(SurveySchedule)
    if candidate_id:
        query = query.where(SurveySchedule.candidate_id == candidate_id)
    if enrollment_id:
        query = query.where(SurveySchedule.enrollment_id == enrollment_id)
    if status:
        query = query.where(SurveySchedule.status == status)
    query = query.order_by(SurveySchedule.scheduled_date.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


# ─── Web Portal Response (self-reporting) ───

@router.post("/respond")
async def web_portal_response(
    body: WebPortalRespondRequest,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("candidate", "gov_admin", "training_partner")),
):
    return await _submit_response(db, body)


async def _submit_response(db: AsyncSession, body: WebPortalRespondRequest) -> dict:
    result = await db.execute(
        select(SurveySchedule).where(SurveySchedule.id == body.schedule_id)
    )
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Survey schedule not found")
    if schedule.status == "responded":
        raise HTTPException(status_code=409, detail="Survey already responded")

    parsed = {
        "is_employed": body.is_employed,
        "current_job_title": body.current_job_title,
        "monthly_salary": body.monthly_salary,
        "job_location": body.job_location,
        "is_job_relevant_to_training": body.is_job_relevant_to_training,
        "skills_used": body.skills_used,
    }
    response = await materialize_outcome(
        db, schedule, parsed, "web_portal",
        raw_text="Web portal self-report",
        from_phone=None,
    )
    await db.flush()
    return {
        "status": "recorded",
        "schedule_id": str(schedule.id),
        "outcome_id": str(response.outcome_id) if response.outcome_id else None,
    }


# Public self-report portal — the schedule UUID in the link acts as the credential.
@router.post("/portal/{schedule_id}/respond")
async def public_portal_response(
    schedule_id: UUID,
    body: WebPortalRespondRequest,
    db: AsyncSession = Depends(get_db),
):
    body.schedule_id = schedule_id
    return await _submit_response(db, body)


@router.get("/portal/{schedule_id}")
async def public_portal_info(
    schedule_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(SurveySchedule).where(SurveySchedule.id == schedule_id))
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Survey schedule not found")
    return {
        "schedule_id": str(schedule.id),
        "scheduled_interval": schedule.scheduled_interval,
        "status": schedule.status,
        "candidate_name": schedule.candidate.full_name if schedule.candidate else None,
    }


# ─── Responses Endpoints ───

@router.get("/responses")
async def list_responses(
    schedule_id: Optional[UUID] = Query(None),
    candidate_id: Optional[UUID] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin", "training_partner")),
):
    query = select(SurveyResponse)
    if schedule_id:
        query = query.where(SurveyResponse.survey_schedule_id == schedule_id)
    if candidate_id:
        query = query.where(SurveyResponse.candidate_id == candidate_id)
    query = query.order_by(SurveyResponse.received_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)

    rows = []
    for r in result.scalars().all():
        rows.append({
            "id": str(r.id),
            "schedule_id": str(r.survey_schedule_id),
            "candidate_id": str(r.candidate_id),
            "channel": r.channel,
            "raw_text": r.raw_text,
            "parsed": r.parsed,
            "outcome_id": str(r.outcome_id) if r.outcome_id else None,
            "received_at": r.received_at.isoformat() if r.received_at else None,
        })
    return rows


# ─── Health/Attempts ───

@router.post("/schedules/{schedule_id}/retry")
async def retry_schedule(
    schedule_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin")),
):
    from app.services.survey_service import dispatch_one
    result = await db.execute(select(SurveySchedule).where(SurveySchedule.id == schedule_id))
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Survey schedule not found")
    if schedule.status in ("responded", "expired"):
        raise HTTPException(status_code=409, detail=f"Cannot retry status '{schedule.status}'")
    status = await dispatch_one(db, schedule, force_channel="whatsapp")
    return {"schedule_id": str(schedule_id), "status": status}
