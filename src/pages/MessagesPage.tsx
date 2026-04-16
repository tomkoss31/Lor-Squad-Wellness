import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import { Card } from '../components/ui/Card'
import { PageHeading } from '../components/ui/PageHeading'
import type { ClientMessage } from '../types/domain'

type Tab = 'products' | 'recommendations'

function ContactPopup({ contact, name, onClose }: { contact: string; name: string; onClose: () => void }) {
  const msg = encodeURIComponent(`Bonjour ${name}, suite à votre intérêt pour Lor'Squad Wellness, je me permets de vous contacter.`)
  const isPhone = /[\d+]/.test(contact)
  const cleanPhone = contact.replace(/[^\d+]/g, '')

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'var(--ls-surface)', borderRadius: 16, padding: 24, maxWidth: 360, width: '100%', border: '1px solid var(--ls-border)' }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--ls-text)', marginBottom: 4 }}>
          Contacter {name}
        </div>
        <div style={{ fontSize: 13, color: 'var(--ls-text-muted)', marginBottom: 6 }}>
          {contact}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ls-text-hint)', marginBottom: 20 }}>
          Choisis le canal pour envoyer ton message
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {isPhone && (
            <a href={`https://wa.me/${cleanPhone}?text=${msg}`} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 10, background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.2)', textDecoration: 'none', color: '#16A34A', fontSize: 13, fontWeight: 600 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492l4.623-1.46A11.932 11.932 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818c-2.168 0-4.18-.587-5.918-1.608l-.424-.252-2.742.866.834-2.685-.278-.442A9.798 9.798 0 012.182 12c0-5.418 4.4-9.818 9.818-9.818S21.818 6.582 21.818 12 17.418 21.818 12 21.818z"/></svg>
              WhatsApp
            </a>
          )}
          {isPhone && (
            <a href={`https://t.me/+${cleanPhone}`} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 10, background: 'rgba(0,136,204,0.08)', border: '1px solid rgba(0,136,204,0.2)', textDecoration: 'none', color: '#0088CC', fontSize: 13, fontWeight: 600 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.492-1.302.486-.429-.008-1.252-.242-1.865-.442-.751-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.099-.002.321.023.465.141.12.098.153.229.168.327.016.098.036.322.02.496z"/></svg>
              Telegram
            </a>
          )}
          {isPhone && (
            <a href={`sms:${cleanPhone}?body=${msg}`}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 10, background: 'var(--ls-surface2)', border: '1px solid var(--ls-border)', textDecoration: 'none', color: 'var(--ls-text-muted)', fontSize: 13, fontWeight: 600 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              SMS
            </a>
          )}
          {contact.includes('@') && (
            <a href={`mailto:${contact}?subject=${encodeURIComponent("Lor'Squad Wellness — Suite à votre intérêt")}&body=${msg}`}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 10, background: 'var(--ls-surface2)', border: '1px solid var(--ls-border)', textDecoration: 'none', color: 'var(--ls-text-muted)', fontSize: 13, fontWeight: 600 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              Email
            </a>
          )}
          {isPhone && (
            <a href={`tel:${cleanPhone}`}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 10, background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', textDecoration: 'none', color: 'var(--ls-gold)', fontSize: 13, fontWeight: 600 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              Appeler
            </a>
          )}
        </div>

        <button onClick={onClose}
          style={{ width: '100%', padding: 11, borderRadius: 10, border: '1px solid var(--ls-border)', background: 'transparent', color: 'var(--ls-text-muted)', fontFamily: 'DM Sans, sans-serif', fontSize: 13, cursor: 'pointer' }}>
          Fermer
        </button>
      </div>
    </div>
  )
}

function MessageCard({ msg, onMarkRead, onContact, onDelete }: { msg: ClientMessage; onMarkRead: () => void; onContact: () => void; onDelete: () => void }) {
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
            <div style={{ fontSize: 12, color: 'var(--ls-text-muted)', lineHeight: 1.5, marginBottom: 6 }}>
              {msg.message}
            </div>
          )}

          {msg.client_contact && (() => {
            const contact = msg.client_contact ?? ''
            const isPhone = /[\d+]/.test(contact)
            const cleanPhone = contact.replace(/[^\d+]/g, '')
            const name = msg.client_name
            const pre = encodeURIComponent(`Bonjour ${name}, suite à votre intérêt pour Lor'Squad Wellness.`)
            return (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--ls-text-hint)', marginBottom: 6 }}>📱 {contact}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {isPhone && (
                    <a href={`https://wa.me/${cleanPhone}?text=${pre}`} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 10, padding: '5px 10px', borderRadius: 7, background: 'rgba(37,211,102,0.1)', color: '#16A34A', textDecoration: 'none', fontWeight: 600 }}>
                      WhatsApp
                    </a>
                  )}
                  {isPhone && (
                    <a href={`https://t.me/+${cleanPhone}`} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 10, padding: '5px 10px', borderRadius: 7, background: 'rgba(0,136,204,0.1)', color: '#0088CC', textDecoration: 'none', fontWeight: 600 }}>
                      Telegram
                    </a>
                  )}
                  {isPhone && (
                    <a href={`sms:${cleanPhone}?body=${pre}`}
                      style={{ fontSize: 10, padding: '5px 10px', borderRadius: 7, background: 'var(--ls-surface2)', color: 'var(--ls-text-muted)', textDecoration: 'none', fontWeight: 500 }}>
                      SMS
                    </a>
                  )}
                  {isPhone && (
                    <a href={`tel:${cleanPhone}`}
                      style={{ fontSize: 10, padding: '5px 10px', borderRadius: 7, background: 'rgba(201,168,76,0.08)', color: 'var(--ls-gold)', textDecoration: 'none', fontWeight: 600 }}>
                      Appeler
                    </a>
                  )}
                  {contact.includes('@') && (
                    <a href={`mailto:${contact}?subject=${encodeURIComponent("Lor'Squad Wellness")}&body=${pre}`}
                      style={{ fontSize: 10, padding: '5px 10px', borderRadius: 7, background: 'var(--ls-surface2)', color: 'var(--ls-text-muted)', textDecoration: 'none', fontWeight: 500 }}>
                      Email
                    </a>
                  )}
                  <button onClick={onContact}
                    style={{ fontSize: 10, padding: '5px 10px', borderRadius: 7, border: '1px solid var(--ls-border)', background: 'transparent', color: 'var(--ls-text-hint)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                    Plus…
                  </button>
                </div>
              </div>
            )
          })()}

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
  const { clientMessages, markMessageRead, deleteMessage } = useAppContext()
  const [tab, setTab] = useState<Tab>('products')
  const [contactTarget, setContactTarget] = useState<{ contact: string; name: string } | null>(null)

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
          {activeMessages.map(msg => (
            <MessageCard
              key={msg.id}
              msg={msg}
              onMarkRead={() => void markMessageRead(msg.id)}
              onDelete={() => void deleteMessage(msg.id)}
              onContact={() => msg.client_contact && setContactTarget({ contact: msg.client_contact, name: msg.client_name })}
            />
          ))}
        </div>
      )}

      {/* Contact Popup */}
      {contactTarget && (
        <ContactPopup
          contact={contactTarget.contact}
          name={contactTarget.name}
          onClose={() => setContactTarget(null)}
        />
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
