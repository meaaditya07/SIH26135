"""Twilio webhook receivers for WhatsApp/SMS survey replies.

Note: These endpoints are intentionally unauthenticated (Twilio signs requests via
X-Twilio-Signature). We still enforce the header when TWILIO_WEBHOOK_SECRET is set.
"""
import hashlib
import hmac

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models.survey_schedule import SurveySchedule
from app.services.survey_service import parse_reply, materialize_outcome

router = APIRouter()
settings = get_settings()


def _verify_twilio_signature(request: Request, payload: bytes) -> bool:
    secret = settings.TWILIO_WEBHOOK_SECRET
    if not secret:
        return True  # signature verification disabled for local/dev
    signature = request.headers.get("X-Twilio-Signature", "")
    expected = hmac.new(
        secret.encode(), request.url.path.encode() + payload, hashlib.sha1
    ).hexdigest()
    return hmac.compare_digest(signature, expected)


async def _handle_inbound(
    request: Request,
    db: AsyncSession,
    body: bytes,
    channel: str,
    from_field: str | None,
    body_field: str,
    message_sid_field: str | None,
):
    if not _verify_twilio_signature(request, body):
        raise HTTPException(status_code=403, detail="Invalid Twilio signature")

    form = await request.form()
    from_phone = (from_field and form.get(from_field)) or None
    text = (form.get(body_field) or "").strip()
    provider_id = (message_sid_field and form.get(message_sid_field)) or None

    if not from_phone or not text:
        return {"status": "ignored", "reason": "missing_phone_or_body"}

    # Find the most recent open survey for this phone.
    result = await db.execute(
        select(SurveySchedule).where(
            SurveySchedule.status.in_(["sent", "scheduled"]),
        ).order_by(SurveySchedule.created_at.desc()).limit(50)
    )
    candidates = result.scalars().all()

    schedule = None
    for s in candidates:
        if s.candidate and (s.candidate.phone == from_phone or s.candidate.phone.endswith(from_phone)):
            schedule = s
            break

    if not schedule:
        return {"status": "ignored", "reason": "no_open_survey"}
    if schedule.status == "responded":
        return {"status": "ignored", "reason": "already_responded"}

    parsed = parse_reply(text)
    if not parsed.get("is_employed") is not None and "salary" not in text.lower():
        # Weak signal: skip outcome materialization but record the reply.
        parsed["is_employed"] = parsed.get("is_employed") is not None or "employed" in text.lower()

    response = await materialize_outcome(
        db, schedule, parsed, channel, text,
        provider_message_id=provider_id,
        from_phone=from_phone,
    )
    await db.flush()
    return {
        "status": "processed",
        "attempted": schedule.scheduled_interval,
        "outcome_created": response.outcome_id is not None,
    }


@router.post("/whatsapp")
async def twilio_whatsapp_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    body = await request.body()
    return await _handle_inbound(
        request, db, body, "whatsapp",
        from_field="From", body_field="Body", message_sid_field="MessageSid",
    )


@router.post("/sms")
async def twilio_sms_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    body = await request.body()
    return await _handle_inbound(
        request, db, body, "sms",
        from_field="From", body_field="Body", message_sid_field="MessageSid",
    )
