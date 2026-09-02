from twilio.rest import Client
from typing import Optional

from app.config import get_settings

settings = get_settings()


def get_twilio_client() -> Client:
    return Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)


async def send_whatsapp_message(
    to_phone: str,
    template_sid: str,
    variables: dict[str, str],
) -> Optional[str]:
    """Send a WhatsApp message via Twilio using a pre-approved template."""
    try:
        client = get_twilio_client()
        msg = client.messages.create(
            from_=settings.TWILIO_WHATSAPP_NUMBER,
            to=f"whatsapp:{to_phone}",
            content_sid=template_sid,
            content_variables=str(variables).replace("'", '"'),
        )
        return msg.sid
    except Exception:
        return None


async def send_sms(phone: str, body: str) -> Optional[str]:
    """Send an SMS via Twilio."""
    try:
        client = get_twilio_client()
        msg = client.messages.create(
            body=body,
            from_=settings.TWILIO_SMS_NUMBER,
            to=phone,
        )
        return msg.sid
    except Exception:
        return None
