'use client'

import React, { useEffect, useState, useMemo, useRef } from 'react'
import Map, { Source, Layer, Marker, Popup, NavigationControl, FullscreenControl } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { MapPoint, Route } from './map-view'

const MAPBOX_TOKEN = 'pk.eyJ1IjoiZGhhaXJ5YXNoaWxzaGluZGUiLCJhIjoiY211MDMzdGwxMGlqYzJ6czRoYW5vcmJmbCJ9.kjqC2aR2s35jZPPgomUJuw'

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

function closePolygon(coords: [number, number][]) {
  if (coords.length < 3) return coords;
  const first = coords[0];
  const last = coords[coords.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    return [...coords, first];
  }
  return coords;
}

export function MapCanvas({ points, routes = [], showRoutes = false, userDistrictName }: { points: MapPoint[]; routes?: Route[]; showRoutes?: boolean, userDistrictName?: string | null }) {
  const mapRef = useRef<any>(null);
  const [roadRoutes, setRoadRoutes] = useState<RoutedPath[]>(routes.map(route => ({ ...route, loading: true })))
  const [districtGeoJSON, setDistrictGeoJSON] = useState<any | null>(null)
  const [popupInfo, setPopupInfo] = useState<MapPoint | null>(null);

  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/satellite-streets-v12');

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

  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (points.length > 0 && mapRef.current && mapLoaded) {
      let minLng = Infinity;
      let minLat = Infinity;
      let maxLng = -Infinity;
      let maxLat = -Infinity;
      let validPoints = 0;
      points.forEach(p => {
        const lat = Number(p.position[0]);
        const lng = Number(p.position[1]);
        if (isNaN(lat) || isNaN(lng)) return;
        validPoints++;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      });
      if (validPoints > 0) {
        const padding = 0.05;
        mapRef.current.fitBounds(
          [
            [minLng - padding, minLat - padding],
            [maxLng + padding, maxLat + padding]
          ],
          { padding: 40, duration: 1000, maxZoom: 12 }
        );
      }
    }
  }, [points, mapLoaded]);

  const hazardsGeoJSON: any = useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: points.filter(p => p.kind === 'hazard').flatMap(point => {
        const shape = zoneShapes[point.name.toLowerCase()] ?? [];
        if (shape.length < 3) return [];
        const coordinates = shape.map(c => [c[1], c[0]] as [number, number]);
        return [{
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [closePolygon(coordinates)] },
          properties: {
            id: point.id,
            status: point.status,
            color: point.status === 'RED' ? '#bd463f' : point.status === 'BUFFER' ? '#c98728' : '#2d8a6e'
          }
        }];
      })
    };
  }, [points]);

  const sitesGeoJSON: any = useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: points.filter(p => p.kind === 'site').flatMap(point => {
        const lat = Number(point.position[0]);
        const lng = Number(point.position[1]);
        if (isNaN(lat) || isNaN(lng)) return [];
        const coordinates = [
          [lng - 0.012, lat - 0.016],
          [lng + 0.012, lat - 0.016],
          [lng + 0.012, lat + 0.016],
          [lng - 0.012, lat + 0.016]
        ] as [number, number][];
        return [{
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [closePolygon(coordinates)] },
          properties: { id: point.id }
        }];
      })
    };
  }, [points]);

  const routesGeoJSON: any = useMemo(() => {
    if (!showRoutes || roadRoutes.length === 0) return null;
    return {
      type: 'FeatureCollection',
      features: roadRoutes.flatMap((route, index) => {
        const positions = route.roadPositions ?? route.positions;
        const coordinates = positions.map(p => [Number(p[1]), Number(p[0])] as [number, number]);
        if (coordinates.some(c => isNaN(c[0]) || isNaN(c[1]))) return [];
        return [{
          type: 'Feature',
          geometry: { type: 'LineString', coordinates },
          properties: {
            index,
            isFallback: !route.roadPositions && !route.loading
          }
        }];
      })
    };
  }, [roadRoutes, showRoutes]);

  return (
    <div className="real-map relative w-full h-full overflow-hidden">
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          longitude: 78.05,
          latitude: 30.32,
          zoom: 10,
          pitch: 55,
          bearing: 0
        }}
        mapStyle={mapStyle}
        terrain={{ source: 'mapbox-dem', exaggeration: 1.5 }}
        style={{ width: '100%', height: '100%' }}
        onLoad={() => setMapLoaded(true)}
      >
        <Source
          id="mapbox-dem"
          type="raster-dem"
          url="mapbox://mapbox.mapbox-terrain-dem-v1"
          tileSize={512}
          maxzoom={14}
        />

        <NavigationControl position="top-right" visualizePitch={true} />
        <FullscreenControl position="top-right" />

        {districtGeoJSON && (
          <Source id="district-boundary" type="geojson" data={districtGeoJSON}>
            <Layer
              id="district-layer"
              type="line"
              paint={{ 'line-color': '#1c5d8c', 'line-width': 2, 'line-dasharray': [4, 4], 'line-opacity': 0.8 }}
            />
            <Layer
              id="district-fill"
              type="fill"
              paint={{ 'fill-color': '#1c5d8c', 'fill-opacity': 0.05 }}
            />
          </Source>
        )}

        <Source id="hazards" type="geojson" data={hazardsGeoJSON as any}>
          <Layer
            id="hazards-fill"
            type="fill"
            paint={{
              'fill-color': ['get', 'color'],
              'fill-opacity': ['match', ['get', 'status'], 'RED', 0.34, 0.2]
            }}
          />
          <Layer
            id="hazards-line-red"
            type="line"
            filter={['==', 'status', 'RED']}
            paint={{ 'line-color': ['get', 'color'], 'line-width': 2.5 }}
          />
          <Layer
            id="hazards-line-other"
            type="line"
            filter={['!=', 'status', 'RED']}
            paint={{ 'line-color': ['get', 'color'], 'line-width': 2.5, 'line-dasharray': [2, 2] }}
          />
        </Source>

        <Source id="sites" type="geojson" data={sitesGeoJSON as any}>
          <Layer
            id="sites-fill"
            type="fill"
            paint={{ 'fill-color': '#2d8a6e', 'fill-opacity': 0.14 }}
          />
          <Layer
            id="sites-line"
            type="line"
            paint={{ 'line-color': '#2d8a6e', 'line-width': 2, 'line-dasharray': [2, 2] }}
          />
        </Source>

        {routesGeoJSON && (
          <Source id="routes" type="geojson" data={routesGeoJSON as any}>
            <Layer
              id="routes-line-solid"
              type="line"
              filter={['!=', ['get', 'isFallback'], true]}
              paint={{
                'line-color': ['case', ['==', ['get', 'index'], 0], '#1c5d8c', '#7b9dac'],
                'line-width': ['case', ['==', ['get', 'index'], 0], 5, 4],
                'line-opacity': 0.95
              }}
            />
            <Layer
              id="routes-line-dashed"
              type="line"
              filter={['==', ['get', 'isFallback'], true]}
              paint={{
                'line-color': ['case', ['==', ['get', 'index'], 0], '#1c5d8c', '#7b9dac'],
                'line-width': ['case', ['==', ['get', 'index'], 0], 5, 4],
                'line-opacity': 0.95,
                'line-dasharray': [2, 2]
              }}
            />
          </Source>
        )}

        {points.filter(point => !isNaN(Number(point.position[0])) && !isNaN(Number(point.position[1]))).map(point => (
          <Marker
            key={point.id}
            longitude={Number(point.position[1])}
            latitude={Number(point.position[0])}
            onClick={(e: any) => {
              e.originalEvent.stopPropagation();
              setPopupInfo(point);
            }}
          >
            <div
              style={{
                width: point.kind === 'hazard' ? 14 : 12,
                height: point.kind === 'hazard' ? 14 : 12,
                backgroundColor: point.kind === 'hazard' ? '#bd463f' : '#2d8a6e',
                borderRadius: '50%',
                border: '2px solid white',
                cursor: 'pointer',
                boxShadow: '0 0 6px rgba(0,0,0,0.5)'
              }}
              title={point.name}
            />
          </Marker>
        ))}

        {popupInfo && (
          <Popup
            longitude={Number(popupInfo.position[1])}
            latitude={Number(popupInfo.position[0])}
            anchor="bottom"
            onClose={() => setPopupInfo(null)}
            closeOnClick={false}
            offset={12}
            className="text-sm text-gray-800 font-sans"
          >
            <div className="p-1">
              <strong className="block text-base mb-1 font-semibold text-gray-900">{popupInfo.name}</strong>
              {popupInfo.kind === 'hazard' ? (
                <>
                  <div className="text-gray-700">{popupInfo.status} hazard zone</div>
                  <div className="text-gray-700">Risk score: {popupInfo.risk}/100</div>
                  <div className="text-xs text-gray-500 mt-2">Boundary shown at settlement level.</div>
                </>
              ) : (
                <>
                  <div className="text-gray-700">Safe relocation area</div>
                  <div className="text-gray-700">Capacity: {popupInfo.capacity}</div>
                </>
              )}
            </div>
          </Popup>
        )}
      </Map>

      <div className="absolute top-3 left-3 bg-white/95 p-3 rounded-lg shadow-lg z-10 flex flex-col gap-2 max-w-[200px] border border-gray-100">
        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Map Style</label>
        <select 
          value={mapStyle} 
          onChange={(e) => setMapStyle(e.target.value)}
          className="text-sm border border-gray-200 rounded p-1.5 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="mapbox://styles/mapbox/satellite-streets-v12">Satellite 3D</option>
          <option value="mapbox://styles/mapbox/outdoors-v12">Outdoors 3D</option>
          <option value="mapbox://styles/mapbox/streets-v12">Streets 3D</option>
          <option value="mapbox://styles/mapbox/light-v11">Light Mode</option>
          <option value="mapbox://styles/mapbox/dark-v11">Dark Mode</option>
        </select>
      </div>
    </div>
  )
}
