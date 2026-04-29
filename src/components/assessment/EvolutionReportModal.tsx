// EvolutionReportModal V2 PREMIUM (2026-04-29).
// Refonte premium de la modale partage rapport / app client post-suivi.
// - Header gradient gold avec mesh + shine
// - Toggle App/Rapport en chips premium colored
// - QR card avec glow color + border tinted
// - Boutons partage WhatsApp/Telegram/SMS avec icones et hover lift
// - CTA principal "Voir" gold gradient avec shadow color
// - Theme-aware var(--ls-*)

import { useEffect, useState } from 'react'

interface Props {
  reportUrl: string
  clientName: string
  onClose: () => void
}

export function EvolutionReportModal({ reportUrl, clientName, onClose }: Props) {
  const [copied, setCopied] = useState(false)
  const [mode, setMode] = useState<'app' | 'report'>('app')

  const token = reportUrl.split('/').pop() ?? ''
  const appUrl = `${window.location.origin}/client/${token}`
  const currentUrl = mode === 'app' ? appUrl : reportUrl

  // ESC pour fermer + body scroll lock
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const copy = () => {
    void navigator.clipboard.writeText(currentUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <style>{`
        @keyframes ls-erm-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ls-erm-slide-up {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes ls-erm-shine {
          0%, 100% { transform: translateX(-30%); opacity: 0; }
          50%      { transform: translateX(180%); opacity: 0.45; }
        }
        @keyframes ls-erm-mesh {
          0%   { transform: translate(0,0) scale(1); }
          50%  { transform: translate(-8px,4px) scale(1.04); }
          100% { transform: translate(6px,-2px) scale(1); }
        }
        .ls-erm-overlay { animation: ls-erm-fade-in 0.18s ease-out; }
        .ls-erm-panel   { animation: ls-erm-slide-up 0.32s cubic-bezier(0.22,1,0.36,1); }
      `}</style>

      <div
        className="ls-erm-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ls-erm-title"
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'color-mix(in srgb, var(--ls-bg) 75%, transparent)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 16,
          fontFamily: 'DM Sans, sans-serif',
        }}
      >
        <div
          className="ls-erm-panel"
          style={{
            background: 'var(--ls-surface)',
            border: '0.5px solid color-mix(in srgb, var(--ls-gold) 30%, var(--ls-border))',
            borderRadius: 22,
            width: '100%',
            maxWidth: 440,
            maxHeight: 'calc(100vh - 32px)',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            boxShadow: '0 24px 64px -16px rgba(0,0,0,0.40), 0 1px 0 0 rgba(239,159,39,0.20)',
          }}
        >
          {/* HEADER GRADIENT GOLD */}
          <div
            style={{
              position: 'relative',
              overflow: 'hidden',
              padding: '18px 20px',
              background: 'linear-gradient(135deg, #EF9F27 0%, #BA7517 60%, #5C3A05 100%)',
              color: '#FFFFFF',
            }}
          >
            <div
              aria-hidden
              style={{
                position: 'absolute', inset: -30, opacity: 0.55,
                background:
                  'radial-gradient(circle at 0% 0%, rgba(255,255,255,0.20) 0%, transparent 45%), radial-gradient(circle at 100% 100%, rgba(0,0,0,0.18) 0%, transparent 50%)',
                animation: 'ls-erm-mesh 18s ease-in-out infinite alternate',
                pointerEvents: 'none',
              }}
            />
            <div
              aria-hidden
              style={{
                position: 'absolute', top: 0, left: 0, height: '100%', width: '30%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.40), transparent)',
                animation: 'ls-erm-shine 6s ease-in-out infinite',
                pointerEvents: 'none',
              }}
            />
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                <div
                  style={{
                    width: 44, height: 44, flexShrink: 0,
                    borderRadius: 14,
                    background: 'rgba(255,255,255,0.18)',
                    border: '1px solid rgba(255,255,255,0.35)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22,
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                  }}
                >
                  ✨
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', fontWeight: 800, color: 'rgba(255,255,255,0.90)', marginBottom: 2 }}>
                    Suivi enregistré
                  </div>
                  <h2
                    id="ls-erm-title"
                    style={{
                      fontFamily: 'Syne, serif',
                      fontWeight: 800,
                      fontSize: 19,
                      letterSpacing: '-0.02em',
                      margin: 0,
                      textShadow: '0 1px 2px rgba(0,0,0,0.18)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Rapport de {clientName}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer"
                style={{
                  width: 32, height: 32, flexShrink: 0,
                  borderRadius: 999,
                  border: '1px solid rgba(255,255,255,0.30)',
                  background: 'rgba(255,255,255,0.18)',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  fontSize: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'transform 0.15s ease, background 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'rotate(90deg)'
                  e.currentTarget.style.background = 'rgba(255,255,255,0.30)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none'
                  e.currentTarget.style.background = 'rgba(255,255,255,0.18)'
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* BODY */}
          <div style={{ padding: 18 }}>
            <p style={{ fontSize: 12.5, color: 'var(--ls-text-muted)', margin: '0 0 14px', lineHeight: 1.5 }}>
              Le suivi est prêt. Partage-le directement sur WhatsApp, Telegram ou SMS — ou copie le lien.
            </p>

            {/* Toggle App/Rapport — chips premium */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              {([
                { key: 'app', label: '📱 App client', subtitle: 'Installable PWA', color: 'var(--ls-gold)' },
                { key: 'report', label: '📄 Rapport simple', subtitle: 'Lien web', color: 'var(--ls-purple)' },
              ] as const).map((opt) => {
                const isActive = mode === opt.key
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setMode(opt.key)}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: isActive
                        ? `0.5px solid color-mix(in srgb, ${opt.color} 50%, transparent)`
                        : '0.5px solid var(--ls-border)',
                      background: isActive
                        ? `linear-gradient(135deg, color-mix(in srgb, ${opt.color} 14%, var(--ls-surface)) 0%, var(--ls-surface) 100%)`
                        : 'var(--ls-surface)',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontFamily: 'DM Sans, sans-serif',
                      color: isActive ? opt.color : 'var(--ls-text-muted)',
                      fontWeight: isActive ? 700 : 500,
                      boxShadow: isActive ? `0 4px 12px -4px ${opt.color}40` : 'none',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                      lineHeight: 1.2,
                    }}
                  >
                    <span style={{ fontWeight: isActive ? 700 : 600 }}>{opt.label}</span>
                    <span style={{ fontSize: 10, opacity: 0.75 }}>{opt.subtitle}</span>
                  </button>
                )
              })}
            </div>

            {/* QR Card */}
            <div
              style={{
                background:
                  mode === 'app'
                    ? 'linear-gradient(135deg, color-mix(in srgb, var(--ls-gold) 8%, var(--ls-surface2)) 0%, var(--ls-surface2) 100%)'
                    : 'linear-gradient(135deg, color-mix(in srgb, var(--ls-purple) 8%, var(--ls-surface2)) 0%, var(--ls-surface2) 100%)',
                border:
                  mode === 'app'
                    ? '0.5px solid color-mix(in srgb, var(--ls-gold) 30%, transparent)'
                    : '0.5px solid color-mix(in srgb, var(--ls-purple) 30%, transparent)',
                borderRadius: 14,
                padding: 14,
                marginBottom: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 84,
                  height: 84,
                  flexShrink: 0,
                  background: '#FFFFFF',
                  borderRadius: 10,
                  padding: 6,
                  boxShadow: mode === 'app'
                    ? '0 4px 12px -4px rgba(239,159,39,0.40)'
                    : '0 4px 12px -4px rgba(167,139,250,0.40)',
                }}
              >
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(currentUrl)}&bgcolor=FFFFFF&color=${mode === 'app' ? 'B8922A' : '7F77DD'}`}
                  alt="QR Code"
                  width={72}
                  height={72}
                  style={{ display: 'block', borderRadius: 6 }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Syne, serif', fontSize: 13, fontWeight: 700, color: 'var(--ls-text)', letterSpacing: '-0.01em' }}>
                  {mode === 'app' ? "Lien de l'app client" : 'Lien du rapport'}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--ls-text-hint)', wordBreak: 'break-all', marginTop: 4, marginBottom: 8, lineHeight: 1.4, fontFamily: 'monospace' }}>
                  {currentUrl}
                </div>
                <button
                  type="button"
                  onClick={copy}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '5px 12px',
                    borderRadius: 999,
                    border: copied
                      ? '0.5px solid color-mix(in srgb, var(--ls-teal) 40%, transparent)'
                      : '0.5px solid var(--ls-border)',
                    background: copied
                      ? 'color-mix(in srgb, var(--ls-teal) 12%, var(--ls-surface))'
                      : 'var(--ls-surface)',
                    color: copied ? 'var(--ls-teal)' : 'var(--ls-text-muted)',
                    cursor: 'pointer',
                    fontFamily: 'DM Sans, sans-serif',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {copied ? '✓ Copié !' : '📋 Copier le lien'}
                </button>
              </div>
            </div>

            {/* Share buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
              {[
                {
                  label: 'WhatsApp',
                  emoji: '💬',
                  href: `https://wa.me/?text=${encodeURIComponent(currentUrl)}`,
                  color: '#25D366',
                  bg: 'rgba(37,211,102,0.10)',
                  border: 'rgba(37,211,102,0.30)',
                },
                {
                  label: 'Telegram',
                  emoji: '✈️',
                  href: `https://t.me/share/url?url=${encodeURIComponent(currentUrl)}`,
                  color: '#0088CC',
                  bg: 'rgba(0,136,204,0.10)',
                  border: 'rgba(0,136,204,0.30)',
                },
                {
                  label: 'SMS',
                  emoji: '📱',
                  href: `sms:?body=${encodeURIComponent(currentUrl)}`,
                  color: 'var(--ls-text-muted)',
                  bg: 'var(--ls-surface2)',
                  border: 'var(--ls-border)',
                },
              ].map((btn) => (
                <button
                  key={btn.label}
                  type="button"
                  onClick={() => window.open(btn.href, '_blank', 'noopener,noreferrer')}
                  style={{
                    padding: '10px 0',
                    borderRadius: 12,
                    border: `0.5px solid ${btn.border}`,
                    background: btn.bg,
                    color: btn.color,
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'DM Sans, sans-serif',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 3,
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.filter = 'brightness(1.1)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none'
                    e.currentTarget.style.filter = 'none'
                  }}
                >
                  <span style={{ fontSize: 18 }}>{btn.emoji}</span>
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Footer CTAs */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '11px 16px',
                  borderRadius: 999,
                  border: '0.5px solid var(--ls-border)',
                  background: 'var(--ls-surface)',
                  color: 'var(--ls-text-muted)',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease, border-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.borderColor = 'var(--ls-text-hint)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none'
                  e.currentTarget.style.borderColor = 'var(--ls-border)'
                }}
              >
                Fermer
              </button>
              <a
                href={currentUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1.4,
                  padding: '11px 18px',
                  borderRadius: 999,
                  border: 'none',
                  background: 'linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)',
                  color: '#FFFFFF',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  textDecoration: 'none',
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  boxShadow: '0 6px 16px -4px rgba(186,117,23,0.45), inset 0 1px 0 rgba(255,255,255,0.20)',
                  transition: 'transform 0.15s ease, filter 0.15s ease',
                  letterSpacing: '-0.005em',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.filter = 'brightness(1.08)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none'
                  e.currentTarget.style.filter = 'none'
                }}
              >
                {mode === 'app' ? "👀 Voir l'app" : '👀 Voir le rapport'}
                <span aria-hidden style={{ fontSize: 14 }}>→</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
