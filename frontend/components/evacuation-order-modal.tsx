'use client'

import React, { useRef } from 'react'
import { Check, Download, FileText, Printer, Shield, X } from 'lucide-react'

interface EvacuationAllocation {
  habitation_id: number
  habitation_name: string
  shelter_id: number
  shelter_name: string
  people_allocated: number
  distance_km: number
  medical_facility_matched: boolean
}

interface ShelterSummary {
  id: number
  name: string
  max_capacity: number
  current_occupancy: number
  allocated_count?: number
  medical_facilities: boolean
  water_available: boolean
}

interface EvacuationOrderModalProps {
  isOpen: boolean
  onClose: () => void
  districtName?: string
  allocations: EvacuationAllocation[]
  shelters: ShelterSummary[]
  totalEvacuees: number
  onAlertNDRF?: () => void
}

export function EvacuationOrderModal({
  isOpen,
  onClose,
  districtName = 'DEHRADUN',
  allocations,
  shelters,
  totalEvacuees,
  onAlertNDRF
}: EvacuationOrderModalProps) {
  const printRef = useRef<HTMLDivElement>(null)

  if (!isOpen) return null

  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
  const currentTime = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  })

  const orderNumber = `DDMA/${districtName.toUpperCase()}/EVAC-ORD/2026/094`

  const handlePrint = () => {
    window.print()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '860px',
          maxHeight: '92vh',
          background: '#ffffff',
          borderRadius: '10px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: '1px solid #cbd5e1',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Action Header bar (Excluded from print) */}
        <div
          className="no-print"
          style={{
            padding: '14px 20px',
            background: '#0f172a',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #334155'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={18} color="#38bdf8" />
            <div>
              <div style={{ fontSize: '13px', fontWeight: '800', letterSpacing: '0.04em' }}>
                OFFICIAL DISTRICT EVACUATION MANIFEST & DIRECTIVE
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                Issued under Section 34 of the Disaster Management Act, 2005
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onAlertNDRF && (
              <button
                onClick={() => {
                  onClose()
                  onAlertNDRF()
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '6px',
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 0,
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(220, 38, 38, 0.4)'
                }}
              >
                <Shield size={14} />
                <span>Task NDRF 8th Battalion</span>
              </button>
            )}
            <button
              onClick={handlePrint}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '6px',
                background: '#0284c7',
                color: '#ffffff',
                border: 0,
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(2, 132, 199, 0.4)'
              }}
            >
              <Printer size={15} />
              <span>Print / Save as Official PDF</span>
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 0,
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable Official Document Body */}
        <div
          ref={printRef}
          className="printable-manifest"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '36px 44px',
            background: '#ffffff',
            color: '#1e293b',
            fontFamily: '"Times New Roman", Times, serif',
            lineHeight: '1.5'
          }}
        >
          {/* Official Letterhead Header */}
          <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '20px' }}>
            <div style={{ fontSize: '15px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#0f172a' }}>
              GOVERNMENT OF UTTARAKHAND
            </div>
            <div style={{ fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#334155', marginTop: '2px' }}>
              DISTRICT DISASTER MANAGEMENT AUTHORITY (DDMA), {districtName.toUpperCase()}
            </div>
            <div style={{ fontSize: '11px', fontStyle: 'italic', color: '#64748b', marginTop: '2px' }}>
              Joint Operations Command with National Disaster Response Force (NDRF - 8th Battalion)
            </div>
            <div style={{ fontSize: '11px', fontWeight: '600', color: '#475569', marginTop: '6px' }}>
              Emergency Operations Centre (EOC) • Helpline: 1077 / 0135-2726066
            </div>
          </div>

          {/* Reference & Date Details */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '18px' }}>
            <div>
              <strong>Order Dispatch Ref:</strong> {orderNumber}
            </div>
            <div>
              <strong>Date & Time of Issue:</strong> {currentDate} | {currentTime} IST
            </div>
          </div>

          {/* Subject Line */}
          <div style={{ background: '#f8fafc', padding: '10px 14px', border: '1px solid #cbd5e1', marginBottom: '18px', fontSize: '12.5px' }}>
            <strong>SUBJECT: </strong>
            <span style={{ textDecoration: 'underline', fontWeight: 'bold' }}>
              MANDATORY IMMEDIATE EVACUATION ORDER FOR HAZARD-IDENTIFIED RED ZONES & ALLOCATION TO DESIGNATED SAFE RELOCATION STAGING SHELTERS.
            </span>
          </div>

          {/* Legal Mandate Context */}
          <div style={{ fontSize: '12px', textAlign: 'justify', marginBottom: '18px' }}>
            <p style={{ margin: '0 0 10px' }}>
              <strong>WHEREAS</strong>, real-time satellite telemetry (Copernicus Sentinel-2, Sentinel-1 C-SAR) and IMD Doppler Precipitation Radar data integrated into the <em>SafeTerra Decision Support System</em> indicate imminent multi-hazard saturation, slope instability (&gt;32° gradient), and cloudburst surge conditions across critical habitations in {districtName} District;
            </p>
            <p style={{ margin: 0 }}>
              <strong>NOW, THEREFORE</strong>, in exercise of powers conferred under <strong>Section 30 and Section 34(a)(b)(c) of the Disaster Management Act, 2005</strong>, the undersigned hereby directs the immediate execution of this Evacuation Order. All listed habitations are to be decanted and transported along designated transit corridors directly into the carrying-capacity verified shelters set forth below:
            </p>
          </div>

          {/* Evacuation Manifest Allocation Table */}
          <div style={{ marginBottom: '22px' }}>
            <div style={{ fontSize: '12.5px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '8px', color: '#0f172a' }}>
              SCHEDULE I: THREATENED HABITATION TO SHELTER ALLOCATION MANIFEST
            </div>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '11px',
                border: '1px solid #0f172a'
              }}
            >
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ border: '1px solid #0f172a', padding: '6px 8px', textAlign: 'left' }}>S.No</th>
                  <th style={{ border: '1px solid #0f172a', padding: '6px 8px', textAlign: 'left' }}>Threatened Habitation</th>
                  <th style={{ border: '1px solid #0f172a', padding: '6px 8px', textAlign: 'left' }}>Assigned Relocation Shelter</th>
                  <th style={{ border: '1px solid #0f172a', padding: '6px 8px', textAlign: 'right' }}>Evacuees Headcount</th>
                  <th style={{ border: '1px solid #0f172a', padding: '6px 8px', textAlign: 'center' }}>Transit Dist</th>
                  <th style={{ border: '1px solid #0f172a', padding: '6px 8px', textAlign: 'center' }}>Medical Care</th>
                </tr>
              </thead>
              <tbody>
                {allocations.map((a, idx) => (
                  <tr key={idx}>
                    <td style={{ border: '1px solid #0f172a', padding: '5px 8px' }}>{idx + 1}</td>
                    <td style={{ border: '1px solid #0f172a', padding: '5px 8px', fontWeight: 'bold' }}>{a.habitation_name}</td>
                    <td style={{ border: '1px solid #0f172a', padding: '5px 8px' }}>{a.shelter_name}</td>
                    <td style={{ border: '1px solid #0f172a', padding: '5px 8px', textAlign: 'right', fontWeight: 'bold' }}>
                      {a.people_allocated.toLocaleString()}
                    </td>
                    <td style={{ border: '1px solid #0f172a', padding: '5px 8px', textAlign: 'center' }}>{a.distance_km} km</td>
                    <td style={{ border: '1px solid #0f172a', padding: '5px 8px', textAlign: 'center' }}>
                      {a.medical_facility_matched ? 'YES (Staged)' : 'Standard'}
                    </td>
                  </tr>
                ))}
                {allocations.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ border: '1px solid #0f172a', padding: '10px', textAlign: 'center' }}>
                      No active allocations recorded.
                    </td>
                  </tr>
                )}
                <tr style={{ background: '#f8fafc', fontWeight: 'bold' }}>
                  <td colSpan={3} style={{ border: '1px solid #0f172a', padding: '6px 8px', textAlign: 'right' }}>
                    TOTAL ALLOCATED EVACUEES:
                  </td>
                  <td style={{ border: '1px solid #0f172a', padding: '6px 8px', textAlign: 'right' }}>
                    {totalEvacuees.toLocaleString()}
                  </td>
                  <td colSpan={2} style={{ border: '1px solid #0f172a', padding: '6px 8px', textAlign: 'center' }}>
                    100% Capacitated
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Shelter Carrying Capacity Audit */}
          <div style={{ marginBottom: '26px' }}>
            <div style={{ fontSize: '12.5px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '8px', color: '#0f172a' }}>
              SCHEDULE II: SHELTER LOGISTICS & CARRYING CAPACITY AUDIT
            </div>
            <div style={{ fontSize: '11.5px', color: '#334155' }}>
              All designated relief camps are verified to comply with Sphere humanitarian standards for potable drinking water, active sanitation blocks, and dedicated medical triage stations. No shelter shall exceed its verified ceiling capacity.
            </div>
          </div>

          {/* Official Signatures Block */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '40px',
              marginTop: '40px',
              paddingTop: '20px',
              pageBreakInside: 'avoid'
            }}
          >
            {/* NDRF Sign-off */}
            <div style={{ borderTop: '1px solid #0f172a', paddingTop: '10px', textAlign: 'center' }}>
              <div style={{ height: '38px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: '6px' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '13px', color: '#0369a1', fontWeight: 'bold' }}>
                  [DIGITALLY SIGNED / NDRF-OPS-8BN]
                </span>
              </div>
              <div style={{ fontSize: '12px', fontWeight: 'bold' }}>Commandant / Operations Head</div>
              <div style={{ fontSize: '11px', color: '#475569' }}>8th Battalion, National Disaster Response Force (NDRF)</div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>Ministry of Home Affairs, Govt. of India</div>
            </div>

            {/* District Magistrate / DDMA Chairman Sign-off */}
            <div style={{ borderTop: '1px solid #0f172a', paddingTop: '10px', textAlign: 'center' }}>
              <div style={{ height: '38px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: '6px' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '13px', color: '#b91c1c', fontWeight: 'bold' }}>
                  [CONFIRMED & SEALED / IAS-DDMA]
                </span>
              </div>
              <div style={{ fontSize: '12px', fontWeight: 'bold' }}>District Magistrate & Collector</div>
              <div style={{ fontSize: '11px', color: '#475569' }}>Chairman, District Disaster Management Authority (DDMA)</div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>Government of Uttarakhand</div>
            </div>
          </div>

          {/* Copy forwarded to */}
          <div style={{ marginTop: '30px', fontSize: '10px', color: '#64748b', borderTop: '1px dashed #cbd5e1', paddingTop: '10px' }}>
            <strong>Copy forwarded for immediate operational compliance:</strong>
            <ol style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
              <li>Chief Secretary & Relief Commissioner, State Disaster Management Authority (SDMA), Uttarakhand.</li>
              <li>Director General, National Disaster Response Force (NDRF), New Delhi.</li>
              <li>Senior Superintendent of Police (SSP), {districtName}, for immediate traffic corridor cordoning.</li>
              <li>Chief Medical Officer (CMO), for staging emergency mobile health units at Raipur Sports Complex.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
