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

const MapCanvas = dynamic(() => import('./map-view-client').then(module => module.MapCanvas), {
  ssr: false,
  loading: () => (
    <div style={{ width: '100%', height: '100%', minHeight: '620px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#94a3b8', gap: '12px' }}>
      <div style={{ width: '28px', height: '28px', border: '3px solid #38bdf8', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <div style={{ fontSize: '13px', fontWeight: '600' }}>Initializing GIS Satellite Map & Evacuation Corridors...</div>
    </div>
  )
})

export function SafeTerraMap({
  points,
  routes = [],
  showRoutes = false,
  userDistrictName,
  selectedPointId,
  onSelectPoint,
  height = '100%',
  minHeight = '620px'
}: {
  points: MapPoint[];
  routes?: Route[];
  showRoutes?: boolean;
  userDistrictName?: string | null;
  selectedPointId?: string | null;
  onSelectPoint?: (point: MapPoint | null) => void;
  height?: string;
  minHeight?: string;
}) {
  return (
    <div
      className="real-map-shell"
      style={{
        width: '100%',
        height,
        minHeight,
        position: 'relative',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)'
      }}
    >
      <MapCanvas
        points={points}
        routes={routes}
        showRoutes={showRoutes}
        userDistrictName={userDistrictName}
        selectedPointId={selectedPointId}
        onSelectPoint={onSelectPoint}
      />
      <div className="real-map-key" aria-label="Map legend">
        <span><i className="key-dot key-hazard" />Hazard zone</span>
        <span><i className="key-dot key-site" />Relocation site</span>
        {showRoutes && <span><i className="key-line" />Evacuation corridor</span>}
      </div>
    </div>
  )
}
