// =============================================================================
// RoutineDuJourPage — page dédiée check-list quotidienne (2026-05-20 V2)
//
// Refonte chantier #2 V2 : Thomas voulait une page dédiée et PAS un popup
// qui s'ouvre à chaque visite Co-pilote. Le popup a été retiré, l'accès
// se fait via :
//   - Pill "☀️ X/5 routine" dans la topbar Co-pilote
//   - Card "Ma routine du jour" dans /developpement
//   - URL directe /routine-du-jour
//
// Réutilise useDailyActionChecklist (hook agrégeur) → mêmes 5 actions et
// même persistance DB (coach_daily_actions) que l'ancienne modale.
// =============================================================================

import { useNavigate } from "react-router-dom";
import {
  useDailyActionChecklist,
  type DailyAction,
} from "../hooks/useDailyActionChecklist";

export function RoutineDuJourPage() {
  const navigate = useNavigate();
  const { actions, score, total, loading, markDone, markSkipped, resetAction } =
    useDailyActionChecklist();

  return (
    <div style={pageWrap}>
      <button type="button" onClick={() => navigate("/co-pilote")} style={backBtn}>
        ← Co-pilote
      </button>

      <header style={heroBox}>
        <div style={heroEyebrow}>☀️ ROUTINE DU JOUR · 5 MIN</div>
        <h1 style={heroTitle}>Tes 5 actions du jour</h1>
        <p style={heroSubtitle}>
          5 minutes de discipline matinale, midi ou soir — au moment qui te
          convient. Coche au fur et à mesure, skippe ce que tu ne feras pas, et
          retrouve cette page quand tu veux. Tout revient demain si pas fini.
        </p>
        <div style={scoreRow}>
          <ScoreBadge score={score} total={total} />
          <button
            type="button"
            onClick={() => navigate("/developpement/check-list-explique")}
            style={ghostLinkBtn}
          >
            Comment ça marche →
          </button>
        </div>
      </header>

      {loading ? (
        <div style={loadingHint}>Chargement de tes actions…</div>
      ) : (
        <ul style={listStyle}>
          {actions.map((action) => (
            <ActionRow
              key={action.key}
              action={action}
              onDone={() => markDone(action.key)}
              onSkip={() => markSkipped(action.key)}
              onReset={() => resetAction(action.key)}
            />
          ))}
        </ul>
      )}

      <footer style={pageFooter}>
        <p style={footerHint}>
          💡 Les actions non cochées repartent en « à faire » demain matin
          automatiquement. Une push notif te rappelle à 20h si ton score est
          incomplet (désactivable dans Paramètres &gt; Notifications).
        </p>
      </footer>
    </div>
  );
}

// ─── ActionRow ───────────────────────────────────────────────────────────────

