import { NavLink, useLocation } from "react-router-dom"

const NAV_ITEMS = [
  {
    path: '/dashboard', label: 'Accueil',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
  },
  {
    path: '/clients', label: 'Clients',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  },
  {
    path: '/assessments/new', label: 'Bilan', primary: true,
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
  },
  {
    path: '/pv', label: 'Suivi PV',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  },
  {
    path: '/guide', label: 'Guide',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  },
]

export function BottomNav() {
  const location = useLocation()

  // Masquer pendant le bilan (plein écran)
  if (location.pathname.includes('/assessments/new')) return null

  return (
    <nav
      className="bottom-nav fixed bottom-0 left-0 right-0 z-50 lg:hidden"
      style={{
        background: 'var(--ls-sidebar-bg)',
        borderTop: '1px solid var(--ls-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        minHeight: 56,
        // iOS safe-area : bouton home indicator ne touche pas les labels
        padding: '6px 8px calc(6px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = location.pathname === item.path ||
          (item.path !== '/dashboard' && location.pathname.startsWith(item.path))

        if (item.primary) {
          return (
            <NavLink key={item.path} to={item.path} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, textDecoration: 'none', marginTop: -18 }}>
              <div className="bottom-nav-bilan-btn" style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--ls-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ls-bg)', boxShadow: '0 4px 14px rgba(201,168,76,0.35)' }}>
                <span className="bottom-nav-icon" style={{ display: 'inline-flex' }}>{item.icon}</span>
              </div>
              <span className="bottom-nav-label" style={{ fontSize: 10, color: 'var(--ls-gold)', fontFamily: 'Syne, sans-serif', fontWeight: 700, letterSpacing: '0.05em' }}>{item.label}</span>
            </NavLink>
          )
        }

        return (
          <NavLink key={item.path} to={item.path} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, textDecoration: 'none', minWidth: 48, color: isActive ? 'var(--ls-gold)' : 'var(--ls-text-hint)', transition: 'color 0.15s' }}>
            <span className="bottom-nav-icon" style={{ display: 'inline-flex' }}>{item.icon}</span>
            <span className="bottom-nav-label" style={{ fontSize: 10, fontFamily: 'DM Sans, sans-serif', fontWeight: isActive ? 500 : 400, letterSpacing: '0.05em' }}>{item.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}
