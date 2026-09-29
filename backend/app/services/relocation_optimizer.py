"""
SafeTerra — Intelligent Carrying Capacity Relocation Optimizer

Solves the multi-objective capacitated relocation problem:
Matches habitations in hazard Red/Buffer zones needing relocation to the nearest
safer alternative shelters, respecting carrying capacity constraints and medical needs.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate great-circle distance between two geographic coordinates in km."""
    R = 6371.0  # Earth's radius in km
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2 +
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 2)


@dataclass
class EvacueeHabitation:
    id: int
    name: str
    latitude: float
    longitude: float
    population: int
    vulnerable_population: int
    priority_level: str  # "IMMEDIATE" | "SHORT_TERM" | "MEDIUM_TERM"
    hazard_status: str   # "RED" | "BUFFER"


@dataclass
class CandidateShelter:
    id: int
    name: str
    latitude: float
    longitude: float
    max_capacity: int
    current_occupancy: int
    water_available: bool
    medical_facilities: bool
    sanitation_available: bool
    site_suitability_score: float

    @property
    def available_capacity(self) -> int:
        return max(0, self.max_capacity - self.current_occupancy)


@dataclass
class AllocationRecord:
    habitation_id: int
    habitation_name: str
    shelter_id: int
    shelter_name: str
    people_allocated: int
    distance_km: float
    medical_facility_matched: bool
    route_positions: List[List[float]]


@dataclass
class ShelterUtilization:
    shelter_id: int
    shelter_name: str
    max_capacity: int
    starting_occupancy: int
    allocated_count: int
    final_occupancy: int
    utilization_percentage: float
    is_at_capacity: bool


@dataclass
class RelocationPlanResult:
    total_evacuees_needed: int
    total_allocated: int
    unallocated_count: int
    allocations: List[AllocationRecord]
    shelter_utilization: List[ShelterUtilization]
    evacuation_routes: List[Dict[str, Any]]


class RelocationCapacityOptimizer:
    """
    Carrying Capacity & Multi-Criteria Evacuation Routing Algorithm.
    Prioritizes IMMEDIATE habitations and vulnerable cohorts.
    """

    @classmethod
    def optimize(
        cls,
        habitations: List[EvacueeHabitation],
        shelters: List[CandidateShelter],
    ) -> RelocationPlanResult:
        # Sort habitations: IMMEDIATE first, then by highest vulnerability, then by population
        priority_weights = {"IMMEDIATE": 3, "SHORT_TERM": 2, "MEDIUM_TERM": 1, "MONITOR": 0}
        sorted_habitations = sorted(
            habitations,
            key=lambda h: (
                priority_weights.get(h.priority_level, 0),
                h.vulnerable_population,
                h.population,
            ),
            reverse=True,
        )

        # Track mutable shelter capacity during allocation
        shelter_state = {
            s.id: {
                "shelter": s,
                "remaining_capacity": s.available_capacity,
                "allocated": 0,
            }
            for s in shelters
        }

        allocations: List[AllocationRecord] = []
        routes: List[Dict[str, Any]] = []
        total_needed = sum(h.population for h in sorted_habitations)
        total_allocated = 0

        for hab in sorted_habitations:
            remaining_to_allocate = hab.population
            needs_medical = hab.vulnerable_population > (hab.population * 0.25)

            # Score each shelter for this habitation
            ranked_shelters = []
            for s_id, s_data in shelter_state.items():
                s = s_data["shelter"]
                rem_cap = s_data["remaining_capacity"]
                if rem_cap <= 0:
                    continue

                dist = haversine_distance_km(hab.latitude, hab.longitude, s.latitude, s.longitude)
                # Score: lower distance is better, medical availability is high bonus, suitability adds weight
                score = (100.0 / max(1.0, dist))
                if needs_medical and s.medical_facilities:
                    score += 50.0
                score += (s.site_suitability_score * 0.2)

                ranked_shelters.append((score, dist, s_id))

            # Sort by highest score
            ranked_shelters.sort(key=lambda x: x[0], reverse=True)

            for _, dist, s_id in ranked_shelters:
                if remaining_to_allocate <= 0:
                    break

                s_data = shelter_state[s_id]
                s = s_data["shelter"]
                can_take = min(remaining_to_allocate, s_data["remaining_capacity"])

                if can_take > 0:
                    s_data["remaining_capacity"] -= can_take
                    s_data["allocated"] += can_take
                    remaining_to_allocate -= can_take
                    total_allocated += can_take

                    rec = AllocationRecord(
                        habitation_id=hab.id,
                        habitation_name=hab.name,
                        shelter_id=s.id,
                        shelter_name=s.name,
                        people_allocated=can_take,
                        distance_km=dist,
                        medical_facility_matched=s.medical_facilities,
                        route_positions=[
                            [hab.latitude, hab.longitude],
                            [s.latitude, s.longitude],
                        ],
                    )
                    allocations.append(rec)

                    routes.append({
                        "from": hab.name,
                        "to": s.name,
                        "positions": [
                            [hab.latitude, hab.longitude],
                            [s.latitude, s.longitude],
                        ],
                        "allocated": can_take,
                        "distance_km": dist,
                    })

        # Calculate final shelter utilization
        utilization: List[ShelterUtilization] = []
        for s_id, s_data in shelter_state.items():
            s = s_data["shelter"]
            final_occ = s.current_occupancy + s_data["allocated"]
            pct = round((final_occ / max(1, s.max_capacity)) * 100.0, 1)
            utilization.append(
                ShelterUtilization(
                    shelter_id=s.id,
                    shelter_name=s.name,
                    max_capacity=s.max_capacity,
                    starting_occupancy=s.current_occupancy,
                    allocated_count=s_data["allocated"],
                    final_occupancy=final_occ,
                    utilization_percentage=pct,
                    is_at_capacity=(final_occ >= s.max_capacity),
                )
            )

        return RelocationPlanResult(
            total_evacuees_needed=total_needed,
            total_allocated=total_allocated,
            unallocated_count=max(0, total_needed - total_allocated),
            allocations=allocations,
            shelter_utilization=utilization,
            evacuation_routes=routes,
        )
