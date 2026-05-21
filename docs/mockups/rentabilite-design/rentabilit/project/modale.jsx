// modale.jsx — Detail modal (analytics layer, not a duplicate of the widget)

function Modale({ theme = 'light', defaultTab = '12m', onClose }) {
  const [tab, setTab] = React.useState(defaultTab);
  const [filter, setFilter] = React.useState('all'); // all | public | vip | distri
  const m = MOCK;

  const filtered = {
    all:    { total: m.total, share: 1.00, count: 18, label: 'tous publics' },
    public: { total: 852, share: 0.70, count: 12, label: 'grand public' },
    vip:    { total: 234, share: 0.19, count:  4, label: 'VIP / récurrents' },
    distri: { total: m.calc.overrideTeam + m.calc.overrideExt, share: 0.39, count: m.team.length + m.external, label: 'distri (overrides)' },
  }[filter];

  return (
    <div className="ls ls-modale" data-theme={theme}
      style={{
        background: 'var(--ls-bg-1)',
        borderRadius: 'var(--ls-radius-xl)',
        border: '1px solid var(--ls-line)',
        boxShadow: 'var(--ls-shadow-lg)',
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>

      {/* ── Header ──────────────────────────────────────────── */}
      <div style={{
        padding: '20px 26px 16px',
        borderBottom: '1px solid var(--ls-line)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18,
      }}>
        <div>
          <div className="ls-eyebrow" style={{ marginBottom: 4 }}>
            <Icon name="bolt" size={11} color="var(--ls-gold)" />
            Analyse détaillée
          </div>
          <div style={{ fontFamily: 'var(--ls-font-display)', fontWeight: 600, fontSize: 22, color: 'var(--ls-ink)', letterSpacing: '-.01em' }}>
            Rentabilité · {m.month}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* segmented tab */}
          <div style={{
            display: 'inline-flex', padding: 3, gap: 2,
            background: 'var(--ls-bg-2)', borderRadius: 999,
            border: '1px solid var(--ls-line)',
          }}>
            <TabPill active={tab === 'mois'} onClick={() => setTab('mois')}>Vue mois courant</TabPill>
            <TabPill active={tab === '12m'}  onClick={() => setTab('12m')}>Vue 12 mois</TabPill>
          </div>
          <button onClick={onClose} aria-label="Fermer" style={{
            width: 34, height: 34, borderRadius: 999,
            background: 'var(--ls-bg-2)', border: '1px solid var(--ls-line)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--ls-ink-2)',
          }}>
            <Icon name="close" size={14} />
          </button>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────── */}
      <div style={{ padding: '20px 26px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {tab === '12m' ? (
          <TwelveMonthsView m={m} theme={theme} />
        ) : (
          <CurrentMonthView m={m} filter={filter} setFilter={setFilter} filtered={filtered} theme={theme} />
        )}

        {/* Plan d'action — always visible */}
        <div style={{
          background: 'linear-gradient(140deg, var(--ls-gold-tint), transparent 70%), var(--ls-bg-1)',
          border: '1px solid color-mix(in oklab, var(--ls-gold) 24%, transparent)',
          borderRadius: 'var(--ls-radius-lg)',
          padding: '18px 22px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span aria-hidden="true" style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'color-mix(in oklab, var(--ls-gold) 18%, transparent)',
              color: 'var(--ls-gold)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="target" size={14} />
            </span>
            <div style={{ fontFamily: 'var(--ls-font-display)', fontWeight: 600, fontSize: 17, color: 'var(--ls-ink)' }}>
              Plan d'action
            </div>
            <span className="ls-chip" style={{ height: 22, padding: '0 8px', fontSize: 10.5 }}>3 nudges IA</span>
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            <Nudge index="1" title="Relance les 2 leads en stand-by" body="Camille n'a pas reconfirmé. +120€ projetés si réponse sous 48h." cta="Voir les leads" />
            <Nudge index="2" title="Booster override : Mandy proche du palier" body="+184€ pour toi si elle ferme 1 vente cette semaine." cta="Lui écrire" />
            <Nudge index="3" title="Nouveau pack Reset 21j" body="Marge directe 58% (vs 50%). 4 clientes idéales identifiées." cta="Programmer" muted />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Subcomponents ─────────────────────────────────────────── */

function TabPill({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      height: 28, padding: '0 14px',
      borderRadius: 999, border: 'none', cursor: 'pointer',
      background: active ? 'var(--ls-bg-1)' : 'transparent',
      color: active ? 'var(--ls-ink)' : 'var(--ls-ink-3)',
      fontFamily: 'var(--ls-font-ui)', fontSize: 12.5, fontWeight: 600,
      boxShadow: active ? 'var(--ls-shadow-sm)' : 'none',
      transition: 'all .15s',
    }}>
      {children}
    </button>
  );
}

function TwelveMonthsView({ m, theme }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'var(--ls-font-ui)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--ls-ink-3)' }}>
            Sur 12 mois
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 6 }}>
            <span className="ls-num" style={{ fontFamily: 'var(--ls-font-display)', fontWeight: 700, fontSize: 36, color: 'var(--ls-ink)', letterSpacing: '-.01em' }}>
              {m.bars.reduce((a, b) => a + b, 0).toLocaleString('fr-FR')} €
            </span>
            <span style={{ fontFamily: 'var(--ls-font-ui)', fontSize: 12, color: 'var(--ls-ink-3)' }}>
              cumul net · moy. {Math.round(m.bars.reduce((a, b) => a + b, 0) / 12).toLocaleString('fr-FR')} €/mois
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span className="ls-chip ls-chip--gold"><Icon name="spark" size={11} />Record · Mar {m.best.amount}€</span>
          <span className="ls-chip ls-chip--teal"><Icon name="arrowUp" size={11} />Tendance +18% /6m</span>
        </div>
      </div>

      <div style={{
        background: 'var(--ls-bg-1)', border: '1px solid var(--ls-line)',
        borderRadius: 'var(--ls-radius-lg)', padding: 18,
      }}>
        <BarChart
          data={m.bars}
          labels={m.barLabels}
          width={680}
          height={220}
          current={m.bars.length - 1}
          peak={2}
        />
      </div>

      {/* annotations */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        <Annotation when="Aoû" title="Premier record" body="Lancement Reset 21j · +85% vs Juil" tone="gold" />
        <Annotation when="Déc" title="Rang Senior" body="Promotion · override débloqué" tone="purple" />
        <Annotation when="Mai" title="En cours" body="11 jours restants · projection 1 892 €" tone="teal" />
      </div>
    </>
  );
}

