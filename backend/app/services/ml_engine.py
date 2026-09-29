"""
SafeTerra — AI/ML Multi-Hazard Assessment Engine

Simulates earth observation telemetry (Sentinel-2 MSI, Sentinel-1 C-SAR, DEM)
and combines physical hazard intensity with demographic vulnerability and
infrastructure isolation to predict:
  - Multi-hazard Risk Score (0–100)
  - Hazard Zone Classification ("RED", "BUFFER", "SAFE")
  - Relocation Priority ("IMMEDIATE", "SHORT_TERM", "MEDIUM_TERM", "MONITOR")
  - Explainable AI (XAI) risk drivers for SDMA / NDRF decision makers.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class EnvironmentalTelemetry:
    """Satellite earth observation & weather telemetry parameters."""
    rainfall_mm_per_hr: float = 35.0         # IMD radar / AWS gauge
    slope_angle_degrees: float = 24.0        # Sentinel/SRTM DEM 12.5m
    ndvi_vegetation_index: float = 0.55      # Sentinel-2 Band 8/Band 4 (-1 to +1)
    ndwi_water_index: float = 0.20           # Sentinel-2 Band 3/Band 8 (water accumulation)
    sar_soil_moisture_db: float = -12.0      # Sentinel-1 C-band backscatter (wet soil: -8 to -14)
    past_landslide_events: int = 1           # GSI historical landslide records


@dataclass
class DemographicProfile:
    """Habitation demographic vulnerability indicators."""
    total_population: int = 500
    vulnerable_population: int = 150
    elderly_count: int = 50
    children_count: int = 80
    disabled_count: int = 20
    road_access: bool = True
    healthcare_distance_km: float = 5.0
    shelter_distance_km: float = 4.0


@dataclass
class MLAssessmentResult:
    """Output of the multi-hazard AI evaluation."""
    risk_score: float
    vulnerability_score: float
    hazard_intensity_score: float
    hazard_status: str       # "RED" | "BUFFER" | "SAFE"
    priority_level: str      # "IMMEDIATE" | "SHORT_TERM" | "MEDIUM_TERM" | "MONITOR"
    confidence: float
    contributing_factors: List[str]
    satellite_telemetry: Dict[str, Any]


class MultiHazardMLEngine:
    """
    AI decision support engine computing composite multi-hazard risk.
    Formula integrates physical exposure, social vulnerability, and coping capacity.
    """

    @classmethod
    def evaluate(
        cls,
        env: EnvironmentalTelemetry,
        demo: DemographicProfile,
        base_hazard_type: str = "Landslide & Flash Flood",
    ) -> MLAssessmentResult:
        factors: List[str] = []

        # ── 1. Physical Hazard Intensity (H) [0–100] ───────────────
        # Slope factor: slopes > 25 degrees in Himalayan debris have steep non-linear landslide probability
        slope_factor = min(1.0, max(0.0, (env.slope_angle_degrees - 10.0) / 25.0))
        if env.slope_angle_degrees >= 30.0:
            factors.append(f"Steep Terrain Gradient: {env.slope_angle_degrees:.1f}°")

        # Rainfall factor: > 60mm/hr is cloudburst threshold in Himalayas
        rain_factor = min(1.0, max(0.0, env.rainfall_mm_per_hr / 100.0))
        if env.rainfall_mm_per_hr >= 70.0:
            factors.append(f"Extreme Monsoon Precipitation: {env.rainfall_mm_per_hr:.1f} mm/hr (Cloudburst Trigger)")
        elif env.rainfall_mm_per_hr >= 40.0:
            factors.append(f"Heavy Rainfall: {env.rainfall_mm_per_hr:.1f} mm/hr")

        # Soil saturation / loss of canopy: lower NDVI + higher NDWI = unstable saturated debris
        soil_unstable = (1.0 - max(0.0, env.ndvi_vegetation_index)) * 0.5 + max(0.0, env.ndwi_water_index) * 0.5
        soil_factor = min(1.0, max(0.0, soil_unstable))
        if env.ndwi_water_index > 0.35:
            factors.append("Sentinel-2 High Surface Soil Moisture (NDWI > 0.35)")

        # Historical recurrence
        history_factor = min(1.0, env.past_landslide_events * 0.25)
        if env.past_landslide_events >= 2:
            factors.append(f"GSI Recurrent Hazard Zone ({env.past_landslide_events} prior occurrences)")

        hazard_intensity = (
            0.40 * rain_factor +
            0.35 * slope_factor +
            0.15 * soil_factor +
            0.10 * history_factor
        ) * 100.0

        # ── 2. Demographic Vulnerability (V) [0–100] ───────────────
        vuln_ratio = demo.vulnerable_population / max(1, demo.total_population)
        if vuln_ratio >= 0.25:
            factors.append(f"High Vulnerable Demographic ({vuln_ratio * 100.0:.1f}% children/elderly/disabled)")

        density_scale = min(1.0, demo.total_population / 1500.0)
        vulnerability = (0.65 * vuln_ratio + 0.35 * density_scale) * 100.0

        # ── 3. Infrastructure Isolation Index (I) [0–100] ──────────
        road_cut = 1.0 if not demo.road_access else 0.0
        if not demo.road_access:
            factors.append("Critical Road Access Severed / Road cut-off")

        med_iso = min(1.0, demo.healthcare_distance_km / 15.0)
        if demo.healthcare_distance_km > 10.0:
            factors.append(f"Healthcare Facility Distance: {demo.healthcare_distance_km:.1f} km")

        shelter_iso = min(1.0, demo.shelter_distance_km / 10.0)
        isolation = (0.50 * road_cut + 0.30 * med_iso + 0.20 * shelter_iso) * 100.0

        # ── 4. Composite Risk Score [0–100] ────────────────────────
        # Weighting: 50% Hazard Intensity, 30% Social Vulnerability, 20% Isolation
        composite_risk = (
            0.50 * hazard_intensity +
            0.30 * vulnerability +
            0.20 * isolation
        )
        composite_risk = round(min(100.0, max(0.0, composite_risk)), 1)

        # ── 5. Classification & Prioritization ────────────────────
        if composite_risk >= 68.0 or (hazard_intensity >= 75.0 and road_cut > 0) or hazard_intensity >= 84.0:
            status = "RED"
            priority = "IMMEDIATE"
        elif composite_risk >= 50.0:
            status = "BUFFER"
            priority = "SHORT_TERM" if composite_risk >= 60.0 else "MEDIUM_TERM"
        else:
            status = "SAFE"
            priority = "MONITOR"

        if not factors:
            factors.append("Standard baseline environmental parameters")

        telemetry = {
            "satellite_source": "Copernicus Sentinel-2 (MSI) & Sentinel-1 (C-SAR)",
            "dem_source": "Bhuvan / ALOS PALSAR 12.5m DEM",
            "last_satellite_pass": "2026-09-16 06:42 UTC",
            "rainfall_rate_mm_hr": env.rainfall_mm_per_hr,
            "slope_degrees": env.slope_angle_degrees,
            "ndvi": round(env.ndvi_vegetation_index, 2),
            "ndwi": round(env.ndwi_water_index, 2),
            "sar_backscatter_db": env.sar_soil_moisture_db,
            "resolution": "10m multispectral",
        }

        return MLAssessmentResult(
            risk_score=composite_risk,
            vulnerability_score=round(vulnerability, 1),
            hazard_intensity_score=round(hazard_intensity, 1),
            hazard_status=status,
            priority_level=priority,
            confidence=0.92,
            contributing_factors=factors,
            satellite_telemetry=telemetry,
        )
