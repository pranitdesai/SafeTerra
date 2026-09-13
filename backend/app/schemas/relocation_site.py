from typing import Optional
from pydantic import BaseModel
from datetime import datetime

class RelocationSiteBase(BaseModel):
    name: str
    district_id: int
    facility_type: str
    latitude: float
    longitude: float
    max_capacity: int = 0
    current_occupancy: int = 0
    water_available: bool = True
    sanitation_available: bool = True
    medical_facilities: bool = False
    electricity_available: bool = True
    kitchen_available: bool = False
    is_active: bool = True
    site_suitability_score: float = 0.0

class RelocationSiteCreate(RelocationSiteBase):
    pass

class RelocationSiteResponse(RelocationSiteBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
