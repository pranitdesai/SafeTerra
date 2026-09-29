"""
SafeTerra — Authentication Router

Handles login, token refresh, logout, and current-user retrieval.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
)
from app.db.session import get_db
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    RefreshRequest,
    TokenResponse,
    UserInfo,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=LoginResponse)
@router.post("/login/", response_model=LoginResponse, include_in_schema=False)
async def login(
    body: LoginRequest,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Authenticate a user and return access + refresh tokens."""
    # Find user by email
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if user is None or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    # Generate tokens
    access_token = create_access_token(
        user_id=user.id,
        role=user.role.value,
        district_id=user.assigned_district_id,
    )
    refresh_token = create_refresh_token(
        user_id=user.id,
        role=user.role.value,
        district_id=user.assigned_district_id,
    )

    # Audit log
    audit = AuditLog(
        user_id=user.id,
        action="LOGIN",
        entity_type="User",
        entity_id=user.id,
        description=f"User {user.email} logged in",
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit)

    # Build response
    district_name = None
    if user.assigned_district and hasattr(user.assigned_district, "name"):
        district_name = user.assigned_district.name

    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=UserInfo(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role.value,
            assigned_district_id=user.assigned_district_id,
            assigned_district_name=district_name,
        ),
    )


@router.post("/refresh", response_model=TokenResponse)
@router.post("/refresh/", response_model=TokenResponse, include_in_schema=False)
async def refresh_token(
    body: RefreshRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Exchange a valid refresh token for a new access + refresh token pair."""
    try:
        payload = decode_token(body.refresh_token)
        if payload.token_type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type — expected refresh token",
            )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    # Verify user still exists and is active
    result = await db.execute(select(User).where(User.id == int(payload.sub)))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or deactivated",
        )

    # Issue new tokens
    access_token = create_access_token(
        user_id=user.id,
        role=user.role.value,
        district_id=user.assigned_district_id,
    )
    new_refresh_token = create_refresh_token(
        user_id=user.id,
        role=user.role.value,
        district_id=user.assigned_district_id,
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
    )


@router.get("/me", response_model=UserInfo)
@router.get("/me/", response_model=UserInfo, include_in_schema=False)
async def get_me(
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Return the currently authenticated user's information."""
    district_name = None
    if current_user.assigned_district and hasattr(current_user.assigned_district, "name"):
        district_name = current_user.assigned_district.name

    return UserInfo(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role.value,
        assigned_district_id=current_user.assigned_district_id,
        assigned_district_name=district_name,
    )


@router.post("/logout", status_code=status.HTTP_200_OK)
@router.post("/logout/", status_code=status.HTTP_200_OK, include_in_schema=False)
async def logout(
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Log out (audit trail only — JWT is stateless, client discards tokens)."""
    audit = AuditLog(
        user_id=current_user.id,
        action="LOGOUT",
        entity_type="User",
        entity_id=current_user.id,
        description=f"User {current_user.email} logged out",
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit)

    return {"detail": "Logged out successfully"}
