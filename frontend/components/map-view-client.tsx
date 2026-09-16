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
  const [is3D, setIs3D] = useState(false)

  // Layer visibility toggles
  const [layerVisibility, setLayerVisibility] = useState({
    redZones: true,
    shelters: true,
    routes: true,
    labels: false
  })

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

  // Toggle 3D Terrain & Hillshade
  const handleToggle3D = () => {
    if (!mapRef.current) return
    const map = mapRef.current.getMap?.() || mapRef.current
    if (!map) return

    const next3D = !is3D
    setIs3D(next3D)

    try {
      if (next3D) {
        map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.6 })
        map.easeTo({
          pitch: 62,
          bearing: -24,
          duration: 1200
        })
      } else {
        map.setTerrain(null)
        map.easeTo({
          pitch: 0,
          bearing: 0,
          duration: 800
        })
      }
    } catch (err) {
      console.warn('3D terrain toggle notice:', err)
    }
  }

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

  // GeoJSON for Hazard Red/Buffer polygons - made much more vivid and clear
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
          coords = generateCircularPolygon(point.position[0], point.position[1], 1.2)
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

  // GeoJSON for Relocation Shelter safe boundary - kept minimal so it never obscures red zones
  const sheltersGeoJSON: any = useMemo(() => {
    const sitePoints = points.filter(p => p.kind === 'site')
    return {
      type: 'FeatureCollection',
      features: sitePoints.map(point => {
        const coords = generateCircularPolygon(point.position[0], point.position[1], 0.4)
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
        height: '560px',
        minHeight: '560px',
        position: 'relative',
        background: '#0a0f1d'
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
        onLoad={() => {
          setMapLoaded(true)
          if (is3D && mapRef.current) {
            try {
              const map = mapRef.current.getMap?.() || mapRef.current
              map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.6 })
            } catch (e) {
              console.warn(e)
            }
          }
        }}
      >
        {/* Mapbox DEM source for 3D Mountain Terrain */}
        <Source
          id="mapbox-dem"
          type="raster-dem"
          url="mapbox://mapbox.mapbox-terrain-dem-v1"
          tileSize={512}
          maxzoom={14}
        />

        {/* 3D Atmospheric Sky Dome */}
        {is3D && (
          <Layer
            id="sky"
            type="sky"
            paint={{
              'sky-type': 'atmosphere',
              'sky-atmosphere-sun': [0.0, 90.0],
              'sky-atmosphere-sun-intensity': 15
            }}
          />
        )}

        <NavigationControl position="top-right" visualizePitch={true} />
        <FullscreenControl position="top-right" />

        {/* Hazard Zone Polygons - Enhanced Visibility */}
        {layerVisibility.redZones && (
          <Source id="hazards-source" type="geojson" data={hazardsGeoJSON}>
            <Layer
              id="hazards-fill"
              type="fill"
              paint={{
                'fill-color': ['get', 'color'],
                'fill-opacity': ['match', ['get', 'status'], 'RED', 0.45, 0.25]
              }}
            />
            <Layer
              id="hazards-outline"
              type="line"
              paint={{
                'line-color': ['get', 'color'],
                'line-width': ['match', ['get', 'status'], 'RED', 3.5, 2.0],
                'line-dasharray': ['match', ['get', 'status'], 'RED', [1, 0], [2, 2]]
              }}
            />
          </Source>
        )}

        {/* Relocation Shelter Safe Zones (Subtle 0.4km boundary, non-intrusive) */}
        {layerVisibility.shelters && (
          <Source id="shelters-source" type="geojson" data={sheltersGeoJSON}>
            <Layer
              id="shelters-fill"
              type="fill"
              paint={{
                'fill-color': '#10b981',
                'fill-opacity': 0.08
              }}
            />
            <Layer
              id="shelters-outline"
              type="line"
              paint={{
                'line-color': '#10b981',
                'line-width': 1.5,
                'line-dasharray': [3, 2]
              }}
            />
          </Source>
        )}

        {/* Evacuation Corridors & Road Routes */}
        {layerVisibility.routes && routesGeoJSON && (
          <Source id="routes-source" type="geojson" data={routesGeoJSON}>
            <Layer
              id="routes-casing"
              type="line"
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
              paint={{
                'line-color': '#0369a1',
                'line-width': 7,
                'line-opacity': 0.4
              }}
            />
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

        {/* Sleek, Compact Point Markers (No bulky pills covering the map!) */}
        {points.map(point => {
          const lat = Number(point.position[0])
          const lng = Number(point.position[1])
          if (isNaN(lat) || isNaN(lng)) return null

          const isHazard = point.kind === 'hazard'
          const isRed = point.status === 'RED'

          // Render compact, non-intrusive circular icon pins
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
                className="group relative cursor-pointer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {isHazard ? (
                  // Hazard Habitation Marker: Compact 26px pulsing badge
                  <div
                    style={{
                      width: isRed ? '28px' : '22px',
                      height: isRed ? '28px' : '22px',
                      borderRadius: '50%',
                      background: isRed
                        ? 'radial-gradient(circle, #ef4444 0%, #b91c1c 100%)'
                        : 'radial-gradient(circle, #f59e0b 0%, #b45309 100%)',
                      border: '2px solid #ffffff',
                      boxShadow: isRed
                        ? '0 0 12px rgba(239, 68, 68, 0.8), 0 2px 6px rgba(0,0,0,0.5)'
                        : '0 0 8px rgba(245, 158, 11, 0.6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontSize: isRed ? '13px' : '11px',
                      fontWeight: '800',
                      transition: 'transform 0.15s ease'
                    }}
                    title={`${point.name} (${point.status || 'Hazard'})`}
                  >
                    {isRed ? '!' : '▲'}
                  </div>
                ) : (
                  // Relocation Site Marker: Sleek 24px emerald shield pin
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                      border: '2px solid #ffffff',
                      boxShadow: '0 0 10px rgba(16, 185, 129, 0.7), 0 2px 5px rgba(0,0,0,0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: '800',
                      transition: 'transform 0.15s ease'
                    }}
                    title={`${point.name} (Capacity: ${point.capacity || 'Active'})`}
                  >
                    ⛨
                  </div>
                )}

                {/* Optional subtle name tag or hover tooltip */}
                {layerVisibility.labels ? (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      marginTop: '2px',
                      background: 'rgba(15, 23, 42, 0.88)',
                      color: '#ffffff',
                      fontSize: '9px',
                      fontWeight: '600',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      whiteSpace: 'nowrap',
                      pointerEvents: 'none',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.4)'
                    }}
                  >
                    {point.name}
                  </div>
                ) : null}
              </div>
            </Marker>
          )
        })}

        {/* Detailed Inspection Popup */}
        {popupInfo && (
          <Popup
            longitude={Number(popupInfo.position[1])}
            latitude={Number(popupInfo.position[0])}
            anchor="top"
            onClose={() => setPopupInfo(null)}
            closeOnClick={false}
            offset={14}
          >
            <div style={{ padding: '8px', minWidth: '210px', color: '#1e293b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor:
                      popupInfo.kind === 'hazard'
                        ? popupInfo.status === 'RED'
                          ? '#ef4444'
                          : '#f59e0b'
                        : '#10b981'
                  }}
                />
                <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a' }}>
                  {popupInfo.name}
                </div>
              </div>

              {popupInfo.kind === 'hazard' ? (
                <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b' }}>Zone Category:</span>
                    <span
                      style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: '800',
                        color: '#ffffff',
                        background: popupInfo.status === 'RED' ? '#dc2626' : '#d97706'
                      }}
                    >
                      {popupInfo.status} ZONE
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Composite Risk Score:</span>
                    <strong>{popupInfo.risk ? popupInfo.risk.toFixed(1) : 'N/A'} / 100</strong>
                  </div>
                  <div style={{ marginTop: '4px', fontSize: '10px', color: '#64748b', borderTop: '1px solid #e2e8f0', paddingTop: '4px' }}>
                    Identified via multi-factor terrain slope, soil moisture & rainfall susceptibility.
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ color: '#059669', fontWeight: '700' }}>Designated Safe Relocation Shelter</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Carrying Capacity:</span>
                    <strong>{popupInfo.capacity || 'Active'}</strong>
                  </div>
                  <div style={{ marginTop: '4px', fontSize: '10px', color: '#64748b', borderTop: '1px solid #e2e8f0', paddingTop: '4px' }}>
                    Zero flood/landslide risk zone with medical and sanitation logistics.
                  </div>
                </div>
              )}
            </div>
          </Popup>
        )}
      </Map>

      {/* Floating Tactical Controls Overlay */}
      <div
        className="absolute top-3 left-3 flex flex-col gap-2 z-10"
        style={{ maxWidth: '240px' }}
      >
        {/* 3D Mountain Terrain Toggle Button */}
        <button
          onClick={handleToggle3D}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            padding: '8px 12px',
            borderRadius: '8px',
            background: is3D ? '#0284c7' : 'rgba(15, 23, 42, 0.88)',
            color: '#ffffff',
            border: is3D ? '1.5px solid #38bdf8' : '1px solid rgba(255,255,255,0.15)',
            boxShadow: is3D ? '0 0 16px rgba(56, 189, 248, 0.4)' : '0 4px 12px rgba(0,0,0,0.3)',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '700',
            backdropFilter: 'blur(8px)',
            transition: 'all 0.2s ease'
          }}
          title="Toggle true 3D Himalayan topographic relief and elevation view"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '15px' }}>🏔️</span>
            <span>3D Mountain Terrain</span>
          </div>
          <span
            style={{
              fontSize: '10px',
              padding: '2px 6px',
              borderRadius: '10px',
              background: is3D ? '#ffffff' : 'rgba(255,255,255,0.2)',
              color: is3D ? '#0284c7' : '#ffffff',
              fontWeight: '800'
            }}
          >
            {is3D ? 'ACTIVE' : 'OFF'}
          </span>
        </button>

        {/* GIS Basemap & Layer Filter Panel */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.90)',
            backdropFilter: 'blur(8px)',
            padding: '10px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: '#f8fafc',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            fontSize: '11px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          {/* Basemap dropdown */}
          <div>
            <div style={{ fontSize: '9px', fontWeight: '800', color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '3px' }}>
              BASEMAP STYLE
            </div>
            <select
              value={mapStyle}
              onChange={e => setMapStyle(e.target.value)}
              style={{
                width: '100%',
                fontSize: '11px',
                padding: '4px 6px',
                borderRadius: '4px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: '#1e293b',
                color: '#f8fafc',
                outline: 'none',
                fontWeight: '600'
              }}
            >
              <option value="mapbox://styles/mapbox/satellite-streets-v12">🛰️ Satellite Imagery</option>
              <option value="mapbox://styles/mapbox/outdoors-v12">⛰️ Topo & Contours</option>
              <option value="mapbox://styles/mapbox/dark-v11">🌑 Tactical Dark</option>
              <option value="mapbox://styles/mapbox/streets-v12">🗺️ Street Network</option>
            </select>
          </div>

          {/* Layer toggles */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '6px' }}>
            <div style={{ fontSize: '9px', fontWeight: '800', color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '5px' }}>
              LAYER VISIBILITY
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={layerVisibility.redZones}
                  onChange={e => setLayerVisibility(prev => ({ ...prev, redZones: e.target.checked }))}
                  style={{ accentColor: '#ef4444' }}
                />
                <span style={{ color: '#f87171', fontWeight: '600' }}>Multi-Hazard Red Zones</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={layerVisibility.shelters}
                  onChange={e => setLayerVisibility(prev => ({ ...prev, shelters: e.target.checked }))}
                  style={{ accentColor: '#10b981' }}
                />
                <span style={{ color: '#34d399', fontWeight: '600' }}>Safe Relocation Sites</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={layerVisibility.routes}
                  onChange={e => setLayerVisibility(prev => ({ ...prev, routes: e.target.checked }))}
                  style={{ accentColor: '#38bdf8' }}
                />
                <span style={{ color: '#7dd3fc', fontWeight: '600' }}>Evacuation Corridors</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={layerVisibility.labels}
                  onChange={e => setLayerVisibility(prev => ({ ...prev, labels: e.target.checked }))}
                  style={{ accentColor: '#94a3b8' }}
                />
                <span style={{ color: '#cbd5e1' }}>Show Permanent Labels</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
