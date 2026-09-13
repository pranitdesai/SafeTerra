from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.relocation_site import RelocationSite
from app.models.user import User
from app.schemas.relocation_site import RelocationSiteResponse, RelocationSiteCreate

router = APIRouter(prefix="/relocation-sites", tags=["Relocation Sites"])

@router.get("", response_model=List[RelocationSiteResponse])
@router.get("/", response_model=List[RelocationSiteResponse], include_in_schema=False)
async def get_relocation_sites(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    skip: int = 0,
    limit: int = 100,
    district_id: int | None = None,
):
    """
    Get relocation sites. DDMOs only see their district's sites.
    """
    query = select(RelocationSite)
    
    if current_user.role.value == "DDMO":
        if not current_user.assigned_district_id:
            raise HTTPException(status_code=403, detail="DDMO not assigned to a district")
        query = query.where(RelocationSite.district_id == current_user.assigned_district_id)
    elif district_id:
        query = query.where(RelocationSite.district_id == district_id)
        
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    sites = result.scalars().all()
    
    return sites

@router.post("", response_model=RelocationSiteResponse)
@router.post("/", response_model=RelocationSiteResponse, include_in_schema=False)
async def create_relocation_site(
    site_in: RelocationSiteCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Create a new relocation site.
    """
    if current_user.role.value == "DDMO":
        if site_in.district_id != current_user.assigned_district_id:
            raise HTTPException(status_code=403, detail="Cannot create site outside assigned district")
            
    # Assuming PostGIS POINT from lat/lon for geometry
    wkt_point = f"SRID=4326;POINT({site_in.longitude} {site_in.latitude})"
    
    new_site = RelocationSite(**site_in.model_dump())
    new_site.geometry = wkt_point
    
    db.add(new_site)
    await db.commit()
    await db.refresh(new_site)
    
    return new_site
