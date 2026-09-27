'use client'

import React, { useState, useMemo } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Compass,
  HeartPulse,
  Navigation,
  RefreshCw,
  Shuffle,
  Users,
  X
} from 'lucide-react'

export interface AllocationItem {
  habitation_id: number
  habitation_name: string
  shelter_id: number
  shelter_name: string
  people_allocated: number
  distance_km: number
  medical_facility_matched: boolean
  route_positions?: [number, number][]
}

export interface ShelterCandidate {
  id: number
  name: string
  max_capacity: number
  current_occupancy: number
  water_available: boolean
  medical_facilities: boolean
  latitude: number
  longitude: number
}

interface ReallocateModalProps {
  isOpen: boolean
  onClose: () => void
  allocation: AllocationItem | null
  shelters: ShelterCandidate[]
  onConfirmReallocation: (
    habitationId: number,
    oldShelterId: number,
    newShelterId: number,
    newShelterName: string,
    newDistanceKm: number,
    medicalMatched: boolean
  ) => void
}

function haversineDist(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371.0
  const dLat = ((lat2 - lat1) * Math.PI) / 180.0
  const dLon = ((lon2 - lon1) * Math.PI) / 180.0
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180.0) *
      Math.cos((lat2 * Math.PI) / 180.0) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c * 10) / 10
}

