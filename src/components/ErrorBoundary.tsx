// ErrorBoundary V2 PREMIUM (2026-04-30)
//
// Refonte complete : ecran de crash / refresh joli + drole + educatif.
// - Halo gold radial + emoji float + phrase rotative qui change toutes
//   les 3.5s (mix astuces business + clins d oeil aux distri).
// - 1 seul CTA principal "Actualiser" qui fait window.location.reload()
//   (et NON plus un redirect vers /clients qui sortait du contexte).
// - Sub-text qui rappelle qu on peut aussi refresh via le navigateur.
// - Theme aware : tokens var(--ls-*) partout, halo + animations
//   respectent prefers-reduced-motion.

import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Optional compact fallback for sectional boundaries (e.g. around
   *  ProductAdder) instead of the default full-page crash UI.
   *  Added 2026-04-20 for defensive sectional wrapping. */
  fallback?: ReactNode
  /** Optional tag to help locate the crash source in console logs. */
  name?: string
}

interface State {
  hasError: boolean
  error: Error | null
  tipIndex: number
}

// 12 phrases rotatives — mix astuces business + culture produit + humour
// distri. Toutes user-facing FR, ton bienveillant et leger.
const TIPS: Array<{ emoji: string; text: string }> = [
  { emoji: '💡', text: "Pendant qu'on relance, le saviez-vous ? Un client recontacté à 7 jours fidélise 3× mieux." },
  { emoji: '🌿', text: "Astuce : un Liftoff = 30 % d'énergie en plus, sans le crash du café 4ème tasse." },
  { emoji: '🎯', text: "Pro tip : tes meilleurs clients sont ceux qui t'ont donné un avis Google. Demande-leur." },
  { emoji: '💪', text: "Reminder : ton meilleur outil de vente, c'est ton sourire et ton shake du matin." },
  { emoji: '🚀', text: "Fact : 90 % des distributeurs au top font leur shake matin avant 9h. Coïncidence ?" },
  { emoji: '📲', text: "Tu réponds à un client en moins de 2h ? Tu multiplies par 3 sa probabilité d'achat." },
  { emoji: '✨', text: "Chaque bug que tu remontes = une feature de plus la semaine d'après. Promis." },
  { emoji: '🥤', text: "Le Formula 1 cookies-cream + un peu de PPP + lait d'amande = goûter qui ferme la porte au grignotage." },
  { emoji: '🔥', text: "Un client en pause depuis 20 jours, c'est pas perdu. C'est juste qu'il attend ton message." },
  { emoji: '🧠', text: "Le savais-tu ? Le sommeil est le 4ème pilier. Pas de résultat sans 7h minimum." },
  { emoji: '🏆', text: "L'Ambassadeur VIP, c'est 3 mois consécutifs > 1000 PV. Pas plus, pas moins." },
  { emoji: '🌱', text: "Une recommandation = 5× plus de conversion qu'une prospection à froid. Demande-la." },
]

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, tipIndex: 0 }
  private tipTimer: number | null = null

  static getDerivedStateFromError(error: Error): State {
    // tipIndex aleatoire pour varier des le 1er render
    return { hasError: true, error, tipIndex: Math.floor(Math.random() * TIPS.length) }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    const tag = this.props.name ? `[ErrorBoundary:${this.props.name}]` : '[ErrorBoundary]'
    console.error(`${tag} render crash:`, error, info)
  }

  componentDidUpdate(_: Props, prevState: State) {
    // Lance le carrousel de tips quand l erreur apparait
    if (this.state.hasError && !prevState.hasError) {
      this.startTipRotation()
    }
    if (!this.state.hasError && prevState.hasError) {
      this.stopTipRotation()
    }
  }

  componentWillUnmount() {
    this.stopTipRotation()
  }

  startTipRotation = () => {
    this.stopTipRotation()
    // Respect prefers-reduced-motion : pas de rotation si l user veut moins de mvt
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return
    }
    this.tipTimer = window.setInterval(() => {
      this.setState((s) => ({ tipIndex: (s.tipIndex + 1) % TIPS.length }))
    }, 3500)
  }

  stopTipRotation = () => {
    if (this.tipTimer !== null) {
      window.clearInterval(this.tipTimer)
      this.tipTimer = null
    }
  }

  reset = () => {
    this.stopTipRotation()
    this.setState({ hasError: false, error: null, tipIndex: 0 })
  }

  hardReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      // Sectional fallback — ne casse pas toute la page.
      if (this.props.fallback) {
        return this.props.fallback
      }
      const tip = TIPS[this.state.tipIndex] ?? TIPS[0]
      return (
        <>
          <style>{`
            @keyframes ls-crash-float {
              0%, 100% { transform: translateY(0) rotate(0deg); }
              50%      { transform: translateY(-6px) rotate(-3deg); }
            }
            @keyframes ls-crash-pulse {
              0%, 100% { opacity: 0.6; transform: translateX(-50%) scale(1); }
              50%      { opacity: 0.9; transform: translateX(-50%) scale(1.06); }
            }
            @keyframes ls-tip-fade {
              0%   { opacity: 0; transform: translateY(6px); }
              100% { opacity: 1; transform: translateY(0); }
            }
            @media (prefers-reduced-motion: reduce) {
              .ls-crash-emoji,
              .ls-crash-halo,
              .ls-crash-tip { animation: none !important; }
            }
          `}</style>
          <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            fontFamily: 'DM Sans, sans-serif',
            background: 'var(--ls-bg, #0B0D11)',
          }}>
            <div style={{
              position: 'relative',
              overflow: 'hidden',
              background: 'radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--ls-gold, #C9A84C) 8%, var(--ls-surface, #1a1a1a)) 0%, var(--ls-surface, #1a1a1a) 60%)',
              border: '0.5px solid var(--ls-border, rgba(255,255,255,0.1))',
              borderRadius: 20,
              padding: '40px 28px 28px',
              maxWidth: 480,
              width: '100%',
              textAlign: 'center',
              color: 'var(--ls-text, #fff)',
              boxShadow: '0 24px 60px -20px rgba(0,0,0,0.4)',
            }}>
              {/* Halo gold pulse derriere l emoji */}
              <div
                aria-hidden
                className="ls-crash-halo"
                style={{
                  position: 'absolute',
                  top: 18,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 140,
                  height: 140,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, color-mix(in srgb, var(--ls-gold, #C9A84C) 22%, transparent) 0%, transparent 70%)',
                  pointerEvents: 'none',
                  filter: 'blur(8px)',
                  animation: 'ls-crash-pulse 3.4s ease-in-out infinite',
                }}
              />

              {/* Emoji crash float */}
              <div
                className="ls-crash-emoji"
                style={{
                  position: 'relative',
                  fontSize: 64,
                  lineHeight: 1,
                  marginBottom: 16,
                  animation: 'ls-crash-float 4s ease-in-out infinite',
                  filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.18))',
                }}
              >
                🙈
              </div>

              {/* Titre */}
              <h2 style={{
                position: 'relative',
                fontFamily: 'Syne, Georgia, serif',
                fontSize: 24,
                fontWeight: 800,
                margin: '0 0 8px',
                letterSpacing: '-0.02em',
                color: 'var(--ls-text, #fff)',
              }}>
                Oups, l'app a fait une pause shake.
              </h2>

              {/* Sous-titre explicatif */}
              <p style={{
                position: 'relative',
                fontSize: 14,
                color: 'var(--ls-text-muted, #9CA3AF)',
                margin: '0 0 24px',
                lineHeight: 1.55,
                fontFamily: 'DM Sans, sans-serif',
              }}>
                Pas de panique — un petit coup d'actualisation et tout repart.
                Aucune donnée n'est perdue, c'est juste l'écran qui a buggé.
              </p>

              {/* Tip rotatif */}
              <div style={{
                position: 'relative',
                background: 'color-mix(in srgb, var(--ls-teal, #0E7C7B) 10%, transparent)',
                border: '0.5px solid color-mix(in srgb, var(--ls-teal, #0E7C7B) 28%, transparent)',
                borderRadius: 12,
                padding: '14px 16px',
                marginBottom: 24,
                minHeight: 70,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                textAlign: 'left',
              }}>
                <div style={{ fontSize: 24, flexShrink: 0 }}>{tip.emoji}</div>
                <div
                  key={this.state.tipIndex}
                  className="ls-crash-tip"
                  style={{
                    fontSize: 13,
                    color: 'var(--ls-text, #fff)',
                    lineHeight: 1.5,
                    fontFamily: 'DM Sans, sans-serif',
                    animation: 'ls-tip-fade 0.4s ease-out',
                  }}
                >
                  {tip.text}
                </div>
              </div>

              {/* CTA principal Actualiser */}
              <button
                type="button"
                onClick={this.hardReload}
                style={{
                  width: '100%',
                  padding: '14px 22px',
                  borderRadius: 999,
                  border: 'none',
                  background: 'linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)',
                  color: 'white',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: 'pointer',
                  letterSpacing: '-0.005em',
                  boxShadow: '0 8px 20px -6px rgba(186,117,23,0.5), inset 0 1px 0 rgba(255,255,255,0.20)',
                  transition: 'transform 0.15s ease, filter 0.15s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.filter = 'brightness(1.08)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none'
                  e.currentTarget.style.filter = 'none'
                }}
              >
                <span aria-hidden style={{ fontSize: 16 }}>🔄</span>
                Actualiser ici
              </button>

              {/* Sous-texte navigateur */}
              <div style={{
                position: 'relative',
                fontSize: 12,
                color: 'var(--ls-text-hint, #6B7280)',
                marginTop: 14,
                lineHeight: 1.5,
                fontFamily: 'DM Sans, sans-serif',
              }}>
                Tu peux aussi cliquer sur le bouton 🔄 de ton navigateur,
                ou faire <kbd style={{
                  background: 'var(--ls-surface2, rgba(255,255,255,0.06))',
                  border: '0.5px solid var(--ls-border, rgba(255,255,255,0.1))',
                  borderRadius: 4,
                  padding: '1px 6px',
                  fontFamily: 'monospace',
                  fontSize: 11,
                  color: 'var(--ls-text-muted, #9CA3AF)',
                }}>Ctrl</kbd> + <kbd style={{
                  background: 'var(--ls-surface2, rgba(255,255,255,0.06))',
                  border: '0.5px solid var(--ls-border, rgba(255,255,255,0.1))',
                  borderRadius: 4,
                  padding: '1px 6px',
                  fontFamily: 'monospace',
                  fontSize: 11,
                  color: 'var(--ls-text-muted, #9CA3AF)',
                }}>R</kbd> sur PC ou pull-to-refresh sur mobile.
              </div>

              {/* Detail technique (collapsible, discret) */}
              {this.state.error && (
                <details style={{
                  position: 'relative',
                  textAlign: 'left',
                  fontSize: 11,
                  color: 'var(--ls-text-hint, #6B7280)',
                  background: 'var(--ls-surface2, rgba(0,0,0,0.2))',
                  padding: 10,
                  borderRadius: 8,
                  marginTop: 18,
                }}>
                  <summary style={{ cursor: 'pointer', userSelect: 'none' }}>
                    Détails techniques (pour Thomas)
                  </summary>
                  <pre style={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    marginTop: 8,
                    fontSize: 10,
                    fontFamily: 'monospace',
                    lineHeight: 1.4,
                  }}>
                    {this.state.error.message}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </>
      )
    }

    return this.props.children
  }
}
