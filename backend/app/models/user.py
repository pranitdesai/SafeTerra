"""
Kavach — User Model

Supports ADMIN and DDMO roles with district-level assignment.
"""

from __future__ import annotations

import enum
from typing import Optional

from sqlalchemy import Boolean, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel


class UserRole(str, enum.Enum):
    """User roles — extensible for future role additions."""
    ADMIN = "ADMIN"
    DDMO = "DDMO"


class User(BaseModel):
    """Application user — either an Administrator or a District Officer."""

    __tablename__ = "users"

    # ── Identity ────────────────────────────────────────────
    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(Text, nullable=False)

    # ── Role & Assignment ───────────────────────────────────
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", native_enum=True),
        nullable=False,
        default=UserRole.DDMO,
    )
    assigned_district_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("districts.id", ondelete="SET NULL"),
        nullable=True,
    )

    # ── Status ──────────────────────────────────────────────
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    designation: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # ── Relationships ───────────────────────────────────────
    assigned_district = relationship(
        "District", back_populates="officers", lazy="selectin"
    )
    audit_logs = relationship(
        "AuditLog", back_populates="user", lazy="noload"
    )

    def __repr__(self) -> str:
        return f"<User {self.email} role={self.role.value}>"
