import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Client, BodyScan } from '../../lib/types'
import { LorBadge } from '../../components/ui/LorBadge'
import { LorButton } from '../../components/ui/LorButton'
import { LorScoreBar } from '../../components/ui/LorScoreBar'

interface Stats {
  activeClients: number
  bilansThisMonth: number
  renewalsSoon: number
}

function SkeletonCard() {
  return (
    <div style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 24, animation: 'shimmer 1.5s ease-in-out infinite' }}>
      <div style={{ height: 12, width: '40%', background: 'rgba(255,255,255,0.06)', borderRadius: 6, marginBottom: 12 }} />
      <div style={{ height: 28, width: '60%', background: 'rgba(255,255,255,0.06)', borderRadius: 6 }} />
    </div>
  )
}

export function V2DashboardPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentClients, setRecentClients] = useState<Client[]>([])
  const [recentScans, setRecentScans] = useState<BodyScan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [clientsRes, bilansRes, scansRes] = await Promise.all([
          supabase.from('clients').select('*').order('created_at', { ascending: false }),
          supabase.from('bilans').select('id, created_at').gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
          supabase.from('body_scans').select('*').order('date', { ascending: false }).limit(3),
        ])
        const clients: Client[] = clientsRes.data || []
        setRecentClients(clients.slice(0, 5))
        setRecentScans(scansRes.data || [])
        setStats({
          activeClients: clients.filter(c => c.status === 'actif').length,
          bilansThisMonth: bilansRes.data?.length ?? 0,
          renewalsSoon: 0,
        })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const statCards = [
    { label: 'Clients actifs', value: stats?.activeClients ?? 0, color: '#2DD4BF' },
    { label: 'Bilans ce mois', value: stats?.bilansThisMonth ?? 0, color: '#C9A84C' },
    { label: 'Renouvellements', value: stats?.renewalsSoon ?? 0, color: '#FB7185' },
  ]

  return (
    <div style={{ padding: '32px 36px', fontFamily: 'DM Sans, sans-serif', maxWidth: 1100 }}>
      <style>{`@keyframes shimmer { 0%,100%{opacity:0.4} 50%{opacity:0.7} }`}</style>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ color: '#4A5068', fontSize: 12, marginBottom: 4 }}>Bonjour,</p>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 28, color: '#F0EDE8', letterSpacing: '-0.02em' }}>
          {profile?.full_name ?? 'Coach'} 👋
        </h1>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        {loading ? [1, 2, 3].map(i => <SkeletonCard key={i} />) : statCards.map(({ label, value, color }) => (
          <div key={label} style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 24 }}>
            <p style={{ color: '#7A8099', fontSize: 12, marginBottom: 8 }}>{label}</p>
            <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 32, color }}>{value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20 }}>
        {/* Clients récents */}
        <div style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: '#F0EDE8' }}>Clients récents</h2>
            <LorButton variant="ghost" size="sm" onClick={() => navigate('/v2/clients')}>Voir tout</LorButton>
          </div>
          {loading ? [1,2,3].map(i => <SkeletonCard key={i} />) : recentClients.length === 0 ? (
            <p style={{ color: '#4A5068', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>Aucun client pour l'instant</p>
          ) : recentClients.map(c => (
            <div key={c.id} onClick={() => navigate(`/v2/clients/${c.id}`)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(201,168,76,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C9A84C', fontWeight: 700, fontSize: 13 }}>
                  {c.first_name.charAt(0)}{c.last_name.charAt(0)}
                </div>
                <div>
                  <p style={{ color: '#F0EDE8', fontSize: 13, fontWeight: 600 }}>{c.first_name} {c.last_name}</p>
                  <p style={{ color: '#4A5068', fontSize: 11 }}>{c.objective ?? 'Aucun objectif'}</p>
                </div>
              </div>
              <LorBadge variant={c.status === 'actif' ? 'success' : c.status === 'pause' ? 'warning' : 'default'}>
                {c.status}
              </LorBadge>
            </div>
          ))}
        </div>

        {/* Derniers body scans */}
        <div style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 24 }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: '#F0EDE8', marginBottom: 20 }}>Derniers Body Scans</h2>
          {loading ? [1,2,3].map(i => <SkeletonCard key={i} />) : recentScans.length === 0 ? (
            <p style={{ color: '#4A5068', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>Aucun scan enregistré</p>
          ) : recentScans.map(s => (
            <div key={s.id} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <p style={{ color: '#7A8099', fontSize: 11, marginBottom: 10 }}>{new Date(s.date).toLocaleDateString('fr-FR')}</p>
              {s.fat_mass_percent != null && <LorScoreBar value={s.fat_mass_percent} max={50} color="#FB7185" label="Masse grasse" unit="%" />}
              {s.muscle_mass_kg != null && <div style={{ marginTop: 8 }}><LorScoreBar value={s.muscle_mass_kg} max={80} color="#2DD4BF" label="Masse musculaire" unit=" kg" /></div>}
              {s.water_percent != null && <div style={{ marginTop: 8 }}><LorScoreBar value={s.water_percent} max={100} color="#A78BFA" label="Hydratation" unit="%" /></div>}
            </div>
          ))}
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate('/v2/clients')}
        style={{ position: 'fixed', bottom: 32, right: 32, background: '#C9A84C', color: '#0B0D11', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 13, padding: '14px 22px', borderRadius: 12, border: 'none', cursor: 'pointer', boxShadow: '0 8px 24px rgba(201,168,76,0.3)' }}
      >
        + Nouveau client
      </button>
    </div>
  )
}
