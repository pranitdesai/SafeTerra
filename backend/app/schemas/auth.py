"""
Kavach — Authentication Schemas

Request/response models for the auth API.
"""

from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field


# ── Requests ────────────────────────────────────────────────

class LoginRequest(BaseModel):
    """Login request body."""
    email: EmailStr
    password: str = Field(..., min_length=6)


class RefreshRequest(BaseModel):
    """Token refresh request body."""
    refresh_token: str


# ── Responses ───────────────────────────────────────────────

class TokenResponse(BaseModel):
    """Returned after successful login or refresh."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserInfo(BaseModel):
    """Minimal user info returned with auth responses."""
    id: int
    email: str
    full_name: str
    role: str
    assigned_district_id: int | None = None
    assigned_district_name: str | None = None


class LoginResponse(BaseModel):
    """Full login response with tokens + user info."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserInfo
