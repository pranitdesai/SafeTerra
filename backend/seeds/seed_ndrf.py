"""
SafeTerra — Seed NDRF Battalions & Default Alert

Seeds the three operational NDRF Battalions for Uttarakhand (8th, 14th, 15th BN)
and one example dispatched alert into the database.
"""

from __future__ import annotations

import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ndrf import NDRFBattalion, NDRFAlert


BATTALION_DATA = [
    {
        "battalion_code": "08-BN-NDRF",
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
        "status": "OPERATIONAL / HIGH READINESS",
        "equipment": {
            "inflatable_zodiac_boats": 28,
            "canine_search_squads": 8,
            "deep_diving_sets": 16,
            "high_altitude_mountain_gear": 60,
            "drone_reconnaissance_units": 6,
            "mobile_triage_ambulances": 10,
        },
    },
    {
        "battalion_code": "14-BN-NDRF",
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
        "status": "OPERATIONAL / STANDBY",
        "equipment": {
            "inflatable_zodiac_boats": 22,
            "canine_search_squads": 6,
            "deep_diving_sets": 12,
            "high_altitude_mountain_gear": 45,
            "drone_reconnaissance_units": 4,
            "mobile_triage_ambulances": 8,
        },
    },
    {
        "battalion_code": "15-BN-NDRF",
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
        "status": "OPERATIONAL / STANDBY",
        "equipment": {
            "inflatable_zodiac_boats": 18,
            "canine_search_squads": 4,
            "deep_diving_sets": 10,
            "high_altitude_mountain_gear": 30,
            "drone_reconnaissance_units": 3,
            "mobile_triage_ambulances": 6,
        },
    },
]


async def seed_ndrf_battalions(session: AsyncSession) -> dict[str, NDRFBattalion]:
    """Insert NDRF battalions if not already present. Returns code-->model map."""
    battalions: dict[str, NDRFBattalion] = {}
    for data in BATTALION_DATA:
        res = await session.execute(
            select(NDRFBattalion).where(NDRFBattalion.battalion_code == data["battalion_code"])
        )
        existing = res.scalar_one_or_none()
        if not existing:
            bn = NDRFBattalion(**data)
            session.add(bn)
            await session.flush()
            existing = bn
            print(f"  [OK] Seeded battalion: {data['name']}")
        else:
            print(f"  --> Battalion already exists: {data['name']}")
        battalions[existing.battalion_code] = existing
    return battalions


async def seed_ndrf_default_alert(
    session: AsyncSession, battalions: dict[str, NDRFBattalion]
) -> None:
    """Insert a representative pre-seeded alert if no alerts exist."""
    count_res = await session.execute(select(NDRFAlert))
    if count_res.scalars().first() is not None:
        print("  --> NDRF alerts already seeded, skipping.")
        return

    bn = battalions.get("08-BN-NDRF")
    if not bn:
        print("  [ERR] 8th BN not found, skipping default alert.")
        return

    now = datetime.datetime.now(datetime.timezone.utc)

    alert = NDRFAlert(
        dispatch_id="NDRF-DISPATCH-2026-08BN-4421",
        issued_at=now - datetime.timedelta(minutes=45),
        authority_level="DDMA",
        authority_label="District Disaster Management Authority (DDMA), Dehradun",
        authorized_by="Dr. R. Rajesh Kumar, IAS (District Magistrate / DDMA Chairman)",
        battalion_id=bn.id,
        battalion_code=bn.battalion_code,
        battalion_name=bn.name,
        priority_level="P1_CRITICAL_IMMEDIATE_LIFE_SAFETY",
        priority_label="P1 - Critical / Imminent Threat to Life",
        settlement_ids=[2, 3],
        settlement_names=["Maldevta Habitation", "Sahastradhara Settlement"],
        threatened_population=1470,
        vulnerable_population=500,
        road_access_status="SEVERED (Song River flash flood destroyed bridge km 14)",
        recommended_route="Thano - Bhogpur ridge bypass / Helo LZ Raipur Ground",
        assigned_shelter_id=1,
        assigned_shelter_name="Raipur Rajiv Gandhi Sports Complex",
        assigned_shelter_capacity=1500,
        tactical_units_requested=[
            "Flood Rescue Team (FRT) with 4 Inflatable Zodiac Boats",
            "Canine Search & Scent Squad (CSSR)",
            "Mountain SAR & High-Angle Stretcher Team",
            "Paramedic Mobile Triage First Responders (MFR)",
        ],
        tactical_directive=(
            "Imminent debris flow and flash flood surge confirmed by Sentinel-2 telemetry & IMD radar (98mm/hr). "
            "Song river access road impassable. Establish forward staging at Raipur and deploy Zodiacs along lower basin. "
            "Prioritize evacuation of elderly and infant citizens."
        ),
        comms_channel="VHF CH-04 (143.825 MHz) / SafeTerra Real-Time Link",
        status="EN_ROUTE",
        active_teams_deployed=3,
        eta_minutes=15,
        timeline=[
            {
                "time": (now - datetime.timedelta(minutes=45)).strftime("%H:%M:%S IST"),
                "status": "DISPATCHED",
                "message": "DDMA Dehradun confirmed Red Zone; tactical requisition order dispatched to NDRF 8th Battalion HQ.",
                "officer": "Dr. R. Rajesh Kumar, IAS",
            },
            {
                "time": (now - datetime.timedelta(minutes=38)).strftime("%H:%M:%S IST"),
                "status": "ACKNOWLEDGED",
                "message": "NDRF 8th BN Operations Room acknowledged receipt; Duty Officer alerted Commandant.",
                "officer": "Insp. Vikrant Negi (Duty Officer, 8th BN)",
            },
            {
                "time": (now - datetime.timedelta(minutes=30)).strftime("%H:%M:%S IST"),
                "status": "MOBILIZING",
                "message": "3 Quick Response Teams (QRF Team 1, Team 4, Canine Squad Alpha) mustered at RRC Dehradun with 4 Zodiac boats.",
                "officer": "Commandant P. K. Srivastava",
            },
            {
                "time": (now - datetime.timedelta(minutes=15)).strftime("%H:%M:%S IST"),
                "status": "EN_ROUTE",
                "message": "QRF Convoys deployed via Thano ridge bypass towards Raipur - Maldevta staging post. ETA 15 mins.",
                "officer": "Team Commander Insp. S. K. Pal",
            },
        ],
    )
    session.add(alert)
    print(f"  [OK] Seeded default NDRF alert: {alert.dispatch_id}")
