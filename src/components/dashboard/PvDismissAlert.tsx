import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

interface PvAlertClient {
  id: string
  name: string
  program: string
  overdueDays: number
}

interface PvDismissAlertProps {
  clients: PvAlertClient[]
}

const STORAGE_KEY = 'lor-squad-pv-dismissed-v1'

function getDismissed(): Record<string, boolean> {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : {} } catch { return {} }
}

function saveDismissed(data: Record<string, boolean>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) } catch { /* ignore */ }
}

export function PvDismissAlert({ clients }: PvDismissAlertProps) {
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({})
  const [globalDismissed, setGlobalDismissed] = useState(false)

  useEffect(() => { setDismissed(getDismissed()) }, [])

  const dismissOne = (clientId: string) => {
    const next = { ...dismissed, [clientId]: true }; setDismissed(next); saveDismissed(next)
  }
  const dismissAll = () => {
    const next: Record<string, boolean> = {}; clients.forEach(c => { next[c.id] = true }); setDismissed(next); saveDismissed(next); setGlobalDismissed(true)
  }

  const visible = clients.filter(c => !dismissed[c.id])
  if (globalDismissed || visible.length === 0) return null

  return (
    <div style={{ background: 'var(--ls-surface)', border: '1px solid rgba(251,113,133,0.25)', borderRadius: 12, padding: 16, marginBottom: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FB7185" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 13, color: '#FB7185' }}>Réassorts à prévoir</span>
        <span style={{ fontSize: 10, color: 'var(--ls-text-hint)', marginLeft: 2 }}>{visible.length} client{visible.length > 1 ? 's' : ''} dépassé{visible.length > 1 ? 's' : ''}</span>
        <button onClick={dismissAll} style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--ls-text-hint)', background: 'rgba(128,128,128,0.06)', border: 'none', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>× Ignorer tout</button>
      </div>
      {visible.map((client, i) => {
        const initials = client.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
        return (
          <div key={client.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: i > 0 ? '1px solid rgba(128,128,128,0.08)' : 'none' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: 'rgba(251,113,133,0.12)', color: '#FB7185', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, fontFamily: 'Syne, sans-serif' }}>{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ls-text)' }}>{client.name}</div>
              <div style={{ fontSize: 11, color: '#FB7185', marginTop: 1 }}>{client.program} · dépassé de {client.overdueDays} j</div>
            </div>
            <Link to="/pv" style={{ fontSize: 11, padding: '4px 12px', borderRadius: 7, background: 'rgba(251,113,133,0.1)', color: '#FB7185', textDecoration: 'none', fontWeight: 500, flexShrink: 0 }}>Ouvrir</Link>
            <button onClick={() => dismissOne(client.id)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 7, background: 'rgba(128,128,128,0.06)', color: 'var(--ls-text-hint)', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', flexShrink: 0 }}>Ignorer</button>
          </div>
        )
      })}
    </div>
  )
}
