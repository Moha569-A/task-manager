"""
Security utilities — password hashing and JWT issuing/verification.

Passwords: PBKDF2-HMAC-SHA256 with a per-password random salt (pure stdlib,
no native dependencies). Stored format:

    pbkdf2_sha256$<iterations>$<salt_hex>$<hash_hex>

Tokens: signed JWTs (HS256) valid for 7 days. In production, set a strong
random value via the TASKFLOW_SECRET environment variable.
"""
from __future__ import annotations

import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone

import jwt

SECRET_KEY = os.environ.get("TASKFLOW_SECRET", "taskflow-dev-secret-change-me-in-prod")
ALGORITHM = "HS256"
ISSUER = "taskflow"
ACCESS_TOKEN_EXPIRE_DAYS = 7

_PBKDF2_ITERATIONS = 120_000


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, _PBKDF2_ITERATIONS)
    return f"pbkdf2_sha256${_PBKDF2_ITERATIONS}${salt.hex()}${dk.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    """Constant-time comparison of a candidate password against a stored hash."""
    try:
        algo, iterations, salt_hex, hash_hex = stored_hash.split("$")
        if algo != "pbkdf2_sha256":
            return False
        dk = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), bytes.fromhex(salt_hex), int(iterations)
        )
        return hmac.compare_digest(dk.hex(), hash_hex)
    except (ValueError, AttributeError):
        return False


def create_access_token(user_id: int, email: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),           # subject = user id
        "email": email,
        "iat": now,                    # issued at
        "exp": now + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS),
        "iss": ISSUER,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Return the verified payload, or raise jwt.PyJWTError on any problem."""
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], issuer=ISSUER)
