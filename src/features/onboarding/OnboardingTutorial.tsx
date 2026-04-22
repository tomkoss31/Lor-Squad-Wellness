// Chantier Tuto interactif client (2026-04-24).
//
// Orchestrateur du tuto client. 8 étapes conceptuelles :
//   0. Welcome (modale centrée)
//   1. Prochain RDV (spotlight)
//   2. Masse grasse (modale avec jauge)
//   3. Hydratation (modale avec jauge)
//   4. Programme (spotlight)
//   5. Messagerie (spotlight)
//   6. Final (modale centrée)
//
// On affiche l'indicateur "N/6" pour les étapes 1-6 (on masque 0 et 7
// qui sont les bookends).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TutorialTooltip } from "./components/TutorialTooltip";
import { MetricGauge } from "./components/MetricGauge";
import {
  BODY_FAT_RANGES,
  HYDRATATION_RANGES,
  findRange,
  motivationMessage,
  type MetricSex,
} from "./data/metricRanges";

export interface OnboardingTutorialProps {
  firstName: string;
  coachName: string;
  sex?: MetricSex;
  bodyFat?: number | null;
  hydration?: number | null;
  // Sélecteurs CSS des cibles spotlight dans ClientAppPage.
  selectors?: {
    nextRdv?: string;
    program?: string;
    messaging?: string;
  };
  onClose: (reason: "completed" | "skipped" | "dismissed") => void;
}

type Stage = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const TOTAL_VISIBLE_STEPS = 6;

