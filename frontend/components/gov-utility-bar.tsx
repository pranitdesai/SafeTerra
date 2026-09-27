'use client'

import React, { useEffect, useState } from 'react'
import { ChevronDown, Globe, Languages, Shield } from 'lucide-react'

declare global {
  interface Window {
    google?: any
    googleTranslateElementInit?: () => void
  }
}

const INDIAN_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ' }
]

export function GovUtilityBar() {
  const [selectedLang, setSelectedLang] = useState<string>('en')
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'larger'>('normal')

  useEffect(() => {
    // 1. Initialize Google Translate hidden engine
    window.googleTranslateElementInit = function () {
      if (window.google?.translate?.TranslateElement) {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: 'en',
            includedLanguages: 'en,hi,bn,te,mr,ta,gu,kn,ml,pa,or',
            layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
            autoDisplay: false
          },
          'google_translate_element_hidden'
        )
      }
    }

    // 2. Load Google Translate script once
    const existingScript = document.getElementById('google-translate-script')
    if (!existingScript) {
      const script = document.createElement('script')
      script.id = 'google-translate-script'
      script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
      script.async = true
      document.body.appendChild(script)
    } else if (window.google?.translate) {
      window.googleTranslateElementInit()
    }
  }, [])

  // Change language via cookie and trigger the hidden Google Translate combo
  const applyLanguage = (code: string) => {
    setSelectedLang(code)
    try {
      const domain = window.location.hostname
      document.cookie = `googtrans=/en/${code}; path=/; domain=${domain};`
      document.cookie = `googtrans=/en/${code}; path=/;`

      const select = document.querySelector<HTMLSelectElement>('.goog-te-combo')
      if (select) {
        select.value = code
        select.dispatchEvent(new Event('change'))
      } else {
        window.location.reload()
      }
    } catch (e) {
      console.warn('Language change error:', e)
    }
  }

  // Accessibility Font Sizing (A- / A / A+)
  const handleFontSize = (size: 'normal' | 'large' | 'larger') => {
    setFontSize(size)
    const root = document.documentElement
    if (size === 'normal') {
      root.style.fontSize = '14px'
    } else if (size === 'large') {
      root.style.fontSize = '15.5px'
    } else if (size === 'larger') {
      root.style.fontSize = '17px'
    }
  }

  return (
    <div className="gov-top-banner" style={{ width: '100%', position: 'relative', zIndex: 40 }}>
      {/* Indian National Tricolor Ribbon */}
      <div style={{ height: '3px', width: '100%', display: 'flex' }}>
        <div style={{ flex: 1, background: '#FF9933' }} />
        <div style={{ flex: 1, background: '#FFFFFF' }} />
        <div style={{ flex: 1, background: '#138808' }} />
      </div>

      {/* Sleek, Compact Official Gov Header Bar */}
      <div
        style={{
          background: '#0f172a',
          color: '#cbd5e1',
          height: '34px',
          padding: '0 20px',
          fontSize: '11.5px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        {/* Left: Official Government of India Identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: '800', color: '#ffffff', letterSpacing: '0.03em' }}>
            भारत सरकार
          </span>
          <span style={{ color: '#475569' }}>|</span>
          <span style={{ color: '#94a3b8', fontWeight: '600' }}>GOVERNMENT OF INDIA</span>
          <span style={{ color: '#475569' }}>•</span>
          <span style={{ color: '#38bdf8', fontWeight: '600' }}>गृह मंत्रालय (MINISTRY OF HOME AFFAIRS)</span>
        </div>

        {/* Right: Accessibility Font Size + Quick EN/HI + Regional Languages Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Accessibility Font Size: A- A A+ */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderRight: '1px solid rgba(255,255,255,0.15)', paddingRight: '10px' }}>
            <span style={{ color: '#94a3b8', fontSize: '10px', marginRight: '3px' }}>Font:</span>
            <button
              type="button"
              onClick={() => handleFontSize('normal')}
              style={{
                background: fontSize === 'normal' ? '#1e293b' : 'transparent',
                border: fontSize === 'normal' ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.2)',
                color: '#ffffff',
                borderRadius: '3px',
                padding: '1px 5px',
                fontSize: '10px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
              title="Standard Font Size"
            >
              A-
            </button>
            <button
              type="button"
              onClick={() => handleFontSize('large')}
              style={{
                background: fontSize === 'large' ? '#1e293b' : 'transparent',
                border: fontSize === 'large' ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.2)',
                color: '#ffffff',
                borderRadius: '3px',
                padding: '1px 5px',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
              title="Medium Font Size"
            >
              A
            </button>
            <button
              type="button"
              onClick={() => handleFontSize('larger')}
              style={{
                background: fontSize === 'larger' ? '#1e293b' : 'transparent',
                border: fontSize === 'larger' ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.2)',
                color: '#ffffff',
                borderRadius: '3px',
                padding: '1px 5px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
              title="Large Font Size"
            >
              A+
            </button>
          </div>

          {/* Quick 1-Click English / Hindi Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', borderRight: '1px solid rgba(255,255,255,0.15)', paddingRight: '10px' }}>
            <Languages size={13} color="#38bdf8" />
            <button
              type="button"
              onClick={() => applyLanguage('en')}
              style={{
                background: selectedLang === 'en' ? '#0284c7' : 'transparent',
                border: 0,
                color: '#ffffff',
                borderRadius: '3px',
                padding: '2px 5px',
                fontSize: '11px',
                fontWeight: selectedLang === 'en' ? '800' : '500',
                cursor: 'pointer'
              }}
            >
              English
            </button>
            <span style={{ color: '#475569' }}>/</span>
            <button
              type="button"
              onClick={() => applyLanguage('hi')}
              style={{
                background: selectedLang === 'hi' ? '#0284c7' : 'transparent',
                border: 0,
                color: '#ffffff',
                borderRadius: '3px',
                padding: '2px 5px',
                fontSize: '11px',
                fontWeight: selectedLang === 'hi' ? '800' : '500',
                cursor: 'pointer'
              }}
            >
              हिन्दी
            </button>
          </div>

          {/* Official Regional Language Dropdown (Styled, Compact, Never Overflows!) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Globe size={13} color="#38bdf8" />
            <select
              value={selectedLang}
              onChange={e => applyLanguage(e.target.value)}
              style={{
                background: '#1e293b',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: '4px',
                padding: '2px 6px',
                fontSize: '11px',
                fontWeight: '600',
                outline: 'none',
                cursor: 'pointer',
                height: '24px'
              }}
              aria-label="Select Portal Language"
            >
              {INDIAN_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.native} ({lang.name})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Completely Hidden Google Translate Container so no oversized white box ever appears */}
      <div
        id="google_translate_element_hidden"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 0,
          height: 0,
          opacity: 0,
          overflow: 'hidden',
          pointerEvents: 'none'
        }}
      />
    </div>
  )
}
