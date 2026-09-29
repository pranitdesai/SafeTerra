"""
SafeTerra — Seed Demo Data (Settlements, Relocation Sites, Hazards)

Seeds realistic habitations, safer alternative shelters, and hazard zones
in Dehradun District, Uttarakhand for SIH Problem Statement 26191.
"""

from __future__ import annotations

from geoalchemy2.shape import from_shape
from shapely.geometry import MultiPolygon, Point, Polygon
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.models.administrative import District, State
from app.models.hazard import Hazard
from app.models.relocation_site import RelocationSite
from app.models.settlement import Settlement

logger = get_logger(__name__)


async def seed_demo_data(session: AsyncSession) -> None:
    """Seed authentic settlements, relocation shelters, and hazard polygons."""

    # 1. Fetch Dehradun district
    dist_res = await session.execute(select(District).where(District.name == "Dehradun"))
    district = dist_res.scalar_one_or_none()
    if not district:
        logger.warning("dehradun_district_not_found_skipping_demo_seed")
        return

    # Check if settlements already seeded
    settle_check = await session.execute(select(Settlement).where(Settlement.district_id == district.id))
    if settle_check.scalars().first():
        logger.info("demo_data_already_seeded")
        return

    # 2. Seed Settlements
    settlements_data = [
        {
            "name": "Kholi Village",
            "lat": 30.337,
            "lon": 78.007,
            "pop": 480,
            "households": 96,
            "vulnerable": 165,
            "elderly": 62,
            "children": 88,
            "disabled": 15,
            "road_access": True,
            "nearest_healthcare": 8.5,
            "nearest_shelter": 6.2,
            "status": "RED",
            "risk_score": 88.5,
            "vulnerability_score": 82.0,
            "priority": "IMMEDIATE",
        },
        {
            "name": "Maldevta Habitation",
            "lat": 30.366,
            "lon": 78.104,
            "pop": 850,
            "households": 170,
            "vulnerable": 290,
            "elderly": 110,
            "children": 155,
            "disabled": 25,
            "road_access": False,
            "nearest_healthcare": 12.0,
            "nearest_shelter": 7.8,
            "status": "RED",
            "risk_score": 91.2,
            "vulnerability_score": 89.0,
            "priority": "IMMEDIATE",
        },
        {
            "name": "Sahastradhara Settlement",
            "lat": 30.384,
            "lon": 78.129,
            "pop": 620,
            "households": 124,
            "vulnerable": 210,
            "elderly": 75,
            "children": 115,
            "disabled": 20,
            "road_access": True,
            "nearest_healthcare": 9.5,
            "nearest_shelter": 5.4,
            "status": "RED",
            "risk_score": 84.0,
            "vulnerability_score": 79.5,
            "priority": "IMMEDIATE",
        },
        {
            "name": "Mussoorie Ridge Habitation",
            "lat": 30.459,
            "lon": 78.066,
            "pop": 1250,
            "households": 250,
            "vulnerable": 340,
            "elderly": 130,
            "children": 185,
            "disabled": 25,
            "road_access": True,
            "nearest_healthcare": 4.5,
            "nearest_shelter": 3.0,
            "status": "BUFFER",
            "risk_score": 67.5,
            "vulnerability_score": 62.0,
            "priority": "SHORT_TERM",
        },
        {
            "name": "Barkot Habitation",
            "lat": 30.842,
            "lon": 78.156,
            "pop": 740,
            "households": 148,
            "vulnerable": 220,
            "elderly": 80,
            "children": 125,
            "disabled": 15,
            "road_access": True,
            "nearest_healthcare": 7.0,
            "nearest_shelter": 6.0,
            "status": "BUFFER",
            "risk_score": 62.0,
            "vulnerability_score": 58.0,
            "priority": "SHORT_TERM",
        },
        {
            "name": "Kalsi Riverbank Habitation",
            "lat": 30.533,
            "lon": 77.850,
            "pop": 980,
            "households": 196,
            "vulnerable": 280,
            "elderly": 105,
            "children": 150,
            "disabled": 25,
            "road_access": True,
            "nearest_healthcare": 6.5,
            "nearest_shelter": 5.2,
            "status": "BUFFER",
            "risk_score": 58.0,
            "vulnerability_score": 55.0,
            "priority": "SHORT_TERM",
        },
        {
            "name": "Sundarpur Habitation",
            "lat": 30.294,
            "lon": 78.078,
            "pop": 510,
            "households": 102,
            "vulnerable": 140,
            "elderly": 50,
            "children": 78,
            "disabled": 12,
            "road_access": True,
            "nearest_healthcare": 3.2,
            "nearest_shelter": 2.5,
            "status": "BUFFER",
            "risk_score": 54.0,
            "vulnerability_score": 49.0,
            "priority": "MEDIUM_TERM",
        },
        {
            "name": "Doiwala Lowland Settlement",
            "lat": 30.178,
            "lon": 78.121,
            "pop": 1400,
            "households": 280,
            "vulnerable": 310,
            "elderly": 120,
            "children": 165,
            "disabled": 25,
            "road_access": True,
            "nearest_healthcare": 2.0,
            "nearest_shelter": 1.5,
            "status": "SAFE",
            "risk_score": 24.0,
            "vulnerability_score": 22.0,
            "priority": "MONITOR",
        },
        {
            "name": "Vikasnagar Plain Settlement",
            "lat": 30.498,
            "lon": 77.771,
            "pop": 2200,
            "households": 440,
            "vulnerable": 430,
            "elderly": 160,
            "children": 235,
            "disabled": 35,
            "road_access": True,
            "nearest_healthcare": 1.5,
            "nearest_shelter": 1.2,
            "status": "SAFE",
            "risk_score": 18.5,
            "vulnerability_score": 19.0,
            "priority": "MONITOR",
        },
        {
            "name": "Rishikesh Foothills Settlement",
            "lat": 30.108,
            "lon": 78.293,
            "pop": 1650,
            "households": 330,
            "vulnerable": 380,
            "elderly": 140,
            "children": 205,
            "disabled": 35,
            "road_access": True,
            "nearest_healthcare": 2.8,
            "nearest_shelter": 2.0,
            "status": "SAFE",
            "risk_score": 28.0,
            "vulnerability_score": 26.0,
            "priority": "MONITOR",
        },
    ]

    for s in settlements_data:
        pt = Point(s["lon"], s["lat"])
        settlement = Settlement(
            name=s["name"],
            state_id=district.state_id,
            district_id=district.id,
            latitude=s["lat"],
            longitude=s["lon"],
            geometry=from_shape(pt, srid=4326),
            population=s["pop"],
            households=s["households"],
            population_density=float(s["pop"]) / 0.5,
            vulnerable_population=s["vulnerable"],
            elderly_population=s["elderly"],
            children_population=s["children"],
            disabled_population=s["disabled"],
            road_access=s["road_access"],
            nearest_healthcare_distance=s["nearest_healthcare"],
            nearest_shelter_distance=s["nearest_shelter"],
            water_access=True,
            electricity_access=True,
            sanitation_access=True,
            current_hazard_status=s["status"],
            risk_score=s["risk_score"],
            vulnerability_score=s["vulnerability_score"],
            priority_level=s["priority"],
        )
        session.add(settlement)

    # 3. Seed Relocation Sites (Carrying Capacity)
    sites_data = [
        {
            "name": "Raipur Rajiv Gandhi Sports Complex",
            "facility_type": "Indoor Stadium & Shelter",
            "lat": 30.309,
            "lon": 78.085,
            "max_capacity": 1500,
            "current_occupancy": 350,
            "water": True,
            "sanitation": True,
            "medical": True,
            "electricity": True,
            "kitchen": True,
            "score": 95.0,
        },
        {
            "name": "Parade Ground Multi-Purpose Camp",
            "facility_type": "Relief Staging Ground",
            "lat": 30.324,
            "lon": 78.043,
            "max_capacity": 2000,
            "current_occupancy": 420,
            "water": True,
            "sanitation": True,
            "medical": True,
            "electricity": True,
            "kitchen": True,
            "score": 92.0,
        },
        {
            "name": "Dehradun Community Relief Center",
            "facility_type": "Community Hall",
            "lat": 30.316,
            "lon": 78.032,
            "max_capacity": 800,
            "current_occupancy": 210,
            "water": True,
            "sanitation": True,
            "medical": True,
            "electricity": True,
            "kitchen": False,
            "score": 88.0,
        },
        {
            "name": "Vikasnagar Govt Degree College",
            "facility_type": "Institutional Shelter",
            "lat": 30.492,
            "lon": 77.780,
            "max_capacity": 1200,
            "current_occupancy": 150,
            "water": True,
            "sanitation": True,
            "medical": True,
            "electricity": True,
            "kitchen": True,
            "score": 90.0,
        },
        {
            "name": "Mussoorie Municipal Relief Hall",
            "facility_type": "Civic Facility",
            "lat": 30.453,
            "lon": 78.075,
            "max_capacity": 600,
            "current_occupancy": 380,
            "water": True,
            "sanitation": True,
            "medical": False,
            "electricity": True,
            "kitchen": True,
            "score": 78.0,
        },
        {
            "name": "Doiwala Public Health Facility Center",
            "facility_type": "Medical Relief Center",
            "lat": 30.172,
            "lon": 78.128,
            "max_capacity": 900,
            "current_occupancy": 180,
            "water": True,
            "sanitation": True,
            "medical": True,
            "electricity": True,
            "kitchen": True,
            "score": 89.0,
        },
    ]

    for s in sites_data:
        pt = Point(s["lon"], s["lat"])
        site = RelocationSite(
            name=s["name"],
            district_id=district.id,
            facility_type=s["facility_type"],
            latitude=s["lat"],
            longitude=s["lon"],
            geometry=from_shape(pt, srid=4326),
            max_capacity=s["max_capacity"],
            current_occupancy=s["current_occupancy"],
            water_available=s["water"],
            sanitation_available=s["sanitation"],
            medical_facilities=s["medical"],
            electricity_available=s["electricity"],
            kitchen_available=s["kitchen"],
            is_active=True,
            site_suitability_score=s["score"],
        )
        session.add(site)

    # 4. Seed Multi-Hazard Zones
    hazards_data = [
        {
            "hazard_type": "Landslide Hazard Zone",
            "intensity": "Severe",
            "probability": 0.88,
            "severity": "Critical",
            "source": "Sentinel-2 SAR & Geological Survey of India",
            "confidence": 0.94,
            "polygon": [
                (78.095, 30.355),
                (78.115, 30.375),
                (78.125, 30.365),
                (78.105, 30.345),
                (78.095, 30.355),
            ],
        },
        {
            "hazard_type": "Flash Flood Inundation Buffer",
            "intensity": "High",
            "probability": 0.82,
            "severity": "High",
            "source": "Sentinel-2 Optical & IMD Doppler Radar",
            "confidence": 0.91,
            "polygon": [
                (78.118, 30.370),
                (78.138, 30.395),
                (78.145, 30.385),
                (78.125, 30.360),
                (78.118, 30.370),
            ],
        },
    ]

    for h in hazards_data:
        geom = MultiPolygon([Polygon(h["polygon"])])
        hazard = Hazard(
            hazard_type=h["hazard_type"],
            intensity=h["intensity"],
            probability=h["probability"],
            severity=h["severity"],
            source=h["source"],
            confidence=h["confidence"],
            date_recorded="2026-09-16",
            data_version="v2.4-sentinel2",
            status="ACTIVE",
            geometry=from_shape(geom, srid=4326),
        )
        session.add(hazard)

    await session.commit()
    logger.info("seeded_demo_data_successfully")
