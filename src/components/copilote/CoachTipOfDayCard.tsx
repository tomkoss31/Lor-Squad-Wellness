// =============================================================================
// CoachTipOfDayCard — widget Tip du jour sur Co-pilote (2026-04-30)
// =============================================================================
//
// Affiche 1 tip par jour deterministe (via getTipOfDay) avec :
//   - Badge categorie + emoji + texte + signature "— T."
//   - Bouton "👍 Utile" : incremente un compteur localStorage (gamification)
//   - Bouton "→ Suivant" : passe au tip suivant (avec offset persistant
//     dans la journee → on revoit pas le meme tip dans la session)
//   - Bouton "📤 Partager" : ouvre WhatsApp avec le tip pre-rempli
//
// Theme aware : tokens var(--ls-*) partout.
// =============================================================================

import { useMemo, useState } from "react";
import {
  ERROR_TIPS,
  TIP_CATEGORY_LABELS,
  getTipOfDay,
  type CoachTip,
} from "../error-boundary/errorTips";

const STORAGE_OFFSET_KEY = "ls_tip_offset";
const STORAGE_USEFUL_KEY = "ls_tip_useful_count";

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function readOffset(): number {
  try {
    const raw = window.localStorage.getItem(STORAGE_OFFSET_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { date: string; offset: number };
    if (parsed.date !== todayKey()) return 0; // reset chaque jour
    return parsed.offset ?? 0;
  } catch {
    return 0;
  }
}

function writeOffset(offset: number): void {
  try {
    window.localStorage.setItem(
      STORAGE_OFFSET_KEY,
      JSON.stringify({ date: todayKey(), offset }),
    );
  } catch { /* */ }
}

function bumpUsefulCount(): number {
  try {
    const raw = window.localStorage.getItem(STORAGE_USEFUL_KEY);
    const n = raw ? parseInt(raw, 10) : 0;
    const next = (Number.isFinite(n) ? n : 0) + 1;
    window.localStorage.setItem(STORAGE_USEFUL_KEY, String(next));
    return next;
  } catch {
    return 0;
  }
}

export function CoachTipOfDayCard() {
  const [offset, setOffset] = useState<number>(() => readOffset());
  const [usefulClicked, setUsefulClicked] = useState(false);
  const [showThanks, setShowThanks] = useState(false);

  const tip: CoachTip = useMemo(() => getTipOfDay(new Date(), offset), [offset]);
  const categoryLabel = TIP_CATEGORY_LABELS[tip.category];

  function handleNext() {
    const next = offset + 1;
    setOffset(next);
    writeOffset(next);
    setUsefulClicked(false);
  }

  function handleUseful() {
    if (usefulClicked) return;
    bumpUsefulCount();
    setUsefulClicked(true);
    setShowThanks(true);
    window.setTimeout(() => setShowThanks(false), 2000);
  }

  function handleShare() {
    const message = `${tip.emoji} ${tip.text}\n\n— Tip du jour, partagé depuis Lor'Squad Wellness 🌿`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div
      style={{
        position: "relative",
        background:
          "linear-gradient(135deg, color-mix(in srgb, var(--ls-gold) 7%, var(--ls-surface)) 0%, var(--ls-surface) 60%, color-mix(in srgb, var(--ls-teal) 4%, var(--ls-surface)) 100%)",
        border: "0.5px solid color-mix(in srgb, var(--ls-gold) 22%, var(--ls-border))",
        borderLeft: "3px solid var(--ls-gold)",
        borderRadius: 14,
        padding: "14px 16px",
        fontFamily: "DM Sans, sans-serif",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes ls-tip-fade {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ls-tip-pop {
          0%   { opacity: 0; transform: scale(0.9); }
          50%  { opacity: 1; transform: scale(1.05); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* Badge categorie */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
          gap: 8,
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "3px 9px",
            borderRadius: 999,
            background: "color-mix(in srgb, var(--ls-gold) 14%, transparent)",
            border: "0.5px solid color-mix(in srgb, var(--ls-gold) 30%, transparent)",
            fontSize: 9.5,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontWeight: 700,
            color: "var(--ls-gold)",
          }}
        >
          ✦ Tip du jour · {categoryLabel}
        </span>
        <button
          type="button"
          onClick={handleNext}
          aria-label="Tip suivant"
          title="Voir un autre tip"
          style={{
            background: "transparent",
            border: "0.5px solid var(--ls-border)",
            borderRadius: 8,
            padding: "3px 9px",
            fontSize: 11,
            color: "var(--ls-text-muted)",
            cursor: "pointer",
            fontFamily: "DM Sans, sans-serif",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--ls-gold)";
            e.currentTarget.style.borderColor = "color-mix(in srgb, var(--ls-gold) 40%, transparent)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--ls-text-muted)";
            e.currentTarget.style.borderColor = "var(--ls-border)";
          }}
        >
          → Suivant
        </button>
      </div>

      {/* Tip text */}
      <div
        key={offset}
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          animation: "ls-tip-fade 0.4s ease-out",
        }}
      >
        <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0, marginTop: 2 }} aria-hidden>
          {tip.emoji}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.55,
              color: "var(--ls-text)",
              margin: "0 0 4px",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            {tip.text}
          </p>
          <span
            style={{
              fontFamily: "Syne, sans-serif",
              fontSize: 11,
              fontWeight: 700,
              color: "var(--ls-gold)",
              letterSpacing: "0.05em",
            }}
          >
            — T.
          </span>
        </div>
      </div>

      {/* Actions row */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={handleUseful}
          disabled={usefulClicked}
          style={{
            padding: "6px 12px",
            borderRadius: 999,
            border: usefulClicked
              ? "0.5px solid color-mix(in srgb, var(--ls-teal) 50%, transparent)"
              : "0.5px solid var(--ls-border)",
            background: usefulClicked
              ? "color-mix(in srgb, var(--ls-teal) 14%, transparent)"
              : "transparent",
            color: usefulClicked ? "var(--ls-teal)" : "var(--ls-text-muted)",
            fontSize: 11.5,
            fontWeight: 600,
            cursor: usefulClicked ? "default" : "pointer",
            fontFamily: "DM Sans, sans-serif",
            transition: "all 0.15s",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {usefulClicked ? "✓ Noté" : "👍 Utile"}
        </button>
        <button
          type="button"
          onClick={handleShare}
          style={{
            padding: "6px 12px",
            borderRadius: 999,
            border: "0.5px solid color-mix(in srgb, var(--ls-gold) 35%, transparent)",
            background: "color-mix(in srgb, var(--ls-gold) 10%, transparent)",
            color: "var(--ls-gold)",
            fontSize: 11.5,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "DM Sans, sans-serif",
            transition: "all 0.15s",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "color-mix(in srgb, var(--ls-gold) 22%, transparent)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "color-mix(in srgb, var(--ls-gold) 10%, transparent)";
          }}
        >
          📤 Partager
        </button>

        {/* Compteur petits tips disponibles */}
        <span
          style={{
            marginLeft: "auto",
            fontSize: 10,
            color: "var(--ls-text-hint)",
            fontStyle: "italic",
          }}
        >
          {((offset % ERROR_TIPS.length) + 1)} / {ERROR_TIPS.length}
        </span>
      </div>

      {/* Toast inline merci */}
      {showThanks ? (
        <div
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            background: "color-mix(in srgb, var(--ls-teal) 18%, var(--ls-surface))",
            border: "0.5px solid color-mix(in srgb, var(--ls-teal) 40%, transparent)",
            borderRadius: 8,
            padding: "4px 10px",
            fontSize: 10.5,
            color: "var(--ls-teal)",
            fontWeight: 600,
            animation: "ls-tip-pop 0.3s ease-out",
          }}
        >
          ✨ Merci !
        </div>
      ) : null}
    </div>
  );
}
