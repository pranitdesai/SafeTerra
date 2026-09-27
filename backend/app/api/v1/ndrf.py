"""
Kavach — National Disaster Response Force (NDRF) Integration API

Provides endpoints for:
  - DDMA / NDMA Red Zone Confirmation and Tactical Alert Dispatch to NDRF Battalions
  - Live NDRF Battalion Operations monitoring (8th BN, 14th BN, 15th BN)
  - Real-time Battalion deployment status workflow (DISPATCHED -> ACKNOWLEDGED -> MOBILIZING -> EN_ROUTE -> ON_SCENE)
  - Integration with Multi-Hazard AI, Relocation Shelters, and Audit Logs
"""

from __future__ import annotations

import datetime
import random
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
from app.api.v1.analytics import LIVE_ALERTS

router = APIRouter(prefix="/ndrf", tags=["NDRF Battalion Integration"])


# ─────────────────────────────────────────────────────────────
# In-Memory Store for NDRF Battalions & Dispatched Alerts
# ─────────────────────────────────────────────────────────────

NDRF_BATTALIONS: List[Dict[str, Any]] = [
    {
        "id": "08-BN-NDRF",
        "name": "8th Battalion NDRF",
        "rrc_location": "Dehradun Regional Response Centre (RRC), Haridwar Road",
        "headquarters": "Govindpuram, Ghaziabad",
        "commandant": "Commandant P. K. Srivastava",
        "duty_officer": "Insp. / GD Vikrant Negi",
        "operational_zone": "Uttarakhand (Garhwal & Kumaon), Western UP, NCR",
        "contact_eoc": "+91-135-2726066 / 1077",
        "tactical_radio_net": "VHF Net 143.825 MHz (Callsign: RESCUE-EIGHT)",
        "satellite_uplink": "INSAT-3DR / TacSat Channel 4",
        "personnel_strength": 1149,
        "available_qrf_teams": 12,
        "deployed_teams": 3,
        "equipment": {
            "inflatable_zodiac_boats": 28,
            "canine_search_squads": 8,
            "deep_diving_sets": 16,
            "high_altitude_mountain_gear": 60,
            "drone_reconnaissance_units": 6,
            "mobile_triage_ambulances": 10,
        },
        "status": "OPERATIONAL / HIGH READINESS",
    },
    {
        "id": "14-BN-NDRF",
        "name": "14th Battalion NDRF",
        "rrc_location": "Jaspur / Udham Singh Nagar RRC",
        "headquarters": "Jaspur, Uttarakhand",
        "commandant": "Commandant Rajesh Sharma",
        "duty_officer": "Sub-Insp. M. K. Rawat",
        "operational_zone": "Kumaon Foothills & Terai Region",
        "contact_eoc": "+91-5947-224110",
        "tactical_radio_net": "VHF Net 142.150 MHz (Callsign: HIMALAYA-FOURTEEN)",
        "satellite_uplink": "GSAT-7A Secure Tactical Link",
        "personnel_strength": 1050,
        "available_qrf_teams": 14,
        "deployed_teams": 2,
        "equipment": {
            "inflatable_zodiac_boats": 22,
            "canine_search_squads": 6,
            "deep_diving_sets": 12,
            "high_altitude_mountain_gear": 45,
            "drone_reconnaissance_units": 4,
            "mobile_triage_ambulances": 8,
        },
        "status": "OPERATIONAL / STANDBY",
    },
    {
        "id": "15-BN-NDRF",
        "name": "15th Battalion NDRF",
        "rrc_location": "Gadarpur Staging Base",
        "headquarters": "Gadarpur, Uttarakhand",
        "commandant": "Commandant S. N. Yadav",
        "duty_officer": "Insp. Arvind Singh",
        "operational_zone": "Southern Uttarakhand & Border Interdictions",
        "contact_eoc": "+91-5949-231002",
        "tactical_radio_net": "VHF Net 144.300 MHz",
        "satellite_uplink": "NICNET Disaster Trunk",
        "personnel_strength": 980,
        "available_qrf_teams": 10,
        "deployed_teams": 1,
        "equipment": {
            "inflatable_zodiac_boats": 18,
            "canine_search_squads": 4,
            "deep_diving_sets": 10,
            "high_altitude_mountain_gear": 30,
            "drone_reconnaissance_units": 3,
            "mobile_triage_ambulances": 6,
        },
        "status": "OPERATIONAL / STANDBY",
    },
]

