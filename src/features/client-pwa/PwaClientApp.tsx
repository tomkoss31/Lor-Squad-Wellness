// ============================================================================
// PWA v2 — Coquille + Accueil (chantier refonte identité PWA client 2026-07)
// ----------------------------------------------------------------------------
// Étape 1 du chantier : socle identité « premium performance » (design hi-fi
// validé Thomas). Ce composant est monté par ClientAppPage derrière le flag
// `?v2=1` — MIGRATION PROGRESSIVE, zéro régression sur le flux token live.
// Quand tous les onglets seront portés et validés, la v2 deviendra le défaut
// et l'ancienne UI (+ ce flag) sera supprimée.
//
// Contenu livré ici : coquille (header condensé, nav basse Noaly central),
// onglet Accueil complet (XP régularité repliable, humeur + streak,
// transformation, RDV, Programme Privilégié, Challengers, tuiles, avis Google),
// modales déclenchées par l'Accueil (passage de niveau, « c'est quoi les XP »),
// bouton + panneau Noaly (réponses scriptées, câblage LLM à l'étape 5).
// Les autres onglets affichent un placeholder v2 « bientôt » (étapes 2→4).
//
// Les tokens (--bg, --lime, --teal…) viennent de src/styles/pwa2.css, scopés
// sous `.pwa2`. Chiffres XP/humeur = démo (câblage client-xp / persistance à
// une passe ultérieure), l'identité + les données d'en-tête sont réelles.
// ============================================================================
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { TELEGRAM_GROUP_URL } from '../../lib/telegram'
import { EvolutionTab, type EvolutionMetricPoint, type EvolutionMeasurement } from './tabs/EvolutionTab'
import { ProduitsTab, type PwaProduct } from './tabs/ProduitsTab'
import { ConseilsTab, type PwaSportAlert } from './tabs/ConseilsTab'
import { MessagesTab } from './tabs/MessagesTab'
import { RecommanderTab } from './tabs/RecommanderTab'
import { ProfilScreen } from './ProfilScreen'
import { LandingScreen, LoginScreen, OnboardingScreen } from './EntryScreens'
import { DistribScreen } from './DistribScreen'

const ANTON = "'Anton', sans-serif"
const SORA = "'Sora', sans-serif"
const MONO = "'JetBrains Mono', monospace"

const RANKS = ['Débutante', 'Régulière', 'Motivée', 'Championne', 'Légende']
const XP_PER_LEVEL = 200

const NOALY_SUGGESTIONS: Array<{ key: string; chip: string; answer: string }> = [
  { key: 'recette', chip: 'Une idée de recette', answer: "Essaie un bowl protéiné : skyr, fruits rouges, une dose de Formula 1 vanille et quelques amandes. ~250 kcal, 20 g de protéines. J'en ai d'autres si tu veux !" },
  { key: 'produit', chip: 'Infos sur un produit', answer: 'Dis-moi lequel : Formula 1, Thé Concentré, Aloe… Par ex. le Thé Concentré donne une énergie douce — le matin et avant 16 h.' },
  { key: 'masse', chip: "C'est quoi la masse grasse ?", answer: "C'est la part de graisse dans ton corps, en %. La baisser en gardant du muscle, c'est l'objectif." },
  { key: 'fringale', chip: "J'ai une fringale", answer: "Un grand verre d'eau, puis une collation protéinée (yaourt grec, amandes) ou un shake. La faim passe souvent en 10 min." },
  { key: 'rdv', chip: 'Décaler mon RDV', answer: 'Je préviens ton coach de ta demande. Tu préfères quel créneau ? Il te confirme vite.' },
  { key: 'fatigue', chip: 'Je suis fatigué·e', answer: "Vérifie hydratation et sommeil, et cale ton Thé Concentré le matin. Si ça dure, j'en parle à ton coach." },
]

const MOODS: Array<{ key: string; label: string; color: string }> = [
  { key: 'top', label: 'Au top', color: 'var(--lime)' },
  { key: 'bien', label: 'Bien', color: 'var(--teal)' },
  { key: 'comme', label: 'Comme ça', color: 'var(--gold)' },
  { key: 'fatigue', label: 'Fatigué·e', color: 'var(--violet)' },
  { key: 'dur', label: 'Difficile', color: 'var(--coral)' },
]

type TabKey = 'accueil' | 'evolution' | 'produits' | 'conseils' | 'messages' | 'recommander'

export interface PwaClientAppProps {
  token: string
  clientName: string
  coachName: string
  assessmentsCount: number
  /** Delta de poids depuis le 1er bilan (négatif = perdu). null si inconnu. */
  weightDeltaKg: number | null
  nextFollowUp?: string | null
  programTitle?: string
  onOpenTour: () => void
  // Données onglets
  ageYears: number | null
  metrics: EvolutionMetricPoint[]
  measurements: EvolutionMeasurement[]
  products: PwaProduct[]
  coachAdvice?: string | null
  sportAlerts: PwaSportAlert[]
  lastAdviceDate?: string | null
  // Profil
  email?: string | null
  heightCm?: number | null
  objective?: string | null
  startDate?: string | null
}