export function OnboardingTutorial({
  firstName,
  coachName,
  sex = "female",
  bodyFat,
  hydration,
  selectors,
  onClose,
}: OnboardingTutorialProps) {
  const [stage, setStage] = useState<Stage>(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const rafRef = useRef<number | null>(null);

  // ─── Résolution de la cible selon stage ──────────────────────────────────
  const targetSelector = useMemo(() => {
    switch (stage) {
      case 1:
        return selectors?.nextRdv;
      case 4:
        return selectors?.program;
      case 5:
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
      if (next > 6) {
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

  // Escape key = skip (hors stage 0 et 6 où on veut explicit)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && stage !== 0 && stage !== 6) skip();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [skip, stage]);

  // ─── Rendu ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* Overlay dimmed + spotlight découpé si on a un rect. */}
      <SpotlightOverlay rect={targetRect} onClick={stage === 0 || stage === 6 ? undefined : skip} />

      {stage === 0 ? <WelcomeStage firstName={firstName} onContinue={goNext} onSkip={skip} /> : null}

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
          Tu vois toujours quand {coachName} t'accompagne. En un clic, tu peux
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

      {stage === 4 ? (
        <TutorialTooltip
          stepIndex={3}
          totalSteps={TOTAL_VISIBLE_STEPS}
          title="Ton programme personnalisé"
          targetRect={targetRect}
          placement={targetRect ? "bottom" : "center"}
          onNext={goNext}
          onPrev={goPrev}
          onSkip={skip}
        >
          Ce que {coachName} a défini pour toi après ton bilan. Suis-le chaque
          jour pour atteindre ton objectif.
        </TutorialTooltip>
      ) : null}

      {stage === 5 ? (
        <TutorialTooltip
          stepIndex={4}
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

      {stage === 6 ? (
        <FinalStage firstName={firstName} onClose={() => onClose("completed")} />
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
  const pad = 8;
  return (
    <>
      {/* 4 bandes autour du rect */}
      <OverlayBand
        style={{ top: 0, left: 0, right: 0, height: Math.max(0, rect.top - pad) }}
        onClick={onClick}
      />
      <OverlayBand
        style={{
          top: Math.max(0, rect.top - pad),
          left: 0,
          width: Math.max(0, rect.left - pad),
          height: rect.height + pad * 2,
        }}
        onClick={onClick}
      />
      <OverlayBand
        style={{
          top: Math.max(0, rect.top - pad),
          left: Math.min(window.innerWidth, rect.right + pad),
          right: 0,
          height: rect.height + pad * 2,
        }}
        onClick={onClick}
      />
      <OverlayBand
        style={{
          top: Math.min(window.innerHeight, rect.bottom + pad),
          left: 0,
          right: 0,
          bottom: 0,
        }}
        onClick={onClick}
      />
      {/* Ring gold autour du target */}
      <div
        style={{
          position: "fixed",
          top: rect.top - pad,
          left: rect.left - pad,
          width: rect.width + pad * 2,
          height: rect.height + pad * 2,
          border: "2px solid #EF9F27",
          borderRadius: 12,
          zIndex: 10000,
          pointerEvents: "none",
          boxShadow: "0 0 0 2px rgba(239,159,39,0.25)",
        }}
      />
    </>
  );
}

function OverlayBand({
  style,
  onClick,
}: {
  style: React.CSSProperties;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : "presentation"}
      tabIndex={onClick ? 0 : undefined}
      aria-hidden={!onClick}
      style={{
        position: "fixed",
        background: "rgba(10, 15, 25, 0.6)",
        backdropFilter: "blur(2px)",
        zIndex: 10000,
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    />
  );
}

// ─── Welcome / Final modales ───────────────────────────────────────────────

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
        maxWidth: 440,
        background: "#FFFFFF",
        borderRadius: 18,
        padding: 28,
        boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
        textAlign: "center",
        fontFamily: "DM Sans, sans-serif",
      }}
    >
      <div style={{ fontSize: 42, marginBottom: 12 }}>👋</div>
      <p
        style={{
          fontFamily: "Syne, sans-serif",
          fontSize: 22,
          fontWeight: 500,
          color: "#111827",
          margin: 0,
          marginBottom: 10,
        }}
      >
        Bienvenue {firstName} !
      </p>
      <p
        style={{
          fontSize: 14,
          color: "#4B5563",
          lineHeight: 1.6,
          marginBottom: 22,
        }}
      >
        Ton coach t'a préparé ton espace pour suivre tes progrès. Je te fais
        visiter en 2 minutes ?
      </p>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={onSkip}
          style={{
            padding: "12px 18px",
            borderRadius: 12,
            background: "#FFFFFF",
            color: "#6B7280",
            border: "1px solid rgba(0,0,0,0.12)",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Plus tard
        </button>
        <button
          type="button"
          onClick={onContinue}
          style={{
            padding: "12px 22px",
            borderRadius: 12,
            background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
            color: "#FFFFFF",
            border: "none",
            fontFamily: "Syne, sans-serif",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            letterSpacing: 0.3,
            boxShadow: "0 4px 12px rgba(186,117,23,0.3)",
          }}
        >
          C'est parti
        </button>
      </div>
      <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 14 }}>
        Tu pourras relancer ce tutoriel à tout moment.
      </p>
    </div>
  );
}

function FinalStage({
  firstName,
  onClose,
}: {
  firstName: string;
  onClose: () => void;
}) {
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
        maxWidth: 440,
        background: "#FFFFFF",
        borderRadius: 18,
        padding: 28,
        boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
        textAlign: "center",
        fontFamily: "DM Sans, sans-serif",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 60,
          height: 60,
          borderRadius: "50%",
          background: "rgba(29,158,117,0.12)",
          color: "#1D9E75",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 32,
          marginBottom: 14,
        }}
      >
        🎉
      </div>
      <p
        style={{
          fontFamily: "Syne, sans-serif",
          fontSize: 22,
          fontWeight: 500,
          color: "#111827",
          margin: 0,
          marginBottom: 10,
        }}
      >
        Bravo {firstName} !
      </p>
      <p style={{ fontSize: 14, color: "#4B5563", lineHeight: 1.6, marginBottom: 18 }}>
        Tu connais ton espace. Ton coach et l'app sont là pour t'accompagner. Si
        tu as un doute, clique sur l'icône <strong>?</strong> en haut à droite
        pour relancer ce tuto.
      </p>
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
          boxShadow: "0 4px 12px rgba(186,117,23,0.3)",
        }}
      >
        C'est parti !
      </button>
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
  ranges: ReturnType<typeof findRange>[] extends never ? never : typeof BODY_FAT_RANGES["female"];
  metricKey: "body_fat" | "hydration";
  firstName: string;
  stepIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}) {
  const activeValue = value ?? 0;
  const activeRange = value !== null ? findRange(value, ranges) : null;
  const motivation = activeRange
    ? motivationMessage(metricKey, activeRange.key, firstName)
    : null;

  return (
    <>
      <SpotlightOverlay rect={null} />
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
          maxHeight: "calc(100vh - 32px)",
          overflowY: "auto",
          background: "#FFFFFF",
          borderRadius: 16,
          padding: 22,
          boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
          fontFamily: "DM Sans, sans-serif",
          color: "#111827",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
          <span
            style={{
              padding: "3px 8px",
              borderRadius: 6,
              background: "rgba(186,117,23,0.12)",
              color: "#BA7517",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.05em",
            }}
          >
            {stepIndex + 1}/{TOTAL_VISIBLE_STEPS}
          </span>
          <button
            type="button"
            onClick={onSkip}
            style={{
              marginLeft: "auto",
              padding: "4px 8px",
              border: "none",
              background: "transparent",
              fontSize: 11,
              color: "#9CA3AF",
              cursor: "pointer",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            Passer
          </button>
        </div>

        <p
          style={{
            fontFamily: "Syne, sans-serif",
            fontSize: 20,
            fontWeight: 500,
            margin: 0,
            marginBottom: 8,
          }}
        >
          {title}
        </p>
        <p style={{ fontSize: 13, lineHeight: 1.55, color: "#4B5563", marginBottom: 16 }}>
          {intro}
        </p>

        {value !== null ? (
          <MetricGauge value={activeValue} unit={unit} ranges={ranges} />
        ) : (
          <p
            style={{
              padding: 12,
              borderRadius: 10,
              background: "rgba(0,0,0,0.03)",
              fontSize: 12,
              color: "#6B7280",
              margin: 0,
            }}
          >
            Pas encore de mesure pour cette métrique — elle s'affichera après
            ton premier body scan.
          </p>
        )}

        {motivation ? (
          <div
            style={{
              marginTop: 16,
              padding: "12px 14px",
              borderRadius: 12,
              background:
                motivation.tone === "push"
                  ? "rgba(239,159,39,0.12)"
                  : motivation.tone === "positive"
                    ? "rgba(29,158,117,0.12)"
                    : "rgba(0,0,0,0.04)",
              color: "#111827",
              fontSize: 13,
              lineHeight: 1.55,
            }}
          >
            {motivation.text}
          </div>
        ) : null}

        <div
          style={{
            marginTop: 16,
            display: "flex",
            justifyContent: "flex-end",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={onPrev}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid rgba(0,0,0,0.12)",
              background: "#FFFFFF",
              color: "#6B7280",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            Précédent
          </button>
          <button
            type="button"
            onClick={onNext}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
              color: "#FFFFFF",
              border: "none",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "DM Sans, sans-serif",
              letterSpacing: 0.2,
            }}
          >
            Suivant →
          </button>
        </div>
      </div>
    </>
  );
}
