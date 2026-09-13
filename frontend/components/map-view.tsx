'use client'

import dynamic from 'next/dynamic'

export type MapPoint = {
  id: string
  name: string
  position: [number, number]
  kind: 'hazard' | 'site'
  risk?: number
  status?: 'SAFE' | 'BUFFER' | 'RED'
  capacity?: string
}

export type Route = {
  from: string
  to: string
  positions: [number, number][]
}

const MapCanvas = dynamic(() => import('./map-view-client').then(module => module.MapCanvas), { ssr: false })

export function KavachMap({ points, routes = [], showRoutes = false, userDistrictName }: { points: MapPoint[]; routes?: Route[]; showRoutes?: boolean, userDistrictName?: string | null }) {
  return <div className="real-map-shell"><MapCanvas points={points} routes={routes} showRoutes={showRoutes} userDistrictName={userDistrictName} /><div className="real-map-key" aria-label="Map legend"><span><i className="key-dot key-hazard" />Hazard zone</span><span><i className="key-dot key-site" />Relocation site</span>{showRoutes && <span><i className="key-line" />Evacuation route</span>}</div></div>
}
