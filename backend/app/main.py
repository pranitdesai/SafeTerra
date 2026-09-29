"""
SafeTerra — FastAPI Application Entry Point

GIS-enabled disaster decision-support platform for SIH 26191.
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.auth import router as auth_router
from app.api.v1.users import router as users_router
from app.api.v1.admin_hierarchy import router as admin_hierarchy_router
from app.api.v1.settlements import router as settlements_router
from app.api.v1.hazards import router as hazards_router
from app.api.v1.relocation_sites import router as relocation_sites_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.ndrf import router as ndrf_router
from app.core.config import settings
from app.core.logging import get_logger, setup_logging

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup / shutdown lifecycle."""
    setup_logging(debug=settings.DEBUG)
    logger.info(
        "safeterra_startup",
        app_name=settings.APP_NAME,
        version=settings.APP_VERSION,
        debug=settings.DEBUG,
    )

    # Automatically create tables and seed demo data if DB is fresh
    try:
        from sqlalchemy import text, select
        from app.db.base import Base
        import app.models  # noqa: F401
        from app.db.session import engine, async_session_factory
        from app.models.user import User

        async with engine.begin() as conn:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
            await conn.run_sync(Base.metadata.create_all)
        logger.info("database_tables_ready")

        async with async_session_factory() as session:
            has_user = (await session.execute(select(User.id).limit(1))).scalar()
            if not has_user:
                logger.info("seeding_initial_demo_data")
                from seeds.seed_admin_hierarchy import seed_admin_hierarchy
                from seeds.seed_users import seed_users
                from seeds.seed_demo_data import seed_demo_data
                from seeds.seed_ndrf import seed_ndrf_battalions, seed_ndrf_default_alert

                await seed_admin_hierarchy(session)
                await seed_users(session)
                await seed_demo_data(session)
                battalions = await seed_ndrf_battalions(session)
                await seed_ndrf_default_alert(session, battalions)
                await session.commit()
                logger.info("demo_data_seeded_successfully")
    except Exception as exc:
        logger.warning("database_auto_init_notice", detail=str(exc))

    yield
    logger.info("safeterra_shutdown")


app = FastAPI(
    title="SafeTerra — Disaster Decision Support Portal",
    description=(
        "Intelligent Identification of Hazard-Based Red Zones, "
        "Carrying Capacity Assessment, and Immediate Relocation Needs "
        "for Vulnerable Habitations. (SIH Problem Statement 26191)"
    ),
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Exception Handlers ─────────────────────────────────────


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all to prevent stack traces from leaking to clients."""
    logger.error("unhandled_exception", error=str(exc), path=str(request.url))
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )


# ── Routers ─────────────────────────────────────────────────

app.include_router(auth_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(admin_hierarchy_router, prefix="/api")
app.include_router(settlements_router, prefix="/api")
app.include_router(hazards_router, prefix="/api")
app.include_router(relocation_sites_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(ndrf_router, prefix="/api")


# ── Health Check ────────────────────────────────────────────

@app.get("/api/health", tags=["System"])
async def health_check():
    """Basic health check endpoint."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }
