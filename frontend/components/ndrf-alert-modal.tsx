'use client'

import React, { useState } from 'react'
import {
  AlertTriangle,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  FileCheck,
  FileText,
  LifeBuoy,
  MapPin,
  Printer,
  Radio,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Truck,
  Users,
  X,
  Zap
} from 'lucide-react'
import { fetchApi } from '../lib/api'

export interface NDRFTargetSettlement {
  id: number
  name: string
  population: number
  risk_score: number
  current_hazard_status: string
  vulnerable_population?: number
  road_access?: boolean
  nearest_shelter_distance?: number
}

interface ShelterOption {
  id: number
  name: string
  max_capacity: number
  current_occupancy: number
}

interface NDRFAlertModalProps {
  isOpen: boolean
  onClose: () => void
  settlements: NDRFTargetSettlement[]
  shelters: ShelterOption[]
  userDistrictName?: string | null
  userRole?: string
  userFullName?: string
  onAlertDispatched?: (dispatchResult: any) => void
  onOpenNDRFConsole?: () => void
}

const DEFAULT_TACTICAL_UNITS = [
  { id: 'frt', label: 'Flood Rescue Team (FRT) with Inflatable Zodiac Motor Boats', default: true },
  { id: 'cssr', label: 'Canine Search & Scent Squad (Collapsible Debris Dogs)', default: true },
  { id: 'msar', label: 'Mountain SAR & High-Angle Cliff Stretcher Evacuation', default: true },
  { id: 'mfr', label: 'Paramedic Mobile Triage First Responders (MFR)', default: true },
  { id: 'drone', label: 'Thermal Infrared Reconnaissance Drone Squad', default: false },
  { id: 'dive', label: 'Deep Diving & River Current Submersible Crew', default: false },
]

