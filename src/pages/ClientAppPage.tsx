import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getSupabaseClient } from '../services/supabaseClient'
import { HERBALIFE_PRODUCTS } from '../data/herbalifeCatalog'

const GOOGLE_MAPS_LA_BASE = 'https://www.google.com/maps/place/LA+BASE+Shakes%26Drinks/@49.1619589,5.3840559,17z'

interface ClientAppData {
  client_id: string
  client_first_name: string
  client_last_name: string
  coach_id?: string
  coach_name: string
  coach_whatsapp?: string
  coach_telegram?: string
  coach_phone?: string
  program_title?: string
  assessments_count?: number
  next_follow_up?: string
  metrics_history?: Array<Record<string, number> & { date: string }>
  recommendations?: Array<{ ref?: string; name?: string; shortBenefit?: string }>
  insights?: Array<{ type?: string; title: string; message: string }>
}

const PRODUCT_DESCRIPTIONS: Record<string, string> = {
  formula1: 'Repas nutritionnel complet en shake. Remplace un repas avec tous les nutriments essentiels. À prendre matin ou midi.',
  select: "Boisson protéinée premium multi-sources. Idéale avant ou après l'entraînement.",
  proteines: 'Complément protéique pur à ajouter à vos shakes ou repas. Sans goût ajouté.',
  boissons: "Boisson à base de plantes et d'extraits naturels. Énergie douce et durable sans sucre ajouté.",
  sport: 'Gamme sportive pour optimiser les performances, la récupération et l\'hydratation.',
  complements: 'Compléments nutritionnels ciblés pour soutenir votre programme selon vos besoins spécifiques.',
  complements_enfants: 'Compléments nutritionnels adaptés aux enfants.',
  packs: 'Pack complet regroupant plusieurs produits essentiels à votre programme.',
}

