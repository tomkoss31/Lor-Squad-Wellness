// ============================================================================
// PWA v2 — Barrière notifications (hard-force à la connexion)
// ----------------------------------------------------------------------------
// Décision Thomas (2026-07-24) : « hard forcing à la connexion si pas activé ».
// Écran plein écran BLOQUANT montré au montage de l'app tant que le client n'a
// pas activé les notifications push. Se réaffiche à CHAQUE connexion (pas de
// dismiss persistant) — un simple « Plus tard » de session évite de bloquer
// quelqu'un pour de bon (permission refusée navigateur, OS qui n'affiche pas
// le prompt, etc.).
//
// Cas gérés :
//  - permission 'granted'  → rien (et on (re)stocke la subscription par sûreté)
//  - iOS + pas installé    → mode INSTALL (push impossible dans l'onglet Safari :
//                            il faut d'abord ajouter à l'écran d'accueil)
//  - permission 'denied'   → mode BLOCKED (irréparable par programme, mais on
//                            explique comment réactiver + « Vérifier » — jamais
//                            en silence, sinon le coach perd le canal)
//  - supporté + 'default'  → mode PERMISSION (CTA « Activer »)
//  - non supporté (desktop sans push) → rien
// Aucun cas ne bricke : le « Plus tard » (session only) est toujours dispo et se
// represente à la prochaine connexion.
// ============================================================================
import { useEffect, useState } from 'react'
import { detectDevice, isStandalonePwa } from '../../lib/utils/detectDevice'
import { InstallPwaInstructions } from '../../components/pwa/InstallPwaInstructions'
import { enablePush, pushPermission, subscribeAndStore } from './pushSubscribe'

const SORA = "'Sora', sans-serif"
const ANTON = "'Anton', sans-serif"
const MONO = "'JetBrains Mono', monospace"

type GateMode = 'permission' | 'install' | 'blocked' | null

/** Détermine le mode de barrière à afficher (ou null = ne pas bloquer). */
function resolveMode(): GateMode {
  const perm = pushPermission()
  if (perm === 'granted') return null // rien à forcer
  // iOS Safari en onglet : PushManager indisponible tant que pas ajouté à
  // l'écran d'accueil → on force l'installation d'abord (prioritaire).
  if (detectDevice() === 'ios' && !isStandalonePwa()) return 'install'
  if (perm === 'denied') return 'blocked' // à réactiver dans les réglages
  if (perm === 'unsupported') return null // desktop / navigateur sans push
  return 'permission' // supporté + 'default'
}

