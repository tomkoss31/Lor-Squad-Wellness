import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import { useGlobalView } from '../hooks/useGlobalView'
import { GlobalViewToggle } from '../components/ui/GlobalViewToggle'
import { Card } from '../components/ui/Card'
import { PageHeading } from '../components/ui/PageHeading'
import { ReplyMessageModal } from '../components/messaging/ReplyMessageModal'
import { StartConversationModal } from '../components/messages/StartConversationModal'
import {
  MessageFilters,
  readFiltersFromSearch,
  writeFiltersToSearch,
  type MessageFiltersState,
} from '../components/messaging/MessageFilters'
import { useMessageActions } from '../hooks/useMessageActions'
import { getInitials } from '../lib/utils/getInitials'
import type { ClientMessage } from '../types/domain'

// Chantier Messagerie bidirectionnelle (2026-04-22) : +tab 'clients'.
// Chantier Messagerie finalisée (2026-04-23) : filtres + actions + persist URL.
type Tab = 'products' | 'recommendations' | 'clients'

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

function typeBadge(type: ClientMessage['message_type']): { label: string; color: string; bg: string } {
  switch (type) {
    case 'product_request':
      return { label: '🛒 Demande produit', color: '#B8922A', bg: 'rgba(184,146,42,0.12)' }
    case 'recommendation':
      return { label: '👥 Recommandation', color: '#7C3AED', bg: 'rgba(124,58,237,0.12)' }
    case 'rdv_request':
      return { label: '📅 Modification RDV', color: '#0D9488', bg: 'rgba(13,148,136,0.12)' }
    case 'coach_reply':
      return { label: '↩️ Réponse envoyée', color: '#0F6E56', bg: 'rgba(15,110,86,0.12)' }
    default:
      return { label: '💬 Message', color: '#6B7280', bg: 'var(--ls-surface2)' }
  }
}

