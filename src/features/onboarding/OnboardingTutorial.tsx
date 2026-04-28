// Chantier Tuto interactif client (2026-04-24).
//
// REFONTE Tier B (2026-04-28) : 7 → 10 etapes pour couvrir 100 % de l app.
//
// Etapes :
//   0. WelcomeStage premium (gradient gold, 5 onglets en preview, anim)
//   1. Spotlight Prochain RDV
//   2. MetricStage Masse grasse (jauge + zones)
//   3. MetricStage Hydratation (jauge + zones)
//   4. Spotlight Onglet Evolution (graph + silhouette mensurations)  ← NOUVEAU
//   5. Spotlight Onglet Conseils (assiette ideale + routine)         ← NOUVEAU
//   6. Spotlight Onglet Produits (programme + reco)                  ← NOUVEAU
//   7. Spotlight Messagerie
//   8. FinalStage premium (checklist + CTA explore + bonus sandbox)
//
// L indicateur "N/8" couvre les etapes 1-8 (on masque 0 et 9 qui sont
// les bookends).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TutorialTooltip } from "./components/TutorialTooltip";
import { MetricGauge } from "./components/MetricGauge";
import { SpotlightOverlay as SharedSpotlightOverlay } from "./components/SpotlightOverlay";
import {
  BODY_FAT_RANGES,
  HYDRATATION_RANGES,
  findRange,
  motivationMessage,
  type MetricRange,
  type MetricSex,
} from "./data/metricRanges";

export interface OnboardingTutorialProps {
  firstName: string;
  coachName: string;
  sex?: MetricSex;
  bodyFat?: number | null;
  hydration?: number | null;
  // Selecteurs CSS des cibles spotlight dans ClientAppPage.
  selectors?: {
    nextRdv?: string;
    program?: string;
    messaging?: string;
    // Tier B (2026-04-28) : 3 selectors onglets bottom nav.
    tabEvolution?: string;
    tabConseils?: string;
    tabProduits?: string;
  };
  /**
   * Tier B (2026-04-28) : si fourni, le bouton "Mode pratique" sur le
   * FinalStage navigue ici (typiquement /client/:token/sandbox). Sinon
   * le bouton n est pas rendu.
   */
  sandboxHref?: string;
  onClose: (reason: "completed" | "skipped" | "dismissed") => void;
}

type Stage = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

const TOTAL_VISIBLE_STEPS = 7; // stages 1..7 (le 8 est le final bookend)

