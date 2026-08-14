// BottomNav — La Base 360 app tab bar.
const { Icon } = window.LaBase360DesignSystem_afe5db;

function BottomNav({ active, onChange }) {
  const tabs = [
    { id: 'home', icon: 'house', label: 'Accueil' },
    { id: 'log', icon: 'utensils', label: 'Repas' },
    { id: 'club', icon: 'users', label: 'Club' },
    { id: 'profile', icon: 'user', label: 'Profil' },
  ];
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 72,
      background: 'rgba(22,38,36,.92)', backdropFilter: 'blur(12px)',
      borderTop: '1px solid var(--ls-border)', display: 'flex',
      paddingBottom: 8, alignItems: 'stretch' }}>
      {tabs.map(t => {
        const on = active === t.id;
        return (
          <button key={t.id} onClick={() => onChange(t.id)} style={{
            flex: 1, background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5,
            color: on ? 'var(--ls-teal)' : 'var(--ls-text-hint)',
            fontFamily: 'var(--font-body)', fontSize: 10.5, fontWeight: 600,
          }}>
            <Icon name={t.icon} size={22} strokeWidth={on ? 2.4 : 2} />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
window.BottomNav = BottomNav;
