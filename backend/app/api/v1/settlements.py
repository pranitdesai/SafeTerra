from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.settlement import Settlement
from app.models.user import User
from app.schemas.settlement import SettlementResponse, SettlementCreate

router = APIRouter(prefix="/settlements", tags=["Settlements"])

@router.get("", response_model=List[SettlementResponse])
@router.get("/", response_model=List[SettlementResponse], include_in_schema=False)
async def get_settlements(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    skip: int = 0,
    limit: int = 100,
    district_id: int | None = None,
):
    """
    Get settlements. If the user is a DDMO, they only see their district.
    """
    query = select(Settlement)
    
    # DDMO constraint
    if current_user.role.value == "DDMO":
        if not current_user.assigned_district_id:
            raise HTTPException(status_code=403, detail="DDMO not assigned to a district")
        query = query.where(Settlement.district_id == current_user.assigned_district_id)
    elif district_id:
        query = query.where(Settlement.district_id == district_id)
        
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    settlements = result.scalars().all()
    
    return settlements

@router.get("/{settlement_id}", response_model=SettlementResponse)
@router.get("/{settlement_id}/", response_model=SettlementResponse, include_in_schema=False)
async def get_settlement(
    settlement_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Get a specific settlement.
    """
    query = select(Settlement).where(Settlement.id == settlement_id)
    
    if current_user.role.value == "DDMO":
        query = query.where(Settlement.district_id == current_user.assigned_district_id)
        
    result = await db.execute(query)
    settlement = result.scalar_one_or_none()
    
    if not settlement:
        raise HTTPException(status_code=404, detail="Settlement not found")
        
    return settlement

@router.post("", response_model=SettlementResponse)
@router.post("/", response_model=SettlementResponse, include_in_schema=False)
async def create_settlement(
    settlement_in: SettlementCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Create a new settlement. Only accessible by ADMIN (for simplicity, we assume admins can create, or DDMOs can create in their district).
    """
    if current_user.role.value == "DDMO":
        if settlement_in.district_id != current_user.assigned_district_id:
            raise HTTPException(status_code=403, detail="Cannot create settlement outside assigned district")
            
    # Assuming PostGIS POINT from lat/lon for geometry
    wkt_point = f"SRID=4326;POINT({settlement_in.longitude} {settlement_in.latitude})"
    
    new_settlement = Settlement(**settlement_in.model_dump())
    new_settlement.geometry = wkt_point
    
    db.add(new_settlement)
    await db.commit()
    await db.refresh(new_settlement)
    
    return new_settlement