export function ReallocateModal({
  isOpen,
  onClose,
  allocation,
  shelters,
  onConfirmReallocation
}: ReallocateModalProps) {
  if (!isOpen || !allocation) return null

  // Find candidate shelters excluding the currently assigned one
  const currentShelter = shelters.find(s => s.id === allocation.shelter_id)
  const otherShelters = shelters.filter(s => s.id !== allocation.shelter_id)

  const [selectedShelterId, setSelectedShelterId] = useState<number>(
    otherShelters[0]?.id ?? allocation.shelter_id
  )
  const [isProcessing, setIsProcessing] = useState(false)

  const targetShelter = shelters.find(s => s.id === selectedShelterId)

  // Calculate projected capacity
  const targetCurrentOcc = targetShelter?.current_occupancy || 0
  const targetMaxCap = targetShelter?.max_capacity || 1
  const projectedOcc = targetCurrentOcc + allocation.people_allocated
  const projectedPct = Math.round((projectedOcc / targetMaxCap) * 100)
  const isOverCapacity = projectedOcc > targetMaxCap

  // Estimate distance
  const newDistance = useMemo(() => {
    if (!targetShelter) return allocation.distance_km
    // If coordinates exist
    if (allocation.route_positions && allocation.route_positions.length > 0) {
      const habLat = allocation.route_positions[0][0]
      const habLon = allocation.route_positions[0][1]
      return haversineDist(habLat, habLon, targetShelter.latitude, targetShelter.longitude)
    }
    return Math.round((allocation.distance_km * 1.15) * 10) / 10
  }, [allocation, targetShelter])

  const handleConfirm = () => {
    if (!targetShelter) return
    setIsProcessing(true)
    setTimeout(() => {
      onConfirmReallocation(
        allocation.habitation_id,
        allocation.shelter_id,
        targetShelter.id,
        targetShelter.name,
        newDistance,
        targetShelter.medical_facilities
      )
      setIsProcessing(false)
      onClose()
    }, 400)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(4px)',
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
          maxWidth: '620px',
          background: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: '1px solid #cbd5e1',
          color: '#1e293b',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: 'Arial, sans-serif'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 22px',
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #334155'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: '#0284c7',
                display: 'grid',
                placeItems: 'center'
              }}
            >
              <Shuffle size={18} color="#ffffff" />
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.06em', color: '#38bdf8' }}>
                CARRYING CAPACITY REALLOCATION OVERRIDE
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', margin: '2px 0 0', color: '#ffffff' }}>
                Reallocate {allocation.habitation_name}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 0, color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '22px' }}>
          {/* Evacuee Batch Summary */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderRadius: '8px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              marginBottom: '18px'
            }}
          >
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>VULNERABLE HABITATION</span>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                {allocation.habitation_name}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>EVACUEE HEADCOUNT</span>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#dc2626' }}>
                {allocation.people_allocated.toLocaleString()} persons
              </div>
            </div>
          </div>

          {/* Current vs New Shelter Comparison */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '12px', alignItems: 'center', marginBottom: '20px' }}>
            {/* Current Shelter */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                background: '#f1f5f9',
                border: '1px solid #cbd5e1'
              }}
            >
              <div style={{ fontSize: '10px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>
                Currently Assigned
              </div>
              <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#334155', marginTop: '3px' }}>
                {allocation.shelter_name}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                Distance: {allocation.distance_km} km
              </div>
            </div>

            <div style={{ display: 'grid', placeItems: 'center', color: '#0284c7' }}>
              <ArrowRight size={22} />
            </div>

            {/* Target Shelter Selector */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                background: isOverCapacity ? '#fff5f5' : '#f0fdf4',
                border: isOverCapacity ? '1.5px solid #fecaca' : '1.5px solid #bbf7d0'
              }}
            >
              <div style={{ fontSize: '10px', fontWeight: '800', color: isOverCapacity ? '#b91c1c' : '#166534', textTransform: 'uppercase' }}>
                Target Alternative Shelter
              </div>
              <select
                value={selectedShelterId}
                onChange={e => setSelectedShelterId(Number(e.target.value))}
                style={{
                  width: '100%',
                  marginTop: '4px',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  fontWeight: '700',
                  color: '#0f172a',
                  background: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                {shelters.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} (Cap: {s.max_capacity})
                  </option>
                ))}
              </select>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                Est. Distance: ~{newDistance} km
              </div>
            </div>
          </div>

          {/* Carrying Capacity Impact Assessment */}
          {targetShelter && (
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '8px',
                background: isOverCapacity ? '#fff5f5' : '#f8fafc',
                border: isOverCapacity ? '1.5px solid #f87171' : '1px solid #e2e8f0',
                marginBottom: '16px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: '800', color: isOverCapacity ? '#991b1b' : '#334155' }}>
                  PROJECTED SHELTER CARRYING CAPACITY INTAKE
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '800',
                    color: isOverCapacity ? '#dc2626' : projectedPct >= 80 ? '#d97706' : '#16a34a'
                  }}
                >
                  {projectedPct}% ({projectedOcc}/{targetMaxCap})
                </span>
              </div>

              {/* Capacity Progress Bar */}
              <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.min(100, projectedPct)}%`,
                    height: '100%',
                    background: isOverCapacity ? '#dc2626' : projectedPct >= 80 ? '#d97706' : '#16a34a',
                    transition: 'width 0.25s ease'
                  }}
                />
              </div>

              {/* Amenities pill */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px', alignItems: 'center' }}>
                {targetShelter.medical_facilities && (
                  <span style={{ fontSize: '10px', fontWeight: '700', color: '#15803d', background: '#dcfce7', padding: '2px 8px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <HeartPulse size={12} /> Medical Triage Unit Active
                  </span>
                )}
                {targetShelter.water_available && (
                  <span style={{ fontSize: '10px', fontWeight: '700', color: '#0369a1', background: '#e0f2fe', padding: '2px 8px', borderRadius: '4px' }}>
                    Potable Water Tankers Staged
                  </span>
                )}
              </div>

              {isOverCapacity && (
                <div style={{ marginTop: '10px', fontSize: '11.5px', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
                  <AlertTriangle size={15} />
                  <span>Warning: Shelter capacity exceeded by {(projectedOcc - targetMaxCap).toLocaleString()} persons! Secondary relief tents required.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div
          style={{
            padding: '14px 22px',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px'
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing || selectedShelterId === allocation.shelter_id}
            style={{
              padding: '8px 20px',
              borderRadius: '6px',
              border: 0,
              background: '#1c5d8c',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              opacity: isProcessing || selectedShelterId === allocation.shelter_id ? 0.6 : 1
            }}
          >
            <Shuffle size={14} />
            <span>{isProcessing ? 'Reallocating...' : 'Confirm Reallocation'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