function ActionRow({
  action,
  onDone,
  onSkip,
  onReset,
}: {
  action: DailyAction;
  onDone: () => void;
  onSkip: () => void;
  onReset: () => void;
}) {
  const navigate = useNavigate();
  const isDone = action.status === "done";
  const isSkipped = action.status === "skipped";
  const isFallback = action.isFallback === true;

  return (
    <li
      style={{
        ...rowStyle,
        ...(isDone ? rowDoneStyle : {}),
        ...(isSkipped ? rowSkippedStyle : {}),
        ...(isFallback ? rowFallbackStyle : {}),
      }}
    >
      <button
        type="button"
        onClick={() => (isDone ? onReset() : onDone())}
        style={checkBoxStyle(isDone)}
        aria-label={isDone ? "Marquer comme à faire" : "Marquer comme fait"}
        aria-pressed={isDone}
      >
        {isDone ? "✓" : ""}
      </button>

      <div style={rowBodyStyle}>
        <div style={rowTopStyle}>
          <span aria-hidden="true" style={rowEmojiStyle}>
            {action.emoji}
          </span>
          <span style={{ ...rowLabelStyle, ...(isDone ? rowLabelDoneStyle : {}) }}>
            {action.label}
          </span>
          {action.count !== null && action.count > 0 ? (
            <CountChip count={action.count} accent={isFallback ? "coral" : "gold"} />
          ) : null}
          {isFallback ? <FallbackBadge /> : null}
        </div>
        <p style={rowDetailStyle}>{action.detail}</p>
        <div style={rowActionsStyle}>
          <button
            type="button"
            onClick={() => navigate(action.linkPath)}
            style={rowLinkBtnStyle}
          >
            {action.linkLabel} →
          </button>
          {!isDone && !isSkipped ? (
            <button type="button" onClick={onSkip} style={rowSkipBtnStyle}>
              Skip
            </button>
          ) : null}
          {isSkipped ? (
            <span style={skippedHintStyle}>⏭ Skippé — revient demain</span>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function CountChip({ count, accent }: { count: number; accent: "gold" | "coral" }) {
  const color = accent === "coral" ? "var(--ls-coral)" : "var(--ls-gold)";
  return (
    <span
      style={{
        fontSize: 11,
        padding: "2px 9px",
        borderRadius: 999,
        background: `color-mix(in srgb, ${color} 14%, transparent)`,
        color,
        border: `0.5px solid color-mix(in srgb, ${color} 40%, transparent)`,
        fontFamily: "DM Sans, sans-serif",
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {count}
    </span>
  );
}

function FallbackBadge() {
  return (
    <span
      style={{
        fontSize: 10,
        padding: "2px 8px",
        borderRadius: 6,
        background: "color-mix(in srgb, var(--ls-teal) 14%, transparent)",
        color: "var(--ls-teal)",
        border: "0.5px solid color-mix(in srgb, var(--ls-teal) 36%, transparent)",
        fontFamily: "DM Sans, sans-serif",
        fontWeight: 700,
        letterSpacing: 0.6,
        textTransform: "uppercase",
      }}
    >
      Fallback
    </span>
  );
}

function ScoreBadge({ score, total }: { score: number; total: number }) {
  const ratio = total > 0 ? score / total : 0;
  const color =
    ratio >= 0.8
      ? "var(--ls-teal)"
      : ratio >= 0.4
      ? "var(--ls-gold)"
      : "var(--ls-coral)";
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 16px",
        borderRadius: 999,
        background: `color-mix(in srgb, ${color} 12%, var(--ls-surface))`,
        border: `0.5px solid color-mix(in srgb, ${color} 40%, transparent)`,
        fontFamily: "Syne, sans-serif",
      }}
    >
      <span
        aria-hidden="true"
        style={{ width: 9, height: 9, borderRadius: "50%", background: color }}
      />
      <strong style={{ color, fontSize: 18, fontWeight: 800 }}>
        {score}/{total}
      </strong>
      <span style={{ fontSize: 12, color: "var(--ls-text-muted)", fontWeight: 600 }}>
        actions faites
      </span>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const pageWrap: React.CSSProperties = {
  maxWidth: 760,
  margin: "0 auto",
  padding: "20px 18px 60px",
};

const backBtn: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--ls-text-muted)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 13,
  cursor: "pointer",
  marginBottom: 14,
  padding: 0,
};

const heroBox: React.CSSProperties = {
  background:
    "linear-gradient(135deg, color-mix(in srgb, var(--ls-gold) 12%, var(--ls-surface)), var(--ls-surface))",
  border: "0.5px solid color-mix(in srgb, var(--ls-gold) 30%, var(--ls-border))",
  borderRadius: 18,
  padding: "24px 20px",
};

const heroEyebrow: React.CSSProperties = {
  fontFamily: "DM Sans, sans-serif",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 1.4,
  color: "var(--ls-gold)",
  marginBottom: 8,
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
  margin: "10px 0 16px",
  fontSize: 14,
  lineHeight: 1.6,
  color: "var(--ls-text-muted)",
};

const scoreRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 10,
  marginTop: 6,
};

const ghostLinkBtn: React.CSSProperties = {
  background: "transparent",
  border: "0.5px solid var(--ls-border)",
  color: "var(--ls-text-muted)",
  fontSize: 12,
  fontWeight: 600,
  padding: "8px 14px",
  borderRadius: 999,
  cursor: "pointer",
  fontFamily: "DM Sans, sans-serif",
};

const listStyle: React.CSSProperties = {
  listStyle: "none",
  margin: "22px 0 0",
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 14,
  padding: "16px 18px",
  borderRadius: 16,
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
  transition: "background 0.18s ease, border-color 0.18s ease, opacity 0.18s ease",
};

const rowDoneStyle: React.CSSProperties = {
  background: "color-mix(in srgb, var(--ls-teal) 8%, var(--ls-surface))",
  borderColor: "color-mix(in srgb, var(--ls-teal) 30%, var(--ls-border))",
  opacity: 0.85,
};

const rowSkippedStyle: React.CSSProperties = {
  opacity: 0.55,
};

const rowFallbackStyle: React.CSSProperties = {
  background: "color-mix(in srgb, var(--ls-teal) 5%, var(--ls-surface))",
  borderColor: "color-mix(in srgb, var(--ls-teal) 26%, var(--ls-border))",
};

const checkBoxStyle = (done: boolean): React.CSSProperties => ({
  flex: "0 0 auto",
  width: 28,
  height: 28,
  borderRadius: 8,
  border: done ? "1.5px solid var(--ls-teal)" : "1.5px solid var(--ls-border)",
  background: done ? "var(--ls-teal)" : "transparent",
  color: done ? "#fff" : "transparent",
  fontFamily: "Syne, sans-serif",
  fontSize: 16,
  fontWeight: 800,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginTop: 2,
  transition: "background 0.18s ease, border-color 0.18s ease",
});

const rowBodyStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const rowTopStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
};

const rowEmojiStyle: React.CSSProperties = { fontSize: 16, lineHeight: 1 };

const rowLabelStyle: React.CSSProperties = {
  fontFamily: "Syne, sans-serif",
  fontWeight: 700,
  fontSize: 15,
  color: "var(--ls-text)",
  lineHeight: 1.3,
};

const rowLabelDoneStyle: React.CSSProperties = {
  textDecoration: "line-through",
  color: "var(--ls-text-muted)",
};

const rowDetailStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 13,
  color: "var(--ls-text-muted)",
  lineHeight: 1.5,
  fontFamily: "DM Sans, sans-serif",
};

const rowActionsStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginTop: 4,
  flexWrap: "wrap",
};

const rowLinkBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--ls-teal)",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  padding: 0,
  fontFamily: "DM Sans, sans-serif",
};

const rowSkipBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "0.5px solid var(--ls-border)",
  color: "var(--ls-text-muted)",
  fontSize: 11,
  fontWeight: 600,
  padding: "3px 10px",
  borderRadius: 999,
  cursor: "pointer",
  fontFamily: "DM Sans, sans-serif",
};

const skippedHintStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "var(--ls-text-muted)",
  fontFamily: "DM Sans, sans-serif",
};

const loadingHint: React.CSSProperties = {
  marginTop: 20,
  fontSize: 13,
  color: "var(--ls-text-muted)",
  fontFamily: "DM Sans, sans-serif",
};

const pageFooter: React.CSSProperties = {
  marginTop: 24,
  padding: "16px 18px",
  borderRadius: 14,
  background: "var(--ls-surface)",
  border: "0.5px dashed var(--ls-border)",
};

const footerHint: React.CSSProperties = {
  margin: 0,
  fontSize: 12.5,
  color: "var(--ls-text-muted)",
  lineHeight: 1.55,
  fontFamily: "DM Sans, sans-serif",
};
