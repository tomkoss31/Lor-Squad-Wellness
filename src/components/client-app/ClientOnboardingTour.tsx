// =============================================================================
// ClientOnboardingTour — chantier C (2026-11-04)
//
// Tour d'accueil PWA 4 slides plein ecran mobile-first. Affiche au mount
// de ClientAppPage si client_app_accounts.onboarded_at == NULL.
//
// 4 slides :
//   1. 👋 Bienvenue {Prenom} — Hero + RDV + ce qu on va faire ensemble
//   2. 📈 Comment lire ton evolution — graphique + points de depart
//   3. 💡 Tes conseils du jour — alertes sport / assiette / routine
//   4. 💬 Comment me parler — onglet messagerie coach
//
// Navigation : boutons Précédent / Suivant + dots indicateur. Bouton Skip
// toujours visible en haut à droite. Au "Terminer", appelle l edge function
// client-app-mark-onboarded pour persister onboarded_at.
//
// Theme-aware (respecte var(--ls-*)) — tonalite gold/teal Lor'Squad.
// =============================================================================

import { useState } from "react";

const FUNCTIONS_BASE_URL = (() => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!supabaseUrl) return null;
  return `${supabaseUrl}/functions/v1`;
})();

const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

interface Slide {
  emoji: string;
  eyebrow: string;
  title: string;
  intro: string;
  bullets?: string[];
  bgGradient: string;
  accent: string;
}

function getSlides(firstName: string, coachName: string): Slide[] {
  const hello = firstName.trim() || "toi";
  const coach = coachName.trim() || "ton coach";
  return [
    {
      emoji: "👋",
      eyebrow: "Bienvenue",
      title: `Salut ${hello} !`,
      intro: `Je suis ${coach}. Cette app est ton espace personnel pour suivre ton parcours bien-être avec moi. Voilà ce qu'on va faire ensemble :`,
      bullets: [
        "🎯 Garder ton cap et tes objectifs sous les yeux",
        "📊 Voir ton évolution semaine après semaine",
        "💬 On reste connecté·e·s entre les RDV",
      ],
      bgGradient:
        "linear-gradient(135deg, color-mix(in srgb, var(--ls-gold) 16%, var(--ls-bg)) 0%, color-mix(in srgb, var(--ls-teal) 8%, var(--ls-bg)) 100%)",
      accent: "var(--ls-gold)",
    },
    {
      emoji: "📈",
      eyebrow: "Évolution",
      title: "Ton parcours en un coup d'œil",
      intro:
        "Dans l'onglet Évolution, tu retrouveras tous tes bilans dans l'ordre. Le premier est ton point de départ — c'est ta photo de référence.",
      bullets: [
        "📍 Ton point de départ marqué en gold",
        "📉 Tes 5 derniers bilans + l'écart par rapport au départ",
        "🎯 Couleurs adaptées à ton objectif (perte / sport)",
      ],
      bgGradient:
        "linear-gradient(135deg, color-mix(in srgb, var(--ls-teal) 16%, var(--ls-bg)) 0%, color-mix(in srgb, var(--ls-purple) 8%, var(--ls-bg)) 100%)",
      accent: "var(--ls-teal)",
    },
    {
      emoji: "💡",
      eyebrow: "Conseils",
      title: "Tes alertes au quotidien",
      intro:
        "L'onglet Conseils t'envoie des rappels personnalisés en fonction de ton bilan. Pas de spam — juste ce qui compte vraiment.",
      bullets: [
        "🚨 Points d'attention détectés sur ton bilan",
        "🍽️ Ton assiette idéale visualisée",
        "☀️ Ta routine quotidienne détaillée heure par heure",
      ],
      bgGradient:
        "linear-gradient(135deg, color-mix(in srgb, var(--ls-purple) 16%, var(--ls-bg)) 0%, color-mix(in srgb, var(--ls-gold) 8%, var(--ls-bg)) 100%)",
      accent: "var(--ls-purple)",
    },
    {
      emoji: "💬",
      eyebrow: "On reste en contact",
      title: "Une question ? Tu m'écris ici",
      intro: `Pas besoin d'attendre le prochain RDV. ${coach} est là pour toi entre les bilans, dans l'onglet Messagerie.`,
      bullets: [
        "✉️ Réponse rapide aux questions du quotidien",
        "📷 Tu peux partager une photo, un repas, une humeur",
        "🤝 Pas de jugement, juste de l'accompagnement",
      ],
      bgGradient:
        "linear-gradient(135deg, color-mix(in srgb, var(--ls-coral) 16%, var(--ls-bg)) 0%, color-mix(in srgb, var(--ls-gold) 8%, var(--ls-bg)) 100%)",
      accent: "var(--ls-coral)",
    },
  ];
}

export interface ClientOnboardingTourProps {
  /** Token client (UUID) pour persister onboarded_at via edge function. */
  token: string;
  /** Prénom client pour personnalisation. */
  firstName: string;
  /** Prénom coach pour signature. */
  coachName: string;
  /** Callback appelé quand le tour est complété ou skipped. */
  onComplete: () => void;
}

