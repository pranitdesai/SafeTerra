"""
Kavach — Analytics, AI Hazard Evaluation, and Real-Time Alert API

Provides endpoints for:
  - Multi-hazard AI assessment & Sentinel-2 telemetry
  - Capacitated relocation strategy calculation
  - Real-time weather/satellite hazard simulation triggers
  - Live operational alert feed
"""

from __future__ import annotations

import datetime
from typing import Annotated, Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.audit_log import AuditLog
from app.models.relocation_site import RelocationSite
from app.models.settlement import Settlement
from app.models.user import User
from app.services.ml_engine import (
    DemographicProfile,
    EnvironmentalTelemetry,
    MultiHazardMLEngine,
)
from app.services.relocation_optimizer import (
    CandidateShelter,
    EvacueeHabitation,
    RelocationCapacityOptimizer,
)

router = APIRouter(prefix="/analytics", tags=["Analytics & AI Decision Support"])


class SimulationRequest(BaseModel):
    scenario: str = Field("cloudburst", description="cloudburst | landslide_surge | reset")
    rainfall_mm_per_hr: float = Field(120.0, description="Precipitation rate in mm/hr")
    affected_settlement_ids: Optional[List[int]] = None


# In-memory transient live alerts queue for demo/real-time streaming
LIVE_ALERTS: List[Dict[str, Any]] = [
    {
        "id": "alt-01",
        "severity": "CRITICAL",
        "title": "Extreme Landslide & Debris Flow Risk",
        "location": "Maldevta Habitation",
        "timestamp": "12 minutes ago",
        "details": "Song river catchment saturated; Sentinel-2 NDWI indicates surface water pooling (0.42). Road access blocked.",
        "action_required": "Initiate IMMEDIATE evacuation to Raipur Sports Complex.",
    },
    {
        "id": "alt-02",
        "severity": "CRITICAL",
        "title": "Cloudburst Warning Triggered",
        "location": "Kholi Village",
        "timestamp": "28 minutes ago",
        "details": "Precipitation gauge recorded 98mm/hr; slope angle 34° exceeds stability threshold.",
        "action_required": "Dispatch SDRF reconnaissance; prep shelter transport.",
    },
    {
        "id": "alt-03",
        "severity": "WARNING",
        "title": "Relocation Shelter Nearing Capacity",
        "location": "Mussoorie Municipal Relief Hall",
        "timestamp": "1 hour ago",
        "details": "Occupancy reached 380/600 (63.3%). Diverting future evacuees to Dehradun Parade Ground.",
        "action_required": "Adjust routing matrix to Secondary Staging Camps.",
    },
    {
        "id": "alt-04",
        "severity": "INFO",
        "title": "Sentinel-2 Multi-Spectral Sync Complete",
        "location": "Dehradun District Coverage",
        "timestamp": "2 hours ago",
        "details": "Copernicus Hub data ingested at 10m spatial resolution. DEM slope layers updated.",
        "action_required": "System operational.",
    },
]


