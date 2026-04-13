import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Client, BodyScan } from '../lib/types'

interface DashStats {
  totalClients: number
  bilansThisMonth: number
  upcomingRenewals: number
  activeClients: number
  suiviRate: number
}

function StatCard({ label, value, color, sub }: { label: string; value: string | number; color: string; sub: string }) {
  return (
    <div style={{
      background: '#13161C',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 12,
      padding: 20,
      borderTop: `2px solid ${color}`,
      flex: 1,
    }}>
      <div style={{ fontSize: 11, color: '#7A8099', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 10 }}>{label}</div>
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 30, fontWeight: 700, color, lineHeight: 1, marginBottom: 6 }}>{value}</div>
      <div style={{ fontSize: 11, color: '#4A5068' }}>{sub}</div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 20, flex: 1 }}>
      {[60, 40, 80].map((w, i) => (
        <div key={i} style={{ height: i === 1 ? 30 : 12, width: `${w}%`, background: 'rgba(255,255,255,0.05)', borderRadius: 4, marginBottom: 10, animation: 'shimmer 1.5s ease-in-out infinite' }} />
      ))}
    </div>
  )
}

function ScoreBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div style={{ flex: 1, height: 4, background: '#1A1E27', borderRadius: 2, overflow: 'hidden', margin: '0 12px' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.6s ease' }} />
    </div>
  )
}

