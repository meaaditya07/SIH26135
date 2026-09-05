from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from uuid import UUID

from app.database import get_db
from app.dependencies import require_role
from app.models.employer import Employer
from app.core.exceptions import raise_not_found
from app.schemas import EmployerCreate, EmployerResponse, EmployerUpdate

router = APIRouter()


@router.get("/", response_model=list[EmployerResponse])
async def list_employers(
    industry: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin")),
):
    query = select(Employer)
    if industry:
        query = query.where(Employer.industry == industry)
    if state:
        query = query.where(Employer.state == state)
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{employer_id}", response_model=EmployerResponse)
async def get_employer(
    employer_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin", "employer")),
):
    result = await db.execute(
        select(Employer).where(Employer.id == employer_id)
    )
    emp = result.scalar_one_or_none()
    if not emp:
        raise_not_found("Employer", str(employer_id))
    return emp


@router.post("/", response_model=EmployerResponse, status_code=201)
async def create_employer(
    body: EmployerCreate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin", "employer")),
):
    emp = Employer(**body.model_dump())
    db.add(emp)
    await db.flush()
    await db.refresh(emp)
    return emp


@router.patch("/{employer_id}", response_model=EmployerResponse)
async def update_employer(
    employer_id: UUID,
    body: EmployerUpdate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin", "employer")),
):
    result = await db.execute(select(Employer).where(Employer.id == employer_id))
    emp = result.scalar_one_or_none()
    if not emp:
        raise_not_found("Employer", str(employer_id))

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(emp, field, value)

    await db.flush()
    await db.refresh(emp)
    return emp


@router.delete("/{employer_id}")
async def delete_employer(
    employer_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin")),
):
    from fastapi import HTTPException
    from app.models.job_posting import JobPosting
    result = await db.execute(select(Employer).where(Employer.id == employer_id))
    emp = result.scalar_one_or_none()
    if not emp:
        raise_not_found("Employer", str(employer_id))

    dep = await db.execute(
        select(JobPosting.id).where(JobPosting.employer_id == employer_id).limit(1)
    )
    if dep.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="Employer has associated job postings and cannot be deleted",
        )
    await db.delete(emp)
    await db.flush()
    return {"status": "deleted", "employer_id": str(employer_id)}
