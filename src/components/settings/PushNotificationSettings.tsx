import { usePushNotifications } from '../../hooks/usePushNotifications'

interface Props {
  userId?: string
  userName?: string
}

export function PushNotificationSettings({ userId, userName }: Props) {
  const { supported, permission, subscribed, loading, subscribe, unsubscribe } = usePushNotifications(userId, userName)

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

  return (
    <div style={{ background: 'var(--ls-surface)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 16 }}>
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
        <div style={{ background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.15)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#FB7185', lineHeight: 1.6 }}>
          Les notifications ont été bloquées. Pour les réactiver, va dans les réglages de ton navigateur → Autorisations → Notifications.
        </div>
      ) : (
        <button
          onClick={() => subscribed ? unsubscribe() : subscribe()}
          disabled={loading}
          style={{
            width: '100%', padding: '10px', borderRadius: 10, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            background: subscribed ? 'rgba(251,113,133,0.08)' : '#C9A84C',
            color: subscribed ? '#FB7185' : 'var(--ls-bg)',
            fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600,
            opacity: loading ? 0.6 : 1, transition: 'all 0.15s',
          }}
        >
          {loading ? 'Chargement...' : subscribed ? 'Désactiver les notifications' : 'Activer les notifications'}
        </button>
      )}
    </div>
  )
}
