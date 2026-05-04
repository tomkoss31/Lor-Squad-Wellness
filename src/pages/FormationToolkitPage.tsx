// =============================================================================
// FormationToolkitPage — Boîte à outils V2 Magazine Premium (refonte 2026-05-04)
//
// Le passage de la grille plate à un magazine vivant :
//   - Hero header avec gradient gold + sparkles animés
//   - Search bar temps réel (titre + description + tag)
//   - Filter chips catégorie cliquables avec compteurs
//   - Section "À ne pas manquer" (3 outils stars highlighted)
//   - Grille cards premium avec hover lift + tag durée + format
//   - Système favoris ⭐ (localStorage par user) + filter "Mes favoris"
//   - Animations fade-up cascade staggered
//
// Theme-aware via var(--ls-*).
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FORMATION_TOOLKIT,
  type FormationToolkitItem,
  type FormationToolkitCategory,
} from "../data/formation";
import { ToolkitItemPopup } from "../components/formation/ToolkitItemPopup";
import { useAppContext } from "../context/AppContext";

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

const FORMAT_TAG: Record<string, { emoji: string; label: string }> = {
  popup: { emoji: "💬", label: "Script" },
  page: { emoji: "📄", label: "Fiche" },
};

// 3 outils stars affichés dans "À ne pas manquer"
const FEATURED_SLUGS = [
  "scripts-invitation",
  "bases-presentiel",
  "phrase-magique-recos",
];

const STORAGE_FAVORITES_PREFIX = "ls-toolkit-favorites-";

function readFavorites(userId: string | null): Set<string> {
  if (!userId || typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_FAVORITES_PREFIX + userId);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

function writeFavorites(userId: string | null, favs: Set<string>): void {
  if (!userId || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_FAVORITES_PREFIX + userId, JSON.stringify([...favs]));
  } catch {
    /* quota */
  }
}

