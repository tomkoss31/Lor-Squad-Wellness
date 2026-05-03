// =============================================================================
// ToolkitItemPopup — modal sandbox immersive pour scripts copier-coller
// (chantier boite-a-outils, 2026-11-04)
//
// Affiche un FormationToolkitItem en modal plein ecran (sandbox style) :
//   - Hero header avec emoji 56px + tag + titre Syne XL + description
//   - Markdown intro rendu via MarkdownRenderer
//   - Section scripts copiables avec un bouton par script
//     ("📋 Copier" → "✓ Copié" 1.8s)
//   - Note coach en italic sous chaque script
//   - Animation entrance fade + scale
//   - Theme-aware via var(--ls-*) + accent par categorie
//
// Touches premium : box-shadow, glow ambient, scrollbar custom, safe-area
// iOS, escape key + backdrop click pour fermer.
// =============================================================================

import { useEffect, useState } from "react";
import type { FormationToolkitItem } from "../../data/formation";
import { useAppContext } from "../../context/AppContext";
import { MarkdownRenderer } from "./MarkdownRenderer";

const CATEGORY_ACCENT: Record<FormationToolkitItem["category"], string> = {
  prospection: "var(--ls-gold)",
  bilan: "var(--ls-teal)",
  suivi: "var(--ls-purple)",
  business: "var(--ls-coral)",
};

const PROFILE_LABEL: Record<FormationToolkitItem["profile"], string> = {
  tous: "Tous",
  nouveau: "Nouveau distri",
  relance: "Réactivation",
  sup_plus: "Supervisor +",
};

export interface ToolkitItemPopupProps {
  item: FormationToolkitItem;
  onClose: () => void;
}

