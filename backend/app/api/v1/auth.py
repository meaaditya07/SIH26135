from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import CurrentUser
from app.services.auth_service import (
    register_user,
    authenticate_by_password,
    create_otp,
    verify_otp,
    issue_token_for_user,
    get_user_by_phone,
)
from app.schemas import TokenResponse

router = APIRouter()


# ─── Request/Response Schemas ───

class RegisterRequest(BaseModel):
    phone: str = Field(..., min_length=10, max_length=15)
    full_name: str = Field(..., min_length=2, max_length=255)
    role: str = Field(default="candidate", pattern="^(candidate|training_partner|employer)$")
    email: str | None = None
    password: str | None = Field(None, min_length=6)


class PasswordLoginRequest(BaseModel):
    phone: str
    password: str


class OTPRequest(BaseModel):
    phone: str


class OTPVerifyRequest(BaseModel):
    phone: str
    otp: str = Field(..., min_length=6, max_length=6)


class ForgotPasswordRequest(BaseModel):
    phone: str


class ResetPasswordRequest(BaseModel):
    phone: str
    otp: str
    new_password: str = Field(..., min_length=6)


# ─── Endpoints ───

@router.post("/register", response_model=TokenResponse)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    user = await register_user(
        db,
        phone=body.phone,
        full_name=body.full_name,
        role=body.role,
        email=body.email,
        password=body.password,
    )
    return await issue_token_for_user(user)


@router.post("/login/password", response_model=TokenResponse)
async def login_with_password(body: PasswordLoginRequest, db: AsyncSession = Depends(get_db)):
    user = await authenticate_by_password(db, body.phone, body.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid phone or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")
    return await issue_token_for_user(user)


@router.post("/otp/send")
async def send_otp(body: OTPRequest, db: AsyncSession = Depends(get_db)):
    user = await get_user_by_phone(db, body.phone)
    if not user:
        raise HTTPException(status_code=404, detail="No account found with this phone number")
    otp = await create_otp(db, body.phone, purpose="login")
    # In production: send via Twilio SMS
    # await send_sms(body.phone, f"Your SkillTrace AI login OTP is: {otp}")
    return {
        "message": "OTP sent successfully",
        "otp_dev": otp,  # REMOVE in production — only for dev/testing
    }


@router.post("/otp/verify", response_model=TokenResponse)
async def verify_otp_login(body: OTPVerifyRequest, db: AsyncSession = Depends(get_db)):
    valid = await verify_otp(db, body.phone, body.otp, purpose="login")
    if not valid:
        raise HTTPException(status_code=401, detail="Invalid or expired OTP")
    user = await get_user_by_phone(db, body.phone)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return await issue_token_for_user(user)


@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    user = await get_user_by_phone(db, body.phone)
    if not user:
        # Don't reveal whether phone exists
        return {"message": "If an account exists, an OTP has been sent"}
    otp = await create_otp(db, body.phone, purpose="reset_password")
    return {"message": "If an account exists, an OTP has been sent"}


@router.post("/reset-password")
async def reset_password(body: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    valid = await verify_otp(db, body.phone, body.otp, purpose="reset_password")
    if not valid:
        raise HTTPException(status_code=401, detail="Invalid or expired OTP")
    from app.core.security import pwd_context
    user = await get_user_by_phone(db, body.phone)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.password_hash = pwd_context.hash(body.new_password)
    await db.flush()
    return {"message": "Password reset successfully"}


@router.get("/me")
async def get_current_user_info(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(CurrentUser),
):
    from app.services.auth_service import get_user_by_id
    u = await get_user_by_id(db, user["sub"])
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": str(u.id),
        "phone": u.phone,
        "email": u.email,
        "full_name": u.full_name,
        "role": u.role,
        "is_verified": u.is_verified,
        "created_at": u.created_at.isoformat() if u.created_at else None,
    }
