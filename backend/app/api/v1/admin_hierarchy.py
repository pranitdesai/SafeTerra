"""
SafeTerra — Administrative Hierarchy Router

States, Districts, Blocks, Tehsils — read endpoints.
"""

from __future__ import annotations

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException
from geoalchemy2.functions import ST_AsGeoJSON
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.administrative import Block, District, State, Tehsil
from app.models.user import User, UserRole

router = APIRouter(tags=["Administrative Hierarchy"])


# ── States ──────────────────────────────────────────────────

@router.get("/states")
@router.get("/states/", include_in_schema=False)
async def list_states(
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(get_current_user)],
):
    """List all states."""
    result = await db.execute(select(State).order_by(State.name))
    states = result.scalars().all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "code": s.code,
        }
        for s in states
    ]


@router.get("/states/{state_id}")
async def get_state(
    state_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: Annotated[User, Depends(get_current_user)],
):
    """Get a state by ID with geometry."""
    result = await db.execute(select(State).where(State.id == state_id))
    state = result.scalar_one_or_none()
    if not state:
        raise HTTPException(status_code=404, detail="State not found")

    geojson = None
    if state.geometry is not None:
        geo_result = await db.execute(
            select(ST_AsGeoJSON(State.geometry)).where(State.id == state_id)
        )
        geojson = geo_result.scalar()

    return {
        "id": state.id,
        "name": state.name,
        "code": state.code,
        "geometry": geojson,
    }


# ── Districts ───────────────────────────────────────────────

@router.get("/districts")
@router.get("/districts/", include_in_schema=False)
async def list_districts(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    state_id: Optional[int] = None,
):
    """List districts — DDMO sees only their assigned district."""
    query = select(District)

    if current_user.role == UserRole.DDMO:
        # District isolation: DDMO only sees assigned district
        if current_user.assigned_district_id is None:
            return []
        query = query.where(District.id == current_user.assigned_district_id)
    elif state_id is not None:
        query = query.where(District.state_id == state_id)

    result = await db.execute(query.order_by(District.name))
    districts = result.scalars().all()

    return [
        {
            "id": d.id,
            "name": d.name,
            "code": d.code,
            "state_id": d.state_id,
            "state_name": d.state.name if d.state else None,
            "headquarters": d.headquarters,
            "area_sq_km": d.area_sq_km,
            "population": d.population,
        }
        for d in districts
    ]


@router.get("/districts/{district_id}")
async def get_district(
    district_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Get district detail — enforces DDMO district isolation."""
    # DDMO district isolation
    if (
        current_user.role == UserRole.DDMO
        and current_user.assigned_district_id != district_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this district",
        )

    result = await db.execute(select(District).where(District.id == district_id))
    district = result.scalar_one_or_none()
    if not district:
        raise HTTPException(status_code=404, detail="District not found")

    geojson = None
    if district.geometry is not None:
        geo_result = await db.execute(
            select(ST_AsGeoJSON(District.geometry)).where(District.id == district_id)
        )
        geojson = geo_result.scalar()

    return {
        "id": district.id,
        "name": district.name,
        "code": district.code,
        "state_id": district.state_id,
        "state_name": district.state.name if district.state else None,
        "headquarters": district.headquarters,
        "area_sq_km": district.area_sq_km,
        "population": district.population,
        "geometry": geojson,
    }


# ── Blocks ──────────────────────────────────────────────────

@router.get("/blocks")
@router.get("/blocks/", include_in_schema=False)
async def list_blocks(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    district_id: Optional[int] = None,
):
    """List blocks — filtered by district (enforces DDMO isolation)."""
    query = select(Block)

    if current_user.role == UserRole.DDMO:
        if current_user.assigned_district_id is None:
            return []
        query = query.where(Block.district_id == current_user.assigned_district_id)
    elif district_id is not None:
        query = query.where(Block.district_id == district_id)

    result = await db.execute(query.order_by(Block.name))
    blocks = result.scalars().all()

    return [
        {
            "id": b.id,
            "name": b.name,
            "code": b.code,
            "district_id": b.district_id,
        }
        for b in blocks
    ]


# ── Tehsils ─────────────────────────────────────────────────

@router.get("/tehsils")
@router.get("/tehsils/", include_in_schema=False)
async def list_tehsils(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    block_id: Optional[int] = None,
):
    """List tehsils — optionally filtered by block."""
    query = select(Tehsil)

    if block_id is not None:
        query = query.where(Tehsil.block_id == block_id)

    result = await db.execute(query.order_by(Tehsil.name))
    tehsils = result.scalars().all()

    return [
        {
            "id": t.id,
            "name": t.name,
            "code": t.code,
            "block_id": t.block_id,
        }
        for t in tehsils
    ]
