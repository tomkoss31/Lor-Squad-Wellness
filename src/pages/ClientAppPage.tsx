import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getSupabaseClient } from '../services/supabaseClient'
import { HERBALIFE_PRODUCTS, type HerbalifeProduct } from '../data/herbalifeCatalog'
import { ClientMessageModal } from '../components/client-app/ClientMessageModal'
import { BreakfastStorySlider, DEFAULT_BREAKFAST_ANALYSIS } from '../components/education/BreakfastStorySlider'
import type { BreakfastAnalysis } from '../types/domain'

const GOOGLE_MAPS_LA_BASE = 'https://www.google.com/maps/place/LA+BASE+Shakes%26Drinks/@49.1619589,5.3840559,17z'

// ─── Catégories produits dans l'ordre du PDF officiel ──────────────────────
const CATEGORY_DISPLAY: Array<{ key: HerbalifeProduct['category']; label: string }> = [
  { key: 'formula1', label: 'Formula 1' },
  { key: 'select', label: 'Select' },
  { key: 'proteines', label: 'En-cas & Protéines' },
  { key: 'complements', label: 'Compléments' },
  { key: 'boissons', label: 'Boissons' },
  { key: 'sport', label: 'Sport & Vitalité H24' },
]

// ─── Descriptions détaillées par référence produit ─────────────────────────
const PRODUCT_DETAILS: Record<string, string> = {
  '4466': "Le Formula 1 Vanille est la base de ton programme nutritionnel. Il remplace un repas avec 21 vitamines et minéraux essentiels, 17g de protéines et moins de 220 kcal. À prendre le matin ou à midi avec 250ml de lait écrémé ou boisson végétale.",
  '178K': "Le Thé Concentré Herbalife est une boisson à base d'extraits de thé et de plantes. Il apporte une énergie douce et durable, favorise la thermogenèse et s'utilise chaud ou froid. 1 cuillère pour 240ml d'eau.",
  '0006': "L'Aloe Vera Herbalife soutient la digestion et améliore l'absorption des nutriments. À prendre chaque matin, il prépare le système digestif à recevoir les autres compléments.",
  '488K': 'La Créatine+ améliore les performances musculaires, la force et la récupération. Bénéfique pour tous, homme ou femme, avec ou sans activité sportive intensive.',
  '0020': 'Xtra-Cal apporte calcium et magnésium essentiels pour la solidité osseuse. Particulièrement recommandé pour les femmes à tous les âges.',
  '236K': "Phyto Complete est un complexe d'extraits de plantes qui soutient le bien-être général et aide à réduire la graisse viscérale. Riche en antioxydants naturels.",
  '0267': "Beta Heart contient des bêta-glucanes d'avoine qui contribuent à maintenir un taux de cholestérol normal. Recommandé en cas de masse grasse élevée.",
  '173K': 'Microbiotic Max soutient l\'équilibre de la flore intestinale avec des probiotiques et prébiotiques. Idéal pour améliorer le transit et la digestion.',
  '282K': 'Night Mode favorise une meilleure qualité de sommeil. Un bon sommeil est essentiel pour la gestion du poids et la récupération musculaire.',
  '1433': "H24 Hydrate est une boisson aux électrolytes qui optimise l'hydratation avant, pendant et après l'effort physique.",
  '402K': "Les Gels Prolong apportent 30g de glucides à libération progressive pour maintenir l'énergie pendant les efforts d'endurance.",
  '1466': "CR7 Drive est la boisson sportive officielle de Cristiano Ronaldo. Elle hydrate et fournit l'énergie nécessaire pendant l'effort.",
}

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

// ─── Mini graphique SVG ────────────────────────────────────────────────────
function MiniLineChart({
  data, field, color, label, unit,
}: {
  data: Array<Record<string, number> & { date: string }>
  field: string
  color: string
  label: string
  unit: string
}) {
  const values = data.map((d) => d[field]).filter((v): v is number => typeof v === 'number' && !Number.isNaN(v))
  if (values.length < 2) return null

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const W = 280, H = 56, PAD = 8

  const pts = data
    .filter((d) => typeof d[field] === 'number')
    .map((d, i, arr) => ({
      x: PAD + (i / (arr.length - 1)) * (W - PAD * 2),
      y: H - PAD - ((d[field] - min) / range) * (H - PAD * 2),
      val: d[field],
      date: new Date(d.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
    }))

  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const last = values[values.length - 1]

  return (
    <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 12, padding: '12px 14px', marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 9, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 500 }}>{label}</div>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, color }}>
          {last.toFixed(1)}{unit}
        </div>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
        <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3" fill={color} />
            {(i === 0 || i === pts.length - 1) && (
              <text x={p.x} y={p.y - 7} textAnchor={i === 0 ? 'start' : 'end'} fontSize="8" fill="#9CA3AF">
                {p.val.toFixed(1)}{unit}
              </text>
            )}
          </g>
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 8, color: '#9CA3AF' }}>{pts[0]?.date}</span>
        <span style={{ fontSize: 8, color: '#9CA3AF' }}>{pts[pts.length - 1]?.date}</span>
      </div>
    </div>
  )
}