function MessageCard({
  msg,
  phone,
  email,
  onMarkRead,
  onDelete,
  onReply,
  onArchive,
  onResolve,
  onViewConversation,
}: {
  msg: ClientMessage
  phone?: string
  email?: string
  onMarkRead: () => void
  onDelete: () => void
  onReply: () => void
  onArchive: () => void
  onResolve: () => void
  onViewConversation: () => void
}) {
  const isUnread = !msg.read
  const isArchived = !!msg.archived_at
  const isResolved = !!msg.resolved_at
  const badge = typeBadge(msg.message_type)
  const timeAgo = getTimeAgo(msg.created_at)

  return (
    <div style={{
      background: isUnread && !isArchived ? 'var(--ls-surface)' : 'var(--ls-surface2)',
      border: `1px solid ${isUnread && !isArchived ? 'rgba(124,58,237,0.2)' : 'var(--ls-border)'}`,
      borderLeft: isUnread && !isArchived ? '3px solid var(--ls-purple)' : '1px solid var(--ls-border)',
      borderRadius: isUnread && !isArchived ? '0 12px 12px 0' : 12,
      padding: '14px 16px',
      transition: 'all 0.15s',
      opacity: isArchived ? 0.55 : isResolved ? 0.78 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: isUnread && !isArchived ? 'rgba(124,58,237,0.12)' : 'var(--ls-surface2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, fontFamily: 'Syne, sans-serif',
          color: isUnread && !isArchived ? 'var(--ls-purple)' : 'var(--ls-text-hint)',
        }}>
          {getInitials(msg.client_name)}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: isUnread ? 600 : 400, color: 'var(--ls-text)' }}>
              {msg.client_name}
            </span>
            {isResolved ? (
              <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 8, background: 'rgba(15,110,86,0.1)', color: '#0F6E56', fontWeight: 700 }}>
                ✓ Traité
              </span>
            ) : null}
            {isArchived ? (
              <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 8, background: 'var(--ls-surface2)', color: 'var(--ls-text-hint)', fontWeight: 700 }}>
                Archivé
              </span>
            ) : null}
            <span style={{ fontSize: 10, color: 'var(--ls-text-hint)', marginLeft: 'auto', flexShrink: 0 }}>{timeAgo}</span>
          </div>

          <div style={{
            fontSize: 11, fontWeight: 500, marginBottom: 4,
            display: 'inline-block', padding: '2px 8px', borderRadius: 6,
            color: badge.color, background: badge.bg,
          }}>
            {badge.label}{msg.product_name ? ` — ${msg.product_name}` : ''}
          </div>

          {msg.message && (
            <div style={{ fontSize: 12, color: 'var(--ls-text-muted)', lineHeight: 1.5, marginTop: 4 }}>
              {msg.message}
            </div>
          )}

          <ContactLinks phone={phone || msg.client_contact || undefined} email={email} name={msg.client_name} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            <button onClick={onViewConversation}
              style={{ fontSize: 11, padding: '5px 12px', borderRadius: 8, background: 'rgba(13,148,136,0.1)', border: '1px solid rgba(13,148,136,0.25)', color: '#0F6E56', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
              💬 Conversation
            </button>
            <button onClick={onReply}
              style={{ fontSize: 11, padding: '5px 12px', borderRadius: 8, background: 'var(--ls-gold)', border: 'none', color: '#0B0D11', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}>
              Répondre
            </button>
            {msg.client_id && (
              <Link to={`/clients/${msg.client_id}`}
                style={{ fontSize: 11, padding: '5px 12px', borderRadius: 8, background: 'var(--ls-surface2)', border: '1px solid var(--ls-border)', color: 'var(--ls-text-muted)', textDecoration: 'none' }}>
                Fiche
              </Link>
            )}
            {isUnread && !isArchived && (
              <button onClick={onMarkRead}
                style={{ fontSize: 11, padding: '5px 12px', borderRadius: 8, background: 'rgba(124,58,237,0.08)', border: 'none', color: 'var(--ls-purple)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                ✓ Lu
              </button>
            )}
            {!isResolved ? (
              <button onClick={onResolve}
                style={{ fontSize: 11, padding: '5px 12px', borderRadius: 8, background: 'rgba(15,110,86,0.08)', border: 'none', color: '#0F6E56', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                ✓ Traité
              </button>
            ) : null}
            {!isArchived ? (
              <button onClick={onArchive}
                style={{ fontSize: 11, padding: '5px 12px', borderRadius: 8, background: 'var(--ls-surface2)', border: 'none', color: 'var(--ls-text-muted)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                📂 Archiver
              </button>
            ) : null}
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

function normalizeText(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function filterAndSort(messages: ClientMessage[], filters: MessageFiltersState): ClientMessage[] {
  let list = messages

  // Status filter
  switch (filters.status) {
    case 'unread':
      list = list.filter(m => !m.read && !m.archived_at)
      break
    case 'replied':
      // Messages pour lesquels on a répondu : le même client a un coach_reply postérieur.
      // Approximation simple : on affiche ceux marqués comme lus mais non résolus/archivés.
      list = list.filter(m => m.read && !m.archived_at && !m.resolved_at)
      break
    case 'resolved':
      list = list.filter(m => !!m.resolved_at && !m.archived_at)
      break
    case 'archived':
      list = list.filter(m => !!m.archived_at)
      break
    case 'all':
    default:
      // Par défaut on cache quand même les archivés pour ne pas noyer l'inbox.
      list = filters.status === 'all' ? list.filter(m => !m.archived_at) : list
      break
  }

  // Search
  const q = normalizeText(filters.query.trim())
  if (q.length > 0) {
    list = list.filter(m => {
      const haystack = normalizeText(`${m.client_name} ${m.message ?? ''} ${m.product_name ?? ''}`)
      return haystack.includes(q)
    })
  }

  // Sort
  list = [...list].sort((a, b) => {
    const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    return filters.sort === 'recent' ? diff : -diff
  })

  return list
}

export function MessagesPage() {
  const { clientMessages, markMessageRead, deleteMessage, getClientById, currentUser } = useAppContext()
  const actions = useMessageActions()
  const navigate = useNavigate()
  const location = useLocation()

  const [tab, setTab] = useState<Tab>('clients')
  const [replyTarget, setReplyTarget] = useState<ClientMessage | null>(null)
  const [filters, setFilters] = useState<MessageFiltersState>(() => readFiltersFromSearch(location.search))
  const [composeOpen, setComposeOpen] = useState(false)

  // Chantier 5 bugs (2026-04-24) : admin voit ses propres messages
  // clients par défaut. Toggle partagé Vue globale.
  const [globalView] = useGlobalView()
  const isAdmin = currentUser?.role === 'admin'
  const applyPersonalScope = isAdmin && !globalView

  // Sync filters → URL
  useEffect(() => {
    const newSearch = writeFiltersToSearch(filters)
    if (newSearch !== location.search) {
      navigate({ pathname: location.pathname, search: newSearch }, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  const incoming = useMemo(
    () => {
      const base = clientMessages.filter(m => (m.sender ?? 'client') === 'client')
      // Admin en vue perso → filtre sur les clients dont il est le distributeur
      if (!applyPersonalScope || !currentUser) return base
      return base.filter(m => {
        if (!m.client_id) return false
        const client = getClientById(m.client_id)
        return client?.distributorId === currentUser.id
      })
    },
    [clientMessages, applyPersonalScope, currentUser, getClientById],
  )

  const productMessages = useMemo(() => incoming.filter(m => m.message_type === 'product_request'), [incoming])
  const recoMessages = useMemo(() => incoming.filter(m => m.message_type === 'recommendation'), [incoming])
  const clientAskMessages = useMemo(
    () => incoming.filter(m => m.message_type === 'rdv_request' || m.message_type === 'general'),
    [incoming],
  )

  const baseMessages = tab === 'products' ? productMessages : tab === 'recommendations' ? recoMessages : clientAskMessages
  const activeMessages = useMemo(() => filterAndSort(baseMessages, filters), [baseMessages, filters])

  // Unread counts per tab (ignorant les archivés)
  const unreadProducts = useMemo(() => productMessages.filter(m => !m.read && !m.archived_at).length, [productMessages])
  const unreadRecos = useMemo(() => recoMessages.filter(m => !m.read && !m.archived_at).length, [recoMessages])
  const unreadClients = useMemo(() => clientAskMessages.filter(m => !m.read && !m.archived_at).length, [clientAskMessages])
  const unreadActive = tab === 'products' ? unreadProducts : tab === 'recommendations' ? unreadRecos : unreadClients

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="Communication"
        title="Messagerie"
        description="Demandes clients, produits et recommandations — filtre, traite, archive."
      />

      {/* Chantier Academy refonte (2026-04-27) : CTA Demarrer une conversation
          pour permettre au coach d initier l echange (avant : reactif uniquement). */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={() => setComposeOpen(true)}
          data-tour-id="messages-compose"
          style={{
            background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
            color: "white",
            border: "none",
            padding: "10px 16px",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "DM Sans, sans-serif",
            boxShadow: "0 2px 6px rgba(186,117,23,0.25)",
          }}
        >
          + Démarrer une conversation
        </button>
      </div>
      {composeOpen ? <StartConversationModal onClose={() => setComposeOpen(false)} /> : null}

      {/* Chantier 5 bugs : toggle Vue globale admin */}
      <GlobalViewToggle
        personalLabel="Vue personnelle (mes messages clients)"
        globalLabel="Vue équipe (tous les messages)"
      />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, background: 'var(--ls-surface)', border: '1px solid var(--ls-border)', borderRadius: 12, padding: 4, width: 'fit-content', flexWrap: 'wrap' }}>
        {([
          { key: 'clients' as Tab, label: 'Demandes clients', count: unreadClients, icon: '📅' },
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

      {/* Filtres */}
      <MessageFilters
        state={filters}
        onChange={(patch) => setFilters(s => ({ ...s, ...patch }))}
        unreadCount={unreadActive}
      />

      {/* Messages */}
      {activeMessages.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.4 }}>
              {tab === 'products' ? '🛒' : tab === 'recommendations' ? '👥' : '📅'}
            </div>
            <div style={{ fontSize: 14, color: 'var(--ls-text-muted)', marginBottom: 4 }}>
              {filters.query.trim()
                ? `Aucun résultat pour « ${filters.query} ».`
                : filters.status === 'archived'
                  ? 'Aucun message archivé.'
                  : filters.status === 'resolved'
                    ? 'Aucun message traité.'
                    : tab === 'products'
                      ? 'Aucune demande de produit'
                      : tab === 'recommendations'
                        ? 'Aucune recommandation'
                        : 'Aucune demande client'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ls-text-hint)' }}>
              {filters.query.trim() ? 'Essaie une autre recherche.' : 'Les nouveaux messages apparaîtront ici.'}
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
                onReply={() => setReplyTarget(msg)}
                onArchive={() => void actions.archive(msg.id)}
                onResolve={() => void actions.resolve(msg.id)}
                onViewConversation={() => navigate(`/messagerie/conversation/${msg.id}`)}
              />
            )
          })}
        </div>
      )}

      <ReplyMessageModal
        open={replyTarget !== null}
        onClose={() => setReplyTarget(null)}
        parent={replyTarget}
      />
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
