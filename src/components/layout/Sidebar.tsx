import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: 'grid' },
  { path: '/clients', label: 'Mes clients', icon: 'users' },
  { path: '/recommandations', label: 'Recommandations', icon: 'star' },
  { path: '/suivi-pv', label: 'Suivi PV', icon: 'trending', soon: true },
]

function Icon({ name }: { name: string }) {
  const icons: Record<string, JSX.Element> = {
    grid: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
    users: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    star: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    trending: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
    logout: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  }
  return icons[name] || null
}

export default function Sidebar() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'CO'

  return (
    <aside style={{
      width: 220,
      minHeight: '100vh',
      background: '#13161C',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 16px',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36 }}>
        <div style={{
          width: 34, height: 34,
          background: '#C9A84C',
          borderRadius: 9,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#0B0D11"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        </div>
        <div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 14, color: '#F0EDE8', letterSpacing: '-0.2px', lineHeight: 1.2 }}>
            Lor'<span style={{ color: '#C9A84C' }}>Squad</span>
          </div>
          <div style={{ fontSize: 10, color: '#4A5068', letterSpacing: '0.5px' }}>Wellness</div>
        </div>
      </div>

      {/* Nav label */}
      <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '1.5px', color: '#4A5068', textTransform: 'uppercase', padding: '0 12px', marginBottom: 8 }}>
        Navigation
      </div>

      {/* Nav items */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 8,
              fontSize: 13.5,
              fontFamily: 'DM Sans, sans-serif',
              textDecoration: 'none',
              transition: 'all 0.15s',
              color: isActive ? '#F0EDE8' : '#7A8099',
              background: isActive ? 'rgba(201,168,76,0.1)' : 'transparent',
              borderLeft: isActive ? '2px solid #C9A84C' : '2px solid transparent',
              marginLeft: -2,
            })}
          >
            <Icon name={item.icon} />
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.soon && (
              <span style={{ fontSize: 9, background: 'rgba(201,168,76,0.15)', color: '#C9A84C', padding: '2px 7px', borderRadius: 20, fontWeight: 500 }}>
                Bientôt
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Profil + déconnexion */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', marginBottom: 4 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'linear-gradient(135deg, #C9A84C, #2DD4BF)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: '#0B0D11', flexShrink: 0,
          }}>
            {initials}
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#F0EDE8', fontWeight: 500 }}>{profile?.full_name || 'Coach'}</div>
            <div style={{ fontSize: 10, color: '#4A5068' }}>{profile?.role === 'admin' ? 'Administrateur' : 'Coach'}</div>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px', borderRadius: 8, border: 'none',
            background: 'transparent', color: '#7A8099', fontSize: 13,
            fontFamily: 'DM Sans, sans-serif', cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#FB7185'; e.currentTarget.style.background = 'rgba(251,113,133,0.05)' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#7A8099'; e.currentTarget.style.background = 'transparent' }}
        >
          <Icon name="logout" />
          Déconnexion
        </button>
      </div>
    </aside>
  )
}
