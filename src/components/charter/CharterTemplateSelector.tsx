// =============================================================================
// CharterTemplateSelector — bandeau sticky avec 3 thumbnails (2026-05-03)
//
// Affiche 3 vignettes (Officielle / Manifeste / Story). Le user clique
// sur une vignette → setTemplate(...) → preview live switch.
//
// Thumbnails : images statiques pré-générées dans /public/charter-thumbs/
// (livré commit 4/4 via outil admin de génération). Si fichier absent,
// fallback : nom + couleur du template + emoji.
// =============================================================================

import { useState } from "react";
import type { CharterTemplate } from "../../types/charter";

interface Props {
  current: CharterTemplate;
  onChange: (t: CharterTemplate) => void;
  disabled?: boolean;
}

const OPTIONS: Array<{
  template: CharterTemplate;
  label: string;
  description: string;
  emoji: string;
  thumbSrc: string;
}> = [
  {
    template: "officielle",
    label: "Officielle",
    description: "A4 paper crème classique",
    emoji: "🏛️",
    thumbSrc: "/charter-thumbs/officielle.png",
  },
  {
    template: "manifeste",
    label: "Manifeste",
    description: "Serment poétique solennel",
    emoji: "✦",
    thumbSrc: "/charter-thumbs/manifeste.png",
  },
  {
    template: "story",
    label: "Story",
    description: "9:16 partage Instagram",
    emoji: "📱",
    thumbSrc: "/charter-thumbs/story.png",
  },
];

export function CharterTemplateSelector({ current, onChange, disabled }: Props) {
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        background:
          "linear-gradient(180deg, rgba(13, 9, 6, 0.92) 0%, rgba(13, 9, 6, 0.78) 100%)",
        backdropFilter: "blur(8px)",
        padding: "14px 12px",
        marginBottom: 18,
        borderRadius: 14,
        border: "1px solid rgba(184, 146, 42, 0.3)",
      }}
    >
      <div
        style={{
          fontFamily: "'Cinzel', serif",
          fontSize: 9,
          letterSpacing: 4,
          color: "#D4A937",
          textTransform: "uppercase",
          fontWeight: 600,
          textAlign: "center",
          marginBottom: 10,
        }}
      >
        ✦ Choisis ton template ✦
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 10,
        }}
      >
        {OPTIONS.map((opt) => (
          <ThumbCard
            key={opt.template}
            option={opt}
            active={current === opt.template}
            disabled={disabled}
            onClick={() => onChange(opt.template)}
          />
        ))}
      </div>
    </div>
  );
}

function ThumbCard({
  option,
  active,
  disabled,
  onClick,
}: {
  option: (typeof OPTIONS)[number];
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-pressed={active}
      style={{
        background: active ? "rgba(184, 146, 42, 0.18)" : "rgba(13, 9, 6, 0.55)",
        border: active
          ? "2px solid #D4A937"
          : "1px solid rgba(184, 146, 42, 0.35)",
        borderRadius: 10,
        padding: 8,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        transition: "all 0.18s",
        boxShadow: active
          ? "0 4px 14px rgba(184, 146, 42, 0.4), inset 0 0 0 1px rgba(255, 244, 212, 0.2)"
          : "none",
      }}
    >
      {/* Thumbnail (image ou fallback) */}
      <div
        style={{
          width: "100%",
          aspectRatio: option.template === "story" ? "9 / 16" : "3 / 4",
          background: option.template === "story" ? "#0D0906" : "#FBF7E9",
          borderRadius: 6,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          maxHeight: 90,
          border: "0.5px solid rgba(184, 146, 42, 0.4)",
          position: "relative",
        }}
      >
        {!imgError ? (
          <img
            src={option.thumbSrc}
            alt={option.label}
            onError={() => setImgError(true)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <span
            style={{
              fontSize: 24,
              filter: option.template === "story" ? "none" : "grayscale(0.2)",
            }}
            aria-hidden="true"
          >
            {option.emoji}
          </span>
        )}
        {active && (
          <div
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "#D4A937",
              color: "#0D0906",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
            }}
            aria-hidden="true"
          >
            ✓
          </div>
        )}
      </div>
      <div
        style={{
          fontFamily: "'Cinzel', serif",
          fontSize: 10.5,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          fontWeight: 700,
          color: active ? "#FFF8E0" : "#D4A937",
          textAlign: "center",
        }}
      >
        {option.label}
      </div>
      <div
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 9.5,
          fontStyle: "italic",
          color: "rgba(245, 222, 179, 0.65)",
          textAlign: "center",
          lineHeight: 1.2,
          minHeight: 24,
        }}
      >
        {option.description}
      </div>
    </button>
  );
}
