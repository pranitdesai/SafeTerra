"""
Kavach — Seed Administrative Hierarchy

Seeds: Uttarakhand → Dehradun District → Blocks → Tehsils
Uses real administrative data with approximate boundary geometry.

NOTE: Geometry data is simplified demo-quality. For production, use
Survey of India or Census boundary shapefiles.
"""

from __future__ import annotations

from geoalchemy2.shape import from_shape
from shapely.geometry import MultiPolygon, Polygon
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.models.administrative import Block, District, State, Tehsil

logger = get_logger(__name__)


async def seed_admin_hierarchy(session: AsyncSession) -> None:
    """Seed Uttarakhand state, Dehradun district, blocks, and tehsils."""

    # ── Check if already seeded ─────────────────────────────
    existing = await session.execute(select(State).where(State.code == "UK"))
    if existing.scalar_one_or_none():
        logger.info("admin_hierarchy_already_seeded")
        return

    # ── 1. Uttarakhand State ────────────────────────────────
    # Simplified bounding polygon for Uttarakhand (WGS84)
    uttarakhand_geom = MultiPolygon([
        Polygon([
            (77.57, 28.73), (77.57, 31.45), (81.03, 31.45),
            (81.03, 28.73), (77.57, 28.73)
        ])
    ])

    uttarakhand = State(
        name="Uttarakhand",
        code="UK",
        geometry=from_shape(uttarakhand_geom, srid=4326),
    )
    session.add(uttarakhand)
    await session.flush()

    logger.info("seeded_state", name="Uttarakhand", id=uttarakhand.id)

    # ── 2. Dehradun District ────────────────────────────────
    # More detailed boundary approximation for Dehradun district
    dehradun_geom = MultiPolygon([
        Polygon([
            (77.70, 30.05), (77.70, 30.55), (77.80, 30.70),
            (78.00, 30.80), (78.20, 30.75), (78.30, 30.60),
            (78.35, 30.45), (78.25, 30.25), (78.10, 30.10),
            (77.90, 30.05), (77.70, 30.05)
        ])
    ])

    dehradun = District(
        name="Dehradun",
        code="UK001",
        state_id=uttarakhand.id,
        headquarters="Dehradun",
        area_sq_km=3088.0,
        population=1696694,  # Census 2011 figure
        geometry=from_shape(dehradun_geom, srid=4326),
    )
    session.add(dehradun)
    await session.flush()

    logger.info("seeded_district", name="Dehradun", id=dehradun.id)

    # ── 3. Dehradun Blocks ──────────────────────────────────
    # Real block names from Dehradun district
    block_data = [
        {"name": "Chakrata", "code": "UK001-BLK01"},
        {"name": "Kalsi", "code": "UK001-BLK02"},
        {"name": "Vikasnagar", "code": "UK001-BLK03"},
        {"name": "Sahaspur", "code": "UK001-BLK04"},
        {"name": "Raipur", "code": "UK001-BLK05"},
        {"name": "Doiwala", "code": "UK001-BLK06"},
    ]

    blocks = {}
    for bd in block_data:
        block = Block(
            name=bd["name"],
            code=bd["code"],
            district_id=dehradun.id,
        )
        session.add(block)
        await session.flush()
        blocks[bd["name"]] = block

    logger.info("seeded_blocks", count=len(blocks))

    # ── 4. Dehradun Tehsils ─────────────────────────────────
    # Real tehsil names mapped to their parent blocks
    tehsil_data = [
        {"name": "Chakrata", "block": "Chakrata"},
        {"name": "Tyuni", "block": "Chakrata"},
        {"name": "Kalsi", "block": "Kalsi"},
        {"name": "Vikasnagar", "block": "Vikasnagar"},
        {"name": "Sahaspur", "block": "Sahaspur"},
        {"name": "Dehradun", "block": "Raipur"},
        {"name": "Raipur", "block": "Raipur"},
        {"name": "Doiwala", "block": "Doiwala"},
        {"name": "Rishikesh", "block": "Doiwala"},
    ]

    tehsil_count = 0
    for td in tehsil_data:
        parent_block = blocks.get(td["block"])
        if parent_block:
            tehsil = Tehsil(
                name=td["name"],
                code=f"{parent_block.code}-T{tehsil_count + 1:02d}",
                block_id=parent_block.id,
            )
            session.add(tehsil)
            tehsil_count += 1

    await session.flush()
    logger.info("seeded_tehsils", count=tehsil_count)
    logger.info("admin_hierarchy_seed_complete")