export function ClientOnboardingTour({
  token,
  firstName,
  coachName,
  onComplete,
}: ClientOnboardingTourProps) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const slides = getSlides(firstName, coachName);
  const slide = slides[slideIndex];
  const isLast = slideIndex === slides.length - 1;
  const isFirst = slideIndex === 0;

  async function persistOnboarded() {
    if (!FUNCTIONS_BASE_URL || !SUPABASE_ANON_KEY) {
      console.warn("[onboarding-tour] Supabase env missing — skip persist");
      return;
    }
    try {
      await fetch(`${FUNCTIONS_BASE_URL}/client-app-mark-onboarded`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ token }),
      });
    } catch (err) {
      console.warn("[onboarding-tour] persist failed (non-blocking):", err);
    }
  }

  async function handleFinish() {
    if (submitting) return;
    setSubmitting(true);
    await persistOnboarded();
    onComplete();
  }

  async function handleSkip() {
    if (submitting) return;
    setSubmitting(true);
    await persistOnboarded();
    onComplete();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bienvenue dans ton espace bien-être"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: slide.bgGradient,
        display: "flex",
        flexDirection: "column",
        padding: "max(20px, env(safe-area-inset-top, 20px)) 20px max(20px, env(safe-area-inset-bottom, 20px))",
        fontFamily: "DM Sans, sans-serif",
        color: "var(--ls-text)",
        animation: "ls-onboarding-fade-in 360ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      <style>{`
        @keyframes ls-onboarding-fade-in {
          0%   { opacity: 0; transform: scale(0.98); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes ls-onboarding-slide-content {
          0%   { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header : skip + dots indicator */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          {slides.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === slideIndex ? 24 : 8,
                height: 4,
                borderRadius: 2,
                background:
                  i === slideIndex
                    ? slide.accent
                    : i < slideIndex
                      ? "color-mix(in srgb, var(--ls-text) 30%, transparent)"
                      : "color-mix(in srgb, var(--ls-text) 12%, transparent)",
                transition: "all 360ms cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            />
          ))}
        </div>
        {!isLast ? (
          <button
            type="button"
            onClick={handleSkip}
            disabled={submitting}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--ls-text-muted)",
              fontFamily: "DM Sans, sans-serif",
              fontSize: 13,
              fontWeight: 500,
              cursor: submitting ? "wait" : "pointer",
              padding: "6px 10px",
            }}
          >
            Passer →
          </button>
        ) : null}
      </div>

      {/* Content centered */}
      <div
        key={slideIndex}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          padding: "24px 8px",
          animation: "ls-onboarding-slide-content 420ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {/* Big emoji */}
        <div
          style={{
            fontSize: 80,
            lineHeight: 1,
            marginBottom: 24,
            filter: `drop-shadow(0 8px 24px color-mix(in srgb, ${slide.accent} 40%, transparent))`,
          }}
          aria-hidden="true"
        >
          {slide.emoji}
        </div>

        {/* Eyebrow */}
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: slide.accent,
            marginBottom: 12,
          }}
        >
          ✦ {slide.eyebrow}
        </div>

        {/* Title */}
        <h2
          style={{
            fontFamily: "Syne, serif",
            fontWeight: 800,
            fontSize: "clamp(26px, 7vw, 36px)",
            letterSpacing: "-0.025em",
            lineHeight: 1.12,
            color: "var(--ls-text)",
            margin: "0 0 16px 0",
            maxWidth: 480,
          }}
        >
          {slide.title}
        </h2>

        {/* Intro */}
        <p
          style={{
            fontSize: "clamp(14px, 4vw, 16px)",
            lineHeight: 1.6,
            color: "var(--ls-text-muted)",
            margin: "0 0 24px 0",
            maxWidth: 440,
          }}
        >
          {slide.intro}
        </p>

        {/* Bullets */}
        {slide.bullets ? (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: "0 0 16px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              maxWidth: 420,
              width: "100%",
            }}
          >
            {slide.bullets.map((b, i) => (
              <li
                key={i}
                style={{
                  padding: "12px 16px",
                  borderRadius: 12,
                  background: "color-mix(in srgb, var(--ls-text) 4%, transparent)",
                  border: `0.5px solid color-mix(in srgb, ${slide.accent} 22%, var(--ls-border))`,
                  fontSize: 14,
                  color: "var(--ls-text)",
                  lineHeight: 1.5,
                  textAlign: "left",
                  fontWeight: 500,
                }}
              >
                {b}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* Footer : prev / next */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <button
          type="button"
          onClick={() => setSlideIndex((i) => Math.max(0, i - 1))}
          disabled={isFirst || submitting}
          style={{
            padding: "12px 20px",
            background: "transparent",
            border: "none",
            color: isFirst ? "var(--ls-text-hint)" : "var(--ls-text-muted)",
            fontFamily: "DM Sans, sans-serif",
            fontSize: 14,
            fontWeight: 600,
            cursor: isFirst ? "default" : "pointer",
            opacity: isFirst ? 0.4 : 1,
          }}
        >
          ← Précédent
        </button>

        <button
          type="button"
          onClick={() => {
            if (isLast) {
              void handleFinish();
            } else {
              setSlideIndex((i) => Math.min(slides.length - 1, i + 1));
            }
          }}
          disabled={submitting}
          style={{
            padding: "14px 28px",
            background: `linear-gradient(135deg, ${slide.accent} 0%, color-mix(in srgb, ${slide.accent} 70%, var(--ls-bg)) 100%)`,
            color: "var(--ls-bg)",
            border: "none",
            borderRadius: 14,
            fontFamily: "Syne, serif",
            fontSize: 15,
            fontWeight: 700,
            cursor: submitting ? "wait" : "pointer",
            boxShadow: `0 6px 18px color-mix(in srgb, ${slide.accent} 40%, transparent)`,
            transition: "all 200ms ease",
          }}
        >
          {isLast ? (submitting ? "⏳…" : "✨ C'est parti !") : "Suivant →"}
        </button>
      </div>
    </div>
  );
}
