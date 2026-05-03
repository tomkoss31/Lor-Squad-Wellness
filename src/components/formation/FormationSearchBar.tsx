// =============================================================================
// FormationSearchBar — quick win #4 (2026-11-04)
//
// Barre de recherche en haut de /formation. Cherche dans :
//   - Modules : title, description, ideeForce, ancrage, action,
//     lessons (titles + contentMarkdown)
//   - Resources biblio : title, description, tag
//
// Dropdown affiche les resultats categorises (Modules / Bibliotheque).
// Click → navigate vers le module ou la category.
//
// Recherche fuzzy simple : split query en mots, chaque mot doit matcher
// (case + accent insensitive) sur au moins un champ du resultat.
// =============================================================================

import { useMemo, useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FORMATION_LEVELS, FORMATION_CATEGORIES } from "../../data/formation";

interface SearchResult {
  type: "module" | "resource";
  id: string;
  title: string;
  /** Subtitle a afficher dans le dropdown (ex: "N1 · Démarrer", "Catégorie : Bilan"). */
  context: string;
  /** Snippet de match (premier passage trouve), 80 chars max. */
  snippet?: string;
  /** URL cible. */
  href: string;
  /** Couleur d accent pour le badge type. */
  accent: string;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function matchAll(text: string, words: string[]): boolean {
  if (!text) return false;
  const normalized = normalize(text);
  return words.every((w) => normalized.includes(w));
}

/** Trouve un snippet 80-char autour du premier match. */
function makeSnippet(text: string, words: string[]): string | undefined {
  if (!text || words.length === 0) return undefined;
  const norm = normalize(text);
  for (const w of words) {
    const idx = norm.indexOf(w);
    if (idx >= 0) {
      const start = Math.max(0, idx - 30);
      const end = Math.min(text.length, idx + 50);
      const prefix = start > 0 ? "…" : "";
      const suffix = end < text.length ? "…" : "";
      return prefix + text.slice(start, end).replace(/\s+/g, " ").trim() + suffix;
    }
  }
  return undefined;
}

export function FormationSearchBar() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const trimmed = query.trim();
  const words = useMemo(
    () =>
      trimmed.length >= 2
        ? normalize(trimmed)
            .split(/\s+/)
            .filter((w) => w.length >= 2)
        : [],
    [trimmed],
  );

  const results = useMemo<SearchResult[]>(() => {
    if (words.length === 0) return [];
    const out: SearchResult[] = [];

    // 1. Modules + lecons
    for (const level of FORMATION_LEVELS) {
      const accentMap: Record<string, string> = {
        demarrer: "var(--ls-gold)",
        construire: "var(--ls-teal)",
        dupliquer: "var(--ls-purple)",
      };
      const accent = accentMap[level.id] ?? "var(--ls-gold)";
      for (const m of level.modules) {
        const haystacks = [
          m.title,
          m.description,
          m.ideeForce ?? "",
          m.ancrage ?? "",
          m.action ?? "",
          ...m.lessons.map((l) => l.title),
          ...m.lessons.map((l) => l.contentMarkdown ?? ""),
        ];
        const fullText = haystacks.join(" \n ");
        if (matchAll(fullText, words)) {
          out.push({
            type: "module",
            id: m.id,
            title: `${m.number} · ${m.title}`,
            context: `N${level.order} · ${level.title}`,
            snippet: makeSnippet(fullText, words),
            href: `/formation/parcours/${level.slug}/${m.slug}`,
            accent,
          });
        }
      }
    }

    // 2. Resources biblio
    for (const cat of FORMATION_CATEGORIES) {
      const catAccent =
        cat.accent === "gold"
          ? "var(--ls-gold)"
          : cat.accent === "teal"
            ? "var(--ls-teal)"
            : cat.accent === "purple"
              ? "var(--ls-purple)"
              : "var(--ls-coral)";
      for (const r of cat.resources) {
        const fullText = [r.title, r.description, r.tag ?? ""].join(" ");
        if (matchAll(fullText, words)) {
          out.push({
            type: "resource",
            id: r.id,
            title: r.title,
            context: `Bibliothèque · ${cat.title}`,
            snippet: makeSnippet(fullText, words),
            href: `/formation/${cat.slug}`,
            accent: catAccent,
          });
        }
      }
    }

    return out.slice(0, 12);
  }, [words]);

