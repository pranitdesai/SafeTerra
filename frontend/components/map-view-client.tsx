'use client'

import { CircleMarker, MapContainer, Polygon, Polyline, Popup, TileLayer, Tooltip, useMap, GeoJSON, LayersControl, LayerGroup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useState } from 'react'
import type { MapPoint, Route } from './map-view'

type RoutedPath = Route & { roadPositions?: [number, number][]; loading?: boolean }

async function getRoadRoute(route: Route): Promise<[number, number][]> {
  const start = route.positions[0]
  const end = route.positions[route.positions.length - 1]
  const coordinates = `${start[1]},${start[0]};${end[1]},${end[0]}`
  const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`)
  if (!response.ok) throw new Error('Routing service unavailable')
  const data = await response.json()
  const geometry = data.routes?.[0]?.geometry?.coordinates
  if (!geometry?.length) throw new Error('No route found')
  return geometry.map(([longitude, latitude]: [number, number]) => [latitude, longitude])
}

const zoneShapes: Record<string, [number, number][]> = {
  kholi: [[30.337, 78.007], [30.342, 78.058], [30.311, 78.081], [30.283, 78.057], [30.287, 78.015], [30.312, 77.998]],
  barkot: [[30.842, 78.156], [30.862, 78.234], [30.823, 78.278], [30.778, 78.255], [30.775, 78.188], [30.807, 78.145]],
  sundarpur: [[30.294, 78.078], [30.311, 78.132], [30.275, 78.158], [30.238, 78.136], [30.246, 78.093], [30.27, 78.073]],
  maaldevta: [[30.366, 78.104], [30.371, 78.157], [30.337, 78.181], [30.309, 78.151], [30.313, 78.112], [30.339, 78.092]],
  dhanaulti: [[30.465, 78.211], [30.474, 78.267], [30.438, 78.291], [30.411, 78.256], [30.42, 78.22], [30.444, 78.201]],
}

function FitBounds({ points, geoJsonBounds }: { points: MapPoint[], geoJsonBounds?: any }) {
  const map = useMap()
  useEffect(() => {
    // Basic heuristic: if we only have geoJsonBounds but no points, maybe we can't fitBounds easily without parsing GeoJSON extents manually, but we can do it if points exist.
    if (points.length > 0) map.fitBounds(points.map(point => point.position), { padding: [44, 44], maxZoom: 12 })
  }, [map, points])
  return null
}

export function MapCanvas({ points, routes = [], showRoutes = false, userDistrictName }: { points: MapPoint[]; routes?: Route[]; showRoutes?: boolean, userDistrictName?: string | null }) {
  const [roadRoutes, setRoadRoutes] = useState<RoutedPath[]>(routes.map(route => ({ ...route, loading: true })))
  const [districtGeoJSON, setDistrictGeoJSON] = useState<any | null>(null)

  useEffect(() => {
    if (!userDistrictName) return
    const fetchBoundary = async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${userDistrictName}+District,+Uttarakhand,+India&polygon_geojson=1&format=json`)
        const data = await res.json()
        if (data && data.length > 0 && data[0].geojson) {
          setDistrictGeoJSON(data[0].geojson)
        }
      } catch (err) {
        console.error("Failed to fetch district boundaries:", err)
      }
    }
    fetchBoundary()
  }, [userDistrictName])

  useEffect(() => {
    if (!showRoutes || routes.length === 0) return
    let active = true
    Promise.all(routes.map(async route => {
      try {
        return { ...route, roadPositions: await getRoadRoute(route), loading: false }
      } catch {
        return { ...route, loading: false }
      }
    })).then(nextRoutes => {
      if (active) setRoadRoutes(nextRoutes)
    })
    return () => { active = false }
  }, [routes, showRoutes])

  return <MapContainer className="real-map" center={[30.32, 78.05]} zoom={10} scrollWheelZoom={true} zoomControl attributionControl>
    <LayersControl position="topright">
      <LayersControl.BaseLayer checked name="Street Map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
      </LayersControl.BaseLayer>

      <LayersControl.BaseLayer name="Satellite Hybrid">
        <LayerGroup>
          <TileLayer
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
          />
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}"
          />
        </LayerGroup>
      </LayersControl.BaseLayer>
    </LayersControl>

    <FitBounds points={points} />
    {districtGeoJSON && (
      <GeoJSON
        key={`geojson-${userDistrictName}`}
        data={districtGeoJSON}
        style={{ color: '#1c5d8c', weight: 2, fillOpacity: 0.05, opacity: 0.8, dashArray: '4 4' }}
      />
    )}
    {points.filter(point => point.kind === 'hazard').map(point => {
      const shape = zoneShapes[point.id] ?? []
      const zoneColor = point.status === 'RED' ? '#bd463f' : point.status === 'BUFFER' ? '#c98728' : '#2d8a6e'
      return <Polygon key={`zone-${point.id}`} positions={shape} pathOptions={{ color: zoneColor, fillColor: zoneColor, fillOpacity: point.status === 'RED' ? 0.34 : 0.2, weight: 2.5, dashArray: point.status === 'RED' ? undefined : '6 5' }}>
        <Tooltip sticky><strong>{point.name}</strong><br />{point.status} zone · Risk score {point.risk}</Tooltip>
        <Popup><strong>{point.name}</strong><br />{point.status} hazard zone<br />Risk score: {point.risk}/100<br />Boundary shown at settlement level.</Popup>
      </Polygon>
    })}
    {points.filter(point => point.kind === 'site').map(point => <Polygon key={`site-zone-${point.id}`} positions={[[point.position[0] + 0.012, point.position[1] - 0.016], [point.position[0] + 0.012, point.position[1] + 0.016], [point.position[0] - 0.012, point.position[1] + 0.016], [point.position[0] - 0.012, point.position[1] - 0.016]]} pathOptions={{ color: '#2d8a6e', fillColor: '#2d8a6e', fillOpacity: 0.14, weight: 2, dashArray: '5 4' }}><Tooltip sticky><strong>{point.name}</strong><br />Safe relocation area</Tooltip><Popup><strong>{point.name}</strong><br />Safe relocation area<br />Capacity: {point.capacity}</Popup></Polygon>)}
    {showRoutes && roadRoutes.map((route, index) => <Polyline key={`${route.from}-${route.to}`} positions={route.roadPositions ?? route.positions} pathOptions={{ color: index === 0 ? '#1c5d8c' : '#7b9dac', weight: index === 0 ? 5 : 4, opacity: 0.95, dashArray: route.roadPositions || route.loading ? undefined : '8 8' }}><Popup><strong>{route.from} to {route.to}</strong><br />{route.loading ? 'Finding road route…' : route.roadPositions ? 'Road route via OpenStreetMap + OSRM' : 'Direct fallback route'}</Popup></Polyline>)}
    {points.map(point => <CircleMarker key={point.id} center={point.position} radius={point.kind === 'hazard' ? 6 : 5} pathOptions={{ color: '#ffffff', weight: 2, fillColor: point.kind === 'hazard' ? '#bd463f' : '#2d8a6e', fillOpacity: 1 }}><Tooltip direction="top" offset={[0, -5]}>{point.name}</Tooltip><Popup><strong>{point.name}</strong><br />{point.kind === 'hazard' ? `${point.status} · Risk score ${point.risk}` : `${point.capacity} capacity`}</Popup></CircleMarker>)}
  </MapContainer>
}
