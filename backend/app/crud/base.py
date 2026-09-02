from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import TypeVar, Generic, Type, Optional
from uuid import UUID

T = TypeVar("T")


class BaseCRUD(Generic[T]):
    def __init__(self, model: Type[T]):
        self.model = model

    async def get_by_id(self, db: AsyncSession, id: UUID) -> Optional[T]:
        result = await db.execute(select(self.model).where(self.model.id == id))
        return result.scalar_one_or_none()

    async def get_multi(
        self, db: AsyncSession, *, skip: int = 0, limit: int = 50, **filters
    ) -> list[T]:
        query = select(self.model)
        for field, value in filters.items():
            if value is not None and hasattr(self.model, field):
                query = query.where(getattr(self.model, field) == value)
        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        return list(result.scalars().all())

    async def create(self, db: AsyncSession, **kwargs) -> T:
        obj = self.model(**kwargs)
        db.add(obj)
        await db.flush()
        await db.refresh(obj)
        return obj

    async def update(self, db: AsyncSession, id: UUID, **kwargs) -> Optional[T]:
        obj = await self.get_by_id(db, id)
        if not obj:
            return None
        for field, value in kwargs.items():
            if value is not None and hasattr(obj, field):
                setattr(obj, field, value)
        await db.flush()
        await db.refresh(obj)
        return obj

    async def soft_delete(self, db: AsyncSession, id: UUID) -> bool:
        obj = await self.get_by_id(db, id)
        if not obj:
            return False
        if hasattr(obj, "is_active"):
            obj.is_active = False
            await db.flush()
            return True
        return False
