import { usePushNotifications } from '../../hooks/usePushNotifications'

interface Props {
  userId?: string
  userName?: string
}

export function PushNotificationSettings({ userId, userName }: Props) {
  const {
    supported,
    permission,
    subscribed,
    loading,
    error,
    subscribe,
    unsubscribe,
    clearError,
    isIosStandalone,
    diag,
  } = usePushNotifications(userId, userName)

  if (!supported) {
    return (
      <div style={{ background: 'var(--ls-surface)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ls-text-muted)' }} />
          <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, color: 'var(--ls-text-muted)' }}>Notifications</span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--ls-text-hint)', lineHeight: 1.6 }}>
          Les notifications push ne sont pas supportées sur ce navigateur.
        </p>
      </div>
    )
  }

  const denied = permission === 'denied'
  const iosBadConfig = diag.isIos && !diag.isStandalone

  return (
    <div style={{ background: 'var(--ls-surface)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 16 }}>
      {/* Bandeau iOS critique : si user sur Safari (pas PWA) -> il faut l'installer d'abord */}
      {iosBadConfig ? (
        <div style={{
          marginBottom: 14,
          padding: '12px 14px',
          background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(239,68,68,0.10))',
          border: '1px solid rgba(245,158,11,0.40)',
          borderRadius: 10,
          fontSize: 12,
          color: '#F59E0B',
          lineHeight: 1.55,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 6, fontFamily: 'Sora, sans-serif', fontSize: 13 }}>
            📱 PWA non installée
          </div>
          <div style={{ marginBottom: 6 }}>
            Sur iPhone, les notifications fonctionnent <strong>uniquement</strong> depuis l'app installée à l'écran d'accueil.
          </div>
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: 11.5 }}>
            <li>Dans Safari, clique le bouton <strong>Partager</strong> (carré + flèche ↑)</li>
            <li>Choisis <strong>« Sur l'écran d'accueil »</strong></li>
            <li>Ferme Safari, ouvre l'app via l'icône <strong>La Base 360</strong></li>
            <li>Reviens dans cette page → bouton ci-dessous fonctionnera</li>
          </ol>
        </div>
      ) : null}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: subscribed ? '#2DD4BF' : 'var(--ls-text-muted)',
          boxShadow: subscribed ? '0 0 0 3px rgba(45,212,191,0.2)' : 'none',
        }} className={subscribed ? 'dot-pulse' : ''} />
        <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, color: subscribed ? '#2DD4BF' : 'var(--ls-text-muted)' }}>
          Notifications {subscribed ? 'activées' : 'désactivées'}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
        {[
          { label: 'Relances en retard', desc: 'Clients à relancer immédiatement', color: '#FB7185' },
          { label: 'RDV dans moins d\'1h', desc: 'Rappel avant le rendez-vous', color: '#2DD4BF' },
          { label: 'Réassorts PV dépassés', desc: 'Produits à renouveler', color: '#A78BFA' },
        ].map(n => (
          <div key={n.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: n.color, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ls-text)' }}>{n.label}</div>
              <div style={{ fontSize: 10, color: 'var(--ls-text-hint)' }}>{n.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {denied ? (
        <div style={{ background: 'var(--ls-coral-bg)', border: '1px solid rgba(251,113,133,0.15)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#FB7185', lineHeight: 1.6 }}>
          Les notifications ont été bloquées. Pour les réactiver, va dans les réglages de ton navigateur → Autorisations → Notifications.
        </div>
      ) : (
        <>
          <button
            onClick={() => subscribed ? unsubscribe() : subscribe()}
            disabled={loading}
            style={{
              width: '100%', padding: '10px', borderRadius: 10, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              background: subscribed ? 'var(--ls-coral-bg)' : '#C9A84C',
              color: subscribed ? '#FB7185' : 'var(--ls-bg)',
              fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600,
              opacity: loading ? 0.6 : 1, transition: 'all 0.15s',
            }}
          >
            {loading ? 'Chargement...' : subscribed ? 'Désactiver les notifications' : 'Activer les notifications'}
          </button>
          {/* Panneau diagnostic technique (collapsible-style — toujours visible
              en bas, en petit). Aide Thomas/Mel à identifier rapidement le
              maillon cassé sans avoir à ouvrir la console. */}
          <details style={{
            marginTop: 12,
            background: 'rgba(255,255,255,0.02)',
            border: '0.5px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            padding: '8px 12px',
          }}>
            <summary style={{
              fontSize: 11,
              color: 'var(--ls-text-hint)',
              cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 600,
              letterSpacing: 0.3,
            }}>
              🔧 Diagnostic technique
            </summary>
            <div style={{
              marginTop: 8,
              fontSize: 10.5,
              color: 'var(--ls-text-muted)',
              fontFamily: 'JetBrains Mono, monospace',
              lineHeight: 1.7,
            }}>
              <div>iOS : {diag.isIos ? '✓ détecté' : '✗ non'}</div>
              <div>PWA standalone : {diag.isStandalone ? '✓ oui (OK)' : '✗ non' + (diag.isIos ? ' (CRITIQUE iOS)' : '')}</div>
              <div>Service Worker : {diag.hasSW ? `✓ ${diag.swState}` : '✗ absent'}</div>
              <div>Manifest : {diag.hasManifest ? '✓ présent' : '✗ absent'}</div>
              <div>VAPID public key : {diag.hasVapid ? '✓ configurée' : '✗ ABSENTE (env)'}</div>
              <div>Notification API : {supported ? '✓ supportée' : '✗ non supportée'}</div>
              <div>Permission : {permission}</div>
              <div>Subscribed : {subscribed ? '✓ oui' : '✗ non'}</div>
              {isIosStandalone === false ? (
                <div style={{ marginTop: 6, color: '#F59E0B', fontWeight: 600 }}>
                  ⚠ iOS sans PWA : ouvrir via l'icône home écran requis
                </div>
              ) : null}
            </div>
          </details>
          {/* Affichage erreur explicite (fix bug Mel "branchage echoue silencieusement" 2026-05-06) */}
          {error ? (
            <div style={{
              marginTop: 10,
              background: 'var(--ls-coral-bg)',
              border: '1px solid rgba(251,113,133,0.25)',
              borderRadius: 10,
              padding: '10px 12px',
              fontSize: 11.5,
              color: '#FB7185',
              lineHeight: 1.5,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
            }}>
              <span style={{ flexShrink: 0 }}>⚠️</span>
              <span style={{ flex: 1 }}>{error}</span>
              <button
                type="button"
                onClick={clearError}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#FB7185',
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: 14,
                  lineHeight: 1,
                  flexShrink: 0,
                }}
                aria-label="Fermer"
              >×</button>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
