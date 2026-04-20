import { useEffect } from 'react'
import { useAppContext } from '../context/AppContext'
import { getSupabaseClient } from '../services/supabaseClient'
import { getPortfolioMetrics } from '../lib/portfolio'

const NOTIF_CHECK_KEY = 'lor-notif-last-check'
// Chantier push (2026-04-20) : check messages séparé du check quotidien,
// pour capturer les nouveaux messages à chaque ouverture de session.
const MESSAGES_LAST_SEEN_KEY = 'lor-notif-messages-last-seen'

export function useAutoNotifications() {
  const { currentUser, clients, followUps, prospects, clientMessages, users, pvClientProducts } = useAppContext()

  useEffect(() => {
    if (!currentUser) return
    if (!('Notification' in window) || Notification.permission !== 'granted') return

    // Max 1 check quotidien pour relances/réassorts/RDV < 1h
    const lastCheck = localStorage.getItem(NOTIF_CHECK_KEY)
    const now = new Date()
    const sameDayCheck = lastCheck && new Date(lastCheck).toDateString() === now.toDateString()
    if (!sameDayCheck) {
      localStorage.setItem(NOTIF_CHECK_KEY, now.toISOString())
      void sendDailyNotifications()
    }

    // Check messages à chaque ouverture — indépendant du check quotidien.
    void checkNewMessages()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, clientMessages.length])

  // Chantier push (2026-04-20) : notif pour les nouveaux messages client.
  // Approche pragmatique — sans trigger Postgres : on compare l'état actuel
  // des clientMessages avec le dernier `created_at` vu en localStorage. Tout
  // message NON LU créé APRÈS cette borne déclenche une notif locale.
  async function checkNewMessages() {
    if (!currentUser) return
    if (!('Notification' in window) || Notification.permission !== 'granted') return

    const myMessages = (clientMessages ?? []).filter(
      (m) => m.distributor_id === currentUser.id && !m.read
    )
    if (myMessages.length === 0) return

    const lastSeenRaw = localStorage.getItem(MESSAGES_LAST_SEEN_KEY)
    const lastSeen = lastSeenRaw ? new Date(lastSeenRaw).getTime() : 0

    const freshMessages = myMessages.filter((m) => {
      try {
        return new Date(m.created_at).getTime() > lastSeen
      } catch { return false }
    })
    if (freshMessages.length === 0) return

    // Notifie une fois, groupé — évite le spam si 10 messages arrivent d'un coup.
    const first = freshMessages[0]
    const title = freshMessages.length > 1
      ? `${freshMessages.length} nouveaux messages`
      : 'Nouveau message client'
    const body = first.client_name
      ? `De ${first.client_name}${first.product_name ? ` — ${first.product_name}` : ''}`
      : 'Ouvre la messagerie pour le lire.'

    await sendNotif(title, body, '/messages', 'message')

    // Avance la borne au timestamp le plus récent du batch pour éviter les doublons.
    const maxCreatedAt = freshMessages
      .map((m) => new Date(m.created_at).getTime())
      .reduce((max, t) => (t > max ? t : max), lastSeen)
    try {
      localStorage.setItem(MESSAGES_LAST_SEEN_KEY, new Date(maxCreatedAt).toISOString())
    } catch { /* quota */ }
  }

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

    // 2bis. RDV prospects du jour dans moins d'1h — Chantier Agenda unifié (2026-04-20)
    const prospectsBientot = (prospects ?? []).filter(p => {
      if (p.status !== 'scheduled') return false
      if (p.distributorId !== currentUser.id) return false
      const diff = new Date(p.rdvDate).getTime() - now.getTime()
      return diff > 0 && diff < 3600000
    })
    for (const p of prospectsBientot.slice(0, 2)) {
      await sendNotif(
        "RDV prospect dans moins d'1h",
        `${p.firstName} ${p.lastName}${p.phone ? ` · ${p.phone}` : ''}`,
        '/agenda?filter=today',
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
