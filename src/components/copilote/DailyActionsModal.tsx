// =============================================================================
// DailyActionsModal — Chantier #2 Co-pilote (étape 2.3, 2026-05-20)
//
// Pop-up auto à la 1ère ouverture du jour : 5 actions de discipline coach.
// - Score X/5 affiché en haut (gamification douce)
// - Bouton "Plus tard" : ferme, re-apparaît demain (pas définitif)
// - Click sur une card → navigate vers la page concernée
// - Bouton "Fait" / "Skip" persisté en DB (coach_daily_actions)
// - localStorage `ls-daily-actions-shown-${YYYY-MM-DD}` = anti-spam même jour
//
// Spec brainstorm Égypte 2026-05 (Q7/Q8 Thomas) — skippable, jamais
// bloquant, fallback "Grandir ton réseau" si 0 F1/F21 dus.
// =============================================================================

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import {
  useDailyActionChecklist,
  type DailyAction,
} from "../../hooks/useDailyActionChecklist";

const STORAGE_KEY_PREFIX = "ls-daily-actions-shown-";

function ymdParis(): string {
  const fmt = new Intl.DateTimeFormat("fr-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
}

function alreadyShownToday(): boolean {
  try {
    return localStorage.getItem(`${STORAGE_KEY_PREFIX}${ymdParis()}`) === "1";
  } catch {
    return false;
  }
}

function markShownToday(): void {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${ymdParis()}`, "1");
  } catch {
    /* ignore */
  }
}

export function DailyActionsModal() {
  const { currentUser } = useAppContext();
  const { actions, score, total, loading, markDone, markSkipped, resetAction } =
    useDailyActionChecklist();
  const [open, setOpen] = useState(false);

  // Auto-open 1ère ouverture du jour
  useEffect(() => {
    if (loading) return;
    if (!currentUser) return;
    if (alreadyShownToday()) return;
    // léger délai pour ne pas bloquer le 1er paint Co-pilote
    const t = setTimeout(() => setOpen(true), 600);
    return () => clearTimeout(t);
  }, [loading, currentUser]);

  // ESC pour fermer
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleClose = (markAsShown: boolean) => {
    if (markAsShown) markShownToday();
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="daily-actions-title"
      style={overlayStyle}
      onClick={() => handleClose(false)}
    >
      <div
        style={cardStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <header style={headerStyle}>
          <div style={eyebrowStyle}>☀️ ROUTINE DU MATIN · 5 MIN</div>
          <h2 id="daily-actions-title" style={titleStyle}>
            Tes 5 actions du jour
          </h2>
          <p style={subtitleStyle}>
            Coche au fur et à mesure — tu peux revenir plus tard, tout revient
            demain si tu n'as pas fini.
          </p>
          <div style={scoreRowStyle}>
            <ScoreBadge score={score} total={total} />
            <button
              type="button"
              onClick={() => handleClose(true)}
              style={dismissBtnStyle}
              aria-label="Fermer la check-list pour aujourd'hui"
            >
              Plus tard ✕
            </button>
          </div>
        </header>

        <ul style={listStyle}>
          {actions.map((action) => (
            <ActionRow
              key={action.key}
              action={action}
              onDone={() => markDone(action.key)}
              onSkip={() => markSkipped(action.key)}
              onReset={() => resetAction(action.key)}
              onOpen={() => {
                handleClose(true);
              }}
            />
          ))}
        </ul>

        <footer style={footerStyle}>
          <span style={footerHintStyle}>
            💡 La check-list revient demain matin avec les actions non cochées.
          </span>
        </footer>
      </div>
    </div>
  );
}

// ─── ActionRow ───────────────────────────────────────────────────────────────

function ActionRow({
  action,
  onDone,
  onSkip,
  onReset,
  onOpen,
}: {
  action: DailyAction;
  onDone: () => void;
  onSkip: () => void;
  onReset: () => void;
  onOpen: () => void;
}) {
  const navigate = useNavigate();
  const isDone = action.status === "done";
  const isSkipped = action.status === "skipped";
  const isFallback = action.isFallback === true;

  const goTo = () => {
    onOpen();
    navigate(action.linkPath);
  };

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
          <button type="button" onClick={goTo} style={rowLinkBtnStyle}>
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
        padding: "8px 14px",
        borderRadius: 999,
        background: `color-mix(in srgb, ${color} 10%, var(--ls-surface2))`,
        border: `0.5px solid color-mix(in srgb, ${color} 40%, transparent)`,
        fontFamily: "Syne, sans-serif",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
        }}
      />
      <strong style={{ color, fontSize: 16, fontWeight: 800 }}>
        {score}/{total}
      </strong>
      <span style={{ fontSize: 12, color: "var(--ls-text-muted)", fontWeight: 600 }}>
        actions faites
      </span>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  background: "color-mix(in srgb, var(--ls-bg) 78%, transparent)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "clamp(12px, 4vw, 32px)",
};

const cardStyle: React.CSSProperties = {
  background: "var(--ls-surface)",
  border: "1px solid var(--ls-border)",
  borderRadius: 22,
  padding: "clamp(20px, 3vw, 28px)",
  width: "min(640px, 100%)",
  maxHeight: "92vh",
  overflowY: "auto",
  boxShadow: "0 24px 60px color-mix(in srgb, var(--ls-bg) 70%, transparent)",
  display: "flex",
  flexDirection: "column",
  gap: 18,
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: 10.5,
  letterSpacing: 1.6,
  color: "var(--ls-gold)",
  textTransform: "uppercase",
  fontWeight: 700,
  fontFamily: "DM Sans, sans-serif",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: "Syne, sans-serif",
  fontSize: "clamp(22px, 3vw, 28px)",
  fontWeight: 800,
  color: "var(--ls-text)",
  lineHeight: 1.15,
};

const subtitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 13,
  color: "var(--ls-text-muted)",
  lineHeight: 1.5,
  fontFamily: "DM Sans, sans-serif",
};

const scoreRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 10,
  marginTop: 6,
};

const dismissBtnStyle: React.CSSProperties = {
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
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 12,
  padding: "14px 14px",
  borderRadius: 14,
  background: "var(--ls-surface2)",
  border: "0.5px solid var(--ls-border)",
  transition: "background 0.18s ease, border-color 0.18s ease, opacity 0.18s ease",
};

const rowDoneStyle: React.CSSProperties = {
  background: "color-mix(in srgb, var(--ls-teal) 8%, var(--ls-surface2))",
  borderColor: "color-mix(in srgb, var(--ls-teal) 30%, var(--ls-border))",
  opacity: 0.85,
};

const rowSkippedStyle: React.CSSProperties = {
  opacity: 0.55,
};

const rowFallbackStyle: React.CSSProperties = {
  background: "color-mix(in srgb, var(--ls-teal) 5%, var(--ls-surface2))",
  borderColor: "color-mix(in srgb, var(--ls-teal) 26%, var(--ls-border))",
};

const checkBoxStyle = (done: boolean): React.CSSProperties => ({
  flex: "0 0 auto",
  width: 26,
  height: 26,
  borderRadius: 8,
  border: done
    ? "1.5px solid var(--ls-teal)"
    : "1.5px solid var(--ls-border)",
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

const rowEmojiStyle: React.CSSProperties = {
  fontSize: 16,
  lineHeight: 1,
};

const rowLabelStyle: React.CSSProperties = {
  fontFamily: "Syne, sans-serif",
  fontWeight: 700,
  fontSize: 14.5,
  color: "var(--ls-text)",
  lineHeight: 1.3,
};

const rowLabelDoneStyle: React.CSSProperties = {
  textDecoration: "line-through",
  color: "var(--ls-text-muted)",
};

const rowDetailStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 12.5,
  color: "var(--ls-text-muted)",
  lineHeight: 1.45,
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
  fontSize: 12.5,
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

const footerStyle: React.CSSProperties = {
  borderTop: "0.5px solid var(--ls-border)",
  paddingTop: 12,
  display: "flex",
  justifyContent: "center",
};

const footerHintStyle: React.CSSProperties = {
  fontSize: 11.5,
  color: "var(--ls-text-muted)",
  fontFamily: "DM Sans, sans-serif",
};
