"""
Kavach — Seed Data Runner

Seeds the database with initial demo data in the correct dependency order.
Run: python -m seeds.run_seeds
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

# Ensure backend is on path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.logging import get_logger, setup_logging

logger = get_logger(__name__)


async def run_all_seeds():
    """Run all seed scripts in dependency order."""
    setup_logging(debug=True)
    logger.info("seed_start", database=settings.DATABASE_URL)

    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(
        bind=engine, class_=AsyncSession, expire_on_commit=False
    )

    async with session_factory() as session:
        # Verify database connectivity
        result = await session.execute(text("SELECT 1"))
        assert result.scalar() == 1
        logger.info("database_connected")

        # 1. Seed administrative hierarchy (states, districts, blocks, tehsils)
        from seeds.seed_admin_hierarchy import seed_admin_hierarchy
        await seed_admin_hierarchy(session)

        # 2. Seed users (admin, DDMO)
        from seeds.seed_users import seed_users
        await seed_users(session)

        await session.commit()
        logger.info("seed_complete", status="success")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run_all_seeds())