export function ToolkitItemPopup({ item, onClose }: ToolkitItemPopupProps) {
  const accent = CATEGORY_ACCENT[item.category];
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  // Escape key + lock scroll
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  function copyScript(text: string, idx: number) {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    void navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx);
      window.setTimeout(() => setCopiedIdx(null), 1800);
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "color-mix(in srgb, var(--ls-bg) 88%, black)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "max(16px, env(safe-area-inset-top, 16px)) 16px max(16px, env(safe-area-inset-bottom, 16px))",
        animation: "ls-toolkit-backdrop 240ms ease-out",
        fontFamily: "DM Sans, sans-serif",
      }}
    >
      <style>{`
        @keyframes ls-toolkit-backdrop {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes ls-toolkit-modal-in {
          0% { opacity: 0; transform: translateY(20px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .ls-toolkit-modal::-webkit-scrollbar { width: 8px; }
        .ls-toolkit-modal::-webkit-scrollbar-track { background: transparent; }
        .ls-toolkit-modal::-webkit-scrollbar-thumb {
          background: color-mix(in srgb, var(--ls-text) 16%, transparent);
          border-radius: 4px;
        }
        .ls-toolkit-modal::-webkit-scrollbar-thumb:hover {
          background: color-mix(in srgb, var(--ls-text) 26%, transparent);
        }
      `}</style>

      <div
        className="ls-toolkit-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          background: "var(--ls-surface)",
          border: `0.5px solid color-mix(in srgb, ${accent} 32%, var(--ls-border))`,
          borderRadius: 22,
          maxWidth: 720,
          width: "100%",
          maxHeight: "calc(100vh - 32px)",
          overflowY: "auto",
          boxShadow: `0 20px 60px -20px color-mix(in srgb, ${accent} 28%, rgba(0,0,0,0.40)), 0 4px 16px rgba(0,0,0,0.20)`,
          animation: "ls-toolkit-modal-in 360ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {/* Glow ambient en haut */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: -50,
            right: -50,
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: `color-mix(in srgb, ${accent} 18%, transparent)`,
            filter: "blur(64px)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            zIndex: 2,
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "var(--ls-surface2)",
            border: "0.5px solid var(--ls-border)",
            color: "var(--ls-text-muted)",
            fontSize: 18,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 200ms ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--ls-surface)";
            e.currentTarget.style.color = "var(--ls-text)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--ls-surface2)";
            e.currentTarget.style.color = "var(--ls-text-muted)";
          }}
        >
          ✕
        </button>

        {/* HEADER */}
        <header
          style={{
            position: "relative",
            padding: "32px 32px 24px",
            background: `linear-gradient(135deg, color-mix(in srgb, ${accent} 10%, var(--ls-surface)) 0%, var(--ls-surface) 100%)`,
            borderBottom: `0.5px solid color-mix(in srgb, ${accent} 18%, var(--ls-border))`,
          }}
        >
          {/* Tag + profile chips */}
          <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: 9.5,
                fontWeight: 700,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                padding: "4px 10px",
                borderRadius: 999,
                background: `color-mix(in srgb, ${accent} 18%, transparent)`,
                color: accent,
                border: `0.5px solid color-mix(in srgb, ${accent} 35%, transparent)`,
              }}
            >
              {item.tag}
            </span>
            <span
              style={{
                fontSize: 9.5,
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                padding: "4px 10px",
                borderRadius: 999,
                background: "var(--ls-surface2)",
                color: "var(--ls-text-muted)",
                border: "0.5px solid var(--ls-border)",
              }}
            >
              👤 {PROFILE_LABEL[item.profile]}
            </span>
            <span
              style={{
                fontSize: 9.5,
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                padding: "4px 10px",
                borderRadius: 999,
                background: "var(--ls-surface2)",
                color: "var(--ls-text-muted)",
                border: "0.5px solid var(--ls-border)",
              }}
            >
              ⏱ {item.durationMin} min
            </span>
          </div>

          {/* Icon + title */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: `linear-gradient(135deg, ${accent} 0%, color-mix(in srgb, ${accent} 70%, var(--ls-bg)) 100%)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
                boxShadow: `0 4px 14px color-mix(in srgb, ${accent} 35%, transparent), inset 0 1px 0 rgba(255,255,255,0.40)`,
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              {item.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0, paddingRight: 32 }}>
              <h2
                style={{
                  fontFamily: "Syne, serif",
                  fontWeight: 800,
                  fontSize: "clamp(20px, 3vw, 26px)",
                  letterSpacing: "-0.02em",
                  lineHeight: 1.18,
                  color: "var(--ls-text)",
                  margin: 0,
                  marginBottom: 6,
                }}
              >
                {item.title}
              </h2>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--ls-text-muted)",
                  lineHeight: 1.55,
                  margin: 0,
                }}
              >
                {item.description}
              </p>
            </div>
          </div>
        </header>

        {/* BODY */}
        <div style={{ padding: "24px 32px 32px", position: "relative" }}>
          {/* Markdown intro */}
          {item.contentMarkdown ? (
            <div style={{ marginBottom: 24 }}>
              <MarkdownRenderer content={item.contentMarkdown} />
            </div>
          ) : null}

          {/* Checklist interactive (kind === "checklist") — items "- [ ]"
              extraits du markdown, persistes par user/item/jour pour reset
              quotidien automatique. */}
          {item.kind === "checklist" ? (
            <InteractiveChecklist itemId={item.id} markdown={item.contentMarkdown} accent={accent} />
          ) : null}

          {/* Scripts pack */}
          {item.scripts && item.scripts.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  paddingBottom: 10,
                  borderBottom: `0.5px solid color-mix(in srgb, ${accent} 22%, var(--ls-border))`,
                }}
              >
                <span style={{ fontSize: 16 }} aria-hidden="true">
                  📋
                </span>
                <h3
                  style={{
                    fontFamily: "Syne, serif",
                    fontWeight: 700,
                    fontSize: 15,
                    margin: 0,
                    color: accent,
                    letterSpacing: "-0.01em",
                  }}
                >
                  Scripts copier-coller · {item.scripts.length}
                </h3>
              </div>

              {item.scripts.map((script, idx) => {
                const isCopied = copiedIdx === idx;
                return (
                  <div
                    key={idx}
                    style={{
                      padding: "14px 16px",
                      borderRadius: 14,
                      background: "var(--ls-surface2)",
                      border: `0.5px solid color-mix(in srgb, ${accent} 14%, var(--ls-border))`,
                      transition: "border-color 200ms ease",
                    }}
                  >
                    {/* Label + bouton copier */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        marginBottom: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "DM Sans, sans-serif",
                          fontSize: 13,
                          fontWeight: 700,
                          color: "var(--ls-text)",
                          letterSpacing: "-0.005em",
                        }}
                      >
                        {script.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyScript(script.text, idx)}
                        style={{
                          padding: "6px 14px",
                          borderRadius: 999,
                          background: isCopied
                            ? accent
                            : `color-mix(in srgb, ${accent} 14%, var(--ls-surface))`,
                          border: isCopied
                            ? `0.5px solid ${accent}`
                            : `0.5px solid color-mix(in srgb, ${accent} 35%, transparent)`,
                          color: isCopied ? "var(--ls-bg)" : accent,
                          fontFamily: "DM Sans, sans-serif",
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                          transition: "all 200ms ease",
                          letterSpacing: "0.02em",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          flexShrink: 0,
                        }}
                      >
                        {isCopied ? "✓ Copié" : "📋 Copier"}
                      </button>
                    </div>

                    {/* Texte du script (style code-block premium) */}
                    <pre
                      style={{
                        margin: 0,
                        padding: "14px 16px",
                        borderRadius: 10,
                        background: "var(--ls-surface)",
                        border: "0.5px solid var(--ls-border)",
                        color: "var(--ls-text)",
                        fontFamily: "DM Sans, sans-serif",
                        fontSize: 13,
                        lineHeight: 1.6,
                        whiteSpace: "pre-wrap",
                        wordWrap: "break-word",
                        fontWeight: 400,
                      }}
                    >
                      {script.text}
                    </pre>

                    {/* Note coach */}
                    {script.note ? (
                      <p
                        style={{
                          fontSize: 11.5,
                          color: "var(--ls-text-muted)",
                          fontStyle: "italic",
                          margin: "10px 0 0",
                          lineHeight: 1.5,
                          paddingLeft: 8,
                          borderLeft: `2px solid color-mix(in srgb, ${accent} 30%, transparent)`,
                        }}
                      >
                        💡 {script.note}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ─── InteractiveChecklist (kind=checklist) ────────────────────────────────
//
// Parse les lignes "- [ ] item" du markdown et les rend en vraies checkbox
// cochables persistees localStorage par user + item + jour. Reset chaque
// jour automatique (cle YMD). Affiche barre de progression + compteur.

const CHECKLIST_PREFIX = "ls-toolkit-checklist-";

function ymdUtc(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseChecklistItemsFromMd(md: string): string[] {
  const lines = md.split("\n");
  const items: string[] = [];
  for (const line of lines) {
    const match = line.match(/^[\s-]*\[\s\]\s+(.+)$/);
    if (match) items.push(match[1].trim());
  }
  return items;
}

interface InteractiveChecklistProps {
  itemId: string;
  markdown: string;
  accent: string;
}

function InteractiveChecklist({ itemId, markdown, accent }: InteractiveChecklistProps) {
  const { currentUser } = useAppContext();
  const userId = currentUser?.id ?? null;
  const today = ymdUtc(new Date());
  const storageKey = userId ? `${CHECKLIST_PREFIX}${userId}-${itemId}-${today}` : null;

  const items = parseChecklistItemsFromMd(markdown);
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) setChecked(JSON.parse(raw) as Record<number, boolean>);
      else setChecked({});
    } catch {
      setChecked({});
    }
  }, [storageKey]);

  function toggle(idx: number) {
    if (!storageKey) return;
    setChecked((prev) => {
      const next = { ...prev, [idx]: !prev[idx] };
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* quota */
      }
      return next;
    });
  }

  if (items.length === 0 || !userId) return null;

  const doneCount = items.filter((_, i) => checked[i]).length;
  const allDone = doneCount === items.length;

  return (
    <section
      style={{
        marginTop: 20,
        padding: "16px 18px",
        borderRadius: 14,
        background: `color-mix(in srgb, ${accent} 6%, var(--ls-surface2))`,
        border: `0.5px solid color-mix(in srgb, ${accent} 28%, var(--ls-border))`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }} aria-hidden="true">
            ✅
          </span>
          <h3
            style={{
              fontFamily: "Syne, serif",
              fontWeight: 700,
              fontSize: 14,
              margin: 0,
              color: accent,
              letterSpacing: "-0.01em",
            }}
          >
            Coche au quotidien · aujourd&apos;hui
          </h3>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: allDone ? "var(--ls-teal)" : "var(--ls-text-muted)",
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          {doneCount}/{items.length} {allDone ? "✓ tout fait !" : "fait"}
        </span>
      </div>

      {/* Mini progress bar */}
      <div
        style={{
          height: 4,
          background: "var(--ls-surface2)",
          borderRadius: 999,
          overflow: "hidden",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            width: `${(doneCount / items.length) * 100}%`,
            height: "100%",
            background: allDone
              ? "var(--ls-teal)"
              : `linear-gradient(90deg, ${accent}, color-mix(in srgb, ${accent} 70%, var(--ls-teal)))`,
            transition: "width 320ms ease, background 280ms ease",
          }}
        />
      </div>

      {/* Items */}
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((label, idx) => {
          const isOn = !!checked[idx];
          return (
            <li key={idx}>
              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: isOn
                    ? "color-mix(in srgb, var(--ls-teal) 8%, var(--ls-surface))"
                    : "var(--ls-surface)",
                  border: isOn
                    ? "0.5px solid color-mix(in srgb, var(--ls-teal) 40%, transparent)"
                    : "0.5px solid var(--ls-border)",
                  cursor: "pointer",
                  transition: "all 200ms ease",
                  fontFamily: "DM Sans, sans-serif",
                }}
              >
                <input
                  type="checkbox"
                  checked={isOn}
                  onChange={() => toggle(idx)}
                  style={{
                    width: 18,
                    height: 18,
                    accentColor: "var(--ls-teal)",
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                />
                <span
                  style={{
                    fontSize: 13.5,
                    color: isOn ? "var(--ls-text-muted)" : "var(--ls-text)",
                    textDecoration: isOn ? "line-through" : "none",
                    lineHeight: 1.5,
                  }}
                  // Keep markdown bold/italic markers visible (simple plain text)
                >
                  {label.replace(/\*\*/g, "")}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <p
        style={{
          fontSize: 10.5,
          color: "var(--ls-text-hint)",
          marginTop: 12,
          fontStyle: "italic",
          fontFamily: "DM Sans, sans-serif",
          textAlign: "center",
        }}
      >
        🔒 Tes coches reset chaque jour à minuit. Sauvegarde locale par appareil.
      </p>
    </section>
  );
}
