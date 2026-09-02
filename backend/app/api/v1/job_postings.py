from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID

from app.database import get_db
from app.dependencies import require_role
from app.models.job_posting import JobPosting
from app.core.exceptions import raise_not_found

router = APIRouter()


class JobPostingCreate(BaseModel):
    employer_id: UUID | None = None
    title: str = Field(..., min_length=5, max_length=500)
    description_raw: str | None = None
    required_skills: list[str] = []
    preferred_skills: list[str] = []
    location: str | None = None
    state: str | None = None
    district: str | None = None
    salary_min: float | None = None
    salary_max: float | None = None
    experience_min_months: int | None = None


class JobPostingResponse(BaseModel):
    id: UUID
    title: str
    required_skills: list
    preferred_skills: list
    state: Optional[str]
    district: Optional[str]
    salary_min: Optional[float]
    salary_max: Optional[float]
    is_active: bool
    created_at: object

    model_config = {"from_attributes": True}


@router.get("/", response_model=list[JobPostingResponse])
async def list_job_postings(
    state: Optional[str] = Query(None),
    sector: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(True),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin", "employer")),
):
    query = select(JobPosting)
    if state:
        query = query.where(JobPosting.state == state)
    if is_active is not None:
        query = query.where(JobPosting.is_active == is_active)
    query = query.order_by(JobPosting.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{posting_id}", response_model=JobPostingResponse)
async def get_job_posting(
    posting_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin", "employer")),
):
    result = await db.execute(
        select(JobPosting).where(JobPosting.id == posting_id)
    )
    posting = result.scalar_one_or_none()
    if not posting:
        raise_not_found("Job Posting", str(posting_id))
    return posting


@router.post("/", response_model=JobPostingResponse, status_code=201)
async def create_job_posting(
    body: JobPostingCreate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin", "employer")),
):
    posting = JobPosting(**body.model_dump())
    posting.source_portal = "manual"
    db.add(posting)
    await db.flush()
    await db.refresh(posting)
    return posting


@router.patch("/{posting_id}", response_model=JobPostingResponse)
async def update_job_posting(
    posting_id: UUID,
    body: JobPostingCreate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin", "employer")),
):
    result = await db.execute(
        select(JobPosting).where(JobPosting.id == posting_id)
    )
    posting = result.scalar_one_or_none()
    if not posting:
        raise_not_found("Job Posting", str(posting_id))

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(posting, field, value)
    await db.flush()
    await db.refresh(posting)
    return posting


@router.delete("/{posting_id}")
async def deactivate_job_posting(
    posting_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin", "employer")),
):
    result = await db.execute(
        select(JobPosting).where(JobPosting.id == posting_id)
    )
    posting = result.scalar_one_or_none()
    if not posting:
        raise_not_found("Job Posting", str(posting_id))
    posting.is_active = False
    await db.flush()
    return {"status": "deactivated", "posting_id": str(posting_id)}
