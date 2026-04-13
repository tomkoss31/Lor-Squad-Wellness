import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const inp: React.CSSProperties = {
  background: '#1A1E27',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10,
  padding: '11px 14px',
  color: '#F0EDE8',
  fontSize: 13,
  fontFamily: 'DM Sans, sans-serif',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password.trim(),
      })
      if (error) { setError(error.message); return }
      navigate('/dashboard')
    } catch {
      setError('Connexion impossible. Vérifie tes identifiants.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0B0D11', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'DM Sans, sans-serif' }}>
      {/* Ambient glow */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: '10%', top: '-5%', width: 480, height: 480, borderRadius: '50%', background: 'rgba(201,168,76,0.06)', filter: 'blur(120px)' }} />
        <div style={{ position: 'absolute', bottom: '-10%', left: '5%', width: 400, height: 400, borderRadius: '50%', background: 'rgba(45,212,191,0.04)', filter: 'blur(100px)' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 960, width: '100%' }}>
        {/* Branding */}
        <div style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '48px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 40 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            <span style={{ display: 'inline-flex', padding: '6px 14px', borderRadius: 20, border: '1px solid rgba(201,168,76,0.2)', background: 'rgba(201,168,76,0.08)', color: '#C9A84C', fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', width: 'fit-content' }}>
              Lor'Squad Wellness
            </span>
            <div>
              <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 36, color: '#F0EDE8', lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 16 }}>
                Pilote tes bilans,<br />tes clients et<br />ton équipe.
              </h1>
              <p style={{ color: '#7A8099', fontSize: 14, lineHeight: 1.75 }}>Bilan guidé, body scan, suivi hebdomadaire et module PV — tout en un seul espace fluide.</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['Bilans guidés', 'Body Scan', 'Suivi client', 'Module PV'].map(tag => (
                <span key={tag} style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)', color: '#7A8099', fontSize: 12 }}>{tag}</span>
              ))}
            </div>
          </div>
          <p style={{ color: '#4A5068', fontSize: 11, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 24 }}>© 2025 Lor'Squad Wellness — Espace coach</p>
        </div>

        {/* Form */}
        <div style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '48px 40px' }}>
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: 12 }}>Connexion</p>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 26, color: '#F0EDE8', letterSpacing: '-0.02em', marginBottom: 8 }}>Accède à ton espace.</h2>
            <p style={{ color: '#7A8099', fontSize: 13, lineHeight: 1.7 }}>Retrouve tes clients, bilans et suivis en quelques secondes.</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7A8099' }}>Identifiant</label>
              <input
                type="email"
                placeholder="E-mail professionnel"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="username"
                style={inp}
                onFocus={e => (e.target.style.borderColor = 'rgba(201,168,76,0.5)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7A8099' }}>Mot de passe</label>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Mot de passe"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                style={inp}
                onFocus={e => (e.target.style.borderColor = 'rgba(201,168,76,0.5)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
              />
              <button type="button" onClick={() => setShowPassword(v => !v)} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#4A5068', fontSize: 11, cursor: 'pointer' }}>
                {showPassword ? 'Masquer' : 'Afficher'} le mot de passe
              </button>
            </div>

            {error && (
              <div style={{ background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.2)', borderRadius: 10, padding: '10px 14px', color: '#FB7185', fontSize: 13 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                background: '#C9A84C',
                color: '#0B0D11',
                border: 'none',
                borderRadius: 10,
                padding: '12px 20px',
                fontFamily: 'Syne, sans-serif',
                fontSize: 14,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {loading && (
                <span style={{ width: 14, height: 14, border: '2px solid rgba(11,13,17,0.3)', borderTop: '2px solid #0B0D11', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
              )}
              Ouvrir mon espace
            </button>
          </form>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
