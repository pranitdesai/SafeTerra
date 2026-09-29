"""
SafeTerra — Hazard Database Model

Represents different hazards (flood, landslide, etc.) with PostGIS geometry.
"""

from __future__ import annotations

from typing import Optional

from geoalchemy2 import Geometry
from sqlalchemy import Date, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import BaseModel


class Hazard(BaseModel):
    """Multi-hazard entity with PostGIS geometry."""

    __tablename__ = "hazards"

    hazard_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    intensity: Mapped[str] = mapped_column(String(50), nullable=False)
    probability: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    severity: Mapped[str] = mapped_column(String(50), nullable=False)
    source: Mapped[str] = mapped_column(String(255), nullable=True)
    confidence: Mapped[float] = mapped_column(Float, nullable=True)
    date_recorded: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    data_version: Mapped[str] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="ACTIVE")

    # ── Spatial Coordinates ─────────────────────────────────────
    geometry: Mapped[Optional[str]] = mapped_column(
        Geometry("MULTIPOLYGON", srid=4326), nullable=True
    )

    def __repr__(self) -> str:
        return f"<Hazard {self.hazard_type} (Severity: {self.severity})>"
