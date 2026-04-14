import { useState, useEffect, useCallback } from 'react'
import { getSupabaseClient } from '../services/supabaseClient'

interface PushState {
  supported: boolean
  permission: NotificationPermission | 'unsupported'
  subscribed: boolean
  loading: boolean
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
    if (!state.supported || !userId || !VAPID_KEY) return false
    setState(s => ({ ...s, loading: true }))

    try {
      const permission = await Notification.requestPermission()
      setState(s => ({ ...s, permission }))
      if (permission !== 'granted') {
        setState(s => ({ ...s, loading: false }))
        return false
      }

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_KEY) as unknown as BufferSource,
      })

      const json = sub.toJSON()
      const sb = await getSupabaseClient()
      if (sb) {
        await sb.from('push_subscriptions').upsert({
          user_id: userId,
          endpoint: json.endpoint,
          p256dh: json.keys?.p256dh ?? '',
          auth: json.keys?.auth ?? '',
          user_name: userName ?? null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
      }

      setState(s => ({ ...s, subscribed: true, loading: false }))
      return true
    } catch (err) {
      console.error('Push subscribe error:', err)
      setState(s => ({ ...s, loading: false }))
      return false
    }
  }, [state.supported, userId, userName])

  const unsubscribe = useCallback(async () => {
    setState(s => ({ ...s, loading: true }))
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) await sub.unsubscribe()

      const sb = await getSupabaseClient()
      if (sb && userId) {
        await sb.from('push_subscriptions').delete().eq('user_id', userId)
      }

      setState(s => ({ ...s, subscribed: false, loading: false }))
    } catch (err) {
      console.error('Push unsubscribe error:', err)
      setState(s => ({ ...s, loading: false }))
    }
  }, [userId])

  return { ...state, subscribe, unsubscribe }
}