  // Click outside → close dropdown
  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function handleSelect(result: SearchResult) {
    setOpen(false);
    setQuery("");
    navigate(result.href);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    } else if (e.key === "Enter" && results.length > 0) {
      handleSelect(results[0]);
    }
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 14,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 16,
            pointerEvents: "none",
          }}
        >
          🔍
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(e.target.value.trim().length >= 2);
          }}
          onFocus={() => trimmed.length >= 2 && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Rechercher dans les modules + bibliothèque (ex : objection prix, recrutement)"
          style={{
            width: "100%",
            padding: "12px 14px 12px 42px",
            borderRadius: 12,
            background: "var(--ls-input-bg, var(--ls-surface))",
            border: open
              ? "1.5px solid var(--ls-gold)"
              : "1.5px solid var(--ls-border)",
            color: "var(--ls-text)",
            fontFamily: "DM Sans, sans-serif",
            fontSize: 14,
            outline: "none",
            transition: "border-color 180ms ease, box-shadow 180ms ease",
            boxShadow: open
              ? "0 0 0 4px color-mix(in srgb, var(--ls-gold) 16%, transparent)"
              : "none",
          }}
        />
        {query.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setOpen(false);
              inputRef.current?.focus();
            }}
            aria-label="Effacer la recherche"
            style={{
              position: "absolute",
              right: 12,
              top: "50%",
              transform: "translateY(-50%)",
              background: "transparent",
              border: "none",
              color: "var(--ls-text-hint)",
              cursor: "pointer",
              fontSize: 14,
              padding: 4,
            }}
          >
            ✕
          </button>
        ) : null}
      </div>

      {/* Dropdown resultats */}
      {open && trimmed.length >= 2 ? (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            right: 0,
            zIndex: 30,
            background: "var(--ls-surface)",
            border: "0.5px solid var(--ls-border)",
            borderRadius: 14,
            boxShadow: "0 12px 40px -12px rgba(0,0,0,0.30)",
            maxHeight: 400,
            overflowY: "auto",
            padding: 6,
          }}
        >
          {results.length === 0 ? (
            <div
              style={{
                padding: "20px 14px",
                textAlign: "center",
                fontSize: 13,
                color: "var(--ls-text-muted)",
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              Aucun résultat pour <strong>« {trimmed} »</strong>.
              <br />
              <span style={{ fontSize: 11.5, color: "var(--ls-text-hint)", marginTop: 4, display: "inline-block" }}>
                Essaie un mot plus simple ou vérifie l'orthographe.
              </span>
            </div>
          ) : (
            <>
              <div
                style={{
                  padding: "8px 12px 4px",
                  fontSize: 10,
                  fontFamily: "DM Sans, sans-serif",
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--ls-text-muted)",
                }}
              >
                {results.length} résultat{results.length > 1 ? "s" : ""}
              </div>
              {results.map((r) => (
                <button
                  key={`${r.type}-${r.id}`}
                  type="button"
                  onClick={() => handleSelect(r)}
                  style={{
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 4,
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background 150ms ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = `color-mix(in srgb, ${r.accent} 8%, transparent)`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: r.accent,
                        padding: "2px 7px",
                        borderRadius: 999,
                        background: `color-mix(in srgb, ${r.accent} 14%, transparent)`,
                      }}
                    >
                      {r.type === "module" ? "Module" : "Ressource"}
                    </span>
                    <span
                      style={{
                        fontFamily: "DM Sans, sans-serif",
                        fontSize: 11,
                        color: "var(--ls-text-muted)",
                      }}
                    >
                      {r.context}
                    </span>
                  </div>
                  <div
                    style={{
                      fontFamily: "Syne, serif",
                      fontWeight: 700,
                      fontSize: 14,
                      color: "var(--ls-text)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {r.title}
                  </div>
                  {r.snippet ? (
                    <div
                      style={{
                        fontFamily: "DM Sans, sans-serif",
                        fontSize: 12,
                        color: "var(--ls-text-muted)",
                        lineHeight: 1.45,
                        fontStyle: "italic",
                      }}
                    >
                      {r.snippet}
                    </div>
                  ) : null}
                </button>
              ))}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
