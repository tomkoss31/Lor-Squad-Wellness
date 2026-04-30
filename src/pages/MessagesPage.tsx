import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import { useGlobalView } from '../hooks/useGlobalView'
// GlobalViewToggle retire 2026-04-29 (toggle inutile en haut de page)
import { Card } from '../components/ui/Card'
import { LegalFooter } from '../components/ui/LegalFooter'
// PageHeading remplace par hero premium (2026-04-29)
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

  // Premium V2 (2026-04-29) — gradient subtil quand unread, hover lift,
  // avatar gradient purple/teal premium.
  const isHot = isUnread && !isArchived;

  return (
    <div
      className="ls-msg-card"
      style={{
        position: 'relative',
        background: isHot
          ? 'linear-gradient(135deg, color-mix(in srgb, var(--ls-purple) 7%, var(--ls-surface)) 0%, var(--ls-surface) 60%)'
          : 'var(--ls-surface2)',
        border: `0.5px solid ${isHot ? 'color-mix(in srgb, var(--ls-purple) 30%, var(--ls-border))' : 'var(--ls-border)'}`,
        borderRadius: 16,
        padding: '14px 16px 14px 18px',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
        opacity: isArchived ? 0.55 : isResolved ? 0.78 : 1,
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        if (!isArchived) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = isHot
            ? '0 8px 22px -10px rgba(124,58,237,0.30)'
            : '0 4px 12px -6px rgba(0,0,0,0.08)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Border-left gradient si unread */}
      {isHot ? (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 4,
            background: 'linear-gradient(180deg, #C084FC 0%, #7C3AED 100%)',
            borderRadius: '16px 0 0 16px',
          }}
        />
      ) : null}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 12, flexShrink: 0,
          background: isHot
            ? 'linear-gradient(135deg, #C084FC 0%, #7C3AED 100%)'
            : 'var(--ls-surface2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 800, fontFamily: 'Syne, serif',
          color: isHot ? 'white' : 'var(--ls-text-hint)',
          letterSpacing: '-0.02em',
          boxShadow: isHot ? '0 2px 8px rgba(124,58,237,0.30)' : 'none',
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

  // Gradient time-of-day teinte purple (messagerie = communication = purple)
  const heroHour = new Date().getHours();
  const heroGradient = (() => {
    if (heroHour >= 5 && heroHour < 8)
      return { primary: "#FFB088", secondary: "#C084FC", tertiary: "#7C3AED", glow: "rgba(192,132,252,0.30)" };
    if (heroHour >= 8 && heroHour < 14)
      return { primary: "#C084FC", secondary: "#A78BFA", tertiary: "#7C3AED", glow: "rgba(124,58,237,0.28)" };
    if (heroHour >= 14 && heroHour < 17)
      return { primary: "#A78BFA", secondary: "#7C3AED", tertiary: "#5B21B6", glow: "rgba(124,58,237,0.30)" };
    if (heroHour >= 17 && heroHour < 20)
      return { primary: "#FF6B6B", secondary: "#C084FC", tertiary: "#7C3AED", glow: "rgba(192,132,252,0.30)" };
    if (heroHour >= 20 && heroHour < 23)
      return { primary: "#C084FC", secondary: "#7C3AED", tertiary: "#A78BFA", glow: "rgba(124,58,237,0.32)" };
    return { primary: "#A5B4FC", secondary: "#818CF8", tertiary: "#7C3AED", glow: "rgba(165,180,252,0.30)" };
  })();
  const totalUnread = unreadClients + unreadProducts + unreadRecos;
  void globalView; // var deja declaree en haut, on l'utilise plus avec le toggle UI

  return (
    <div className="space-y-5">
      {/* Hero MESSAGES PREMIUM V2 (2026-04-29) — gradient time-of-day purple */}
      <style>{`
        @keyframes ls-msg-hero-mesh {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-10px, 6px) scale(1.05); }
          100% { transform: translate(8px, -4px) scale(1); }
        }
        @keyframes ls-msg-hero-shine {
          0%, 100% { transform: translateX(-50%); opacity: 0; }
          50% { transform: translateX(150%); opacity: 0.6; }
        }
        @keyframes ls-msg-cta-glow {
          0%, 100% { box-shadow: 0 4px 16px ${heroGradient.glow}; }
          50% { box-shadow: 0 6px 26px ${heroGradient.glow}, 0 0 0 4px color-mix(in srgb, ${heroGradient.primary} 14%, transparent); }
        }
        @keyframes ls-msg-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes ls-msg-card-in {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes ls-msg-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(124,58,237,0.5); }
          50% { box-shadow: 0 0 0 6px rgba(124,58,237,0); }
        }
        .ls-msg-hero {
          position: relative;
          overflow: hidden;
          padding: 26px 28px;
          border-radius: 24px;
          background: var(--ls-surface);
          border: 0.5px solid var(--ls-border);
          box-shadow: 0 1px 0 0 ${heroGradient.glow}, 0 12px 36px -12px rgba(0,0,0,0.10);
        }
        .ls-msg-mesh {
          position: absolute; inset: -20%; opacity: 0.55; pointer-events: none;
          animation: ls-msg-hero-mesh 22s ease-in-out infinite alternate;
          background:
            radial-gradient(circle at 0% 0%, ${heroGradient.glow} 0%, transparent 45%),
            radial-gradient(circle at 100% 100%, ${heroGradient.glow} 0%, transparent 50%),
            radial-gradient(circle at 100% 0%, color-mix(in srgb, ${heroGradient.tertiary} 25%, transparent) 0%, transparent 60%);
        }
        .ls-msg-shine {
          position: absolute; top: 0; height: 100%; width: 50%; left: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent);
          animation: ls-msg-hero-shine 9s ease-in-out infinite;
          pointer-events: none;
        }
        .ls-msg-cta {
          position: relative;
          background: linear-gradient(135deg, ${heroGradient.primary} 0%, ${heroGradient.secondary} 100%);
          color: white !important;
          border: none !important;
          padding: 14px 22px !important;
          border-radius: 12px !important;
          font-size: 14px !important;
          font-weight: 700 !important;
          font-family: "Syne", serif !important;
          letter-spacing: 0.3px;
          cursor: pointer;
          animation: ls-msg-cta-glow 4s ease-in-out infinite;
          transition: transform 0.18s ease;
        }
        .ls-msg-cta:hover { transform: translateY(-2px); }
        .ls-msg-stat {
          animation: ls-msg-fade-in 480ms cubic-bezier(0.16, 1, 0.3, 1) both;
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        .ls-msg-stat:hover { transform: translateY(-2px); }
        .ls-msg-stat:nth-child(1) { animation-delay: 50ms; }
        .ls-msg-stat:nth-child(2) { animation-delay: 130ms; }
        .ls-msg-stat:nth-child(3) { animation-delay: 210ms; }
        .ls-msg-card {
          animation: ls-msg-card-in 380ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .ls-msg-unread-dot {
          animation: ls-msg-pulse 2s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .ls-msg-mesh, .ls-msg-shine, .ls-msg-cta, .ls-msg-stat,
          .ls-msg-card, .ls-msg-unread-dot {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>

      <div className="ls-msg-hero">
        <div className="ls-msg-mesh" aria-hidden="true" />
        <div className="ls-msg-shine" aria-hidden="true" />

        <div style={{ position: "relative", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, flexWrap: "wrap", marginBottom: 18 }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div
              style={{
                fontSize: 10,
                letterSpacing: 2,
                textTransform: "uppercase",
                fontWeight: 700,
                color: heroGradient.secondary,
                marginBottom: 6,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background: heroGradient.primary,
                  boxShadow: `0 0 8px ${heroGradient.glow}`,
                }}
              />
              Messagerie · {totalUnread} non lu{totalUnread > 1 ? "s" : ""}
            </div>
            <h1
              style={{
                fontFamily: "Syne, serif",
                fontSize: 32,
                fontWeight: 800,
                color: "var(--ls-text)",
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              <span
                style={{
                  background: `linear-gradient(135deg, ${heroGradient.primary} 0%, ${heroGradient.secondary} 60%, ${heroGradient.tertiary} 100%)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Tes messages
              </span>{" "}
              💬
            </h1>
            <p
              style={{
                fontSize: 13,
                color: "var(--ls-text-muted)",
                marginTop: 6,
                marginBottom: 0,
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              Demandes clients, produits et recommandations · filtre, traite, archive.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setComposeOpen(true)}
            data-tour-id="messages-compose"
            className="ls-msg-cta"
          >
            ✨ + Démarrer une conversation
          </button>
        </div>

        {/* 3 stats inline dans le hero — data-tour-id pour Academy section Messages */}
        <div
          data-tour-id="messages-tabs"
          style={{
            position: "relative",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 10,
          }}
        >
          {[
            { icon: "📅", label: "Demandes clients", value: unreadClients, total: clientAskMessages.length, color: heroGradient.primary, key: "clients" as Tab },
            { icon: "🛒", label: "Demandes produits", value: unreadProducts, total: productMessages.length, color: heroGradient.secondary, key: "products" as Tab },
            { icon: "👥", label: "Recommandations", value: unreadRecos, total: recoMessages.length, color: heroGradient.tertiary, key: "recommendations" as Tab },
          ].map((s) => {
            const isActive = tab === s.key;
            return (
              <button
                key={s.label}
                type="button"
                onClick={() => setTab(s.key)}
                className="ls-msg-stat"
                style={{
                  background: isActive
                    ? `linear-gradient(135deg, color-mix(in srgb, ${s.color} 18%, var(--ls-surface)) 0%, var(--ls-surface) 100%)`
                    : "color-mix(in srgb, var(--ls-surface) 95%, transparent)",
                  border: `0.5px solid color-mix(in srgb, ${s.color} ${isActive ? 50 : 25}%, var(--ls-border))`,
                  borderRadius: 14,
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "DM Sans, sans-serif",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  boxShadow: isActive ? `0 6px 18px -8px ${heroGradient.glow}` : "none",
                  position: "relative",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.boxShadow = `0 6px 18px -8px ${heroGradient.glow}`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.boxShadow = "none";
                  }
                }}
              >
                <span style={{ fontSize: 22 }}>{s.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 9, letterSpacing: 1.4, textTransform: "uppercase", color: "var(--ls-text-hint)", fontWeight: 700 }}>
                    {s.label}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "Syne, serif",
                        fontSize: 22,
                        fontWeight: 800,
                        color: s.color,
                        lineHeight: 1,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {s.value}
                    </span>
                    <span style={{ fontSize: 10, color: "var(--ls-text-hint)" }}>
                      / {s.total}
                    </span>
                  </div>
                </div>
                {s.value > 0 && !isActive ? (
                  <span
                    className="ls-msg-unread-dot"
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      background: s.color,
                      flexShrink: 0,
                    }}
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {composeOpen ? <StartConversationModal onClose={() => setComposeOpen(false)} /> : null}

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
      <LegalFooter />
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
