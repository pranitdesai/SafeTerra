'use client'

import React, { useState, useMemo } from 'react'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  LifeBuoy,
  MapPin,
  Navigation,
  Printer,
  Radio,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Truck,
  Users,
  Wifi,
  ExternalLink
} from 'lucide-react'
import { fetchApi } from '../lib/api'

export interface NDRFAlertRecord {
  dispatch_id: string
  issued_at: string
  authority_level: string
  authority_label: string
  authorized_by: string
  battalion_id: string
  battalion_name: string
  priority_level: string
  priority_label: string
  settlement_ids: number[]
  settlement_names: string[]
  threatened_population: number
  vulnerable_population: number
  road_access_status: string
  recommended_route?: string
  assigned_shelter_id: number
  assigned_shelter_name: string
  assigned_shelter_capacity?: number
  tactical_units_requested: string[]
  tactical_directive: string
  comms_channel: string
  status: 'DISPATCHED' | 'ACKNOWLEDGED' | 'MOBILIZING' | 'EN_ROUTE' | 'ON_SCENE_ACTIVE' | 'STANDBY' | 'COMPLETED'
  active_teams_deployed?: number
  eta_minutes?: number
  timeline: {
    time: string
    status: string
    message: string
    officer: string
  }[]
}

interface NDRFBattalionViewProps {
  alerts: NDRFAlertRecord[]
  onRefreshAlerts: () => Promise<void>
  onOpenNewAlertModal: () => void
  onNavigateToRelocationStrategy: () => void
  userRole?: string
  userDistrictName?: string | null
}

const STAGES: { key: NDRFAlertRecord['status']; label: string; step: number }[] = [
  { key: 'DISPATCHED', label: 'Dispatched', step: 1 },
  { key: 'ACKNOWLEDGED', label: 'Acknowledged', step: 2 },
  { key: 'MOBILIZING', label: 'Mobilizing', step: 3 },
  { key: 'EN_ROUTE', label: 'En Route', step: 4 },
  { key: 'ON_SCENE_ACTIVE', label: 'On Scene Active', step: 5 },
]

