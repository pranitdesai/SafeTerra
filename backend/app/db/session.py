"""
SafeTerra — Async SQLAlchemy Database Session

Provides async engine + session factory for PostgreSQL/PostGIS.
"""

from __future__ import annotations

from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings

# ── Engine ──────────────────────────────────────────────────

engine = create_async_engine(
    settings.async_database_url,
    echo=settings.DEBUG,
    future=True,
    pool_size=5,
    max_overflow=5,
    pool_pre_ping=True,
    connect_args={"statement_cache_size": 0},
)

# ── Session Factory ─────────────────────────────────────────

async_session_factory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


# ── Dependency ──────────────────────────────────────────────

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency — yields an async database session."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
