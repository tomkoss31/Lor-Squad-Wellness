import { useState } from 'react'

interface Props {
  reportUrl: string
  clientName: string
  onClose: () => void
}

export function EvolutionReportModal({ reportUrl, clientName, onClose }: Props) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(reportUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: 'var(--ls-surface)', borderRadius: 16, padding: 24, maxWidth: 400, width: '100%', border: '1px solid var(--ls-border)' }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 18, color: 'var(--ls-text)', marginBottom: 6 }}>
          Rapport d'évolution généré ✦
        </div>
        <div style={{ fontSize: 13, color: 'var(--ls-text-muted)', marginBottom: 20 }}>
          Le rapport de {clientName} est prêt. Partage-le directement.
        </div>

        <div style={{ background: 'var(--ls-surface2)', borderRadius: 10, padding: 12, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=70x70&data=${encodeURIComponent(reportUrl)}&bgcolor=FFFFFF&color=B8922A`} alt="QR" width={70} height={70} style={{ borderRadius: 8 }}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ls-text)', marginBottom: 6 }}>Lien du rapport</div>
            <div style={{ fontSize: 10, color: 'var(--ls-text-hint)', wordBreak: 'break-all', marginBottom: 8 }}>{reportUrl}</div>
            <button onClick={copy} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 7, border: '1px solid var(--ls-border)', background: 'var(--ls-surface)', color: copied ? 'var(--ls-teal)' : 'var(--ls-text-muted)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              {copied ? '✓ Copié !' : 'Copier le lien'}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
          <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(reportUrl)}`)}
            style={{ padding: '9px 0', borderRadius: 9, border: 'none', background: 'rgba(37,211,102,0.1)', color: '#16A34A', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
            WhatsApp
          </button>
          <button onClick={() => window.open(`https://t.me/share/url?url=${encodeURIComponent(reportUrl)}`)}
            style={{ padding: '9px 0', borderRadius: 9, border: 'none', background: 'rgba(0,136,204,0.1)', color: '#0088CC', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
            Telegram
          </button>
          <button onClick={() => window.open(`sms:?body=${encodeURIComponent(reportUrl)}`)}
            style={{ padding: '9px 0', borderRadius: 9, border: 'none', background: 'var(--ls-surface2)', color: 'var(--ls-text-muted)', fontSize: 11, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
            SMS
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid var(--ls-border)', background: 'transparent', color: 'var(--ls-text-muted)', fontFamily: 'DM Sans, sans-serif', fontSize: 13, cursor: 'pointer' }}>
            Fermer
          </button>
          <a href={reportUrl} target="_blank" rel="noopener noreferrer"
            style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: 'var(--ls-gold)', color: '#fff', fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer', textDecoration: 'none', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Voir le rapport
          </a>
        </div>
      </div>
    </div>
  )
}