export function NDRFBattalionView({
  alerts,
  onRefreshAlerts,
  onOpenNewAlertModal,
  onNavigateToRelocationStrategy,
  userRole,
  userDistrictName
}: NDRFBattalionViewProps) {
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'EN_ROUTE' | 'ON_SCENE' | 'COMPLETED'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [expandedTimelineId, setExpandedTimelineId] = useState<string | null>(null)
  const [showRosterModal, setShowRosterModal] = useState(false)

  // Filtered Alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter(a => {
      // Status filter
      if (filter === 'ACTIVE' && a.status === 'COMPLETED') return false
      if (filter === 'EN_ROUTE' && a.status !== 'EN_ROUTE') return false
      if (filter === 'ON_SCENE' && a.status !== 'ON_SCENE_ACTIVE') return false
      if (filter === 'COMPLETED' && a.status !== 'COMPLETED') return false

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchSector = a.settlement_names.some(n => n.toLowerCase().includes(q))
        const matchId = a.dispatch_id.toLowerCase().includes(q)
        const matchAuth = a.authority_level.toLowerCase().includes(q) || a.authorized_by.toLowerCase().includes(q)
        const matchShelter = a.assigned_shelter_name.toLowerCase().includes(q)
        if (!matchSector && !matchId && !matchAuth && !matchShelter) return false
      }

      return true
    })
  }, [alerts, filter, searchQuery])

  // Summary Metrics
  const activeCount = alerts.filter(a => a.status !== 'COMPLETED').length
  const totalThreatened = alerts
    .filter(a => a.status !== 'COMPLETED')
    .reduce((sum, a) => sum + (a.threatened_population || 0), 0)
  const onSceneCount = alerts.filter(a => a.status === 'ON_SCENE_ACTIVE').length

  const getBattalionOfficer = (battalionId: string) => {
    if (battalionId?.includes('14')) return 'Commandant Rajesh Sharma (14th BN NDRF)'
    if (battalionId?.includes('15')) return 'Commandant S. N. Yadav (15th BN NDRF)'
    return 'Commandant P. K. Srivastava (8th BN NDRF)'
  }

  const handleAdvanceStatus = async (
    dispatchId: string,
    nextStatus: NDRFAlertRecord['status'],
    message: string,
    officer?: string,
    eta?: number
  ) => {
    try {
      setUpdatingId(dispatchId)
      await fetchApi<any>(`/ndrf/alerts/${dispatchId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus,
          message: message,
          officer_name: officer || 'Duty Officer, NDRF Operations Room',
          eta_minutes: eta ?? 15,
        })
      })
      await onRefreshAlerts()
    } catch (err: any) {
      console.error('Failed to advance NDRF status:', err)
      alert(`Could not update status: ${err.message || 'Server error'}`)
    } finally {
      setUpdatingId(null)
    }
  }

  const getStatusBadge = (status: NDRFAlertRecord['status']) => {
    switch (status) {
      case 'DISPATCHED':
        return { bg: '#fef2f2', text: '#991b1b', border: '#fecaca', label: '1. Dispatched (Pending Ack)' }
      case 'ACKNOWLEDGED':
        return { bg: '#fffbeb', text: '#92400e', border: '#fde68a', label: '2. Acknowledged' }
      case 'MOBILIZING':
        return { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', label: '3. QRF Mobilizing' }
      case 'EN_ROUTE':
        return { bg: '#faf5ff', text: '#7e22ce', border: '#e9d5ff', label: '4. Convoys En Route' }
      case 'ON_SCENE_ACTIVE':
        return { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0', label: '5. On Scene Active' }
      case 'COMPLETED':
        return { bg: '#f8fafc', text: '#475569', border: '#e2e8f0', label: 'Completed' }
      default:
        return { bg: '#f8fafc', text: '#475569', border: '#cbd5e1', label: status }
    }
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1440px', margin: '0 auto', color: '#1e293b' }}>
      {/* ── TOP HEADER: CLEAN & CRISP ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#0369a1', background: '#e0f2fe', padding: '3px 8px', borderRadius: '4px' }}>
              8th Battalion NDRF • RRC Dehradun
            </span>
            <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748b' }}>
              VHF Net: 143.825 MHz • Haridwar Road
            </span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
            NDRF Tactical Operations Deck
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
            Multi-hazard battalion dispatch, quick response tracking, and statutory red zone relief coordination.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setShowRosterModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 14px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '600',
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            <Truck size={15} color="#0369a1" />
            <span>Equipment Roster</span>
          </button>

          <button
            type="button"
            onClick={onRefreshAlerts}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 14px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '600',
              color: '#334155',
              cursor: 'pointer'
            }}
            title="Refresh tactical feed"
          >
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={onOpenNewAlertModal}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '9px 16px',
              background: '#b91c1c',
              border: '1px solid #991b1b',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '700',
              color: '#ffffff',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(185, 28, 28, 0.2)'
            }}
          >
            <ShieldAlert size={16} />
            <span>+ Dispatch NDRF Requisition</span>
          </button>
        </div>
      </div>

      {/* ── METRIC STRIP: 4 SIMPLE TILES ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.04em' }}>Active Requisitions</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: activeCount > 0 ? '#b91c1c' : '#0f172a', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{activeCount}</span>
            {activeCount > 0 && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.5s infinite' }} />}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{alerts.length} total requisitions logged</div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.04em' }}>Threatened Population</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
            {totalThreatened.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Citizens in active target red zones</div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.04em' }}>On-Scene Rescue Ops</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: onSceneCount > 0 ? '#15803d' : '#0f172a', marginTop: '4px' }}>
            {onSceneCount} Sectors
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Active field rescue commenced</div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.04em' }}>8th BN QRF Readiness</div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#0284c7', marginTop: '4px' }}>
            12 Teams Ready
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>28 Zodiac boats • 8 canine units</div>
        </div>
      </div>

      {/* ── TOOLBAR: FILTER PILLS & SEARCH ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {[
            { id: 'ALL', label: `All (${alerts.length})` },
            { id: 'ACTIVE', label: `Active (${activeCount})` },
            { id: 'EN_ROUTE', label: `En Route (${alerts.filter(a => a.status === 'EN_ROUTE').length})` },
            { id: 'ON_SCENE', label: `On Scene (${onSceneCount})` },
            { id: 'COMPLETED', label: `Completed (${alerts.filter(a => a.status === 'COMPLETED').length})` },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id as any)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontWeight: filter === tab.id ? '700' : '500',
                border: filter === tab.id ? '1px solid #0284c7' : '1px solid #cbd5e1',
                background: filter === tab.id ? '#e0f2fe' : '#ffffff',
                color: filter === tab.id ? '#0369a1' : '#475569',
                cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: '320px' }}>
          <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search sector, ref #, or authority..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 12px 7px 32px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '12.5px',
              boxSizing: 'border-box',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* ── DEPLOYMENT CARDS LIST ── */}
      {filteredAlerts.length === 0 ? (
        <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '48px 24px', textAlign: 'center' }}>
          <CheckCircle2 size={36} color="#16a34a" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0 0 6px' }}>No Requisitions Found</h3>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px' }}>
            {searchQuery ? 'No requisitions matched your search query.' : 'No deployments currently matching this filter status.'}
          </p>
          <button
            type="button"
            onClick={onOpenNewAlertModal}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              background: '#0284c7',
              color: '#ffffff',
              border: 0,
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Create New Requisition
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredAlerts.map(alert => {
            const badge = getStatusBadge(alert.status)
            const isUpdating = updatingId === alert.dispatch_id
            const isTimelineOpen = expandedTimelineId === alert.dispatch_id
            const currentStageIdx = STAGES.findIndex(s => s.key === alert.status)

            return (
              <div
                key={alert.dispatch_id}
                style={{
                  background: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)',
                  overflow: 'hidden'
                }}
              >
                {/* 1. Header Bar */}
                <div style={{ padding: '12px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        background: badge.bg,
                        color: badge.text,
                        border: `1px solid ${badge.border}`
                      }}
                    >
                      {badge.label}
                    </span>
                    <span style={{ fontSize: '12.5px', fontWeight: '700', fontFamily: 'monospace', color: '#0f172a' }}>
                      {alert.dispatch_id}
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      Authority: <strong>{alert.authority_level}</strong> ({alert.authorized_by})
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={onNavigateToRelocationStrategy}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '5px 10px',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '5px',
                        fontSize: '11.5px',
                        fontWeight: '600',
                        color: '#0369a1',
                        cursor: 'pointer'
                      }}
                    >
                      <Navigation size={12} />
                      <span>Evacuation Route</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '5px 10px',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '5px',
                        fontSize: '11.5px',
                        fontWeight: '600',
                        color: '#64748b',
                        cursor: 'pointer'
                      }}
                    >
                      <Printer size={12} />
                      <span>Print</span>
                    </button>
                  </div>
                </div>

                {/* 2. Main Details Grid: 3 Clean Columns */}
                <div style={{ padding: '18px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
                  {/* Column 1: Target Habitations & Risk */}
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Target Red Zones
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#b91c1c', marginBottom: '8px' }}>
                      {alert.settlement_names.join(', ')}
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div>Threatened: <strong>{alert.threatened_population.toLocaleString('en-IN')}</strong> persons</div>
                      <div>Vulnerable: <strong>{alert.vulnerable_population.toLocaleString('en-IN')}</strong> (elderly/children)</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px', color: alert.road_access_status.includes('SEVERED') ? '#dc2626' : '#15803d', fontWeight: '600', fontSize: '12px' }}>
                        <AlertTriangle size={13} />
                        <span>Road: {alert.road_access_status}</span>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Staging Camp & Tactical Comms */}
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Staging Post & Logistics
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>
                      Camp: {alert.assigned_shelter_name}
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div>Assigned Battalion: <strong>{alert.battalion_name}</strong></div>
                      <div>Comms Channel: <strong>{alert.comms_channel}</strong></div>
                      <div>Camp Capacity: <strong>{alert.assigned_shelter_capacity || 1200} evacuees</strong></div>
                    </div>
                  </div>

                  {/* Column 3: Requisitioned Capabilities */}
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Tasked Specialized Units
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                      {alert.tactical_units_requested.map((unit, uIdx) => (
                        <span
                          key={uIdx}
                          style={{
                            fontSize: '11px',
                            fontWeight: '600',
                            padding: '3px 8px',
                            background: '#f1f5f9',
                            color: '#334155',
                            border: '1px solid #e2e8f0',
                            borderRadius: '4px'
                          }}
                        >
                          ✓ {unit}
                        </span>
                      ))}
                    </div>
                    {alert.tactical_directive && (
                      <div style={{ fontSize: '11.5px', color: '#92400e', background: '#fffbeb', border: '1px solid #fef3c7', padding: '6px 10px', borderRadius: '4px', lineHeight: 1.4 }}>
                        <strong>Directive:</strong> {alert.tactical_directive}
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Operational Progression Stepper & Next Step Button */}
                <div style={{ padding: '12px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
                  {/* Step Indicators */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                    {STAGES.map((stg, sIdx) => {
                      const isCompleted = currentStageIdx >= sIdx
                      const isCurrent = alert.status === stg.key

                      return (
                        <div key={stg.key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span
                            style={{
                              fontSize: '11.5px',
                              fontWeight: isCurrent ? '700' : '500',
                              padding: '3px 9px',
                              borderRadius: '4px',
                              background: isCurrent ? '#0284c7' : isCompleted ? '#dcfce7' : '#ffffff',
                              color: isCurrent ? '#ffffff' : isCompleted ? '#166534' : '#94a3b8',
                              border: isCurrent ? '1px solid #0284c7' : isCompleted ? '1px solid #bbf7d0' : '1px solid #cbd5e1'
                            }}
                          >
                            {isCompleted && !isCurrent ? '✓ ' : ''}{stg.label}
                          </span>
                          {sIdx < STAGES.length - 1 && <span style={{ color: '#cbd5e1', fontSize: '11px' }}>→</span>}
                        </div>
                      )
                    })}
                  </div>

                  {/* Single Clear Next-Action Button */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {alert.status === 'DISPATCHED' && (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleAdvanceStatus(
                          alert.dispatch_id,
                          'ACKNOWLEDGED',
                          `NDRF ${alert.battalion_name} Operations Room logged tactical dispatch. Duty officer alerted Commandant.`,
                          getBattalionOfficer(alert.battalion_id)
                        )}
                        style={{
                          padding: '7px 16px',
                          borderRadius: '6px',
                          background: '#0284c7',
                          color: '#ffffff',
                          border: 0,
                          fontSize: '12.5px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        {isUpdating ? 'Updating...' : '✓ Acknowledge Receipt'}
                      </button>
                    )}

                    {alert.status === 'ACKNOWLEDGED' && (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleAdvanceStatus(
                          alert.dispatch_id,
                          'MOBILIZING',
                          `QRF Teams mustering at ${alert.battalion_name} base with specialized rescue equipment and search squads.`,
                          getBattalionOfficer(alert.battalion_id)
                        )}
                        style={{
                          padding: '7px 16px',
                          borderRadius: '6px',
                          background: '#2563eb',
                          color: '#ffffff',
                          border: 0,
                          fontSize: '12.5px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        {isUpdating ? 'Updating...' : '⚡ Muster & Mobilize QRF'}
                      </button>
                    )}

                    {alert.status === 'MOBILIZING' && (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleAdvanceStatus(
                          alert.dispatch_id,
                          'EN_ROUTE',
                          `Convoys rolled out from base towards ${alert.assigned_shelter_name} and ${alert.settlement_names[0] || 'sector'} axis. GPS Tracking active.`,
                          getBattalionOfficer(alert.battalion_id),
                          18
                        )}
                        style={{
                          padding: '7px 16px',
                          borderRadius: '6px',
                          background: '#7c3aed',
                          color: '#ffffff',
                          border: 0,
                          fontSize: '12.5px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        {isUpdating ? 'Updating...' : '🚚 Roll Out Convoys (Mark En Route)'}
                      </button>
                    )}

                    {alert.status === 'EN_ROUTE' && (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleAdvanceStatus(
                          alert.dispatch_id,
                          'ON_SCENE_ACTIVE',
                          `Forward staging post established at ${alert.assigned_shelter_name}. Tactical rescue teams deployed on scene at ${alert.settlement_names.join(', ')}.`,
                          getBattalionOfficer(alert.battalion_id)
                        )}
                        style={{
                          padding: '7px 16px',
                          borderRadius: '6px',
                          background: '#15803d',
                          color: '#ffffff',
                          border: 0,
                          fontSize: '12.5px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        {isUpdating ? 'Updating...' : '🚩 Arrived on Scene (Commence Rescue)'}
                      </button>
                    )}

                    {alert.status === 'ON_SCENE_ACTIVE' && (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleAdvanceStatus(
                          alert.dispatch_id,
                          'COMPLETED',
                          `All high-risk evacuees safely secured into ${alert.assigned_shelter_name}. Sector stabilized.`,
                          getBattalionOfficer(alert.battalion_id)
                        )}
                        style={{
                          padding: '7px 16px',
                          borderRadius: '6px',
                          background: '#475569',
                          color: '#ffffff',
                          border: 0,
                          fontSize: '12.5px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        {isUpdating ? 'Updating...' : '🏁 Mark Mission Completed'}
                      </button>
                    )}

                    {/* Toggle Timeline Log */}
                    <button
                      type="button"
                      onClick={() => setExpandedTimelineId(isTimelineOpen ? null : alert.dispatch_id)}
                      style={{
                        padding: '6px 10px',
                        background: 'transparent',
                        border: '1px solid #cbd5e1',
                        borderRadius: '5px',
                        fontSize: '12px',
                        color: '#64748b',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>Log ({alert.timeline?.length || 0})</span>
                      {isTimelineOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  </div>
                </div>

                {/* 4. Collapsible Timeline Log */}
                {isTimelineOpen && (
                  <div style={{ padding: '14px 20px', background: '#f1f5f9', borderTop: '1px dashed #cbd5e1' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Dispatch Activity Log
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {alert.timeline?.map((log, lIdx) => (
                        <div key={lIdx} style={{ fontSize: '12px', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontFamily: 'monospace', color: '#0369a1', fontSize: '11px', fontWeight: '600' }}>[{log.time}]</span>
                          <span style={{ fontWeight: '700', color: '#0f172a' }}>{log.status}:</span>
                          <span>{log.message}</span>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>({log.officer})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── MODAL: CLEAN EQUIPMENT & READINESS ROSTER ── */}
      {showRosterModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)', padding: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '10px', width: '100%', maxWidth: '640px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)', border: '1px solid #cbd5e1', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: '#e0f2fe', color: '#0369a1', display: 'grid', placeItems: 'center' }}>
                  <Truck size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>8th Battalion NDRF — Equipment & Readiness</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>RRC Dehradun / Haridwar Road base assets</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRosterModal(false)}
                style={{ border: 0, background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '18px', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#0369a1', marginBottom: '8px' }}>Water Rescue & Amphibious</div>
                <div style={{ fontSize: '12px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div>• 28 Inflatable Zodiac Boats (OBM)</div>
                  <div>• 16 Deep Diving SCUBA Sets</div>
                  <div>• 650 High-Buoyancy PFD Life Jackets</div>
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#0369a1', marginBottom: '8px' }}>Search & Landslide Rescue</div>
                <div style={{ fontSize: '12px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div>• 8 Canine Search Scent Squads (CSSR)</div>
                  <div>• 40 Lightweight Cliff Stretchers</div>
                  <div>• 18 Rotary Concrete & Rock Cutters</div>
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#0369a1', marginBottom: '8px' }}>Tactical Communications</div>
                <div style={{ fontSize: '12px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div>• VHF Net 143.825 MHz (CH-04)</div>
                  <div>• 8 Satellite BGAN Terminals (INSAT-3DR)</div>
                  <div>• Dedicated DEOC Hotline Link</div>
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#0369a1', marginBottom: '8px' }}>Field Medical & Triage</div>
                <div style={{ fontSize: '12px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div>• 10 All-Terrain Mobile Ambulances</div>
                  <div>• 35 Portable Oxygen Concentrators</div>
                  <div>• Forward Staging Triage Kits</div>
                </div>
              </div>
            </div>

            <div style={{ padding: '12px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', textAlign: 'right' }}>
              <button
                type="button"
                onClick={() => setShowRosterModal(false)}
                style={{ padding: '6px 14px', borderRadius: '5px', background: '#0f172a', color: '#fff', border: 0, fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
              >
                Close Roster
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