export function OnboardingTutorial({
  firstName,
  coachName,
  sex = "female",
  bodyFat,
  hydration,
  selectors,
  sandboxHref,
  onClose,
}: OnboardingTutorialProps) {
  const [stage, setStage] = useState<Stage>(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const rafRef = useRef<number | null>(null);

  // ─── Resolution de la cible selon stage ──────────────────────────────────
  const targetSelector = useMemo(() => {
    switch (stage) {
      case 1:
        return selectors?.nextRdv;
      case 4:
        return selectors?.tabEvolution;
      case 5:
        return selectors?.tabConseils;
      case 6:
        return selectors?.tabProduits;
      case 7:
        return selectors?.messaging;
      default:
        return undefined;
    }
  }, [stage, selectors]);

  useEffect(() => {
    if (!targetSelector) {
      setTargetRect(null);
      return;
    }
    const compute = () => {
      const el = document.querySelector(targetSelector);
      if (!el) {
        setTargetRect(null);
        return;
      }
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
      try {
        (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "center" });
      } catch {
        // no-op
      }
    };
    compute();
    const handler = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = window.requestAnimationFrame(compute);
    };
    window.addEventListener("resize", handler);
    window.addEventListener("scroll", handler, true);
    const interval = window.setInterval(compute, 500); // rescroll-safe
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("scroll", handler, true);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.clearInterval(interval);
    };
  }, [targetSelector]);

  // ─── Handlers navigation ─────────────────────────────────────────────────
  const goNext = useCallback(() => {
    setStage((s) => {
      const next = (s + 1) as Stage;
      if (next > 8) {
        onClose("completed");
        return s;
      }
      return next;
    });
  }, [onClose]);

  const goPrev = useCallback(() => {
    setStage((s) => (s > 0 ? ((s - 1) as Stage) : 0));
  }, []);

  const skip = useCallback(() => {
    onClose("skipped");
  }, [onClose]);

  // Escape key = skip (hors stage 0 et 8 ou on veut explicit)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && stage !== 0 && stage !== 8) skip();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [skip, stage]);

  // ─── Rendu ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* Overlay dimmed + spotlight si on a un rect. */}
      <SpotlightOverlay rect={targetRect} onClick={stage === 0 || stage === 8 ? undefined : skip} />

      {stage === 0 ? (
        <WelcomeStage firstName={firstName} onContinue={goNext} onSkip={skip} />
      ) : null}

      {stage === 1 ? (
        <TutorialTooltip
          stepIndex={0}
          totalSteps={TOTAL_VISIBLE_STEPS}
          title="Ton prochain RDV"
          targetRect={targetRect}
          placement={targetRect ? "bottom" : "center"}
          onNext={goNext}
          onSkip={skip}
        >
          Tu vois toujours quand {coachName} t&apos;accompagne. En un clic, tu peux
          lui demander de décaler ou lui poser une question avant.
        </TutorialTooltip>
      ) : null}

      {stage === 2 ? (
        <MetricStage
          title="Ta masse grasse"
          intro={`C'est le pourcentage de graisse dans ton corps. Pour ${sex === "male" ? "un homme" : "une femme"}, voici les zones :`}
          value={bodyFat ?? null}
          unit="%"
          ranges={BODY_FAT_RANGES[sex]}
          metricKey="body_fat"
          firstName={firstName}
          stepIndex={1}
          onNext={goNext}
          onPrev={goPrev}
          onSkip={skip}
        />
      ) : null}

      {stage === 3 ? (
        <MetricStage
          title="Ton hydratation"
          intro="L'hydratation, c'est le carburant de tes cellules. Voici les zones :"
          value={hydration ?? null}
          unit="%"
          ranges={HYDRATATION_RANGES[sex]}
          metricKey="hydration"
          firstName={firstName}
          stepIndex={2}
          onNext={goNext}
          onPrev={goPrev}
          onSkip={skip}
        />
      ) : null}

      {/* NOUVEAU stage 4 — Onglet Evolution (Tier B 2026-04-28) */}
      {stage === 4 ? (
        <TutorialTooltip
          stepIndex={3}
          totalSteps={TOTAL_VISIBLE_STEPS}
          title="📈 Ton évolution complète"
          targetRect={targetRect}
          placement={targetRect ? "top" : "center"}
          onNext={goNext}
          onPrev={goPrev}
          onSkip={skip}
        >
          Dans cet onglet, tu retrouves <strong>ton graphique de poids bilan
          après bilan</strong> + 4 indicateurs clés (poids, masse grasse,
          muscle, eau). Tu peux aussi y saisir tes <strong>mensurations</strong>{" "}
          en cliquant les ronds gold sur la silhouette — chaque mesure t&apos;aide
          à voir tes progrès au-delà de la balance.
        </TutorialTooltip>
      ) : null}

      {/* NOUVEAU stage 5 — Onglet Conseils (Tier B 2026-04-28) */}
      {stage === 5 ? (
        <TutorialTooltip
          stepIndex={4}
          totalSteps={TOTAL_VISIBLE_STEPS}
          title="💡 Tes conseils du jour"
          targetRect={targetRect}
          placement={targetRect ? "top" : "center"}
          onNext={goNext}
          onPrev={goPrev}
          onSkip={skip}
        >
          Tu trouves ici <strong>ton assiette idéale</strong> (visualisation
          camembert), <strong>ta routine quotidienne</strong> heure par heure,
          et les <strong>conseils perso</strong> que {coachName} a
          ajoutés pour toi. À consulter chaque jour pour rester sur la bonne
          trajectoire.
        </TutorialTooltip>
      ) : null}

      {/* NOUVEAU stage 6 — Onglet Produits (Tier B 2026-04-28) */}
      {stage === 6 ? (
        <TutorialTooltip
          stepIndex={5}
          totalSteps={TOTAL_VISIBLE_STEPS}
          title="🛒 Tes produits Herbalife"
          targetRect={targetRect}
          placement={targetRect ? "top" : "center"}
          onNext={goNext}
          onPrev={goPrev}
          onSkip={skip}
        >
          <strong>Ton programme actuel</strong> que {coachName} a défini
          après ton dernier bilan, et les <strong>recommandés ⭐</strong> qui
          peuvent accélérer ta progression. Pour commander ou demander un
          conseil, tu écris à {coachName} dans la messagerie.
        </TutorialTooltip>
      ) : null}

      {stage === 7 ? (
        <TutorialTooltip
          stepIndex={6}
          totalSteps={TOTAL_VISIBLE_STEPS}
          title={`Besoin de parler à ${coachName} ?`}
          targetRect={targetRect}
          placement={targetRect ? "top" : "center"}
          onNext={goNext}
          onPrev={goPrev}
          onSkip={skip}
        >
          Pose tes questions, demande à décaler un RDV, ou partage tes
          ressentis. {coachName} reçoit une notif et te répond au plus vite.
        </TutorialTooltip>
      ) : null}

      {stage === 8 ? (
        <FinalStage
          firstName={firstName}
          coachName={coachName}
          sandboxHref={sandboxHref}
          onClose={() => onClose("completed")}
        />
      ) : null}
    </>
  );
}