type ScreenKey = 'app' | 'landing' | 'login' | 'onboarding' | 'distrib'

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '·'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function greetingFor(d: Date): string {
  const h = d.getHours()
  if (h >= 5 && h < 12) return 'Bonjour'
  if (h >= 12 && h < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

export function PwaClientApp({
  token,
  clientName,
  coachName,
  assessmentsCount,
  weightDeltaKg,
  nextFollowUp,
  programTitle,
  onOpenTour,
  ageYears,
  metrics,
  measurements,
  products,
  coachAdvice,
  sportAlerts,
  lastAdviceDate,
  email,
  heightCm,
  objective,
  startDate,
}: PwaClientAppProps) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [tab, setTab] = useState<TabKey>('accueil')
  const [profilOpen, setProfilOpen] = useState(false)
  const [screen, setScreen] = useState<ScreenKey>('app')
  const [loginRole, setLoginRole] = useState<'client' | 'distributeur'>('client')

  // Gamification (démo — à brancher sur client-xp + persistance humeur)
  const [xpLevel, setXpLevel] = useState(2)
  const [xpInLevel, setXpInLevel] = useState(196)
  const [xpExpanded, setXpExpanded] = useState(false)
  const [mood, setMood] = useState<string | null>(null)
  const [moodStreak, setMoodStreak] = useState(6)
  const [moodLoggedToday, setMoodLoggedToday] = useState(false)
  const [levelUpOpen, setLevelUpOpen] = useState(false)
  const [xpInfoOpen, setXpInfoOpen] = useState(false)
  const [levelUpFromTo, setLevelUpFromTo] = useState<{ from: string; to: string; level: number } | null>(null)

  // Noaly
  const [noalyOpen, setNoalyOpen] = useState(false)
  const [noalyLabelSeen, setNoalyLabelSeen] = useState(false)
  const [noalyThread, setNoalyThread] = useState<Array<{ role: 'user' | 'noaly'; text: string }>>([])

  // Anim d'intro XP (barre + compteur) au montage / retour Accueil
  const [xpAnim, setXpAnim] = useState(0)
  const [barsRevealed, setBarsRevealed] = useState(false)
  const rafRef = useRef<number | null>(null)

  const totalXp = (xpLevel - 1) * XP_PER_LEVEL + xpInLevel

  useEffect(() => {
    if (tab !== 'accueil') return
    setBarsRevealed(false)
    setXpAnim(0)
    const id = requestAnimationFrame(() => setBarsRevealed(true))
    const target = totalXp
    const dur = 950
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / dur)
      const eased = 1 - Math.pow(1 - p, 3)
      setXpAnim(Math.round(eased * target))
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(id)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  function addXp(gain: number) {
    let inLvl = xpInLevel + gain
    let lvl = xpLevel
    let leveled = false
    while (inLvl >= XP_PER_LEVEL && lvl < RANKS.length) {
      inLvl -= XP_PER_LEVEL
      lvl++
      leveled = true
    }
    if (leveled) {
      setLevelUpFromTo({
        from: `Niveau ${lvl - 1} · ${RANKS[lvl - 2] ?? ''}`,
        to: `Niveau ${lvl} · ${RANKS[lvl - 1] ?? ''}`,
        level: lvl,
      })
      setLevelUpOpen(true)
    }
    setXpInLevel(inLvl)
    setXpLevel(lvl)
  }

  function pickMood(key: string) {
    const first = !moodLoggedToday
    setMood(key)
    if (first) {
      setMoodStreak((s) => s + 1)
      setMoodLoggedToday(true)
      addXp(5)
    }
  }

  function toggleNoaly() {
    setNoalyOpen((o) => !o)
    setNoalyLabelSeen(true)
  }
  function askNoaly(key: string) {
    const s = NOALY_SUGGESTIONS.find((x) => x.key === key)
    if (!s) return
    setNoalyThread((t) => [...t, { role: 'user', text: s.chip }, { role: 'noaly', text: s.answer }])
  }

  const greeting = greetingFor(new Date())
  const initials = initialsOf(clientName)
  const rankName = `Niveau ${xpLevel} · ${RANKS[xpLevel - 1] ?? ''}`
  const xpBarPct = Math.min(100, Math.round((xpInLevel / XP_PER_LEVEL) * 100))
  const xpToNext = XP_PER_LEVEL - xpInLevel

  const deltaTxt =
    weightDeltaKg == null
      ? null
      : `${weightDeltaKg <= 0 ? '−' : '+'} ${Math.abs(weightDeltaKg).toFixed(1)}`

  // ── Styles réutilisés ────────────────────────────────────────────────────
  const eyebrow = (color = 'var(--teal)'): CSSProperties => ({
    fontFamily: MONO,
    fontSize: 10,
    letterSpacing: '.16em',
    textTransform: 'uppercase',
    color,
    fontWeight: 600,
  })
  const card: CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 18,
    padding: 18,
  }

  const navItems: Array<{ key: TabKey; label: string; icon: JSX.Element }> = [
    { key: 'accueil', label: 'Accueil', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg> },
    { key: 'evolution', label: 'Évolution', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l2-7 4 14 2-7h6" /></svg> },
    { key: 'produits', label: 'Produits', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><path d="M3 6h18M16 10a4 4 0 0 1-8 0" /></svg> },
    { key: 'conseils', label: 'Conseils', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0-4 10.5c.7.6 1 1.2 1 2V17h6v-1.5c0-.8.3-1.4 1-2A6 6 0 0 0 12 3z" /><path d="M9 21h6" /></svg> },
    { key: 'messages', label: 'Messages', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg> },
    { key: 'recommander', label: 'Club VIP', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" /></svg> },
  ]
  const leftNav = navItems.slice(0, 3)
  const rightNav = navItems.slice(3)

  function renderNavBtn(item: { key: TabKey; label: string; icon: JSX.Element }) {
    const activeTab = tab === item.key
    return (
      <button
        key={item.key}
        onClick={() => setTab(item.key)}
        className={`pwa2-navbtn${activeTab ? ' active-nav' : ''}`}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '6px 0 4px',
          transition: 'color .28s ease, box-shadow .28s ease',
          color: activeTab ? 'var(--lime)' : 'var(--muted)',
          boxShadow: activeTab ? 'inset 0 2px 0 var(--lime)' : 'inset 0 2px 0 transparent',
          position: 'relative',
        }}
      >
        {item.icon}
        <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '.01em' }}>{item.label}</span>
        {item.key === 'messages' && (
          <span style={{ position: 'absolute', top: 4, right: 'calc(50% - 15px)', width: 7, height: 7, borderRadius: '50%', background: 'var(--coral)', border: '1.5px solid var(--bg)' }} />
        )}
      </button>
    )
  }

  return (
    <div className={`pwa2 pwa2-frame${theme === 'light' ? ' pwa2-light' : ''}`}>
      {/* Blobs d'ambiance */}
      <div style={{ position: 'absolute', top: '-6%', right: '-18%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle,var(--lime),transparent 70%)', opacity: 0.08, filter: 'blur(70px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '20%', left: '-16%', width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle,var(--teal),transparent 70%)', opacity: 0.07, filter: 'blur(70px)', pointerEvents: 'none' }} />

      {/* Header condensé */}
      <div className="pwa2-header" style={{ position: 'relative', padding: 'calc(env(safe-area-inset-top, 0px) + 20px) 20px 6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setProfilOpen(true)} aria-label="Mon profil" style={{ width: 46, height: 46, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'linear-gradient(140deg,var(--teal),var(--teal-d))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: ANTON, fontSize: 16, color: '#04201b', flex: 'none' }}>{initials}</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: SORA, fontWeight: 600, fontSize: 18, color: 'var(--text)', lineHeight: 1.2 }}>{greeting} {clientName} !</div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: 'var(--muted)', marginTop: 2, letterSpacing: '.02em' }}>{programTitle ? `${programTitle} · ` : ''}{assessmentsCount} bilan{assessmentsCount > 1 ? 's' : ''}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 999, background: 'var(--surface)', border: '1px solid var(--border)', flex: 'none' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--teal)', boxShadow: '0 0 6px var(--teal)' }} />
            <span style={{ fontFamily: MONO, fontSize: 10, color: 'var(--muted)', whiteSpace: 'nowrap' }}>Coach {coachName}</span>
          </div>
          <button onClick={onOpenTour} style={{ width: 30, height: 30, flex: 'none', borderRadius: 9, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)', cursor: 'pointer', fontFamily: SORA, fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>?</button>
        </div>
      </div>

      {/* Contenu */}
      <div className="pwa2-content" style={{ position: 'relative', padding: '14px 18px 100px' }}>
        {tab === 'accueil' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'lbRise .4s ease both' }}>
            {/* 1. Ta régularité (XP) */}
            <div style={card}>
              <div onClick={() => setXpExpanded((v) => !v)} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(140deg,var(--teal),var(--violet))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: ANTON, fontSize: 18, color: '#fff', flex: 'none' }}>{xpLevel}</div>
                    <div>
                      <div style={eyebrow()}>Ta régularité</div>
                      <div style={{ fontFamily: SORA, fontWeight: 700, fontSize: 16, color: 'var(--text)', marginTop: 2 }}>{rankName}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontFamily: ANTON, fontSize: 15, color: '#04201b', background: 'linear-gradient(120deg,var(--teal),var(--lime))', padding: '7px 12px', borderRadius: 11 }}>{xpAnim} XP</div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: xpExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .25s', flex: 'none' }}><path d="M6 9l6 6 6-6" /></svg>
                  </div>
                </div>
                <div style={{ height: 8, borderRadius: 999, background: 'var(--surface2)', overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{ width: barsRevealed ? `${xpBarPct}%` : '0%', height: '100%', borderRadius: 999, background: 'linear-gradient(90deg,var(--teal),var(--lime) 60%,var(--violet))', transition: 'width .95s cubic-bezier(.16,1,.3,1)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 10, color: 'var(--muted)' }}>
                  <span>{xpInLevel} / {XP_PER_LEVEL} XP</span>
                  <span>{xpToNext} XP pour le niveau {xpLevel + 1}</span>
                </div>
              </div>
              {xpExpanded && (
                <>
                  <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', borderRadius: 12, background: 'var(--surface2)', border: '1px dashed var(--border2)' }}>
                    <div style={{ width: 32, height: 32, flex: 'none', borderRadius: 9, background: 'color-mix(in srgb,var(--violet) 16%,transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--violet)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--violet)', fontWeight: 700 }}>Prochaine récompense</div>
                      <div style={{ fontSize: 12.5, color: 'var(--text)', fontWeight: 600, marginTop: 1 }}>Surprise de ton coach · Niv. {xpLevel + 1}</div>
                    </div>
                  </div>
                  <button onClick={() => setXpInfoOpen(true)} style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', padding: 2, color: 'var(--muted)', fontSize: 11.5, cursor: 'pointer', textAlign: 'left' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
                    C'est quoi les XP ? <span style={{ color: 'var(--dim)' }}>(≠ points Club VIP)</span>
                  </button>
                </>
              )}
            </div>

            {/* 2. Humeur du jour */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, margin: '0 2px 10px' }}>
                <div style={eyebrow()}>Comment tu te sens ?</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999, background: 'color-mix(in srgb,var(--coral) 12%,transparent)', border: '1px solid color-mix(in srgb,var(--coral) 30%,transparent)', flex: 'none' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill={moodLoggedToday ? 'var(--coral)' : 'none'} stroke="var(--coral)" strokeWidth="1.4" strokeLinejoin="round"><path d="M12 2c1 3-1 4.5-1 6.5a3.5 3.5 0 0 0 7 0c0-1-.4-1.9-1-2.7 2 1.9 3 4 3 6.7a8 8 0 0 1-16 0c0-3.7 2.7-5.7 3.8-8.5C11 4.2 12 3.8 12 2z" /></svg>
                  <span style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 700, color: 'var(--coral)', whiteSpace: 'nowrap' }}>{moodStreak} j</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 7 }}>
                {MOODS.map((m) => {
                  const sel = mood === m.key
                  return (
                    <button key={m.key} onClick={() => pickMood(m.key)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, padding: '12px 4px', borderRadius: 13, background: sel ? `color-mix(in srgb,${m.color} 14%,var(--surface))` : 'var(--surface)', border: `1px solid ${sel ? m.color : 'var(--border)'}`, cursor: 'pointer' }}>
                      <span style={{ width: 16, height: 16, borderRadius: '50%', background: m.color }} />
                      <span style={{ fontSize: 9.5, fontWeight: 600, color: sel ? 'var(--text)' : 'var(--muted)', textAlign: 'center', lineHeight: 1.1 }}>{m.label}</span>
                    </button>
                  )
                })}
              </div>
              {moodLoggedToday && (
                <div style={{ marginTop: 9, fontSize: 11.5, color: 'var(--teal)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                  Noté ! {moodStreak} jours d'affilée · +5 XP
                </div>
              )}
            </div>

            {/* 3. Transformation */}
            <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 18, padding: 20, textAlign: 'center', background: 'linear-gradient(120deg,var(--teal-d),var(--teal))', boxShadow: '0 14px 34px -18px var(--teal)' }}>
              <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(4,32,27,0.7)', fontWeight: 600, marginBottom: 4 }}>Ta transformation</div>
              <div style={{ fontFamily: ANTON, fontSize: 46, lineHeight: 1, color: '#04201b' }}>{deltaTxt ?? '—'}</div>
              <div style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(4,32,27,0.75)', marginTop: 4 }}>KG {weightDeltaKg != null && weightDeltaKg > 0 ? 'PRIS' : 'PERDUS'}</div>
              <button onClick={() => setTab('evolution')} style={{ marginTop: 14, background: 'rgba(4,32,27,0.12)', border: 'none', borderRadius: 10, padding: '9px 16px', color: '#04201b', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>Voir toute mon évolution →</button>
            </div>

            {/* 4. Prochain RDV */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '3px solid var(--teal)', borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', gap: 13 }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: 'color-mix(in srgb,var(--teal) 14%,transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ ...eyebrow(), fontSize: 9, letterSpacing: '.14em' }}>Prochain RDV</div>
                <div style={{ fontFamily: SORA, fontWeight: 600, fontSize: 15, color: 'var(--text)', marginTop: 2 }}>{nextFollowUp ? new Date(nextFollowUp).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Pas encore de RDV'}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{nextFollowUp ? 'Ajoute-le à ton agenda depuis la messagerie.' : `Demande à ${coachName} un nouveau rendez-vous.`}</div>
              </div>
            </div>

            {/* 5. Programme Client Privilégié */}
            <div style={{ background: 'linear-gradient(135deg,color-mix(in srgb,var(--gold) 14%,var(--surface)),var(--surface))', border: '1px solid color-mix(in srgb,var(--gold) 26%,var(--border))', borderRadius: 18, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: 'color-mix(in srgb,var(--gold) 18%,transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-8 9 8-3 10H6z" /><path d="M8 21v-6h8v6" /></svg>
                </div>
                <div>
                  <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--gold)', fontWeight: 700 }}>Programme Client Privilégié</div>
                  <div style={{ fontFamily: SORA, fontWeight: 700, fontSize: 17, color: 'var(--text)', marginTop: 2 }}>Pas encore activé</div>
                </div>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 14 }}>Jusqu'à <strong style={{ color: 'var(--gold)' }}>−42 % à vie</strong> sur tes courses. Tu n'as pas encore activé ton compte client privilégié.</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={() => setTab('recommander')} style={{ width: '100%', minHeight: 46, borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(120deg,var(--gold),#c9a84c)', color: '#221803', fontFamily: SORA, fontWeight: 700, fontSize: 14 }}>Calcule ta remise</button>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={{ flex: 1, minHeight: 42, borderRadius: 11, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>M'inscrire</button>
                  <button onClick={() => setTab('recommander')} style={{ flex: 1, minHeight: 42, borderRadius: 11, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Comment ça marche ?</button>
                </div>
              </div>
            </div>

            {/* 6. Challengers */}
            <div style={{ background: 'linear-gradient(135deg,color-mix(in srgb,var(--teal) 12%,var(--surface)),var(--surface))', border: '1px solid color-mix(in srgb,var(--teal) 22%,var(--border))', borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', gap: 13 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'color-mix(in srgb,var(--teal) 16%,transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" /></svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: SORA, fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Rejoins les Challengers</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Communauté Telegram · motivation quotidienne</div>
              </div>
              <a href={TELEGRAM_GROUP_URL} target="_blank" rel="noopener noreferrer" style={{ flex: 'none', background: 'linear-gradient(120deg,var(--teal),var(--lime))', borderRadius: 999, padding: '9px 16px', color: '#04201b', fontFamily: SORA, fontSize: 12.5, fontWeight: 700, textDecoration: 'none' }}>Rejoindre</a>
            </div>

            {/* 7. Tuiles */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button onClick={() => setTab('evolution')} style={{ textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '18px 12px', cursor: 'pointer' }}>
                <div style={{ width: 38, height: 38, margin: '0 auto 8px', borderRadius: 11, background: 'color-mix(in srgb,var(--lime) 15%,transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--lime)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20L20 4M8 4H4v4M20 16v4h-4" /></svg>
                </div>
                <div style={{ fontFamily: SORA, fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>Mes mensurations</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>Suis ton évolution</div>
              </button>
              <button onClick={() => setTab('recommander')} style={{ textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '18px 12px', cursor: 'pointer' }}>
                <div style={{ width: 38, height: 38, margin: '0 auto 8px', borderRadius: 11, background: 'color-mix(in srgb,var(--violet) 15%,transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--violet)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></svg>
                </div>
                <div style={{ fontFamily: SORA, fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>Recommander</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>Parraine un ami</div>
              </button>
            </div>

            {/* 8. Avis Google */}
            <a href="https://www.google.com/maps/place/LA+BASE+Shakes%26Drinks" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px', textDecoration: 'none' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'color-mix(in srgb,var(--gold) 16%,transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--gold)"><path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 17.3 5.8 20.9l1.6-6.8L2.2 8.9l6.9-.6z" /></svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: SORA, fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>Laisser un avis Google</div>
                <div style={{ fontSize: 11.5, color: 'var(--gold)', marginTop: 1 }}>★★★★★ La Base — Verdun</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7M9 7h8v8" /></svg>
            </a>
          </div>
        ) : tab === 'evolution' ? (
          <EvolutionTab ageYears={ageYears} metrics={metrics} measurements={measurements} />
        ) : tab === 'produits' ? (
          <ProduitsTab products={products} onTalkToCoach={() => setTab('messages')} />
        ) : tab === 'conseils' ? (
          <ConseilsTab coachName={coachName} coachAdvice={coachAdvice} sportAlerts={sportAlerts} lastAdviceDate={lastAdviceDate} />
        ) : tab === 'messages' ? (
          <MessagesTab token={token} coachName={coachName} />
        ) : (
          <RecommanderTab coachName={coachName} onShareContact={() => setTab('messages')} />
        )}
      </div>

      {/* Bottom nav (mobile) / sidebar (desktop) + Noaly */}
      <div className="pwa2-nav" style={{ position: 'fixed', bottom: 0, left: '50%', right: 'auto', transform: 'translateX(-50%)', width: '100%', maxWidth: 440, background: 'color-mix(in srgb,var(--bg) 82%,transparent)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderTop: '1px solid var(--border)', display: 'flex', padding: '8px 2px calc(8px + env(safe-area-inset-bottom, 0px))', zIndex: 20 }}>
        {leftNav.map(renderNavBtn)}
        <button onClick={toggleNoaly} className="pwa2-noalybtn" style={{ flex: 'none', width: 62, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0 4px' }}>
          <span className="pwa2-noalyorb" style={{ position: 'relative', width: 50, height: 50, marginTop: -20, borderRadius: 17, background: 'linear-gradient(140deg,var(--teal),var(--lime))', border: '3px solid var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 30px -8px var(--teal)' }}>
            <span style={{ position: 'absolute', inset: 0, borderRadius: 17, background: 'var(--teal)', opacity: 0.5, animation: 'lbPing 2.6s ease-out infinite', pointerEvents: 'none' }} />
            <svg width="26" height="26" viewBox="0 0 24 24" fill="#04201b" style={{ position: 'relative' }}><path d="M12 2l1.9 5.1L19 9l-5.1 1.9L12 16l-1.9-5.1L5 9l5.1-1.9z" /></svg>
          </span>
          <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--teal)', letterSpacing: '.01em' }}>Noaly</span>
        </button>
        {rightNav.map(renderNavBtn)}
      </div>

      {/* Bulle d'accroche Noaly (1er passage Accueil) */}
      {!noalyLabelSeen && tab === 'accueil' && (
        <div style={{ position: 'fixed', bottom: 78, left: '50%', transform: 'translateX(-50%)', zIndex: 19, maxWidth: 220, padding: '10px 13px', borderRadius: '14px 14px 14px 14px', background: 'var(--surface)', border: '1px solid var(--border2)', boxShadow: '0 10px 24px -12px rgba(0,0,0,.7)', animation: 'lbFade .5s ease .4s both', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.45 }}>Une question ? <strong style={{ color: 'var(--teal)' }}>Demande à Noaly</strong></div>
        </div>
      )}

      {/* Panneau Noaly (bottom sheet) */}
      {noalyOpen && (
        <div onClick={() => setNoalyOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 75, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxHeight: '84%', display: 'flex', flexDirection: 'column', background: 'var(--surface)', borderTop: '1px solid var(--border2)', borderRadius: '26px 26px 0 0', animation: 'lbSheet .32s cubic-bezier(.16,1,.3,1)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '16px 18px 13px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 40, height: 40, flex: 'none', borderRadius: 13, background: 'linear-gradient(140deg,var(--teal),var(--lime))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="22" height="22" viewBox="0 0 24 24" fill="#04201b"><path d="M12 2l1.9 5.1L19 9l-5.1 1.9L12 16l-1.9-5.1L5 9l5.1-1.9z" /></svg></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: SORA, fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>Noaly</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Ton assistante La Base 360</div>
              </div>
              <button onClick={() => setNoalyOpen(false)} style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--muted)', cursor: 'pointer', fontSize: 15, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <div className="lb-scroll" style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ alignSelf: 'flex-start', maxWidth: '88%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '16px 16px 16px 5px', padding: '12px 14px', fontSize: 13.5, color: 'var(--text)', lineHeight: 1.5 }}>Salut ! Je suis Noaly, l'assistante du club. Pose-moi ta question — recette, info produit, ton programme… ou choisis un sujet :</div>
              {noalyThread.map((m, i) => (
                <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%', background: m.role === 'user' ? 'linear-gradient(135deg,color-mix(in srgb,var(--teal) 22%,var(--surface)),color-mix(in srgb,var(--lime) 14%,var(--surface)))' : 'var(--surface2)', border: `1px solid ${m.role === 'user' ? 'color-mix(in srgb,var(--teal) 26%,transparent)' : 'var(--border)'}`, borderRadius: m.role === 'user' ? '16px 16px 5px 16px' : '16px 16px 16px 5px', padding: '12px 14px', fontSize: 13.5, color: 'var(--text)', lineHeight: 1.5 }}>{m.text}</div>
              ))}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                {NOALY_SUGGESTIONS.map((s) => (
                  <button key={s.key} onClick={() => askNoaly(s.key)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 13px', borderRadius: 999, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', textAlign: 'left' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.8 4.7L18.5 9l-4.7 1.3L12 15l-1.8-4.7L5.5 9l4.7-1.3z" /></svg>
                    {s.chip}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ padding: '12px 18px calc(14px + env(safe-area-inset-bottom, 0px))', borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setNoalyOpen(false); setTab('messages') }} style={{ flex: 1, minHeight: 44, borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Écrire à {coachName}</button>
                <button onClick={() => { setNoalyOpen(false); onOpenTour() }} style={{ flex: 1, minHeight: 44, borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Tour de l'app</button>
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--dim)', textAlign: 'center', marginTop: 9, lineHeight: 1.5 }}>Noaly aide au quotidien. Pour ton suivi perso, {coachName} reste là.</div>
            </div>
          </div>
        </div>
      )}

      {/* Modale : passage de niveau */}
      {levelUpOpen && levelUpFromTo && (
        <div onClick={() => setLevelUpOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,0.68)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 22 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', width: '100%', overflow: 'hidden', background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 26, padding: '30px 22px 22px', textAlign: 'center', animation: 'lbRise .34s cubic-bezier(.16,1,.3,1)', boxShadow: '0 30px 70px -20px rgba(0,0,0,0.85)' }}>
            <div style={{ position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)', width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle,var(--lime),transparent 68%)', opacity: 0.16, filter: 'blur(30px)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', width: 88, height: 88, margin: '0 auto 16px' }}>
              <div style={{ position: 'absolute', inset: -8, borderRadius: '50%', background: 'conic-gradient(from 0deg,transparent,var(--teal) 30%,var(--lime) 60%,var(--violet) 85%,transparent)', animation: 'lbSpin 5s linear infinite', opacity: 0.85 }} />
              <div style={{ position: 'absolute', inset: -3, borderRadius: '50%', background: 'var(--surface)' }} />
              <div style={{ position: 'relative', width: 88, height: 88, borderRadius: '50%', background: 'linear-gradient(140deg,var(--teal),var(--violet))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: ANTON, fontSize: 38, color: '#fff' }}>{levelUpFromTo.level}</div>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--lime)', fontWeight: 700 }}>Niveau atteint</div>
            <h3 style={{ fontFamily: ANTON, textTransform: 'uppercase', fontSize: 29, lineHeight: 1.02, margin: '8px 0', color: 'var(--text)' }}>Bravo, {clientName} !</h3>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontFamily: SORA, fontSize: 14, color: 'var(--muted)', marginBottom: 16 }}>
              <span>{levelUpFromTo.from}</span>
              <svg width="20" height="12" viewBox="0 0 26 16" fill="none" stroke="var(--lime)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 8h20M17 3l5 5-5 5" /></svg>
              <span style={{ color: 'var(--text)', fontWeight: 700 }}>{levelUpFromTo.to}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', padding: 14, borderRadius: 16, background: 'linear-gradient(135deg,color-mix(in srgb,var(--gold) 14%,var(--surface2)),var(--surface2))', border: '1px solid color-mix(in srgb,var(--gold) 30%,var(--border))', marginBottom: 18 }}>
              <div style={{ width: 40, height: 40, flex: 'none', borderRadius: 12, background: 'color-mix(in srgb,var(--gold) 18%,transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13M5 12v9h14v-9M12 8C10 8 8 6 8 4a2 2 0 0 1 4 0zM12 8c2 0 4-2 4-4a2 2 0 0 0-4 0z" /></svg></div>
              <div>
                <div style={{ fontFamily: SORA, fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>Une surprise de ton coach t'attend</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5, marginTop: 2 }}>{coachName} vient d'être prévenu de ton passage. Il te prépare une petite attention.</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setLevelUpOpen(false)} style={{ flex: 'none', padding: '0 18px', minHeight: 50, borderRadius: 13, background: 'var(--surface2)', border: '1px solid var(--border2)', color: 'var(--muted)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Plus tard</button>
              <button onClick={() => { setLevelUpOpen(false); setTab('messages') }} style={{ flex: 1, minHeight: 50, borderRadius: 13, border: 'none', cursor: 'pointer', background: 'linear-gradient(120deg,var(--teal),var(--lime))', color: '#04201b', fontFamily: SORA, fontWeight: 700, fontSize: 14 }}>En parler à {coachName}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modale : c'est quoi les XP ? */}
      {xpInfoOpen && (
        <div onClick={() => setXpInfoOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(0,0,0,0.62)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="lb-scroll" style={{ width: '100%', maxHeight: '86%', overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 24, padding: 22, animation: 'lbRise .32s cubic-bezier(.16,1,.3,1)', boxShadow: '0 30px 70px -20px rgba(0,0,0,0.8)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 }}>
              <span style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>Deux compteurs, deux rôles</span>
              <button onClick={() => setXpInfoOpen(false)} style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--muted)', cursor: 'pointer', fontSize: 15, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <h3 style={{ fontFamily: ANTON, textTransform: 'uppercase', fontSize: 24, lineHeight: 1.04, margin: '0 0 16px', color: 'var(--text)' }}>XP ou points Club VIP ?</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 18 }}>
              <div style={{ borderRadius: 16, padding: 16, background: 'linear-gradient(135deg,color-mix(in srgb,var(--teal) 12%,var(--surface2)),var(--surface2))', border: '1px solid color-mix(in srgb,var(--teal) 30%,var(--border))' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
                  <div style={{ width: 34, height: 34, flex: 'none', borderRadius: 10, background: 'color-mix(in srgb,var(--teal) 18%,transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h7l-1 8 10-12h-7z" /></svg></div>
                  <div><div style={{ fontFamily: SORA, fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Tes XP</div><div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--teal)' }}>Ta régularité</div></div>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6 }}>Tu en gagnes en <strong style={{ color: 'var(--text)' }}>agissant</strong> : un bilan, une mensuration, ton humeur du jour. Elles font monter ton niveau — et à chaque palier, <strong style={{ color: 'var(--text)' }}>une surprise de ton coach</strong>. <strong style={{ color: 'var(--teal)' }}>Aucun achat requis.</strong></div>
              </div>
              <div style={{ borderRadius: 16, padding: 16, background: 'linear-gradient(135deg,color-mix(in srgb,var(--gold) 12%,var(--surface2)),var(--surface2))', border: '1px solid color-mix(in srgb,var(--gold) 30%,var(--border))' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
                  <div style={{ width: 34, height: 34, flex: 'none', borderRadius: 10, background: 'color-mix(in srgb,var(--gold) 18%,transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" /></svg></div>
                  <div><div style={{ fontFamily: SORA, fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Tes points Club VIP</div><div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--gold)' }}>Ta remise Herbalife</div></div>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6 }}>Ce sont les <strong style={{ color: 'var(--text)' }}>points Herbalife</strong> liés à tes commandes et à celles de ton entourage. Ils font grimper ta <strong style={{ color: 'var(--gold)' }}>remise, jusqu'à −42 % à vie</strong>. C'est le volet Club VIP.</div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--dim)', textAlign: 'center', lineHeight: 1.6, padding: '0 4px' }}>En résumé : <strong style={{ color: 'var(--text)' }}>les XP te motivent, les points Club VIP te font économiser.</strong></div>
            <button onClick={() => setXpInfoOpen(false)} style={{ marginTop: 16, width: '100%', minHeight: 48, borderRadius: 13, cursor: 'pointer', background: 'var(--surface2)', border: '1px solid var(--border2)', color: 'var(--text)', fontFamily: SORA, fontWeight: 700, fontSize: 14 }}>J'ai compris</button>
          </div>
        </div>
      )}

      {/* Profil / Réglages (overlay depuis l'avatar) */}
      {profilOpen && (
        <ProfilScreen
          initials={initials}
          clientName={clientName}
          email={email}
          ageYears={ageYears}
          heightCm={heightCm}
          objective={objective}
          startDate={startDate}
          theme={theme}
          onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          onBack={() => setProfilOpen(false)}
          onOpenTour={() => { setProfilOpen(false); onOpenTour() }}
          onLogout={() => { setProfilOpen(false); setScreen('landing') }}
        />
      )}

      {/* Écrans d'entrée (atteints via Déconnexion) — couvrent l'app */}
      {screen === 'landing' && (
        <LandingScreen
          onChooseClient={() => { setLoginRole('client'); setScreen('login') }}
          onChooseDistrib={() => { setLoginRole('distributeur'); setScreen('login') }}
        />
      )}
      {screen === 'login' && (
        <LoginScreen
          role={loginRole}
          defaultEmail={email}
          onBack={() => setScreen('landing')}
          onSubmit={() => setScreen(loginRole === 'distributeur' ? 'distrib' : 'onboarding')}
        />
      )}
      {screen === 'onboarding' && (
        <OnboardingScreen onDone={() => { setScreen('app'); setTab('accueil') }} />
      )}
      {screen === 'distrib' && (
        <DistribScreen name={clientName} onQuit={() => setScreen('landing')} />
      )}
    </div>
  )
}

