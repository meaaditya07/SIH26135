import hashlib
import secrets
import string
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, OTPRecord
from app.core.security import create_access_token, pwd_context


def generate_otp(length: int = 6) -> str:
    return "".join(secrets.choice(string.digits) for _ in range(length))


def hash_otp(otp: str) -> str:
    return hashlib.sha256(f"otp_salt_{otp}".encode()).hexdigest()


async def register_user(
    db: AsyncSession,
    *,
    phone: str,
    full_name: str,
    role: str = "candidate",
    email: str | None = None,
    password: str | None = None,
    aadhaar_hash: str | None = None,
) -> User:
    """Register a new user. Raises if phone already exists."""
    existing = await db.execute(select(User).where(User.phone == phone))
    if existing.scalar_one_or_none():
        from fastapi import HTTPException
        raise HTTPException(status_code=409, detail="Phone number already registered")

    password_hash = pwd_context.hash(password) if password else None

    user = User(
        phone=phone,
        full_name=full_name,
        role=role,
        email=email,
        password_hash=password_hash,
        aadhaar_hash=aadhaar_hash,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


async def authenticate_by_password(
    db: AsyncSession, phone: str, password: str
) -> User | None:
    result = await db.execute(select(User).where(User.phone == phone))
    user = result.scalar_one_or_none()
    if not user or not user.password_hash:
        return None
    if not pwd_context.verify(password, user.password_hash):
        return None
    user.last_login_at = datetime.utcnow()
    await db.flush()
    return user


async def create_otp(db: AsyncSession, phone: str, purpose: str = "login") -> str:
    """Generate and store OTP. Returns plaintext OTP for sending."""
    otp = generate_otp()
    record = OTPRecord(
        phone=phone,
        otp_hash=hash_otp(otp),
        purpose=purpose,
        expires_at=datetime.utcnow() + timedelta(minutes=5),
    )
    db.add(record)
    await db.flush()
    return otp


async def verify_otp(db: AsyncSession, phone: str, otp: str, purpose: str = "login") -> bool:
    """Verify OTP. Returns True if valid, marks as used."""
    result = await db.execute(
        select(OTPRecord).where(
            OTPRecord.phone == phone,
            OTPRecord.purpose == purpose,
            OTPRecord.used == False,
            OTPRecord.expires_at > datetime.utcnow(),
        ).order_by(OTPRecord.created_at.desc()).limit(1)
    )
    record = result.scalar_one_or_none()
    if not record:
        return False
    if record.otp_hash != hash_otp(otp):
        record.attempts += 1
        await db.flush()
        return False
    record.used = True
    await db.flush()
    return True


async def issue_token_for_user(user: User) -> dict:
    """Issue JWT for a verified user."""
    token = create_access_token({
        "sub": str(user.id),
        "role": user.role,
        "phone": user.phone,
    })
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": str(user.id),
        "role": user.role,
        "full_name": user.full_name,
    }


async def get_user_by_phone(db: AsyncSession, phone: str) -> User | None:
    result = await db.execute(select(User).where(User.phone == phone))
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id) -> User | None:
    from uuid import UUID
    result = await db.execute(select(User).where(User.id == UUID(str(user_id))))
    return result.scalar_one_or_none()
