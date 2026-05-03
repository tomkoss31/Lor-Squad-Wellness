// =============================================================================
// FormationToolkitPage — accueil de la boite a outils Lor'Squad
// (chantier toolkit, 2026-11-04)
//
// Affiche les 16 outils en grid responsive avec :
//   - Filtres categorie (4 chips : Prospection / Bilan / Suivi / Business)
//   - Filtres profil (4 chips : Tous / Nouveau / Réactivation / Sup +)
//   - Compteur live "X outils trouvés"
//   - Grid de cards premium avec accent par categorie + hover lift
//   - Click sur outil :
//     * format=popup → ToolkitItemPopup
//     * format=page  → navigate /formation/boite-a-outils/:slug
//
// Theme-aware via var(--ls-*).
// =============================================================================

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeading } from "../components/ui/PageHeading";
import {
  FORMATION_TOOLKIT,
  type FormationToolkitItem,
  type FormationToolkitCategory,
  type FormationToolkitProfile,
} from "../data/formation";
import { ToolkitItemPopup } from "../components/formation/ToolkitItemPopup";

const CATEGORY_ACCENT: Record<FormationToolkitCategory, string> = {
  prospection: "var(--ls-gold)",
  bilan: "var(--ls-teal)",
  suivi: "var(--ls-purple)",
  business: "var(--ls-coral)",
};

const CATEGORY_META: Record<FormationToolkitCategory, { label: string; emoji: string }> = {
  prospection: { label: "Prospection", emoji: "🎯" },
  bilan: { label: "Bilan", emoji: "📊" },
  suivi: { label: "Suivi", emoji: "💪" },
  business: { label: "Business", emoji: "🚀" },
};

const PROFILE_META: Record<FormationToolkitProfile, { label: string; emoji: string }> = {
  tous: { label: "Tous", emoji: "✦" },
  nouveau: { label: "Nouveau", emoji: "🌱" },
  relance: { label: "Réactivation", emoji: "🔄" },
  sup_plus: { label: "Supervisor +", emoji: "⭐" },
};

export function FormationToolkitPage() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<FormationToolkitCategory | "all">("all");
  const [activeProfile, setActiveProfile] = useState<FormationToolkitProfile | "all">("all");
  const [popupItem, setPopupItem] = useState<FormationToolkitItem | null>(null);

  const filtered = useMemo(() => {
    return FORMATION_TOOLKIT.filter((item) => {
      const catOk = activeCategory === "all" || item.category === activeCategory;
      // "tous" est universel : matche n importe quel filtre profil specifique
      const profOk =
        activeProfile === "all" || item.profile === activeProfile || item.profile === "tous";
      return catOk && profOk;
    });
  }, [activeCategory, activeProfile]);

  function handleItemClick(item: FormationToolkitItem) {
    if (item.format === "popup") {
      setPopupItem(item);
    } else {
      navigate(`/formation/boite-a-outils/${item.slug}`);
    }
  }

  return (
    <div className="space-y-6" style={{ paddingBottom: 60 }}>
      <button
        type="button"
        onClick={() => navigate("/formation")}
        style={{
          background: "transparent",
          border: "0.5px solid var(--ls-border)",
          color: "var(--ls-text-muted)",
          padding: "8px 14px",
          borderRadius: 10,
          fontSize: 12,
          cursor: "pointer",
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        ← Retour à Formation
      </button>

      <PageHeading
        eyebrow="Formation · matière exécutable"
        title="Boîte à outils Lor'Squad"
        description="16 outils prêts à l'emploi : scripts copier-coller, fiches premium, checklists. Différent du parcours guidé — ici on passe à l'acte."
      />

      {/* Filtres categorie */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--ls-text-muted)",
              fontFamily: "DM Sans, sans-serif",
              marginRight: 4,
            }}
          >
            Catégorie
          </span>
          <CategoryChip
            label="Toutes"
            emoji="🌐"
            active={activeCategory === "all"}
            onClick={() => setActiveCategory("all")}
          />
          {(Object.keys(CATEGORY_META) as FormationToolkitCategory[]).map((cat) => (
            <CategoryChip
              key={cat}
              label={CATEGORY_META[cat].label}
              emoji={CATEGORY_META[cat].emoji}
              accent={CATEGORY_ACCENT[cat]}
              active={activeCategory === cat}
              onClick={() => setActiveCategory(cat)}
            />
          ))}
        </div>

        {/* Filtres profil */}
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--ls-text-muted)",
              fontFamily: "DM Sans, sans-serif",
              marginRight: 4,
            }}
          >
            Profil
          </span>
          <CategoryChip
            label="Tous profils"
            emoji="👥"
            active={activeProfile === "all"}
            onClick={() => setActiveProfile("all")}
          />
          {(Object.keys(PROFILE_META) as FormationToolkitProfile[])
            .filter((p) => p !== "tous")
            .map((prof) => (
              <CategoryChip
                key={prof}
                label={PROFILE_META[prof].label}
                emoji={PROFILE_META[prof].emoji}
                active={activeProfile === prof}
                onClick={() => setActiveProfile(prof)}
              />
            ))}
        </div>

        {/* Compteur résultats */}
        <p
          style={{
            fontSize: 12,
            color: "var(--ls-text-muted)",
            margin: 0,
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          {filtered.length} outil{filtered.length > 1 ? "s" : ""} trouvé
          {filtered.length > 1 ? "s" : ""}
        </p>
      </div>

      {/* Grid 16 cards */}
      {filtered.length === 0 ? (
        <div
          style={{
            padding: "32px 16px",
            textAlign: "center",
            color: "var(--ls-text-muted)",
            fontStyle: "italic",
            background: "var(--ls-surface)",
            border: "0.5px dashed var(--ls-border)",
            borderRadius: 14,
            fontSize: 14,
          }}
        >
          Aucun outil ne correspond à ces filtres.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 14,
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          }}
        >
          {filtered.map((item) => (
            <ToolkitCard key={item.id} item={item} onClick={() => handleItemClick(item)} />
          ))}
        </div>
      )}

      {/* Popup */}
      {popupItem ? (
        <ToolkitItemPopup item={popupItem} onClose={() => setPopupItem(null)} />
      ) : null}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────

