"""
SafeTerra — Application Configuration

Loads settings from environment variables / .env file.
All secrets and connection strings are configurable, never hard-coded.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central application configuration — loaded from .env at startup."""

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parents[2] / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ─────────────────────────────────────────
    APP_NAME: str = "SafeTerra"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False

    # ── Database ────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/sih"
    DATABASE_URL_SYNC: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/sih"

    @property
    def async_database_url(self) -> str:
        """Ensure connection string uses the asyncpg driver and clean params."""
        from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

        try:
            parsed = urlparse(url)
            qs = parse_qs(parsed.query)
            needs_ssl = "sslmode" in qs or "ssl" in qs
            qs.pop("sslmode", None)
            qs.pop("channel_binding", None)
            if needs_ssl:
                qs["ssl"] = ["require"]
            new_query = urlencode(qs, doseq=True)
            url = urlunparse(parsed._replace(query=new_query))
        except Exception:
            pass
        return url

    @property
    def sync_database_url(self) -> str:
        """Ensure connection string uses psycopg2 for sync/migrations."""
        from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

        url = self.DATABASE_URL_SYNC or self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+psycopg2://", 1)
        elif url.startswith("postgresql://") and not url.startswith("postgresql+psycopg2://"):
            url = url.replace("postgresql://", "postgresql+psycopg2://", 1)

        try:
            parsed = urlparse(url)
            qs = parse_qs(parsed.query)
            qs.pop("channel_binding", None)
            new_query = urlencode(qs, doseq=True)
            url = urlunparse(parsed._replace(query=new_query))
        except Exception:
            pass
        return url

    # ── Security ────────────────────────────────────────────
    SECRET_KEY: str = "safeterra-dev-secret-key-change-in-production-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── CORS ────────────────────────────────────────────────
    CORS_ORIGINS: str = '["*"]'

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS_ORIGINS JSON string or comma-separated list into a list."""
        if self.CORS_ORIGINS == "*":
            return ["*"]
        try:
            return json.loads(self.CORS_ORIGINS)
        except (json.JSONDecodeError, TypeError):
            return [x.strip() for x in self.CORS_ORIGINS.split(",") if x.strip()] or ["*"]

    # ── Demo Credentials (for seeding only) ─────────────────
    DEMO_ADMIN_EMAIL: str = "admin@safeterra.gov.in"
    DEMO_ADMIN_PASSWORD: str = "SafeAdmin@2026"
    DEMO_SDMA_EMAIL: str = "sdma.uttarakhand@safeterra.gov.in"
    DEMO_SDMA_PASSWORD: str = "SafeSDMA@2026"
    DEMO_DDMO_EMAIL: str = "ddmo.dehradun@safeterra.gov.in"
    DEMO_DDMO_PASSWORD: str = "SafeDDMO@2026"


settings = Settings()
