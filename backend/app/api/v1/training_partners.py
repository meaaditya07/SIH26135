from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from uuid import UUID

from app.database import get_db
from app.dependencies import require_role
from app.models.training_partner import TrainingPartner
from app.core.exceptions import raise_not_found
from app.schemas import TrainingPartnerCreate, TrainingPartnerResponse

router = APIRouter()


@router.get("/", response_model=list[TrainingPartnerResponse])
async def list_training_partners(
    state: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin")),
):
    query = select(TrainingPartner)
    if state:
        query = query.where(TrainingPartner.state == state)
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{partner_id}", response_model=TrainingPartnerResponse)
async def get_training_partner(
    partner_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin", "training_partner")),
):
    result = await db.execute(
        select(TrainingPartner).where(TrainingPartner.id == partner_id)
    )
    tp = result.scalar_one_or_none()
    if not tp:
        raise_not_found("Training Partner", str(partner_id))
    return tp


@router.post("/", response_model=TrainingPartnerResponse, status_code=201)
async def create_training_partner(
    body: TrainingPartnerCreate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin")),
):
    tp = TrainingPartner(**body.model_dump())
    db.add(tp)
    await db.flush()
    await db.refresh(tp)
    return tp


@router.patch("/{partner_id}/approve")
async def approve_training_partner(
    partner_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin")),
):
    from datetime import datetime
    result = await db.execute(
        select(TrainingPartner).where(TrainingPartner.id == partner_id)
    )
    tp = result.scalar_one_or_none()
    if not tp:
        raise_not_found("Training Partner", str(partner_id))
    tp.is_approved = True
    tp.approved_at = datetime.utcnow()
    await db.flush()
    return {"status": "approved", "partner_id": str(partner_id)}