function CategoryChip({
  label,
  emoji,
  accent,
  active,
  onClick,
}: {
  label: string;
  emoji: string;
  accent?: string;
  active: boolean;
  onClick: () => void;
}) {
  const color = accent ?? "var(--ls-text)";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        padding: "7px 14px",
        borderRadius: 999,
        background: active
          ? `color-mix(in srgb, ${color} 18%, var(--ls-surface))`
          : "var(--ls-surface2)",
        border: active
          ? `1px solid ${color}`
          : "0.5px solid var(--ls-border)",
        color: active ? color : "var(--ls-text-muted)",
        fontFamily: "DM Sans, sans-serif",
        fontSize: 12,
        fontWeight: active ? 700 : 500,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
        transform: active ? "scale(1.02)" : "scale(1)",
        boxShadow: active
          ? `0 4px 12px color-mix(in srgb, ${color} 25%, transparent)`
          : "none",
      }}
    >
      <span aria-hidden="true">{emoji}</span>
      {label}
    </button>
  );
}

function ToolkitCard({
  item,
  onClick,
}: {
  item: FormationToolkitItem;
  onClick: () => void;
}) {
  const accent = CATEGORY_ACCENT[item.category];
  const profile = PROFILE_META[item.profile];

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: "relative",
        textAlign: "left",
        padding: "18px 18px 16px",
        borderRadius: 16,
        background: `linear-gradient(135deg, color-mix(in srgb, ${accent} 5%, var(--ls-surface)) 0%, var(--ls-surface) 100%)`,
        border: `0.5px solid color-mix(in srgb, ${accent} 22%, var(--ls-border))`,
        borderLeft: `3px solid ${accent}`,
        cursor: "pointer",
        fontFamily: "DM Sans, sans-serif",
        color: "var(--ls-text)",
        transition: "transform 240ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 240ms ease, border-color 240ms ease",
        overflow: "hidden",
        minHeight: 180,
        display: "flex",
        flexDirection: "column",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = `0 10px 28px -10px color-mix(in srgb, ${accent} 35%, transparent)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Glow ambient subtil */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: -30,
          right: -30,
          width: 100,
          height: 100,
          borderRadius: "50%",
          background: `color-mix(in srgb, ${accent} 14%, transparent)`,
          filter: "blur(40px)",
          pointerEvents: "none",
        }}
      />

      {/* Header : icon + tag */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 12,
          position: "relative",
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: `linear-gradient(135deg, ${accent} 0%, color-mix(in srgb, ${accent} 70%, var(--ls-bg)) 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            boxShadow: `0 4px 12px color-mix(in srgb, ${accent} 30%, transparent), inset 0 1px 0 rgba(255,255,255,0.30)`,
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          {item.icon}
        </div>
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            padding: "3px 9px",
            borderRadius: 999,
            background: `color-mix(in srgb, ${accent} 14%, transparent)`,
            color: accent,
            border: `0.5px solid color-mix(in srgb, ${accent} 30%, transparent)`,
            flexShrink: 0,
          }}
        >
          {item.tag}
        </span>
      </div>

      {/* Title */}
      <h3
        style={{
          fontFamily: "Syne, serif",
          fontWeight: 700,
          fontSize: 15,
          letterSpacing: "-0.012em",
          lineHeight: 1.2,
          color: "var(--ls-text)",
          margin: "0 0 6px",
          position: "relative",
        }}
      >
        {item.title}
      </h3>

      {/* Description */}
      <p
        style={{
          fontSize: 12,
          color: "var(--ls-text-muted)",
          margin: 0,
          lineHeight: 1.5,
          flex: 1,
          position: "relative",
        }}
      >
        {item.description}
      </p>

      {/* Footer meta */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginTop: 12,
          paddingTop: 10,
          borderTop: `0.5px dashed color-mix(in srgb, ${accent} 18%, transparent)`,
          fontSize: 11,
          color: "var(--ls-text-hint)",
          position: "relative",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span aria-hidden="true">{profile.emoji}</span>
          {profile.label}
        </span>
        <span aria-hidden="true">·</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          ⏱ {item.durationMin} min
        </span>
        <span aria-hidden="true">·</span>
        <span
          style={{
            color: accent,
            fontWeight: 600,
            marginLeft: "auto",
          }}
        >
          {item.format === "popup" ? "Voir →" : "Lire →"}
        </span>
      </div>
    </button>
  );
}
