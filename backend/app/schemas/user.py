"""
SafeTerra — User Schemas

Request/response models for user management.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    """Admin request to create a new user."""
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=255)
    password: str = Field(..., min_length=8)
    role: str = Field(..., pattern="^(ADMIN|SDMA|DDMO)$")
    assigned_district_id: Optional[int] = None
    phone: Optional[str] = None
    designation: Optional[str] = None


class UserUpdate(BaseModel):
    """Admin request to update an existing user."""
    full_name: Optional[str] = None
    role: Optional[str] = Field(None, pattern="^(ADMIN|SDMA|DDMO)$")
    assigned_district_id: Optional[int] = None
    is_active: Optional[bool] = None
    phone: Optional[str] = None
    designation: Optional[str] = None


class UserResponse(BaseModel):
    """User response — never includes password."""
    id: int
    email: str
    full_name: str
    role: str
    assigned_district_id: Optional[int] = None
    assigned_district_name: Optional[str] = None
    is_active: bool
    phone: Optional[str] = None
    designation: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UserListResponse(BaseModel):
    """Paginated user list."""
    users: list[UserResponse]
    total: int
    page: int
    page_size: int
