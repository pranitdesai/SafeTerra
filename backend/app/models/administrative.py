"""
Kavach — Administrative Hierarchy Models

State → District → Block → Tehsil
All support PostGIS geometry for spatial queries.
Designed for all of India — Dehradun is seed data, not a hard-coded limitation.
"""

from __future__ import annotations

from typing import Optional

from geoalchemy2 import Geometry
from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel


class State(BaseModel):
    """Indian State / Union Territory."""

    __tablename__ = "states"

    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(10), unique=True, nullable=False)
    geometry: Mapped[Optional[str]] = mapped_column(
        Geometry("MULTIPOLYGON", srid=4326), nullable=True
    )

    # ── Relationships ───────────────────────────────────────
    districts = relationship("District", back_populates="state", lazy="selectin")

    def __repr__(self) -> str:
        return f"<State {self.name}>"


class District(BaseModel):
    """Administrative District within a State."""

    __tablename__ = "districts"

    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    state_id: Mapped[int] = mapped_column(
        ForeignKey("states.id", ondelete="CASCADE"), nullable=False
    )
    headquarters: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    area_sq_km: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    population: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    geometry: Mapped[Optional[str]] = mapped_column(
        Geometry("MULTIPOLYGON", srid=4326), nullable=True
    )

    # ── Relationships ───────────────────────────────────────
    state = relationship("State", back_populates="districts", lazy="selectin")
    blocks = relationship("Block", back_populates="district", lazy="selectin")
    officers = relationship("User", back_populates="assigned_district", lazy="noload")

    def __repr__(self) -> str:
        return f"<District {self.name}>"


class Block(BaseModel):
    """Administrative Block / Community Development Block within a District."""

    __tablename__ = "blocks"

    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    district_id: Mapped[int] = mapped_column(
        ForeignKey("districts.id", ondelete="CASCADE"), nullable=False
    )
    geometry: Mapped[Optional[str]] = mapped_column(
        Geometry("MULTIPOLYGON", srid=4326), nullable=True
    )

    # ── Relationships ───────────────────────────────────────
    district = relationship("District", back_populates="blocks", lazy="selectin")
    tehsils = relationship("Tehsil", back_populates="block", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Block {self.name}>"


class Tehsil(BaseModel):
    """Administrative Tehsil / Sub-division within a Block."""

    __tablename__ = "tehsils"

    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    block_id: Mapped[int] = mapped_column(
        ForeignKey("blocks.id", ondelete="CASCADE"), nullable=False
    )
    geometry: Mapped[Optional[str]] = mapped_column(
        Geometry("MULTIPOLYGON", srid=4326), nullable=True
    )

    # ── Relationships ───────────────────────────────────────
    block = relationship("Block", back_populates="tehsils", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Tehsil {self.name}>"
