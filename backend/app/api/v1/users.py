"""
Kavach — User Management Router

Admin-only CRUD for users and DDMO district assignment.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_admin
from app.core.security import hash_password
from app.db.session import get_db
from app.models.audit_log import AuditLog
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserListResponse, UserResponse, UserUpdate

router = APIRouter(prefix="/users", tags=["User Management"])


@router.get("", response_model=UserListResponse)
@router.get("/", response_model=UserListResponse, include_in_schema=False)
async def list_users(
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(require_admin)],
    page: int = 1,
    page_size: int = 20,
):
    """List all users (admin only)."""
    offset = (page - 1) * page_size

    # Count
    count_result = await db.execute(select(func.count(User.id)))
    total = count_result.scalar() or 0

    # Fetch
    result = await db.execute(
        select(User)
        .order_by(User.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    users = result.scalars().all()

    return UserListResponse(
        users=[
            UserResponse(
                id=u.id,
                email=u.email,
                full_name=u.full_name,
                role=u.role.value,
                assigned_district_id=u.assigned_district_id,
                assigned_district_name=(
                    u.assigned_district.name
                    if u.assigned_district else None
                ),
                is_active=u.is_active,
                phone=u.phone,
                designation=u.designation,
                created_at=u.created_at,
                updated_at=u.updated_at,
            )
            for u in users
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def create_user(
    body: UserCreate,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    admin: Annotated[User, Depends(require_admin)],
):
    """Create a new user (admin only)."""
    # Check duplicate email
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"User with email {body.email} already exists",
        )

    user = User(
        email=body.email,
        full_name=body.full_name,
        hashed_password=hash_password(body.password),
        role=UserRole(body.role),
        assigned_district_id=body.assigned_district_id,
        phone=body.phone,
        designation=body.designation,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    # Audit
    audit = AuditLog(
        user_id=admin.id,
        action="USER_CREATED",
        entity_type="User",
        entity_id=user.id,
        description=f"Admin created user {user.email} with role {user.role.value}",
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit)

    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role.value,
        assigned_district_id=user.assigned_district_id,
        assigned_district_name=None,
        is_active=user.is_active,
        phone=user.phone,
        designation=user.designation,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _admin: Annotated[User, Depends(require_admin)],
):
    """Get a specific user by ID (admin only)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role.value,
        assigned_district_id=user.assigned_district_id,
        assigned_district_name=(
            user.assigned_district.name if user.assigned_district else None
        ),
        is_active=user.is_active,
        phone=user.phone,
        designation=user.designation,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    body: UserUpdate,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    admin: Annotated[User, Depends(require_admin)],
):
    """Update a user (admin only)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = body.model_dump(exclude_unset=True)
    old_values = {}

    for field, value in update_data.items():
        old_values[field] = getattr(user, field)
        if field == "role":
            setattr(user, field, UserRole(value))
        else:
            setattr(user, field, value)

    await db.flush()
    await db.refresh(user)

    # Audit
    audit = AuditLog(
        user_id=admin.id,
        action="USER_UPDATED",
        entity_type="User",
        entity_id=user.id,
        description=f"Admin updated user {user.email}",
        old_value=str(old_values),
        new_value=str(update_data),
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit)

    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role.value,
        assigned_district_id=user.assigned_district_id,
        assigned_district_name=(
            user.assigned_district.name if user.assigned_district else None
        ),
        is_active=user.is_active,
        phone=user.phone,
        designation=user.designation,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )
