"""
SafeTerra — National Disaster Response Force (NDRF) Integration API

Provides endpoints for:
  - DDMA / NDMA Red Zone Confirmation and Tactical Alert Dispatch to NDRF Battalions
  - Live NDRF Battalion Operations monitoring (8th BN, 14th BN, 15th BN)
  - Real-time Battalion deployment status workflow (DISPATCHED -> ACKNOWLEDGED -> MOBILIZING -> EN_ROUTE -> ON_SCENE)
  - Integration with Multi-Hazard AI, Relocation Shelters, and Audit Logs

All NDRF data is now persisted in the PostgreSQL database.
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
from app.models.ndrf import NDRFAlert, NDRFBattalion
from app.models.relocation_site import RelocationSite
from app.models.settlement import Settlement
from app.models.user import User
from app.api.v1.analytics import LIVE_ALERTS

router = APIRouter(prefix="/ndrf", tags=["NDRF Battalion Integration"])


# ─────────────────────────────────────────────────────────────
# Request / Response Schemas
# ─────────────────────────────────────────────────────────────

class NDRFAlertCreateRequest(BaseModel):
    settlement_ids: List[int] = Field(..., description="List of confirmed RED Zone settlement IDs")
    authority_level: str = Field("DDMA", description="DDMA or NDMA")
    authorized_by: Optional[str] = Field(None, description="Name and title of authorizing officer")
    battalion_code: str = Field("08-BN-NDRF", description="Target NDRF Battalion code")
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
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Returns the list of operational NDRF Battalions, RRC base locations,
    personnel readiness, and available rescue equipment from the database.
    """
    res = await db.execute(select(NDRFBattalion).order_by(NDRFBattalion.id))
    battalions = res.scalars().all()
    return {
        "count": len(battalions),
        "battalions": [bn.to_dict() for bn in battalions],
    }


