// =============================================================================
// SimulateurEbePage — entraînement EBE (2026-05-04)
//
// 3 écrans :
//   1. Sélection scénario (Sophie / Karim)
//   2. Runner étape par étape (chat-like, choix scorés, feedback inline)
//   3. Debrief final (score / band / recap choix + CTA save journal EBE)
// =============================================================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { useCahierDeBord } from "../hooks/useCahierDeBord";
import {
  EBE_SCENARIOS,
  getScenarioById,
  scoreFor,
  scoreBand,
  type EbeScenario,
  type EbeChoice,
  type EbeChoiceQuality,
} from "../data/simulateurEbe";

interface ChoiceLog {
  stepId: string;
  choiceId: string;
  quality: EbeChoiceQuality;
  points: number;
}

export function SimulateurEbePage() {
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const { addEbeEntry } = useCahierDeBord(currentUser?.id ?? null);

  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [log, setLog] = useState<ChoiceLog[]>([]);
  const [pendingChoice, setPendingChoice] = useState<EbeChoice | null>(null);
  const [finished, setFinished] = useState(false);
  const [savedToJournal, setSavedToJournal] = useState(false);

  const scenario = scenarioId ? getScenarioById(scenarioId) : null;

  const reset = () => {
    setScenarioId(null);
    setStepIndex(0);
    setLog([]);
    setPendingChoice(null);
    setFinished(false);
    setSavedToJournal(false);
  };

  const handleChoice = (choice: EbeChoice, scenario: EbeScenario) => {
    if (pendingChoice) return;
    setPendingChoice(choice);
    setLog((prev) => [
      ...prev,
      {
        stepId: scenario.steps[stepIndex].id,
        choiceId: choice.id,
        quality: choice.quality,
        points: scoreFor(choice.quality),
      },
    ]);
  };

  const handleNext = (scenario: EbeScenario) => {
    setPendingChoice(null);
    if (stepIndex + 1 >= scenario.steps.length) {
      setFinished(true);
    } else {
      setStepIndex(stepIndex + 1);
    }
  };

  const totalScore = log.reduce((acc, c) => acc + c.points, 0);

  const handleSaveToJournal = async () => {
    if (!scenario) return;
    const goods = log
      .filter((c) => c.quality === "excellent")
      .map((c) => scenario.steps.find((s) => s.id === c.stepId)?.title)
      .filter(Boolean)
      .join(", ");
    const errs = log
      .filter((c) => c.quality === "faux")
      .map((c) => scenario.steps.find((s) => s.id === c.stepId)?.title)
      .filter(Boolean)
      .join(", ");
    await addEbeEntry({
      ebe_date: new Date().toISOString().slice(0, 10),
      prospect_name: `[Simulation] ${scenario.name}`,
      self_score: Math.round((totalScore / 60) * 10),
      what_went_well: goods || "—",
      what_to_improve: errs || "—",
      outcome: "pending",
      recos_count: 0,
    });
    setSavedToJournal(true);
  };

  // ── Écran 3 : Debrief ──────────────────────────────────────────────────
  if (finished && scenario) {
    const band = scoreBand(totalScore);
    return (
      <div style={pageWrap}>
        <Hero
          eyebrow="✦ Simulateur EBE · Debrief"
          title="Ton EBE est terminé"
          subtitle={`Scénario : ${scenario.name}`}
        />

        <div style={debriefScoreCard(band.color)}>
          <div style={{ fontSize: 56 }}>{band.emoji}</div>
          <div style={{ fontFamily: "Syne, sans-serif", fontSize: 42, fontWeight: 800, color: band.color }}>
            {totalScore} <span style={{ fontSize: 22, color: "var(--ls-text-muted)" }}>/ 60</span>
          </div>
          <div style={{ fontFamily: "Syne, sans-serif", fontSize: 22, fontWeight: 700, color: "var(--ls-text)", marginTop: 6 }}>
            {band.label}
          </div>
          <p style={{ marginTop: 10, color: "var(--ls-text-muted)", maxWidth: 480, lineHeight: 1.55 }}>{band.message}</p>
        </div>

        <h3 style={sectionTitle}>📋 Recap par étape</h3>
        <div style={{ display: "grid", gap: 10 }}>
          {scenario.steps.map((step) => {
            const entry = log.find((l) => l.stepId === step.id);
            if (!entry) return null;
            const choice = step.choices.find((c) => c.id === entry.choiceId);
            const color =
              entry.quality === "excellent"
                ? "var(--ls-teal)"
                : entry.quality === "moyen"
                  ? "var(--ls-gold)"
                  : "var(--ls-coral)";
            const emoji = entry.quality === "excellent" ? "✨" : entry.quality === "moyen" ? "⚠️" : "❌";
            return (
              <div key={step.id} style={recapCard(color)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                  <span style={{ fontFamily: "Syne, sans-serif", fontSize: 14, fontWeight: 700, color: "var(--ls-text)" }}>
                    {emoji} Étape {step.index} · {step.title}
                  </span>
                  <span style={{ fontFamily: "Syne, sans-serif", fontSize: 16, fontWeight: 700, color }}>
                    {entry.points}/10
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "var(--ls-text-muted)", fontStyle: "italic", marginBottom: 6 }}>
                  Tu as répondu : « {choice?.text.slice(0, 90)}{(choice?.text.length ?? 0) > 90 ? "…" : ""} »
                </div>
                <div style={{ fontSize: 13, color: "var(--ls-text)", lineHeight: 1.5 }}>{choice?.feedback}</div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap" }}>
          <button type="button" onClick={reset} style={btnPrimary}>
            🔁 Refaire un EBE
          </button>
          <button
            type="button"
            onClick={handleSaveToJournal}
            disabled={savedToJournal}
            style={savedToJournal ? btnGhostDisabled : btnGhost}
          >
            {savedToJournal ? "✅ Sauvegardé dans le journal" : "💾 Sauvegarder dans mon journal EBE"}
          </button>
          <button type="button" onClick={() => navigate("/cahier-de-bord")} style={btnGhost}>
            📔 Voir mon cahier de bord
          </button>
        </div>
      </div>
    );
  }

  // ── Écran 2 : Runner ───────────────────────────────────────────────────
  if (scenario) {
    const step = scenario.steps[stepIndex];
    const isLast = stepIndex === scenario.steps.length - 1;
    return (
      <div style={pageWrap}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <button type="button" onClick={reset} style={btnGhostSmall}>
            ← Quitter
          </button>
          <div style={{ fontFamily: "DM Sans, sans-serif", fontSize: 12, color: "var(--ls-text-muted)" }}>
            Étape {step.index}/6 · Score : <strong style={{ color: scenario.accent }}>{totalScore}</strong>/60
          </div>
        </div>

        <div style={progressBar}>
          <div
            style={{
              width: `${((stepIndex + (pendingChoice ? 1 : 0)) / scenario.steps.length) * 100}%`,
              background: scenario.accent,
              height: "100%",
              borderRadius: 4,
              transition: "width 0.4s ease",
            }}
          />
        </div>

        <div style={{ marginTop: 18 }}>
          <Eyebrow color={scenario.accent}>{step.phase}</Eyebrow>
          <h2 style={runnerTitle}>{step.title}</h2>
        </div>

        {/* Bulle prospect */}
        <div style={prospectBubble(scenario.accent)}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 28 }}>{scenario.avatar}</span>
            <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 14, color: "var(--ls-text)" }}>
              {scenario.name}
            </span>
          </div>
          <div style={{ whiteSpace: "pre-line", lineHeight: 1.6, color: "var(--ls-text)", fontSize: 15 }}>
            {step.prospectLine}
          </div>
        </div>

        {/* Hint */}
        {step.hint && !pendingChoice && (
          <div style={hintBox}>
            <span style={{ fontSize: 14 }}>💡</span>
            <span style={{ fontSize: 13, color: "var(--ls-text-muted)", fontStyle: "italic" }}>{step.hint}</span>
          </div>
        )}

        {/* Choix */}
        {!pendingChoice && (
          <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
            {step.choices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                onClick={() => handleChoice(choice, scenario)}
                style={choiceBtn}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = scenario.accent)}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--ls-border)")}
              >
                {choice.text}
              </button>
            ))}
          </div>
        )}

        {/* Feedback */}
        {pendingChoice && (
          <>
            <div style={feedbackBox(pendingChoice.quality)}>
              <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 13, marginBottom: 6, color: feedbackColor(pendingChoice.quality) }}>
                {pendingChoice.quality === "excellent" ? "Excellent" : pendingChoice.quality === "moyen" ? "Moyen" : "À éviter"} · +{scoreFor(pendingChoice.quality)} pts
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.55, color: "var(--ls-text)" }}>{pendingChoice.feedback}</div>
            </div>
            <button type="button" onClick={() => handleNext(scenario)} style={btnPrimary}>
              {isLast ? "Voir mon score final →" : "Étape suivante →"}
            </button>
          </>
        )}
      </div>
    );
  }

  // ── Écran 1 : Sélection scénario ───────────────────────────────────────
  return (
    <div style={pageWrap}>
      <Hero
        eyebrow="✦ Simulateur EBE"
        title="Entraîne-toi sans risque"
        subtitle="Mène un EBE complet face à un prospect scripté. 6 étapes, des choix scorés, un debrief sans pitié."
      />

      <div data-tour-id="simulateur-scenarios" style={{ display: "grid", gap: 14, marginTop: 20 }}>
        {EBE_SCENARIOS.map((sc) => (
          <button key={sc.id} type="button" onClick={() => setScenarioId(sc.id)} style={scenarioCard(sc.accent)}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div
                style={{
                  fontSize: 44,
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  background: `color-mix(in srgb, ${sc.accent} 14%, var(--ls-surface2))`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {sc.avatar}
              </div>
              <div style={{ flex: 1, textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                  <span style={{ fontFamily: "Syne, sans-serif", fontSize: 18, fontWeight: 700, color: "var(--ls-text)" }}>
                    {sc.name}
                  </span>
                  <span style={difficultyBadge(sc.difficulty)}>
                    {sc.difficulty === "facile" ? "🟢 facile" : sc.difficulty === "moyen" ? "🟡 moyen" : "🔴 expert"}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: "var(--ls-text-muted)", lineHeight: 1.5, marginBottom: 8 }}>{sc.bio}</div>
                <div style={{ fontSize: 12, color: sc.accent, fontWeight: 700, fontFamily: "DM Sans, sans-serif" }}>
                  🎯 {sc.objective}
                </div>
              </div>
              <div style={{ alignSelf: "center", color: sc.accent, fontSize: 20 }}>→</div>
            </div>
          </button>
        ))}
      </div>

      <div style={infoBox}>
        <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 14, marginBottom: 6, color: "var(--ls-text)" }}>
          ℹ️ Comment ça marche
        </div>
        <ul style={{ margin: 0, paddingLeft: 20, color: "var(--ls-text-muted)", fontSize: 13, lineHeight: 1.7 }}>
          <li>6 étapes d'un vrai EBE : accueil → découverte → body scan → solution → closing → recos</li>
          <li>3 choix par étape (excellent / moyen / à éviter), feedback immédiat</li>
          <li>Score sur 60. À la fin, sauvegarde possible dans ton journal EBE pour tracker tes progrès</li>
        </ul>
      </div>
    </div>
  );
}

