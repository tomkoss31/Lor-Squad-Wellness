// page.jsx — Full /rentabilite page

function Page({ theme = 'light', onOpenModal }) {
  const m = MOCK;
  const animTotal = useCount(m.total);
  const animProj  = useCount(m.projection, { delay: 200 });
  const animBest  = useCount(m.best.amount, { delay: 280 });
  const delta = m.total - m.totalPrev;
  const deltaPct = Math.round((delta / m.totalPrev) * 100);
  const newRecord = m.total > m.best.amount; // not yet but ready

  return (
    <div className="ls ls-page" data-theme={theme}
      style={{
        background: 'var(--ls-bg)',
        minHeight: '100%',
        padding: '36px 44px 56px',
        fontFamily: 'var(--ls-font-body)',
      }}>
      {/* ── Top bar ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontFamily: 'var(--ls-font-ui)', fontSize: 13, color: 'var(--ls-ink-3)' }}>
          <span style={{ color: 'var(--ls-ink-2)', fontWeight: 600 }}>La Base 360</span>
          <Icon name="chevR" size={12} />
          <span>Rentabilité</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="ls-cta" style={{ height: 34, padding: '0 12px', fontSize: 12.5 }}>
            <Icon name="eyeOff" size={13} />
            Mode RDV
          </button>
          <button className="ls-cta ls-cta--solid" style={{ height: 34, padding: '0 14px', fontSize: 12.5 }} onClick={onOpenModal}>
            <Icon name="bolt" size={13} />
            Analyse détaillée
          </button>
        </div>
      </div>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section style={{
        position: 'relative',
        background: 'var(--ls-bg-1)',
        border: '1px solid var(--ls-line)',
        borderRadius: 'var(--ls-radius-xl)',
        padding: '44px 48px 38px',
        overflow: 'hidden',
        boxShadow: 'var(--ls-shadow-md)',
        marginBottom: 40,
      }}>
        <div className="ls-mesh" />
        {/* sparkline bg */}
        <div style={{ position: 'absolute', right: -10, bottom: 0, opacity: 0.22, pointerEvents: 'none' }}>
          <Sparkline data={m.spark} width={620} height={140} color="var(--ls-teal)" fill={true} strokeWidth={1.5} uid={`hero-${theme}`} />
        </div>

        <div style={{ position: 'relative' }}>
          <div className="ls-fadeup">
            <span className="ls-eyebrow">
              <Icon name="diamond" size={12} color="var(--ls-gold)" />
              <span aria-hidden="true">Ma rentabilité</span>
              <span style={{ color: 'var(--ls-ink-3)' }}>· {m.month}</span>
            </span>
          </div>

          <div className="ls-fadeup ls-d-1" style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 18, marginTop: 12 }}>
            <span style={{ fontFamily: 'var(--ls-font-display)', fontStyle: 'italic', fontWeight: 600, fontSize: 44, color: 'var(--ls-ink-2)', letterSpacing: '-.01em' }}>
              Tu gagnes
            </span>
            <span className="ls-display ls-num" style={{ fontSize: 92, lineHeight: 0.95 }}>
              {Math.round(animTotal).toLocaleString('fr-FR')}<span style={{ fontSize: 52, marginLeft: 4 }}>€</span>
            </span>
          </div>

          <div className="ls-fadeup ls-d-2" style={{ marginTop: 6, fontFamily: 'var(--ls-font-ui)', fontSize: 14.5, color: 'var(--ls-ink-2)', maxWidth: 560 }}>
            net ce mois, dont <strong style={{ color: 'var(--ls-purple)' }}>+{m.calc.overrideTeam}€ override</strong> de ton équipe app et <strong style={{ color: 'var(--ls-purple)' }}>+{m.calc.overrideExt}€</strong> hors-app.
          </div>

          {/* 3 columns */}
          <div className="ls-fadeup ls-d-3" style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginTop: 32,
          }}>
            <StatBlock
              label="Ce mois"
              big={`${Math.round(animTotal).toLocaleString('fr-FR')} €`}
              accent={
                <span className="ls-chip ls-chip--teal">
                  <Icon name="arrowUp" size={11} />
                  +{delta}€ · +{deltaPct}% vs Avr
                </span>
              }
            />
            <StatBlock
              label="Projection fin de mois"
              big={`${Math.round(animProj).toLocaleString('fr-FR')} €`}
              accent={
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="ls-chip ls-chip--gold">
                    <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--ls-gold)' }} />
                    en avance · {m.daysLeft} j restants
                  </span>
                </span>
              }
              sparkline={
                <Sparkline data={[1048, 1100, 1180, 1221, 1450, 1700, m.projection]} width={120} height={28} color="var(--ls-purple)" fill={false} strokeWidth={1.6} uid={`proj-${theme}`} />
              }
            />
            <StatBlock
              label="Meilleur mois"
              big={`${Math.round(animBest).toLocaleString('fr-FR')} €`}
              accent={
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--ls-font-ui)', fontSize: 12, color: 'var(--ls-ink-3)' }}>{m.best.month}</span>
                  {newRecord && (
                    <span className="ls-chip ls-chip--gold">
                      <Icon name="spark" size={11} />
                      new record en vue
                    </span>
                  )}
                </span>
              }
            />
          </div>
        </div>
      </section>

      {/* ── SECTION: Le calcul ──────────────────────────────── */}
      <SectionHeader index="01" title="Le calcul" hint="D'où vient chaque euro" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
        <CalcBlock label="CA brut" value={`${m.calc.caBrut.toLocaleString('fr-FR')} €`} sub="18 programmes vendus" />
        <CalcBlock label="Marge perso" value={`${Math.round(m.calc.margePerso * 100)} %`} sub="taux moyen" op="×" />
        <CalcBlock label="Marge directe" value={`${m.calc.margeDirecte.toLocaleString('fr-FR')} €`} sub="ta part directe" op="=" emphasis />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
        <OverrideCard
          icon="users"
          title="Override équipe app"
          amount={m.calc.overrideTeam}
          chip={<span className="ls-chip ls-chip--purple">L1 direct</span>}
          right={
            <div style={{ display: 'flex', alignItems: 'center', gap: -6 }}>
              <Avatar initials="VL" hue={20}  size={26} ring />
              <Avatar initials="MR" hue={280} size={26} ring />
              <Avatar initials="SB" hue={160} size={26} ring />
            </div>
          }
          footer="3 distri actifs ce mois"
        />
        <OverrideCard
          icon="plus"
          title="Override hors-app"
          amount={m.calc.overrideExt}
          chip={<span className="ls-chip ls-chip--purple">saisi manuellement</span>}
          right={
            <div style={{ fontFamily: 'var(--ls-font-display)', fontStyle: 'italic', fontWeight: 700, fontSize: 32, color: 'var(--ls-purple)' }}>
              {m.external}
            </div>
          }
          footer={`${m.external} distri saisis manuellement`}
        />
      </div>

      {/* Total */}
      <div className="ls-border-gradient" style={{ marginBottom: 48 }}>
        <div style={{
          padding: '22px 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24,
          position: 'relative',
        }}>
          <div>
            <div style={{ fontFamily: 'var(--ls-font-ui)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--ls-ink-3)' }}>
              Total net · {m.month}
            </div>
            <div style={{ fontFamily: 'var(--ls-font-ui)', fontSize: 13, color: 'var(--ls-ink-2)', marginTop: 4 }}>
              Marge directe + overrides équipe + hors-app
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
            <span className="ls-display ls-num" style={{ fontSize: 56 }}>
              {Math.round(animTotal).toLocaleString('fr-FR')}<span style={{ fontSize: 32, marginLeft: 2 }}>€</span>
            </span>
            <span style={{ filter: 'drop-shadow(0 0 8px color-mix(in oklab, var(--ls-purple) 35%, transparent))' }}>
              <span className="ls-chip ls-chip--teal">
                <Icon name="arrowUp" size={11} />
                +{deltaPct}%
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* ── SECTION: Équipe ─────────────────────────────────── */}
      <SectionHeader index="02" title="Mon équipe" hint="Tri par contribution · clic pour ouvrir la fiche" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 48 }}>
        {m.team.map((t, i) => (
          <TeamCard key={t.name} m={t} animDelay={120 + i * 60} />
        ))}
      </div>

      {/* ── SECTION: Top clients ─────────────────────────────── */}
      <SectionHeader index="03" title="Top clients" hint="Les 3 du mois — survol pour voir les produits" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        {m.topClients.slice(0, 3).map((c, i) => (
          <PodiumRow key={c.name} c={c} rank={i + 1} />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {m.topClients.slice(3).map((c, i) => (
          <ClientRow key={c.name} c={c} rank={i + 4} />
        ))}
      </div>
    </div>
  );
}

/* ── Subcomponents ─────────────────────────────────────────────── */

function StatBlock({ label, big, accent, sparkline }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, position: 'relative' }}>
      <div style={{ fontFamily: 'var(--ls-font-ui)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--ls-ink-3)' }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span className="ls-num" style={{ fontFamily: 'var(--ls-font-display)', fontWeight: 700, fontSize: 38, color: 'var(--ls-ink)', letterSpacing: '-.02em', lineHeight: 1 }}>
          {big}
        </span>
        {sparkline}
      </div>
      <div>{accent}</div>
    </div>
  );
}