@router.get("/alerts")
async def get_ndrf_alerts(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Returns all active and historic tactical alerts dispatched by DDMA/NDMA
    to NDRF Battalions, including live field response status — from the database.
    """
    res = await db.execute(
        select(NDRFAlert).order_by(NDRFAlert.issued_at.desc())
    )
    alerts = res.scalars().all()
    return {
        "count": len(alerts),
        "alerts": [a.to_dict() for a in alerts],
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
    The alert is persisted to the database.
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

    # 2. Fetch target Battalion from DB
    bn_res = await db.execute(
        select(NDRFBattalion).where(NDRFBattalion.battalion_code == request.battalion_code)
    )
    battalion = bn_res.scalar_one_or_none()
    if not battalion:
        # fallback to first battalion
        fb_res = await db.execute(select(NDRFBattalion).limit(1))
        battalion = fb_res.scalar_one_or_none()
    if not battalion:
        raise HTTPException(status_code=503, detail="No NDRF battalions found in database. Run seeds first.")

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
        if authority_level == "NDMA":
            authorizing_officer = f"{current_user.full_name} (Member Secretary / Central Ops Director, NDMA HQ)"
            authority_label = "National Disaster Management Authority (NDMA), MHA Govt of India"
        elif authority_level == "SDMA":
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

    # 5. Generate Dispatch Reference
    random_code = random.randint(1000, 9999)
    dispatch_ref = f"NDRF-MHA-{battalion.battalion_code[:2]}BN-2026-{random_code}"
    now = datetime.datetime.now(datetime.timezone.utc)
    now_str = now.strftime("%H:%M:%S IST")

    # 6. Build and persist Alert
    new_alert = NDRFAlert(
        dispatch_id=dispatch_ref,
        issued_at=now,
        authority_level=authority_level,
        authority_label=authority_label,
        authorized_by=authorizing_officer,
        battalion_id=battalion.id,
        battalion_code=battalion.battalion_code,
        battalion_name=battalion.name,
        priority_level=request.priority_level,
        priority_label="P1 - Critical / Imminent Threat to Life" if "P1" in request.priority_level else "P2 - Urgent Preemptive",
        settlement_ids=[s.id for s in settlements],
        settlement_names=settlement_names,
        threatened_population=total_pop,
        vulnerable_population=total_vuln,
        road_access_status="SEVERED (Debris flow blocked primary corridor)" if severed_road else "RESTRICTED (Heavy saturation)",
        recommended_route=f"Secondary bypass corridor via {shelter_name} axis",
        assigned_shelter_id=request.assigned_shelter_id or 1,
        assigned_shelter_name=shelter_name,
        assigned_shelter_capacity=shelter_cap,
        tactical_units_requested=request.tactical_units or [
            "Flood Rescue Team (FRT) & Zodiac Boats",
            "Canine Search Squad (CSSR)",
            "Paramedic Mobile Triage (MFR)",
        ],
        tactical_directive=request.tactical_directive or (
            f"Multi-hazard red zone confirmed under DM Act Sec 34. Total {len(settlement_names)} habitations "
            f"({total_pop:,} citizens, {total_vuln:,} vulnerable). Road severed condition active. "
            f"Deploy Immediate Quick Response Teams to forward staging at {shelter_name}."
        ),
        comms_channel=request.comms_channel or battalion.tactical_radio_net,
        status="DISPATCHED",
        active_teams_deployed=2,
        eta_minutes=25,
        timeline=[
            {
                "time": now_str,
                "status": "DISPATCHED",
                "message": f"{authority_label} confirmed Red Zone; tactical mobilization requisition transmitted to {battalion.name} EOC.",
                "officer": authorizing_officer,
            }
        ],
    )
    db.add(new_alert)

    # Push to live alerts ticker
    live_alt = {
        "id": f"alt-ndrf-{now.strftime('%M%S')}",
        "severity": "CRITICAL",
        "title": f"TACTICAL ALERT: NDRF {battalion.name} Mobilized by {authority_level}",
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
            f"Mobilized {battalion.name} via Dispatch {dispatch_ref} under authority {authority_level}."
        ),
    )
    db.add(audit_entry)
    await db.commit()
    await db.refresh(new_alert)

    return {
        "success": True,
        "message": f"Tactical Requisition {dispatch_ref} successfully dispatched to {battalion.name}.",
        "alert": new_alert.to_dict(),
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
    Persists the update to the database.
    """
    res = await db.execute(
        select(NDRFAlert).where(NDRFAlert.dispatch_id == dispatch_id)
    )
    alert = res.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail=f"NDRF Alert {dispatch_id} not found.")

    valid_statuses = ["DISPATCHED", "ACKNOWLEDGED", "MOBILIZING", "EN_ROUTE", "ON_SCENE_ACTIVE", "STANDBY", "COMPLETED"]
    if request.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {valid_statuses}")

    now_str = datetime.datetime.now().strftime("%H:%M:%S IST")
    alert.status = request.status

    if request.eta_minutes is not None:
        alert.eta_minutes = request.eta_minutes
    if request.active_teams is not None:
        alert.active_teams_deployed = request.active_teams

    # Append to timeline (JSON column — must replace list to trigger SQLAlchemy change detection)
    updated_timeline = list(alert.timeline) + [
        {
            "time": now_str,
            "status": request.status,
            "message": request.message,
            "officer": request.officer_name or current_user.full_name,
        }
    ]
    alert.timeline = updated_timeline

    # Add notification to LIVE_ALERTS
    LIVE_ALERTS.insert(0, {
        "id": f"alt-ndrf-status-{datetime.datetime.now().strftime('%M%S')}",
        "severity": "INFO" if request.status in ["ACKNOWLEDGED", "MOBILIZING"] else "WARNING" if request.status == "EN_ROUTE" else "CRITICAL",
        "title": f"NDRF UPDATE [{alert.battalion_name}]: {request.status}",
        "location": f"{alert.settlement_names[0] if alert.settlement_names else 'Unknown'} Tactical Sector",
        "timestamp": f"Just now ({now_str})",
        "details": f"{request.message} (Dispatch: {dispatch_id})",
        "action_required": "Track field rescue team positions and shelter triage readiness.",
    })

    # If mission completed, update settlement evacuation state
    if request.status == "COMPLETED" and alert.settlement_ids:
        res2 = await db.execute(
            select(Settlement).where(Settlement.id.in_(alert.settlement_ids))
        )
        for s in res2.scalars().all():
            s.priority_level = "MONITOR"

    # Audit log
    audit_entry = AuditLog(
        user_id=current_user.id,
        action=f"NDRF_STATUS_{request.status}",
        entity_type="NDRF_BATTALION",
        description=f"Updated {dispatch_id} status to {request.status}: {request.message}",
    )
    db.add(audit_entry)
    await db.commit()
    await db.refresh(alert)

    return {
        "success": True,
        "dispatch_id": dispatch_id,
        "status": request.status,
        "timeline": alert.timeline,
        "alert": alert.to_dict(),
    }
