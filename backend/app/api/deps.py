"""
SafeTerra — API Dependencies

Shared FastAPI dependencies for authentication, authorization, and DB access.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import TokenPayload, decode_token
from app.db.session import get_db
from app.models.user import User, UserRole

# ── Bearer Token Extraction ────────────────────────────────

security_scheme = HTTPBearer(auto_error=True)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """Extract and validate the current user from the JWT bearer token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload: TokenPayload = decode_token(credentials.credentials)
        if payload.token_type != "access":
            raise credentials_exception
        user_id = int(payload.sub)
    except (JWTError, ValueError):
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        raise credentials_exception

    return user


# ── Role-Based Authorization ───────────────────────────────

def require_role(*roles: UserRole):
    """Factory: returns a dependency that enforces one of the given roles."""

    async def _check_role(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required: {[r.value for r in roles]}",
            )
        return current_user

    return _check_role


# ── Convenience Aliases ─────────────────────────────────────

require_admin = require_role(UserRole.ADMIN)
require_sdma = require_role(UserRole.SDMA)
require_ddmo = require_role(UserRole.DDMO)
require_state_or_admin = require_role(UserRole.ADMIN, UserRole.SDMA)
require_admin_or_ddmo = require_role(UserRole.ADMIN, UserRole.SDMA, UserRole.DDMO)
