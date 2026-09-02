def test_security_hash():
    from app.core.security import hash_aadhaar
    h1 = hash_aadhaar("123456789012")
    h2 = hash_aadhaar("123456789012")
    assert h1 == h2
    assert len(h1) == 64  # SHA-256 hex
    assert h1 != hash_aadhaar("999999999999")


def test_masking():
    from app.core.masking import mask_phone, mask_email, mask_pii
    assert mask_phone("9876543210") == "987****210"
    assert "secret" not in mask_email("user@example.com")
    masked = mask_pii({"phone": "9876543210", "email": "a@b.com"})
    assert "9876543210" not in str(masked["phone"])
