import httpx
from typing import Optional

from app.config import get_settings

settings = get_settings()


async def send_sms_msg91(phone: str, message: str, sender_id: str = "STTRACE") -> Optional[str]:
    """Send SMS via MSG91 (India-optimized gateway)."""
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                "https://api.msg91.com/api/v5/flow",
                json={
                    "flow_id": "your_flow_id",  # Configure in MSG91 dashboard
                    "sender": sender_id,
                    "mobiles": f"91{phone}",
                    "VAR1": message,
                },
                headers={
                    "authkey": settings.MSG91_AUTH_KEY,
                    "Content-Type": "application/json",
                },
                timeout=15.0,
            )
            if resp.status_code == 200:
                return resp.json().get("request_id")
            return None
        except Exception:
            return None
