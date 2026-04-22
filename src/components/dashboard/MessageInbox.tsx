import { Link } from 'react-router-dom'
import type { ClientMessage } from '../../types/domain'
import { getInitials } from '../../lib/utils/getInitials'

interface MessageInboxProps {
  messages: ClientMessage[]
  onMarkRead: (id: string) => void
}

export function MessageInbox({ messages, onMarkRead }: MessageInboxProps) {
  if (messages.length === 0) return null

  const unread = messages.filter(m => !m.read)
  const display = messages.slice(0, 6)

  return (
    <div style={{ background: 'var(--ls-surface)', border: '1px solid var(--ls-border)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ls-purple)" strokeWidth="1.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
        </div>
        <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, color: 'var(--ls-text)' }}>Messages clients</span>
        {unread.length > 0 && (
          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'rgba(124,58,237,0.12)', color: 'var(--ls-purple)', fontWeight: 700, marginLeft: 'auto' }}>
            {unread.length} nouveau{unread.length > 1 ? 'x' : ''}
          </span>
        )}
      </div>

      {display.map((msg, i) => {
        const isUnread = !msg.read
        // Chantier Messagerie client ↔ coach (2026-04-21) : +'rdv_request'.
        const typeLabel =
          msg.message_type === 'product_request'
            ? '🛒 Produit'
            : msg.message_type === 'recommendation'
              ? '👥 Recommandation'
              : msg.message_type === 'rdv_request'
                ? '📅 RDV'
                : '💬 Message'
        const timeAgo = getTimeAgo(msg.created_at)

        return (
          <div key={msg.id} style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '10px 0',
            borderTop: i > 0 ? '1px solid var(--ls-border)' : 'none',
            opacity: isUnread ? 1 : 0.6,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: isUnread ? 'rgba(124,58,237,0.12)' : 'var(--ls-surface2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700, fontFamily: 'Syne, sans-serif',
              color: isUnread ? 'var(--ls-purple)' : 'var(--ls-text-hint)',
            }}>
              {getInitials(msg.client_name)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <span style={{ fontSize: 13, fontWeight: isUnread ? 600 : 400, color: 'var(--ls-text)' }}>{msg.client_name}</span>
                <span style={{ fontSize: 9, color: 'var(--ls-text-hint)' }}>{timeAgo}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--ls-text-muted)', marginBottom: 3 }}>
                {typeLabel}{msg.product_name ? ` — ${msg.product_name}` : ''}
              </div>
              {msg.message && (
                <div style={{ fontSize: 11, color: 'var(--ls-text-hint)', fontStyle: 'italic' }}>"{msg.message}"</div>
              )}
              {msg.client_contact && (
                <div style={{ fontSize: 10, color: 'var(--ls-purple)', marginTop: 3 }}>📱 {msg.client_contact}</div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
              {msg.client_id && (
                <Link to={`/clients/${msg.client_id}`} style={{ fontSize: 9, padding: '3px 8px', borderRadius: 6, background: 'var(--ls-surface2)', color: 'var(--ls-text-muted)', textDecoration: 'none', textAlign: 'center' }}>
                  Fiche
                </Link>
              )}
              {isUnread && (
                <button onClick={() => onMarkRead(msg.id)} style={{ fontSize: 9, padding: '3px 8px', borderRadius: 6, background: 'rgba(124,58,237,0.08)', color: 'var(--ls-purple)', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                  ✓ Lu
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "À l'instant"
  if (mins < 60) return `${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}j`
}
