'use client'

import React, { useEffect, useState, useMemo, useRef } from 'react'
import Map, { Source, Layer, Marker, Popup, NavigationControl, FullscreenControl } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { MapPoint, Route } from './map-view'

const MAPBOX_TOKEN = 'pk.eyJ1IjoiZGhhaXJ5YXNoaWxzaGluZGUiLCJhIjoiY211MDMzdGwxMGlqYzJ6czRoYW5vcmJmbCJ9.kjqC2aR2s35jZPPgomUJuw'

type RoutedPath = Route & { roadPositions?: [number, number][]; loading?: boolean }

// Asynchronously fetch driving route from public OSRM with timeout
async function getRoadRoute(route: Route): Promise<[number, number][]> {
  if (!route.positions || route.positions.length < 2) return route.positions
  const start = route.positions[0]
  const end = route.positions[route.positions.length - 1]
  const coordinates = `${start[1]},${start[0]};${end[1]},${end[0]}`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 4000)

  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`,
      { signal: controller.signal }
    )
    clearTimeout(timeoutId)
    if (!response.ok) return route.positions
    const data = await response.json()
    const geometry = data.routes?.[0]?.geometry?.coordinates
    if (!geometry || !geometry.length) return route.positions
    // OSRM returns [longitude, latitude], convert to [latitude, longitude] to match our schema
    return geometry.map(([lng, lat]: [number, number]) => [lat, lng])
  } catch {
    clearTimeout(timeoutId)
    return route.positions
  }
}

// Polygon shapes for key hazard zones
const zoneShapes: Record<string, [number, number][]> = {
  kholi: [[30.337, 78.007], [30.342, 78.058], [30.311, 78.081], [30.283, 78.057], [30.287, 78.015], [30.337, 78.007]],
  maldevta: [[30.366, 78.104], [30.371, 78.157], [30.337, 78.181], [30.309, 78.151], [30.313, 78.112], [30.366, 78.104]],
  sahastradhara: [[30.384, 78.129], [30.395, 78.150], [30.375, 78.165], [30.365, 78.135], [30.384, 78.129]],
  mussoorie: [[30.459, 78.066], [30.474, 78.095], [30.445, 78.110], [30.435, 78.075], [30.459, 78.066]],
  barkot: [[30.842, 78.156], [30.862, 78.234], [30.823, 78.278], [30.778, 78.255], [30.775, 78.188], [30.842, 78.156]],
  sundarpur: [[30.294, 78.078], [30.311, 78.132], [30.275, 78.158], [30.238, 78.136], [30.246, 78.093], [30.294, 78.078]],
}

function generateCircularPolygon(lat: number, lon: number, radiusKm = 1.2, points = 16): [number, number][] {
  const coords: [number, number][] = []
  const latDelta = radiusKm / 111.0
  const lonDelta = radiusKm / (111.0 * Math.cos((lat * Math.PI) / 180.0))
  for (let i = 0; i <= points; i++) {
    const angle = (i * 2 * Math.PI) / points
    coords.push([lon + lonDelta * Math.cos(angle), lat + latDelta * Math.sin(angle)])
  }
  return coords
}

export function MapCanvas({
  points,
  routes = [],
  showRoutes = false,
  userDistrictName
}: {
  points: MapPoint[];
  routes?: Route[];
  showRoutes?: boolean;
  userDistrictName?: string | null;
}) {
  const mapRef = useRef<any>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [popupInfo, setPopupInfo] = useState<MapPoint | null>(null)
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/satellite-streets-v12')

  // Immediate routes state: initialized from prop, updated immediately when routes change!
  const [roadRoutes, setRoadRoutes] = useState<RoutedPath[]>([])

  useEffect(() => {
    if (!showRoutes || !routes || routes.length === 0) {
      setRoadRoutes([])
      return
    }

    // Immediately set straight lines so corridors appear on the map without any network delay
    setRoadRoutes(routes.map(r => ({ ...r, loading: true })))

    // Asynchronously enrich with OSRM road geometry
    let active = true
    Promise.all(
      routes.map(async route => {
        try {
          const positions = await getRoadRoute(route)
          return { ...route, roadPositions: positions, loading: false }
        } catch {
          return { ...route, roadPositions: route.positions, loading: false }
        }
      })
    ).then(enriched => {
      if (active) setRoadRoutes(enriched)
    })

    return () => { active = false }
  }, [routes, showRoutes])

  // Automatically fit map bounds to encompass all habitations and relocation sites
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || points.length === 0) return

    let minLng = Infinity
    let minLat = Infinity
    let maxLng = -Infinity
    let maxLat = -Infinity
    let count = 0

    points.forEach(p => {
      const lat = Number(p.position[0])
      const lng = Number(p.position[1])
      if (isNaN(lat) || isNaN(lng)) return
      count++
      if (lng < minLng) minLng = lng
      if (lng > maxLng) maxLng = lng
      if (lat < minLat) minLat = lat
      if (lat > maxLat) maxLat = lat
    })

    if (count > 0 && mapRef.current) {
      const padding = 0.04
      try {
        mapRef.current.fitBounds(
          [
            [minLng - padding, minLat - padding],
            [maxLng + padding, maxLat + padding]
          ],
          { padding: 50, duration: 1200, maxZoom: 12 }
        )
      } catch (err) {
        console.warn('fitBounds skipped:', err)
      }
    }
  }, [points, mapLoaded])

  // GeoJSON for Hazard Red/Buffer polygons
  const hazardsGeoJSON: any = useMemo(() => {
    const hazardPoints = points.filter(p => p.kind === 'hazard')
    return {
      type: 'FeatureCollection',
      features: hazardPoints.map(point => {
        const nameLower = point.name.toLowerCase()
        const key = Object.keys(zoneShapes).find(k => nameLower.includes(k))
        let coords: [number, number][]

        if (key && zoneShapes[key]) {
          // zoneShapes are [lat, lon], map to [lon, lat] for GeoJSON
          coords = zoneShapes[key].map(c => [c[1], c[0]] as [number, number])
        } else {
          coords = generateCircularPolygon(point.position[0], point.position[1], 1.0)
        }

        return {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [coords]
          },
          properties: {
            id: point.id,
            name: point.name,
            status: point.status || 'RED',
            color: point.status === 'RED' ? '#ef4444' : point.status === 'BUFFER' ? '#f59e0b' : '#10b981'
          }
        }
      })
    }
  }, [points])

  // GeoJSON for Relocation Shelter Safe Zones (Buffer polygons around shelters)
  const sheltersGeoJSON: any = useMemo(() => {
    const sitePoints = points.filter(p => p.kind === 'site')
    return {
      type: 'FeatureCollection',
      features: sitePoints.map(point => {
        const coords = generateCircularPolygon(point.position[0], point.position[1], 0.8)
        return {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [coords]
          },
          properties: {
            id: point.id,
            name: point.name
          }
        }
      })
    }
  }, [points])

  // GeoJSON for Dynamic Evacuation Routes
  const routesGeoJSON: any = useMemo(() => {
    if (!showRoutes || roadRoutes.length === 0) return null

    const features = roadRoutes.map((route, idx) => {
      const path = route.roadPositions || route.positions
      // Each point in path is [lat, lon], convert to [lon, lat] for GeoJSON
      const coordinates = path
        .map(pt => [Number(pt[1]), Number(pt[0])] as [number, number])
        .filter(c => !isNaN(c[0]) && !isNaN(c[1]))

      return {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates
        },
        properties: {
          index: idx,
          from: route.from,
          to: route.to,
          isPrimary: idx === 0
        }
      }
    })

    return {
      type: 'FeatureCollection',
      features
    }
  }, [roadRoutes, showRoutes])

  return (
    <div
      className="real-map relative overflow-hidden"
      style={{
        width: '100%',
        height: '520px',
        minHeight: '520px',
        position: 'relative',
        background: '#0f172a'
      }}
    >
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          longitude: 78.05,
          latitude: 30.32,
          zoom: 10.5,
          pitch: 35,
          bearing: 0
        }}
        mapStyle={mapStyle}
        style={{ width: '100%', height: '100%' }}
        onLoad={() => setMapLoaded(true)}
      >
        <NavigationControl position="top-right" />
        <FullscreenControl position="top-right" />

        {/* Hazard Zone Polygons */}
        <Source id="hazards-source" type="geojson" data={hazardsGeoJSON}>
          <Layer
            id="hazards-fill"
            type="fill"
            paint={{
              'fill-color': ['get', 'color'],
              'fill-opacity': ['match', ['get', 'status'], 'RED', 0.35, 0.2]
            }}
          />
          <Layer
            id="hazards-outline"
            type="line"
            paint={{
              'line-color': ['get', 'color'],
              'line-width': 2.5
            }}
          />
        </Source>

        {/* Relocation Shelter Safe Zones */}
        <Source id="shelters-source" type="geojson" data={sheltersGeoJSON}>
          <Layer
            id="shelters-fill"
            type="fill"
            paint={{
              'fill-color': '#10b981',
              'fill-opacity': 0.18
            }}
          />
          <Layer
            id="shelters-outline"
            type="line"
            paint={{
              'line-color': '#059669',
              'line-width': 2,
              'line-dasharray': [3, 2]
            }}
          />
        </Source>

        {/* Evacuation Corridors & Road Routes */}
        {routesGeoJSON && (
          <Source id="routes-source" type="geojson" data={routesGeoJSON}>
            {/* Glowing outer casing */}
            <Layer
              id="routes-casing"
              type="line"
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
              paint={{
                'line-color': '#0284c7',
                'line-width': 7,
                'line-opacity': 0.3
              }}
            />
            {/* Main corridor line */}
            <Layer
              id="routes-core"
              type="line"
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
              paint={{
                'line-color': ['case', ['get', 'isPrimary'], '#38bdf8', '#0284c7'],
                'line-width': ['case', ['get', 'isPrimary'], 4.5, 3.5],
                'line-opacity': 0.95
              }}
            />
          </Source>
        )}

        {/* Interactive Point Markers */}
        {points.map(point => {
          const lat = Number(point.position[0])
          const lng = Number(point.position[1])
          if (isNaN(lat) || isNaN(lng)) return null

          const isHazard = point.kind === 'hazard'
          const isRed = point.status === 'RED'

          return (
            <Marker
              key={point.id}
              longitude={lng}
              latitude={lat}
              anchor="center"
              onClick={(e: any) => {
                e.originalEvent.stopPropagation()
                setPopupInfo(point)
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: isHazard ? (isRed ? '#b91c1c' : '#d97706') : '#047857',
                  color: '#ffffff',
                  padding: '4px 8px',
                  borderRadius: '16px',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
                  border: '1.5px solid rgba(255,255,255,0.9)',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: '700',
                  whiteSpace: 'nowrap',
                  transform: 'scale(0.95)',
                  transition: 'transform 0.15s ease'
                }}
                title={point.name}
              >
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: '#ffffff',
                    display: 'inline-block'
                  }}
                />
                <span>{point.name}</span>
                {!isHazard && point.capacity && (
                  <span style={{ background: 'rgba(0,0,0,0.25)', padding: '1px 5px', borderRadius: '8px', fontSize: '9px' }}>
                    {point.capacity}
                  </span>
                )}
              </div>
            </Marker>
          )
        })}

        {/* Detailed Popup */}
        {popupInfo && (
          <Popup
            longitude={Number(popupInfo.position[1])}
            latitude={Number(popupInfo.position[0])}
            anchor="top"
            onClose={() => setPopupInfo(null)}
            closeOnClick={false}
            offset={14}
          >
            <div style={{ padding: '6px', minWidth: '180px', color: '#1e293b' }}>
              <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>
                {popupInfo.name}
              </div>
              {popupInfo.kind === 'hazard' ? (
                <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Zone Status:</span>
                    <strong style={{ color: popupInfo.status === 'RED' ? '#dc2626' : '#d97706' }}>
                      {popupInfo.status} ZONE
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Risk Score:</span>
                    <strong>{popupInfo.risk ? popupInfo.risk.toFixed(1) : 'N/A'}/100</strong>
                  </div>
                  <div style={{ marginTop: '4px', fontSize: '10px', color: '#64748b', borderTop: '1px solid #e2e8f0', paddingTop: '4px' }}>
                    Identified via Sentinel-2 & Terrain ML Analysis
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ color: '#059669', fontWeight: '700' }}>Safe Relocation Alternative</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Carrying Capacity:</span>
                    <strong>{popupInfo.capacity || 'Active'}</strong>
                  </div>
                  <div style={{ marginTop: '4px', fontSize: '10px', color: '#64748b', borderTop: '1px solid #e2e8f0', paddingTop: '4px' }}>
                    Equipped with emergency drinking water & sanitation
                  </div>
                </div>
              )}
            </div>
          </Popup>
        )}
      </Map>

      {/* Map Layer Style Selector */}
      <div
        className="absolute top-3 left-3 bg-white/95 p-2.5 rounded-lg shadow-lg z-10 flex flex-col gap-1.5 border border-gray-200"
        style={{ minWidth: '160px' }}
      >
        <label style={{ fontSize: '10px', fontWeight: '800', color: '#475569', letterSpacing: '0.05em' }}>
          SATELLITE BASEMAP
        </label>
        <select
          value={mapStyle}
          onChange={e => setMapStyle(e.target.value)}
          style={{
            fontSize: '12px',
            padding: '5px 8px',
            borderRadius: '4px',
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            color: '#1e293b',
            outline: 'none',
            fontWeight: '600'
          }}
        >
          <option value="mapbox://styles/mapbox/satellite-streets-v12">Satellite Imagery</option>
          <option value="mapbox://styles/mapbox/outdoors-v12">Topographic Terrain</option>
          <option value="mapbox://styles/mapbox/streets-v12">Street Navigation</option>
          <option value="mapbox://styles/mapbox/dark-v11">Tactical Dark</option>
        </select>
      </div>
    </div>
  )
}