export default function DashboardPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashStats | null>(null)
  const [recentClients, setRecentClients] = useState<Client[]>([])
  const [recentScans, setRecentScans] = useState<BodyScan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    try {
      setLoading(true)
      const now = new Date()
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

      const [clientsRes, bilansRes, renewalsRes, scansRes, suivisRes] = await Promise.all([
        supabase.from('clients').select('*').order('created_at', { ascending: false }),
        supabase.from('bilans').select('id, client_id').gte('created_at', firstOfMonth),
        supabase.from('client_produits').select('id').lte('expected_end_date', in7days).eq('status', 'actif'),
        supabase.from('body_scans').select('*, clients(first_name, last_name)').order('created_at', { ascending: false }).limit(3),
        supabase.from('suivis').select('client_id').gte('created_at', last30),
      ])

      if (clientsRes.error) throw clientsRes.error

      const clients = clientsRes.data || []
      const activeClients = clients.filter(c => c.status === 'actif')
      const suiviClientIds = new Set((suivisRes.data || []).map((s: { client_id: string }) => s.client_id))
      const suiviRate = activeClients.length > 0
        ? Math.round((suiviClientIds.size / activeClients.length) * 100)
        : 0

      setStats({
        totalClients: clients.length,
        activeClients: activeClients.length,
        bilansThisMonth: bilansRes.data?.length || 0,
        upcomingRenewals: renewalsRes.data?.length || 0,
        suiviRate,
      })
      setRecentClients(clients.slice(0, 5))
      setRecentScans(scansRes.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Bonjour'
    if (h < 18) return 'Bon après-midi'
    return 'Bonsoir'
  }

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
      <style>{`
        @keyframes shimmer { 0%,100% { opacity: 0.4 } 50% { opacity: 0.7 } }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 800, color: '#F0EDE8', margin: '0 0 6px', letterSpacing: '-0.3px' }}>
            {greeting()}, {profile?.full_name?.split(' ')[0] || 'Coach'} ✦
          </h1>
          <p style={{ fontSize: 13, color: '#7A8099', margin: 0, textTransform: 'capitalize' }}>{today}</p>
        </div>
        <button
          onClick={() => navigate('/clients')}
          style={{
            background: '#C9A84C', color: '#0B0D11', border: 'none',
            borderRadius: 10, padding: '11px 20px',
            fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nouveau client
        </button>
      </div>

      {/* Erreur */}
      {error && (
        <div style={{ background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.2)', borderRadius: 10, padding: '12px 16px', color: '#FB7185', fontSize: 13, marginBottom: 24 }}>
          {error}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
        {loading ? (
          [1,2,3,4].map(i => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard label="Clients actifs" value={stats?.activeClients || 0} color="#C9A84C" sub={`${stats?.totalClients || 0} au total`} />
            <StatCard label="Bilans ce mois" value={stats?.bilansThisMonth || 0} color="#2DD4BF" sub="Réalisés" />
            <StatCard label="Taux de suivi" value={`${stats?.suiviRate || 0}%`} color="#A78BFA" sub="Clients suivis ce mois" />
            <StatCard label="Renouvellements" value={stats?.upcomingRenewals || 0} color="#FB7185" sub="Dans les 7 jours" />
          </>
        )}
      </div>

      {/* Grille clients + scans */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Clients récents */}
        <div style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: '#F0EDE8', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#C9A84C', display: 'inline-block' }} />
              Clients récents
            </div>
            <button onClick={() => navigate('/clients')} style={{ fontSize: 12, color: '#C9A84C', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              Voir tous →
            </button>
          </div>

          {loading ? (
            [1,2,3].map(i => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', animation: 'shimmer 1.5s infinite', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: 12, width: '60%', background: 'rgba(255,255,255,0.05)', borderRadius: 4, marginBottom: 6, animation: 'shimmer 1.5s infinite' }} />
                  <div style={{ height: 10, width: '40%', background: 'rgba(255,255,255,0.05)', borderRadius: 4, animation: 'shimmer 1.5s infinite' }} />
                </div>
              </div>
            ))
          ) : recentClients.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#4A5068', fontSize: 13 }}>
              Aucun client pour l'instant
            </div>
          ) : (
            recentClients.map((client, i) => {
              const initials = `${client.first_name[0]}${client.last_name[0]}`.toUpperCase()
              const colors = ['#C9A84C', '#2DD4BF', '#A78BFA', '#FB7185', '#F0C96A']
              const color = colors[i % colors.length]
              const statusColors: Record<string, string> = { actif: '#2DD4BF', inactif: '#7A8099', pause: '#C9A84C' }
              return (
                <div
                  key={client.id}
                  onClick={() => navigate(`/clients/${client.id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${color}20`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#F0EDE8' }}>{client.first_name} {client.last_name}</div>
                    <div style={{ fontSize: 11, color: '#7A8099', marginTop: 2 }}>{client.objective || 'Objectif non défini'}</div>
                  </div>
                  <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: `${statusColors[client.status]}15`, color: statusColors[client.status], fontWeight: 500 }}>
                    {client.status}
                  </span>
                </div>
              )
            })
          )}
        </div>

        {/* Derniers body scans */}
        <div style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 22 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: '#F0EDE8', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2DD4BF', display: 'inline-block' }} />
            Derniers body scans
          </div>

          {loading ? (
            [1,2,3].map(i => (
              <div key={i} style={{ padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {[1,2,3].map(j => (
                  <div key={j} style={{ height: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 4, marginBottom: 8, animation: 'shimmer 1.5s infinite', width: j === 2 ? '80%' : '100%' }} />
                ))}
              </div>
            ))
          ) : recentScans.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#4A5068', fontSize: 13 }}>
              Aucun body scan enregistré
            </div>
          ) : (
            recentScans.map(scan => {
              const scanAny = scan as unknown as { clients?: { first_name: string; last_name: string } }
              const clientName = scanAny.clients
                ? `${scanAny.clients.first_name} ${scanAny.clients.last_name}`
                : 'Client inconnu'
              return (
              <div key={scan.id} style={{ padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#F0EDE8' }}>{clientName}</span>
                  <span style={{ fontSize: 12, color: '#7A8099' }}>
                    {new Date(scan.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                {scan.fat_mass_percent !== undefined && (
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: '#7A8099', width: 100 }}>Masse grasse</span>
                    <ScoreBar value={scan.fat_mass_percent} max={50} color="#FB7185" />
                    <span style={{ fontSize: 12, color: '#F0EDE8', fontWeight: 500, width: 45, textAlign: 'right' }}>{scan.fat_mass_percent}%</span>
                  </div>
                )}
                {scan.muscle_mass_kg !== undefined && (
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: '#7A8099', width: 100 }}>Masse musc.</span>
                    <ScoreBar value={scan.muscle_mass_kg} max={80} color="#2DD4BF" />
                    <span style={{ fontSize: 12, color: '#F0EDE8', fontWeight: 500, width: 45, textAlign: 'right' }}>{scan.muscle_mass_kg} kg</span>
                  </div>
                )}
                {scan.water_percent !== undefined && (
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#7A8099', width: 100 }}>Hydratation</span>
                    <ScoreBar value={scan.water_percent} max={100} color="#A78BFA" />
                    <span style={{ fontSize: 12, color: '#F0EDE8', fontWeight: 500, width: 45, textAlign: 'right' }}>{scan.water_percent}%</span>
                  </div>
                )}
              </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
