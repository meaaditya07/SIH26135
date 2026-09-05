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


class EnrollmentUpdate(BaseModel):
    candidate_id: Optional[UUID] = None
    course_id: Optional[UUID] = None
    training_partner_id: Optional[UUID] = None
    enrollment_date: Optional[date] = None
    completion_date: Optional[date] = None
    is_completed: Optional[bool] = None
    certificate_id: Optional[str] = None


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


@router.get("/enriched", response_model=list[dict])
async def list_enrollments_enriched(
    training_partner_id: Optional[UUID] = Query(None),
    course_id: Optional[UUID] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin", "training_partner")),
):
    """Enriched enrollment rows with candidate name, course name, and latest outcome."""
    from app.models.employment_outcome import EmploymentOutcome

    query = select(
        Enrollment, Candidate, Course
    ).join(
        Candidate, Candidate.id == Enrollment.candidate_id
    ).join(
        Course, Course.id == Enrollment.course_id
    )

    if training_partner_id:
        query = query.where(Enrollment.training_partner_id == training_partner_id)
    if course_id:
        query = query.where(Enrollment.course_id == course_id)

    query = query.order_by(Enrollment.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    rows = result.all()

    enrolled = [e for (e, _, _) in rows]

    latest_outcomes: dict[UUID, object] = {}
    if enrolled:
        oc = await db.execute(
            select(EmploymentOutcome)
            .where(
                EmploymentOutcome.enrollment_id.in_([e.id for e in enrolled])
            )
            .order_by(EmploymentOutcome.survey_date.desc())
        )
        for o in oc.scalars().all():
            if o.enrollment_id not in latest_outcomes:
                latest_outcomes[o.enrollment_id] = o

    enriched = []
    for e, cand, course in rows:
        outcome = latest_outcomes.get(e.id)
        enriched.append({
            "id": str(e.id),
            "candidate_id": str(e.candidate_id),
            "candidate_name": cand.full_name,
            "candidate_phone": cand.phone,
            "course_id": str(e.course_id),
            "course_name": course.name,
            "training_partner_id": str(e.training_partner_id),
            "enrollment_date": str(e.enrollment_date),
            "completion_date": str(e.completion_date) if e.completion_date else None,
            "is_completed": e.is_completed,
            "certificate_id": e.certificate_id,
            "is_employed": outcome.is_employed if outcome else None,
            "is_self_employed": getattr(outcome, "is_self_employed", False),
            "current_job_title": outcome.current_job_title if outcome else None,
            "monthly_salary": float(outcome.monthly_salary) if outcome and outcome.monthly_salary else None,
            "survey_interval": outcome.survey_interval if outcome else None,
            "job_location": outcome.job_location if outcome else None,
        })
    return enriched


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


@router.patch("/{enrollment_id}", response_model=EnrollmentResponse)
async def update_enrollment(
    enrollment_id: UUID,
    body: EnrollmentUpdate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin", "training_partner")),
):
    result = await db.execute(
        select(Enrollment).where(Enrollment.id == enrollment_id)
    )
    enrollment = result.scalar_one_or_none()
    if not enrollment:
        raise_not_found("Enrollment", str(enrollment_id))

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(enrollment, field, value)

    await db.flush()
    await db.refresh(enrollment)
    return enrollment


@router.delete("/{enrollment_id}")
async def delete_enrollment(
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
    await db.delete(enrollment)
    await db.flush()
    return {"status": "deleted", "enrollment_id": str(enrollment_id)}


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
