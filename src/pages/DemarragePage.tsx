// =============================================================================
// DemarragePage — « Mon démarrage en 30 jours » (chantier Moteur d'équipe PR1).
//
// Check-list duplicable, mobile-first, FR. Chaque recrue la suit seule. Quand
// les tâches-portes sont cochées, elle devient « activée » (badge + persistance
// users.activated_at via le RPC). Thème via var(--ls-*) (suit clair/sombre).
// =============================================================================

import { useNavigate } from "react-router-dom";
import { useStarterPlan } from "../hooks/useStarterPlan";
import { STARTER_WEEKS } from "../data/starterPlan";

export function DemarragePage() {
  const navigate = useNavigate();
  const { tasks, doneCount, total, gateDone, gateTotal, activatedAt, loading, toggle } =
    useStarterPlan();

  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const isActivated = Boolean(activatedAt);

  return (
    <div style={pageWrap}>
      {/* Hero */}
      <div style={heroBox}>
        <div style={heroEyebrow}>🚀 Mon démarrage</div>
        <h1 style={heroTitle}>Tes 30 premiers jours</h1>
        <p style={heroSubtitle}>
          Coche tes actions au fil de l'eau. Pas à pas, tu poses les bases d'une
          activité qui dure. Tout est ici.
        </p>

        {/* Barre de progression globale */}
        <div style={progressRow}>
          <div style={progressBarTrack}>
            <div style={{ ...progressBarFill, width: `${Math.max(2, pct)}%` }} />
          </div>
          <span style={progressLabel}>
            {doneCount}/{total} · {pct}%
          </span>
        </div>

        {/* Statut activation */}
        {isActivated ? (
          <div style={activatedBadge}>✅ Bravo — tu es une recrue ACTIVÉE 🎉</div>
        ) : (
          <div style={activationHint}>
            🎯 Plus que {Math.max(0, gateTotal - gateDone)} action
            {gateTotal - gateDone > 1 ? "s" : ""}-clé{gateTotal - gateDone > 1 ? "s" : ""} pour
            devenir « activé » ({gateDone}/{gateTotal})
          </div>
        )}
      </div>

      {loading ? (
        <div style={loadingBox}>Chargement de ta progression…</div>
      ) : (
        STARTER_WEEKS.map((wk) => {
          const weekTasks = tasks.filter((t) => t.week === wk.week);
          const weekDone = weekTasks.filter((t) => t.status === "done").length;
          return (
            <div key={wk.week} style={weekBlock}>
              <div style={weekHeader}>
                <div>
                  <h2 style={weekTitle}>{wk.title}</h2>
                  <span style={weekSub}>{wk.subtitle}</span>
                </div>
                <span style={weekCount}>
                  {weekDone}/{weekTasks.length}
                </span>
              </div>

              <div style={tasksCol}>
                {weekTasks.map((t) => {
                  const done = t.status === "done";
                  return (
                    <div key={t.key} style={{ ...taskCard, ...(done ? taskCardDone : {}) }}>
                      <button
                        type="button"
                        onClick={() => void toggle(t.key)}
                        aria-pressed={done}
                        aria-label={done ? `Décocher : ${t.title}` : `Cocher : ${t.title}`}
                        style={{ ...checkBtn, ...(done ? checkBtnDone : {}) }}
                      >
                        {done ? (
                          <svg width="15" height="15" viewBox="0 0 14 14" aria-hidden="true">
                            <path
                              d="M3 7L6 10L11 4"
                              stroke="white"
                              strokeWidth="2.2"
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        ) : null}
                      </button>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={taskTitleRow}>
                          <span style={{ fontSize: 17 }} aria-hidden="true">
                            {t.emoji}
                          </span>
                          <span style={{ ...taskTitle, ...(done ? taskTitleDone : {}) }}>
                            {t.title}
                          </span>
                          {t.isActivationGate ? (
                            <span style={gateTag} title="Action-clé pour devenir activé">
                              clé
                            </span>
                          ) : null}
                        </div>
                        <p style={taskWhy}>{t.why}</p>
                        {t.linkPath ? (
                          <button
                            type="button"
                            onClick={() => navigate(t.linkPath as string)}
                            style={taskLink}
                          >
                            {t.linkLabel ?? "Ouvrir"} →
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const pageWrap: React.CSSProperties = {
  maxWidth: 720,
  margin: "0 auto",
  padding: "20px 16px 60px",
  fontFamily: "DM Sans, sans-serif",
};

const heroBox: React.CSSProperties = {
  background:
    "linear-gradient(135deg, color-mix(in srgb, var(--ls-gold) 12%, var(--ls-surface)), color-mix(in srgb, var(--ls-teal) 10%, var(--ls-surface)))",
  border: "0.5px solid color-mix(in srgb, var(--ls-gold) 28%, var(--ls-border))",
  borderRadius: 18,
  padding: "22px 20px",
  marginBottom: 20,
};

const heroEyebrow: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 1.4,
  color: "var(--ls-gold)",
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
  lineHeight: 1.5,
  color: "var(--ls-text-muted)",
};

const progressRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginTop: 18,
};

const progressBarTrack: React.CSSProperties = {
  flex: 1,
  height: 8,
  background: "color-mix(in srgb, var(--ls-text) 10%, transparent)",
  borderRadius: 100,
  overflow: "hidden",
};

const progressBarFill: React.CSSProperties = {
  height: "100%",
  background: "linear-gradient(90deg, var(--ls-teal), var(--ls-gold))",
  borderRadius: 100,
  transition: "width 0.4s ease",
};

const progressLabel: React.CSSProperties = {
  fontFamily: "Syne, sans-serif",
  fontWeight: 700,
  fontSize: 13,
  color: "var(--ls-text)",
  whiteSpace: "nowrap",
};

const activatedBadge: React.CSSProperties = {
  marginTop: 14,
  padding: "10px 14px",
  borderRadius: 10,
  background: "color-mix(in srgb, var(--ls-teal) 16%, transparent)",
  border: "0.5px solid var(--ls-teal)",
  color: "var(--ls-teal)",
  fontWeight: 700,
  fontSize: 13.5,
  textAlign: "center",
};

const activationHint: React.CSSProperties = {
  marginTop: 14,
  padding: "10px 14px",
  borderRadius: 10,
  background: "color-mix(in srgb, var(--ls-gold) 12%, transparent)",
  border: "0.5px solid color-mix(in srgb, var(--ls-gold) 40%, transparent)",
  color: "var(--ls-text)",
  fontSize: 13,
  fontWeight: 600,
  textAlign: "center",
};

const loadingBox: React.CSSProperties = {
  padding: 40,
  textAlign: "center",
  color: "var(--ls-text-muted)",
};

const weekBlock: React.CSSProperties = { marginBottom: 22 };

const weekHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 10,
};

const weekTitle: React.CSSProperties = {
  margin: 0,
  fontFamily: "Syne, sans-serif",
  fontSize: 16,
  fontWeight: 800,
  color: "var(--ls-text)",
};

const weekSub: React.CSSProperties = {
  fontSize: 12.5,
  color: "var(--ls-text-muted)",
};

const weekCount: React.CSSProperties = {
  fontFamily: "Syne, sans-serif",
  fontWeight: 700,
  fontSize: 13,
  color: "var(--ls-text-muted)",
  whiteSpace: "nowrap",
  paddingTop: 2,
};

const tasksCol: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const taskCard: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 12,
  padding: "12px 14px",
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 12,
};

const taskCardDone: React.CSSProperties = {
  background: "var(--ls-surface2)",
  borderColor: "color-mix(in srgb, var(--ls-teal) 35%, var(--ls-border))",
};

const checkBtn: React.CSSProperties = {
  flexShrink: 0,
  width: 26,
  height: 26,
  borderRadius: "50%",
  border: "1.5px solid var(--ls-border)",
  background: "transparent",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginTop: 1,
  padding: 0,
};

const checkBtnDone: React.CSSProperties = {
  background: "var(--ls-teal)",
  borderColor: "var(--ls-teal)",
};

const taskTitleRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 7,
  flexWrap: "wrap",
};

const taskTitle: React.CSSProperties = {
  fontFamily: "Syne, sans-serif",
  fontWeight: 700,
  fontSize: 14.5,
  color: "var(--ls-text)",
};

const taskTitleDone: React.CSSProperties = {
  textDecoration: "line-through",
  color: "var(--ls-text-muted)",
};

const gateTag: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: 0.6,
  textTransform: "uppercase",
  color: "var(--ls-gold)",
  padding: "2px 6px",
  borderRadius: 6,
  background: "color-mix(in srgb, var(--ls-gold) 14%, transparent)",
  border: "0.5px solid var(--ls-gold)",
};

const taskWhy: React.CSSProperties = {
  margin: "3px 0 0",
  fontSize: 12.5,
  lineHeight: 1.45,
  color: "var(--ls-text-muted)",
};

const taskLink: React.CSSProperties = {
  marginTop: 7,
  padding: 0,
  background: "transparent",
  border: "none",
  cursor: "pointer",
  fontSize: 11.5,
  fontWeight: 700,
  letterSpacing: 0.4,
  textTransform: "uppercase",
  color: "var(--ls-teal)",
  fontFamily: "DM Sans, sans-serif",
};
