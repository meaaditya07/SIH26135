from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.core.security import decode_access_token
from app.config import get_settings

settings = get_settings()

# ─── Type Aliases ───
DbSession = Annotated[AsyncSession, Depends(get_db)]


async def get_current_user(authorization: str = Header(...)) -> dict:
    """Extract and validate JWT from Authorization header."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format",
        )
    token = authorization.split(" ", 1)[1]
    try:
        payload = decode_access_token(token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    return payload


CurrentUser = Annotated[dict, Depends(get_current_user)]


def require_role(*allowed_roles: str):
    """Dependency factory that enforces role-based access."""
    async def role_checker(user: CurrentUser) -> dict:
        user_role = user.get("role", "")
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user_role}' is not authorized. Required: {', '.join(allowed_roles)}",
            )
        return user
    return role_checker


RequireAdmin = Annotated[dict, Depends(require_role("gov_admin"))]
RequirePartner = Annotated[dict, Depends(require_role("training_partner", "gov_admin"))]
RequireEmployer = Annotated[dict, Depends(require_role("employer", "gov_admin"))]
RequireCandidate = Annotated[dict, Depends(require_role("candidate"))]
