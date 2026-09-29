"""
SafeTerra — NDRF Battalion & Alert Database Models

Persists NDRF battalion definitions and dispatched tactical alerts
so data survives backend restarts and is queryable from the DB.
"""

from __future__ import annotations

import datetime
from typing import Optional

from sqlalchemy import (
    Boolean, DateTime, Float, ForeignKey, Integer,
    JSON, String, Text, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel


class NDRFBattalion(BaseModel):
    """Operational NDRF Battalion with equipment and readiness data."""

    __tablename__ = "ndrf_battalions"

    battalion_code: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    rrc_location: Mapped[str] = mapped_column(String(500), nullable=False)
    headquarters: Mapped[str] = mapped_column(String(255), nullable=False)
    commandant: Mapped[str] = mapped_column(String(255), nullable=False)
    duty_officer: Mapped[str] = mapped_column(String(255), nullable=False)
    operational_zone: Mapped[str] = mapped_column(String(500), nullable=False)
    contact_eoc: Mapped[str] = mapped_column(String(100), nullable=False)
    tactical_radio_net: Mapped[str] = mapped_column(String(255), nullable=False)
    satellite_uplink: Mapped[str] = mapped_column(String(255), nullable=False)

    # ── Readiness ─────────────────────────────────────────────
    personnel_strength: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    available_qrf_teams: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    deployed_teams: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(100), nullable=False, default="OPERATIONAL")

    # ── Equipment — stored as JSON ─────────────────────────────
    equipment: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    # ── Relationships ──────────────────────────────────────────
    alerts: Mapped[list["NDRFAlert"]] = relationship(
        "NDRFAlert", back_populates="battalion", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<NDRFBattalion {self.battalion_code} — {self.name}>"

    def to_dict(self) -> dict:
        return {
            "id": self.battalion_code,
            "name": self.name,
            "rrc_location": self.rrc_location,
            "headquarters": self.headquarters,
            "commandant": self.commandant,
            "duty_officer": self.duty_officer,
            "operational_zone": self.operational_zone,
            "contact_eoc": self.contact_eoc,
            "tactical_radio_net": self.tactical_radio_net,
            "satellite_uplink": self.satellite_uplink,
            "personnel_strength": self.personnel_strength,
            "available_qrf_teams": self.available_qrf_teams,
            "deployed_teams": self.deployed_teams,
            "equipment": self.equipment,
            "status": self.status,
        }


class NDRFAlert(BaseModel):
    """Tactical mobilization order dispatched by DDMA/NDMA to an NDRF Battalion."""

    __tablename__ = "ndrf_alerts"

    dispatch_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    issued_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.datetime.now(datetime.timezone.utc),
        nullable=False,
    )

    # ── Authority ─────────────────────────────────────────────
    authority_level: Mapped[str] = mapped_column(String(10), nullable=False, default="DDMA")
    authority_label: Mapped[str] = mapped_column(String(500), nullable=False)
    authorized_by: Mapped[str] = mapped_column(String(500), nullable=False)

    # ── Target Battalion ──────────────────────────────────────
    battalion_id: Mapped[int] = mapped_column(
        ForeignKey("ndrf_battalions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    battalion_code: Mapped[str] = mapped_column(String(30), nullable=False)
    battalion_name: Mapped[str] = mapped_column(String(255), nullable=False)

    # ── Priority ──────────────────────────────────────────────
    priority_level: Mapped[str] = mapped_column(String(60), nullable=False)
    priority_label: Mapped[str] = mapped_column(String(255), nullable=False)

    # ── Affected Settlements — stored as JSON arrays ───────────
    settlement_ids: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    settlement_names: Mapped[list] = mapped_column(JSON, nullable=False, default=list)

    # ── Population & Access ───────────────────────────────────
    threatened_population: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    vulnerable_population: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    road_access_status: Mapped[str] = mapped_column(String(500), nullable=False)
    recommended_route: Mapped[str] = mapped_column(String(500), nullable=False)

    # ── Shelter ───────────────────────────────────────────────
    assigned_shelter_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    assigned_shelter_name: Mapped[str] = mapped_column(String(255), nullable=False)
    assigned_shelter_capacity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # ── Tactical ──────────────────────────────────────────────
    tactical_units_requested: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    tactical_directive: Mapped[str] = mapped_column(Text, nullable=False)
    comms_channel: Mapped[str] = mapped_column(String(255), nullable=False)

    # ── Live Status ───────────────────────────────────────────
    # DISPATCHED | ACKNOWLEDGED | MOBILIZING | EN_ROUTE | ON_SCENE_ACTIVE | COMPLETED
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="DISPATCHED", index=True)
    active_teams_deployed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    eta_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # ── Timeline — stored as JSON array of dicts ──────────────
    timeline: Mapped[list] = mapped_column(JSON, nullable=False, default=list)

    # ── Relationships ──────────────────────────────────────────
    battalion: Mapped["NDRFBattalion"] = relationship(
        "NDRFBattalion", back_populates="alerts", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<NDRFAlert {self.dispatch_id} [{self.status}]>"

    def to_dict(self) -> dict:
        return {
            "dispatch_id": self.dispatch_id,
            "issued_at": self.issued_at.isoformat() + "Z",
            "authority_level": self.authority_level,
            "authority_label": self.authority_label,
            "authorized_by": self.authorized_by,
            "battalion_id": self.battalion_code,
            "battalion_name": self.battalion_name,
            "priority_level": self.priority_level,
            "priority_label": self.priority_label,
            "settlement_ids": self.settlement_ids,
            "settlement_names": self.settlement_names,
            "threatened_population": self.threatened_population,
            "vulnerable_population": self.vulnerable_population,
            "road_access_status": self.road_access_status,
            "recommended_route": self.recommended_route,
            "assigned_shelter_id": self.assigned_shelter_id,
            "assigned_shelter_name": self.assigned_shelter_name,
            "assigned_shelter_capacity": self.assigned_shelter_capacity,
            "tactical_units_requested": self.tactical_units_requested,
            "tactical_directive": self.tactical_directive,
            "comms_channel": self.comms_channel,
            "status": self.status,
            "active_teams_deployed": self.active_teams_deployed,
            "eta_minutes": self.eta_minutes,
            "timeline": self.timeline,
        }
