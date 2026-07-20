// ============================================================================
// PWA v2 — Onglet Conseils (chantier refonte identité PWA client 2026-07)
// ----------------------------------------------------------------------------
// Points d'attention (sport_alerts réels), assiette idéale (camembert),
// routine quotidienne (timeline), mot du coach (coach_advice réel).
// ============================================================================
const SORA = "'Sora', sans-serif"
const ANTON = "'Anton', sans-serif"
const MONO = "'JetBrains Mono', monospace"

export interface PwaSportAlert {
  id: string
  title: string
  detail?: string
  advice?: string
}
export interface ConseilsTabProps {
  coachName: string
  coachAdvice?: string | null
  sportAlerts: PwaSportAlert[]
  lastAdviceDate?: string | null
}

const ROUTINE = [
  { time: '7h30', title: 'Formula 1 matin', sub: 'Shake complet remplaçant le petit-déj', color: 'var(--lime)' },
  { time: '10h30', title: 'Collation', sub: "Fruit + poignée d'amandes / yaourt", color: 'var(--teal)' },
  { time: '13h00', title: 'Repas équilibré', sub: 'Protéines + légumes à volonté + glucides maîtrisés', color: 'var(--violet)' },
  { time: '19h30', title: 'Dîner léger', sub: 'Formula 1 ou poisson + légumes vapeur', color: 'var(--coral)' },
]

export function ConseilsTab({ coachName, coachAdvice, sportAlerts, lastAdviceDate }: ConseilsTabProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'lbRise .4s ease both' }}>
      {/* Points d'attention */}
      <div>
        <div style={{ fontFamily: SORA, fontWeight: 600, fontSize: 15, color: 'var(--text)', marginBottom: 10 }}>Tes points d'attention</div>
        {sportAlerts.length === 0 ? (
          <div style={{ background: 'color-mix(in srgb,var(--lime) 8%,var(--surface))', border: '1px solid color-mix(in srgb,var(--lime) 22%,var(--border))', borderRadius: 14, padding: 15, fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>Ton bilan ne présente aucun point d'attention majeur. Continue comme ça, la régularité paie.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sportAlerts.map((a) => (
              <div key={a.id} style={{ background: 'color-mix(in srgb,var(--coral) 8%,var(--surface))', border: '1px solid color-mix(in srgb,var(--coral) 24%,var(--border))', borderRadius: 14, padding: 15 }}>
                <div style={{ fontFamily: SORA, fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{a.title}</div>
                {a.detail && <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginTop: 4 }}>{a.detail}</div>}
                {a.advice && <div style={{ fontSize: 12.5, color: 'var(--coral)', lineHeight: 1.5, marginTop: 6 }}>→ {a.advice}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assiette idéale */}
      <div>
        <div style={{ fontFamily: SORA, fontWeight: 600, fontSize: 15, color: 'var(--text)', marginBottom: 12 }}>Ton assiette idéale</div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ position: 'relative', width: 170, height: 170, flex: 'none' }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'conic-gradient(from -90deg,var(--emerald) 0 50%,var(--coral) 50% 75%,var(--gold) 75% 100%)', boxShadow: '0 0 0 4px var(--surface2),0 10px 30px -10px rgba(0,0,0,.6)' }} />
            <div style={{ position: 'absolute', left: '50%', top: '26%', transform: 'translate(-50%,-50%)', fontFamily: ANTON, fontSize: 15, color: '#04201b' }}>50%</div>
            <div style={{ position: 'absolute', left: '74%', top: '66%', transform: 'translate(-50%,-50%)', fontFamily: ANTON, fontSize: 13, color: '#3a0716' }}>25%</div>
            <div style={{ position: 'absolute', left: '26%', top: '66%', transform: 'translate(-50%,-50%)', fontFamily: ANTON, fontSize: 13, color: '#3a2a06' }}>25%</div>
          </div>
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { c: 'var(--emerald)', t: 'Légumes · 50%', s: 'Salade verte à volonté · Légumes vapeur · Crudités variées' },
              { c: 'var(--coral)', t: 'Protéines · 25%', s: 'Poulet / poisson maigre · Œufs / skyr · Formula 1 Herbalife' },
              { c: 'var(--gold)', t: 'Glucides complets · 25%', s: 'Riz complet (petite portion) · Patate douce · Légumineuses' },
            ].map((r) => (
              <div key={r.t} style={{ display: 'flex', gap: 10 }}>
                <span style={{ width: 11, height: 11, borderRadius: 3, background: r.c, marginTop: 3, flex: 'none' }} />
                <div><div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{r.t}</div><div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5, marginTop: 2 }}>{r.s}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Routine quotidienne */}
      <div>
        <div style={{ fontFamily: SORA, fontWeight: 600, fontSize: 15, color: 'var(--text)', marginBottom: 12 }}>Ta routine quotidienne</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {ROUTINE.map((r, i) => (
            <div key={r.time} style={{ display: 'flex', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 'none' }}>
                <span style={{ width: 11, height: 11, borderRadius: '50%', background: r.color }} />
                {i < ROUTINE.length - 1 && <span style={{ width: 2, flex: 1, background: 'var(--border)' }} />}
              </div>
              <div style={{ paddingBottom: i < ROUTINE.length - 1 ? 16 : 0 }}>
                <div style={{ fontFamily: MONO, fontSize: 10, color: r.color }}>{r.time}</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', marginTop: 1 }}>{r.title}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{r.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mot du coach */}
      {coachAdvice && coachAdvice.trim() && (
        <div>
          <div style={{ fontFamily: SORA, fontWeight: 600, fontSize: 15, color: 'var(--text)', marginBottom: 12 }}>Le mot de ton coach</div>
          <div style={{ position: 'relative', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 18 }}>
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 3, background: 'linear-gradient(180deg,var(--teal),var(--lime))', borderRadius: '3px 0 0 3px' }} />
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: 10 }}>De la part de {coachName}</div>
            <p style={{ margin: 0, fontFamily: SORA, fontStyle: 'italic', fontSize: 15, lineHeight: 1.55, color: 'var(--text)' }}>« {coachAdvice} »</p>
            {lastAdviceDate && <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 12 }}>— {coachName} · {lastAdviceDate}</div>}
          </div>
        </div>
      )}
    </div>
  )
}