export function PushGate({ token, onLater }: { token: string; onLater: () => void }) {
  const [mode, setMode] = useState<GateMode>(() => resolveMode())
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  // Si déjà accordé (retour d'app installée), on (re)stocke la subscription.
  useEffect(() => {
    if (pushPermission() === 'granted') void subscribeAndStore(token)
  }, [token])

  if (mode == null) return null

  async function activate() {
    if (busy) return
    setBusy(true)
    setFailed(false)
    const ok = await enablePush(token)
    setBusy(false)
    if (ok) setMode(null)
    else setFailed(true)
  }
  // Mode bloqué : après un changement de réglages navigateur, on re-résout.
  function recheck() {
    setFailed(false)
    setMode(resolveMode())
  }
  const device = detectDevice()

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Activer les notifications"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 95,
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}
      className="lb-scroll pwa2-overlay"
    >
      {/* Ambiance */}
      <div style={{ position: 'absolute', top: '-8%', right: '-20%', width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle,var(--lime),transparent 70%)', opacity: 0.1, filter: 'blur(70px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '6%', left: '-18%', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle,var(--teal),transparent 70%)', opacity: 0.08, filter: 'blur(70px)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 460, width: '100%', margin: '0 auto', padding: 'calc(env(safe-area-inset-top,0px) + 28px) 24px calc(env(safe-area-inset-bottom,0px) + 28px)', gap: 22, animation: 'lbRise .45s cubic-bezier(.16,1,.3,1) both' }}>

        {/* Icône cloche */}
        <div style={{ width: 72, height: 72, borderRadius: 20, background: 'linear-gradient(140deg,var(--teal),var(--teal-d))', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', boxShadow: '0 0 0 1px color-mix(in srgb,var(--teal) 40%,transparent), 0 18px 40px -12px color-mix(in srgb,var(--teal) 55%,transparent)' }}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#04201b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" /></svg>
        </div>

        <div>
          <div style={{ ...eyebrow, marginBottom: 8, color: mode === 'blocked' ? 'var(--coral)' : 'var(--teal)' }}>{mode === 'install' ? 'Une dernière étape' : mode === 'blocked' ? 'Action requise' : 'Ne rate rien'}</div>
          <h1 style={{ fontFamily: ANTON, fontSize: 30, lineHeight: 1.05, color: 'var(--text)', margin: 0, letterSpacing: '.01em', textTransform: 'uppercase' }}>
            {mode === 'install' ? (
              <>Installe l'app pour<br /><span style={{ color: 'var(--lime)' }}>activer les alertes</span></>
            ) : mode === 'blocked' ? (
              <>Tes notifications<br /><span style={{ color: 'var(--coral)' }}>sont bloquées</span></>
            ) : (
              <>Active tes<br /><span style={{ color: 'var(--lime)' }}>notifications</span></>
            )}
          </h1>
          <p style={{ fontFamily: SORA, fontSize: 14.5, lineHeight: 1.55, color: 'var(--muted)', margin: '14px 0 0' }}>
            {mode === 'install'
              ? "Sur iPhone, les notifications ne fonctionnent qu'une fois l'app ajoutée à ton écran d'accueil. Ajoute-la, rouvre-la depuis l'icône, puis active-les."
              : mode === 'blocked'
              ? 'Tu les avais refusées. Ton coach ne peut plus te joindre par notification. Réautorise-les dans les réglages, puis reviens ici.'
              : 'Ton coach compte dessus pour te joindre : rappels de RDV, réponses à tes messages, moments clés de ta progression. C\'est le fil direct avec ton suivi.'}
          </p>
        </div>

        {mode === 'blocked' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ padding: '15px 16px', borderRadius: 16, background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div style={{ ...eyebrow, marginBottom: 10 }}>Comment réactiver</div>
              <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 11 }}>
                {(device === 'ios' ? BLOCKED_STEPS_IOS : device === 'android' ? BLOCKED_STEPS_ANDROID : BLOCKED_STEPS_DESKTOP).map((s, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
                    <span style={{ width: 24, height: 24, flex: 'none', borderRadius: '50%', background: 'color-mix(in srgb,var(--teal) 16%,transparent)', color: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 11, fontWeight: 700 }}>{String(i + 1).padStart(2, '0')}</span>
                    <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5, paddingTop: 2 }}>{s}</span>
                  </li>
                ))}
              </ol>
            </div>
            <button onClick={recheck} style={{ width: '100%', minHeight: 54, borderRadius: 15, border: 'none', cursor: 'pointer', background: 'linear-gradient(120deg,var(--teal),var(--lime))', color: '#04201b', fontFamily: SORA, fontSize: 15.5, fontWeight: 800 }}>
              J'ai réactivé — vérifier
            </button>
          </div>
        ) : mode === 'permission' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Bénéfices */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, padding: '15px 16px', borderRadius: 16, background: 'var(--surface)', border: '1px solid var(--border)' }}>
              {BENEFITS.map((b) => (
                <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--lime)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}><path d="M20 6L9 17l-5-5" /></svg>
                  <span style={{ fontSize: 13, color: 'var(--text)' }}>{b}</span>
                </div>
              ))}
            </div>

            {failed && (
              <div style={{ fontSize: 12.5, color: 'var(--coral)', lineHeight: 1.5, padding: '0 2px' }}>
                Les notifications semblent bloquées. Vérifie que tu as bien accepté, ou autorise-les dans les réglages de ton navigateur, puis réessaie.
              </div>
            )}

            <button
              onClick={() => void activate()}
              disabled={busy}
              style={{ width: '100%', minHeight: 54, borderRadius: 15, border: 'none', cursor: busy ? 'default' : 'pointer', background: 'linear-gradient(120deg,var(--teal),var(--lime))', color: '#04201b', fontFamily: SORA, fontSize: 15.5, fontWeight: 800, opacity: busy ? 0.7 : 1, transition: 'opacity .2s' }}
            >
              {busy ? 'Activation…' : failed ? 'Réessayer' : 'Activer les notifications'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ padding: '16px 17px', borderRadius: 16, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}>
              <InstallPwaInstructions device="ios" accent="var(--lime)" accentBg="color-mix(in srgb,var(--lime) 16%,transparent)" />
            </div>
            <div style={{ fontFamily: MONO, fontSize: 11, color: 'var(--muted)', lineHeight: 1.6, padding: '0 2px' }}>
              Déjà installée ? Ouvre La Base 360 depuis l'icône de ton écran d'accueil (pas depuis Safari), l'activation apparaîtra ici.
            </div>
          </div>
        )}

        {/* Échappatoire de session (pas de dismiss persistant → se represente à la prochaine connexion) */}
        <button
          onClick={onLater}
          style={{ alignSelf: 'center', marginTop: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontFamily: SORA, fontSize: 13, textDecoration: 'underline', textUnderlineOffset: 3, padding: 8 }}
        >
          Plus tard
        </button>
      </div>
    </div>
  )
}

const eyebrow = {
  fontFamily: MONO,
  fontSize: 10.5,
  letterSpacing: '.18em',
  textTransform: 'uppercase' as const,
  color: 'var(--teal)',
  fontWeight: 600,
}

const BENEFITS = [
  'Rappels de RDV — tu n\'oublies plus',
  'Réponses de ton coach en direct',
  'Tes paliers et passages de niveau',
]

const BLOCKED_STEPS_IOS = [
  'Ouvre Réglages iPhone → La Base 360',
  'Touche « Notifications »',
  'Active « Autoriser les notifications »',
]
const BLOCKED_STEPS_ANDROID = [
  'Ouvre les paramètres du téléphone → Applications',
  'Choisis La Base 360 → Notifications',
  'Active les notifications',
]
const BLOCKED_STEPS_DESKTOP = [
  'Clique sur le cadenas 🔒 à gauche de l\'adresse',
  'Passe « Notifications » sur « Autoriser »',
  'Recharge la page',
]
