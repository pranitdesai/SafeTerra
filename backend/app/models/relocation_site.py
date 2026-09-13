"""
Kavach — Relocation Site Database Model

Represents candidate safe relocation sites and their carrying capacities.
"""

from __future__ import annotations

from typing import Optional

from geoalchemy2 import Geometry
from sqlalchemy import Boolean, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel


class RelocationSite(BaseModel):
    """Candidate safe relocation site with carrying capacity."""

    __tablename__ = "relocation_sites"

    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    district_id: Mapped[int] = mapped_column(
        ForeignKey("districts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    facility_type: Mapped[str] = mapped_column(
        String(100), nullable=False, comment="e.g., School, Community Hall, Open Ground"
    )

    # ── Spatial Coordinates ─────────────────────────────────────
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    geometry: Mapped[Optional[str]] = mapped_column(
        Geometry("POINT", srid=4326), nullable=True
    )

    # ── Carrying Capacity ───────────────────────────────────────
    max_capacity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    current_occupancy: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # ── Infrastructure ──────────────────────────────────────────
    water_available: Mapped[bool] = mapped_column(Boolean, default=True)
    sanitation_available: Mapped[bool] = mapped_column(Boolean, default=True)
    medical_facilities: Mapped[bool] = mapped_column(Boolean, default=False)
    electricity_available: Mapped[bool] = mapped_column(Boolean, default=True)
    kitchen_available: Mapped[bool] = mapped_column(Boolean, default=False)

    # ── Status ──────────────────────────────────────────────────
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    site_suitability_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    # ── Relationships ───────────────────────────────────────────
    district = relationship("District", lazy="selectin")

    def __repr__(self) -> str:
        return f"<RelocationSite {self.name} (Cap: {self.current_occupancy}/{self.max_capacity})>"
