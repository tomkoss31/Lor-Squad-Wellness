// Sections — Breakfast Club feature cards, dark band, pricing, footer.
const DSB = window.LaBase360DesignSystem_afe5db;

function FeatureCards() {
  const { Card, EyebrowPill, Icon } = DSB;
  const feats = [
    { icon: 'salad', accent: 'var(--bc-orange)', title: 'Repas de coach', body: 'Des menus équilibrés pensés par des nutritionnistes, livrés prêts à savourer.' },
    { icon: 'users', accent: 'var(--bc-pink)', title: 'Une vraie communauté', body: 'Un club qui te suit, te motive et célèbre chaque victoire avec toi.' },
    { icon: 'sunrise', accent: 'var(--bc-sage)', title: 'Des rituels qui tiennent', body: 'Petit-déj, hydratation, mouvement : des habitudes simples, ancrées pour de bon.' },
  ];
  return (
    <section style={{ background: 'var(--bc-cream)', padding: '20px 0 76px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 28px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <EyebrowPill tone="orange">La méthode</EyebrowPill>
          <h2 style={{ fontFamily: 'var(--font-title)', textTransform: 'uppercase', color: 'var(--bc-ink)', fontSize: 44, letterSpacing: '.005em', margin: '16px 0 0' }}>Trois piliers, zéro prise de tête</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 22 }}>
          {feats.map((f, i) => (
            <Card key={i} tone="club" accent={f.accent} padding={26}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: f.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', marginBottom: 16 }}><Icon name={f.icon} size={24} /></div>
              <h3 style={{ fontFamily: 'var(--font-title)', textTransform: 'uppercase', color: 'var(--bc-ink)', fontSize: 22, margin: '0 0 8px' }}>{f.title}</h3>
              <p style={{ fontFamily: 'var(--font-bc-body)', color: 'var(--bc-text)', fontSize: 15, lineHeight: 1.6, margin: 0 }}>{f.body}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function DarkBand() {
  const { EyebrowPill } = DSB;
  const stats = [['1 200+', 'membres actifs'], ['92%', 'tiennent leurs rituels'], ['4,9/5', 'note moyenne']];
  return (
    <section style={{ background: 'var(--bc-green)', padding: '72px 0' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 28px', textAlign: 'center' }}>
        <EyebrowPill tone="peach">Le club en chiffres</EyebrowPill>
        <h2 style={{ fontFamily: 'var(--font-title)', textTransform: 'uppercase', color: 'var(--bc-on-dark)', fontSize: 40, margin: '16px 0 40px' }}>On ne le fait pas seul</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }}>
          {stats.map((s, i) => (
            <div key={i}>
              <div style={{ fontFamily: 'var(--font-editorial)', fontWeight: 800, color: 'var(--bc-orange)', fontSize: 52, lineHeight: 1 }}>{s[0]}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--bc-on-dark-muted)', marginTop: 8 }}>{s[1]}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing({ onReserve }) {
  const { Card, EyebrowPill, Button, Icon } = DSB;
  const plans = [
    { name: 'Découverte', price: '0', per: '/ essai', feats: ['1 semaine offerte', 'Accès communauté', 'Menu de base'], cta: 'Commencer', primary: false },
    { name: 'Club', price: '129', per: '/ mois', feats: ['Repas de coach illimités', 'Suivi personnalisé', 'Rituels & défis', 'App La Base 360'], cta: 'Réserver ma place', primary: true },
    { name: 'Duo', price: '199', per: '/ mois', feats: ['Tout le plan Club', 'Deux membres', 'Séances en binôme'], cta: 'Choisir Duo', primary: false },
  ];
  return (
    <section style={{ background: 'var(--bc-cream)', padding: '76px 0' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 28px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <EyebrowPill tone="pink">Tarifs</EyebrowPill>
          <h2 style={{ fontFamily: 'var(--font-title)', textTransform: 'uppercase', color: 'var(--bc-ink)', fontSize: 44, margin: '16px 0 0' }}>Rejoins quand tu veux</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 22, alignItems: 'start' }}>
          {plans.map((p, i) => (
            <Card key={i} tone="club" accent={p.primary ? 'var(--bc-orange)' : 'var(--bc-sage)'} padding={28} style={p.primary ? { transform: 'scale(1.04)', zIndex: 1 } : {}}>
              {p.primary && <div style={{ marginBottom: 12 }}><EyebrowPill tone="orange">Le plus choisi</EyebrowPill></div>}
              <h3 style={{ fontFamily: 'var(--font-title)', textTransform: 'uppercase', color: 'var(--bc-ink)', fontSize: 24, margin: '0 0 10px' }}>{p.name}</h3>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 18 }}>
                <span style={{ fontFamily: 'var(--font-editorial)', fontWeight: 800, color: 'var(--bc-ink)', fontSize: 46 }}>{p.price}&nbsp;€</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: '#8A938D', fontSize: 13 }}>{p.per}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
                {p.feats.map((f, j) => (
                  <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 9, color: 'var(--bc-text)', fontFamily: 'var(--font-bc-body)', fontSize: 14 }}>
                    <Icon name="check" size={16} color="var(--bc-orange)" strokeWidth={2.5} />{f}
                  </div>
                ))}
              </div>
              <Button variant={p.primary ? 'cta' : 'outline'} pill style={{ width: '100%', ...(p.primary ? {} : { color: 'var(--bc-orange)', borderColor: 'var(--bc-orange)' }) }} onClick={onReserve}>{p.cta}</Button>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer style={{ background: 'var(--bc-footer)', padding: '48px 0' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 28px', display: 'flex', alignItems: 'center', gap: 20 }}>
        <img src="../../assets/breakfast-club/logo-wordmark-dark.png" alt="The Breakfast Club" style={{ height: 52 }} />
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--bc-on-dark-hint)', letterSpacing: '.08em' }}>© 2026 LA BASE 360 · THE BREAKFAST CLUB</span>
      </div>
    </footer>
  );
}
window.FeatureCards = FeatureCards;
window.DarkBand = DarkBand;
window.Pricing = Pricing;
window.SiteFooter = SiteFooter;
