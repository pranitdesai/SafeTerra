"""
Kavach — Settlement Database Model

Represents habitations/settlements with demographics, infrastructure indicators,
hazard zone classification, and PostGIS geometry (Point).
"""

from __future__ import annotations

from typing import Optional

from geoalchemy2 import Geometry
from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel


class Settlement(BaseModel):
    """Habitation / Settlement entity with PostGIS Point geometry."""

    __tablename__ = "settlements"

    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    state_id: Mapped[int] = mapped_column(
        ForeignKey("states.id", ondelete="CASCADE"), nullable=False, index=True
    )
    district_id: Mapped[int] = mapped_column(
        ForeignKey("districts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    block_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("blocks.id", ondelete="SET NULL"), nullable=True, index=True
    )
    tehsil_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("tehsils.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # ── Spatial Coordinates ─────────────────────────────────────
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    geometry: Mapped[Optional[str]] = mapped_column(
        Geometry("POINT", srid=4326), nullable=True
    )

    # ── Demographics ────────────────────────────────────────────
    population: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    households: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    population_density: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    vulnerable_population: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    elderly_population: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    children_population: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    disabled_population: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # ── Infrastructure & Accessibility ──────────────────────────
    road_access: Mapped[bool] = mapped_column(Boolean, default=True)
    nearest_healthcare_distance: Mapped[float] = mapped_column(
        Float, nullable=False, default=5.0, comment="Distance in km"
    )
    nearest_shelter_distance: Mapped[float] = mapped_column(
        Float, nullable=False, default=5.0, comment="Distance in km"
    )
    nearest_school_distance: Mapped[float] = mapped_column(
        Float, nullable=False, default=2.0, comment="Distance in km"
    )
    water_access: Mapped[bool] = mapped_column(Boolean, default=True)
    electricity_access: Mapped[bool] = mapped_column(Boolean, default=True)
    sanitation_access: Mapped[bool] = mapped_column(Boolean, default=True)

    # ── Hazard & Risk Assessment Status ─────────────────────────
    # Values: "SAFE", "BUFFER", "RED"
    current_hazard_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="SAFE", index=True
    )
    risk_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    vulnerability_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    # Values: "IMMEDIATE", "SHORT_TERM", "MEDIUM_TERM", "MONITOR"
    priority_level: Mapped[str] = mapped_column(
        String(20), nullable=False, default="MONITOR", index=True
    )

    # ── Relationships ───────────────────────────────────────────
    district = relationship("District", lazy="selectin")
    block = relationship("Block", lazy="selectin")
    tehsil = relationship("Tehsil", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Settlement {self.name} (Pop: {self.population}, Zone: {self.current_hazard_status})>"
