import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getSupabaseClient } from '../services/supabaseClient'
import { ClientOnboardingTour } from '../components/client-app/ClientOnboardingTour'
import { ClientBaselineStep } from '../components/client-app/ClientBaselineStep'
import { calculateAge } from '../lib/age'
import { useClientLiveData } from '../hooks/useClientLiveData'
// Identité PWA v2 (chantier 2026-07) — seule UI client depuis le ménage 2026-08-05.
import { PwaClientApp } from '../features/client-pwa/PwaClientApp'
import { BbcClientApp } from '../features/bbc/BbcClientApp'
import '../styles/pwa2.css'


// GOOGLE_MAPS_LA_BASE conservé en const pour future reuse si besoin
void 'https://www.google.com/maps/place/LA+BASE+Shakes%26Drinks/@49.1619589,5.3840559,17z';



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

// MiniLineChart retiré (Refonte v2, 2026-04-25) : remplacé par
// ClientAppWeightChart côté onglet Évolution.

// ProductCard refactoré (2026-04-25) dans ClientProductsTab — l'onglet
// Produits côté client utilise désormais des cards dédiées (Recommended /
// Catalog) directement dans le composant refondu.

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
  // Toast bienvenue (?welcome=1) — fix 2026-05-21 : exclusivement à la
  // 1ère ouverture sur ce device (per token). Sans le gate localStorage,
  // un refresh ou un re-click sur le magic link relançait le toast à chaque
  // fois. Demande Thomas : welcome onboarding strict 1×.
  const [showWelcome, setShowWelcome] = useState(() => {
    if (typeof window === 'undefined') return false
    const wantWelcome = new URLSearchParams(window.location.search).get('welcome') === '1'
    if (!wantWelcome) return false
    const tokenKey = token ?? 'anon'
    const seenKey = `lb360-client-welcome-shown-${tokenKey}`
    try {
      if (window.localStorage.getItem(seenKey)) return false
      window.localStorage.setItem(seenKey, new Date().toISOString())
    } catch {
      /* localStorage indisponible → on affiche par défaut */
    }
    return true
  })
  useEffect(() => {
    if (!showWelcome) return
    const id = window.setTimeout(() => setShowWelcome(false), 4500)
    return () => window.clearTimeout(id)
  }, [showWelcome])
  // Chantier C — Onboarding client PWA (2026-11-04) : tour d accueil
  // 4 slides au 1er login. NULL = jamais fait → on affiche. Set au
  // "Terminer" / "Skip" via edge function client-app-mark-onboarded.
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null)
  // Chantier poids couche 2 (2026-06-03) : point de départ. undefined = pas
  // encore résolu, null = à demander, string = posé/skippé, 'error' = lecture
  // KO → on n'affiche pas (fail-open, jamais de client enfermé dehors).
  const [baselineAt, setBaselineAt] = useState<string | null | undefined>(undefined)

  // Chantier Migration RLS → Edge Function (2026-04-26).
  // Fetch des données live (programme / RDV / produits) via
  // client-app-data. Priorité : liveData > snapshot. Refresh on focus
  // debounced 5s. Si l'edge function fail, on garde le snapshot.
  const { liveData, dataSource } = useClientLiveData(token)

  // Bouton refresh manuel (FAB en bas a droite). Visible en permanence
  // pour l'utilisateur — fix retour Thomas 2026-05-08 (clients voyaient
  // donnees avec 5-10 min de retard sur Android, sans pouvoir forcer
  // une actualisation). Combine au cache:no-store + auto-poll 60s,
  // ce bouton donne au user une porte de sortie immediate quand il a
  // un doute.

  // Merge liveData dans data dès qu'on a les 2 (snapshot + live fetchés).
  // Live gagne sur snapshot (snapshot = figé, live = source de vérité DB).
  // Chantier diagnostic (2026-04-25) : on sync AUSSI assessment_history →
  // metrics_history. Avant ce fix, le snapshot (1 seul bilan dans
  // client_recaps/client_evolution_reports) écrasait les 8 bilans live →
  // tous les composants v2 voyaient 1 entrée → "Bienvenue dans l'aventure"
  // + indicateurs "—" alors que les data sont bien là.
  useEffect(() => {
    if (!liveData || !data) return
    const nextProgramTitle = liveData.client?.current_program ?? data.program_title
    // Le fetch live a réussi (liveData présent) → il fait AUTORITÉ, même à null :
    // un RDV annulé/passé renvoie null côté edge et doit disparaître. Avant, le
    // `?? snapshot` ré-affichait un RDV fantôme figé (client_app_accounts).
    const nextFollowUpIso = liveData.next_follow_up?.due_date ?? null

    // assessment_history (live) prioritaire sur metrics_history (snapshot).
    // Shape déjà flat compatible (date + weight/bodyFat/muscleMass/hydration/...).
    let nextMetrics = data.metrics_history
    let nextAssessmentsCount = data.assessments_count
    if (liveData.assessment_history && liveData.assessment_history.length > 0) {
      nextMetrics = liveData.assessment_history.map((a) => ({
        date: a.date ?? '',
        weight: a.weight ?? 0,
        bodyFat: a.bodyFat ?? 0,
        muscleMass: a.muscleMass ?? 0,
        hydration: a.hydration ?? 0,
        visceralFat: a.visceralFat ?? 0,
        metabolicAge: a.metabolicAge ?? 0,
        bmr: a.bmr ?? 0,
      })) as unknown as ClientAppData['metrics_history']
      nextAssessmentsCount = Math.max(
        nextAssessmentsCount ?? 0,
        liveData.assessment_history.length,
      )
    }

    const programChanged = nextProgramTitle !== data.program_title
    const rdvChanged = nextFollowUpIso !== data.next_follow_up
    const metricsChanged = nextMetrics !== data.metrics_history
    const countChanged = nextAssessmentsCount !== data.assessments_count
    if (!programChanged && !rdvChanged && !metricsChanged && !countChanged) return
    setData({
      ...data,
      program_title: nextProgramTitle ?? undefined,
      next_follow_up: nextFollowUpIso ?? undefined,
      metrics_history: nextMetrics,
      assessments_count: nextAssessmentsCount,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveData])

  useEffect(() => {
    if (typeof document !== 'undefined' && token) {
      // Manifest CLIENT dynamique (2026-06-16) : start_url = l'app de CE client.
      // Avant, on AJOUTAIT un 2e <link manifest> (ignoré par le navigateur → il
      // gardait le manifest coach start_url:/login), donc l'icône PWA lançait
      // /login puis /client → le bouton retour Android retombait sur /login.
      // On REMPLACE le manifest existant par celui du client (start_url correct).
      const manifest = {
        name: 'La Base 360',
        short_name: 'La Base 360',
        description: 'Mon espace bien-être personnalisé · The wellness nutrition club',
        start_url: `/client/${token}`,
        scope: '/client/',
        display: 'standalone',
        // Passe de chaleur (2026-08-05) : l'écran d'installation et la barre
        // d'état affichaient encore l'ancienne identité (émeraude sur blanc)
        // alors que l'app s'ouvre en vert profond → rupture à chaque install.
        background_color: '#162624',
        theme_color: '#162624',
        orientation: 'portrait',
        icons: [
          { src: '/brand/labase360/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/brand/labase360/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/brand/labase360/pwa-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/brand/labase360/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      }
      const blobUrl = URL.createObjectURL(
        new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' }),
      )
      let link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null
      const prevHref = link?.getAttribute('href') ?? null
      if (!link) {
        link = document.createElement('link')
        link.rel = 'manifest'
        document.head.appendChild(link)
      }
      link.href = blobUrl

      const meta = document.createElement('meta')
      meta.name = 'theme-color'
      meta.content = '#162624'
      document.head.appendChild(meta)

      const appleMeta = document.createElement('meta')
      appleMeta.name = 'apple-mobile-web-app-capable'
      appleMeta.content = 'yes'
      document.head.appendChild(appleMeta)

      // Au démontage (le coach quitte la preview), on rend son manifest.
      const linkRef = link
      const cleanup = () => {
        URL.revokeObjectURL(blobUrl)
        if (prevHref) linkRef.href = prevHref
      }
      void loadClientData()
      return cleanup
    }

    void loadClientData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // Android PWA (2026-06-16) : le bouton retour système sortait de l'app client
  // vers /login (l'app coach était au fond de l'historique). Les onglets de
  // l'app client sont gérés en state (pas en routes) → on "piège" le retour
  // pour rester dans l'app au lieu de partir sur l'écran de connexion.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onPop = () => {
      window.history.pushState(null, '', window.location.href)
    }
    window.history.pushState(null, '', window.location.href)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])


  function normalizeData(row: Record<string, unknown>): ClientAppData {
    // Cleanup post-audit (2026-04-23) : Record<string, unknown> au lieu de
    // any — les casts aux types concrets se font site par site. Même
    // permissivité à l'import, stricte à l'usage.
    const r = row as Record<string, unknown>
    // metrics_history : tableau d'objets avec date string + valeurs numériques.
    // Le type exact côté type domain (Array<Record<string, number> & { date }>)
    // a une index signature incompatible avec la clé 'date'. On garde un type
    // large ici et on laisse le consumer final affiner.
    let metrics = r.metrics_history as ClientAppData["metrics_history"]

    if ((!metrics || metrics.length === 0) && r.body_scan) {
      const bs = r.body_scan as Record<string, number>
      const fallbackDate =
        typeof r.assessment_date === 'string'
          ? r.assessment_date
          : typeof r.created_at === 'string'
            ? r.created_at
            : new Date().toISOString()
      // Le type ClientAppData.metrics_history combine Record<string, number>
      // et {date: string} — incohérence héritée. Cast explicite via unknown
      // pour rester compatible.
      metrics = [{
        date: fallbackDate,
        weight: bs.weight ?? 0,
        bodyFat: bs.bodyFat ?? 0,
        muscleMass: bs.muscleMass ?? 0,
        hydration: bs.hydration ?? 0,
        visceralFat: bs.visceralFat ?? 0,
        metabolicAge: bs.metabolicAge ?? 0,
      }] as unknown as ClientAppData["metrics_history"]
    }

    const str = (v: unknown, fallback = ''): string => typeof v === 'string' ? v : fallback
    return {
      client_id: str(r.client_id),
      client_first_name: str(r.client_first_name),
      client_last_name: str(r.client_last_name),
      coach_id: str(r.coach_id ?? r.distributor_id, '') || undefined,
      coach_name: str(r.coach_name, 'Coach'),
      coach_whatsapp: typeof r.coach_whatsapp === 'string' ? r.coach_whatsapp : undefined,
      coach_telegram: typeof r.coach_telegram === 'string' ? r.coach_telegram : undefined,
      coach_phone: typeof r.coach_phone === 'string' ? r.coach_phone : undefined,
      program_title: typeof r.program_title === 'string' ? r.program_title : undefined,
      // Chantier Home Premium (2026-04-24) : fix "0 bilan" — si body_scan
      // existe, au moins 1 bilan. Force max(raw, metrics, body_scan?1:0).
      assessments_count: Math.max(
        typeof r.assessments_count === 'number' ? r.assessments_count : 0,
        metrics?.length ?? 0,
        r.body_scan && typeof r.body_scan === 'object' ? 1 : 0,
      ),
      next_follow_up: typeof r.next_follow_up === 'string' ? r.next_follow_up : undefined,
      metrics_history: metrics,
      recommendations: r.recommendations as ClientAppData['recommendations'],
      insights: r.insights as ClientAppData['insights'],
    }
  }

  async function loadClientData() {
    try {
      const sb = await getSupabaseClient()
      if (!sb || !token) { setLoading(false); return }


      // ⚠️ Ces trois lectures étaient des `.from(...).select('*').eq('token', …)`
      // directs jusqu'au 2026-07-30. Elles marchaient grâce aux policies
      // `*_public_read`, qui ne vérifiaient QUE `expires_at > now()` — donc
      // toute ligne non expirée était lisible par n'importe qui, sans jeton
      // (52 jetons clients récupérables en une requête).
      //
      // Retirer ces policies a fermé la fuite mais tué CETTE page : les trois
      // lectures renvoyaient 0 ligne, `snapshot` restait null, et le client
      // tombait sur « Lien introuvable ou expiré ». Les fonctions ci-dessous
      // exigent le jeton en paramètre et ne renvoient que la ligne
      // correspondante : la page remarche, l'énumération reste impossible.
      let snapshot: Record<string, unknown> | null = null
      const { data: recap } = await sb
        .rpc('get_client_recap_by_token', { p_token: token })
        .maybeSingle()
      if (recap) snapshot = recap as Record<string, unknown>
      if (!snapshot) {
        const { data: report } = await sb
          .rpc('get_client_evolution_report_by_token', { p_token: token })
          .maybeSingle()
        if (report) snapshot = report as Record<string, unknown>
      }
      if (!snapshot) {
        const { data: appAccount } = await sb
          .rpc('get_client_app_account_by_token', { p_token: token })
          .maybeSingle()
        if (appAccount) snapshot = appAccount as Record<string, unknown>
      }
      if (!snapshot) { setLoading(false); return }

      // Chantier C — Onboarding client PWA (2026-11-04) : detecte si le
      // tour d accueil a deja ete fait. Si snapshot vient de
      // client_app_accounts on a directement onboarded_at. Sinon fetch
      // separate.
      try {
        let onboardedAt = (snapshot as { onboarded_at?: string | null }).onboarded_at
        if (onboardedAt === undefined) {
          const { data: acc } = await sb
            .rpc('get_client_app_account_by_token', { p_token: token })
            .maybeSingle()
          onboardedAt = (acc as { onboarded_at?: string | null } | null)?.onboarded_at ?? null
        }
        setOnboardingDone(onboardedAt !== null && onboardedAt !== undefined)
      } catch {
        setOnboardingDone(true) // safe default — on cache si on sait pas
      }

      // Couche 2 point de départ : lit baseline_at. FAIL-OPEN — toute erreur
      // (colonne absente, réseau) → sentinel 'error' → l'étape ne s'affiche
      // pas (on n'enferme jamais le client hors de l'app).
      try {
        let bAt = (snapshot as { baseline_at?: string | null }).baseline_at
        if (bAt === undefined) {
          const { data: acc2, error: bErr } = await sb
            .rpc('get_client_app_account_by_token', { p_token: token })
            .maybeSingle()
          if (bErr) throw bErr
          bAt = (acc2 as { baseline_at?: string | null } | null)?.baseline_at ?? null
        }
        setBaselineAt(bAt ?? null)
      } catch {
        setBaselineAt('error')
      }

      // Chantier Migration RLS Edge Function (2026-04-26) : les 3 SELECT
      // live directs (clients.current_program, follow_ups, pv_client_products)
      // ont été retirés d'ici. Ils sont remplacés par l'Edge Function
      // client-app-data (cf. useClientLiveData hook en bas du composant).
      // Le snapshot ci-dessus (client_recaps / evolution_reports /
      // app_accounts) reste le fallback silencieux si l'edge function
      // plante ou timeout. La fraîcheur live arrive via setData dans un
      // useEffect qui merge liveData > snapshot.
      setData(normalizeData(snapshot))
      setLoading(false)
    } catch { /* silencieux */ }
    finally { setLoading(false) }
  }




  if (loading)
    // Passe de chaleur : ces 2 écrans sont rendus AVANT l'app — ils affichaient
    // un gris clair hors charte alors que la PWA s'ouvre en vert profond.
    return <div style={{ minHeight: '100vh', background: '#162624', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, system-ui, sans-serif', color: '#A4B2AA' }}>Chargement...</div>

  if (!data)
    return <div style={{ minHeight: '100vh', background: '#162624', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, system-ui, sans-serif', color: '#F2775F' }}>Lien introuvable ou expiré.</div>

  // ─── Calculs métriques ─────────────────────────────────────────────────
  const metrics = data.metrics_history ?? []
  const latest = metrics[metrics.length - 1] as (Record<string, number> & { date: string }) | undefined
  const first = metrics[0] as (Record<string, number> & { date: string }) | undefined

  // ── Mode BBC (chantier 2026-07-24) ─────────────────────────────────────
  // Aiguillage PAR CLIENT : une EBE BBC bascule la PWA sur l'app membre BBC.
  // Aperçu via ?bbc=1.
  // ⚠️ Cet aiguillage doit passer AVANT le tour d'onboarding et l'étape « point
  // de départ » classiques : un membre BBC a SON propre écran d'entrée
  // (BbcMemberEntry) et sa pesée se fait au club. Sinon il recevait « Cette app
  // est ton espace personnel… », hors sujet pour lui.
  const isBbcClient =
    (typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('bbc') === '1') ||
    Boolean((liveData?.client as { ebe_bbc?: boolean } | undefined)?.ebe_bbc)
  if (isBbcClient) {
    const bbcFirstW = typeof first?.weight === 'number' && first.weight > 0 ? first.weight : null
    const bbcLastW = typeof latest?.weight === 'number' && latest.weight > 0 ? latest.weight : null
    const bbcDelta = bbcFirstW != null && bbcLastW != null ? Math.round((bbcLastW - bbcFirstW) * 10) / 10 : null
    return (
      <BbcClientApp
        clientName={data.client_first_name || 'toi'}
        coachName={data.coach_name || 'ton coach'}
        programTitle={data.program_title}
        token={token as string}
        visitsCount={(liveData as { visits_count?: number } | null)?.visits_count ?? 0}
        weightDeltaKg={bbcDelta}
        currentWeight={bbcLastW}
        nextRdvDate={data.next_follow_up ?? null}
        nextRdvType={(liveData?.next_follow_up as { type?: string | null } | null)?.type ?? null}
        metrics={metrics as Array<{ date?: string; weight?: number; bodyFat?: number; muscleMass?: number; hydration?: number }>}
        measurements={(liveData?.measurements ?? []) as Array<{ measured_at?: string; waist_cm?: number; hips_cm?: number; thigh_cm?: number; arm_cm?: number }>}
        heartsCount={(liveData as { hearts_count?: number } | null)?.hearts_count ?? 0}
        clientId={data.client_id}
        coachId={data.coach_id ?? undefined}
        coachAdvice={liveData?.coach_advice ?? null}
        card={(liveData as { member_card?: { type: number; used: number; remaining: number; expires_at: string | null } | null } | null)?.member_card ?? null}
        entrySeen={(liveData as { bbc_entry_seen?: boolean } | null)?.bbc_entry_seen}
        clubSettings={(liveData as { club_settings?: { hearts_bareme?: Record<string, string>; open_hours?: string; club_name?: string | null } | null } | null)?.club_settings ?? null}
      />
    )
  }

  // Chantier C — Onboarding client PWA (2026-11-04) : tour 4 slides au
  // 1er login. onboardingDone === false strictement (null = pas encore
  // determine, ne pas afficher tant qu on sait pas).
  // `dataSource !== 'unknown'` : on attend que la donnée live soit résolue,
  // sinon un membre BBC verrait le tour classique le temps que `ebe_bbc`
  // arrive (flash d'un écran qui ne le concerne pas).
  const showOnboardingTour = onboardingDone === false && token && dataSource !== 'unknown'
  if (showOnboardingTour) {
    return (
      <ClientOnboardingTour
        token={token}
        firstName={data.client_first_name ?? ''}
        coachName={data.coach_name ?? ''}
        onComplete={() => setOnboardingDone(true)}
      />
    )
  }

  // Couche 2 point de départ (2026-06-03) : après le tour, si le client n'a
  // ni poids (body_scan.weight>0) ni mensuration, on impose "ton point de
  // départ". FAIL-OPEN : on n'affiche que si baseline_at vaut strictement
  // null ET que la donnée live est résolue (dataSource != unknown) — toute
  // incertitude (undefined / 'error' / live pas prêt) → on n'affiche pas.
  // Élargi (2026-07-24) : un client qui a DÉJÀ un vrai bilan (poids dans
  // metrics_history OU dans body_scan d'un assessment) ou une mensuration ne
  // doit JAMAIS revoir « ton point de départ ». Évite de re-demander la pesée à
  // quelqu'un qui a déjà des données.
  const hasBaseline =
    (data.metrics_history ?? []).some((m) => Number((m as Record<string, number>).weight) > 0) ||
    ((liveData?.measurements?.length ?? 0) > 0) ||
    (liveData?.assessment_history ?? []).some((a) => {
      const row = a as { weight?: unknown; body_scan?: { weight?: unknown } | null }
      return Number(row.weight) > 0 || Number(row.body_scan?.weight) > 0
    })
  const showBaselineStep =
    Boolean(token) &&
    onboardingDone === true &&
    baselineAt === null &&
    !hasBaseline &&
    dataSource !== 'unknown'
  if (showBaselineStep) {
    return (
      <ClientBaselineStep
        token={token as string}
        clientId={data.client_id}
        firstName={data.client_first_name ?? ''}
        coachFirstName={data.coach_name?.split(' ')[0]}
        onDone={() => setBaselineAt(new Date().toISOString())}
      />
    )
  }

  // Refonte v2 (2026-04-25) : metricCards inline retiré au profit de
  // ClientAppKeyMetricsGrid, qui calcule deltas et formats côté composant.

  // ── Identité PWA v2 (chantier 2026-07) ────────────────────────────────────
  // La nouvelle identité (lime/noir/Anton) est LA seule UI client. L'ancienne
  // interface et son garde-fou `?v1=1` ont été supprimés (ménage 2026-08-05) :
  // v2 est le défaut en prod depuis 2026-07 et les flux périphériques (opt-in
  // push, bannière install, parrainage, modales) sont portés dans client-pwa/.
  // (L'aiguillage BBC est plus haut : il doit précéder onboarding et pesée.)
  {
    const firstW = typeof first?.weight === 'number' ? first.weight : null
    const lastW = typeof latest?.weight === 'number' ? latest.weight : null
    const weightDeltaKg =
      firstW != null && lastW != null ? Math.round((lastW - firstW) * 10) / 10 : null
    const birthDate = liveData?.client?.birth_date ?? null
    const ageYears = birthDate ? calculateAge(birthDate) : null
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v !== 0 ? v : undefined)
    const metricsV2 = metrics.map((m) => {
      const mm = m as Record<string, number> & { date: string }
      return {
        date: mm.date,
        weight: num(mm.weight),
        bodyFat: num(mm.bodyFat),
        muscleMass: num(mm.muscleMass),
        hydration: num(mm.hydration),
        visceralFat: num(mm.visceralFat),
        metabolicAge: num(mm.metabolicAge),
      }
    })
    const productsV2 = (liveData?.current_products ?? []).map((p) => ({
      id: p.id,
      product_name: p.product_name,
      note_metier: p.note_metier,
      quantite_label: p.quantite_label,
    }))
    const sportAlertsV2 = (liveData?.sport_alerts ?? []).map((a) => ({
      id: a.id,
      title: a.title,
      detail: a.detail,
      advice: a.advice,
    }))
    const fmtDate = (iso?: string | null) =>
      iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : undefined
    return (
      <PwaClientApp
        token={token as string}
        clientId={data.client_id}
        coachId={data.coach_id}
        clientName={data.client_first_name || 'toi'}
        coachName={(data.coach_name ?? '').split(/\s+/)[0] || 'ton coach'}
        assessmentsCount={data.assessments_count ?? metrics.length}
        weightDeltaKg={weightDeltaKg}
        nextFollowUp={data.next_follow_up}
        programTitle={data.program_title}
        ageYears={ageYears}
        metrics={metricsV2}
        measurements={liveData?.measurements ?? []}
        products={productsV2}
        coachAdvice={liveData?.coach_advice}
        sportAlerts={sportAlertsV2}
        lastAdviceDate={fmtDate(latest?.date)}
        objective={liveData?.client?.objective ?? undefined}
        startDate={fmtDate(first?.date)}
      />
    )
  }
}