# In-memory alerts dispatched to NDRF battalions
NDRF_DISPATCHED_ALERTS: List[Dict[str, Any]] = [
    {
        "dispatch_id": "NDRF-DISPATCH-2026-08BN-4421",
        "issued_at": (datetime.datetime.now() - datetime.timedelta(minutes=45)).isoformat() + "Z",
        "authority_level": "DDMA",
        "authority_label": "District Disaster Management Authority (DDMA), Dehradun",
        "authorized_by": "Dr. R. Rajesh Kumar, IAS (District Magistrate / DDMA Chairman)",
        "battalion_id": "08-BN-NDRF",
        "battalion_name": "8th Battalion NDRF (Dehradun RRC)",
        "priority_level": "P1_CRITICAL_IMMEDIATE_LIFE_SAFETY",
        "priority_label": "P1 - Critical / Imminent Threat to Life",
        "settlement_ids": [1, 2],
        "settlement_names": ["Maldevta Habitation", "Sahastradhara Village"],
        "threatened_population": 3420,
        "vulnerable_population": 1094,
        "road_access_status": "SEVERED (Song River flash flood destroyed bridge km 14)",
        "recommended_route": "Thano - Bhogpur ridge bypass / Helo LZ Raipur Ground",
        "assigned_shelter_id": 1,
        "assigned_shelter_name": "Raipur Sports Complex Staging Camp",
        "assigned_shelter_capacity": 1200,
        "tactical_units_requested": [
            "Flood Rescue Team (FRT) with 4 Inflatable Zodiac Boats",
            "Canine Search & Scent Squad (CSSR)",
            "Mountain SAR & High-Angle Stretcher Team",
            "Paramedic Mobile Triage First Responders (MFR)",
        ],
        "tactical_directive": (
            "Imminent debris flow and flash flood surge confirmed by Sentinel-2 telemetry & IMD radar (98mm/hr). "
            "Song river access road impassable. Establish forward staging at Raipur and deploy Zodiacs along lower basin. "
            "Prioritize evacuation of 142 elderly and 87 infant citizens."
        ),
        "comms_channel": "VHF CH-04 (143.825 MHz) / Kavach Real-Time Link",
        "status": "EN_ROUTE",
        "active_teams_deployed": 3,
        "eta_minutes": 15,
        "timeline": [
            {
                "time": (datetime.datetime.now() - datetime.timedelta(minutes=45)).strftime("%H:%M:%S IST"),
                "status": "DISPATCHED",
                "message": "DDMA Dehradun confirmed Red Zone; tactical requisition order dispatched to NDRF 8th Battalion HQ.",
                "officer": "Dr. R. Rajesh Kumar, IAS",
            },
            {
                "time": (datetime.datetime.now() - datetime.timedelta(minutes=38)).strftime("%H:%M:%S IST"),
                "status": "ACKNOWLEDGED",
                "message": "NDRF 8th BN Operations Room acknowledged receipt; Duty Officer alerted Commandant.",
                "officer": "Insp. Vikrant Negi (Duty Officer, 8th BN)",
            },
            {
                "time": (datetime.datetime.now() - datetime.timedelta(minutes=30)).strftime("%H:%M:%S IST"),
                "status": "MOBILIZING",
                "message": "3 Quick Response Teams (QRF Team 1, Team 4, Canine Squad Alpha) mustered at RRC Dehradun with 4 Zodiac boats.",
                "officer": "Commandant P. K. Srivastava",
            },
            {
                "time": (datetime.datetime.now() - datetime.timedelta(minutes=15)).strftime("%H:%M:%S IST"),
                "status": "EN_ROUTE",
                "message": "QRF Convoys deployed via Thano ridge bypass towards Raipur - Maldevta staging post. ETA 15 mins.",
                "officer": "Team Commander Insp. S. K. Pal",
            },
        ],
    }
]