@router.get("/ml-assessment")
async def get_ml_assessment(
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Returns AI model telemetry, Sentinel-2 satellite metadata, and feature weights.
    """
    return {
        "model_name": "Kavach Multi-Hazard Geospatial Risk Model v2.4",
        "satellite_telemetry": {
            "source": "Copernicus Sentinel-2 (MSI) & Sentinel-1 (C-SAR)",
            "dem_source": "Bhuvan / ALOS PALSAR 12.5m DEM",
            "last_satellite_pass": "2026-09-16 06:42 UTC",
            "resolution": "10-meter multispectral",
            "spectral_indices": ["NDVI (Canopy degradation)", "NDWI (Surface water)", "SAR Backscatter"],
            "status": "ONLINE / ACTIVE SYNC",
        },
        "feature_weights": {
            "monsoon_rainfall_intensity": 0.40,
            "dem_terrain_slope": 0.35,
            "soil_vegetation_saturation": 0.15,
            "gsi_disaster_recurrence": 0.10,
        },
        "prioritization_thresholds": {
            "immediate_red_zone": "Risk >= 75.0 or (Intensity >= 80 and Road Access Cut)",
            "short_term_buffer": "60.0 <= Risk < 75.0",
            "medium_term_buffer": "50.0 <= Risk < 60.0",
            "monitor_safe": "Risk < 50.0",
        },
    }


@router.get("/alerts")
async def get_alerts(
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Returns live operational alerts for NDRF and State/District controllers.
    """
    return LIVE_ALERTS


@router.get("/relocation-plan")
async def get_relocation_plan(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    district_id: Optional[int] = None,
):
    """
    Executes the Carrying Capacity Optimization algorithm across all habitations
    in Red / Buffer zones and available safe alternative shelters.
    """
    # 1. Fetch threatened habitations (RED and BUFFER)
    settle_query = select(Settlement).where(
        Settlement.current_hazard_status.in_(["RED", "BUFFER"])
    )
    if current_user.role.value == "DDMO" and current_user.assigned_district_id:
        settle_query = settle_query.where(Settlement.district_id == current_user.assigned_district_id)
    elif district_id:
        settle_query = settle_query.where(Settlement.district_id == district_id)

    res_settle = await db.execute(settle_query)
    settlements = res_settle.scalars().all()

    # 2. Fetch active shelters
    shelter_query = select(RelocationSite).where(RelocationSite.is_active == True)
    if current_user.role.value == "DDMO" and current_user.assigned_district_id:
        shelter_query = shelter_query.where(RelocationSite.district_id == current_user.assigned_district_id)
    elif district_id:
        shelter_query = shelter_query.where(RelocationSite.district_id == district_id)

    res_shelter = await db.execute(shelter_query)
    shelters = res_shelter.scalars().all()

    # 3. Convert to optimizer structs
    opt_habitations = [
        EvacueeHabitation(
            id=s.id,
            name=s.name,
            latitude=s.latitude,
            longitude=s.longitude,
            population=s.population,
            vulnerable_population=s.vulnerable_population,
            priority_level=s.priority_level,
            hazard_status=s.current_hazard_status,
        )
        for s in settlements
    ]

    opt_shelters = [
        CandidateShelter(
            id=sh.id,
            name=sh.name,
            latitude=sh.latitude,
            longitude=sh.longitude,
            max_capacity=sh.max_capacity,
            current_occupancy=sh.current_occupancy,
            water_available=sh.water_available,
            medical_facilities=sh.medical_facilities,
            sanitation_available=sh.sanitation_available,
            site_suitability_score=sh.site_suitability_score,
        )
        for sh in shelters
    ]

    # 4. Run optimization
    plan = RelocationCapacityOptimizer.optimize(opt_habitations, opt_shelters)

    return {
        "status": "OPTIMAL_PLAN_GENERATED",
        "generated_at": datetime.datetime.utcnow().isoformat() + "Z",
        "total_evacuees_needed": plan.total_evacuees_needed,
        "total_allocated": plan.total_allocated,
        "unallocated_count": plan.unallocated_count,
        "allocations": [
            {
                "habitation_id": a.habitation_id,
                "habitation_name": a.habitation_name,
                "shelter_id": a.shelter_id,
                "shelter_name": a.shelter_name,
                "people_allocated": a.people_allocated,
                "distance_km": a.distance_km,
                "medical_facility_matched": a.medical_facility_matched,
                "route_positions": a.route_positions,
            }
            for a in plan.allocations
        ],
        "shelter_utilization": [
            {
                "shelter_id": u.shelter_id,
                "shelter_name": u.shelter_name,
                "max_capacity": u.max_capacity,
                "starting_occupancy": u.starting_occupancy,
                "allocated_count": u.allocated_count,
                "final_occupancy": u.final_occupancy,
                "utilization_percentage": u.utilization_percentage,
                "is_at_capacity": u.is_at_capacity,
            }
            for u in plan.shelter_utilization
        ],
        "evacuation_routes": plan.evacuation_routes,
    }


@router.post("/simulate-hazard")
async def simulate_hazard(
    request: SimulationRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Simulates a sudden extreme weather event (e.g. cloudburst, monsoon surge).
    Triggers the AI model re-assessment in real-time, shifts habitations into RED zones,
    and dispatches live alerts.
    """
    res = await db.execute(select(Settlement))
    all_settlements = res.scalars().all()

    now_str = datetime.datetime.now().strftime("%H:%M")

    if request.scenario == "reset":
        # Reset to baseline
        for s in all_settlements:
            if "Village" in s.name or "Maldevta" in s.name or "Sahastradhara" in s.name:
                s.current_hazard_status = "RED"
                s.priority_level = "IMMEDIATE"
                s.risk_score = 88.0
            elif "Mussoorie" in s.name or "Barkot" in s.name or "Kalsi" in s.name or "Sundarpur" in s.name:
                s.current_hazard_status = "BUFFER"
                s.priority_level = "SHORT_TERM"
                s.risk_score = 62.0
            else:
                s.current_hazard_status = "SAFE"
                s.priority_level = "MONITOR"
                s.risk_score = 22.0

        await db.commit()
        return {
            "message": "Baseline hazard parameters restored.",
            "scenario": "reset",
            "active_red_zones": 3,
        }

    # Simulate Cloudburst / Monsoon Surge
    updated_names = []
    for s in all_settlements:
        # If specific IDs provided or default top settlements
        should_escalate = (
            (request.affected_settlement_ids and s.id in request.affected_settlement_ids) or
            ("Maldevta" in s.name or "Sahastradhara" in s.name or "Mussoorie" in s.name or "Kholi" in s.name)
        )

        if should_escalate:
            env = EnvironmentalTelemetry(
                rainfall_mm_per_hr=request.rainfall_mm_per_hr,
                slope_angle_degrees=36.0,
                ndvi_vegetation_index=0.32,
                ndwi_water_index=0.48,
                past_landslide_events=2,
            )
            demo = DemographicProfile(
                total_population=s.population,
                vulnerable_population=s.vulnerable_population,
                road_access=False,  # road severed by debris
                healthcare_distance_km=s.nearest_healthcare_distance,
                shelter_distance_km=s.nearest_shelter_distance,
            )
            eval_res = MultiHazardMLEngine.evaluate(env, demo)

            s.current_hazard_status = eval_res.hazard_status
            s.priority_level = eval_res.priority_level
            s.risk_score = eval_res.risk_score
            s.vulnerability_score = eval_res.vulnerability_score
            s.road_access = False
            updated_names.append(s.name)

    # Prepend new dynamic alert
    new_alert = {
        "id": f"alt-sim-{datetime.datetime.now().strftime('%M%S')}",
        "severity": "CRITICAL",
        "title": f"SIMULATED EVENT: Cloudburst Surge ({request.rainfall_mm_per_hr:.0f} mm/hr)",
        "location": "Dehradun Northern Ridge (Maldevta / Mussoorie Axis)",
        "timestamp": f"Just now ({now_str})",
        "details": f"Extreme precipitation threshold breached. Multi-hazard AI upgraded {len(updated_names)} habitations to RED Zone (IMMEDIATE evacuation).",
        "action_required": "Activate Emergency Operations Center & execute automated carrying capacity routes.",
    }
    LIVE_ALERTS.insert(0, new_alert)

    # Log to audit trail
    log = AuditLog(
        user_id=current_user.id,
        action="SIMULATE_CLOUDBURST",
        entity_type="MULTI_HAZARD_AI",
        description=f"Triggered {request.rainfall_mm_per_hr}mm/hr cloudburst simulation on {len(updated_names)} settlements.",
    )
    db.add(log)

    await db.commit()

    return {
        "message": f"Cloudburst surge of {request.rainfall_mm_per_hr} mm/hr processed by MultiHazardMLEngine.",
        "scenario": request.scenario,
        "rainfall_mm_per_hr": request.rainfall_mm_per_hr,
        "escalated_settlements": updated_names,
        "new_alert": new_alert,
    }
