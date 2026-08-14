// HomeScreen — La Base 360 client dashboard. Composes DS primitives.
const DS = window.LaBase360DesignSystem_afe5db;

function HomeScreen({ onLogMeal, meals }) {
  const { Card, StatBlock, Badge, Button, Icon, EyebrowPill } = DS;
  const ring = (pct, color) => (
    <svg viewBox="0 0 120 120" style={{ width: 96, height: 96 }}>
      <circle cx="60" cy="60" r="52" fill="none" stroke="var(--ls-surface2)" strokeWidth="12" />
      <circle cx="60" cy="60" r="52" fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
        strokeDasharray={2 * Math.PI * 52} strokeDashoffset={2 * Math.PI * 52 * (1 - pct)}
        transform="rotate(-90 60 60)" />
    </svg>
  );
  return (
    <div style={{ padding: '20px 18px 96px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--ls-text-hint)' }}>Mardi 9 août</div>
          <h1 style={{ fontFamily: 'var(--font-title)', textTransform: 'uppercase', color: 'var(--ls-text)', fontSize: 28, letterSpacing: '.01em', margin: '4px 0 0' }}>Salut, Marie</h1>
        </div>
        <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--ls-surface2)', border: '1px solid var(--ls-border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ls-teal)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>MR</div>
      </div>

      <Card tone="app" padding={20}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {ring(0.72, 'var(--ls-teal)')}
            <div style={{ position: 'absolute', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 600, color: 'var(--ls-text)' }}>72%</div>
              <div style={{ fontSize: 10, color: 'var(--ls-text-hint)' }}>objectif</div>
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <StatBlock label="Calories" value="1 248" unit="/ 1 800 kcal" />
            <div style={{ display: 'flex', gap: 20 }}>
              <StatBlock label="Protéines" value="86" unit="g" accent="var(--ls-teal)" />
              <StatBlock label="Eau" value="1,4" unit="L" accent="var(--ls-sage)" />
            </div>
          </div>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Card tone="app" accent="var(--ls-lime)" padding={16}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <StatBlock label="Série" value="12" unit="jours" accent="var(--ls-lime)" />
            <Icon name="flame" color="var(--ls-lime)" size={26} />
          </div>
          <div style={{ marginTop: 10 }}><Badge tone="lime" variant="solid">Record perso</Badge></div>
        </Card>
        <Card tone="app" padding={16}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <StatBlock label="Rituel" value="3/4" accent="var(--ls-purple)" />
            <Icon name="sunrise" color="var(--ls-purple)" size={26} />
          </div>
          <div style={{ marginTop: 10 }}><Badge tone="purple">Petit-déj fait</Badge></div>
        </Card>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        <EyebrowPill tone="app">Aujourd'hui</EyebrowPill>
        <Button variant="outline" size="sm" iconLeft={<Icon name="plus" size={15} />} onClick={onLogMeal}>Ajouter</Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {meals.map((m, i) => (
          <Card key={i} tone="app" padding={14}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <div style={{ width: 40, height: 40, borderRadius: 'var(--ls-radius)', background: 'var(--ls-surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ls-teal)' }}><Icon name={m.icon} size={20} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ color: 'var(--ls-text)', fontWeight: 600, fontSize: 15 }}>{m.name}</div>
                <div style={{ color: 'var(--ls-text-hint)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>{m.time}</div>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--ls-text-muted)', fontSize: 14 }}>{m.kcal} kcal</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
window.HomeScreen = HomeScreen;
