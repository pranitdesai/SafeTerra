"""
Kavach — Seed Users

Creates deterministic demo users:
  - Admin: admin@kavach.gov.in
  - DDMO: ddmo.dehradun@kavach.gov.in (assigned to Dehradun)

Passwords are hashed at rest — never stored in plaintext.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import get_logger
from app.core.security import hash_password
from app.models.administrative import District
from app.models.user import User, UserRole

logger = get_logger(__name__)


async def seed_users(session: AsyncSession) -> None:
    """Seed admin and DDMO demo users."""

    # ── Check if already seeded ─────────────────────────────
    existing = await session.execute(
        select(User).where(User.email == settings.DEMO_ADMIN_EMAIL)
    )
    if existing.scalar_one_or_none():
        logger.info("users_already_seeded")
        return

    # ── Find Dehradun district for DDMO assignment ──────────
    result = await session.execute(
        select(District).where(District.name == "Dehradun")
    )
    dehradun = result.scalar_one_or_none()

    if dehradun is None:
        logger.error("dehradun_not_found", hint="Run seed_admin_hierarchy first")
        raise RuntimeError("Dehradun district must be seeded before users")

    # ── 1. Admin User ───────────────────────────────────────
    admin = User(
        email=settings.DEMO_ADMIN_EMAIL,
        full_name="System Administrator",
        hashed_password=hash_password(settings.DEMO_ADMIN_PASSWORD),
        role=UserRole.ADMIN,
        assigned_district_id=None,
        is_active=True,
        designation="National Administrator",
    )
    session.add(admin)

    # ── 2. SDMA — Uttarakhand (State Portal) ────────────────
    sdma = User(
        email=settings.DEMO_SDMA_EMAIL,
        full_name="Uttarakhand USDMA Controller",
        hashed_password=hash_password(settings.DEMO_SDMA_PASSWORD),
        role=UserRole.SDMA,
        assigned_district_id=None,
        is_active=True,
        designation="State Relief Commissioner & SEOC Director, USDMA",
        phone="+91-135-2710334",
    )
    session.add(sdma)

    # ── 3. DDMO — Dehradun ──────────────────────────────────
    ddmo = User(
        email=settings.DEMO_DDMO_EMAIL,
        full_name="Dehradun DDMO",
        hashed_password=hash_password(settings.DEMO_DDMO_PASSWORD),
        role=UserRole.DDMO,
        assigned_district_id=dehradun.id,
        is_active=True,
        designation="District Disaster Management Officer",
        phone="+91-135-2710000",
    )
    session.add(ddmo)

    await session.flush()
    logger.info(
        "seeded_users",
        admin_email=settings.DEMO_ADMIN_EMAIL,
        sdma_email=settings.DEMO_SDMA_EMAIL,
        ddmo_email=settings.DEMO_DDMO_EMAIL,
        ddmo_district="Dehradun",
    )
