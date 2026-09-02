"""Sprint 9 — Notifications API.

Endpoints to queue, list, and manage outbound notifications (WhatsApp/SMS)
and message templates. Static paths (`/send`, `/mine`, `/templates`,
`/stats`) are declared BEFORE the parameterized `/{notification_id}/read`.
"""
from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_role
from app.models.user import User
from app.models.candidate import Candidate
from app.models.notification import Notification, NotificationTemplate
from app.services.notification_service import render_template

router = APIRouter()

_VALID_RECIPIENT_TYPES = ("candidate", "employer", "training_partner", "system")
_VALID_CHANNELS = ("whatsapp", "sms")


class SendNotification(BaseModel):
    recipient_type: str = Field(..., pattern="^(candidate|employer|training_partner|system)$")
    recipient_id: Optional[UUID] = None
    phone: Optional[str] = Field(None, max_length=20)
    channel: str = Field(default="whatsapp", pattern="^(whatsapp|sms)$")
    kind: str = "system"
    title: Optional[str] = None
    template_name: Optional[str] = None
    body: Optional[str] = None
    variables: dict[str, str] = {}


class TemplateCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    channel: str = Field(default="whatsapp", pattern="^(whatsapp|sms)$")
    kind: Optional[str] = None
    body: str = Field(..., min_length=2)
    variables: list = []
    template_sid: Optional[str] = None


async def _current_user(db: AsyncSession, user: dict) -> User:
    result = await db.execute(select(User).where(User.id == UUID(str(user["sub"]))))
    u = result.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="Linked account not found")
    return u


@router.post("/send")
async def send_notification(
    body: SendNotification,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("employer", "training_partner", "gov_admin")),
):
    """Queue a notification. Renders a named template if provided, else uses body."""
    text = body.body or ""
    template_id = None

    if body.template_name:
        result = await db.execute(
            select(NotificationTemplate).where(
                NotificationTemplate.name == body.template_name,
                NotificationTemplate.is_active == True,
            )
        )
        template = result.scalar_one_or_none()
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        text = render_template(template.body, body.variables)
        template_id = template.id

    if not text:
        raise HTTPException(status_code=400, detail="Either template_name or body is required")

    # Resolve recipient phone automatically for candidate recipient_type.
    phone = body.phone
    if body.recipient_type == "candidate" and body.recipient_id and not phone:
        row = (
            await db.execute(select(Candidate.phone).where(Candidate.id == body.recipient_id))
        ).scalar_one_or_none()
        phone = row

    notif = Notification(
        recipient_id=body.recipient_id,
        recipient_type=body.recipient_type,
        phone=phone,
        channel=body.channel,
        kind=body.kind,
        title=body.title,
        body=text,
        template_id=template_id,
        status="queued",
    )
    db.add(notif)
    await db.flush()
    await db.refresh(notif)

    # Enqueue delivery on the worker (fire-and-forget; swallows broker absence).
    try:
        from worker_queue import enqueue_delivery
        enqueue_delivery(str(notif.id))
    except Exception:
        pass

    return {
        "id": str(notif.id),
        "status": notif.status,
        "channel": body.channel,
        "body": text,
    }


@router.get("/mine")
async def my_notifications(
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("candidate")),
):
    u = await _current_user(db, user)
    if not u.candidate_id:
        raise HTTPException(status_code=403, detail="No candidate profile linked to account")
    query = select(Notification).where(Notification.recipient_id == u.candidate_id)
    if status:
        query = query.where(Notification.status == status)
    query = query.order_by(Notification.created_at.desc()).limit(50)
    rows = (await db.execute(query)).scalars().all()
    return [_notif_dict(n) for n in rows]


@router.get("/templates")
async def list_templates(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("employer", "training_partner", "gov_admin")),
):
    result = await db.execute(
        select(NotificationTemplate).where(NotificationTemplate.is_active == True)
        .order_by(NotificationTemplate.name)
    )
    return [{"id": str(t.id), "name": t.name, "channel": t.channel,
             "kind": t.kind, "body": t.body} for t in result.scalars().all()]


@router.post("/templates")
async def create_template(
    body: TemplateCreate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin")),
):
    tick = (
        await db.execute(
            select(NotificationTemplate).where(NotificationTemplate.name == body.name)
        )
    ).scalar_one_or_none()
    if tick:
        raise HTTPException(status_code=409, detail="Template with this name already exists")

    template = NotificationTemplate(
        name=body.name,
        channel=body.channel,
        kind=body.kind,
        body=body.body,
        variables=body.variables,
        template_sid=body.template_sid,
    )
    db.add(template)
    await db.flush()
    await db.refresh(template)
    return {"id": str(template.id), "name": template.name}


@router.get("/stats")
async def notification_stats(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("gov_admin")),
):
    rows = (await db.execute(select(func.count(Notification.id), Notification.status)
            .group_by(Notification.status))).all()
    by_status = {s: c for c, s in rows}
    total = sum(by_status.values())
    return {
        "total": total,
        "by_status": {
            "queued": by_status.get("queued", 0),
            "sent": by_status.get("sent", 0),
            "failed": by_status.get("failed", 0),
        },
        "delivery_rate": round(by_status.get("sent", 0) / max(total, 1) * 100, 2),
    }


@router.patch("/{notification_id}/read")
async def mark_read(
    notification_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("candidate")),
):
    u = await _current_user(db, user)
    n = (
        await db.execute(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.recipient_id == u.candidate_id,
            )
        )
    ).scalar_one_or_none()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.read_at = datetime.utcnow()
    await db.flush()
    return {"id": str(n.id), "read_at": n.read_at.isoformat()}


def _notif_dict(n: Notification) -> dict:
    return {
        "id": str(n.id),
        "kind": n.kind,
        "title": n.title,
        "body": n.body,
        "channel": n.channel.value if hasattr(n.channel, "value") else n.channel,
        "status": n.status.value if hasattr(n.status, "value") else n.status,
        "created_at": n.created_at.isoformat() if n.created_at else None,
        "read_at": n.read_at.isoformat() if n.read_at else None,
    }
