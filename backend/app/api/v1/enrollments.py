from fastapi import APIRouter, Depends, Query, UploadFile, File, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import date
import csv
import io

from app.database import get_db
from app.dependencies import require_role
from app.models.enrollment import Enrollment
from app.models.candidate import Candidate
from app.models.course import Course
from app.core.exceptions import raise_not_found

router = APIRouter()


class EnrollmentCreate(BaseModel):
    candidate_id: UUID
    course_id: UUID
    training_partner_id: UUID
    enrollment_date: date


class EnrollmentResponse(BaseModel):
    id: UUID
    candidate_id: UUID
    course_id: UUID
    training_partner_id: UUID
    enrollment_date: date
    completion_date: Optional[date]
    is_completed: bool
    certificate_id: Optional[str]

    model_config = {"from_attributes": True}


class BulkEnrollmentItem(BaseModel):
    candidate_phone: str
    course_id: UUID
    training_partner_id: UUID
    enrollment_date: date


@router.get("/", response_model=list[EnrollmentResponse])
async def list_enrollments(
    candidate_id: Optional[UUID] = Query(None),
    course_id: Optional[UUID] = Query(None),
    training_partner_id: Optional[UUID] = Query(None),
    is_completed: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin", "training_partner")),
):
    query = select(Enrollment)
    if candidate_id:
        query = query.where(Enrollment.candidate_id == candidate_id)
    if course_id:
        query = query.where(Enrollment.course_id == course_id)
    if training_partner_id:
        query = query.where(Enrollment.training_partner_id == training_partner_id)
    if is_completed is not None:
        query = query.where(Enrollment.is_completed == is_completed)
    query = query.order_by(Enrollment.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{enrollment_id}", response_model=EnrollmentResponse)
async def get_enrollment(
    enrollment_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin", "training_partner")),
):
    result = await db.execute(
        select(Enrollment).where(Enrollment.id == enrollment_id)
    )
    enrollment = result.scalar_one_or_none()
    if not enrollment:
        raise_not_found("Enrollment", str(enrollment_id))
    return enrollment


@router.post("/", response_model=EnrollmentResponse, status_code=201)
async def create_enrollment(
    body: EnrollmentCreate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin", "training_partner")),
):
    # Validate candidate exists
    cand = await db.execute(select(Candidate).where(Candidate.id == body.candidate_id))
    if not cand.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Candidate not found")

    # Validate course exists
    course = await db.execute(select(Course).where(Course.id == body.course_id))
    if not course.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Course not found")

    enrollment = Enrollment(**body.model_dump())
    db.add(enrollment)
    await db.flush()
    await db.refresh(enrollment)
    return enrollment


@router.patch("/{enrollment_id}/complete")
async def mark_enrollment_complete(
    enrollment_id: UUID,
    certificate_id: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin", "training_partner")),
):
    from datetime import datetime
    result = await db.execute(
        select(Enrollment).where(Enrollment.id == enrollment_id)
    )
    enrollment = result.scalar_one_or_none()
    if not enrollment:
        raise_not_found("Enrollment", str(enrollment_id))

    enrollment.is_completed = True
    enrollment.completion_date = datetime.utcnow().date()
    if certificate_id:
        enrollment.certificate_id = certificate_id
    await db.flush()
    return {"status": "completed", "enrollment_id": str(enrollment_id)}


@router.post("/bulk-import")
async def bulk_import_enrollments(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin")),
):
    """
    CSV import: columns = candidate_phone, course_id, training_partner_id, enrollment_date
    """
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    content = await file.read()
    decoded = content.decode("utf-8")
    reader = csv.DictReader(io.StringIO(decoded))

    results = {"imported": 0, "errors": []}

    for i, row in enumerate(reader, start=2):
        try:
            phone = row["candidate_phone"].strip()
            cand_result = await db.execute(
                select(Candidate).where(Candidate.phone == phone)
            )
            candidate = cand_result.scalar_one_or_none()
            if not candidate:
                results["errors"].append({"row": i, "error": f"Candidate {phone} not found"})
                continue

            enrollment = Enrollment(
                candidate_id=candidate.id,
                course_id=row["course_id"].strip(),
                training_partner_id=row["training_partner_id"].strip(),
                enrollment_date=row["enrollment_date"].strip(),
            )
            db.add(enrollment)
            results["imported"] += 1
        except Exception as e:
            results["errors"].append({"row": i, "error": str(e)})

    await db.flush()
    return results


@router.get("/stats/summary")
async def enrollment_stats(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin")),
):
    total = await db.execute(select(func.count(Enrollment.id)))
    completed = await db.execute(
        select(func.count(Enrollment.id)).where(Enrollment.is_completed == True)
    )
    return {
        "total_enrollments": total.scalar() or 0,
        "completed": completed.scalar() or 0,
        "completion_rate": round(
            (completed.scalar() or 0) / max(total.scalar() or 1, 1) * 100, 2
        ),
    }
