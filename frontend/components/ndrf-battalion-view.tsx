'use client'

import React, { useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Anchor,
  ArrowRight,
  Award,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  Flame,
  LifeBuoy,
  MapPin,
  Navigation,
  Printer,
  Radio,
  RefreshCw,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Truck,
  Users,
  Wifi,
  Zap
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

export function NDRFBattalionView({
  alerts,
  onRefreshAlerts,
  onOpenNewAlertModal,
  onNavigateToRelocationStrategy,
  userRole,
  userDistrictName
}: NDRFBattalionViewProps) {
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'ACTIVE' | 'EN_ROUTE' | 'ON_SCENE'>('ALL')
  const [updatingDispatchId, setUpdatingDispatchId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'DIRECTIVES' | 'INVENTORY' | 'COMMUNICATIONS'>('DIRECTIVES')

  const filteredAlerts = alerts.filter(a => {
    if (selectedFilter === 'ACTIVE') return a.status !== 'COMPLETED'
    if (selectedFilter === 'EN_ROUTE') return a.status === 'EN_ROUTE'
    if (selectedFilter === 'ON_SCENE') return a.status === 'ON_SCENE_ACTIVE'
    return true
  })

  const totalThreatened = alerts.reduce((acc, a) => acc + (a.threatened_population || 0), 0)
  const totalActiveDeployments = alerts.filter(a => a.status === 'MOBILIZING' || a.status === 'EN_ROUTE' || a.status === 'ON_SCENE_ACTIVE').length

  const handleUpdateStatus = async (
    dispatchId: string,
    nextStatus: string,
    message: string,
    eta?: number
  ) => {
    try {
      setUpdatingDispatchId(dispatchId)
      await fetchApi<any>(`/ndrf/alerts/${dispatchId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus,
          message: message,
          officer_name: 'Commandant P. K. Srivastava (8th BN NDRF)',
          eta_minutes: eta ?? 15,
        })
      })
      await onRefreshAlerts()
    } catch (err: any) {
      console.error('Failed to update NDRF status:', err)
      alert(`Could not update NDRF status: ${err.message || 'Server error'}`)
    } finally {
      setUpdatingDispatchId(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DISPATCHED':
        return { bg: '#fee2e2', text: '#991b1b', border: '#fecaca', label: '1. DISPATCHED (PENDING ACK)' }
      case 'ACKNOWLEDGED':
        return { bg: '#fef3c7', text: '#92400e', border: '#fde68a', label: '2. ACKNOWLEDGED BY BN' }
      case 'MOBILIZING':
        return { bg: '#e0f2fe', text: '#075985', border: '#bae6fd', label: '3. QRF MOBILIZING' }
      case 'EN_ROUTE':
        return { bg: '#f3e8ff', text: '#6b21a8', border: '#e9d5ff', label: '4. CONVOYS EN ROUTE' }
      case 'ON_SCENE_ACTIVE':
        return { bg: '#dcfce7', text: '#166534', border: '#bbf7d0', label: '5. ON SCENE / RESCUE ACTIVE' }
      default:
        return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1', label: status }
    }
  }

  return (
    <div className="page-content" style={{ paddingBottom: '40px' }}>
      {/* Official NDRF Tactical Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #09172e 0%, #172554 50%, #1e3a8a 100%)',
          borderRadius: '12px',
          padding: '24px 28px',
          color: '#ffffff',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.3)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          marginBottom: '24px',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Subtle background insignia texture */}
        <div
          style={{
            position: 'absolute',
            right: '-20px',
            top: '-20px',
            opacity: 0.08,
            pointerEvents: 'none'
          }}
        >
          <ShieldAlert size={280} />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #b91c1c 0%, #dc2626 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(220, 38, 38, 0.4)',
                border: '2px solid rgba(255, 255, 255, 0.2)'
              }}
            >
              <LifeBuoy size={36} color="#ffffff" />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', background: 'rgba(255, 255, 255, 0.15)', padding: '2px 8px', borderRadius: '4px', color: '#fbbf24' }}>
                  राष्ट्रीय आपदा मोचन बल • Govt of India
                </span>
                <span style={{ fontSize: '11px', fontWeight: '700', background: '#dc2626', color: '#ffffff', padding: '2px 8px', borderRadius: '4px' }}>
                  DEFCON-1 RAPID DEPLOYMENT
                </span>
              </div>
              <h1 style={{ fontSize: '22px', fontWeight: '800', letterSpacing: '0.02em', margin: 0, color: '#ffffff' }}>
                NDRF 8th BATTALION — JOINT OPERATIONS CONSOLE
              </h1>
              <p style={{ fontSize: '13px', color: '#93c5fd', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Regional Response Centre (RRC) Dehradun</span>
                <span>•</span>
                <span>VHF Tactical Net 143.825 MHz (CH-04)</span>
                <span>•</span>
                <span>INSAT-3DR SatCom Link: ACTIVE</span>
              </p>
            </div>
          </div>

          {/* Quick Actions in Banner */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={onRefreshAlerts}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 14px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.12)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                fontSize: '12.5px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background 0.15s ease'
              }}
            >
              <RefreshCw size={15} />
              <span>Refresh Feed</span>
            </button>

            <button
              type="button"
              onClick={onOpenNewAlertModal}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                borderRadius: '8px',
                background: '#dc2626',
                color: '#ffffff',
                border: 0,
                fontSize: '13px',
                fontWeight: '800',
                letterSpacing: '0.02em',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(220, 38, 38, 0.5)'
              }}
            >
              <ShieldAlert size={16} />
              <span>Confirm Red Zone & Dispatch NDRF</span>
            </button>
          </div>
        </div>

        {/* Live Metrics Row inside banner */}
        <div
          style={{
            marginTop: '22px',
            paddingTop: '18px',
            borderTop: '1px solid rgba(255, 255, 255, 0.12)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px'
          }}
        >
          <div>
            <div style={{ fontSize: '11px', color: '#93c5fd', textTransform: 'uppercase', fontWeight: '600' }}>Active Red Zone Tasks</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#ffffff', marginTop: '2px' }}>
              {alerts.length} <span style={{ fontSize: '12px', fontWeight: '600', color: '#fca5a5' }}>({totalActiveDeployments} mobilizing/en-route)</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: '#93c5fd', textTransform: 'uppercase', fontWeight: '600' }}>Evacuees in Target Zones</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#ffffff', marginTop: '2px' }}>
              {totalThreatened.toLocaleString('en-IN')} <span style={{ fontSize: '12px', fontWeight: '600', color: '#fed7aa' }}>citizens</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: '#93c5fd', textTransform: 'uppercase', fontWeight: '600' }}>Available QRF Teams (8 BN)</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#4ade80', marginTop: '2px' }}>
              12 Teams <span style={{ fontSize: '12px', fontWeight: '600', color: '#cbd5e1' }}>(1,149 personnel)</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: '#93c5fd', textTransform: 'uppercase', fontWeight: '600' }}>Inflatable Zodiac Boats</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#ffffff', marginTop: '2px' }}>
              28 Craft <span style={{ fontSize: '12px', fontWeight: '600', color: '#67e8f9' }}>(Fast-Water OBM)</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: '#93c5fd', textTransform: 'uppercase', fontWeight: '600' }}>Canine Search Squads</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#ffffff', marginTop: '2px' }}>
              8 Teams <span style={{ fontSize: '12px', fontWeight: '600', color: '#fef08a' }}>(CSSR Scent)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #cbd5e1',
          marginBottom: '20px'
        }}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('DIRECTIVES')}
            style={{
              padding: '10px 18px',
              borderBottom: activeTab === 'DIRECTIVES' ? '3px solid #1e3a8a' : '3px solid transparent',
              background: 'transparent',
              borderTop: 0,
              borderLeft: 0,
              borderRight: 0,
              color: activeTab === 'DIRECTIVES' ? '#1e3a8a' : '#64748b',
              fontWeight: '700',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <ShieldAlert size={16} />
            <span>Active Red Zone Taskings ({alerts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('INVENTORY')}
            style={{
              padding: '10px 18px',
              borderBottom: activeTab === 'INVENTORY' ? '3px solid #1e3a8a' : '3px solid transparent',
              background: 'transparent',
              borderTop: 0,
              borderLeft: 0,
              borderRight: 0,
              color: activeTab === 'INVENTORY' ? '#1e3a8a' : '#64748b',
              fontWeight: '700',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Truck size={16} />
            <span>Battalion Equipment & Team Strength</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('COMMUNICATIONS')}
            style={{
              padding: '10px 18px',
              borderBottom: activeTab === 'COMMUNICATIONS' ? '3px solid #1e3a8a' : '3px solid transparent',
              background: 'transparent',
              borderTop: 0,
              borderLeft: 0,
              borderRight: 0,
              color: activeTab === 'COMMUNICATIONS' ? '#1e3a8a' : '#64748b',
              fontWeight: '700',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Wifi size={16} />
            <span>Tactical Comms & SOP Network</span>
          </button>
        </div>

        {activeTab === 'DIRECTIVES' && (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginRight: '4px' }}>Filter:</span>
            <button
              className={`filter-button ${selectedFilter === 'ALL' ? 'nav-active' : ''}`}
              onClick={() => setSelectedFilter('ALL')}
            >
              All ({alerts.length})
            </button>
            <button
              className={`filter-button ${selectedFilter === 'EN_ROUTE' ? 'nav-active' : ''}`}
              onClick={() => setSelectedFilter('EN_ROUTE')}
              style={{ color: '#6b21a8' }}
            >
              En Route ({alerts.filter(a => a.status === 'EN_ROUTE').length})
            </button>
            <button
              className={`filter-button ${selectedFilter === 'ON_SCENE' ? 'nav-active' : ''}`}
              onClick={() => setSelectedFilter('ON_SCENE')}
              style={{ color: '#166534' }}
            >
              On Scene ({alerts.filter(a => a.status === 'ON_SCENE_ACTIVE').length})
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: ACTIVE DIRECTIVES LIST */}
      {activeTab === 'DIRECTIVES' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {filteredAlerts.length === 0 ? (
            <div
              style={{
                background: '#ffffff',
                padding: '40px',
                textAlign: 'center',
                borderRadius: '10px',
                border: '1px solid #cbd5e1'
              }}
            >
              <CheckCircle2 size={40} color="#16a34a" style={{ margin: '0 auto 10px' }} />
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', margin: '0 0 4px' }}>
                All Sectors Standing By
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px' }}>
                No active mobilization alerts currently matching this filter.
              </p>
              <button
                type="button"
                onClick={onOpenNewAlertModal}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  background: '#1e3a8a',
                  color: '#ffffff',
                  border: 0,
                  fontSize: '12.5px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Dispatch New Red Zone Requisition
              </button>
            </div>
          ) : (
            filteredAlerts.map(alert => {
              const statusInfo = getStatusColor(alert.status)
              const isUpdating = updatingDispatchId === alert.dispatch_id

              return (
                <div
                  key={alert.dispatch_id}
                  style={{
                    background: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    boxShadow: '0 3px 10px rgba(0, 0, 0, 0.04)',
                    overflow: 'hidden'
                  }}
                >
                  {/* Card Header Bar */}
                  <div
                    style={{
                      padding: '14px 20px',
                      background: '#f8fafc',
                      borderBottom: '1px solid #e2e8f0',
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: '800',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: statusInfo.bg,
                          color: statusInfo.text,
                          border: `1px solid ${statusInfo.border}`,
                          letterSpacing: '0.04em'
                        }}
                      >
                        {statusInfo.label}
                      </span>

                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', fontFamily: 'monospace' }}>
                        {alert.dispatch_id}
                      </div>

                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        Issued by <strong>{alert.authority_level}</strong> • {alert.authorized_by}
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
                          borderRadius: '5px',
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          color: '#0369a1',
                          fontSize: '11.5px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                        title="View relocation route matrix and staging camps"
                      >
                        <Navigation size={13} />
                        <span>View Evacuation Route</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => window.print()}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '5px 10px',
                          borderRadius: '5px',
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          color: '#475569',
                          fontSize: '11.5px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        <Printer size={13} />
                        <span>Print Order</span>
                      </button>
                    </div>
                  </div>

                  {/* Card Content Grid */}
                  <div style={{ padding: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '18px' }}>
                      {/* Left: Sector & Population */}
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
                          Target Red Zone Habitations
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: '800', color: '#b91c1c', marginBottom: '6px' }}>
                          {alert.settlement_names.join(', ')}
                        </div>

                        <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#334155', marginBottom: '10px' }}>
                          <div>Threatened: <strong>{alert.threatened_population.toLocaleString('en-IN')}</strong></div>
                          <div>Vulnerable (Elderly/Children): <strong>{alert.vulnerable_population.toLocaleString('en-IN')}</strong></div>
                        </div>

                        {/* Road Status Warning */}
                        <div
                          style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            background: alert.road_access_status.includes('SEVERED') ? '#fef2f2' : '#f0fdf4',
                            border: alert.road_access_status.includes('SEVERED') ? '1px solid #fecaca' : '1px solid #bbf7d0',
                            fontSize: '11.5px',
                            color: alert.road_access_status.includes('SEVERED') ? '#991b1b' : '#166534',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                        >
                          <AlertTriangle size={15} />
                          <span>Road Condition: <strong>{alert.road_access_status}</strong></span>
                        </div>
                      </div>

                      {/* Middle: Staging Shelter & Radio Net */}
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
                          Forward Staging & Tactical Comms
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>
                          Camp: {alert.assigned_shelter_name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#475569', marginBottom: '8px' }}>
                          Capacity: <strong>{alert.assigned_shelter_capacity || 1200} persons</strong> • Medical Unit Staged
                        </div>

                        <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '11.5px', color: '#1e3a8a' }}>
                          <div><strong>VHF Radio:</strong> {alert.comms_channel}</div>
                          <div><strong>Assigned Battalion:</strong> {alert.battalion_name}</div>
                        </div>
                      </div>

                      {/* Right: Units Requisitioned */}
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
                          Requisitioned Tactical Units
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                          {alert.tactical_units_requested.map((unit, idx) => (
                            <span
                              key={idx}
                              style={{
                                fontSize: '11px',
                                fontWeight: '600',
                                padding: '3px 8px',
                                background: '#eff6ff',
                                color: '#1e40af',
                                border: '1px solid #bfdbfe',
                                borderRadius: '14px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Check size={11} />
                              {unit}
                            </span>
                          ))}
                        </div>

                        {alert.tactical_directive && (
                          <div style={{ fontSize: '11.5px', color: '#78350f', background: '#fffbeb', padding: '8px 10px', borderRadius: '6px', border: '1px solid #fde68a' }}>
                            <strong>Directive:</strong> {alert.tactical_directive}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Operational Lifecycle Stepper & Field Controller Actions */}
                    <div
                      style={{
                        background: '#f1f5f9',
                        borderRadius: '8px',
                        padding: '14px 18px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '14px'
                      }}
                    >
                      {/* Step Progress Tracker */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>
                          Deployment Progression:
                        </span>

                        {[
                          { key: 'DISPATCHED', label: 'Dispatched' },
                          { key: 'ACKNOWLEDGED', label: 'Acknowledged' },
                          { key: 'MOBILIZING', label: 'Mobilizing' },
                          { key: 'EN_ROUTE', label: 'En Route' },
                          { key: 'ON_SCENE_ACTIVE', label: 'On Scene / Active' },
                        ].map((step, idx) => {
                          const stepsArr = ['DISPATCHED', 'ACKNOWLEDGED', 'MOBILIZING', 'EN_ROUTE', 'ON_SCENE_ACTIVE']
                          const currIdx = stepsArr.indexOf(alert.status)
                          const isDone = currIdx >= idx
                          const isCurrent = alert.status === step.key

                          return (
                            <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: isCurrent ? '800' : '600',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  background: isCurrent ? '#1e3a8a' : isDone ? '#dcfce7' : '#ffffff',
                                  color: isCurrent ? '#ffffff' : isDone ? '#166534' : '#94a3b8',
                                  border: isCurrent ? '1px solid #1e3a8a' : isDone ? '1px solid #86efac' : '1px solid #cbd5e1'
                                }}
                              >
                                {isDone && !isCurrent ? '✓ ' : ''}{step.label}
                              </span>
                              {idx < 4 && <span style={{ color: '#cbd5e1', fontSize: '11px' }}>→</span>}
                            </div>
                          )
                        })}
                      </div>

                      {/* Interactive Advance Buttons for Battalion Duty Officer */}
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {alert.status === 'DISPATCHED' && (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleUpdateStatus(
                              alert.dispatch_id,
                              'ACKNOWLEDGED',
                              'NDRF 8th BN Operations Room logged tactical dispatch. Commandant alerted.'
                            )}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '6px',
                              background: '#0284c7',
                              color: '#fff',
                              border: 0,
                              fontSize: '12px',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            {isUpdating ? 'Updating...' : 'Acknowledge Requisition'}
                          </button>
                        )}

                        {alert.status === 'ACKNOWLEDGED' && (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleUpdateStatus(
                              alert.dispatch_id,
                              'MOBILIZING',
                              '3 QRF Teams mustering at RRC Haridwar Road with 4 Zodiac boats and search canines.'
                            )}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '6px',
                              background: '#2563eb',
                              color: '#fff',
                              border: 0,
                              fontSize: '12px',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            {isUpdating ? 'Updating...' : 'Muster & Mobilize QRF'}
                          </button>
                        )}

                        {alert.status === 'MOBILIZING' && (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleUpdateStatus(
                              alert.dispatch_id,
                              'EN_ROUTE',
                              'Convoys rolled out from RRC Dehradun via Thano bypass. GPS Tracking ETA 18 minutes.',
                              18
                            )}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '6px',
                              background: '#7c3aed',
                              color: '#fff',
                              border: 0,
                              fontSize: '12px',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            {isUpdating ? 'Updating...' : 'Mark Convoys En Route (ETA 18m)'}
                          </button>
                        )}

                        {alert.status === 'EN_ROUTE' && (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleUpdateStatus(
                              alert.dispatch_id,
                              'ON_SCENE_ACTIVE',
                              'Forward staging post established at Raipur Sports Complex. Zodiac boats deployed in lower basin.'
                            )}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '6px',
                              background: '#15803d',
                              color: '#fff',
                              border: 0,
                              fontSize: '12px',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            {isUpdating ? 'Updating...' : 'Mark On Scene (Commence Rescue)'}
                          </button>
                        )}

                        {alert.status === 'ON_SCENE_ACTIVE' && (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleUpdateStatus(
                              alert.dispatch_id,
                              'COMPLETED',
                              'All immediate high-risk evacuees safely decanted into Raipur Staging Camp. Sector stabilized.'
                            )}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '6px',
                              background: '#475569',
                              color: '#fff',
                              border: 0,
                              fontSize: '12px',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            {isUpdating ? 'Updating...' : 'Mark Mission Completed'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Timeline Expansion */}
                    {alert.timeline && alert.timeline.length > 0 && (
                      <div style={{ marginTop: '14px', borderTop: '1px dashed #e2e8f0', paddingTop: '10px' }}>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
                          Tactical Dispatch Timeline:
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {alert.timeline.map((entry, idx) => (
                            <div key={idx} style={{ fontSize: '11.5px', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontFamily: 'monospace', color: '#0369a1', fontWeight: '600' }}>[{entry.time}]</span>
                              <span style={{ fontWeight: '700', color: '#0f172a' }}>{entry.status}:</span>
                              <span>{entry.message}</span>
                              <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>({entry.officer})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* TAB 2: BATTALION ASSET & INVENTORY GRID */}
      {activeTab === 'INVENTORY' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '10px', padding: '20px', border: '1px solid #cbd5e1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <LifeBuoy size={20} color="#0284c7" />
              <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Water Rescue & Amphibious Equipment
              </h3>
            </div>
            <div style={{ fontSize: '12px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
                <span>Inflatable Motorized Zodiac Boats (OBM):</span>
                <strong>28 Craft (Ready)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
                <span>Deep Diving SCUBA Sets (Fast Current):</span>
                <strong>16 Units (Certified)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
                <span>High-Buoyancy PFD Life Jackets:</span>
                <strong>650 Jackets</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Throw Bags & High-Strength Tow Lines:</span>
                <strong>120 Sets</strong>
              </div>
            </div>
          </div>

          <div style={{ background: '#ffffff', borderRadius: '10px', padding: '20px', border: '1px solid #cbd5e1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <ShieldAlert size={20} color="#b91c1c" />
              <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Collapsed Structure & Landslide SAR
              </h3>
            </div>
            <div style={{ fontSize: '12px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
                <span>Canine Search Scent Squads (CSSR):</span>
                <strong>8 Dogs (Field Ready)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
                <span>High-Angle Mountain Cliff Stretchers:</span>
                <strong>40 Lightweight Titanium</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
                <span>Diamond Rotary Concrete & Rock Cutters:</span>
                <strong>18 Sets</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Search Cam & Acoustic Victim Locators:</span>
                <strong>12 Sensitive Sensors</strong>
              </div>
            </div>
          </div>

          <div style={{ background: '#ffffff', borderRadius: '10px', padding: '20px', border: '1px solid #cbd5e1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <Wifi size={20} color="#16a34a" />
              <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Drone Recon & Mobile Triage Field Care
              </h3>
            </div>
            <div style={{ fontSize: '12px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
                <span>Thermal Infrared Scouting Drones:</span>
                <strong>6 UAVs (10km Range)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
                <span>Mobile Triage Ambulances (All-Terrain):</span>
                <strong>10 4x4 Vehicles</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
                <span>Portable Oxygen Concentrators & AEDs:</span>
                <strong>35 Units</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Satellite Portable BGAN Terminals:</span>
                <strong>8 Sets (INSAT-3DR)</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: COMMUNICATIONS & SOP */}
      {activeTab === 'COMMUNICATIONS' && (
        <div style={{ background: '#ffffff', borderRadius: '10px', padding: '24px', border: '1px solid #cbd5e1' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: '0 0 12px' }}>
            Statutory Integration: DDMA ↔ NDMA ↔ NDRF Standard Operating Procedure (SOP)
          </h3>
          <p style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.6, margin: '0 0 16px' }}>
            Under <strong>Section 34 and Section 35 of the Disaster Management Act, 2005</strong>, the District Disaster Management Authority (DDMA) chaired by the District Magistrate or National Disaster Management Authority (NDMA) possesses statutory powers to requisition armed forces and NDRF battalions upon confirmation of an imminent multi-hazard catastrophe.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '12px', fontWeight: '800', color: '#1e3a8a', marginBottom: '4px' }}>
                1. AI Red Zone Confirmation
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                Copernicus Sentinel-2, DEM slope (&gt;30°), and IMD rainfall (&gt;75 mm/hr) breach trigger real-time Red Zone confirmation.
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '12px', fontWeight: '800', color: '#1e3a8a', marginBottom: '4px' }}>
                2. Digital Mobilization Requisition
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                DDMA/NDMA issues electronic requisition detailing affected headcount, severed access roads, and staging shelters.
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '12px', fontWeight: '800', color: '#1e3a8a', marginBottom: '4px' }}>
                3. Tactical Deployment & Comms
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                Battalion QRF musters within 15 minutes, synchronizes VHF Net 143.825 MHz, and establishes forward base at designated staging camps.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
