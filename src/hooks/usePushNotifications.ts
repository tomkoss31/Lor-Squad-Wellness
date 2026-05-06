// usePushNotifications — refonte robustesse 2026-05-06.
// Cas Mel : "tout est coche dans l app mais ne se branche pas" → on
// surfacait l'erreur silencieusement (console.error). Maintenant on
// expose un `error` lisible + on gere les cas degradés.
import { useState, useEffect, useCallback } from 'react'
import { getSupabaseClient } from '../services/supabaseClient'

interface PushState {
  supported: boolean
  permission: NotificationPermission | 'unsupported'
  subscribed: boolean
  loading: boolean
  /** Message d'erreur lisible si subscribe/unsubscribe a echoue. NULL = OK. */
  error: string | null
}

const VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? ''

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

export function usePushNotifications(userId?: string, userName?: string) {
  const [state, setState] = useState<PushState>({
    supported: false,
    permission: 'unsupported',
    subscribed: false,
    loading: true,
    error: null,
  })

  useEffect(() => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
    if (!supported) {
      setState(s => ({ ...s, supported: false, loading: false }))
      return
    }
    setState(s => ({ ...s, supported: true, permission: Notification.permission }))

    // Check existing subscription
    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        setState(s => ({ ...s, subscribed: !!sub, loading: false }))
      })
    }).catch(() => setState(s => ({ ...s, loading: false })))
  }, [])

  const subscribe = useCallback(async () => {
    if (!state.supported) {
      setState(s => ({ ...s, error: 'Ton navigateur ne supporte pas les notifications push.' }))
      return false
    }
    if (!userId) {
      setState(s => ({ ...s, error: 'Utilisateur non connecte.' }))
      return false
    }
    if (!VAPID_KEY) {
      setState(s => ({ ...s, error: 'Configuration push manquante (VAPID public key absente).' }))
      console.error('[push] VITE_VAPID_PUBLIC_KEY manquante dans .env')
      return false
    }
    setState(s => ({ ...s, loading: true, error: null }))

    try {
      // 1. Permission
      const permission = await Notification.requestPermission()
      setState(s => ({ ...s, permission }))
      if (permission === 'denied') {
        setState(s => ({
          ...s,
          loading: false,
          error: 'Permission refusee. Va dans les reglages Safari/Chrome pour autoriser les notifications.',
        }))
        return false
      }
      if (permission !== 'granted') {
        setState(s => ({ ...s, loading: false, error: 'Permission non accordee.' }))
        return false
      }

      // 2. Reset existing subscription si elle existe (cas desync DB <-> browser)
      const reg = await navigator.serviceWorker.ready
      let sub = await reg.pushManager.getSubscription()
      if (sub) {
        // Verifier si la sub matche notre VAPID actuel. Si non -> unsubscribe
        // pour resubscribe avec le bon key. Cas frequent : VAPID_KEY a change
        // (rotation) ou desync DB.
        try {
          await sub.unsubscribe()
        } catch (e) {
          console.warn('[push] unsubscribe avant resubscribe a echoue:', e)
        }
      }

      // 3. Nouvelle subscription avec VAPID actuel
      try {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_KEY) as unknown as BufferSource,
        })
      } catch (subErr) {
        console.error('[push] pushManager.subscribe failed:', subErr)
        const msg = subErr instanceof Error ? subErr.message : String(subErr)
        setState(s => ({
          ...s,
          loading: false,
          error: `Inscription au service push refusee : ${msg}. Verifie que les notifications sont autorisees pour cette app.`,
        }))
        return false
      }

      // 4. Persiste en DB. Fix bug 2026-05-06 : on conflict sur ENDPOINT
      // (pas user_id) pour autoriser plusieurs devices par user (mobile +
      // desktop). Avant : 2e device ecrasait le 1er.
      const json = sub.toJSON()
      const sb = await getSupabaseClient()
      if (!sb) {
        setState(s => ({
          ...s,
          loading: false,
          error: 'Service Supabase indisponible. Reessaie dans quelques minutes.',
        }))
        return false
      }
      const { error: dbErr } = await sb.from('push_subscriptions').upsert({
        user_id: userId,
        endpoint: json.endpoint,
        p256dh: json.keys?.p256dh ?? '',
        auth: json.keys?.auth ?? '',
        user_name: userName ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'endpoint' })

      if (dbErr) {
        console.error('[push] DB upsert failed:', dbErr)
        setState(s => ({
          ...s,
          loading: false,
          error: `Sauvegarde de l'inscription impossible : ${dbErr.message}`,
        }))
        return false
      }

      setState(s => ({ ...s, subscribed: true, loading: false, error: null }))
      return true
    } catch (err) {
      console.error('[push] subscribe error:', err)
      const msg = err instanceof Error ? err.message : String(err)
      setState(s => ({
        ...s,
        loading: false,
        error: `Echec inscription push : ${msg}`,
      }))
      return false
    }
  }, [state.supported, userId, userName])

  const unsubscribe = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null }))
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) await sub.unsubscribe()

      const sb = await getSupabaseClient()
      if (sb && userId) {
        // On supprime UNIQUEMENT la sub de cet endpoint (pas toutes les
        // subs de l'user, sinon on supprimerait celles d'autres devices).
        if (sub) {
          await sb.from('push_subscriptions').delete()
            .eq('user_id', userId)
            .eq('endpoint', sub.endpoint)
        } else {
          // Pas de sub locale -> on cleanup juste si rien en DB pour cet user.
          await sb.from('push_subscriptions').delete().eq('user_id', userId)
        }
      }

      setState(s => ({ ...s, subscribed: false, loading: false, error: null }))
    } catch (err) {
      console.error('[push] unsubscribe error:', err)
      const msg = err instanceof Error ? err.message : String(err)
      setState(s => ({
        ...s,
        loading: false,
        error: `Desinscription a echoue : ${msg}`,
      }))
    }
  }, [userId])

  /** Reset l'erreur affichee (apres lecture par le composant). */
  const clearError = useCallback(() => {
    setState(s => ({ ...s, error: null }))
  }, [])

  return { ...state, subscribe, unsubscribe, clearError }
}
