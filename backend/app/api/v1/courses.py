from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from uuid import UUID

from app.database import get_db
from app.dependencies import require_role
from app.models.course import Course
from app.core.exceptions import raise_not_found
from app.schemas import CourseCreate, CourseResponse, CourseUpdate

router = APIRouter()


@router.get("/", response_model=list[CourseResponse])
async def list_courses(
    sector: Optional[str] = Query(None),
    scheme_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin", "training_partner")),
):
    query = select(Course)
    if sector:
        query = query.where(Course.sector == sector)
    if scheme_id:
        query = query.where(Course.scheme_id == scheme_id)
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{course_id}", response_model=CourseResponse)
async def get_course(
    course_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin", "training_partner")),
):
    result = await db.execute(
        select(Course).where(Course.id == course_id)
    )
    course = result.scalar_one_or_none()
    if not course:
        raise_not_found("Course", str(course_id))
    return course


@router.post("/", response_model=CourseResponse, status_code=201)
async def create_course(
    body: CourseCreate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin", "training_partner")),
):
    course = Course(**body.model_dump())
    db.add(course)
    await db.flush()
    await db.refresh(course)
    return course


@router.patch("/{course_id}", response_model=CourseResponse)
async def update_course(
    course_id: UUID,
    body: CourseUpdate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin", "training_partner")),
):
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise_not_found("Course", str(course_id))

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(course, field, value)

    await db.flush()
    await db.refresh(course)
    return course


@router.delete("/{course_id}")
async def delete_course(
    course_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin")),
):
    from fastapi import HTTPException
    from app.models.enrollment import Enrollment
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise_not_found("Course", str(course_id))

    dep = await db.execute(
        select(Enrollment.id).where(Enrollment.course_id == course_id).limit(1)
    )
    if dep.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="Course has associated enrollments and cannot be deleted",
        )
    await db.delete(course)
    await db.flush()
    return {"status": "deleted", "course_id": str(course_id)}
