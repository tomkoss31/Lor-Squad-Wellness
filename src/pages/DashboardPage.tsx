import { useMemo, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import { getPortfolioMetrics } from '../lib/portfolio'
import { PvDismissAlert } from '../components/dashboard/PvDismissAlert'
import { Link as RouterLink } from 'react-router-dom'
import { UrgencyColumn } from '../components/dashboard/UrgencyColumn'

const IconUrgent = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
)
const IconPlanned = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
)
const IconWatch = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
)

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bonjour'
  if (h < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

export function DashboardPage() {
  const { currentUser, users, clients, followUps, pvClientProducts, unreadMessageCount, updateFollowUpStatus } = useAppContext()
  const [showPasswordNotice, setShowPasswordNotice] = useState(false)

  if (!currentUser) return null

  useEffect(() => {
    if (currentUser.role === "admin" || typeof window === "undefined") { setShowPasswordNotice(false); return }
    const key = `lor-squad-password-notice-dismissed-${currentUser.id}`
    setShowPasswordNotice(window.localStorage.getItem(key) !== "true")
  }, [currentUser.id, currentUser.role])

  const metrics = getPortfolioMetrics(currentUser, clients, followUps, users, 'personal')

  const relances = useMemo(() =>
    [...metrics.relanceFollowUps].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).slice(0, 4)
  , [metrics.relanceFollowUps])

  const planifies = useMemo(() =>
    [...metrics.scheduledFollowUps].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).slice(0, 4)
  , [metrics.scheduledFollowUps])

  const surveiller = useMemo(() => {
    const relanceIds = new Set(metrics.relanceFollowUps.map(f => f.id))
    return metrics.scheduledFollowUps.filter(f => !relanceIds.has(f.id)).slice(0, 4)
  }, [metrics])

  // PV alerts — produits expirés (startDate + durationReferenceDays < now)
  const pvAlerts = useMemo(() => {
    if (!pvClientProducts) return []
    const now = new Date()
    return pvClientProducts
      .filter(p => {
        if (!p.active) return false
        const endDate = new Date(p.startDate)
        endDate.setDate(endDate.getDate() + p.durationReferenceDays)
        return endDate < now
      })
      .map(p => {
        const client = clients.find(c => c.id === p.clientId)
        const endDate = new Date(p.startDate)
        endDate.setDate(endDate.getDate() + p.durationReferenceDays)
        const overdueDays = Math.floor((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24))
        return {
          id: `${p.clientId}-${p.id}`,
          name: client ? `${client.firstName} ${client.lastName}` : 'Client inconnu',
          program: p.productName,
          overdueDays,
        }
      })
      .slice(0, 5)
  }, [pvClientProducts, clients])

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div style={{ padding: 'clamp(16px, 4vw, 28px)', maxWidth: 1200, margin: '0 auto' }}>

      {/* Header */}
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 className="dashboard-greeting" style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 800, color: 'var(--ls-text)', margin: '0 0 6px', letterSpacing: '-0.3px' }}>
            {greeting()}, {currentUser.name?.split(' ')[0]} ✦
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#2DD4BF', boxShadow: '0 0 0 3px rgba(45,212,191,0.2)', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--ls-text-muted)', textTransform: 'capitalize' }}>{today} — Vos priorités du jour</span>
          </div>
        </div>
        <Link className="dashboard-cta" to="/assessments/new" style={{ background: '#C9A84C', color: '#0B0D11', borderRadius: 10, padding: '11px 20px', fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nouveau bilan
        </Link>
      </div>

      {/* Password notice */}
      {showPasswordNotice && (
        <div style={{ background: 'var(--ls-surface)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 16, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ls-text)', margin: 0 }}>Mot de passe initial</p>
            <p style={{ fontSize: 12, color: 'var(--ls-text-muted)', margin: '4px 0 0' }}>Défini par un admin. Contacte ton sponsor pour le modifier.</p>
          </div>
          <button onClick={() => { localStorage.setItem(`lor-squad-password-notice-dismissed-${currentUser.id}`, "true"); setShowPasswordNotice(false) }}
            style={{ fontSize: 12, color: 'var(--ls-text-muted)', background: 'rgba(128,128,128,0.06)', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', flexShrink: 0 }}>Compris</button>
        </div>
      )}

      {/* Messages clients — lien vers page dédiée */}
      {(unreadMessageCount ?? 0) > 0 && (
        <RouterLink to="/messages" style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--ls-surface)', border: '1px solid rgba(124,58,237,0.2)',
          borderLeft: '3px solid var(--ls-purple)', borderRadius: '0 12px 12px 0',
          padding: '12px 16px', textDecoration: 'none', marginBottom: 4,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ls-purple)" strokeWidth="1.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ls-text)' }}>
            {unreadMessageCount} message{unreadMessageCount > 1 ? 's' : ''} non lu{unreadMessageCount > 1 ? 's' : ''}
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ls-purple)', fontWeight: 500 }}>Voir →</span>
        </RouterLink>
      )}

      {/* PV Alerts */}
      {pvAlerts.length > 0 && <PvDismissAlert clients={pvAlerts} />}

      {/* 3 Colonnes urgence */}
      <div className="dashboard-cols" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 16 }}>
        <UrgencyColumn title="Urgent" count={metrics.relanceFollowUps.length} color="#FB7185" icon={<IconUrgent />} items={relances} emptyLabel="Aucune relance en attente"
          seeAllLink={`/distributors/${currentUser.id}`} seeAllCount={Math.max(0, metrics.relanceFollowUps.length - 4)}
          onMarkContacted={(item) => void updateFollowUpStatus(item.id, 'completed')}
          onDismiss={(item) => void updateFollowUpStatus(item.id, 'dismissed')}
        />
        <UrgencyColumn title="Planifiés" count={metrics.scheduledFollowUps.length} color="#2DD4BF" icon={<IconPlanned />} items={planifies} emptyLabel="Aucun RDV planifié"
          seeAllLink={`/distributors/${currentUser.id}`} seeAllCount={Math.max(0, metrics.scheduledFollowUps.length - 4)}
          onMarkContacted={(item) => void updateFollowUpStatus(item.id, 'completed')}
          onDismiss={(item) => void updateFollowUpStatus(item.id, 'dismissed')}
        />
        <UrgencyColumn title="À surveiller" count={metrics.clients.length} color="#A78BFA" icon={<IconWatch />} items={surveiller} emptyLabel="Aucun dossier à surveiller"
          seeAllLink="/clients" seeAllCount={Math.max(0, metrics.clients.length - 4)}
          onMarkContacted={(item) => void updateFollowUpStatus(item.id, 'completed')}
          onDismiss={(item) => void updateFollowUpStatus(item.id, 'dismissed')}
        />
      </div>
    </div>
  )
}
