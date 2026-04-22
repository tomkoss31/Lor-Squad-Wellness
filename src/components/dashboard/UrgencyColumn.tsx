import { Link } from 'react-router-dom'
import { formatDateTime } from '../../lib/calculations'
import { createGoogleCalendarLink } from '../../lib/googleCalendar'
import { getInitials } from '../../lib/utils/getInitials'

interface UrgencyItem {
  id: string
  clientId: string
  clientName: string
  type: string
  dueDate: string
  status: 'pending' | 'scheduled' | 'completed' | 'dismissed'
  programTitle: string
}

interface UrgencyColumnProps {
  title: string
  count: number
  color: string
  icon: React.ReactNode
  items: UrgencyItem[]
  emptyLabel: string
  seeAllLink?: string
  seeAllCount?: number
  onMarkContacted?: (item: UrgencyItem) => void
  onDismiss?: (item: UrgencyItem) => void
}

export function UrgencyColumn({ title, count, color, icon, items, emptyLabel, seeAllLink, seeAllCount, onMarkContacted, onDismiss }: UrgencyColumnProps) {
  const initials = (name: string) => getInitials(name)
  const urgencyKind =
    color === '#FB7185' || color === '#DC2626'
      ? 'urgent'
      : color === '#A78BFA' || color === '#7C3AED'
        ? 'watch'
        : 'planned'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 10, borderBottom: `2px solid ${color}` }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>{icon}</div>
        <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 13, color }}>{title}</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, padding: '2px 8px', borderRadius: 10, background: `${color}15`, color, fontWeight: 600 }}>{count}</span>
      </div>

      {/* Items */}
      {items.length === 0 ? (
        <div style={{ background: 'var(--ls-surface)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: 14, fontSize: 12, color: 'var(--ls-text-hint)', textAlign: 'center' }}>{emptyLabel}</div>
      ) : items.map(item => (
        <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: 0, background: 'var(--ls-surface)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 11, overflow: 'hidden', transition: 'all 0.15s ease' }}>
          <Link to={`/clients/${item.clientId}`} style={{ textDecoration: 'none' }}>
            <div className="dashboard-col-card" data-urgency={urgencyKind} role="presentation" style={{ padding: '12px 14px', cursor: 'pointer', position: 'relative' }}
              onFocus={e => { e.currentTarget.style.background = 'var(--ls-surface2)' }}
              onBlur={e => { e.currentTarget.style.background = 'transparent' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--ls-surface2)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: color, borderRadius: '0 2px 2px 0' }} />
              <div style={{ position: 'absolute', top: 10, right: 10, fontSize: 9, padding: '2px 8px', borderRadius: 10, background: `${color}18`, color, fontWeight: 700, fontFamily: 'DM Sans, sans-serif' }}>
                {item.status === 'pending' ? 'Relance' : 'RDV'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, background: `${color}15`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, fontFamily: 'Syne, sans-serif' }}>{initials(item.clientName)}</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ls-text)', paddingRight: 48, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.clientName}</div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--ls-text-muted)', marginBottom: 5 }}>{item.type}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--ls-text-hint)' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {formatDateTime(item.dueDate)}
                {item.status === 'pending' && <span style={{ color: '#FB7185', marginLeft: 4 }}>· En retard</span>}
                {item.status === 'scheduled' && (() => {
                  const due = new Date(item.dueDate)
                  const now = new Date()
                  const diffMs = due.getTime() - now.getTime()
                  const diffDays = diffMs / 86400000
                  const isToday = due.toDateString() === now.toDateString()
                  const isPast = diffMs < 0
                  const isThisWeek = diffDays > 0 && diffDays <= 7
                  const agendaStyle = isPast
                    ? { bg: 'rgba(220,38,38,0.1)', c: 'var(--ls-coral)', bd: 'rgba(220,38,38,0.2)' }
                    : isToday
                      ? { bg: 'rgba(13,148,136,0.1)', c: 'var(--ls-teal)', bd: 'rgba(13,148,136,0.2)' }
                      : isThisWeek
                        ? { bg: 'rgba(201,168,76,0.1)', c: 'var(--ls-gold)', bd: 'rgba(201,168,76,0.2)' }
                        : { bg: 'var(--ls-surface2)', c: 'var(--ls-text-muted)', bd: 'var(--ls-border)' }
                  return (
                  <a
                    href={createGoogleCalendarLink({
                      title: `RDV ${item.clientName} — Lor'Squad Wellness, La Base Verdun`,
                      description: `Type : ${item.type}\nProgramme : ${item.programTitle}\nLor'Squad Wellness — La Base, Verdun`,
                      startDate: due,
                      location: 'La Base Shakes & Drinks, Verdun',
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, background: agendaStyle.bg, border: `1px solid ${agendaStyle.bd}`, borderRadius: 6, padding: '3px 8px', fontSize: 9, color: agendaStyle.c, textDecoration: 'none', flexShrink: 0 }}
                  >
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    Agenda
                  </a>
                  )
                })()}
              </div>
            </div>
          </Link>
          {/* Actions — EN DEHORS du Link */}
          {(onMarkContacted || onDismiss) && (
            <div style={{ display: 'flex', gap: 6, padding: '8px 14px', borderTop: '1px solid var(--ls-border)', background: 'var(--ls-surface)' }}>
              {onMarkContacted && (
                <button onClick={() => onMarkContacted(item)}
                  style={{ fontSize: 10, padding: '6px 12px', borderRadius: 7, border: 'none', background: 'rgba(13,148,136,0.12)', color: 'var(--ls-teal)', cursor: 'pointer', fontWeight: 600, fontFamily: 'DM Sans, sans-serif', minHeight: 32 }}>
                  ✓ Contacté
                </button>
              )}
              {onDismiss && (
                <button onClick={() => onDismiss(item)}
                  style={{ fontSize: 10, padding: '6px 12px', borderRadius: 7, border: 'none', background: 'rgba(148,163,184,0.08)', color: 'var(--ls-text-hint)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', minHeight: 32 }}>
                  Sans suite
                </button>
              )}
            </div>
          )}
        </div>
      ))}

      {seeAllLink && seeAllCount && seeAllCount > 0 && (
        <Link to={seeAllLink} style={{ textAlign: 'center', display: 'block', fontSize: 11, color: '#C9A84C', textDecoration: 'none', padding: '6px 0' }}>
          Voir les {seeAllCount} autres →
        </Link>
      )}
    </div>
  )
}
