from typing import Optional
from pydantic import BaseModel, Field

class SettlementBase(BaseModel):
    name: str
    state_id: int
    district_id: int
    block_id: Optional[int] = None
    tehsil_id: Optional[int] = None
    latitude: float
    longitude: float
    population: int = 0
    households: int = 0
    population_density: float = 0.0
    vulnerable_population: int = 0
    elderly_population: int = 0
    children_population: int = 0
    disabled_population: int = 0
    road_access: bool = True
    nearest_healthcare_distance: float = 5.0
    nearest_shelter_distance: float = 5.0
    nearest_school_distance: float = 2.0
    water_access: bool = True
    electricity_access: bool = True
    sanitation_access: bool = True
    current_hazard_status: str = "SAFE"
    risk_score: float = 0.0
    vulnerability_score: float = 0.0
    priority_level: str = "MONITOR"

class SettlementCreate(SettlementBase):
    pass

class SettlementResponse(SettlementBase):
    id: int
    
    class Config:
        from_attributes = True
