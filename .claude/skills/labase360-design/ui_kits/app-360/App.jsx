// App — orchestrates the La Base 360 client PWA: login -> home/club with tab bar + log sheet.
function App() {
  const [screen, setScreen] = React.useState('login'); // login | app
  const [tab, setTab] = React.useState('home');
  const [sheet, setSheet] = React.useState(false);
  const [meals, setMeals] = React.useState([
    { name: 'Bowl petit-déjeuner', time: '08:15', kcal: 420, icon: 'sunrise' },
    { name: 'Café + amandes', time: '10:40', kcal: 180, icon: 'coffee' },
  ]);

  const addMeal = (o) => {
    setMeals(m => [...m, { name: o.name, time: 'à l\'instant', kcal: o.kcal, icon: o.icon }]);
    setSheet(false);
  };

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--ls-bg)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {screen === 'login' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <LoginScreen onLogin={() => setScreen('app')} />
        </div>
      )}
      {screen === 'app' && (
        <React.Fragment>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {tab === 'home' && <HomeScreen meals={meals} onLogMeal={() => setSheet(true)} />}
            {tab === 'club' && <ClubScreen />}
            {tab === 'log' && <HomeScreen meals={meals} onLogMeal={() => setSheet(true)} />}
            {tab === 'profile' && <ProfileStub onLogout={() => { setScreen('login'); setTab('home'); }} />}
          </div>
          <BottomNav active={tab} onChange={(t) => { if (t === 'log') { setSheet(true); } else { setTab(t); } }} />
          <LogMealSheet open={sheet} onClose={() => setSheet(false)} onAdd={addMeal} />
        </React.Fragment>
      )}
    </div>
  );
}

function ProfileStub({ onLogout }) {
  const { Logo, Button, Card, StatBlock } = window.LaBase360DesignSystem_afe5db;
  return (
    <div style={{ padding: '26px 18px 96px', display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center' }}>
      <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--ls-surface2)', border: '1px solid var(--ls-border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ls-teal)', fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 22 }}>MR</div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-title)', textTransform: 'uppercase', color: 'var(--ls-text)', fontSize: 24 }}>Marie Rousseau</div>
        <div style={{ color: 'var(--ls-text-hint)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>Membre depuis mars 2026</div>
      </div>
      <Card tone="app" padding={18} style={{ width: '100%', display: 'flex', justifyContent: 'space-around' }}>
        <StatBlock label="Série" value="12" unit="j" accent="var(--ls-lime)" />
        <StatBlock label="Repas" value="284" accent="var(--ls-teal)" />
        <StatBlock label="XP" value="4 120" accent="var(--ls-purple)" />
      </Card>
      <div style={{ width: '100%', marginTop: 8 }}><Logo tone="dark" size={34} style={{ opacity: .5 }} /></div>
      <Button variant="secondary" pill style={{ width: '100%' }} onClick={onLogout}>Se déconnecter</Button>
    </div>
  );
}
window.App = App;