# ─────────────────────────────────────────────────────────────
# Request / Response Schemas
# ─────────────────────────────────────────────────────────────

class NDRFAlertCreateRequest(BaseModel):
    settlement_ids: List[int] = Field(..., description="List of confirmed RED Zone settlement IDs")
    authority_level: str = Field("DDMA", description="DDMA or NDMA")
    authorized_by: Optional[str] = Field(None, description="Name and title of authorizing officer")
    battalion_id: str = Field("08-BN-NDRF", description="Target NDRF Battalion ID")
    priority_level: str = Field("P1_CRITICAL_IMMEDIATE_LIFE_SAFETY", description="P1_CRITICAL or P2_URGENT")
    tactical_units: List[str] = Field(
        default_factory=lambda: [
            "Flood Rescue Team (FRT) & Zodiac Boats",
            "Canine Search Squad (CSSR)",
            "Paramedic Mobile Triage (MFR)",
        ]
    )
    assigned_shelter_id: Optional[int] = Field(None, description="Assigned safe relocation site ID")
    tactical_directive: Optional[str] = Field(None, description="Field operational instructions")
    comms_channel: Optional[str] = Field("VHF CH-04 (143.825 MHz)", description="Emergency radio net")


class NDRFStatusUpdateRequest(BaseModel):
    status: str = Field(..., description="ACKNOWLEDGED | MOBILIZING | EN_ROUTE | ON_SCENE_ACTIVE | STANDBY | COMPLETED")
    message: str = Field(..., description="Tactical status update details")
    officer_name: Optional[str] = Field("Duty Officer, NDRF Operations Room")
    eta_minutes: Optional[int] = None
    active_teams: Optional[int] = None


# ─────────────────────────────────────────────────────────────
# API Endpoints
# ─────────────────────────────────────────────────────────────

