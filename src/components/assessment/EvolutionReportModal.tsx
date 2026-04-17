import { useState } from 'react'

interface Props {
  reportUrl: string
  clientName: string
  onClose: () => void
}

export function EvolutionReportModal({ reportUrl, clientName, onClose }: Props) {
  const [copied, setCopied] = useState(false)
  const [mode, setMode] = useState<'app' | 'report'>('app')

  // Le reportUrl est de la forme https://.../rapport/{token}
  // On dérive l'URL /client/{token} pour l'app installable
  const token = reportUrl.split('/').pop() ?? ''
  const appUrl = `${window.location.origin}/client/${token}`
  const currentUrl = mode === 'app' ? appUrl : reportUrl

  const copy = () => {
    navigator.clipboard.writeText(currentUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: 'var(--ls-surface)', borderRadius: 16, padding: 24, maxWidth: 400, width: '100%', border: '1px solid var(--ls-border)' }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 18, color: 'var(--ls-text)', marginBottom: 6 }}>
          Suivi enregistré ✦
        </div>
        <div style={{ fontSize: 13, color: 'var(--ls-text-muted)', marginBottom: 14 }}>
          Le suivi de {clientName} est prêt. Partage-le directement.
        </div>

        {/* Toggle App client / Rapport */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--ls-surface2)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 4, marginBottom: 14 }}>
          <button onClick={() => setMode('app')}
            style={{ flex: 1, padding: '8px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontFamily: 'DM Sans, sans-serif', fontWeight: mode === 'app' ? 600 : 400,
              background: mode === 'app' ? 'rgba(184,146,42,0.15)' : 'transparent',
              color: mode === 'app' ? '#C9A84C' : 'var(--ls-text-muted)' }}>
            📱 App client (installable)
          </button>
          <button onClick={() => setMode('report')}
            style={{ flex: 1, padding: '8px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontFamily: 'DM Sans, sans-serif', fontWeight: mode === 'report' ? 600 : 400,
              background: mode === 'report' ? 'rgba(255,255,255,0.06)' : 'transparent',
              color: mode === 'report' ? 'var(--ls-text)' : 'var(--ls-text-muted)' }}>
            📄 Rapport simple
          </button>
        </div>

        <div style={{ background: 'var(--ls-surface2)', borderRadius: 10, padding: 12, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=70x70&data=${encodeURIComponent(currentUrl)}&bgcolor=FFFFFF&color=B8922A`} alt="QR" width={70} height={70} style={{ borderRadius: 8 }}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ls-text)', marginBottom: 6 }}>{mode === 'app' ? "Lien de l'app client" : 'Lien du rapport'}</div>
            <div style={{ fontSize: 10, color: 'var(--ls-text-hint)', wordBreak: 'break-all', marginBottom: 8 }}>{currentUrl}</div>
            <button onClick={copy} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 7, border: '1px solid var(--ls-border)', background: 'var(--ls-surface)', color: copied ? 'var(--ls-teal)' : 'var(--ls-text-muted)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              {copied ? '✓ Copié !' : 'Copier le lien'}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
          <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(currentUrl)}`)}
            style={{ padding: '9px 0', borderRadius: 9, border: 'none', background: 'rgba(37,211,102,0.1)', color: '#16A34A', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
            WhatsApp
          </button>
          <button onClick={() => window.open(`https://t.me/share/url?url=${encodeURIComponent(currentUrl)}`)}
            style={{ padding: '9px 0', borderRadius: 9, border: 'none', background: 'rgba(0,136,204,0.1)', color: '#0088CC', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
            Telegram
          </button>
          <button onClick={() => window.open(`sms:?body=${encodeURIComponent(currentUrl)}`)}
            style={{ padding: '9px 0', borderRadius: 9, border: 'none', background: 'var(--ls-surface2)', color: 'var(--ls-text-muted)', fontSize: 11, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
            SMS
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid var(--ls-border)', background: 'transparent', color: 'var(--ls-text-muted)', fontFamily: 'DM Sans, sans-serif', fontSize: 13, cursor: 'pointer' }}>
            Fermer
          </button>
          <a href={currentUrl} target="_blank" rel="noopener noreferrer"
            style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: 'var(--ls-gold)', color: '#fff', fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer', textDecoration: 'none', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {mode === 'app' ? "Voir l'app" : 'Voir le rapport'}
          </a>
        </div>
      </div>
    </div>
  )
}
