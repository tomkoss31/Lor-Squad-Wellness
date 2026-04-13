import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { blasonLogo } from '../../data/visualContent'

const navItems = [
  { to: '/v2/dashboard', label: 'Dashboard', icon: '⊞' },
  { to: '/v2/clients', label: 'Clients', icon: '👥' },
  { to: '/v2/recommandations', label: 'Recommandations', icon: '✦' },
  { to: '/v2/suivi-pv', label: 'Suivi PV', icon: '◈' },
]

export function LorSidebar() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/v2/login')
  }

  return (
    <aside style={{
      width: 220,
      minHeight: '100vh',
      background: '#13161C',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 40,
    }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src={blasonLogo} alt="Lor'Squad" style={{ width: 32, height: 32, borderRadius: 8 }} />
          <div>
            <p style={{ color: '#F0EDE8', fontSize: 13, fontWeight: 700, fontFamily: 'Syne, sans-serif', lineHeight: 1.2 }}>Lor'Squad</p>
            <p style={{ color: '#4A5068', fontSize: 10, fontFamily: 'DM Sans, sans-serif' }}>Wellness</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {navItems.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 12px',
              borderRadius: 8,
              textDecoration: 'none',
              fontSize: 13,
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 500,
              transition: 'all 0.15s',
              background: isActive ? 'rgba(201,168,76,0.1)' : 'transparent',
              borderLeft: isActive ? '2px solid #C9A84C' : '2px solid transparent',
              color: isActive ? '#F0EDE8' : '#7A8099',
            })}
          >
            <span style={{ fontSize: 15 }}>{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(201,168,76,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#C9A84C', fontSize: 12, fontWeight: 700, fontFamily: 'Syne, sans-serif',
          }}>
            {profile?.full_name?.charAt(0)?.toUpperCase() ?? 'C'}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <p style={{ color: '#F0EDE8', fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {profile?.full_name ?? 'Coach'}
            </p>
            <p style={{ color: '#4A5068', fontSize: 10, fontFamily: 'DM Sans, sans-serif' }}>{profile?.role ?? 'coach'}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          style={{
            width: '100%', padding: '8px 12px', borderRadius: 8,
            background: 'transparent', border: '1px solid rgba(255,255,255,0.07)',
            color: '#7A8099', fontSize: 12, fontFamily: 'DM Sans, sans-serif',
            cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#FB7185')}
          onMouseLeave={e => (e.currentTarget.style.color = '#7A8099')}
        >
          ↩ Déconnexion
        </button>
      </div>
    </aside>
  )
}
