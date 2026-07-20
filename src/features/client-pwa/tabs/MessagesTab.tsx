// ============================================================================
// PWA v2 — Onglet Messages (chantier refonte identité PWA client 2026-07)
// ----------------------------------------------------------------------------
// Chat coach↔client 100% fonctionnel : mêmes RPC que l'ancien ClientChatTab
// (get_client_messages_by_token / insert_client_message_by_token + XP), habillé
// dans la nouvelle identité (bulles coach à gauche, client à droite dégradé
// teal/lime). Polling 15s.
// ============================================================================
import { useCallback, useEffect, useRef, useState } from 'react'
import { getSupabaseClient } from '../../../services/supabaseClient'

const SORA = "'Sora', sans-serif"
const MONO = "'JetBrains Mono', monospace"

interface ChatMessage {
  id: string
  sender: 'client' | 'coach'
  message: string | null
  message_type: string
  product_name: string | null
  created_at: string
}
export interface MessagesTabProps {
  token: string
  coachName: string
}

export function MessagesTab({ token, coachName }: MessagesTabProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const refresh = useCallback(async () => {
    try {
      const sb = await getSupabaseClient()
      if (!sb) return
      const { data, error: rpcErr } = await sb.rpc('get_client_messages_by_token', { p_token: token })
      if (rpcErr) { setError(rpcErr.message); return }
      setMessages((data ?? []) as ChatMessage[])
      setError(null)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void refresh()
    const id = window.setInterval(() => void refresh(), 15000)
    return () => window.clearInterval(id)
  }, [refresh])

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length])

  async function handleSend() {
    const text = input.trim()
    if (!text) return
    setSending(true)
    setError(null)
    try {
      const sb = await getSupabaseClient()
      if (!sb) throw new Error('Service indisponible')
      const { error: rpcErr } = await sb.rpc('insert_client_message_by_token', { p_token: token, p_message: text, p_message_type: 'general' })
      if (rpcErr) throw new Error(rpcErr.message)
      if (token) {
        const xpMod = await import('../../../features/client-xp/useClientXp')
        void xpMod.recordClientXp(token, 'message_sent')
      }
      setInput('')
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Envoi impossible')
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, animation: 'lbRise .4s ease both', minHeight: 'calc(100dvh - 240px)' }}>
      <div style={{ textAlign: 'center', fontFamily: MONO, fontSize: 10, letterSpacing: '.1em', color: 'var(--dim)', textTransform: 'uppercase', padding: 4 }}>Conversation avec {coachName}</div>

      <div className="lb-scroll" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, marginTop: 30 }}>Chargement…</div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: 30, padding: '24px 16px', background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)' }}>
            <div style={{ fontFamily: SORA, fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Écris ton premier message !</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>{coachName} te répondra dès que possible.</div>
          </div>
        ) : (
          messages.map((m) => {
            const isCoach = m.sender === 'coach'
            return (
              <div key={m.id} style={{ alignSelf: isCoach ? 'flex-start' : 'flex-end', maxWidth: '82%', background: isCoach ? 'var(--surface)' : 'linear-gradient(135deg,color-mix(in srgb,var(--teal) 22%,var(--surface)),color-mix(in srgb,var(--lime) 14%,var(--surface)))', border: `1px solid ${isCoach ? 'var(--border)' : 'color-mix(in srgb,var(--teal) 26%,transparent)'}`, borderRadius: isCoach ? '16px 16px 16px 5px' : '16px 16px 5px 16px', padding: '12px 14px' }}>
                {isCoach && <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--teal)', marginBottom: 5 }}>{coachName} · Coach</div>}
                {m.product_name && <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--muted)', marginBottom: 4 }}>{m.product_name}</div>}
                <div style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.message}</div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {error && <div style={{ padding: '8px 12px', borderRadius: 10, background: 'color-mix(in srgb,var(--coral) 12%,transparent)', color: 'var(--coral)', fontSize: 12 }}>{error}</div>}

      <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '7px 8px 7px 15px' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend() } }}
          disabled={sending}
          placeholder={`Écris à ${coachName}…`}
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 14, fontFamily: "'Inter'" }}
        />
        <button onClick={() => void handleSend()} disabled={sending || !input.trim()} style={{ width: 38, height: 38, flex: 'none', borderRadius: 10, border: 'none', background: sending || !input.trim() ? 'var(--surface2)' : 'var(--lime)', cursor: sending || !input.trim() ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={sending || !input.trim() ? 'var(--muted)' : '#0a0c0a'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" /></svg>
        </button>
      </div>
    </div>
  )
}