// ─── Spotlight overlay ─────────────────────────────────────────────────────
function SpotlightOverlay({
  rect,
  onClick,
}: {
  rect: DOMRect | null;
  onClick?: () => void;
}) {
  // Si pas de rect (stage modale), overlay plein. Sinon, découpe via
  // 4 rectangles autour de la cible pour laisser passer le spotlight.
  if (!rect) {
    return (
      <div
        onClick={onClick}
        role={onClick ? "button" : "presentation"}
        aria-label={onClick ? "Fermer le tutoriel" : undefined}
        tabIndex={onClick ? 0 : undefined}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(10, 15, 25, 0.6)",
          backdropFilter: "blur(2px)",
          zIndex: 10000,
          cursor: onClick ? "pointer" : "default",
        }}
      />
    );
  }
  return (
    <>
      <SharedSpotlightOverlay targetRect={rect} />
      {onClick ? (
        <div
          onClick={onClick}
          role="button"
          aria-label="Fermer le tutoriel"
          tabIndex={0}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            background: "transparent",
            cursor: "pointer",
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") onClick();
          }}
        />
      ) : null}
    </>
  );
}

// ─── Welcome stage REFONDU premium (Tier B 2026-04-28) ────────────────────
//
// Modale centree avec gradient gold anime + preview des 5 onglets en grille
// + indicateur "10 minutes" + bouton C'est parti gold premium + sub-text
// "Tu pourras relancer ce tuto a tout moment".

const ONBOARDING_PREVIEW_TABS = [
  { emoji: "🏠", label: "Accueil", desc: "Ton espace" },
  { emoji: "📈", label: "Évolution", desc: "Tes progrès" },
  { emoji: "🛒", label: "Produits", desc: "Ton programme" },
  { emoji: "💡", label: "Conseils", desc: "Au quotidien" },
  { emoji: "💬", label: "Messages", desc: "Avec ton coach" },
];

