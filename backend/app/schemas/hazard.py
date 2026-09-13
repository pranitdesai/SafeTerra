from typing import Optional
from pydantic import BaseModel
from datetime import datetime

class HazardBase(BaseModel):
    hazard_type: str
    intensity: str
    probability: float = 0.0
    severity: str
    source: Optional[str] = None
    confidence: Optional[float] = None
    date_recorded: Optional[str] = None
    data_version: Optional[str] = None
    status: str = "ACTIVE"
    # Geometry can be passed as EWKT string if needed
    # geometry: Optional[str] = None

class HazardCreate(HazardBase):
    pass

class HazardResponse(HazardBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