function SectionHeader({ index, title, hint }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
        <span style={{ fontFamily: 'var(--ls-font-display)', fontStyle: 'italic', fontWeight: 700, fontSize: 14, color: 'var(--ls-gold)', letterSpacing: '.1em' }}>
          {index}
        </span>
        <span style={{ fontFamily: 'var(--ls-font-display)', fontWeight: 600, fontSize: 26, color: 'var(--ls-ink)', letterSpacing: '-.01em' }}>
          {title}
        </span>
      </div>
      {hint && <span style={{ fontFamily: 'var(--ls-font-ui)', fontSize: 12, color: 'var(--ls-ink-3)' }}>{hint}</span>}
    </div>
  );
}

function CalcBlock({ label, value, sub, op, emphasis }) {
  return (
    <div style={{ position: 'relative' }}>
      {op && (
        <div style={{
          position: 'absolute', left: -16, top: '50%', transform: 'translateY(-50%)',
          width: 28, height: 28, borderRadius: 999,
          background: 'var(--ls-bg-1)', border: '1px solid var(--ls-line-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--ls-font-ui)', fontWeight: 600, fontSize: 13, color: 'var(--ls-ink-2)',
          zIndex: 1,
        }}>
          {op}
        </div>
      )}
      <div style={{
        background: emphasis ? 'linear-gradient(180deg, color-mix(in oklab, var(--ls-teal) 6%, var(--ls-bg-1)), var(--ls-bg-1))' : 'var(--ls-bg-1)',
        border: '1px solid var(--ls-line)',
        borderRadius: 'var(--ls-radius-lg)',
        padding: '20px 22px',
        height: '100%',
      }}>
        <div style={{ fontFamily: 'var(--ls-font-ui)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--ls-ink-3)' }}>
          {label}
        </div>
        <div className="ls-num" style={{ fontFamily: 'var(--ls-font-display)', fontWeight: emphasis ? 700 : 600, fontSize: emphasis ? 40 : 34, color: emphasis ? 'var(--ls-teal)' : 'var(--ls-ink)', marginTop: 6, letterSpacing: '-.01em' }}>
          {value}
        </div>
        <div style={{ fontFamily: 'var(--ls-font-ui)', fontSize: 12, color: 'var(--ls-ink-3)', marginTop: 4 }}>
          {sub}
        </div>
      </div>
    </div>
  );
}

