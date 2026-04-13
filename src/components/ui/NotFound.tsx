import { useNavigate } from 'react-router-dom'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div style={{ background: '#0B0D11', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ textAlign: 'center', padding: 32 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 80, fontWeight: 800, color: 'rgba(201,168,76,0.15)', lineHeight: 1, marginBottom: 16 }}>404</div>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700, color: '#F0EDE8', margin: '0 0 10px' }}>Page introuvable</h2>
        <p style={{ fontSize: 13, color: '#7A8099', margin: '0 0 28px' }}>Cette page n'existe pas ou a été déplacée.</p>
        <button onClick={() => navigate('/dashboard')} style={{ background: '#C9A84C', color: '#0B0D11', border: 'none', borderRadius: 10, padding: '12px 24px', fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Retour au dashboard</button>
      </div>
    </div>
  )
}
