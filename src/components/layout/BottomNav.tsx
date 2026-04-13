import { NavLink, useLocation } from "react-router-dom"

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Accueil', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
  )},
  { path: '/clients', label: 'Clients', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  )},
  { path: '/assessments/new', label: 'Bilan', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
  ), highlight: true },
  { path: '/pv', label: 'PV', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
  )},
  { path: '/guide', label: 'Guide', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
  )},
]

export function BottomNav() {
  const location = useLocation()

  return (
    <nav
      className="xl:hidden"
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(19,22,28,0.95)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '6px 8px env(safe-area-inset-bottom, 8px)',
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      }}
    >
      {NAV_ITEMS.map(item => {
        const isActive = location.pathname === item.path ||
          (item.path === '/clients' && location.pathname.startsWith('/clients/')) ||
          (item.path === '/pv' && location.pathname.startsWith('/pv'))

        return (
          <NavLink
            key={item.path}
            to={item.path}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              padding: '6px 12px', borderRadius: 12, textDecoration: 'none',
              color: isActive ? '#C9A84C' : '#4A5068',
              transition: 'all 0.15s',
              ...(item.highlight && !isActive ? {
                background: 'rgba(201,168,76,0.1)',
                color: '#C9A84C',
                borderRadius: '50%',
                width: 48, height: 48,
                justifyContent: 'center',
                padding: 0,
              } : {}),
            }}
          >
            {item.highlight && !isActive ? (
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: '#C9A84C', color: '#0B0D11',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {item.icon}
              </div>
            ) : (
              <>
                {item.icon}
                <span style={{ fontSize: 9, fontWeight: isActive ? 600 : 400, letterSpacing: '0.02em' }}>{item.label}</span>
              </>
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}