function CurrentMonthView({ m, filter, setFilter, filtered, theme }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--ls-font-ui)', fontSize: 12, color: 'var(--ls-ink-3)', marginRight: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Icon name="filter" size={12} />
          Pivot
        </span>
        {[
          ['all', 'Tous'],
          ['public', 'Publics'],
          ['vip', 'VIP'],
          ['distri', 'Distri (overrides)'],
        ].map(([k, label]) => (
          <FilterChip key={k} active={filter === k} onClick={() => setFilter(k)}>{label}</FilterChip>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14 }}>
        <div style={{
          background: 'var(--ls-bg-1)', border: '1px solid var(--ls-line)',
          borderRadius: 'var(--ls-radius-lg)', padding: 22,
        }}>
          <div style={{ fontFamily: 'var(--ls-font-ui)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--ls-ink-3)' }}>
            {filtered.label}
          </div>
          <div className="ls-num" style={{ fontFamily: 'var(--ls-font-display)', fontStyle: 'italic', fontWeight: 700, fontSize: 52, color: 'var(--ls-ink)', marginTop: 8, letterSpacing: '-.02em', lineHeight: 1 }}>
            {filtered.total.toLocaleString('fr-FR')}<span style={{ fontSize: 30, marginLeft: 2 }}>€</span>
          </div>
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="ls-chip ls-chip--teal">{Math.round(filtered.share * 100)}% du total</span>
            <span style={{ fontFamily: 'var(--ls-font-ui)', fontSize: 12, color: 'var(--ls-ink-3)' }}>{filtered.count} {filter === 'distri' ? 'distri' : 'clients'}</span>
          </div>
          {/* Share bar */}
          <div style={{ marginTop: 18, height: 8, background: 'var(--ls-bg-2)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{
              width: `${filtered.share * 100}%`,
              height: '100%',
              background: 'linear-gradient(90deg, var(--ls-teal), var(--ls-purple))',
              borderRadius: 999,
              transition: 'width 600ms var(--ls-ease-out)',
            }} />
          </div>
        </div>

        <div style={{
          background: 'var(--ls-bg-1)', border: '1px solid var(--ls-line)',
          borderRadius: 'var(--ls-radius-lg)', padding: 18,
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <div style={{ fontFamily: 'var(--ls-font-ui)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--ls-ink-3)' }}>
            Composition
          </div>
          <CompoRow label="Marge directe"      value={m.calc.margeDirecte} pct={m.calc.margeDirecte / m.total} color="var(--ls-teal)" />
          <CompoRow label="Override équipe"    value={m.calc.overrideTeam}  pct={m.calc.overrideTeam / m.total}  color="var(--ls-purple)" />
          <CompoRow label="Override hors-app"  value={m.calc.overrideExt}   pct={m.calc.overrideExt / m.total}   color="var(--ls-purple-soft)" />
        </div>
      </div>
    </>
  );
}

function FilterChip({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      height: 28, padding: '0 12px', borderRadius: 999,
      border: `1px solid ${active ? 'transparent' : 'var(--ls-line-2)'}`,
      background: active ? 'var(--ls-ink)' : 'var(--ls-bg-1)',
      color: active ? 'var(--ls-bg-1)' : 'var(--ls-ink-2)',
      fontFamily: 'var(--ls-font-ui)', fontWeight: 500, fontSize: 12.5,
      cursor: 'pointer', transition: 'all .15s',
    }}>
      {children}
    </button>
  );
}