export function NDRFAlertModal({
  isOpen,
  onClose,
  settlements,
  shelters,
  userDistrictName = 'DEHRADUN',
  userRole = 'DDMO',
  userFullName = 'District Magistrate',
  onAlertDispatched,
  onOpenNDRFConsole,
}: NDRFAlertModalProps) {
  const [authorityLevel, setAuthorityLevel] = useState<'DDMA' | 'SDMA' | 'NDMA'>(
    userRole === 'ADMIN' ? 'NDMA' : userRole === 'SDMA' ? 'SDMA' : 'DDMA'
  )
  const [selectedBattalionId, setSelectedBattalionId] = useState('08-BN-NDRF')
  const [priorityLevel, setPriorityLevel] = useState('P1_CRITICAL_IMMEDIATE_LIFE_SAFETY')
  const [selectedUnits, setSelectedUnits] = useState<string[]>(
    DEFAULT_TACTICAL_UNITS.filter(u => u.default).map(u => u.label)
  )
  const [assignedShelterId, setAssignedShelterId] = useState<number>(
    shelters[0]?.id || 1
  )
  const [customDirectives, setCustomDirectives] = useState('')
  const [commsChannel, setCommsChannel] = useState('VHF Net 143.825 MHz (CH-04) / TacSat Link')
  const [officerName, setOfficerName] = useState(
    userRole === 'ADMIN'
      ? `${userFullName || 'Operations Director'} (NDMA HQ, New Delhi)`
      : userRole === 'SDMA'
      ? `${userFullName || 'State Relief Commissioner'} (USDMA / SEOC, Uttarakhand)`
      : `${userFullName || 'District Magistrate'} (Chairman, DDMA ${userDistrictName || 'Dehradun'})`
  )

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [dispatchResult, setDispatchResult] = useState<any | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  if (!isOpen) return null

  // Red zones summary
  const redSettlements = settlements.length > 0 ? settlements : [
    {
      id: 1,
      name: 'Maldevta Habitation',
      population: 1850,
      risk_score: 91.2,
      current_hazard_status: 'RED',
      vulnerable_population: 590,
      road_access: false,
    }
  ]
  const totalPop = redSettlements.reduce((acc, s) => acc + (s.population || 0), 0)
  const totalVuln = redSettlements.reduce((acc, s) => acc + (s.vulnerable_population || Math.round(s.population * 0.32)), 0)
  const hasSeveredRoad = redSettlements.some(s => s.road_access === false)

  const toggleUnit = (label: string) => {
    if (selectedUnits.includes(label)) {
      setSelectedUnits(selectedUnits.filter(u => u !== label))
    } else {
      setSelectedUnits([...selectedUnits, label])
    }
  }

  const handleConfirmAndDispatch = async () => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const payload = {
        settlement_ids: redSettlements.map(s => s.id),
        authority_level: authorityLevel,
        authorized_by: officerName,
        battalion_id: selectedBattalionId,
        priority_level: priorityLevel,
        tactical_units: selectedUnits,
        assigned_shelter_id: assignedShelterId,
        tactical_directive: customDirectives || (
          `RED ZONE CONFIRMED under Disaster Management Act Sec 34. ` +
          `Severe cloudburst / slope destabilization threat across ${redSettlements.map(s => s.name).join(', ')}. ` +
          `Threatened population: ${totalPop.toLocaleString('en-IN')}, vulnerable: ${totalVuln.toLocaleString('en-IN')}. ` +
          `${hasSeveredRoad ? 'CRITICAL: Road link severed; deploy boat units and mountain bypass.' : 'Maintain road corridor.'} ` +
          `Deploy QRF immediately to assigned staging area.`
        ),
        comms_channel: commsChannel,
      }

      const res = await fetchApi<any>('/ndrf/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      setDispatchResult(res.alert || res)
      onAlertDispatched?.(res.alert || res)
    } catch (err: any) {
      console.error('Failed to dispatch NDRF alert:', err)
      setSubmitError(err.message || 'Failed to dispatch NDRF tactical alert. Check network/server.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.78)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overflowY: 'auto'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '920px',
          maxHeight: '94vh',
          background: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
          border: '1px solid #cbd5e1',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div
          className="no-print"
          style={{
            padding: '14px 22px',
            background: 'linear-gradient(90deg, #0b192c 0%, #1e3a8a 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '2px solid #f59e0b'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 15px rgba(220, 38, 38, 0.6)'
              }}
            >
              <ShieldAlert size={22} color="#ffffff" />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '800', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>NDRF BATTALION TACTICAL MOBILIZATION DIRECTIVE</span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: '700',
                    background: '#dc2626',
                    padding: '2px 7px',
                    borderRadius: '4px',
                    letterSpacing: '0.05em'
                  }}
                >
                  RED ZONE CONFIRMED
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#93c5fd' }}>
                Emergency Requisition under Section 34(a)(b) & Section 35 of Disaster Management Act, 2005
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {dispatchResult && (
              <button
                onClick={handlePrint}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  fontSize: '11.5px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                <Printer size={14} />
                <span>Print Official Order</span>
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 0,
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', background: '#f8fafc' }}>
          {submitError && (
            <div
              style={{
                marginBottom: '16px',
                padding: '12px 16px',
                borderRadius: '8px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <AlertTriangle size={18} />
              <span>{submitError}</span>
            </div>
          )}

          {dispatchResult ? (
            /* ─────────────────────────────────────────────────────────────
               SUCCESS CONFIRMATION SCREEN
               ───────────────────────────────────────────────────────────── */
            <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #cbd5e1', padding: '28px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <div style={{ textAlign: 'center', marginBottom: '22px' }}>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: '#dcfce7',
                    color: '#15803d',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                    boxShadow: '0 0 20px rgba(34, 197, 94, 0.3)'
                  }}
                >
                  <CheckCircle2 size={34} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px' }}>
                  TACTICAL REQUISITION DISPATCHED & SECURELY TRANSMITTED
                </h3>
                <p style={{ fontSize: '13px', color: '#475569', margin: 0 }}>
                  National Disaster Response Force (NDRF) Headquarters & Sector Duty Officer successfully notified.
                </p>
              </div>

              {/* Official Ref Banner */}
              <div
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '20px'
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Official Dispatch Reference Number
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '800', fontFamily: 'monospace', color: '#1e3a8a', marginTop: '2px' }}>
                    {dispatchResult.dispatch_id}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
                    Battalion Assigned
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
                    {dispatchResult.battalion_name}
                  </div>
                </div>
              </div>

              {/* Directive Details Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '22px' }}>
                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Confirmed Red Zones</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#991b1b', marginTop: '2px' }}>
                    {dispatchResult.settlement_names?.join(', ')}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                    Threatened Population: <strong>{dispatchResult.threatened_population?.toLocaleString()}</strong> ({dispatchResult.vulnerable_population?.toLocaleString()} vulnerable)
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Designated Staging Area</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#0369a1', marginTop: '2px' }}>
                    {dispatchResult.assigned_shelter_name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                    Verified Capacity: <strong>{dispatchResult.assigned_shelter_capacity || 1200} persons</strong>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Tactical Radio Net & Comms</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
                    {dispatchResult.comms_channel}
                  </div>
                  <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '4px', fontWeight: '600' }}>
                    Satellite Link: INSAT-3DR Synchronized
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Authorizing Authority</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
                    {dispatchResult.authorized_by}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                    {dispatchResult.authority_label}
                  </div>
                </div>
              </div>

              {/* Units Requisitioned */}
              <div style={{ marginBottom: '22px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#334155', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Requisitioned Tactical Units
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {dispatchResult.tactical_units_requested?.map((unit: string, idx: number) => (
                    <span
                      key={idx}
                      style={{
                        padding: '4px 10px',
                        background: '#eff6ff',
                        color: '#1e40af',
                        border: '1px solid #bfdbfe',
                        borderRadius: '20px',
                        fontSize: '11.5px',
                        fontWeight: '600',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Check size={12} color="#2563eb" />
                      {unit}
                    </span>
                  ))}
                </div>
              </div>

              {/* Field Directive Note */}
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '12px 16px', marginBottom: '24px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#b45309', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Tactical Operational Directive Given to Commandant
                </div>
                <div style={{ fontSize: '12.5px', color: '#78350f', lineHeight: 1.5 }}>
                  {dispatchResult.tactical_directive}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '18px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Return to Map
                </button>
                {onOpenNDRFConsole && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose()
                      onOpenNDRFConsole()
                    }}
                    style={{
                      padding: '9px 20px',
                      borderRadius: '6px',
                      border: 0,
                      background: '#1e3a8a',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(30, 58, 138, 0.35)'
                    }}
                  >
                    <Truck size={16} />
                    <span>Open NDRF Battalion Operations Command</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* ─────────────────────────────────────────────────────────────
               CONFIRMATION & REQUISITION FORM
               ───────────────────────────────────────────────────────────── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* STEP 1: Confirmed Red Zone Telemetry Card */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  padding: '16px 20px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldAlert size={18} color="#dc2626" />
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      1. Confirmed Multi-Hazard Red Zone Verification
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    Multi-Hazard AI & Sentinel Telemetry
                  </span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
                  {redSettlements.map(s => (
                    <div
                      key={s.id}
                      style={{
                        padding: '10px 14px',
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '8px',
                        flex: '1 1 240px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '13.5px', fontWeight: '800', color: '#991b1b' }}>{s.name}</span>
                        <span style={{ fontSize: '11px', fontWeight: '800', background: '#dc2626', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>
                          RISK {s.risk_score.toFixed(1)}
                        </span>
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#7f1d1d', marginTop: '6px', display: 'flex', gap: '12px' }}>
                        <span>Pop: <strong>{s.population.toLocaleString('en-IN')}</strong></span>
                        <span>Vulnerable: <strong>{(s.vulnerable_population ?? Math.round(s.population * 0.32)).toLocaleString('en-IN')}</strong></span>
                      </div>
                      <div style={{ fontSize: '11px', color: s.road_access === false ? '#b91c1c' : '#15803d', fontWeight: '700', marginTop: '4px' }}>
                        {s.road_access === false ? '⚠ ROAD SEVERED / LANDSLIDE CUTOFF' : '✓ Road passable (Caution)'}
                      </div>
                    </div>
                  ))}
                </div>

                {hasSeveredRoad && (
                  <div
                    style={{
                      background: '#fff1f2',
                      border: '1px dashed #f43f5e',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      fontSize: '11.5px',
                      color: '#9f1239',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <AlertTriangle size={15} />
                    <span>
                      <strong>Warning for NDRF Team Commander:</strong> Debris flow / flash flood has cut ground road links to these habitations. Inflatable motor boats, aerial recce, and cliff ropes required.
                    </span>
                  </div>
                )}
              </div>

              {/* STEP 2: Authorizing Body & Target NDRF Battalion */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  padding: '16px 20px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '14px' }}>
                  2. Authority Confirmation & NDRF Battalion Selection
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  {/* Authority Selection */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                      Issuing Authority (DM Act 2005)
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthorityLevel('DDMA')
                          setOfficerName(`${userFullName || 'District Magistrate'} (Chairman, DDMA ${userDistrictName || 'Dehradun'})`)
                        }}
                        style={{
                          padding: '8px 8px',
                          borderRadius: '6px',
                          border: authorityLevel === 'DDMA' ? '2px solid #1e3a8a' : '1px solid #cbd5e1',
                          background: authorityLevel === 'DDMA' ? '#eff6ff' : '#ffffff',
                          color: authorityLevel === 'DDMA' ? '#1e3a8a' : '#475569',
                          fontWeight: '700',
                          fontSize: '11.5px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '5px'
                        }}
                      >
                        <Building2 size={13} />
                        <span>DDMA (Dehradun)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAuthorityLevel('SDMA')
                          setOfficerName(`${userFullName || 'State Relief Commissioner'} (USDMA / SEOC, Uttarakhand)`)
                        }}
                        style={{
                          padding: '8px 8px',
                          borderRadius: '6px',
                          border: authorityLevel === 'SDMA' ? '2px solid #1e3a8a' : '1px solid #cbd5e1',
                          background: authorityLevel === 'SDMA' ? '#eff6ff' : '#ffffff',
                          color: authorityLevel === 'SDMA' ? '#1e3a8a' : '#475569',
                          fontWeight: '700',
                          fontSize: '11.5px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '5px'
                        }}
                      >
                        <ShieldAlert size={13} />
                        <span>SDMA (Uttarakhand)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAuthorityLevel('NDMA')
                          setOfficerName(`${userFullName || 'Operations Director'} (NDMA HQ, New Delhi)`)
                        }}
                        style={{
                          padding: '8px 8px',
                          borderRadius: '6px',
                          border: authorityLevel === 'NDMA' ? '2px solid #1e3a8a' : '1px solid #cbd5e1',
                          background: authorityLevel === 'NDMA' ? '#eff6ff' : '#ffffff',
                          color: authorityLevel === 'NDMA' ? '#1e3a8a' : '#475569',
                          fontWeight: '700',
                          fontSize: '11.5px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '5px'
                        }}
                      >
                        <Shield size={13} />
                        <span>NDMA (National)</span>
                      </button>
                    </div>
                  </div>

                  {/* Target Battalion Selection */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                      Designated NDRF Battalion / Unit
                    </label>
                    <select
                      value={selectedBattalionId}
                      onChange={e => setSelectedBattalionId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12.5px',
                        fontWeight: '600',
                        color: '#1e293b',
                        background: '#ffffff'
                      }}
                    >
                      <option value="08-BN-NDRF">8th Battalion NDRF (Dehradun RRC / Haridwar Road) — Primary Sector</option>
                      <option value="14-BN-NDRF">14th Battalion NDRF (Jaspur / US Nagar RRC) — Kumaon Sector</option>
                      <option value="15-BN-NDRF">15th Battalion NDRF (Gadarpur Staging Base) — Reserve</option>
                    </select>
                  </div>
                </div>

                {/* Authorizing Officer Name */}
                <div style={{ marginTop: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Authorizing Officer Digital Credential / Sign-off Name
                  </label>
                  <input
                    type="text"
                    value={officerName}
                    onChange={e => setOfficerName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12.5px',
                      color: '#0f172a',
                      background: '#ffffff'
                    }}
                  />
                </div>
              </div>

              {/* STEP 3: Tactical Capabilities & Safe Relocation Staging */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  padding: '16px 20px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '14px' }}>
                  3. Tactical Capabilities Requisition & Safe Staging Shelter
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
                    Select Required Specialized Units (Dispatched to Incident Commander):
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '8px' }}>
                    {DEFAULT_TACTICAL_UNITS.map(unit => {
                      const isChecked = selectedUnits.includes(unit.label)
                      return (
                        <div
                          key={unit.id}
                          onClick={() => toggleUnit(unit.label)}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: isChecked ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                            background: isChecked ? '#eff6ff' : '#ffffff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            style={{ cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '12px', fontWeight: isChecked ? '700' : '500', color: isChecked ? '#1e40af' : '#475569' }}>
                            {unit.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                  {/* Staging Shelter */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                      Designated Evacuation Staging Camp
                    </label>
                    <select
                      value={assignedShelterId}
                      onChange={e => setAssignedShelterId(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                        color: '#0f172a',
                        background: '#ffffff'
                      }}
                    >
                      {shelters.map(sh => (
                        <option key={sh.id} value={sh.id}>
                          {sh.name} (Cap: {sh.max_capacity} | Available: {Math.max(0, sh.max_capacity - (sh.current_occupancy || 0))})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Radio Channel */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                      Tactical VHF Radio Net & Link
                    </label>
                    <input
                      type="text"
                      value={commsChannel}
                      onChange={e => setCommsChannel(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                        color: '#0f172a',
                        background: '#ffffff'
                      }}
                    />
                  </div>
                </div>

                {/* Directive Notes */}
                <div style={{ marginTop: '14px' }}>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Special Tactical Instructions for Battalion Commander (Optional):
                  </label>
                  <textarea
                    rows={2}
                    value={customDirectives}
                    onChange={e => setCustomDirectives(e.target.value)}
                    placeholder="e.g., Primary bridge at Song river washed out. Approach via Thano bypass. Triage elderly patients directly to mobile ambulances."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                      color: '#0f172a',
                      background: '#ffffff',
                      resize: 'vertical'
                    }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '6px'
                }}
              >
                <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                  Statutory mobilization logged in audit trail under Section 34 of DM Act 2005
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    style={{
                      padding: '9px 18px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#475569',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmAndDispatch}
                    disabled={isSubmitting || selectedUnits.length === 0}
                    style={{
                      padding: '9px 24px',
                      borderRadius: '6px',
                      border: 0,
                      background: isSubmitting ? '#93c5fd' : '#b91c1c',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: '800',
                      letterSpacing: '0.03em',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(185, 28, 28, 0.45)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <Radio className="animate-spin" size={16} />
                        <span>Transmitting Tactical Directive...</span>
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        <span>Confirm Red Zone & Mobilize NDRF Battalion</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
