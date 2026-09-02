import httpx
from typing import Optional

from app.config import get_settings

settings = get_settings()


async def exchange_code_for_token(code: str) -> Optional[dict]:
    """Exchange DigiLocker authorization code for access token."""
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                f"{settings.DIGILOCKER_BASE_URL}/token",
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "client_id": settings.DIGILOCKER_CLIENT_ID,
                    "client_secret": settings.DIGILOCKER_CLIENT_SECRET,
                    "redirect_uri": settings.DIGILOCKER_REDIRECT_URI,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=30.0,
            )
            if resp.status_code == 200:
                return resp.json()
            return None
        except Exception:
            return None


async def fetch_profile(access_token: str) -> Optional[dict]:
    """Fetch user profile and documents from DigiLocker."""
    async with httpx.AsyncClient() as client:
        try:
            # Fetch Aadhaar eKYC XML
            profile_resp = await client.get(
                f"{settings.DIGILOCKER_BASE_URL}/xml/eaadhaar",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=30.0,
            )

            # Fetch documents list
            docs_resp = await client.get(
                f"{settings.DIGILOCKER_BASE_URL}/docs",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=30.0,
            )

            profile = {}
            if profile_resp.status_code == 200:
                profile = profile_resp.json().get("eKYC", {})

            documents = {}
            if docs_resp.status_code == 200:
                for doc in docs_resp.json().get("documents", []):
                    doc_type = doc.get("type", "unknown")
                    documents[doc_type] = {
                        "uri": doc.get("uri"),
                        "name": doc.get("name"),
                        "verified_at": doc.get("issue_date"),
                    }

            return {
                "name": profile.get("name", ""),
                "phone": profile.get("phone", ""),
                "aadhaar_number": profile.get("uid", ""),
                "dob": profile.get("dob"),
                "gender": profile.get("gender"),
                "address": profile.get("address", {}),
                "documents": documents,
            }
        except Exception:
            return None


async def fetch_document(access_token: str, document_uri: str) -> Optional[bytes]:
    """Download a specific document from DigiLocker."""
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                f"{settings.DIGILOCKER_BASE_URL}/xml/{document_uri}",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=60.0,
            )
            if resp.status_code == 200:
                return resp.content
            return None
        except Exception:
            return None