function CompoRow({ label, value, pct, color }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ fontFamily: 'var(--ls-font-ui)', fontSize: 12.5, color: 'var(--ls-ink-2)' }}>{label}</span>
        <span style={{ fontFamily: 'var(--ls-font-ui)', fontSize: 12, color: 'var(--ls-ink-3)' }}>
          <strong className="ls-num" style={{ color: 'var(--ls-ink)', fontWeight: 600, marginRight: 6 }}>{value.toLocaleString('fr-FR')} €</strong>
          {Math.round(pct * 100)}%
        </span>
      </div>
      <div style={{ height: 6, background: 'var(--ls-bg-2)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{
          width: `${pct * 100}%`, height: '100%', background: color, borderRadius: 999,
          transition: 'width 600ms var(--ls-ease-out)',
        }} />
      </div>
    </div>
  );
}

function Annotation({ when, title, body, tone }) {
  const tones = {
    gold:   { bg: 'var(--ls-gold-tint)',   color: 'var(--ls-gold)' },
    purple: { bg: 'var(--ls-purple-tint)', color: 'var(--ls-purple)' },
    teal:   { bg: 'var(--ls-teal-tint)',   color: 'var(--ls-teal)' },
  };
  const t = tones[tone];
  return (
    <div style={{
      background: 'var(--ls-bg-1)',
      border: '1px solid var(--ls-line)',
      borderRadius: 'var(--ls-radius)',
      padding: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{
          height: 22, padding: '0 8px', borderRadius: 999,
          background: t.bg, color: t.color,
          fontFamily: 'var(--ls-font-ui)', fontSize: 11, fontWeight: 600,
          display: 'inline-flex', alignItems: 'center',
        }}>{when}</span>
        <span style={{ fontFamily: 'var(--ls-font-ui)', fontSize: 13, fontWeight: 600, color: 'var(--ls-ink)' }}>{title}</span>
      </div>
      <div style={{ fontFamily: 'var(--ls-font-ui)', fontSize: 12, color: 'var(--ls-ink-3)' }}>{body}</div>
    </div>
  );
}

function Nudge({ index, title, body, cta, muted }) {
  return (
    <div style={{
      background: 'var(--ls-bg-1)',
      border: '1px solid var(--ls-line)',
      borderRadius: 'var(--ls-radius)',
      padding: '12px 14px',
      display: 'flex', alignItems: 'center', gap: 14,
      opacity: muted ? 0.85 : 1,
    }}>
      <span style={{
        width: 26, height: 26, borderRadius: 999,
        background: 'var(--ls-bg-2)', color: 'var(--ls-ink-2)',
        fontFamily: 'var(--ls-font-display)', fontWeight: 700, fontStyle: 'italic', fontSize: 13,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>{index}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--ls-font-ui)', fontWeight: 600, fontSize: 13.5, color: 'var(--ls-ink)' }}>{title}</div>
        <div style={{ fontFamily: 'var(--ls-font-ui)', fontSize: 12.5, color: 'var(--ls-ink-3)', marginTop: 2 }}>{body}</div>
      </div>
      <button className="ls-cta" style={{ height: 30, padding: '0 12px', fontSize: 12 }}>
        {cta}
        <Icon name="arrowRight" size={11} />
      </button>
    </div>
  );
}

/* keyframes for chart bars */
if (typeof document !== 'undefined' && !document.getElementById('ls-modal-anims')) {
  const s = document.createElement('style');
  s.id = 'ls-modal-anims';
  s.textContent = `
    @keyframes ls-bar-rise { from { transform: scaleY(0); } to { transform: scaleY(1); } }
  `;
  document.head.appendChild(s);
}

window.Modale = Modale;
