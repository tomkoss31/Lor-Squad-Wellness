// surprises.jsx — Bold alternative directions
// 1) WalletCard — widget réinventé en carte type Apple Wallet (shimmer + flip)
// 2) SankeyFlow — section "Le calcul" en diagramme de flux animé

/* ════════════════════════════════════════════════════════════════ */
/* 1) WALLET CARD                                                    */
/* ════════════════════════════════════════════════════════════════ */

function WalletCard({ theme = 'light' }) {
  const m = MOCK;
  const [flipped, setFlipped] = React.useState(false);
  const animTotal = useCount(m.total);
  const delta = m.total - m.totalPrev;

  return (
    <div className="ls" data-theme={theme} style={{ padding: 24, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ls-bg)' }}>
      <div
        onClick={() => setFlipped(f => !f)}
        style={{
          width: 560, height: 320,
          perspective: 1400,
          cursor: 'pointer',
        }}>
        <div style={{
          position: 'relative', width: '100%', height: '100%',
          transformStyle: 'preserve-3d',
          transition: 'transform .8s cubic-bezier(.65,.05,.36,1)',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}>

          {/* ── FRONT ─────────────────────────────────────── */}
          <div style={{
            position: 'absolute', inset: 0,
            borderRadius: 26,
            background: 'linear-gradient(135deg, #0a1a1f 0%, #1a1230 45%, #2a0e1e 100%)',
            color: '#fff',
            overflow: 'hidden',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            boxShadow: '0 30px 80px -20px rgba(0,0,0,.55), 0 2px 0 rgba(255,255,255,.06) inset, 0 0 0 1px rgba(255,255,255,.08)',
          }}>
            {/* Holographic shimmer — animated conic gradient */}
            <div style={{
              position: 'absolute', inset: -40,
              background: 'conic-gradient(from 0deg, #0d9488, #5b21b6, #ef4444, #b8922a, #0d9488)',
              opacity: 0.32,
              filter: 'blur(60px)',
              animation: 'wc-spin 14s linear infinite',
            }} />
            <div style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(120% 80% at 0% 0%, rgba(13,148,136,.35), transparent 55%), radial-gradient(80% 60% at 100% 100%, rgba(184,146,42,.28), transparent 60%)',
            }} />
            {/* Foil sweep */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(115deg, transparent 30%, rgba(255,255,255,.18) 48%, transparent 60%)',
              mixBlendMode: 'overlay',
              animation: 'wc-sweep 6s ease-in-out infinite',
            }} />
            {/* Subtle grain */}
            <div style={{
              position: 'absolute', inset: 0,
              opacity: 0.08,
              background: 'repeating-linear-gradient(45deg, transparent 0 2px, rgba(255,255,255,.4) 2px 3px)',
              mixBlendMode: 'overlay',
              pointerEvents: 'none',
            }} />

            {/* Content */}
            <div style={{ position: 'relative', padding: 32, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontFamily: 'var(--ls-font-ui)', fontSize: 10.5, letterSpacing: '.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,.7)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="diamond" size={11} color="#C9A84C" />
                    La Base 360 · Rentabilité
                  </div>
                  <div style={{ fontFamily: 'var(--ls-font-ui)', fontSize: 13, color: 'rgba(255,255,255,.55)', marginTop: 6 }}>
                    {m.month}
                  </div>
                </div>
                {/* Embossed chip (foil mark) */}
                <div style={{
                  width: 44, height: 32, borderRadius: 6,
                  background: 'linear-gradient(135deg, #d6b964, #8a6a1e 70%)',
                  boxShadow: '0 1px 0 rgba(255,255,255,.4) inset, 0 -1px 0 rgba(0,0,0,.3) inset',
                  position: 'relative',
                }}>
                  <div style={{ position: 'absolute', inset: 4, border: '1px solid rgba(0,0,0,.2)', borderRadius: 3, opacity: .5 }} />
                </div>
              </div>

              <div>
                <div style={{ fontFamily: 'var(--ls-font-ui)', fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,.55)' }}>
                  Tu gagnes ce mois
                </div>
                <div style={{
                  fontFamily: 'var(--ls-font-display)', fontStyle: 'italic', fontWeight: 700,
                  fontSize: 84, lineHeight: 0.95, letterSpacing: '-0.025em',
                  background: 'linear-gradient(120deg, #5eead4 0%, #c4b5fd 50%, #fda4af 100%)',
                  WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
                  textShadow: '0 1px 0 rgba(255,255,255,.05)',
                  marginTop: 6,
                }}>
                  {Math.round(animTotal).toLocaleString('fr-FR')}<span style={{ fontSize: 48, marginLeft: 4 }}>€</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{
                    height: 26, padding: '0 10px', borderRadius: 999,
                    background: 'rgba(45,212,191,.15)', color: '#5eead4',
                    border: '1px solid rgba(45,212,191,.3)',
                    fontFamily: 'var(--ls-font-ui)', fontSize: 12, fontWeight: 600,
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                  }}>
                    <Icon name="arrowUp" size={11} />
                    +{delta}€ vs Avr
                  </span>
                  <span style={{
                    height: 26, padding: '0 10px', borderRadius: 999,
                    background: 'rgba(201,168,76,.14)', color: '#e2c878',
                    border: '1px solid rgba(201,168,76,.3)',
                    fontFamily: 'var(--ls-font-ui)', fontSize: 12, fontWeight: 600,
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                  }}>
                    proj. {m.projection.toLocaleString('fr-FR')} €
                  </span>
                </div>
                <div style={{ fontFamily: 'var(--ls-font-ui)', fontSize: 11, color: 'rgba(255,255,255,.45)' }}>
                  retourner ›
                </div>
              </div>
            </div>
          </div>

          {/* ── BACK ──────────────────────────────────────── */}
          <div style={{
            position: 'absolute', inset: 0,
            borderRadius: 26,
            background: 'linear-gradient(160deg, #14101a 0%, #0e1418 100%)',
            color: '#fff',
            overflow: 'hidden',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            boxShadow: '0 30px 80px -20px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.08)',
            padding: 28,
            display: 'flex', flexDirection: 'column', gap: 14,
          }}>
            {/* magnetic stripe */}
            <div style={{
              position: 'absolute', left: 0, right: 0, top: 22, height: 40,
              background: 'linear-gradient(180deg, #1a1a1f, #0a0a0f)',
            }} />
            <div style={{ height: 40 }} />

            <div style={{ fontFamily: 'var(--ls-font-ui)', fontSize: 10.5, letterSpacing: '.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,.55)' }}>
              D'où viennent les {m.total.toLocaleString('fr-FR')} €
            </div>

            <BackRow label="CA brut" value={`${m.calc.caBrut.toLocaleString('fr-FR')} €`} sub="18 programmes" />
            <BackRow label="× Marge perso" value={`${Math.round(m.calc.margePerso * 100)}%`} sub="taux moyen" />
            <BackRow label="= Marge directe" value={`${m.calc.margeDirecte.toLocaleString('fr-FR')} €`} accent="#5eead4" />
            <BackRow label="+ Override équipe" value={`+${m.calc.overrideTeam} €`} sub="3 distri actifs" accent="#a78bfa" />
            <BackRow label="+ Override hors-app" value={`+${m.calc.overrideExt} €`} sub="4 distri saisis" accent="#a78bfa" />

            <div style={{ flex: 1 }} />
            <div style={{
              borderTop: '1px solid rgba(255,255,255,.12)',
              paddingTop: 10,
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            }}>
              <span style={{ fontFamily: 'var(--ls-font-ui)', fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,.55)' }}>Total net</span>
              <span style={{
                fontFamily: 'var(--ls-font-display)', fontStyle: 'italic', fontWeight: 700, fontSize: 36, letterSpacing: '-.02em',
                background: 'linear-gradient(120deg, #5eead4, #c4b5fd, #fda4af)',
                WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
              }}>
                {m.total.toLocaleString('fr-FR')} €
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BackRow({ label, value, sub, accent }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', position: 'relative' }}>
      <div>
        <div style={{ fontFamily: 'var(--ls-font-ui)', fontSize: 13, color: 'rgba(255,255,255,.85)', fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontFamily: 'var(--ls-font-ui)', fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 1 }}>{sub}</div>}
      </div>
      <div className="ls-num" style={{
        fontFamily: 'var(--ls-font-display)', fontStyle: 'italic', fontWeight: 700, fontSize: 18,
        color: accent || '#fff',
      }}>{value}</div>
    </div>
  );
}

/* keyframes once */
if (typeof document !== 'undefined' && !document.getElementById('wc-anims')) {
  const s = document.createElement('style');
  s.id = 'wc-anims';
  s.textContent = `
    @keyframes wc-spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
    @keyframes wc-sweep { 0%, 100% { transform: translateX(-30%) } 50% { transform: translateX(30%) } }
    @media (prefers-reduced-motion: reduce) {
      [data-wc-spin], [data-wc-sweep] { animation: none !important; }
    }
  `;
  document.head.appendChild(s);
}

/* ════════════════════════════════════════════════════════════════ */
/* 2) SANKEY FLOW                                                    */
/* ════════════════════════════════════════════════════════════════ */

function SankeyFlow({ theme = 'light' }) {
  const m = MOCK;
  const total = m.calc.margeDirecte + m.calc.overrideTeam + m.calc.overrideExt;

  // Layout
  const W = 940, H = 520;
  const left = 60, right = W - 60;
  // Sources on the left
  const sources = [
    { label: 'CA brut perso',          sub: '18 programmes', value: m.calc.margeDirecte, color: 'var(--ls-teal)',  y: 60,  h: 200, note: '× 50% marge' },
    { label: 'Override équipe app',    sub: '3 distri',      value: m.calc.overrideTeam, color: 'var(--ls-purple)', y: 280, h: 56,  note: 'L1 direct'  },
    { label: 'Override hors-app',      sub: '4 distri saisis', value: m.calc.overrideExt, color: 'var(--ls-purple-soft)', y: 360, h: 110, note: 'manuel' },
  ];
  // Right destination = total
  const destY = 80, destH = 360;

  // Curved ribbon path
  const ribbon = (y1, h1, y2, h2, color, dl) => {
    const x1 = left + 220, x2 = right - 220;
    const cp = (x1 + x2) / 2;
    const top = `M ${x1} ${y1} C ${cp} ${y1}, ${cp} ${y2}, ${x2} ${y2}`;
    const bot = `L ${x2} ${y2 + h2} C ${cp} ${y2 + h2}, ${cp} ${y1 + h1}, ${x1} ${y1 + h1} Z`;
    return { d: `${top} ${bot}`, color, dl };
  };

  // Compute destination slice positions (stacked top→bottom in same order)
  let cursor = destY;
  const dest = sources.map(s => {
    const h = (s.value / total) * destH;
    const slice = { y: cursor, h, value: s.value, color: s.color };
    cursor += h;
    return slice;
  });

  return (
    <div className="ls" data-theme={theme} style={{ padding: 30, background: 'var(--ls-bg)', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
        <div>
          <div className="ls-eyebrow"><Icon name="diamond" size={11} color="var(--ls-gold)" />Le calcul · vue flux</div>
          <div style={{ fontFamily: 'var(--ls-font-display)', fontWeight: 600, fontSize: 30, color: 'var(--ls-ink)', marginTop: 4, letterSpacing: '-.01em' }}>
            D'où viennent les <em style={{
              fontStyle: 'italic',
              background: 'linear-gradient(95deg, var(--ls-teal), var(--ls-purple), var(--ls-coral))',
              WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
            }}>{total.toLocaleString('fr-FR')} €</em>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className="ls-chip ls-chip--teal">marge directe {Math.round(m.calc.margeDirecte / total * 100)}%</span>
          <span className="ls-chip ls-chip--purple">overrides {Math.round((m.calc.overrideTeam + m.calc.overrideExt) / total * 100)}%</span>
        </div>
      </div>

      <div style={{
        background: 'var(--ls-bg-1)', border: '1px solid var(--ls-line)',
        borderRadius: 'var(--ls-radius-xl)', padding: 18, position: 'relative', overflow: 'hidden',
      }}>
        <div className="ls-mesh" style={{ opacity: 0.5 }} />
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: 'relative', display: 'block', maxWidth: '100%' }}>
          <defs>
            {sources.map((s, i) => (
              <linearGradient key={i} id={`sk-g-${i}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={s.color} stopOpacity="0.55" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0.85" />
              </linearGradient>
            ))}
          </defs>

          {/* Ribbons */}
          {sources.map((s, i) => {
            const x1 = left + 220, x2 = right - 220;
            const cp = (x1 + x2) / 2;
            const path = `M ${x1} ${s.y}
                          C ${cp} ${s.y}, ${cp} ${dest[i].y}, ${x2} ${dest[i].y}
                          L ${x2} ${dest[i].y + dest[i].h}
                          C ${cp} ${dest[i].y + dest[i].h}, ${cp} ${s.y + s.h}, ${x1} ${s.y + s.h} Z`;
            return (
              <path key={i} d={path} fill={`url(#sk-g-${i})`}
                style={{ animation: `sk-rib 900ms ${100 + i * 100}ms var(--ls-ease-out) both`, transformOrigin: 'center', filter: 'blur(.3px)' }}
              />
            );
          })}

          {/* Source nodes */}
          {sources.map((s, i) => (
            <g key={i}>
              <rect x={left} y={s.y} width={220} height={s.h} rx={14}
                fill="var(--ls-bg-1)" stroke={s.color} strokeOpacity="0.4" strokeWidth="1.5" />
              <rect x={left} y={s.y} width={5} height={s.h} fill={s.color} rx={2.5} />
              <text x={left + 18} y={s.y + 22}
                style={{ fontFamily: 'var(--ls-font-ui)', fontWeight: 600, fontSize: 13.5, fill: 'var(--ls-ink)' }}>
                {s.label}
              </text>
              <text x={left + 18} y={s.y + 40}
                style={{ fontFamily: 'var(--ls-font-ui)', fontSize: 11.5, fill: 'var(--ls-ink-3)' }}>
                {s.sub} · {s.note}
              </text>
              <text x={left + 18} y={s.y + s.h - 14}
                style={{ fontFamily: 'var(--ls-font-display)', fontStyle: 'italic', fontWeight: 700, fontSize: 26, fill: s.color, letterSpacing: '-.01em' }}>
                {s.value.toLocaleString('fr-FR')} €
              </text>
            </g>
          ))}

          {/* Destination node */}
          <g>
            <rect x={right - 220} y={destY} width={220} height={destH} rx={16}
              fill="var(--ls-bg-1)" stroke="var(--ls-line-2)" strokeWidth="1.5" />
            {/* Border-gradient stripe */}
            <rect x={right - 220} y={destY} width={5} height={destH} rx={2.5}
              fill="url(#sk-dest-bar)" />
            <linearGradient id="sk-dest-bar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--ls-teal)" />
              <stop offset="50%" stopColor="var(--ls-purple)" />
              <stop offset="100%" stopColor="var(--ls-coral)" />
            </linearGradient>
            <text x={right - 200} y={destY + 26}
              style={{ fontFamily: 'var(--ls-font-ui)', fontSize: 10.5, fill: 'var(--ls-ink-3)', letterSpacing: '.16em', textTransform: 'uppercase' }}>
              Total net · {m.month}
            </text>
            <text x={right - 200} y={destY + 110}
              style={{ fontFamily: 'var(--ls-font-display)', fontStyle: 'italic', fontWeight: 700, fontSize: 56, fill: 'var(--ls-ink)', letterSpacing: '-.02em' }}>
              {total.toLocaleString('fr-FR')}
            </text>
            <text x={right - 200} y={destY + 140}
              style={{ fontFamily: 'var(--ls-font-display)', fontStyle: 'italic', fontWeight: 600, fontSize: 22, fill: 'var(--ls-ink-2)' }}>
              euros
            </text>
            {/* Mini composition rows */}
            {dest.map((d, i) => (
              <g key={i}>
                <rect x={right - 200} y={destY + 180 + i * 46} width={6} height={6} rx={3} fill={d.color} />
                <text x={right - 188} y={destY + 186 + i * 46}
                  style={{ fontFamily: 'var(--ls-font-ui)', fontSize: 12, fill: 'var(--ls-ink-2)' }}>
                  {sources[i].label.replace(' app', '').replace(' perso', '')}
                </text>
                <text x={right - 24} y={destY + 186 + i * 46} textAnchor="end"
                  style={{ fontFamily: 'var(--ls-font-display)', fontStyle: 'italic', fontWeight: 700, fontSize: 14, fill: 'var(--ls-ink)' }}>
                  {d.value.toLocaleString('fr-FR')} €
                </text>
                <rect x={right - 200} y={destY + 196 + i * 46} width={170} height={3} rx={2} fill="var(--ls-bg-2)" />
                <rect x={right - 200} y={destY + 196 + i * 46} width={170 * (d.value / total)} height={3} rx={2} fill={d.color}
                  style={{ animation: `sk-fill ${600 + i * 100}ms ${300 + i * 100}ms var(--ls-ease-out) both`, transformOrigin: 'left', transform: 'scaleX(0)' }} />
              </g>
            ))}
          </g>

          {/* connector dots */}
          {sources.map((s, i) => (
            <React.Fragment key={i}>
              <circle cx={left + 220} cy={s.y + s.h / 2} r={3.5} fill={s.color} />
              <circle cx={right - 220} cy={dest[i].y + dest[i].h / 2} r={3.5} fill={s.color} />
            </React.Fragment>
          ))}
        </svg>
      </div>

      <div style={{ marginTop: 12, fontFamily: 'var(--ls-font-ui)', fontSize: 12, color: 'var(--ls-ink-3)', textAlign: 'center' }}>
        Survole un ruban pour isoler la source · clic pour ouvrir le détail
      </div>
    </div>
  );
}

if (typeof document !== 'undefined' && !document.getElementById('sk-anims')) {
  const s = document.createElement('style');
  s.id = 'sk-anims';
  s.textContent = `
    @keyframes sk-rib { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes sk-fill { from { transform: scaleX(0); } to { transform: scaleX(1); } }
  `;
  document.head.appendChild(s);
}

window.WalletCard = WalletCard;
window.SankeyFlow = SankeyFlow;
