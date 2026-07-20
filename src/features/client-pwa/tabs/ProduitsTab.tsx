// ============================================================================
// PWA v2 — Onglet Produits (chantier refonte identité PWA client 2026-07)
// ----------------------------------------------------------------------------
// Cure personnalisée : cartes produits (données réelles current_products) +
// « parler à mon coach » + « renouveler ma cure ». Icône/accent choisis par
// heuristique sur le nom (F1 / thé / aloé / autre).
// ============================================================================
import type { CSSProperties } from 'react'

const ANTON = "'Anton', sans-serif"
const SORA = "'Sora', sans-serif"
const MONO = "'JetBrains Mono', monospace"

export interface PwaProduct {
  id: string
  product_name: string
  note_metier: string | null
  quantite_label: string | null
  recommended?: boolean
}
export interface ProduitsTabProps {
  products: PwaProduct[]
  onTalkToCoach: () => void
}

function accentFor(name: string): { color: string; icon: JSX.Element } {
  const n = name.toLowerCase()
  if (n.includes('formula') || n.includes('f1') || n.includes('shake')) {
    return { color: 'var(--lime)', icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--lime)" strokeWidth="1.6"><path d="M8 2h8M9 2v5l-4.5 9A3 3 0 0 0 7.2 21h9.6a3 3 0 0 0 2.7-4.3L15 7V2" /></svg> }
  }
  if (n.includes('thé') || n.includes('the') || n.includes('tea')) {
    return { color: 'var(--teal)', icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="1.6"><path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z" /></svg> }
  }
  if (n.includes('aloe') || n.includes('aloé')) {
    return { color: 'var(--emerald)', icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--emerald)" strokeWidth="1.6"><path d="M12 2C7 7 7 12 12 22c5-10 5-15 0-20z" /></svg> }
  }
  return { color: 'var(--gold)', icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.6"><path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7" /></svg> }
}

export function ProduitsTab({ products, onTalkToCoach }: ProduitsTabProps) {
  const cardBase: CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 15, display: 'flex', gap: 13 }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, animation: 'lbRise .4s ease both' }}>
      <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--lime)', fontWeight: 600, margin: 2 }}>Ta cure personnalisée</div>

      {products.length === 0 && (
        <div style={{ textAlign: 'center', background: 'var(--surface)', border: '1px dashed var(--border2)', borderRadius: 16, padding: '28px 18px' }}>
          <div style={{ fontFamily: SORA, fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Ta cure arrive bientôt</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4, lineHeight: 1.5 }}>Ton coach te prépare ton programme personnalisé.</div>
        </div>
      )}

      {products.map((p) => {
        const { color, icon } = accentFor(p.product_name)
        return (
          <div key={p.id} style={cardBase}>
            <div style={{ width: 56, height: 56, flex: 'none', borderRadius: 13, background: `linear-gradient(140deg,color-mix(in srgb,${color} 18%,var(--surface2)),var(--surface2))`, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: SORA, fontWeight: 700, fontSize: 14.5, color: 'var(--text)' }}>{p.product_name}</span>
                <span style={{ fontFamily: MONO, fontSize: 9, color: '#04201b', background: color, padding: '2px 6px', borderRadius: 5, letterSpacing: '.04em' }}>{p.recommended ? 'RECOMMANDÉ' : 'CURE'}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, marginTop: 5 }}>{p.note_metier || p.quantite_label || 'Intègre-le à ta routine quotidienne selon les conseils de ton coach.'}</div>
              <button onClick={onTalkToCoach} style={{ background: 'none', border: 'none', padding: '6px 0 0', color: 'var(--teal)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Parler à mon coach →</button>
            </div>
          </div>
        )
      })}

      {products.length > 0 && (
        <button onClick={onTalkToCoach} style={{ marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, width: '100%', minHeight: 50, borderRadius: 13, border: 'none', cursor: 'pointer', background: 'var(--lime)', color: '#0a0c0a', fontFamily: ANTON, textTransform: 'uppercase', letterSpacing: '.02em', fontSize: 15, boxShadow: '0 4px 16px rgba(197,248,42,0.24)' }}>Renouveler ma cure</button>
      )}
    </div>
  )
}