export function ClientAppPage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<ClientAppData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'home' | 'evolution' | 'products' | 'refer'>('home')
  const [referName, setReferName] = useState('')
  const [referContact, setReferContact] = useState('')
  const [referSent, setReferSent] = useState(false)
  const [rdvMessage, setRdvMessage] = useState('')
  const [rdvSent, setRdvSent] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<{ ref: string } | null>(null)

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const link = document.createElement('link')
      link.rel = 'manifest'
      link.href = '/manifest-client.json'
      document.head.appendChild(link)

      const meta = document.createElement('meta')
      meta.name = 'theme-color'
      meta.content = '#B8922A'
      document.head.appendChild(meta)

      const appleMeta = document.createElement('meta')
      appleMeta.name = 'apple-mobile-web-app-capable'
      appleMeta.content = 'yes'
      document.head.appendChild(appleMeta)
    }

    void loadClientData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function loadClientData() {
    try {
      const sb = await getSupabaseClient()
      if (!sb || !token) {
        setLoading(false)
        return
      }

      // 1. Source principale : client_app_accounts (contient TOUT : infos coach + snapshot métriques)
      const { data: appAccount } = await sb
        .from('client_app_accounts')
        .select('*')
        .eq('token', token)
        .maybeSingle()

      if (appAccount) {
        setData(appAccount as ClientAppData)
        setLoading(false)
        return
      }

      // 2. Fallback : ancien lien /recap/:token (si le client utilise ça)
      const { data: recapByToken } = await sb
        .from('client_recaps')
        .select('*')
        .eq('token', token)
        .maybeSingle()
      if (recapByToken) {
        setData(recapByToken as ClientAppData)
      }
    } catch {
      // silencieux
    } finally {
      setLoading(false)
    }
  }

  async function sendReferral() {
    if (!referName || !referContact || !data) return
    try {
      const sb = await getSupabaseClient()
      if (!sb) return
      await sb.from('client_referrals').insert({
        from_client_id: data.client_id,
        from_client_name: `${data.client_first_name} ${data.client_last_name}`,
        coach_id: data.coach_id ?? '',
        referred_name: referName,
        referred_contact: referContact,
      })
      setReferSent(true)
      setReferName('')
      setReferContact('')
    } catch {
      // silencieux
    }
  }

  async function sendRdvChangeRequest() {
    if (!rdvMessage || !data) return
    try {
      const sb = await getSupabaseClient()
      if (!sb) return
      await sb.from('rdv_change_requests').insert({
        client_id: data.client_id,
        coach_id: data.coach_id ?? '',
        client_name: `${data.client_first_name} ${data.client_last_name}`,
        current_rdv: data.next_follow_up,
        message: rdvMessage,
      })
      setRdvSent(true)
      setRdvMessage('')
    } catch {
      // silencieux
    }
  }

  function getGoogleCalendarUrl() {
    if (!data?.next_follow_up) return '#'
    const start = new Date(data.next_follow_up)
    const end = new Date(start.getTime() + 3600000)
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      `RDV Lor'Squad — ${data.client_first_name}`
    )}&dates=${fmt(start)}/${fmt(end)}&location=${encodeURIComponent('La Base Shakes & Drinks, Verdun')}`
  }

  if (loading)
    return (
      <div style={{ minHeight: '100vh', background: '#F4F2EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif', color: '#9CA3AF' }}>
        Chargement...
      </div>
    )

  if (!data)
    return (
      <div style={{ minHeight: '100vh', background: '#F4F2EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif', color: '#DC2626' }}>
        Lien introuvable ou expiré.
      </div>
    )

  const metrics = data.metrics_history ?? []
  const latest = metrics[metrics.length - 1] as (Record<string, number> & { date: string }) | undefined
  const first = metrics[0] as (Record<string, number> & { date: string }) | undefined

  const delta = (field: string) => {
    if (!latest || !first) return null
    const a = latest[field]
    const b = first[field]
    if (typeof a !== 'number' || typeof b !== 'number') return null
    return (a - b).toFixed(1)
  }

  const deltaColor = (val: string | null, inverse = false) => {
    if (!val) return '#9CA3AF'
    const n = parseFloat(val)
    if (n === 0) return '#9CA3AF'
    const good = inverse ? n > 0 : n < 0
    return good ? '#0D9488' : '#DC2626'
  }

  // Match par ref OU par nom (les recaps stockent souvent juste { name, shortBenefit })
  const recoList = data.recommendations ?? []
  const recommendedProducts = HERBALIFE_PRODUCTS.filter((p) =>
    recoList.some((r) => (r.ref && r.ref === p.ref) || (r.name && (r.name === p.name || r.name === p.shortName)))
  )
  const recommendedRefs = new Set(recommendedProducts.map((p) => p.ref))
  const otherProducts = HERBALIFE_PRODUCTS.filter(
    (p) => !recommendedRefs.has(p.ref) && ['formula1', 'boissons', 'proteines'].includes(p.category)
  ).slice(0, 6)

  return (
    <div style={{ minHeight: '100vh', background: '#F4F2EE', fontFamily: 'DM Sans, sans-serif', color: '#111827', paddingBottom: 80 }}>
      {/* HERO */}
      <div style={{ background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 60%, #F4F2EE 100%)', padding: '20px 16px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, background: '#B8922A', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="#fff">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 14, color: '#111827' }}>
              Lor'<span style={{ color: '#B8922A' }}>Squad</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#0D9488' }} />
            <span style={{ fontSize: 10, color: '#0D9488', fontWeight: 500 }}>Coach {data.coach_name}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(184,146,42,0.15)', border: '2px solid rgba(184,146,42,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 16, color: '#B8922A', flexShrink: 0 }}>
            {data.client_first_name?.[0]}
            {data.client_last_name?.[0]}
          </div>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 20, color: '#111827' }}>
              Bonjour {data.client_first_name} !
            </div>
            <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
              {data.program_title ?? 'Programme en cours'} · {data.assessments_count ?? 1} bilan
              {(data.assessments_count ?? 1) > 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 14px' }}>
        {/* ── ONGLET HOME ── */}
        {activeTab === 'home' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {latest && (
              <>
                <div style={{ fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: '#9CA3AF', fontWeight: 500 }}>
                  Ton évolution
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {([
                    { label: 'Poids', field: 'weight', unit: 'kg', color: '#B8922A', inverse: false },
                    { label: 'Masse grasse', field: 'bodyFat', unit: '%', color: '#DC2626', inverse: false },
                    { label: 'Muscle', field: 'muscleMass', unit: 'kg', color: '#0D9488', inverse: true },
                    { label: 'Hydratation', field: 'hydration', unit: '%', color: '#7C3AED', inverse: true },
                  ] as const).map(({ label, field, unit, color, inverse }) => {
                    const d = delta(field)
                    const val = latest[field]
                    return (
                      <div key={field} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 12, padding: '12px', borderTop: `2px solid ${color}` }}>
                        <div style={{ fontSize: 9, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                          {label}
                        </div>
                        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 22, color, lineHeight: 1 }}>
                          {typeof val === 'number' ? val.toFixed(1) : '—'}
                          {unit}
                        </div>
                        {d && first && (
                          <div style={{ fontSize: 10, color: deltaColor(d, inverse), marginTop: 4 }}>
                            {parseFloat(d) > 0 ? '+' : ''}
                            {d}
                            {unit} depuis le début
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* Prochain RDV */}
            {data.next_follow_up && (
              <div style={{ background: 'rgba(13,148,136,0.06)', border: '1px solid rgba(13,148,136,0.15)', borderRadius: 14, padding: 14 }}>
                <div style={{ fontSize: 9, color: '#0D9488', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 }}>
                  Prochain rendez-vous
                </div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 18, color: '#111827', marginBottom: 2 }}>
                  {new Date(data.next_follow_up).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
                <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 12 }}>
                  {new Date(data.next_follow_up).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · La Base — Verdun
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <a href={getGoogleCalendarUrl()} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: '#0D9488', color: '#fff', borderRadius: 9, textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    Google Agenda
                  </a>
                  <a href={GOOGLE_MAPS_LA_BASE} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: 'rgba(13,148,136,0.1)', color: '#0D9488', borderRadius: 9, textDecoration: 'none', fontSize: 12, fontWeight: 500, border: '1px solid rgba(13,148,136,0.2)' }}>
                    Itinéraire
                  </a>
                </div>

                {/* Demande modification RDV */}
                <div style={{ marginTop: 12, borderTop: '1px solid rgba(13,148,136,0.1)', paddingTop: 12 }}>
                  <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 8 }}>Tu veux modifier ce RDV ?</div>
                  {rdvSent ? (
                    <div style={{ fontSize: 12, color: '#0D9488', fontWeight: 500 }}>✓ Message envoyé à {data.coach_name}</div>
                  ) : (
                    <>
                      <textarea value={rdvMessage} onChange={(e) => setRdvMessage(e.target.value)}
                        placeholder="Ex : Je préfèrerais le 30 avril à 14h..." rows={2}
                        style={{ width: '100%', padding: '9px 12px', border: '1px solid rgba(13,148,136,0.2)', borderRadius: 9, fontFamily: 'DM Sans, sans-serif', fontSize: 13, background: '#fff', color: '#111827', resize: 'none', outline: 'none', marginBottom: 8 }} />
                      <button onClick={() => void sendRdvChangeRequest()}
                        style={{ padding: '9px 16px', borderRadius: 9, border: 'none', background: 'rgba(13,148,136,0.1)', color: '#0D9488', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        Envoyer à mon coach
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Contacter le coach */}
            <div style={{ fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: '#9CA3AF', fontWeight: 500 }}>Contacter mon coach</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {data.coach_whatsapp && (
                <a href={`https://wa.me/${data.coach_whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                  style={{ flex: 1, padding: '11px 6px', borderRadius: 10, background: 'rgba(37,211,102,0.1)', color: '#16A34A', fontSize: 12, fontWeight: 600, textAlign: 'center', textDecoration: 'none', border: 'none' }}>
                  WhatsApp
                </a>
              )}
              {data.coach_telegram && (
                <a href={`https://t.me/${data.coach_telegram}`} target="_blank" rel="noopener noreferrer"
                  style={{ flex: 1, padding: '11px 6px', borderRadius: 10, background: 'rgba(0,136,204,0.1)', color: '#0088CC', fontSize: 12, fontWeight: 600, textAlign: 'center', textDecoration: 'none', border: 'none' }}>
                  Telegram
                </a>
              )}
              {data.coach_phone && (
                <a href={`sms:${data.coach_phone}`}
                  style={{ flex: 1, padding: '11px 6px', borderRadius: 10, background: 'rgba(0,0,0,0.05)', color: '#6B7280', fontSize: 12, fontWeight: 500, textAlign: 'center', textDecoration: 'none', border: 'none' }}>
                  SMS
                </a>
              )}
            </div>
          </div>
        )}

        {/* ── ONGLET ÉVOLUTION ── */}
        {activeTab === 'evolution' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: '#9CA3AF', fontWeight: 500 }}>
              Historique de tes bilans
            </div>
            {metrics.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, padding: 40 }}>Pas encore de données d'évolution</div>
            ) : (
              <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 14, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                      {['Date', 'Poids', 'M.Grasse', 'Muscle', 'Eau'].map((h) => (
                        <th key={h} style={{ padding: '10px 8px', textAlign: 'left', fontSize: 9, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.map((row, i) => (
                      <tr key={i} style={{ borderBottom: i < metrics.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none', background: i % 2 === 0 ? '#FAFAF9' : '#fff' }}>
                        <td style={{ padding: '10px 8px', color: '#6B7280', fontSize: 10, whiteSpace: 'nowrap' }}>
                          {new Date(row.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </td>
                        <td style={{ padding: '10px 8px', fontWeight: 600, color: '#B8922A' }}>{row.weight?.toFixed(1)}</td>
                        <td style={{ padding: '10px 8px', color: (row.bodyFat ?? 0) > 25 ? '#DC2626' : '#111827' }}>{row.bodyFat?.toFixed(1)}%</td>
                        <td style={{ padding: '10px 8px', color: '#0D9488' }}>{row.muscleMass?.toFixed(1)}</td>
                        <td style={{ padding: '10px 8px', color: (row.hydration ?? 100) < 50 ? '#DC2626' : '#7C3AED' }}>{row.hydration?.toFixed(0)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Insights */}
            {(data.insights ?? []).length > 0 && (
              <>
                <div style={{ fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: '#9CA3AF', fontWeight: 500, marginTop: 4 }}>
                  Ce qui évolue
                </div>
                {(data.insights ?? []).slice(0, 3).map((insight, i) => {
                  const borderColor = insight.type === 'positive' ? '#0D9488' : insight.type === 'warning' ? '#DC2626' : '#B8922A'
                  return (
                    <div key={i} style={{ background: '#fff', border: `1px solid ${borderColor}20`, borderLeft: `3px solid ${borderColor}`, borderRadius: '0 12px 12px 0', padding: '12px 14px' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: borderColor, marginBottom: 3 }}>{insight.title}</div>
                      <div style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.6 }}>{insight.message}</div>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}

        {/* ── ONGLET PRODUITS ── */}
        {activeTab === 'products' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {recommendedProducts.length > 0 && (
              <>
                <div style={{ fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: '#B8922A', fontWeight: 500 }}>
                  Recommandés pour toi
                </div>
                {recommendedProducts.map((product) => (
                  <div key={product.ref}
                    onClick={() => setSelectedProduct(selectedProduct?.ref === product.ref ? null : { ref: product.ref })}
                    style={{ background: '#fff', border: `1px solid rgba(184,146,42,0.2)`, borderRadius: 14, padding: 14, cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#B8922A', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{product.shortName}</div>
                        <div style={{ fontSize: 11, color: '#9CA3AF' }}>{product.shortBenefit.split('·')[0]}</div>
                      </div>
                      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: '#B8922A' }}>
                        {product.publicPrice.toFixed(2)} €
                      </div>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
                        {selectedProduct?.ref === product.ref ? <polyline points="18 15 12 9 6 15" /> : <polyline points="6 9 12 15 18 9" />}
                      </svg>
                    </div>
                    {selectedProduct?.ref === product.ref && (
                      <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(184,146,42,0.05)', borderRadius: 9, fontSize: 12, color: '#6B7280', lineHeight: 1.7 }}>
                        {PRODUCT_DESCRIPTIONS[product.category] ?? product.shortBenefit}
                        <div style={{ marginTop: 8, fontSize: 11, color: '#B8922A', fontWeight: 500 }}>
                          {product.pv} PV {product.vegan ? '· 🌱 Vegan' : ''}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}

            <div style={{ fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: '#9CA3AF', fontWeight: 500 }}>
              Découvrir d'autres produits
            </div>
            {otherProducts.map((product) => (
              <div key={product.ref}
                onClick={() => setSelectedProduct(selectedProduct?.ref === product.ref ? null : { ref: product.ref })}
                style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 14, padding: 14, cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#9CA3AF', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{product.shortName}</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>{product.shortBenefit.split('·')[0]}</div>
                  </div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, color: '#6B7280' }}>
                    {product.publicPrice.toFixed(2)} €
                  </div>
                </div>
                {selectedProduct?.ref === product.ref && (
                  <div style={{ marginTop: 10, padding: '10px 12px', background: '#F9F8F6', borderRadius: 9, fontSize: 12, color: '#6B7280', lineHeight: 1.7 }}>
                    {PRODUCT_DESCRIPTIONS[product.category] ?? product.shortBenefit}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── ONGLET RECOMMANDER ── */}
        {activeTab === 'refer' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: 'rgba(184,146,42,0.06)', border: '1px solid rgba(184,146,42,0.15)', borderRadius: 14, padding: 16 }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 16, color: '#111827', marginBottom: 6 }}>
                Recommander un ami
              </div>
              <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.7, marginBottom: 14 }}>
                Tu connais quelqu'un qui aimerait améliorer sa forme ? Envoie ses coordonnées à {data.coach_name} directement.
              </div>

              {referSent ? (
                <div style={{ padding: 16, background: 'rgba(13,148,136,0.08)', borderRadius: 12, textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15, color: '#0D9488', marginBottom: 4 }}>Merci !</div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>
                    {data.coach_name} a reçu les coordonnées et va contacter cette personne.
                  </div>
                </div>
              ) : (
                <>
                  <input value={referName} onChange={(e) => setReferName(e.target.value)} placeholder="Prénom de la personne"
                    style={{ width: '100%', padding: '12px 14px', border: '1px solid rgba(184,146,42,0.2)', borderRadius: 10, fontFamily: 'DM Sans, sans-serif', fontSize: 16, background: '#fff', color: '#111827', outline: 'none', marginBottom: 8 }} />
                  <input value={referContact} onChange={(e) => setReferContact(e.target.value)} placeholder="Son numéro ou email"
                    style={{ width: '100%', padding: '12px 14px', border: '1px solid rgba(184,146,42,0.2)', borderRadius: 10, fontFamily: 'DM Sans, sans-serif', fontSize: 16, background: '#fff', color: '#111827', outline: 'none', marginBottom: 12 }} />
                  <button onClick={() => void sendReferral()} disabled={!referName || !referContact}
                    style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: referName && referContact ? '#B8922A' : 'rgba(184,146,42,0.3)', color: '#fff', fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, cursor: referName && referContact ? 'pointer' : 'not-allowed', boxShadow: referName && referContact ? '0 2px 8px rgba(184,146,42,0.25)' : 'none' }}>
                    Envoyer à {data.coach_name}
                  </button>
                </>
              )}
            </div>

            <a href={GOOGLE_MAPS_LA_BASE} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 14, padding: 16, textDecoration: 'none' }}>
              <div style={{ width: 36, height: 36, background: 'rgba(184,146,42,0.1)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 18 }}>⭐</span>
              </div>
              <div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 13, color: '#111827', marginBottom: 2 }}>Laisser un avis Google</div>
                <div style={{ fontSize: 11, color: '#9CA3AF' }}>La Base Shakes & Drinks — Verdun</div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" style={{ marginLeft: 'auto', flexShrink: 0 }}>
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          </div>
        )}
      </div>

      {/* BOTTOM NAV */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid rgba(0,0,0,0.07)', display: 'flex', paddingBottom: 'max(12px, env(safe-area-inset-bottom))', zIndex: 100 }}>
        {([
          { key: 'home' as const, label: 'Accueil', icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>) },
          { key: 'evolution' as const, label: 'Évolution', icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>) },
          { key: 'products' as const, label: 'Produits', icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>) },
          { key: 'refer' as const, label: 'Recommander', icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="23" y1="11" x2="17" y2="11"/><line x1="20" y1="8" x2="20" y2="14"/></svg>) },
        ]).map(({ key, label, icon }) => {
          const isActive = activeTab === key
          return (
            <button key={key} onClick={() => setActiveTab(key)}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '8px 4px', border: 'none', background: 'transparent', color: isActive ? '#B8922A' : '#9CA3AF', fontSize: 9, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              {icon}
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
