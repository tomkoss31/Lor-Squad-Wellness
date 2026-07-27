// PWA v2 — souscription push client (partagé PwaEngage + ProfilScreen).
// RPC upsert_client_push_subscription_by_token (token-only, contourne RLS).
import { getSupabaseClient } from '../../services/supabaseClient'

const VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? ''

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const arr = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) arr[i] = rawData.charCodeAt(i)
  return arr
}

/** true si le navigateur supporte les push (SW + PushManager + Notification). */
export function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
}

/** État courant : 'default' | 'granted' | 'denied' | 'unsupported'. */
export function pushPermission(): NotificationPermission | 'unsupported' {
  if (!pushSupported()) return 'unsupported'
  return Notification.permission
}

/** Souscrit + stocke la subscription. Suppose la permission déjà accordée. */
export async function subscribeAndStore(token: string): Promise<'ok' | 'skipped' | 'error'> {
  try {
    if (!VAPID_KEY) return 'error'
    if (!pushSupported()) return 'skipped'
    const reg = await navigator.serviceWorker.ready
    let subscription = await reg.pushManager.getSubscription()
    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_KEY) as unknown as ArrayBuffer,
      })
    }
    const j = subscription.toJSON()
    const sb = await getSupabaseClient()
    if (!sb) return 'error'
    const { error } = await sb.rpc('upsert_client_push_subscription_by_token', {
      p_token: token,
      p_endpoint: j.endpoint ?? '',
      p_p256dh: j.keys?.p256dh ?? '',
      p_auth: j.keys?.auth ?? '',
      p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    })
    return error ? 'error' : 'ok'
  } catch {
    return 'error'
  }
}

/** Demande la permission puis souscrit. Renvoie true si abonné. */
export async function enablePush(token: string): Promise<boolean> {
  if (!pushSupported()) return false
  try {
    const perm = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
    if (perm !== 'granted') return false
    return (await subscribeAndStore(token)) === 'ok'
  } catch {
    return false
  }
}
