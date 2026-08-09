// SiteApp — Breakfast Club public site + a simple reservation modal.
function SiteApp() {
  const { Button, EyebrowPill } = window.LaBase360DesignSystem_afe5db;
  const [modal, setModal] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const open = () => { setDone(false); setModal(true); };

  return (
    <div style={{ background: 'var(--bc-cream)', minHeight: '100%' }}>
      <SiteHeader onReserve={open} />
      <Hero onReserve={open} />
      <FeatureCards />
      <DarkBand />
      <Pricing onReserve={open} />
      <SiteFooter />

      {modal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={() => setModal(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(23,32,28,.55)' }} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: 'var(--bc-radius-card)', boxShadow: 'var(--shadow-card)', padding: 34, width: 420, maxWidth: '100%' }}>
            {!done ? (
              <React.Fragment>
                <EyebrowPill tone="orange">Réservation</EyebrowPill>
                <h2 style={{ fontFamily: 'var(--font-title)', textTransform: 'uppercase', color: 'var(--bc-ink)', fontSize: 30, margin: '14px 0 6px' }}>Réserve ta place</h2>
                <p style={{ fontFamily: 'var(--font-bc-body)', color: 'var(--bc-text)', fontSize: 15, margin: '0 0 20px' }}>Une semaine offerte, sans engagement.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 22 }}>
                  <input placeholder="Ton prénom" style={inp} defaultValue="Marie" />
                  <input placeholder="Ton e-mail" style={inp} defaultValue="marie@exemple.fr" />
                </div>
                <Button variant="cta" size="lg" pill style={{ width: '100%' }} onClick={() => setDone(true)}>Confirmer ma place</Button>
              </React.Fragment>
            ) : (
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <div style={{ fontSize: 46 }}>🎉</div>
                <h2 style={{ fontFamily: 'var(--font-title)', textTransform: 'uppercase', color: 'var(--bc-ink)', fontSize: 28, margin: '10px 0 6px' }}>À très vite&nbsp;!</h2>
                <p style={{ fontFamily: 'var(--font-bc-body)', color: 'var(--bc-text)', fontSize: 15, margin: '0 0 22px' }}>On t'a envoyé un e-mail avec les détails de ta première semaine.</p>
                <Button variant="outline" pill style={{ color: 'var(--bc-orange)', borderColor: 'var(--bc-orange)' }} onClick={() => setModal(false)}>Fermer</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
const inp = { width: '100%', boxSizing: 'border-box', border: '1px solid rgba(30,51,48,.14)', borderRadius: 'var(--ls-radius)', padding: '13px 15px', fontFamily: 'var(--font-bc-body)', fontSize: 15, color: 'var(--bc-ink)', outline: 'none' };
window.SiteApp = SiteApp;
