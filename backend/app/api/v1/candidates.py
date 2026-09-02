from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from uuid import UUID

from app.database import get_db
from app.dependencies import require_role
from app.models.candidate import Candidate
from app.core.security import hash_aadhaar
from app.core.exceptions import raise_not_found
from app.schemas import CandidateCreate, CandidateResponse, CandidateUpdate

router = APIRouter()


@router.get("/", response_model=list[CandidateResponse])
async def list_candidates(
    state: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin", "training_partner")),
):
    query = select(Candidate).where(Candidate.is_active == True)
    if state:
        query = query.where(Candidate.state == state)
    if district:
        query = query.where(Candidate.district == district)
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/me", response_model=CandidateResponse)
async def get_my_profile(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("candidate")),
):
    result = await db.execute(
        select(Candidate).where(Candidate.id == UUID(user["sub"]))
    )
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise_not_found("Candidate", user["sub"])
    return candidate


@router.get("/stats/summary")
async def candidate_stats(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin")),
):
    total = await db.execute(select(func.count(Candidate.id)).where(Candidate.is_active == True))
    verified = await db.execute(
        select(func.count(Candidate.id)).where(Candidate.digilocker_status == "verified")
    )
    return {
        "total_candidates": total.scalar() or 0,
        "verified_candidates": verified.scalar() or 0,
    }


@router.get("/{candidate_id}", response_model=CandidateResponse)
async def get_candidate(
    candidate_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin", "training_partner")),
):
    result = await db.execute(
        select(Candidate).where(Candidate.id == candidate_id)
    )
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise_not_found("Candidate", str(candidate_id))
    return candidate


@router.post("/", response_model=CandidateResponse, status_code=201)
async def create_candidate(
    body: CandidateCreate,
    db: AsyncSession = Depends(get_db),
):
    aadhaar_hash = hash_aadhaar(body.aadhaar_number)

    # Check duplicate
    existing = await db.execute(
        select(Candidate).where(Candidate.aadhaar_hash == aadhaar_hash)
    )
    if existing.scalar_one_or_none():
        from fastapi import HTTPException
        raise HTTPException(status_code=409, detail="Candidate with this Aadhaar already exists")

    candidate = Candidate(
        phone=body.phone,
        email=body.email,
        full_name=body.full_name,
        aadhaar_hash=aadhaar_hash,
        date_of_birth=body.date_of_birth,
        gender=body.gender,
        state=body.state,
        district=body.district,
        pincode=body.pincode,
    )
    db.add(candidate)
    await db.flush()
    await db.refresh(candidate)
    return candidate


@router.patch("/{candidate_id}", response_model=CandidateResponse)
async def update_candidate(
    candidate_id: UUID,
    body: CandidateUpdate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("candidate")),
):
    result = await db.execute(
        select(Candidate).where(Candidate.id == candidate_id)
    )
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise_not_found("Candidate", str(candidate_id))

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(candidate, field, value)

    await db.flush()
    await db.refresh(candidate)
    return candidate
