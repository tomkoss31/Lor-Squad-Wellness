import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'

interface RecapModalProps {
  clientName: string
  recapToken: string
  onClose: () => void
}

export function RecapModal({ clientName, recapToken, onClose }: RecapModalProps) {
  const navigate = useNavigate()
  const recapUrl = `${window.location.origin}/recap/${recapToken}`
  const [copied, setCopied] = useState(false)

  const copy = async () => { await navigator.clipboard.writeText(recapUrl); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  const shareWA = () => window.open(`https://wa.me/?text=${encodeURIComponent(`Voici le récap bilan de ${clientName} ✦\n${recapUrl}`)}`, '_blank')
  const shareTG = () => window.open(`https://t.me/share/url?url=${encodeURIComponent(recapUrl)}`, '_blank')
  const shareSMS = () => window.open(`sms:?body=${encodeURIComponent(`Récap bilan Lor'Squad : ${recapUrl}`)}`, '_blank')

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--ls-surface)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 18, padding: 28, width: '100%', maxWidth: 400, maxHeight: '90vh', overflowY: 'auto' }}>

        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div style={{ width: 48, height: 48, background: 'rgba(45,212,191,0.1)', border: '1px solid rgba(45,212,191,0.2)', borderRadius: '50%', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2DD4BF" strokeWidth="1.5"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: 'var(--ls-text)', marginBottom: 4 }}>Bilan enregistré ✦</div>
          <div style={{ fontSize: 13, color: 'var(--ls-text-muted)' }}>Le récap de {clientName} est prêt à partager.</div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{ background: 'var(--ls-text)', padding: 12, borderRadius: 12 }}>
            <QRCodeSVG value={recapUrl} size={140} fgColor="#0B0D11" bgColor="#F0EDE8" />
          </div>
        </div>

        <div onClick={copy} style={{ background: 'var(--ls-surface2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, cursor: 'pointer' }}>
          <div style={{ flex: 1, fontSize: 11, color: 'var(--ls-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{recapUrl.replace('https://', '')}</div>
          <div style={{ fontSize: 11, color: copied ? '#2DD4BF' : '#C9A84C', fontWeight: 500, flexShrink: 0 }}>{copied ? 'Copié ✓' : 'Copier'}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
          {[
            { l: 'WhatsApp', bg: 'rgba(37,211,102,0.12)', c: '#25D366', fn: shareWA },
            { l: 'Telegram', bg: 'rgba(42,171,238,0.1)', c: '#2AABEE', fn: shareTG },
            { l: 'SMS', bg: 'var(--ls-border)', c: 'var(--ls-text-muted)', fn: shareSMS },
          ].map(b => (
            <button key={b.l} onClick={b.fn} style={{ padding: '10px 4px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 12, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, background: b.bg, color: b.c }}>{b.l}</button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => { onClose(); navigate('/clients') }} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'var(--ls-text-muted)', fontFamily: 'DM Sans, sans-serif', fontSize: 13, cursor: 'pointer' }}>Retour clients</button>
          <button onClick={() => window.open(recapUrl, '_blank')} style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: '#C9A84C', color: 'var(--ls-bg)', fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Voir le récap</button>
        </div>
      </div>
    </div>
  )
}