@router.get("/battalions")
async def get_ndrf_battalions(
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Returns the list of operational NDRF Battalions, RRC base locations,
    personnel readiness, and available rescue equipment.
    """
    return {
        "count": len(NDRF_BATTALIONS),
        "battalions": NDRF_BATTALIONS,
    }


@router.get("/alerts")
async def get_ndrf_alerts(
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Returns all active and historic tactical alerts dispatched by DDMA/NDMA
    to NDRF Battalions, including live field response status.
    """
    return {
        "count": len(NDRF_DISPATCHED_ALERTS),
        "alerts": NDRF_DISPATCHED_ALERTS,
    }


@router.post("/alerts")
async def dispatch_ndrf_alert(
    request: NDRFAlertCreateRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Allows DDMA or NDMA official to formally confirm a Red Zone and dispatch
    an immediate Tactical Mobilization Order to the designated NDRF Battalion.
    """
    if not request.settlement_ids:
        raise HTTPException(status_code=400, detail="At least one Red Zone settlement must be selected.")

    # 1. Fetch settlements
    res = await db.execute(
        select(Settlement).where(Settlement.id.in_(request.settlement_ids))
    )
    settlements = res.scalars().all()
    if not settlements:
        raise HTTPException(status_code=404, detail="Selected habitations not found.")

    # Mark settlements confirmed as RED and priority IMMEDIATE
    settlement_names = []
    total_pop = 0
    total_vuln = 0
    severed_road = False

    for s in settlements:
        s.current_hazard_status = "RED"
        s.priority_level = "IMMEDIATE"
        settlement_names.append(s.name)
        total_pop += (s.population or 0)
        total_vuln += (s.vulnerable_population or int((s.population or 0) * 0.32))
        if s.road_access is False:
            severed_road = True

    # 2. Fetch target Battalion
    battalion = next((b for b in NDRF_BATTALIONS if b["id"] == request.battalion_id), NDRF_BATTALIONS[0])

    # 3. Fetch Shelter
    shelter_name = "Raipur Sports Complex Staging Camp"
    shelter_cap = 1200
    if request.assigned_shelter_id:
        sh_res = await db.execute(
            select(RelocationSite).where(RelocationSite.id == request.assigned_shelter_id)
        )
        sh = sh_res.scalar_one_or_none()
        if sh:
            shelter_name = sh.name
            shelter_cap = sh.max_capacity

    # 4. Determine Authorizing Official
    authority_level = request.authority_level.upper()
    if not request.authorized_by:
        if authority_level == "NDMA" or current_user.role.value == "ADMIN":
            authorizing_officer = f"{current_user.full_name} (Member Secretary / Central Ops Director, NDMA HQ)"
            authority_label = "National Disaster Management Authority (NDMA), MHA Govt of India"
        elif authority_level == "SDMA" or current_user.role.value == "SDMA":
            authorizing_officer = f"{current_user.full_name} (State Relief Commissioner & SEOC Director, USDMA)"
            authority_label = "Uttarakhand State Disaster Management Authority (USDMA), Dehradun"
        else:
            district_name = current_user.assigned_district_name or "Dehradun"
            authorizing_officer = f"{current_user.full_name} (District Magistrate & Chairman, DDMA {district_name.title()})"
            authority_label = f"District Disaster Management Authority (DDMA), {district_name.upper()}"
    else:
        authorizing_officer = request.authorized_by
        if authority_level == "NDMA":
            authority_label = "National Disaster Management Authority (NDMA), MHA Govt of India"
        elif authority_level == "SDMA":
            authority_label = "Uttarakhand State Disaster Management Authority (USDMA), Dehradun"
        else:
            district_name = current_user.assigned_district_name or "Dehradun"
            authority_label = f"District Disaster Management Authority (DDMA), {district_name.upper()}"

    # 5. Generate Official Unique Dispatch Ref
    random_code = random.randint(1000, 9999)
    dispatch_ref = f"NDRF-MHA-{battalion['id'][:2]}BN-2026-{random_code}"
    now = datetime.datetime.now()
    now_str = now.strftime("%H:%M:%S IST")

    # 6. Build Alert Object
    new_alert: Dict[str, Any] = {
        "dispatch_id": dispatch_ref,
        "issued_at": datetime.datetime.utcnow().isoformat() + "Z",
        "authority_level": authority_level,
        "authority_label": authority_label,
        "authorized_by": authorizing_officer,
        "battalion_id": battalion["id"],
        "battalion_name": battalion["name"],
        "priority_level": request.priority_level,
        "priority_label": "P1 - Critical / Imminent Threat to Life" if "P1" in request.priority_level else "P2 - Urgent Preemptive",
        "settlement_ids": [s.id for s in settlements],
        "settlement_names": settlement_names,
        "threatened_population": total_pop,
        "vulnerable_population": total_vuln,
        "road_access_status": "SEVERED (Debris flow blocked primary corridor)" if severed_road else "RESTRICTED (Heavy saturation)",
        "recommended_route": f"Secondary bypass corridor via {shelter_name} axis",
        "assigned_shelter_id": request.assigned_shelter_id or 1,
        "assigned_shelter_name": shelter_name,
        "assigned_shelter_capacity": shelter_cap,
        "tactical_units_requested": request.tactical_units or [
            "Flood Rescue Team (FRT) & Zodiac Boats",
            "Canine Search Squad (CSSR)",
            "Paramedic Mobile Triage (MFR)",
        ],
        "tactical_directive": request.tactical_directive or (
            f"Multi-hazard red zone confirmed under DM Act Sec 34. Total {len(settlement_names)} habitations "
            f"({total_pop:,} citizens, {total_vuln:,} vulnerable). Road severed condition active. "
            f"Deploy Immediate Quick Response Teams to forward staging at {shelter_name}."
        ),
        "comms_channel": request.comms_channel or battalion.get("tactical_radio_net", "VHF Net 143.825 MHz"),
        "status": "DISPATCHED",
        "active_teams_deployed": 2,
        "eta_minutes": 25,
        "timeline": [
            {
                "time": now_str,
                "status": "DISPATCHED",
                "message": f"{authority_label} confirmed Red Zone; tactical mobilization requisition transmitted to {battalion['name']} EOC.",
                "officer": authorizing_officer,
            }
        ],
    }

    # Store in alerts list at the top
    NDRF_DISPATCHED_ALERTS.insert(0, new_alert)

    # Push to live alerts ticker
    live_alt = {
        "id": f"alt-ndrf-{now.strftime('%M%S')}",
        "severity": "CRITICAL",
        "title": f"TACTICAL ALERT: NDRF {battalion['name']} Mobilized by {authority_level}",
        "location": f"{', '.join(settlement_names[:2])} (Red Zone)",
        "timestamp": f"Just now ({now_str})",
        "details": f"Ref: {dispatch_ref} — Requisitioned {len(request.tactical_units)} specialized units for {total_pop:,} evacuees.",
        "action_required": f"NDRF QRF deploying to staging post: {shelter_name}.",
    }
    LIVE_ALERTS.insert(0, live_alt)

    # 7. Audit log
    audit_entry = AuditLog(
        user_id=current_user.id,
        action="CONFIRM_RED_ZONE_ALERT_NDRF",
        entity_type="NDRF_BATTALION",
        description=(
            f"Confirmed Red Zone for {', '.join(settlement_names)}. "
            f"Mobilized {battalion['name']} via Dispatch {dispatch_ref} under authority {authority_level}."
        ),
    )
    db.add(audit_entry)
    await db.commit()

    return {
        "success": True,
        "message": f"Tactical Requisition {dispatch_ref} successfully dispatched to {battalion['name']}.",
        "alert": new_alert,
    }


@router.patch("/alerts/{dispatch_id}/status")
async def update_ndrf_status(
    dispatch_id: str,
    request: NDRFStatusUpdateRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Updates the operational deployment status of an NDRF alert
    (e.g., ACKNOWLEDGED -> MOBILIZING -> EN_ROUTE -> ON_SCENE_ACTIVE).
    """
    alert = next((a for a in NDRF_DISPATCHED_ALERTS if a["dispatch_id"] == dispatch_id), None)
    if not alert:
        raise HTTPException(status_code=404, detail=f"NDRF Alert {dispatch_id} not found.")

    valid_statuses = ["DISPATCHED", "ACKNOWLEDGED", "MOBILIZING", "EN_ROUTE", "ON_SCENE_ACTIVE", "STANDBY", "COMPLETED"]
    if request.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {valid_statuses}")

    now_str = datetime.datetime.now().strftime("%H:%M:%S IST")
    alert["status"] = request.status

    if request.eta_minutes is not None:
        alert["eta_minutes"] = request.eta_minutes
    if request.active_teams is not None:
        alert["active_teams_deployed"] = request.active_teams

    # Add to timeline
    alert["timeline"].append({
        "time": now_str,
        "status": request.status,
        "message": request.message,
        "officer": request.officer_name or current_user.full_name,
    })

    # Add notification to LIVE_ALERTS
    LIVE_ALERTS.insert(0, {
        "id": f"alt-ndrf-status-{datetime.datetime.now().strftime('%M%S')}",
        "severity": "INFO" if request.status in ["ACKNOWLEDGED", "MOBILIZING"] else "WARNING" if request.status == "EN_ROUTE" else "CRITICAL",
        "title": f"NDRF UPDATE [{alert['battalion_name']}]: {request.status}",
        "location": f"{alert['settlement_names'][0]} Tactical Sector",
        "timestamp": f"Just now ({now_str})",
        "details": f"{request.message} (Dispatch: {dispatch_id})",
        "action_required": "Track field rescue team positions and shelter triage readiness.",
    })

    # Audit log
    audit_entry = AuditLog(
        user_id=current_user.id,
        action=f"NDRF_STATUS_{request.status}",
        entity_type="NDRF_BATTALION",
        description=f"Updated {dispatch_id} status to {request.status}: {request.message}",
    )
    db.add(audit_entry)
    await db.commit()

    return {
        "success": True,
        "dispatch_id": dispatch_id,
        "status": request.status,
        "timeline": alert["timeline"],
        "alert": alert,
    }
