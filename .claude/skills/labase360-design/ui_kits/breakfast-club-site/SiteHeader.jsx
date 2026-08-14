// SiteHeader — Breakfast Club public site nav.
const { Button } = window.LaBase360DesignSystem_afe5db;

function SiteHeader({ onReserve }) {
  const links = ['Le club', 'La méthode', 'Le menu', 'Tarifs'];
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(252,248,241,.86)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(30,51,48,.06)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '14px 28px', display: 'flex', alignItems: 'center', gap: 28 }}>
        <img src="../../assets/breakfast-club/logo-wordmark.png" alt="The Breakfast Club" style={{ height: 46 }} />
        <nav style={{ display: 'flex', gap: 26, marginLeft: 18 }}>
          {links.map(l => <a key={l} href="#" style={{ color: 'var(--bc-text)', textDecoration: 'none', fontFamily: 'var(--font-bc-body)', fontWeight: 500, fontSize: 15 }}>{l}</a>)}
        </nav>
        <div style={{ marginLeft: 'auto' }}><Button variant="cta" onClick={onReserve}>Réserver</Button></div>
      </div>
    </header>
  );
}
window.SiteHeader = SiteHeader;
