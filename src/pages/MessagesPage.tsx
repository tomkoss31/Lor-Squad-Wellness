import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import { Card } from '../components/ui/Card'
import { PageHeading } from '../components/ui/PageHeading'
import type { ClientMessage } from '../types/domain'

type Tab = 'products' | 'recommendations'

function ContactLinks({ phone, email, name }: { phone?: string; email?: string; name: string }) {
  const pre = encodeURIComponent(`Bonjour ${name}, suite à votre intérêt pour Lor'Squad Wellness.`)
  const cleanPhone = (phone ?? '').replace(/[^\d+]/g, '')
  const hasPhone = cleanPhone.length >= 6

  if (!hasPhone && !email) {
    return <div style={{ fontSize: 11, color: 'var(--ls-text-hint)', fontStyle: 'italic' }}>Aucun contact renseigné</div>
  }

  return (
    <div style={{ marginTop: 8 }}>
      {hasPhone && <div style={{ fontSize: 11, color: 'var(--ls-text-hint)', marginBottom: 4 }}>📱 {phone}</div>}
      {email && <div style={{ fontSize: 11, color: 'var(--ls-text-hint)', marginBottom: 6 }}>✉️ {email}</div>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {hasPhone && (
          <a href={`https://wa.me/${cleanPhone}?text=${pre}`} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 10, padding: '5px 10px', borderRadius: 7, background: 'rgba(37,211,102,0.1)', color: '#16A34A', textDecoration: 'none', fontWeight: 600 }}>
            WhatsApp
          </a>
        )}
        {hasPhone && (
          <a href={`https://t.me/+${cleanPhone}`} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 10, padding: '5px 10px', borderRadius: 7, background: 'rgba(0,136,204,0.1)', color: '#0088CC', textDecoration: 'none', fontWeight: 600 }}>
            Telegram
          </a>
        )}
        {hasPhone && (
          <a href={`sms:${cleanPhone}?body=${pre}`}
            style={{ fontSize: 10, padding: '5px 10px', borderRadius: 7, background: 'var(--ls-surface2)', color: 'var(--ls-text-muted)', textDecoration: 'none', fontWeight: 500 }}>
            SMS
          </a>
        )}
        {hasPhone && (
          <a href={`tel:${cleanPhone}`}
            style={{ fontSize: 10, padding: '5px 10px', borderRadius: 7, background: 'rgba(201,168,76,0.08)', color: 'var(--ls-gold)', textDecoration: 'none', fontWeight: 600 }}>
            Appeler
          </a>
        )}
        {email && (
          <a href={`mailto:${email}?subject=${encodeURIComponent("Lor'Squad Wellness")}&body=${pre}`}
            style={{ fontSize: 10, padding: '5px 10px', borderRadius: 7, background: 'var(--ls-surface2)', color: 'var(--ls-text-muted)', textDecoration: 'none', fontWeight: 500 }}>
            Email
          </a>
        )}
      </div>
    </div>
  )
}

