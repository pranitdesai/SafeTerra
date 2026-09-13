from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.hazard import Hazard
from app.models.user import User
from app.schemas.hazard import HazardResponse, HazardCreate

router = APIRouter(prefix="/hazards", tags=["Hazards"])

@router.get("", response_model=List[HazardResponse])
@router.get("/", response_model=List[HazardResponse], include_in_schema=False)
async def get_hazards(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    skip: int = 0,
    limit: int = 100,
):
    """
    Get all hazards.
    """
    query = select(Hazard).offset(skip).limit(limit)
    result = await db.execute(query)
    hazards = result.scalars().all()
    return hazards

@router.post("", response_model=HazardResponse)
@router.post("/", response_model=HazardResponse, include_in_schema=False)
async def create_hazard(
    hazard_in: HazardCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Create a new hazard record. (e.g., from an ML model prediction)
    """
    # Assuming only ADMIN or system can push hazards
    if current_user.role.value not in ["ADMIN", "SUPER_ADMIN"]:
        raise HTTPException(status_code=403, detail="Not authorized to create hazards")
        
    new_hazard = Hazard(**hazard_in.model_dump())
    
    db.add(new_hazard)
    await db.commit()
    await db.refresh(new_hazard)
    
    return new_hazard
