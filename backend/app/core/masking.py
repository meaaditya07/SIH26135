from typing import Any


def mask_phone(phone: str) -> str:
    if len(phone) >= 10:
        return phone[:3] + "****" + phone[-3:]
    return "****"


def mask_email(email: str) -> str:
    local, _, domain = email.partition("@")
    if len(local) > 2:
        masked_local = local[0] + "***" + local[-1]
    else:
        masked_local = "***"
    return f"{masked_local}@{domain}" if domain else "***"


def mask_aadhaar_hash(aadhaar_hash: str) -> str:
    if len(aadhaar_hash) >= 16:
        return aadhaar_hash[:8] + "..." + aadhaar_hash[-4:]
    return "***"


def mask_pii(data: dict[str, Any]) -> dict[str, Any]:
    masked = data.copy()
    if "phone" in masked:
        masked["phone"] = mask_phone(str(masked["phone"]))
    if "email" in masked:
        masked["email"] = mask_email(str(masked["email"]))
    if "aadhaar_hash" in masked:
        masked["aadhaar_hash"] = mask_aadhaar_hash(str(masked["aadhaar_hash"]))
    return masked
