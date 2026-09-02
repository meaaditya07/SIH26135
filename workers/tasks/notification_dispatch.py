from celery import shared_task
from sqlalchemy import select


@shared_task(name="workers.tasks.notification_dispatch.send_notification", bind=True, max_retries=3)
def send_notification(self, channel: str, phone: str, message: str, template_sid: str = None):
    """Dispatch a one-off notification via WhatsApp or SMS."""
    import asyncio

    async def _send():
        if channel == "whatsapp":
            from app.integrations.twilio_whatsapp import send_whatsapp_message
            return await send_whatsapp_message(
                to_phone=phone,
                template_sid=template_sid or "HX_placeholder",
                variables={"1": message},
            )
        elif channel == "sms":
            from app.integrations.sms_gateway import send_sms_msg91
            return await send_sms_msg91(phone, message)
        return None

    return asyncio.run(_send())


@shared_task(
    name="workers.tasks.notification_dispatch.deliver_notification",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    acks_late=False,
)
def deliver_notification(self, notification_id: str):
    """Deliver a persisted Notification row, updating its delivery state.

    Reads `notifications` by id, sends via the configured channel, and records
    sent/failed + provider message id. Idempotent with respect to already-sent
    rows.
    """
    import asyncio
    asyncio.run(_deliver(notification_id))


async def _deliver(notification_id: str):
    from app.database import async_session_factory
    from app.models.notification import Notification
    from app.services.notification_service import dispatch_via_service

    from datetime import datetime

    async with async_session_factory() as db:
        result = await db.execute(
            select(Notification).where(Notification.id == notification_id)
        )
        notif = result.scalar_one_or_none()
        if not notif:
            return "not_found"
        if notif.status == "sent":
            return "already_sent"

        notif.attempts = (notif.attempts or 0) + 1
        body = notif.body
        msg_id = dispatch_via_service(
            channel=notif.channel.value if hasattr(notif.channel, "value") else notif.channel,
            phone=notif.phone or "",
            body=body,
            variables={},
            template_sid=None,
        )
        if msg_id:
            notif.status = "sent"
            notif.provider_message_id = msg_id
            notif.sent_at = datetime.utcnow()
            notif.error = None
        else:
            notif.status = "failed"
            notif.error = "dispatch failed (provider returned no id)"
        await db.commit()
        return notif.status