export function FormationToolkitPage() {
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const userId = currentUser?.id ?? null;

  const [activeCategory, setActiveCategory] = useState<FormationToolkitCategory | "all" | "favorites">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [popupItem, setPopupItem] = useState<FormationToolkitItem | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;
    setFavorites(readFavorites(userId));
  }, [userId]);

  function toggleFavorite(slug: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!userId) return;
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      writeFavorites(userId, next);
      return next;
    });
  }

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return FORMATION_TOOLKIT.filter((item) => {
      if (activeCategory === "favorites") {
        if (!favorites.has(item.slug)) return false;
      } else if (activeCategory !== "all" && item.category !== activeCategory) {
        return false;
      }
      if (q) {
        const haystack = `${item.title} ${item.description} ${item.tag ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [activeCategory, searchQuery, favorites]);

  const featured = useMemo(
    () =>
      FEATURED_SLUGS.map((slug) => FORMATION_TOOLKIT.find((it) => it.slug === slug)).filter(
        (x): x is FormationToolkitItem => !!x,
      ),
    [],
  );

  function handleItemClick(item: FormationToolkitItem) {
    if (item.externalRoute) {
      navigate(item.externalRoute);
      return;
    }
    if (item.format === "popup") {
      setPopupItem(item);
    } else {
      navigate(`/formation/boite-a-outils/${item.slug}`);
    }
  }

  return (
    <div className="ls-toolkit-page" style={{ paddingBottom: 60 }}>
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
          marginBottom: 18,
        }}
      >
        ← Retour à Formation
      </button>

      {/* HERO HEADER ──────────────────────────────────────────────── */}
      <div
        className="ls-toolkit-hero"
        style={{
          position: "relative",
          padding: "32px 28px",
          borderRadius: 20,
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--ls-gold) 12%, var(--ls-surface)) 0%, color-mix(in srgb, var(--ls-coral) 8%, var(--ls-surface2)) 100%)",
          border: "1px solid color-mix(in srgb, var(--ls-gold) 30%, transparent)",
          marginBottom: 24,
          overflow: "hidden",
          boxShadow: "0 12px 40px color-mix(in srgb, var(--ls-gold) 12%, transparent)",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 14,
            right: 22,
            fontSize: 28,
            opacity: 0.4,
            animation: "ls-toolkit-sparkle 3s ease-in-out infinite",
          }}
        >
          ✦
        </div>
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            bottom: 18,
            left: 26,
            fontSize: 18,
            opacity: 0.3,
            animation: "ls-toolkit-sparkle 4s ease-in-out 0.5s infinite",
          }}
        >
          ✦
        </div>

        <div
          style={{
            fontSize: 10,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: "var(--ls-gold)",
            fontWeight: 700,
            marginBottom: 8,
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          ✦ Boîte à outils · Lor&apos;Squad
        </div>
        <h1
          style={{
            fontFamily: "Syne, serif",
            fontSize: 32,
            fontWeight: 800,
            margin: 0,
            color: "var(--ls-text)",
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
          }}
        >
          Ta caisse à outils
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "var(--ls-text-muted)",
            margin: "10px 0 0",
            lineHeight: 1.55,
            maxWidth: 540,
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          {FORMATION_TOOLKIT.length} outils prêts à dégainer : scripts copier-coller, fiches premium, checklists. Quand tu sais pas quoi dire, tu trouves ici.
        </p>

        {/* Search bar */}
        <div style={{ marginTop: 22, position: "relative" }}>
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              left: 16,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 16,
              opacity: 0.5,
              pointerEvents: "none",
            }}
          >
            🔍
          </span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cherche un outil, un script, une phrase…"
            style={{
              width: "100%",
              padding: "12px 16px 12px 44px",
              borderRadius: 999,
              border: "0.5px solid color-mix(in srgb, var(--ls-gold) 35%, var(--ls-border))",
              background: "var(--ls-surface)",
              color: "var(--ls-text)",
              fontSize: 14,
              fontFamily: "DM Sans, sans-serif",
              outline: "none",
              boxSizing: "border-box",
              transition: "border-color 0.18s, box-shadow 0.18s",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--ls-gold)";
              e.currentTarget.style.boxShadow = "0 0 0 3px color-mix(in srgb, var(--ls-gold) 18%, transparent)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "color-mix(in srgb, var(--ls-gold) 35%, var(--ls-border))";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        </div>
      </div>

      {/* À NE PAS MANQUER (visible quand pas de filtre actif) */}
      {activeCategory === "all" && !searchQuery && featured.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "var(--ls-gold)",
              fontWeight: 700,
              marginBottom: 10,
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            ⭐ À ne pas manquer
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 14,
            }}
          >
            {featured.map((item, idx) => (
              <FeaturedCard
                key={item.slug}
                item={item}
                index={idx}
                isFavorite={favorites.has(item.slug)}
                onToggleFavorite={(e) => toggleFavorite(item.slug, e)}
                onClick={() => handleItemClick(item)}
              />
            ))}
          </div>
        </section>
      )}

      {/* FILTERS — chips catégories + favoris */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        <FilterChip
          label="Tous"
          emoji="✦"
          count={FORMATION_TOOLKIT.length}
          active={activeCategory === "all"}
          accent="var(--ls-text-muted)"
          onClick={() => setActiveCategory("all")}
        />
        <FilterChip
          label="Favoris"
          emoji="⭐"
          count={favorites.size}
          active={activeCategory === "favorites"}
          accent="var(--ls-gold)"
          onClick={() => setActiveCategory("favorites")}
        />
        {(["prospection", "bilan", "suivi", "business"] as FormationToolkitCategory[]).map((cat) => {
          const meta = CATEGORY_META[cat];
          const count = FORMATION_TOOLKIT.filter((it) => it.category === cat).length;
          return (
            <FilterChip
              key={cat}
              label={meta.label}
              emoji={meta.emoji}
              count={count}
              active={activeCategory === cat}
              accent={CATEGORY_ACCENT[cat]}
              onClick={() => setActiveCategory(cat)}
            />
          );
        })}
      </div>

      {/* Compteur résultats */}
      <div
        style={{
          fontSize: 12,
          color: "var(--ls-text-muted)",
          marginBottom: 14,
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        {filtered.length} outil{filtered.length > 1 ? "s" : ""} trouvé{filtered.length > 1 ? "s" : ""}
        {searchQuery ? <> · recherche « {searchQuery} »</> : null}
      </div>

      {/* GRILLE PRINCIPALE */}
      {filtered.length === 0 ? (
        <div
          style={{
            padding: "60px 20px",
            textAlign: "center",
            color: "var(--ls-text-muted)",
            fontFamily: "DM Sans, sans-serif",
            background: "var(--ls-surface)",
            border: "0.5px dashed var(--ls-border)",
            borderRadius: 14,
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 8 }} aria-hidden="true">
            🔍
          </div>
          <div style={{ fontFamily: "Syne, serif", fontSize: 18, color: "var(--ls-text)", marginBottom: 4 }}>
            {activeCategory === "favorites" ? "Aucun favori encore" : "Rien trouvé"}
          </div>
          <div style={{ fontSize: 13 }}>
            {activeCategory === "favorites"
              ? "Clique l'étoile sur un outil pour l'épingler ici."
              : "Essaie un autre mot-clé ou retire les filtres."}
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 14,
          }}
        >
          {filtered.map((item, idx) => (
            <ToolkitCard
              key={item.slug}
              item={item}
              index={idx}
              isFavorite={favorites.has(item.slug)}
              onToggleFavorite={(e) => toggleFavorite(item.slug, e)}
              onClick={() => handleItemClick(item)}
            />
          ))}
        </div>
      )}

      {popupItem ? (
        <ToolkitItemPopup item={popupItem} onClose={() => setPopupItem(null)} />
      ) : null}

      <style>{`
        @keyframes ls-toolkit-sparkle {
          0%, 100% { opacity: 0.3; transform: scale(1) rotate(0deg); }
          50% { opacity: 0.6; transform: scale(1.15) rotate(45deg); }
        }
        @keyframes ls-toolkit-card-fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .ls-toolkit-card {
          animation: ls-toolkit-card-fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) backwards;
          transition: transform 0.18s, box-shadow 0.18s, border-color 0.18s;
        }
        .ls-toolkit-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 28px color-mix(in srgb, var(--ls-text) 8%, transparent);
        }
        .ls-toolkit-fav-btn {
          transition: transform 0.15s, opacity 0.15s;
        }
        .ls-toolkit-fav-btn:hover {
          transform: scale(1.18);
        }
        @media (prefers-reduced-motion: reduce) {
          .ls-toolkit-card { animation: none; transition: none; }
          .ls-toolkit-hero [aria-hidden="true"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function FilterChip({
  label,
  emoji,
  count,
  active,
  accent,
  onClick,
}: {
  label: string;
  emoji: string;
  count: number;
  active: boolean;
  accent: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 14px",
        borderRadius: 999,
        border: active ? `1.5px solid ${accent}` : "0.5px solid var(--ls-border)",
        background: active
          ? `color-mix(in srgb, ${accent} 14%, var(--ls-surface))`
          : "var(--ls-surface)",
        color: active ? accent : "var(--ls-text-muted)",
        fontSize: 12,
        fontWeight: active ? 700 : 500,
        fontFamily: "DM Sans, sans-serif",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        transition: "all 0.15s",
        boxShadow: active ? `0 4px 12px color-mix(in srgb, ${accent} 22%, transparent)` : "none",
      }}
    >
      <span aria-hidden="true">{emoji}</span>
      {label}
      <span
        style={{
          fontSize: 10,
          padding: "1px 6px",
          borderRadius: 999,
          background: active ? "var(--ls-bg)" : "var(--ls-surface2)",
          color: active ? accent : "var(--ls-text-hint)",
          fontWeight: 700,
        }}
      >
        {count}
      </span>
    </button>
  );
}

function FeaturedCard({
  item,
  index,
  isFavorite,
  onToggleFavorite,
  onClick,
}: {
  item: FormationToolkitItem;
  index: number;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onClick: () => void;
}) {
  const accent = CATEGORY_ACCENT[item.category];
  return (
    <button
      type="button"
      onClick={onClick}
      className="ls-toolkit-card"
      style={{
        animationDelay: `${index * 80}ms`,
        background: `linear-gradient(135deg, color-mix(in srgb, ${accent} 14%, var(--ls-surface)) 0%, color-mix(in srgb, ${accent} 4%, var(--ls-surface2)) 100%)`,
        border: `1px solid ${accent}`,
        borderRadius: 16,
        padding: 18,
        textAlign: "left",
        cursor: "pointer",
        position: "relative",
        boxShadow: `0 6px 18px color-mix(in srgb, ${accent} 16%, transparent)`,
        fontFamily: "DM Sans, sans-serif",
        color: "var(--ls-text)",
      }}
    >
      <FavoriteBtn isFavorite={isFavorite} onClick={onToggleFavorite} />
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 28, lineHeight: 1 }} aria-hidden="true">
          {item.icon ?? "✦"}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 9,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              color: accent,
              fontWeight: 700,
              marginBottom: 2,
            }}
          >
            ⭐ Star · {CATEGORY_META[item.category].label}
          </div>
          <h3
            style={{
              fontFamily: "Syne, serif",
              fontSize: 16,
              fontWeight: 700,
              margin: 0,
              color: "var(--ls-text)",
              lineHeight: 1.25,
            }}
          >
            {item.title}
          </h3>
        </div>
      </div>
      <p style={{ fontSize: 12.5, color: "var(--ls-text-muted)", margin: 0, lineHeight: 1.5 }}>
        {item.description}
      </p>
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <SmallTag>⏱ {item.durationMin} min</SmallTag>
        <SmallTag>
          {FORMAT_TAG[item.format]?.emoji} {FORMAT_TAG[item.format]?.label}
        </SmallTag>
      </div>
    </button>
  );
}

