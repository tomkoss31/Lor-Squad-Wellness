// LogMealSheet — bottom sheet to log a meal.
const { Button, Icon, Badge } = window.LaBase360DesignSystem_afe5db;

function LogMealSheet({ open, onClose, onAdd }) {
  const options = [
    { name: 'Bowl petit-déjeuner', kcal: 420, icon: 'sunrise', tag: 'Petit-déj' },
    { name: 'Salade poulet quinoa', kcal: 540, icon: 'salad', tag: 'Déjeuner' },
    { name: 'Shake protéiné', kcal: 210, icon: 'cup-soda', tag: 'Collation' },
    { name: 'Saumon légumes', kcal: 610, icon: 'fish', tag: 'Dîner' },
  ];
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 20, pointerEvents: open ? 'auto' : 'none' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(11,20,18,.6)', opacity: open ? 1 : 0, transition: 'opacity var(--dur-base) var(--ease-standard)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0,
        background: 'var(--ls-surface)', borderTopLeftRadius: 22, borderTopRightRadius: 22,
        border: '1px solid var(--ls-border2)', padding: '14px 18px 26px',
        transform: open ? 'translateY(0)' : 'translateY(102%)',
        transition: 'transform var(--dur-slow) var(--ease-standard)' }}>
        <div style={{ width: 40, height: 4, borderRadius: 999, background: 'var(--ls-border2)', margin: '0 auto 16px' }} />
        <h2 style={{ fontFamily: 'var(--font-title)', textTransform: 'uppercase', color: 'var(--ls-text)', fontSize: 22, margin: '0 0 14px', letterSpacing: '.01em' }}>Ajouter un repas</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {options.map((o, i) => (
            <button key={i} onClick={() => onAdd(o)} style={{
              display: 'flex', alignItems: 'center', gap: 13, textAlign: 'left', cursor: 'pointer',
              background: 'var(--ls-surface2)', border: '1px solid var(--ls-border)',
              borderRadius: 'var(--ls-radius)', padding: '12px 14px', color: 'var(--ls-text)', fontFamily: 'var(--font-body)' }}>
              <div style={{ width: 40, height: 40, borderRadius: 'var(--ls-radius)', background: 'var(--ls-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ls-teal)' }}><Icon name={o.icon} size={20} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{o.name}</div>
                <div style={{ marginTop: 4 }}><Badge tone="sage">{o.tag}</Badge></div>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ls-text-muted)', fontSize: 14 }}>{o.kcal} kcal</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
window.LogMealSheet = LogMealSheet;