function WelcomeStage({
  firstName,
  onContinue,
  onSkip,
}: {
  firstName: string;
  onContinue: () => void;
  onSkip: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bienvenue"
      style={{
        position: "fixed",
        zIndex: 10001,
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "calc(100% - 32px)",
        maxWidth: 480,
        background:
          "linear-gradient(180deg, #FFFFFF 0%, #FFFEF5 60%, #FAF6E8 100%)",
        borderRadius: 22,
        padding: 26,
        boxShadow:
          "0 24px 60px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(184,146,42,0.20)",
        textAlign: "center",
        fontFamily: "DM Sans, sans-serif",
        animation: "ls-welcome-enter 360ms cubic-bezier(0.2, 0.8, 0.2, 1)",
      }}
    >
      <style>{`
        @keyframes ls-welcome-enter {
          0% { opacity: 0; transform: translate(-50%, -45%) scale(0.94); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes ls-welcome-wave {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-12deg); }
          75% { transform: rotate(8deg); }
        }
        @keyframes ls-welcome-tab-pop {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Wave */}
      <div
        style={{
          fontSize: 48,
          marginBottom: 8,
          display: "inline-block",
          animation: "ls-welcome-wave 1400ms ease-out",
          transformOrigin: "70% 70%",
        }}
      >
        👋
      </div>

      {/* Eyebrow */}
      <div
        style={{
          fontSize: 10,
          letterSpacing: 2,
          textTransform: "uppercase",
          color: "#B8922A",
          fontWeight: 700,
          marginBottom: 4,
        }}
      >
        Lor&apos;Squad · Bienvenue
      </div>

      {/* Title */}
      <p
        style={{
          fontFamily: "Syne, sans-serif",
          fontSize: 24,
          fontWeight: 600,
          color: "#111827",
          margin: 0,
          marginBottom: 8,
          lineHeight: 1.2,
        }}
      >
        Bienvenue {firstName} 🎉
      </p>

      {/* Subtitle */}
      <p
        style={{
          fontSize: 14,
          color: "#4B5563",
          lineHeight: 1.55,
          marginBottom: 20,
          maxWidth: 360,
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        Ton coach a préparé ton espace pour suivre tes progrès. <strong>Voici les 5 onglets que tu vas découvrir</strong> ⤵
      </p>

      {/* Preview 5 tabs grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 6,
          marginBottom: 22,
          padding: "10px 4px",
          background: "rgba(255,255,255,0.6)",
          borderRadius: 14,
          border: "0.5px solid rgba(184,146,42,0.25)",
        }}
      >
        {ONBOARDING_PREVIEW_TABS.map((tab, idx) => (
          <div
            key={tab.label}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              padding: "6px 4px",
              animation: `ls-welcome-tab-pop 360ms ${300 + idx * 80}ms ease-out backwards`,
            }}
          >
            <span style={{ fontSize: 22, lineHeight: 1 }}>{tab.emoji}</span>
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: "#5C4A0F",
                fontFamily: "Syne, sans-serif",
                marginTop: 4,
                textAlign: "center",
              }}
            >
              {tab.label}
            </span>
            <span
              style={{
                fontSize: 8,
                color: "#888",
                textAlign: "center",
                lineHeight: 1.1,
              }}
            >
              {tab.desc}
            </span>
          </div>
        ))}
      </div>

      {/* Duration hint */}
      <div
        style={{
          fontSize: 11,
          color: "#6B6B62",
          marginBottom: 18,
          fontStyle: "italic",
        }}
      >
        ⏱️ Tour guidé en 2 minutes — passe quand tu veux
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={onSkip}
          style={{
            padding: "12px 18px",
            borderRadius: 12,
            background: "transparent",
            color: "#6B7280",
            border: "1px solid rgba(0,0,0,0.12)",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          Plus tard
        </button>
        <button
          type="button"
          onClick={onContinue}
          style={{
            padding: "12px 24px",
            borderRadius: 12,
            background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
            color: "#FFFFFF",
            border: "none",
            fontFamily: "Syne, sans-serif",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            letterSpacing: 0.3,
            boxShadow: "0 4px 14px rgba(186,117,23,0.40)",
          }}
        >
          C&apos;est parti ✨
        </button>
      </div>

      <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 14, marginBottom: 0 }}>
        Tu pourras relancer ce tutoriel à tout moment.
      </p>
    </div>
  );
}

// ─── Final stage REFONDU premium (Tier B 2026-04-28) ──────────────────────
//
// Avant : modale 🎉 + texte + bouton "C'est parti".
// Apres : checklist 6 features explorees (cochees) + bouton primaire
// "Explorer mon espace" + bouton secondaire "Mode pratique" si
// sandboxHref fourni (Livraison B).

const FINAL_CHECKLIST = [
  { emoji: "📅", label: "Tes RDV avec le coach" },
  { emoji: "💪", label: "Ta masse grasse + zones" },
  { emoji: "💧", label: "Ton hydratation" },
  { emoji: "📈", label: "Ton évolution + mensurations" },
  { emoji: "💡", label: "Conseils + assiette idéale" },
  { emoji: "🛒", label: "Tes produits + recommandés" },
  { emoji: "💬", label: "Messagerie directe coach" },
];

function FinalStage({
  firstName,
  coachName,
  sandboxHref,
  onClose,
}: {
  firstName: string;
  coachName: string;
  sandboxHref?: string;
  onClose: () => void;
}) {
  function handleSandbox() {
    if (sandboxHref) {
      window.location.href = sandboxHref;
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tutoriel terminé"
      style={{
        position: "fixed",
        zIndex: 10001,
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "calc(100% - 32px)",
        maxWidth: 460,
        maxHeight: "calc(100vh - 32px)",
        overflowY: "auto",
        background:
          "linear-gradient(180deg, #FFFFFF 0%, #FFFEF5 60%, #FAF6E8 100%)",
        borderRadius: 22,
        padding: 26,
        boxShadow:
          "0 24px 60px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(184,146,42,0.20)",
        textAlign: "center",
        fontFamily: "DM Sans, sans-serif",
        animation: "ls-final-enter 360ms cubic-bezier(0.2, 0.8, 0.2, 1)",
      }}
    >
      <style>{`
        @keyframes ls-final-enter {
          0% { opacity: 0; transform: translate(-50%, -45%) scale(0.94); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes ls-final-tada {
          0%, 100% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.12) rotate(-6deg); }
        }
        @keyframes ls-final-check-pop {
          0% { opacity: 0; transform: scale(0.7); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <div
        aria-hidden="true"
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(29,158,117,0.22) 0%, rgba(29,158,117,0.05) 70%)",
          color: "#0F6E56",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 36,
          margin: "0 auto 14px",
          animation: "ls-final-tada 700ms 200ms ease-out backwards",
        }}
      >
        🎉
      </div>

      <p
        style={{
          fontFamily: "Syne, sans-serif",
          fontSize: 24,
          fontWeight: 600,
          color: "#111827",
          margin: 0,
          marginBottom: 6,
        }}
      >
        Bravo {firstName} !
      </p>
      <p style={{ fontSize: 13, color: "#4B5563", lineHeight: 1.55, margin: "0 0 18px" }}>
        Tu connais ton espace. <strong>{coachName}</strong> et l&apos;app sont là
        pour t&apos;accompagner.
      </p>

      {/* Checklist features explorees */}
      <div
        style={{
          textAlign: "left",
          padding: "12px 14px",
          background: "rgba(255,255,255,0.7)",
          borderRadius: 14,
          border: "0.5px solid rgba(184,146,42,0.25)",
          marginBottom: 18,
        }}
      >
        <div
          style={{
            fontSize: 10,
            letterSpacing: 1.4,
            textTransform: "uppercase",
            color: "#B8922A",
            fontWeight: 700,
            marginBottom: 8,
          }}
        >
          Tu as découvert
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {FINAL_CHECKLIST.map((item, idx) => (
            <div
              key={item.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                animation: `ls-final-check-pop 220ms ${300 + idx * 60}ms ease-out backwards`,
              }}
            >
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: "#1D9E75",
                  color: "white",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                ✓
              </span>
              <span style={{ fontSize: 14, lineHeight: 1 }}>{item.emoji}</span>
              <span style={{ fontSize: 12, color: "#374151" }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <p style={{ fontSize: 12, color: "#6B6B62", marginBottom: 18, fontStyle: "italic" }}>
        Si tu as un doute, clique sur l&apos;icône <strong>?</strong> en haut à droite pour relancer ce tuto.
      </p>

      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        {sandboxHref ? (
          <button
            type="button"
            onClick={handleSandbox}
            style={{
              padding: "12px 18px",
              borderRadius: 12,
              background:
                "linear-gradient(135deg, rgba(184,146,42,0.10), rgba(184,146,42,0.20))",
              color: "#5C4A0F",
              border: "0.5px solid rgba(184,146,42,0.50)",
              fontFamily: "Syne, sans-serif",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            🎮 Mode pratique
          </button>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: "12px 24px",
            borderRadius: 12,
            background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
            color: "#FFFFFF",
            border: "none",
            fontFamily: "Syne, sans-serif",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            letterSpacing: 0.3,
            boxShadow: "0 4px 14px rgba(186,117,23,0.40)",
          }}
        >
          Explorer mon espace →
        </button>
      </div>
    </div>
  );
}

// ─── Metric stage (jauge + motivation) ────────────────────────────────────

function MetricStage({
  title,
  intro,
  value,
  unit,
  ranges,
  metricKey,
  firstName,
  stepIndex,
  onNext,
  onPrev,
  onSkip,
}: {
  title: string;
  intro: string;
  value: number | null;
  unit: string;
  ranges: MetricRange[];
  metricKey: "body_fat" | "hydration";
  firstName: string;
  stepIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}) {
  const range = value !== null ? findRange(value, ranges) : null;
  const motivationText = range
    ? motivationMessage(metricKey, range.key, firstName).text
    : "Tu pourras voir ta valeur après ton premier bilan.";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: "fixed",
        zIndex: 10001,
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "calc(100% - 32px)",
        maxWidth: 460,
        background: "#FFFFFF",
        borderRadius: 18,
        padding: 26,
        boxShadow: "0 24px 60px rgba(0,0,0,0.30)",
        fontFamily: "DM Sans, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 12,
          color: "#6B6B62",
          marginBottom: 12,
        }}
      >
        <span style={{ fontWeight: 600, color: "#B8922A" }}>
          {stepIndex + 1}/{TOTAL_VISIBLE_STEPS}
        </span>
        <button
          type="button"
          onClick={onSkip}
          style={{
            background: "transparent",
            border: "none",
            color: "#6B6B62",
            fontSize: 12,
            cursor: "pointer",
            padding: 0,
          }}
        >
          Passer
        </button>
      </div>

      <p
        style={{
          fontFamily: "Syne, sans-serif",
          fontSize: 22,
          fontWeight: 500,
          color: "#111827",
          margin: 0,
          marginBottom: 8,
        }}
      >
        {title}
      </p>

      <p style={{ fontSize: 13, color: "#4B5563", lineHeight: 1.55, marginBottom: 14 }}>
        {intro}
      </p>

      {value !== null ? (
        <MetricGauge value={value} unit={unit} ranges={ranges} />
      ) : (
        <div
          style={{
            padding: "12px 14px",
            background: "rgba(0,0,0,0.04)",
            borderRadius: 10,
            fontSize: 12,
            color: "#6B6B62",
            textAlign: "center",
            fontStyle: "italic",
          }}
        >
          Ta valeur s&apos;affichera ici dès que ton coach aura saisi tes
          chiffres lors du bilan.
        </div>
      )}

      {range && value !== null ? (
        <div
          style={{
            marginTop: 12,
            padding: "10px 14px",
            background: "rgba(184,146,42,0.08)",
            border: "1px solid rgba(184,146,42,0.25)",
            borderRadius: 12,
            fontSize: 13,
            color: "#374151",
            lineHeight: 1.55,
          }}
        >
          {motivationText}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 18 }}>
        <button
          type="button"
          onClick={onPrev}
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            background: "transparent",
            color: "#6B7280",
            border: "0.5px solid rgba(0,0,0,0.12)",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Précédent
        </button>
        <button
          type="button"
          onClick={onNext}
          style={{
            padding: "10px 18px",
            borderRadius: 10,
            background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
            color: "#FFFFFF",
            border: "none",
            fontFamily: "Syne, sans-serif",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            letterSpacing: 0.3,
          }}
        >
          Suivant →
        </button>
      </div>
    </div>
  );
}
