from celery import shared_task


@shared_task(name="workers.tasks.notification_dispatch.send_notification", bind=True, max_retries=3)
def send_notification(self, channel: str, phone: str, message: str, template_sid: str = None):
    """Dispatch notification via WhatsApp or SMS."""
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