function ToolkitCard({
  item,
  index,
  isFavorite,
  onToggleFavorite,
  onClick,
}: {
  item: FormationToolkitItem;
  index: number;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onClick: () => void;
}) {
  const accent = CATEGORY_ACCENT[item.category];
  return (
    <button
      type="button"
      onClick={onClick}
      className="ls-toolkit-card"
      style={{
        animationDelay: `${Math.min(index, 12) * 60}ms`,
        background: "var(--ls-surface)",
        border: "0.5px solid var(--ls-border)",
        borderLeft: `3px solid ${accent}`,
        borderRadius: 14,
        padding: 16,
        textAlign: "left",
        cursor: "pointer",
        position: "relative",
        fontFamily: "DM Sans, sans-serif",
        color: "var(--ls-text)",
      }}
    >
      <FavoriteBtn isFavorite={isFavorite} onClick={onToggleFavorite} />
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <span style={{ fontSize: 22 }} aria-hidden="true">
          {item.icon ?? "📄"}
        </span>
        <div
          style={{
            fontSize: 9,
            letterSpacing: 1.2,
            textTransform: "uppercase",
            color: accent,
            fontWeight: 700,
          }}
        >
          {CATEGORY_META[item.category].label}
        </div>
      </div>
      <h3
        style={{
          fontFamily: "Syne, serif",
          fontSize: 15,
          fontWeight: 700,
          margin: "0 0 6px 0",
          color: "var(--ls-text)",
          lineHeight: 1.3,
          paddingRight: 28,
        }}
      >
        {item.title}
      </h3>
      <p
        style={{
          fontSize: 12,
          color: "var(--ls-text-muted)",
          margin: 0,
          lineHeight: 1.45,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {item.description}
      </p>
      <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
        <SmallTag>⏱ {item.durationMin} min</SmallTag>
        <SmallTag>
          {FORMAT_TAG[item.format]?.emoji} {FORMAT_TAG[item.format]?.label}
        </SmallTag>
        {item.tag ? <SmallTag accent={accent}>{item.tag}</SmallTag> : null}
      </div>
    </button>
  );
}

function FavoriteBtn({
  isFavorite,
  onClick,
}: {
  isFavorite: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ls-toolkit-fav-btn"
      aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
      style={{
        position: "absolute",
        top: 10,
        right: 10,
        width: 32,
        height: 32,
        borderRadius: "50%",
        border: "none",
        background: isFavorite ? "color-mix(in srgb, var(--ls-gold) 15%, transparent)" : "transparent",
        color: isFavorite ? "var(--ls-gold)" : "var(--ls-text-hint)",
        cursor: "pointer",
        fontSize: 16,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2,
        opacity: isFavorite ? 1 : 0.6,
      }}
    >
      {isFavorite ? "★" : "☆"}
    </button>
  );
}

function SmallTag({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <span
      style={{
        fontSize: 10,
        padding: "3px 8px",
        borderRadius: 999,
        background: accent
          ? `color-mix(in srgb, ${accent} 14%, transparent)`
          : "var(--ls-surface2)",
        color: accent ?? "var(--ls-text-muted)",
        fontWeight: 600,
        fontFamily: "DM Sans, sans-serif",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}
