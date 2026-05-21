// widget.jsx — Compact widget integrated in Co-pilote V5 (horizontal)

function Widget({ theme = 'light' }) {
  const m = MOCK;
  const pct = Math.round((m.total / m.projection) * 100);
  const delta = m.total - m.totalPrev;
  const animTotal = useCount(m.total);

  return (
    <div className={`ls ls-widget`} data-theme={theme}
      style={{
        position: 'relative',
        background: 'var(--ls-bg-1)',
        borderRadius: 'var(--ls-radius-xl)',
        border: '1px solid var(--ls-line)',
        boxShadow: 'var(--ls-shadow-lg)',
        padding: '26px 28px 22px',
        display: 'grid',
        gridTemplateColumns: '1.45fr 1fr',
        gap: 28,
        overflow: 'hidden',
      }}>
      {/* subtle mesh in background */}
      <div className="ls-mesh" style={{ opacity: theme === 'dark' ? 0.9 : 0.65 }} />

      {/* ── LEFT ────────────────────────────────────────────── */}
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
        <div className="ls-fadeup">
          <span className="ls-eyebrow" aria-hidden="false">
            <Icon name="diamond" size={11} color="var(--ls-gold)" />
            <span aria-hidden="true">Ma rentabilité</span>
            <span style={{ color: 'var(--ls-ink-3)', letterSpacing: '.14em' }}>· {m.month}</span>
          </span>
        </div>

        <div className="ls-fadeup ls-d-1" style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 14, rowGap: 4 }}>
          <span style={{ fontFamily: 'var(--ls-font-display)', fontStyle: 'italic', fontWeight: 600, fontSize: 28, color: 'var(--ls-ink-2)', letterSpacing: '-.01em' }}>
            Tu gagnes
          </span>
          <span className="ls-display ls-num" style={{ fontSize: 64 }}>
            {Math.round(animTotal).toLocaleString('fr-FR')}<span style={{ fontSize: 38, marginLeft: 2 }}>€</span>
          </span>
        </div>

        <div className="ls-fadeup ls-d-2" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="ls-chip">
            <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--ls-ink-3)' }} />
            18 programmes · marge 50%
          </span>
          <span className="ls-chip ls-chip--purple">
            <Icon name="users" size={11} />
            +{m.calc.overrideTeam}€ override équipe
          </span>
          <span className="ls-chip ls-chip--purple">
            <Icon name="plus" size={11} />
            +{m.calc.overrideExt}€ hors-app
          </span>
        </div>

        {/* spacer */}
        <div style={{ flex: 1 }} />

        <div className="ls-fadeup ls-d-3" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span className="ls-pill ls-pill--win">
            <span className="ls-pill__dot" />
            <span aria-hidden="true">🏆</span>
            Carton plein
          </span>
          <span style={{ fontFamily: 'var(--ls-font-ui)', fontSize: 12.5, color: 'var(--ls-ink-3)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Icon name="arrowUp" size={11} color="var(--ls-teal)" />
            <span style={{ color: 'var(--ls-teal)', fontWeight: 600 }}>+{delta}€</span>
            vs mois dernier
          </span>
          <div style={{ marginLeft: 'auto' }}>
            <button className="ls-cta">
              Voir le détail complet
              <Icon name="arrowRight" size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ── RIGHT (gauge) ───────────────────────────────────── */}
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <Gauge
          value={m.total / m.projection}
          projection={1}
          size={186}
          thickness={13}
          ahead={true}
          glow={theme === 'dark'}
          uid={`w-${theme}`}
          centerTop="atteint"
          centerBig={`${pct}%`}
          centerSub="vs projection"
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--ls-font-ui)', fontSize: 12, color: 'var(--ls-ink-3)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--ls-gold)', boxShadow: '0 0 0 3px color-mix(in oklab, var(--ls-gold) 28%, transparent)' }} />
            projection
          </span>
          <span className="ls-num">
            <strong style={{ color: 'var(--ls-ink)', fontWeight: 700 }}>{m.projection.toLocaleString('fr-FR')} €</strong>
          </span>
          <span>fin de mois</span>
        </div>
      </div>
    </div>
  );
}

window.Widget = Widget;
