// ============================================================================
// PWA v2 — Prompts d'engagement (chantier refonte identité 2026-07)
// ----------------------------------------------------------------------------
// Re-skin v2 de l'opt-in notifications push + de la bannière « installer l'app »
// (anciennement ClientPushOptIn + InstallPwaBanner, identité cream). Même
// logique (RPC upsert_client_push_subscription_by_token, detectDevice,
// InstallPwaInstructions), habillage lime/noir. Monté en haut de l'Accueil.
// ============================================================================
import { useEffect, useState } from 'react'
import { getSupabaseClient } from '../../services/supabaseClient'
import { detectDevice, isStandalonePwa } from '../../lib/utils/detectDevice'
import { InstallPwaInstructions } from '../../components/pwa/InstallPwaInstructions'

const SORA = "'Sora', sans-serif"
const VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? ''
const DISMISS_KEY = 'pwa_banner_dismissed'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const arr = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) arr[i] = rawData.charCodeAt(i)
  return arr
}

async function subscribeAndStore(token: string): Promise<'ok' | 'skipped' | 'error'> {
  try {
    if (!VAPID_KEY) return 'error'
    if (typeof window === 'undefined') return 'skipped'
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'skipped'
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

export function PwaEngage({ token }: { token: string }) {
  const [pushState, setPushState] = useState<'hidden' | 'prompt' | 'subscribing' | 'failed'>('hidden')
  const [installVisible, setInstallVisible] = useState(false)
  const [installModal, setInstallModal] = useState(false)

  // Push : montrer le prompt si supporté + permission 'default'.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
    if (!supported) return
    const perm = Notification.permission
    if (perm === 'granted') {
      void subscribeAndStore(token)
      return
    }
    if (perm === 'denied') return
    setPushState('prompt')
  }, [token])

  // Install : si pas déjà en standalone + pas dismissé.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (isStandalonePwa()) return
    if (window.localStorage.getItem(DISMISS_KEY) === 'true') return
    setInstallVisible(true)
  }, [])

  async function activatePush() {
    setPushState('subscribing')
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') { setPushState('failed'); return }
      const r = await subscribeAndStore(token)
      setPushState(r === 'ok' ? 'hidden' : 'failed')
    } catch {
      setPushState('failed')
    }
  }
  function dismissInstall() {
    setInstallVisible(false)
    try { window.localStorage.setItem(DISMISS_KEY, 'true') } catch { /* ignore */ }
  }

  if (pushState === 'hidden' && !installVisible) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Opt-in notifications */}
      {pushState !== 'hidden' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', borderRadius: 14, background: 'linear-gradient(135deg,color-mix(in srgb,var(--teal) 12%,var(--surface)),var(--surface))', border: '1px solid color-mix(in srgb,var(--teal) 24%,var(--border))' }}>
          <div style={{ width: 38, height: 38, flex: 'none', borderRadius: 11, background: 'color-mix(in srgb,var(--teal) 16%,transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" /></svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: SORA, fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>Reste au courant</div>
            <div style={{ fontSize: 12, color: pushState === 'failed' ? 'var(--coral)' : 'var(--muted)', lineHeight: 1.4, marginTop: 1 }}>{pushState === 'failed' ? "Notifs bloquées — vérifie les réglages du navigateur." : 'RDV, réponses du coach, passages de niveau.'}</div>
          </div>
          {pushState === 'prompt' && (
            <button onClick={() => void activatePush()} style={{ flex: 'none', padding: '9px 15px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(120deg,var(--teal),var(--lime))', color: '#04201b', fontFamily: SORA, fontSize: 12.5, fontWeight: 700 }}>Activer</button>
          )}
          {pushState === 'subscribing' && <span style={{ flex: 'none', fontSize: 12, color: 'var(--muted)' }}>…</span>}
          {pushState === 'failed' && (
            <button onClick={() => setPushState('hidden')} aria-label="Fermer" style={{ width: 28, height: 28, flex: 'none', borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
          )}
        </div>
      )}

      {/* Bannière installer l'app */}
      {installVisible && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', borderRadius: 14, background: 'linear-gradient(135deg,color-mix(in srgb,var(--lime) 12%,var(--surface)),var(--surface))', border: '1px solid color-mix(in srgb,var(--lime) 24%,var(--border))' }}>
          <div style={{ width: 38, height: 38, flex: 'none', borderRadius: 11, background: 'color-mix(in srgb,var(--lime) 16%,transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--lime)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" /><path d="M12 18h.01" /></svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: SORA, fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>Installe l'app</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4, marginTop: 1 }}>Un accès rapide, comme une vraie app.</div>
          </div>
          <button onClick={() => setInstallModal(true)} style={{ flex: 'none', padding: '9px 15px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'var(--lime)', color: '#0a0c0a', fontFamily: SORA, fontSize: 12.5, fontWeight: 700 }}>Voir comment</button>
          <button onClick={dismissInstall} aria-label="Fermer" style={{ width: 28, height: 28, flex: 'none', borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* Modale instructions install */}
      {installModal && (
        <div onClick={() => setInstallModal(false)} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="lb-scroll" style={{ width: '100%', maxWidth: 460, maxHeight: '86%', overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 24, padding: 22, animation: 'lbRise .3s cubic-bezier(.16,1,.3,1)' }}>
            <InstallPwaInstructions device={detectDevice()} />
            <button onClick={() => setInstallModal(false)} style={{ marginTop: 16, width: '100%', minHeight: 48, borderRadius: 13, border: 'none', cursor: 'pointer', background: 'var(--surface2)', color: 'var(--text)', fontFamily: SORA, fontWeight: 700, fontSize: 14 }}>J'ai compris</button>
          </div>
        </div>
      )}
    </div>
  )
}
