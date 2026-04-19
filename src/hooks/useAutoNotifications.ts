import { useEffect } from 'react'
import { useAppContext } from '../context/AppContext'
import { getSupabaseClient } from '../services/supabaseClient'
import { getPortfolioMetrics } from '../lib/portfolio'

const NOTIF_CHECK_KEY = 'lor-notif-last-check'

export function useAutoNotifications() {
  const { currentUser, clients, followUps, users, pvClientProducts } = useAppContext()

  useEffect(() => {
    if (!currentUser) return
    if (!('Notification' in window) || Notification.permission !== 'granted') return

    // Max 1 check par jour
    const lastCheck = localStorage.getItem(NOTIF_CHECK_KEY)
    const now = new Date()
    if (lastCheck && new Date(lastCheck).toDateString() === now.toDateString()) return

    localStorage.setItem(NOTIF_CHECK_KEY, now.toISOString())
    void sendDailyNotifications()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id])

  async function sendNotif(title: string, body: string, url: string, type: string) {
    if (!currentUser) return
    try {
      const sb = await getSupabaseClient()
      if (sb) {
        await sb.functions.invoke('send-push', {
          body: { user_id: currentUser.id, title, body, url, type }
        })
      }
    } catch {
      // Edge function pas encore déployée — fallback notif locale
      if ('serviceWorker' in navigator) {
        try {
          const reg = await navigator.serviceWorker.ready
          await reg.showNotification(title, {
            body,
            icon: '/icons/lor-squad-icon-192.png',
            tag: `lor-${type}-${Date.now()}`,
            data: { url },
          })
        } catch { /* silently continue */ }
      }
    }
  }

  async function sendDailyNotifications() {
    if (!currentUser) return
    const metrics = getPortfolioMetrics(currentUser, clients, followUps, users, 'personal')
    const now = new Date()

    // Lifecycle filter — on exclut les clients morts/en pause ET les clients
    // en suivi libre (Sujet C) des notifs auto.
    const deadOrPausedIds = new Set(
      metrics.clients
        .filter((c) =>
          c.lifecycleStatus === 'stopped'
          || c.lifecycleStatus === 'lost'
          || c.lifecycleStatus === 'paused'
          || c.freeFollowUp === true
        )
        .map((c) => c.id)
    )

    // 1. Relances en retard (exclut clients morts/pause)
    const retards = (metrics.relanceFollowUps ?? []).filter((f) => !deadOrPausedIds.has(f.clientId)).length
    if (retards > 0) {
      await sendNotif(
        `${retards} relance${retards > 1 ? 's' : ''} en attente`,
        'Des clients attendent votre contact.',
        '/dashboard',
        'relance'
      )
    }

    // 2. RDV du jour dans moins d'1h (exclut clients morts/pause)
    const bientot = (metrics.scheduledFollowUps ?? []).filter(f => {
      if (deadOrPausedIds.has(f.clientId)) return false
      const diff = new Date(f.dueDate).getTime() - now.getTime()
      return diff > 0 && diff < 3600000
    })
    for (const rdv of bientot.slice(0, 2)) {
      await sendNotif(
        "RDV dans moins d'1h",
        rdv.clientName,
        `/clients/${rdv.clientId}`,
        'urgent'
      )
    }

    // 3. Réassorts PV dépassés (exclut clients morts/pause)
    if (pvClientProducts) {
      const depasses = pvClientProducts.filter(p => {
        if (deadOrPausedIds.has(p.clientId)) return false
        if (!p.startDate || !p.durationReferenceDays || !p.active) return false
        const end = new Date(p.startDate)
        end.setDate(end.getDate() + p.durationReferenceDays)
        return end < now
      })
      if (depasses.length > 0) {
        await sendNotif(
          `${depasses.length} réassort${depasses.length > 1 ? 's' : ''} dépassé${depasses.length > 1 ? 's' : ''}`,
          'Vérifiez les commandes de vos clients.',
          '/pv',
          'pv'
        )
      }
    }
  }
}