// ─── Sous-composants ───────────────────────────────────────────────────────

function Hero({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <div style={heroBox}>
      <div style={heroEyebrow}>{eyebrow}</div>
      <h1 style={heroTitle}>{title}</h1>
      <p style={heroSubtitle}>{subtitle}</p>
    </div>
  );
}

function Eyebrow({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div
      style={{
        fontFamily: "DM Sans, sans-serif",
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: 1.4,
        color,
        marginBottom: 4,
      }}
    >
      {children}
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const pageWrap: React.CSSProperties = {
  maxWidth: 760,
  margin: "0 auto",
  padding: "20px 18px 60px",
};

const heroBox: React.CSSProperties = {
  background: "linear-gradient(135deg, color-mix(in srgb, var(--ls-purple) 12%, var(--ls-surface)), var(--ls-surface))",
  border: "0.5px solid color-mix(in srgb, var(--ls-purple) 25%, var(--ls-border))",
  borderRadius: 18,
  padding: "22px 20px",
};

const heroEyebrow: React.CSSProperties = {
  fontFamily: "DM Sans, sans-serif",
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: 1.4,
  color: "var(--ls-purple)",
  marginBottom: 6,
};

const heroTitle: React.CSSProperties = {
  margin: 0,
  fontFamily: "Syne, sans-serif",
  fontSize: 26,
  fontWeight: 800,
  color: "var(--ls-text)",
  lineHeight: 1.15,
};

const heroSubtitle: React.CSSProperties = {
  margin: "8px 0 0",
  fontSize: 14,
  lineHeight: 1.55,
  color: "var(--ls-text-muted)",
};

const sectionTitle: React.CSSProperties = {
  fontFamily: "Syne, sans-serif",
  fontSize: 16,
  fontWeight: 700,
  color: "var(--ls-text)",
  margin: "26px 0 12px",
};

const scenarioCard = (accent: string): React.CSSProperties => ({
  width: "100%",
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
  borderLeft: `3px solid ${accent}`,
  borderRadius: 14,
  padding: "16px 18px",
  cursor: "pointer",
  transition: "transform 0.18s ease, box-shadow 0.18s ease",
  textAlign: "left",
});

const difficultyBadge = (_diff: "facile" | "moyen" | "expert"): React.CSSProperties => ({
  fontSize: 10,
  fontFamily: "DM Sans, sans-serif",
  fontWeight: 600,
  padding: "2px 8px",
  borderRadius: 8,
  background: "var(--ls-surface2)",
  color: "var(--ls-text-muted)",
  textTransform: "uppercase",
  letterSpacing: 0.6,
});

const infoBox: React.CSSProperties = {
  marginTop: 24,
  padding: "14px 16px",
  background: "var(--ls-surface2)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 12,
};

const progressBar: React.CSSProperties = {
  width: "100%",
  height: 6,
  background: "var(--ls-surface2)",
  borderRadius: 4,
  overflow: "hidden",
};

const runnerTitle: React.CSSProperties = {
  margin: "2px 0 0",
  fontFamily: "Syne, sans-serif",
  fontSize: 22,
  fontWeight: 700,
  color: "var(--ls-text)",
};

const prospectBubble = (accent: string): React.CSSProperties => ({
  marginTop: 16,
  background: `color-mix(in srgb, ${accent} 8%, var(--ls-surface))`,
  border: `0.5px solid color-mix(in srgb, ${accent} 30%, var(--ls-border))`,
  borderRadius: 14,
  padding: "16px 18px",
  borderTopLeftRadius: 4,
});

const hintBox: React.CSSProperties = {
  marginTop: 14,
  display: "flex",
  alignItems: "flex-start",
  gap: 8,
  padding: "10px 14px",
  background: "var(--ls-surface2)",
  borderRadius: 10,
  border: "0.5px solid var(--ls-border)",
};

const choiceBtn: React.CSSProperties = {
  textAlign: "left",
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 12,
  padding: "14px 16px",
  fontSize: 14,
  lineHeight: 1.5,
  color: "var(--ls-text)",
  cursor: "pointer",
  fontFamily: "DM Sans, sans-serif",
  transition: "border-color 0.18s ease, transform 0.12s ease",
};

const feedbackColor = (q: EbeChoiceQuality) =>
  q === "excellent" ? "var(--ls-teal)" : q === "moyen" ? "var(--ls-gold)" : "var(--ls-coral)";

const feedbackBox = (q: EbeChoiceQuality): React.CSSProperties => ({
  marginTop: 18,
  padding: "14px 16px",
  background: `color-mix(in srgb, ${feedbackColor(q)} 10%, var(--ls-surface))`,
  border: `0.5px solid ${feedbackColor(q)}`,
  borderRadius: 12,
});

const debriefScoreCard = (color: string): React.CSSProperties => ({
  marginTop: 18,
  padding: "26px 20px",
  background: `color-mix(in srgb, ${color} 8%, var(--ls-surface))`,
  border: `1px solid ${color}`,
  borderRadius: 18,
  textAlign: "center",
  boxShadow: `0 12px 36px color-mix(in srgb, ${color} 18%, transparent)`,
});

const recapCard = (color: string): React.CSSProperties => ({
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
  borderLeft: `3px solid ${color}`,
  borderRadius: 12,
  padding: "12px 14px",
});

const btnPrimary: React.CSSProperties = {
  marginTop: 18,
  padding: "12px 22px",
  borderRadius: 12,
  border: "none",
  background: "linear-gradient(135deg, var(--ls-gold), color-mix(in srgb, var(--ls-gold) 80%, var(--ls-coral)))",
  color: "var(--ls-bg)",
  fontFamily: "Syne, sans-serif",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};

const btnGhost: React.CSSProperties = {
  marginTop: 18,
  padding: "12px 18px",
  borderRadius: 12,
  border: "0.5px solid var(--ls-border)",
  background: "transparent",
  color: "var(--ls-text)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const btnGhostDisabled: React.CSSProperties = {
  ...btnGhost,
  opacity: 0.6,
  cursor: "default",
};

const btnGhostSmall: React.CSSProperties = {
  padding: "6px 12px",
  borderRadius: 8,
  border: "0.5px solid var(--ls-border)",
  background: "transparent",
  color: "var(--ls-text-muted)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 12,
  cursor: "pointer",
};