// ─── Carte produit avec description + CTA ──────────────────────────────────
function ProductCard({
  product, isRecommended, onAskCoach,
}: {
  product: HerbalifeProduct
  isRecommended: boolean
  /** Chantier Messagerie client ↔ coach (2026-04-21) : ouvre la modale
   *  centralisée ClientMessageModal à la place de l'ancien lien
   *  MyHerbalife externe + WhatsApp. Le coach reçoit une notif push. */
  onAskCoach: (product: HerbalifeProduct) => void
}) {
  const [open, setOpen] = useState(false)
  const description = PRODUCT_DETAILS[product.ref] ?? product.shortBenefit

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={open}
      onClick={() => setOpen(!open)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(!open); } }}
      style={{
        background: '#fff',
        border: isRecommended ? '1px solid rgba(184,146,42,0.2)' : '1px solid rgba(0,0,0,0.07)',
        borderRadius: 14,
        padding: 14,
        marginBottom: 8,
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: isRecommended ? '#B8922A' : '#9CA3AF', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{product.shortName}</div>
          <div style={{ fontSize: 11, color: '#9CA3AF' }}>{product.shortBenefit.split('·')[0].trim()}</div>
        </div>
        {isRecommended && (
          <div style={{ fontSize: 9, padding: '3px 8px', borderRadius: 10, background: 'rgba(184,146,42,0.1)', color: '#B8922A', fontWeight: 600, flexShrink: 0 }}>
            Pour toi
          </div>
        )}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
          {open ? <polyline points="18 15 12 9 6 15" /> : <polyline points="6 9 12 15 18 9" />}
        </svg>
      </div>

      {open && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          <p style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.75, marginBottom: 14 }}>
            {description}
          </p>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onAskCoach(product) }}
            style={{
              width: '100%',
              padding: '11px 14px',
              borderRadius: 10,
              background: '#B8922A',
              color: '#FFFFFF',
              border: 'none',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'DM Sans, sans-serif',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <span aria-hidden="true">💬</span>
            Parler à mon coach à propos de ce produit
          </button>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════
export function ClientAppPage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<ClientAppData | null>(null)
  const [loading, setLoading] = useState(true)
  // Chantier invitation client app (2026-04-21) : toast accueil quand le
  // client arrive ici depuis /bienvenue?welcome=1. Le toast s'efface tout
  // seul après 4s.
  const [showWelcome, setShowWelcome] = useState(() => {
    if (typeof window === 'undefined') return false
    return new URLSearchParams(window.location.search).get('welcome') === '1'
  })
  useEffect(() => {
    if (!showWelcome) return
    const id = window.setTimeout(() => setShowWelcome(false), 4500)
    return () => window.clearTimeout(id)
  }, [showWelcome])
  const [activeTab, setActiveTab] = useState<'home' | 'evolution' | 'products' | 'coaching' | 'refer'>('home')
  // Chantier Messagerie client ↔ coach (2026-04-21) : 2 modales pour parler
  // au coach depuis l'app — question produit OU demande de reco générique.
  const [productAskModal, setProductAskModal] = useState<HerbalifeProduct | null>(null)
  const [recoAskOpen, setRecoAskOpen] = useState(false)
  const openProductAskModal = (product: HerbalifeProduct) => setProductAskModal(product)
  const [coachingData, setCoachingData] = useState<{ breakfastAnalysis: BreakfastAnalysis; breakfastContent: string } | null>(null)
  const [referName, setReferName] = useState('')
  const [referContact, setReferContact] = useState('')
  const [referSent, setReferSent] = useState(false)
  const [rdvMessage, setRdvMessage] = useState('')
  const [rdvSent, setRdvSent] = useState(false)
  const [openCategory, setOpenCategory] = useState<string | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [installPlatform, setInstallPlatform] = useState<'ios' | 'android' | null>(null)
  const [deferredInstallEvent, setDeferredInstallEvent] = useState<{ prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> } | null>(null)

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

  // Détection iOS / Android pour proposer l'installation PWA
  useEffect(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return
    const ua = navigator.userAgent
    const isIOS = /iphone|ipad|ipod/i.test(ua)
    const isAndroid = /android/i.test(ua)
    const isInStandaloneMode = window.matchMedia?.('(display-mode: standalone)').matches
      || (navigator as unknown as { standalone?: boolean }).standalone === true
    const alreadyDismissed = window.localStorage?.getItem('lor-install-dismissed')

    if (isInStandaloneMode || alreadyDismissed) return

    // iOS Safari : pas d'event natif, on affiche les instructions manuelles
    if (isIOS) {
      setInstallPlatform('ios')
      const timer = setTimeout(() => setShowInstallPrompt(true), 2000)
      return () => clearTimeout(timer)
    }

    // Android Chrome : écouter beforeinstallprompt pour déclencher l'install native
    if (isAndroid) {
      setInstallPlatform('android')
      const handler = (e: Event) => {
        e.preventDefault()
        setDeferredInstallEvent(e as unknown as { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> })
        setShowInstallPrompt(true)
      }
      window.addEventListener('beforeinstallprompt', handler)
      // Fallback : si l'event n'arrive pas dans les 3 sec, affiche quand même la popup manuelle
      const timer = setTimeout(() => setShowInstallPrompt(true), 3000)
      return () => {
        window.removeEventListener('beforeinstallprompt', handler)
        clearTimeout(timer)
      }
    }
  }, [])

  async function triggerNativeInstall() {
    if (!deferredInstallEvent) return
    try {
      await deferredInstallEvent.prompt()
      const { outcome } = await deferredInstallEvent.userChoice
      if (outcome === 'accepted' || outcome === 'dismissed') {
        setShowInstallPrompt(false)
        try { window.localStorage.setItem('lor-install-dismissed', '1') } catch { /* ignore */ }
      }
    } catch {
      // silencieux
    }
  }

  function normalizeData(row: Record<string, unknown>): ClientAppData {
    const r = row as Record<string, any>
    let metrics = r.metrics_history as Array<any> | undefined

    if ((!metrics || metrics.length === 0) && r.body_scan) {
      const bs = r.body_scan as Record<string, number>
      metrics = [{
        date: r.assessment_date ?? r.created_at ?? new Date().toISOString(),
        weight: bs.weight ?? 0,
        bodyFat: bs.bodyFat ?? 0,
        muscleMass: bs.muscleMass ?? 0,
        hydration: bs.hydration ?? 0,
        visceralFat: bs.visceralFat ?? 0,
        metabolicAge: bs.metabolicAge ?? 0,
      }]
    }

    return {
      client_id: r.client_id ?? '',
      client_first_name: r.client_first_name ?? '',
      client_last_name: r.client_last_name ?? '',
      coach_id: r.coach_id ?? r.distributor_id,
      coach_name: r.coach_name ?? 'Coach',
      coach_whatsapp: r.coach_whatsapp,
      coach_telegram: r.coach_telegram,
      coach_phone: r.coach_phone,
      program_title: r.program_title,
      assessments_count: r.assessments_count ?? (metrics?.length ?? 0),
      next_follow_up: r.next_follow_up,
      metrics_history: metrics,
      recommendations: r.recommendations,
      insights: r.insights,
    }
  }

  async function loadCoachingData(sb: NonNullable<Awaited<ReturnType<typeof getSupabaseClient>>>, tok: string) {
    try {
      const { data: rows } = await sb.rpc('get_client_assessment_by_token', { p_token: tok })
      const row = Array.isArray(rows) ? rows[0] : rows
      const q = (row as Record<string, any> | null)?.questionnaire as Record<string, any> | undefined
      const analysis = q?.breakfastAnalysis as BreakfastAnalysis | undefined
      const content = typeof q?.breakfastContent === 'string' ? q.breakfastContent : ''
      if (analysis) {
        setCoachingData({ breakfastAnalysis: { ...DEFAULT_BREAKFAST_ANALYSIS, ...analysis }, breakfastContent: content })
      }
    } catch { /* silencieux — onglet Coaching affichera l'état vide */ }
  }

  async function loadClientData() {
    try {
      const sb = await getSupabaseClient()
      if (!sb || !token) { setLoading(false); return }

      // Fetch coaching (assessment) en parallèle — n'influe pas sur l'affichage principal
      void loadCoachingData(sb, token)

      const { data: recap } = await sb.from('client_recaps').select('*').eq('token', token).maybeSingle()
      if (recap) { setData(normalizeData(recap)); setLoading(false); return }

      const { data: report } = await sb.from('client_evolution_reports').select('*').eq('token', token).maybeSingle()
      if (report) { setData(normalizeData(report)); setLoading(false); return }

      const { data: appAccount } = await sb.from('client_app_accounts').select('*').eq('token', token).maybeSingle()
      if (appAccount) { setData(normalizeData(appAccount)); setLoading(false); return }
    } catch { /* silencieux */ }
    finally { setLoading(false) }
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
      setReferSent(true); setReferName(''); setReferContact('')
    } catch { /* silencieux */ }
  }

  async function sendRdvChangeRequest() {
    if (!rdvMessage || !data) return
    try {
      const sb = await getSupabaseClient()
      if (!sb) return

      // Chantier Messagerie client ↔ coach (2026-04-21) : dual-write.
      // 1. rdv_change_requests (legacy, pour l'existant côté coach).
      // 2. client_messages avec message_type='rdv_request' → le trigger
      //    Postgres notify_new_client_message push une notif au coach
      //    + le message apparaît dans la messagerie.
      await Promise.all([
        sb.from('rdv_change_requests').insert({
          client_id: data.client_id,
          coach_id: data.coach_id ?? '',
          client_name: `${data.client_first_name} ${data.client_last_name}`,
          current_rdv: data.next_follow_up,
          message: rdvMessage,
        }),
        sb.from('client_messages').insert({
          client_id: data.client_id,
          client_name: `${data.client_first_name} ${data.client_last_name}`,
          distributor_id: data.coach_id ?? '',
          message_type: 'rdv_request',
          message: rdvMessage,
        }),
      ])
      setRdvSent(true); setRdvMessage('')
    } catch { /* silencieux */ }
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
    return <div style={{ minHeight: '100vh', background: '#F4F2EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif', color: '#9CA3AF' }}>Chargement...</div>

  if (!data)
    return <div style={{ minHeight: '100vh', background: '#F4F2EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif', color: '#DC2626' }}>Lien introuvable ou expiré.</div>

  // ─── Calculs métriques ─────────────────────────────────────────────────
  const metrics = data.metrics_history ?? []
  const latest = metrics[metrics.length - 1] as (Record<string, number> & { date: string }) | undefined
  const first = metrics[0] as (Record<string, number> & { date: string }) | undefined

  const latestWeight = latest?.weight
  const latestBodyFatPct = latest?.bodyFat
  const latestBodyFatKg = latest && latestWeight ? (latestWeight * latest.bodyFat / 100) : null
  const latestMusclePct = latest && latestWeight ? (latest.muscleMass / latestWeight * 100) : null
  const latestMuscleKg = latest?.muscleMass
  const latestVisceral = latest?.visceralFat ?? 0

  const dWeight = first && latest ? (latest.weight - first.weight) : null
  const dBodyFatKg = first && latest && first.weight && latest.weight
    ? (latest.weight * latest.bodyFat / 100) - (first.weight * first.bodyFat / 100)
    : null
  const dMuscleKg = first && latest ? (latest.muscleMass - first.muscleMass) : null
  const dVisceral = first && latest ? ((latest.visceralFat ?? 0) - (first.visceralFat ?? 0)) : null

  const visceralColor = latestVisceral >= 13 ? '#DC2626' : latestVisceral >= 9 ? '#F59E0B' : '#0D9488'
  const visceralLabel = latestVisceral >= 13 ? 'Élevée' : latestVisceral >= 9 ? 'Modérée' : 'Normale'

  // ─── Produits recommandés ──────────────────────────────────────────────
  const recoList = data.recommendations ?? []
  const recommendedProducts = HERBALIFE_PRODUCTS.filter((p) =>
    recoList.some((r) => (r.ref && r.ref === p.ref) || (r.name && (r.name === p.name || r.name === p.shortName)))
  )
  const recommendedRefs = new Set(recommendedProducts.map((p) => p.ref))

  // ─── Type local pour les cards métriques ───────────────────────────────
  type MetricCard = {
    label: string
    main: string
    sub?: string | null
    subColor?: string
    delta: number | null
    unit: string
    color: string
    inverse: boolean
  }

  const metricCards: MetricCard[] = [
    {
      label: 'Poids',
      main: latestWeight !== undefined ? `${latestWeight.toFixed(1)} kg` : '—',
      delta: dWeight,
      unit: 'kg',
      color: '#B8922A',
      inverse: false,
    },
    {
      label: 'Masse grasse',
      main: latestBodyFatPct !== undefined ? `${latestBodyFatPct.toFixed(1)} %` : '—',
      sub: latestBodyFatKg !== null ? `soit ${latestBodyFatKg.toFixed(1)} kg` : null,
      delta: dBodyFatKg,
      unit: 'kg de graisse',
      color: '#DC2626',
      inverse: false,
    },
    {
      label: 'Muscle',
      main: latestMuscleKg !== undefined ? `${latestMuscleKg.toFixed(1)} kg` : '—',
      sub: latestMusclePct !== null ? `${latestMusclePct.toFixed(0)}% du poids` : null,
      delta: dMuscleKg,
      unit: 'kg',
      color: '#0D9488',
      inverse: true,
    },
    {
      label: 'Graisse viscérale',
      main: `${latestVisceral}`,
      sub: visceralLabel,
      subColor: visceralColor,
      delta: dVisceral,
      unit: 'points',
      color: latestVisceral >= 9 ? '#DC2626' : '#0D9488',
      inverse: false,
    },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#F4F2EE', fontFamily: 'DM Sans, sans-serif', color: '#111827', paddingBottom: 80 }}>
      {/* Chantier invitation client app (2026-04-21) : toast de bienvenue
          quand on arrive depuis /bienvenue via ?welcome=1. */}
      {showWelcome ? (
        <div
          role="status"
          style={{
            position: 'fixed',
            top: 16,
            left: 16,
            right: 16,
            zIndex: 9999,
            padding: '14px 18px',
            borderRadius: 14,
            background: 'linear-gradient(135deg, #D4B460, #B8922A)',
            color: '#fff',
            fontFamily: 'Syne, sans-serif',
            fontWeight: 700,
            fontSize: 15,
            textAlign: 'center',
            boxShadow: '0 12px 30px rgba(184,146,42,0.35)',
          }}
        >
          Bienvenue dans ton espace Lor'Squad 🎉
        </div>
      ) : null}

      {/* Chantier Messagerie client ↔ coach (2026-04-21) : modale "Parler à
          mon coach" sur fiche produit + modale "Demander une reco" sur home. */}
      <ClientMessageModal
        open={productAskModal !== null}
        onClose={() => setProductAskModal(null)}
        clientId={data.client_id}
        clientFirstName={data.client_first_name}
        clientLastName={data.client_last_name}
        distributorId={data.coach_id ?? ''}
        title="Parler à mon coach"
        intro={
          productAskModal
            ? `Pose ta question sur ${productAskModal.shortName} à ${data.coach_name}.`
            : ''
        }
        messageType="product_request"
        productName={productAskModal?.shortName}
        defaultMessage={
          productAskModal
            ? `Bonjour ${data.coach_name}, j'ai une question sur ${productAskModal.shortName} : `
            : ''
        }
      />
      <ClientMessageModal
        open={recoAskOpen}
        onClose={() => setRecoAskOpen(false)}
        clientId={data.client_id}
        clientFirstName={data.client_first_name}
        clientLastName={data.client_last_name}
        distributorId={data.coach_id ?? ''}
        title="Demander une recommandation"
        intro={`Dis à ${data.coach_name} ce dont tu as besoin. Elle te répondra avec un conseil personnalisé.`}
        messageType="recommendation"
        defaultMessage={`Bonjour ${data.coach_name}, j'aurais besoin d'une recommandation sur `}
      />

      {/* HERO */}
      <div style={{ background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 60%, #F4F2EE 100%)', padding: '20px 16px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, background: '#B8922A', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="#fff"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
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
            {data.client_first_name?.[0]}{data.client_last_name?.[0]}
          </div>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 20, color: '#111827' }}>
              Bonjour {data.client_first_name} !
            </div>
            <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
              {data.program_title ?? 'Programme en cours'} · {data.assessments_count ?? 1} bilan{(data.assessments_count ?? 1) > 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 14px' }}>
        {/* ══════════════════════════════════════════════════════════════ */}
        {/* ONGLET ACCUEIL                                                  */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'home' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {latest && (
              <>
                <div style={{ fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: '#9CA3AF', fontWeight: 500 }}>Ton évolution</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {([
                    { label: 'Poids', field: 'weight', unit: 'kg', color: '#B8922A' },
                    { label: 'Masse grasse', field: 'bodyFat', unit: '%', color: '#DC2626' },
                    { label: 'Muscle', field: 'muscleMass', unit: 'kg', color: '#0D9488' },
                    { label: 'Hydratation', field: 'hydration', unit: '%', color: '#7C3AED' },
                  ] as const).map(({ label, field, unit, color }) => {
                    const val = latest[field]
                    return (
                      <div key={field} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 12, padding: '12px', borderTop: `2px solid ${color}` }}>
                        <div style={{ fontSize: 9, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{label}</div>
                        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 22, color, lineHeight: 1 }}>
                          {typeof val === 'number' ? val.toFixed(1) : '—'}{unit}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* Prochain RDV */}
            {data.next_follow_up && (
              <div style={{ background: 'rgba(13,148,136,0.06)', border: '1px solid rgba(13,148,136,0.15)', borderRadius: 14, padding: 14 }}>
                <div style={{ fontSize: 9, color: '#0D9488', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 }}>Prochain rendez-vous</div>
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
                      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    Google Agenda
                  </a>
                  <a href={GOOGLE_MAPS_LA_BASE} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: 'rgba(13,148,136,0.1)', color: '#0D9488', borderRadius: 9, textDecoration: 'none', fontSize: 12, fontWeight: 500, border: '1px solid rgba(13,148,136,0.2)' }}>
                    Itinéraire
                  </a>
                </div>

                <div style={{ marginTop: 12, borderTop: '1px solid rgba(13,148,136,0.1)', paddingTop: 12 }}>
                  <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 8 }}>Tu veux modifier ce RDV ?</div>
                  {rdvSent ? (
                    <div style={{ fontSize: 12, color: '#0D9488', fontWeight: 500 }}>✓ Message envoyé à {data.coach_name}</div>
                  ) : (
                    <>
                      <textarea value={rdvMessage} onChange={(e) => setRdvMessage(e.target.value)} placeholder="Ex : Je préfèrerais le 30 avril à 14h..." rows={2}
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

            {/* Chantier Messagerie client ↔ coach (2026-04-21) : CTA
                "Demander une reco" — bouton gold large qui ouvre la modale.
                Le message atterrit dans client_messages et push une notif
                au coach. */}
            <button
              type="button"
              onClick={() => setRecoAskOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: 'linear-gradient(135deg, #FAEEDA, #F0DBB0)',
                border: '1px solid rgba(184,146,42,0.35)',
                borderRadius: 14,
                padding: '14px 16px',
                width: '100%',
                textAlign: 'left',
                cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: '#B8922A',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  flexShrink: 0,
                }}
              >
                🎁
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, color: '#633806' }}>
                  Demander une recommandation
                </div>
                <div style={{ fontSize: 11, color: '#854F0B', marginTop: 2 }}>
                  Ton coach te répondra avec un conseil personnalisé
                </div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#854F0B" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>

            {/* Avis Google */}
            <a href={GOOGLE_MAPS_LA_BASE} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid rgba(184,146,42,0.2)', borderRadius: 14, padding: '13px 16px', textDecoration: 'none' }}>
              <div style={{ width: 36, height: 36, background: 'rgba(184,146,42,0.1)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#B8922A"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 13, color: '#111827' }}>Laisser un avis Google</div>
                <div style={{ fontSize: 11, color: '#9CA3AF' }}>★★★★★ La Base — Verdun</div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>

            {/* Contacter le coach */}
            <div style={{ fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: '#9CA3AF', fontWeight: 500 }}>Contacter mon coach</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {data.coach_whatsapp && (
                <a href={`https://wa.me/${data.coach_whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                  style={{ flex: 1, padding: '11px 6px', borderRadius: 10, background: 'rgba(37,211,102,0.1)', color: '#16A34A', fontSize: 12, fontWeight: 600, textAlign: 'center', textDecoration: 'none' }}>
                  WhatsApp
                </a>
              )}
              {data.coach_telegram && (
                <a href={`https://t.me/${data.coach_telegram}`} target="_blank" rel="noopener noreferrer"
                  style={{ flex: 1, padding: '11px 6px', borderRadius: 10, background: 'rgba(0,136,204,0.1)', color: '#0088CC', fontSize: 12, fontWeight: 600, textAlign: 'center', textDecoration: 'none' }}>
                  Telegram
                </a>
              )}
              {data.coach_phone && (
                <a href={`sms:${data.coach_phone}`}
                  style={{ flex: 1, padding: '11px 6px', borderRadius: 10, background: 'rgba(0,0,0,0.05)', color: '#6B7280', fontSize: 12, fontWeight: 500, textAlign: 'center', textDecoration: 'none' }}>
                  SMS
                </a>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* ONGLET ÉVOLUTION                                                */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'evolution' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {metrics.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, padding: 40 }}>Pas encore de données d'évolution</div>
            ) : (
              <>
                {/* 1. Grid 2x2 métriques avec double valeur */}
                <div style={{ fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: '#9CA3AF', fontWeight: 500 }}>Tes chiffres clés</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {metricCards.map((card) => (
                    <div key={card.label} style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 12, padding: 12, borderTop: `2px solid ${card.color}` }}>
                      <div style={{ fontSize: 9, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{card.label}</div>
                      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 20, color: card.color, lineHeight: 1 }}>{card.main}</div>
                      {card.sub && (
                        <div style={{ fontSize: 10, color: card.subColor ?? '#9CA3AF', marginTop: 3 }}>{card.sub}</div>
                      )}
                      {card.delta !== null && (
                        <div style={{
                          fontSize: 10,
                          color: (card.inverse ? card.delta > 0 : card.delta < 0) ? '#0D9488' : card.delta === 0 ? '#9CA3AF' : '#DC2626',
                          marginTop: 4,
                          fontWeight: 500,
                        }}>
                          {card.delta > 0 ? '+' : ''}{card.delta.toFixed(1)} {card.unit} depuis le début
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* 2. Tableau compact */}
                <div style={{ fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: '#9CA3AF', fontWeight: 500, marginTop: 4 }}>Historique de tes bilans</div>
                <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, minWidth: 480 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                          {['Date', 'Poids', 'MG %', 'MG kg', 'Muscle', 'Eau', 'Viscéral'].map((h) => (
                            <th key={h} style={{ padding: '8px 6px', textAlign: 'left', fontSize: 8, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.map((row, i) => {
                          const mgKg = row.weight && row.bodyFat ? (row.weight * row.bodyFat / 100).toFixed(1) : '-'
                          return (
                            <tr key={i} style={{ borderBottom: i < metrics.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none', background: i % 2 === 0 ? '#FAFAF9' : '#fff' }}>
                              <td style={{ padding: '8px 6px', color: '#6B7280', fontSize: 9, whiteSpace: 'nowrap' }}>
                                {new Date(row.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                              </td>
                              <td style={{ padding: '8px 6px', fontWeight: 600, color: '#B8922A', fontSize: 11 }}>{row.weight?.toFixed(1)}</td>
                              <td style={{ padding: '8px 6px', color: (row.bodyFat ?? 0) > 30 ? '#DC2626' : '#111827', fontSize: 11 }}>{row.bodyFat?.toFixed(1)}%</td>
                              <td style={{ padding: '8px 6px', color: '#6B7280', fontSize: 11 }}>{mgKg}</td>
                              <td style={{ padding: '8px 6px', color: '#0D9488', fontSize: 11 }}>{row.muscleMass?.toFixed(1)}</td>
                              <td style={{ padding: '8px 6px', color: (row.hydration ?? 100) < 50 ? '#DC2626' : '#7C3AED', fontSize: 11 }}>{row.hydration?.toFixed(0)}%</td>
                              <td style={{ padding: '8px 6px', color: (row.visceralFat ?? 0) >= 9 ? '#DC2626' : '#111827', fontSize: 11 }}>{row.visceralFat}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 3. Mini graphiques */}
                {metrics.length >= 2 && (
                  <>
                    <div style={{ fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: '#9CA3AF', fontWeight: 500, marginTop: 4 }}>Courbes</div>
                    <MiniLineChart data={metrics} field="weight" color="#B8922A" label="Poids" unit=" kg" />
                    <MiniLineChart data={metrics} field="bodyFat" color="#DC2626" label="Masse grasse" unit="%" />
                    <MiniLineChart data={metrics} field="muscleMass" color="#0D9488" label="Masse musculaire" unit=" kg" />
                  </>
                )}

                {/* 4. Explication hydratation */}
                {latest?.hydration != null && (
                  <div style={{ background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.12)', borderRadius: 12, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#7C3AED' }}>Hydratation</div>
                      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 16, color: '#7C3AED' }}>
                        {latest.hydration.toFixed(0)}%
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.6 }}>
                      {latest.hydration < 45
                        ? "Hydratation insuffisante. Boire 2L d'eau par jour minimum. L'aloe vera peut aider à améliorer l'absorption."
                        : latest.hydration < 55
                        ? "Hydratation correcte. Continue à bien t'hydrater tout au long de la journée."
                        : "Excellente hydratation. Ton corps est bien hydraté, c'est un atout pour la récupération."}
                    </div>
                  </div>
                )}

                {/* 5. Insights (gardés) */}
                {(data.insights ?? []).length > 0 && (
                  <>
                    <div style={{ fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: '#9CA3AF', fontWeight: 500, marginTop: 4 }}>Ce qui évolue</div>
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
              </>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* ONGLET PRODUITS                                                 */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'products' && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Recommandés pour toi (reste toujours visible en haut) */}
            {recommendedProducts.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', color: '#B8922A', fontWeight: 600, marginBottom: 10 }}>
                  Recommandés pour toi
                </div>
                {recommendedProducts.map((product) => (
                  <ProductCard key={product.ref} product={product} isRecommended={true} onAskCoach={openProductAskModal} />
                ))}
              </div>
            )}

            {/* Accordéon par catégorie */}
            {CATEGORY_DISPLAY.map(({ key, label }) => {
              const products = HERBALIFE_PRODUCTS.filter((p) => p.category === key && !recommendedRefs.has(p.ref))
              if (products.length === 0) return null
              const isOpen = openCategory === key
              return (
                <div key={key} style={{ marginBottom: 8 }}>
                  <button
                    onClick={() => setOpenCategory(isOpen ? null : key)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', padding: '14px 16px',
                      background: '#fff', border: '1px solid rgba(0,0,0,0.07)',
                      borderRadius: isOpen ? '12px 12px 0 0' : 12,
                      fontSize: 14, fontWeight: 600, color: '#111827',
                      fontFamily: 'Syne, sans-serif', cursor: 'pointer',
                    }}
                  >
                    <span>{label} <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 400, fontFamily: 'DM Sans, sans-serif', marginLeft: 6 }}>· {products.length}</span></span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
                      {isOpen ? <polyline points="18 15 12 9 6 15" /> : <polyline points="6 9 12 15 18 9" />}
                    </svg>
                  </button>
                  {isOpen && (
                    <div style={{ border: '1px solid rgba(0,0,0,0.07)', borderTop: 'none', borderRadius: '0 0 12px 12px', padding: 10, background: '#fafaf9' }}>
                      {products.map((product) => (
                        <ProductCard key={product.ref} product={product} isRecommended={false} onAskCoach={openProductAskModal} />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* ONGLET COACHING — story petit-déjeuner (Chantier 6)             */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'coaching' && (
          <div className="ls-coaching-tab">
            {coachingData ? (
              <BreakfastStorySlider
                breakfastContent={coachingData.breakfastContent}
                analysis={coachingData.breakfastAnalysis}
                onAnalysisChange={() => { /* readOnly — no-op */ }}
                readOnly
              />
            ) : (
              <div className="ls-coaching-empty">
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, color: '#111827' }}>
                  Ton coaching personnalisé
                </div>
                <div>
                  Ton coaching personnalisé arrive après ton prochain bilan avec&nbsp;{data.coach_name}.
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* ONGLET RECOMMANDER                                              */}
        {/* ══════════════════════════════════════════════════════════════ */}
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
                  <div style={{ fontSize: 12, color: '#6B7280' }}>{data.coach_name} a reçu les coordonnées et va contacter cette personne.</div>
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
          </div>
        )}
      </div>

      {/* POPUP INSTALL PWA iOS */}
      {showInstallPrompt && (
        <div style={{
          position: 'fixed', bottom: 90, left: 12, right: 12,
          background: '#111827', borderRadius: 16, padding: 18,
          zIndex: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, background: '#B8922A', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              <div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, color: '#fff' }}>Installer l'app</div>
                <div style={{ fontSize: 11, color: '#9CA3AF' }}>Lor'Squad Wellness</div>
              </div>
            </div>
            <button
              onClick={() => {
                setShowInstallPrompt(false)
                try { window.localStorage.setItem('lor-install-dismissed', '1') } catch { /* ignore */ }
              }}
              style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: 20, cursor: 'pointer', padding: 4, lineHeight: 1 }}
              aria-label="Fermer"
            >×</button>
          </div>

          <div style={{ fontSize: 12, color: '#D1D5DB', lineHeight: 1.7, marginBottom: 14 }}>
            Ajoute cette app sur ton écran d'accueil pour y accéder rapidement, même sans internet.
          </div>

          {/* ─── Android avec prompt natif disponible ─── */}
          {installPlatform === 'android' && deferredInstallEvent ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(184,146,42,0.1)', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B8922A" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <div style={{ fontSize: 12, color: '#fff', lineHeight: 1.5 }}>
                  Un simple clic pour l'installer sur ton téléphone.
                </div>
              </div>
              <button
                onClick={() => void triggerNativeInstall()}
                style={{ width: '100%', padding: 14, borderRadius: 10, border: 'none', background: '#B8922A', color: '#fff', fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
              >
                Installer l'app
              </button>
              <button
                onClick={() => {
                  setShowInstallPrompt(false)
                  try { window.localStorage.setItem('lor-install-dismissed', '1') } catch { /* ignore */ }
                }}
                style={{ width: '100%', marginTop: 8, padding: 10, borderRadius: 10, border: 'none', background: 'transparent', color: '#9CA3AF', fontSize: 12, cursor: 'pointer' }}
              >
                Plus tard
              </button>
            </>
          ) : installPlatform === 'android' ? (
            /* ─── Android sans prompt natif (ex: Firefox, Samsung Internet) ─── */
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ width: 24, height: 24, background: 'rgba(184,146,42,0.2)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14, color: '#B8922A', fontWeight: 700 }}>1</div>
                  <div style={{ fontSize: 12, color: '#fff', lineHeight: 1.5 }}>
                    Ouvre le menu
                    <span style={{ color: '#B8922A', fontWeight: 600 }}> ⋮ </span>
                    en haut à droite
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ width: 24, height: 24, background: 'rgba(184,146,42,0.2)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14, color: '#B8922A', fontWeight: 700 }}>2</div>
                  <div style={{ fontSize: 12, color: '#fff', lineHeight: 1.5 }}>
                    Choisis
                    <span style={{ color: '#B8922A', fontWeight: 600 }}> "Installer l'application" </span>
                    ou
                    <span style={{ color: '#B8922A', fontWeight: 600 }}> "Ajouter à l'écran d'accueil" </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ width: 24, height: 24, background: 'rgba(184,146,42,0.2)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14, color: '#B8922A', fontWeight: 700 }}>3</div>
                  <div style={{ fontSize: 12, color: '#fff', lineHeight: 1.5 }}>
                    Valide avec
                    <span style={{ color: '#B8922A', fontWeight: 600 }}> "Installer" </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowInstallPrompt(false)
                  try { window.localStorage.setItem('lor-install-dismissed', '1') } catch { /* ignore */ }
                }}
                style={{ width: '100%', marginTop: 14, padding: 12, borderRadius: 10, border: 'none', background: '#B8922A', color: '#fff', fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                J'ai compris !
              </button>
            </>
          ) : (
            /* ─── iOS Safari ─── */
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ width: 24, height: 24, background: 'rgba(184,146,42,0.2)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14, color: '#B8922A', fontWeight: 700 }}>1</div>
                  <div style={{ fontSize: 12, color: '#fff', lineHeight: 1.5 }}>
                    Appuie sur le bouton
                    <span style={{ color: '#B8922A', fontWeight: 600 }}> Partager </span>
                    (carré avec flèche ↑) en bas de Safari
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ width: 24, height: 24, background: 'rgba(184,146,42,0.2)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14, color: '#B8922A', fontWeight: 700 }}>2</div>
                  <div style={{ fontSize: 12, color: '#fff', lineHeight: 1.5 }}>
                    Sélectionne
                    <span style={{ color: '#B8922A', fontWeight: 600 }}> "Sur l'écran d'accueil" </span>
                    dans le menu
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 12px' }}>
                  <div style={{ width: 24, height: 24, background: 'rgba(184,146,42,0.2)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14, color: '#B8922A', fontWeight: 700 }}>3</div>
                  <div style={{ fontSize: 12, color: '#fff', lineHeight: 1.5 }}>
                    Appuie sur
                    <span style={{ color: '#B8922A', fontWeight: 600 }}> "Ajouter" </span>
                    en haut à droite
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowInstallPrompt(false)
                  try { window.localStorage.setItem('lor-install-dismissed', '1') } catch { /* ignore */ }
                }}
                style={{ width: '100%', marginTop: 14, padding: 12, borderRadius: 10, border: 'none', background: '#B8922A', color: '#fff', fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                J'ai compris !
              </button>
            </>
          )}
        </div>
      )}

      {/* BOTTOM NAV */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid rgba(0,0,0,0.07)', display: 'flex', paddingBottom: 'max(12px, env(safe-area-inset-bottom))', zIndex: 100 }}>
        {([
          { key: 'home' as const, label: 'Accueil', icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>) },
          { key: 'evolution' as const, label: 'Évolution', icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>) },
          { key: 'products' as const, label: 'Produits', icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>) },
          { key: 'coaching' as const, label: 'Coaching', icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6" /><path d="M10 22h4" /><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2V17h6v-.3c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z" /></svg>) },
          { key: 'refer' as const, label: 'Recommander', icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="23" y1="11" x2="17" y2="11" /><line x1="20" y1="8" x2="20" y2="14" /></svg>) },
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
