'use client'

import React, { useState } from 'react'
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Copy,
  Languages,
  MessageSquare,
  Radio,
  Send,
  Smartphone,
  Users,
  X,
  Zap
} from 'lucide-react'

interface CitizenBroadcastModalProps {
  isOpen: boolean
  onClose: () => void
  affectedHabitations?: string[]
  primaryShelterName?: string
}

export function CitizenBroadcastModal({
  isOpen,
  onClose,
  affectedHabitations = ['Maldevta Habitation', 'Sahastradhara Village', 'Kholi Hamlet'],
  primaryShelterName = 'Raipur Sports Complex Staging Camp'
}: CitizenBroadcastModalProps) {
  const [activeLanguage, setActiveLanguage] = useState<'both' | 'en' | 'hi'>('both')
  const [selectedChannel, setSelectedChannel] = useState<'cbs' | 'sms' | 'whatsapp'>('cbs')
  const [isDispatching, setIsDispatching] = useState(false)
  const [dispatchStage, setDispatchStage] = useState('')
  const [dispatchedSuccess, setDispatchedSuccess] = useState(false)
  const [copiedEn, setCopiedEn] = useState(false)
  const [copiedHi, setCopiedHi] = useState(false)

  if (!isOpen) return null

  const targetList = affectedHabitations.join(', ')

  const englishAlertText = `[CRITICAL EMERGENCY ALERT - SDMA / NDRF]
EXTREME LANDSLIDE & FLOOD RISK WARNING: Real-time satellite & radar monitoring indicates severe ground instability in ${targetList}.
MANDATORY EVACUATION: All residents must immediately move to ${primaryShelterName}. Transit route is open via Raipur Road. Emergency medical and relief supplies are active.
DO NOT STAY IN LOW-LYING STRUCTURES.
For emergency rescue & transport: DIAL 1077 (District Control Room) or 112.`

  const hindiAlertText = `[आपदा आपातकालीन चेतावनी - उत्तराखंड SDMA / NDRF]
भूस्खलन एवं जलप्रलय की चेतावनी: उपग्रह एवं रडार निगरानी द्वारा ${targetList} क्षेत्र में तत्काल गंभीर खतरे की पहचान की गई है।
अनिवार्य स्थानांतरण: सभी नागरिक तुरंत अपने घरों को खाली कर सुरक्षित आश्रय स्थल "${primaryShelterName}" में पहुंचे। रायपुर मार्ग आवागमन हेतु खुला है। चिकित्सा एवं भोजन व्यवस्था उपलब्ध है।
कच्चे व ढलान वाले मकानों में कदापि न रुकें।
आपातकालीन सहायता व वाहन हेतु संपर्क करें: डायल 1077 (कंट्रोल रूम) अथवा 112.`

  const handleCopy = (text: string, type: 'en' | 'hi') => {
    navigator.clipboard.writeText(text)
    if (type === 'en') {
      setCopiedEn(true)
      setTimeout(() => setCopiedEn(false), 2000)
    } else {
      setCopiedHi(true)
      setTimeout(() => setCopiedHi(false), 2000)
    }
  }

  const handleSimulateDispatch = () => {
    setIsDispatching(true)
    setDispatchedSuccess(false)
    setDispatchStage('Encoding OASIS Common Alerting Protocol (CAP v1.2) XML payload...')

    setTimeout(() => {
      setDispatchStage('Synchronizing with C-DAC & Telecom Service Provider (TSP) Gateways...')
    }, 900)

    setTimeout(() => {
      setDispatchStage('Broadcasting high-priority signal over Tower Sector DEHRADUN-NORTH-04...')
    }, 1800)

    setTimeout(() => {
      setIsDispatching(false)
      setDispatchedSuccess(true)
    }, 2700)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.7)',
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
          maxWidth: '740px',
          maxHeight: '92vh',
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
        {/* Modal Header */}
        <div
          style={{
            padding: '18px 24px',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #334155'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: '#dc2626',
                display: 'grid',
                placeItems: 'center',
                boxShadow: '0 0 14px rgba(220, 38, 38, 0.6)'
              }}
            >
              <Radio size={22} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.06em', color: '#f87171' }}>
                  COMMON ALERTING PROTOCOL (CAP v1.2)
                </span>
                <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.15)', padding: '1px 6px', borderRadius: '4px' }}>
                  PRIORITY: EXTREME
                </span>
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: '800', margin: '2px 0 0', color: '#ffffff' }}>
                Bilingual Citizen Alert Dispatcher
              </h3>
            </div>
          </div>

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

        {/* Modal Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {/* Target Telemetry Banner */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.4fr 1fr 1fr',
              gap: '12px',
              padding: '14px 18px',
              borderRadius: '8px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              marginBottom: '20px'
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>GEO-TARGETED CELL SECTOR</div>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                DEHRADUN-RIDGE-TWR-04
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                Covers Maldevta, Sahastradhara & Kholi
              </div>
            </div>

            <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '14px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>TARGET AUDIENCE</div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#0284c7', marginTop: '2px' }}>
                ~3,420 Mobiles
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                Active SIMs in polygon
              </div>
            </div>

            <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '14px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>EMERGENCY DESTINATION</div>
              <div style={{ fontSize: '12px', fontWeight: '800', color: '#16a34a', marginTop: '2px' }}>
                Raipur Sports Complex
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                Water & Medical Ready
              </div>
            </div>
          </div>

          {/* Delivery Channel Selector */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>
              SELECT DISPATCH CHANNELS
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setSelectedChannel('cbs')}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: selectedChannel === 'cbs' ? '2px solid #dc2626' : '1px solid #cbd5e1',
                  background: selectedChannel === 'cbs' ? '#fff5f5' : '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <Radio size={18} color={selectedChannel === 'cbs' ? '#dc2626' : '#64748b'} />
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '800', color: selectedChannel === 'cbs' ? '#991b1b' : '#334155' }}>
                    Cell Broadcast (CBS)
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>Audio override alarm</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedChannel('sms')}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: selectedChannel === 'sms' ? '2px solid #0284c7' : '1px solid #cbd5e1',
                  background: selectedChannel === 'sms' ? '#f0f9ff' : '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <Smartphone size={18} color={selectedChannel === 'sms' ? '#0284c7' : '#64748b'} />
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '800', color: selectedChannel === 'sms' ? '#0369a1' : '#334155' }}>
                    Telecom SMS (C-DAC)
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>100% network delivery</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedChannel('whatsapp')}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: selectedChannel === 'whatsapp' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                  background: selectedChannel === 'whatsapp' ? '#f0fdf4' : '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <MessageSquare size={18} color={selectedChannel === 'whatsapp' ? '#16a34a' : '#64748b'} />
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '800', color: selectedChannel === 'whatsapp' ? '#15803d' : '#334155' }}>
                    WhatsApp Broadcast
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>Panchayat heads list</div>
                </div>
              </button>
            </div>
          </div>

          {/* Bilingual Alert Text Preview */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a' }}>
                ALERT CONTENT (OFFICIAL PAYLOAD)
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setActiveLanguage('both')}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '700',
                    border: '1px solid #cbd5e1',
                    background: activeLanguage === 'both' ? '#0f172a' : '#ffffff',
                    color: activeLanguage === 'both' ? '#ffffff' : '#475569',
                    cursor: 'pointer'
                  }}
                >
                  Bilingual (Both)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLanguage('hi')}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '700',
                    border: '1px solid #cbd5e1',
                    background: activeLanguage === 'hi' ? '#0f172a' : '#ffffff',
                    color: activeLanguage === 'hi' ? '#ffffff' : '#475569',
                    cursor: 'pointer'
                  }}
                >
                  Hindi (हिंदी)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLanguage('en')}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '700',
                    border: '1px solid #cbd5e1',
                    background: activeLanguage === 'en' ? '#0f172a' : '#ffffff',
                    color: activeLanguage === 'en' ? '#ffffff' : '#475569',
                    cursor: 'pointer'
                  }}
                >
                  English
                </button>
              </div>
            </div>

            {/* Hindi Box */}
            {(activeLanguage === 'both' || activeLanguage === 'hi') && (
              <div
                style={{
                  position: 'relative',
                  padding: '14px 16px',
                  borderRadius: '8px',
                  background: '#fffbeb',
                  border: '1.5px solid #fde68a',
                  marginBottom: activeLanguage === 'both' ? '12px' : '0'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#b45309' }}>
                    हिंदी प्रसारण (HINDI BROADCAST)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(hindiAlertText, 'hi')}
                    style={{
                      background: 'transparent',
                      border: 0,
                      color: '#b45309',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {copiedHi ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                    <span>{copiedHi ? 'Copied' : 'Copy Text'}</span>
                  </button>
                </div>
                <div style={{ fontSize: '12px', color: '#78350f', whiteSpace: 'pre-line', lineHeight: '1.6', fontFamily: 'Arial, sans-serif' }}>
                  {hindiAlertText}
                </div>
              </div>
            )}

            {/* English Box */}
            {(activeLanguage === 'both' || activeLanguage === 'en') && (
              <div
                style={{
                  position: 'relative',
                  padding: '14px 16px',
                  borderRadius: '8px',
                  background: '#f0fdf4',
                  border: '1.5px solid #bbf7d0'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#15803d' }}>
                    ENGLISH BROADCAST
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(englishAlertText, 'en')}
                    style={{
                      background: 'transparent',
                      border: 0,
                      color: '#15803d',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {copiedEn ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                    <span>{copiedEn ? 'Copied' : 'Copy Text'}</span>
                  </button>
                </div>
                <div style={{ fontSize: '12px', color: '#14532d', whiteSpace: 'pre-line', lineHeight: '1.6', fontFamily: 'monospace' }}>
                  {englishAlertText}
                </div>
              </div>
            )}
          </div>

          {/* Dispatch Progress / Success Notification */}
          {isDispatching && (
            <div
              style={{
                padding: '14px',
                borderRadius: '8px',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <div
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  border: '2px solid #0284c7',
                  borderTopColor: 'transparent',
                  animation: 'spin 1s linear infinite'
                }}
              />
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#1e40af' }}>
                {dispatchStage}
              </span>
            </div>
          )}

          {dispatchedSuccess && (
            <div
              style={{
                padding: '14px 18px',
                borderRadius: '8px',
                background: '#f0fdf4',
                border: '1.5px solid #86efac',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}
            >
              <CheckCircle2 size={20} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#15803d' }}>
                  CAP Broadcast Dispatched Successfully!
                </div>
                <div style={{ fontSize: '11px', color: '#166534', marginTop: '2px', lineHeight: '1.5' }}>
                  Signal delivered across <strong>3,420 registered devices</strong> in Cell Sector DEHRADUN-RIDGE-TWR-04 via {selectedChannel.toUpperCase()}. Average transit latency: 1.4s. Delivery verification rate: <strong>99.4%</strong>.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            background: '#f8fafc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ fontSize: '11px', color: '#64748b' }}>
            Integrated with NDMA CAP-Sachet & TRAI Cell Broadcast framework
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
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
              Close
            </button>
            <button
              onClick={handleSimulateDispatch}
              disabled={isDispatching}
              style={{
                padding: '8px 20px',
                borderRadius: '6px',
                border: 0,
                background: '#dc2626',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 10px rgba(220, 38, 38, 0.4)',
                opacity: isDispatching ? 0.7 : 1
              }}
            >
              <Radio size={15} />
              <span>{isDispatching ? 'Transmitting...' : 'Dispatch Live Broadcast'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
