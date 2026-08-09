// LoginScreen — La Base 360 client PWA sign-in. Dark, warm, premium.
const { Button, Logo, EyebrowPill } = window.LaBase360DesignSystem_afe5db;

function LoginScreen({ onLogin }) {
  const [email, setEmail] = React.useState('marie@exemple.fr');
  const [pw, setPw] = React.useState('••••••••');
  const field = {
    width: '100%', boxSizing: 'border-box', background: 'var(--ls-surface2)',
    border: '1px solid var(--ls-border)', borderRadius: 'var(--ls-radius)',
    color: 'var(--ls-text)', fontFamily: 'var(--font-body)', fontSize: 15,
    padding: '13px 15px', outline: 'none',
  };
  const lab = { fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--ls-text-hint)', marginBottom: 7, display: 'block' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '48px 26px 30px', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, marginTop: 20 }}>
        <Logo tone="dark" layout="stacked" size={64} />
      </div>
      <div style={{ marginTop: 48 }}>
        <EyebrowPill tone="app">Bon retour</EyebrowPill>
        <h1 style={{ fontFamily: 'var(--font-title)', textTransform: 'uppercase', color: 'var(--ls-text)', fontSize: 34, letterSpacing: '.01em', lineHeight: 1.02, margin: '14px 0 0' }}>Reprends ta<br/>progression</h1>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 30 }}>
        <div><label style={lab}>E-mail</label><input style={field} value={email} onChange={e => setEmail(e.target.value)} /></div>
        <div><label style={lab}>Mot de passe</label><input type="password" style={field} value={pw} onChange={e => setPw(e.target.value)} /></div>
      </div>
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Button variant="primary" size="lg" pill style={{ width: '100%' }} onClick={onLogin}>Se connecter</Button>
        <span style={{ textAlign: 'center', color: 'var(--ls-text-muted)', fontSize: 13 }}>Pas encore membre ? <a href="#" style={{ color: 'var(--ls-teal)', textDecoration: 'none', fontWeight: 600 }}>Rejoindre le club</a></span>
      </div>
    </div>
  );
}
window.LoginScreen = LoginScreen;