function MessageCard({ msg, phone, email, onMarkRead, onDelete }: {
  msg: ClientMessage;
  phone?: string;
  email?: string;
  onMarkRead: () => void;
  onDelete: () => void;
}) {
  const isUnread = !msg.read
  const typeLabel = msg.message_type === 'product_request' ? '🛒 Demande produit' : msg.message_type === 'recommendation' ? '👥 Recommandation' : '💬 Message'
  const timeAgo = getTimeAgo(msg.created_at)

  return (
    <div style={{
      background: isUnread ? 'var(--ls-surface)' : 'var(--ls-surface2)',
      border: `1px solid ${isUnread ? 'rgba(124,58,237,0.2)' : 'var(--ls-border)'}`,
      borderLeft: isUnread ? '3px solid var(--ls-purple)' : '1px solid var(--ls-border)',
      borderRadius: isUnread ? '0 12px 12px 0' : 12,
      padding: '14px 16px',
      transition: 'all 0.15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: isUnread ? 'rgba(124,58,237,0.12)' : 'var(--ls-surface2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, fontFamily: 'Syne, sans-serif',
          color: isUnread ? 'var(--ls-purple)' : 'var(--ls-text-hint)',
        }}>
          {msg.client_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: isUnread ? 600 : 400, color: 'var(--ls-text)' }}>{msg.client_name}</span>
            <span style={{ fontSize: 10, color: 'var(--ls-text-hint)', marginLeft: 'auto', flexShrink: 0 }}>{timeAgo}</span>
          </div>

          <div style={{ fontSize: 11, color: 'var(--ls-purple)', fontWeight: 500, marginBottom: 4 }}>
            {typeLabel}{msg.product_name ? ` — ${msg.product_name}` : ''}
          </div>

          {msg.message && (
            <div style={{ fontSize: 12, color: 'var(--ls-text-muted)', lineHeight: 1.5, marginBottom: 2 }}>
              {msg.message}
            </div>
          )}

          <ContactLinks phone={phone || msg.client_contact || undefined} email={email} name={msg.client_name} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
            {msg.client_id && (
              <Link to={`/clients/${msg.client_id}`}
                style={{ fontSize: 11, padding: '5px 12px', borderRadius: 8, background: 'var(--ls-surface2)', border: '1px solid var(--ls-border)', color: 'var(--ls-text-muted)', textDecoration: 'none' }}>
                Voir la fiche
              </Link>
            )}
            {isUnread && (
              <button onClick={onMarkRead}
                style={{ fontSize: 11, padding: '5px 12px', borderRadius: 8, background: 'rgba(124,58,237,0.08)', border: 'none', color: 'var(--ls-purple)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                ✓ Lu
              </button>
            )}
            <button onClick={onDelete}
              style={{ fontSize: 11, padding: '5px 12px', borderRadius: 8, background: 'rgba(220,38,38,0.06)', border: 'none', color: 'var(--ls-coral)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', marginLeft: 'auto' }}>
              Supprimer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function MessagesPage() {
  const { clientMessages, markMessageRead, deleteMessage, getClientById } = useAppContext()
  const [tab, setTab] = useState<Tab>('products')

  const productMessages = clientMessages.filter(m => m.message_type === 'product_request')
  const recoMessages = clientMessages.filter(m => m.message_type === 'recommendation')
  const activeMessages = tab === 'products' ? productMessages : recoMessages
  const unreadProducts = productMessages.filter(m => !m.read).length
  const unreadRecos = recoMessages.filter(m => !m.read).length

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="Communication"
        title="Messages clients"
        description="Demandes de produits et recommandations reçues depuis les rapports et bilans."
      />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, background: 'var(--ls-surface)', border: '1px solid var(--ls-border)', borderRadius: 12, padding: 4, width: 'fit-content' }}>
        {([
          { key: 'products' as Tab, label: 'Demandes produits', count: unreadProducts, icon: '🛒' },
          { key: 'recommendations' as Tab, label: 'Recommandations', count: unreadRecos, icon: '👥' },
        ]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 13, fontFamily: 'DM Sans, sans-serif',
              fontWeight: tab === t.key ? 600 : 400,
              background: tab === t.key ? 'var(--ls-surface2)' : 'transparent',
              color: tab === t.key ? 'var(--ls-text)' : 'var(--ls-text-muted)',
              display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
            }}>
            {t.icon} {t.label}
            {t.count > 0 && (
              <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 10, background: 'rgba(124,58,237,0.12)', color: 'var(--ls-purple)', fontWeight: 700 }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Messages */}
      {activeMessages.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.4 }}>{tab === 'products' ? '🛒' : '👥'}</div>
            <div style={{ fontSize: 14, color: 'var(--ls-text-muted)', marginBottom: 4 }}>
              {tab === 'products' ? 'Aucune demande de produit' : 'Aucune recommandation'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ls-text-hint)' }}>
              Les messages apparaîtront ici quand un client interagira avec son rapport.
            </div>
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {activeMessages.map(msg => {
            const client = getClientById(msg.client_id)
            return (
              <MessageCard
                key={msg.id}
                msg={msg}
                phone={client?.phone}
                email={client?.email}
                onMarkRead={() => void markMessageRead(msg.id)}
                onDelete={() => void deleteMessage(msg.id)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "À l'instant"
  if (mins < 60) return `${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}j`
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