function OverrideCard({ icon, title, amount, chip, right, footer }) {
  return (
    <div style={{
      background: 'linear-gradient(140deg, var(--ls-purple-tint), transparent 60%), var(--ls-bg-1)',
      border: '1px solid color-mix(in oklab, var(--ls-purple) 18%, transparent)',
      borderRadius: 'var(--ls-radius-lg)',
      padding: '18px 22px 16px',
      position: 'relative',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'color-mix(in oklab, var(--ls-purple) 14%, transparent)',
            color: 'var(--ls-purple)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name={icon} size={14} />
          </span>
          <div>
            <div style={{ fontFamily: 'var(--ls-font-ui)', fontSize: 13.5, fontWeight: 600, color: 'var(--ls-ink)' }}>{title}</div>
            <div style={{ marginTop: 2 }}>{chip}</div>
          </div>
        </div>
        {right}
      </div>
      <div style={{ marginTop: 14, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span className="ls-num" style={{ fontFamily: 'var(--ls-font-display)', fontWeight: 700, fontStyle: 'italic', fontSize: 40, color: 'var(--ls-purple)', letterSpacing: '-.01em' }}>
          +{amount}<span style={{ fontSize: 22, marginLeft: 2 }}>€</span>
        </span>
        <span style={{ fontFamily: 'var(--ls-font-ui)', fontSize: 12, color: 'var(--ls-ink-3)' }}>{footer}</span>
      </div>
    </div>
  );
}

function TeamCard({ m, animDelay }) {
  return (
    <div className="ls-fadeup" style={{
      animationDelay: `${animDelay}ms`,
      background: 'var(--ls-bg-1)',
      border: '1px solid var(--ls-line)',
      borderRadius: 'var(--ls-radius-lg)',
      padding: 16,
      cursor: 'pointer',
      transition: 'transform .2s var(--ls-ease), border-color .2s, box-shadow .2s',
    }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'color-mix(in oklab, var(--ls-purple) 30%, transparent)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--ls-shadow-md)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--ls-line)'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar initials={m.initials} hue={m.hue} size={40} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontFamily: 'var(--ls-font-ui)', fontWeight: 600, fontSize: 14, color: 'var(--ls-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
          <div style={{ marginTop: 2 }}><span className="ls-chip" style={{ height: 22, padding: '0 8px', fontSize: 11 }}>{m.rank}</span></div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="ls-num" style={{ fontFamily: 'var(--ls-font-display)', fontWeight: 700, fontStyle: 'italic', fontSize: 22, color: 'var(--ls-purple)' }}>+{m.override}€</div>
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <MiniBar value={m.contrib} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: 'var(--ls-font-ui)', fontSize: 11, color: 'var(--ls-ink-3)' }}>
          <span>contribution</span>
          <span>{Math.round(m.contrib * 100)}%</span>
        </div>
      </div>
    </div>
  );
}

function PodiumRow({ c, rank }) {
  const accents = { 1: 'var(--ls-gold)', 2: '#a8a29e', 3: '#b06b3f' };
  const labels  = { 1: 'or', 2: 'argent', 3: 'bronze' };
  const accent = accents[rank];
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        background: 'var(--ls-bg-1)',
        border: '1px solid var(--ls-line)',
        borderRadius: 'var(--ls-radius-lg)',
        padding: '18px 22px 18px 26px',
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        alignItems: 'center',
        gap: 18,
        cursor: 'pointer',
        transition: 'transform .2s, border-color .2s, box-shadow .2s',
        transform: hover ? 'translateY(-2px)' : 'none',
        boxShadow: hover ? 'var(--ls-shadow-md)' : 'none',
        overflow: 'hidden',
      }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, background: accent }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: `color-mix(in oklab, ${accent} 14%, var(--ls-bg-2))`,
          color: accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--ls-font-display)', fontWeight: 700, fontStyle: 'italic', fontSize: 22,
          border: `1px solid color-mix(in oklab, ${accent} 30%, transparent)`,
        }}>#{rank}</div>
        <Avatar initials={c.initials} hue={c.hue} size={44} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'var(--ls-font-ui)', fontWeight: 600, fontSize: 16, color: 'var(--ls-ink)' }}>{c.name}</span>
          {c.agg && <span className="ls-chip" style={{ height: 22, padding: '0 8px', fontSize: 10.5 }}>Agrégé · 2 comptes</span>}
        </div>
        <div style={{
          marginTop: 8,
          fontFamily: 'var(--ls-font-ui)', fontSize: 12.5, color: 'var(--ls-ink-3)',
          display: 'flex', gap: 6, flexWrap: 'wrap',
          maxHeight: hover ? 60 : 0, opacity: hover ? 1 : 0,
          transition: 'max-height .25s var(--ls-ease), opacity .2s',
        }}>
          {c.products.map(p => (
            <span key={p} className="ls-chip" style={{ height: 22, padding: '0 8px', fontSize: 11 }}>{p}</span>
          ))}
        </div>
        <div style={{
          fontFamily: 'var(--ls-font-ui)', fontSize: 12.5, color: 'var(--ls-ink-3)',
          maxHeight: hover ? 0 : 24, opacity: hover ? 0 : 1, marginTop: 4,
          transition: 'max-height .2s, opacity .15s',
        }}>{labels[rank]} · {c.products.length} produit{c.products.length > 1 ? 's' : ''}</div>
      </div>
      <div className="ls-num" style={{ fontFamily: 'var(--ls-font-display)', fontWeight: 700, fontStyle: 'italic', fontSize: 30, color: 'var(--ls-ink)' }}>
        {c.amount}<span style={{ fontSize: 18, marginLeft: 2 }}>€</span>
      </div>
    </div>
  );
}

function ClientRow({ c, rank }) {
  return (
    <div style={{
      background: 'var(--ls-bg-1)',
      border: '1px solid var(--ls-line)',
      borderRadius: 'var(--ls-radius)',
      padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <span style={{ fontFamily: 'var(--ls-font-ui)', fontSize: 11, color: 'var(--ls-ink-3)', width: 22 }}>#{rank}</span>
      <Avatar initials={c.initials} hue={c.hue} size={32} />
      <span style={{ flex: 1, fontFamily: 'var(--ls-font-ui)', fontSize: 13.5, color: 'var(--ls-ink)' }}>{c.name}</span>
      <span className="ls-num" style={{ fontFamily: 'var(--ls-font-display)', fontStyle: 'italic', fontWeight: 700, fontSize: 18, color: 'var(--ls-ink)' }}>{c.amount} €</span>
    </div>
  );
}

window.Page = Page;
