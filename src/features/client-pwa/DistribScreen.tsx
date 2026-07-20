// ============================================================================
// PWA v2 — Tour de contrôle distributeur (chantier refonte identité 2026-07)
// ----------------------------------------------------------------------------
// Companion mobile distributeur : 3 KPI, relances prioritaires, mes clients,
// encart Club VIP distri. Atteint via Landing → Distributeur → Login.
// ⚠️ Données de DÉMONSTRATION (design) — le câblage sur les vraies données
// coach (PV réels, clients dormants, relances) est une passe ultérieure ;
// l'app coach desktop complète reste séparée.
// ============================================================================
const ANTON = "'Anton', sans-serif"
const SORA = "'Sora', sans-serif"
const MONO = "'JetBrains Mono', monospace"

const TONE: Record<string, string> = { teal: 'var(--teal)', lime: 'var(--lime)', gold: 'var(--gold)', coral: 'var(--coral)', violet: 'var(--violet)' }

const RELANCES = [
  { name: 'Julie M.', ini: 'JM', reason: 'Cure terminée — à relancer', since: 'il y a 3 j', tone: 'coral' },
  { name: 'Karim B.', ini: 'KB', reason: 'Silencieux depuis 2 semaines', since: 'il y a 14 j', tone: 'gold' },
  { name: 'Sarah L.', ini: 'SL', reason: 'Objectif atteint — proposer la suite', since: "aujourd'hui", tone: 'teal' },
]
const CLIENTS = [
  { name: 'Séverine B.', status: 'Actif', tone: 'teal', detail: '−4,7 kg · 11 bilans' },
  { name: 'Marc D.', status: 'Nouveau', tone: 'lime', detail: '1er bilan cette semaine' },
  { name: 'Léa P.', status: 'En pause', tone: 'gold', detail: 'Reprise prévue en août' },
  { name: 'Karim B.', status: 'À relancer', tone: 'coral', detail: 'Dernier contact il y a 14 j' },
  { name: 'Sarah L.', status: 'Actif', tone: 'teal', detail: 'Objectif atteint' },
]

export function DistribScreen({ name, onQuit }: { name: string; onQuit: () => void }) {
  const initials = name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'SB'
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 95, background: 'var(--bg)', overflowY: 'auto' }} className="lb-scroll">
      <div style={{ position: 'relative', minHeight: '100%', padding: 'calc(env(safe-area-inset-top,0px) + 20px) 18px 34px', display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden', animation: 'lbRise .4s ease both' }}>
        <div style={{ position: 'absolute', top: '-8%', right: '-18%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle,var(--lime),transparent 70%)', opacity: 0.1, filter: 'blur(70px)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 46, height: 46, flex: 'none', borderRadius: 14, background: 'linear-gradient(140deg,var(--lime),var(--lime-d))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: ANTON, fontSize: 16, color: '#0a0c0a' }}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--lime)', fontWeight: 600 }}>Tour de contrôle</div><div style={{ fontFamily: SORA, fontWeight: 700, fontSize: 18, color: 'var(--text)', lineHeight: 1.2 }}>{name}</div></div>
          <button onClick={onQuit} style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 13px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--muted)', fontFamily: MONO, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Quitter</button>
        </div>

        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 9 }}>
          {[
            { v: '8 420', l: 'PV DU MOIS', s: '68 % prorata', c: 'var(--gold)' },
            { v: '37', l: 'CLIENTS ACTIFS', s: '+4 vs M-1', c: 'var(--teal)' },
            { v: '3', l: 'RELANCES', s: 'à faire', c: 'var(--coral)' },
          ].map((k) => (
            <div key={k.l} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: `3px solid ${k.c}`, borderRadius: 14, padding: '14px 11px' }}>
              <div style={{ fontFamily: ANTON, fontSize: 22, color: 'var(--text)', lineHeight: 1 }}>{k.v}</div>
              <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '.06em', color: 'var(--muted)', marginTop: 5 }}>{k.l}</div>
              <div style={{ fontSize: 10, color: k.c, marginTop: 3 }}>{k.s}</div>
            </div>
          ))}
        </div>

        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 2px 9px' }}><div style={{ fontFamily: SORA, fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Relances prioritaires</div><span style={{ fontFamily: MONO, fontSize: 10, color: 'var(--coral)', fontWeight: 700 }}>Aujourd'hui</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {RELANCES.map((r) => {
              const c = TONE[r.tone]
              return (
                <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${c}`, borderRadius: 13, padding: '12px 13px' }}>
                  <div style={{ width: 36, height: 36, flex: 'none', borderRadius: '50%', background: `color-mix(in srgb,${c} 16%,transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SORA, fontWeight: 700, fontSize: 12, color: c }}>{r.ini}</div>
                  <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontFamily: SORA, fontWeight: 700, fontSize: 13.5, color: 'var(--text)' }}>{r.name}</div><div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.3 }}>{r.reason} · {r.since}</div></div>
                  <button style={{ flex: 'none', padding: '8px 13px', borderRadius: 10, border: 'none', cursor: 'pointer', background: `color-mix(in srgb,${c} 16%,transparent)`, color: c, fontFamily: SORA, fontWeight: 700, fontSize: 12 }}>Relancer</button>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 2px 9px' }}><div style={{ fontFamily: SORA, fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Mes clients</div><span style={{ fontFamily: MONO, fontSize: 10, color: 'var(--muted)' }}>{CLIENTS.length} suivis</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {CLIENTS.map((c) => {
              const col = TONE[c.tone]
              const ini = c.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
              return (
                <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, padding: '12px 13px' }}>
                  <div style={{ width: 34, height: 34, flex: 'none', borderRadius: '50%', background: `color-mix(in srgb,${col} 16%,transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SORA, fontWeight: 700, fontSize: 11.5, color: col }}>{ini}</div>
                  <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontFamily: SORA, fontWeight: 700, fontSize: 13.5, color: 'var(--text)' }}>{c.name}</div><div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{c.detail}</div></div>
                  <span style={{ flex: 'none', padding: '4px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: `color-mix(in srgb,${col} 14%,transparent)`, color: col }}>{c.status}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 15px', borderRadius: 14, background: 'linear-gradient(135deg,color-mix(in srgb,var(--gold) 14%,var(--surface)),var(--surface))', border: '1px solid color-mix(in srgb,var(--gold) 28%,var(--border))' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" /></svg>
          <div style={{ flex: 1 }}><div style={{ fontFamily: SORA, fontWeight: 700, fontSize: 13.5, color: 'var(--text)' }}>Club VIP distributeur</div><div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Ta remise −42 % à −50 % — pilote ton équipe.</div></div>
        </div>
      </div>
    </div>
  )
}
