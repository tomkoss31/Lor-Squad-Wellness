// =============================================================================
// CommandPalette — recherche universelle Cmd+K (2026-04-29 polish #5)
// =============================================================================
//
// Power-user feature : Cmd+K (Mac) ou Ctrl+K (Win/Linux) ouvre une recherche
// instant qui combine :
//   - 8 actions de navigation statiques (Co-pilote, Agenda, Clients, …)
//   - clients filtres par firstName / lastName / phone
//
// Keyboard :
//   ↑ / ↓        navigation
//   Enter        active l item selectionne
//   Esc          ferme
//   Cmd/Ctrl+K   toggle ouvert/ferme
//
// Mounting : globalement dans App.tsx a cote de <ToastHost />.
// 100 % var(--ls-*) → suit le toggle clair/dark.
// =============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import type { Client } from "../../types/domain";

interface NavAction {
  id: string;
  label: string;
  emoji: string;
  hint: string;
  path: string;
  keywords: string[];
}

const NAV_ACTIONS: NavAction[] = [
  {
    id: "copilote",
    label: "Co-pilote",
    emoji: "🧭",
    hint: "Dashboard quotidien — jauge PV + stats",
    path: "/co-pilote",
    keywords: ["copilote", "co-pilote", "dashboard", "accueil", "home"],
  },
  {
    id: "agenda",
    label: "Agenda",
    emoji: "📅",
    hint: "Tous tes RDV à venir",
    path: "/agenda",
    keywords: ["agenda", "rdv", "rendez-vous", "calendrier"],
  },
  {
    id: "clients",
    label: "Clients",
    emoji: "👥",
    hint: "Liste de tes clients + filtres rapides",
    path: "/clients",
    keywords: ["clients", "fiche", "dossier"],
  },
  {
    id: "messagerie",
    label: "Messagerie",
    emoji: "💬",
    hint: "Conversations clients",
    path: "/messages",
    keywords: ["messages", "messagerie", "chat", "conversation"],
  },
  {
    id: "pv",
    label: "Suivi PV",
    emoji: "📊",
    hint: "Volume PV mensuel + projection",
    path: "/pv",
    keywords: ["pv", "volume", "suivi", "stats"],
  },
  {
    id: "academy",
    label: "Academy",
    emoji: "🎓",
    hint: "Parcours de formation distri",
    path: "/academy",
    keywords: ["academy", "formation", "tuto", "tutorial"],
  },
  {
    id: "parametres",
    label: "Paramètres",
    emoji: "⚙️",
    hint: "Profil + équipe + statistiques",
    path: "/parametres",
    keywords: ["parametres", "settings", "profil", "config"],
  },
  {
    id: "new-bilan",
    label: "+ Nouveau bilan",
    emoji: "✨",
    hint: "Crée un client + bilan + programme",
    path: "/clients/new-assessment",
    keywords: ["nouveau", "bilan", "create", "ajouter", "new"],
  },
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

interface PaletteItem {
  type: "nav" | "client";
  id: string;
  label: string;
  hint: string;
  emoji: string;
  onSelect: () => void;
}

export function CommandPalette() {
  const navigate = useNavigate();
  const { clients, currentUser } = useAppContext();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // ─── Keyboard listener Cmd/Ctrl + K ───────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isModK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (isModK) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (open && e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // ─── Reset state on open ──────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      // Focus input apres render
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // ─── Build items list (filtree par query) ─────────────────────────────────
  const items = useMemo<PaletteItem[]>(() => {
    const q = normalize(query);
    const navItems: PaletteItem[] = NAV_ACTIONS
      .filter((nav) => {
        if (!q) return true;
        return (
          normalize(nav.label).includes(q)
          || normalize(nav.hint).includes(q)
          || nav.keywords.some((k) => normalize(k).includes(q))
        );
      })
      .map((nav) => ({
        type: "nav",
        id: nav.id,
        label: nav.label,
        hint: nav.hint,
        emoji: nav.emoji,
        onSelect: () => {
          navigate(nav.path);
          setOpen(false);
        },
      }));

    let clientItems: PaletteItem[] = [];
    if (q && q.length >= 2) {
      clientItems = (clients || [])
        .filter((c: Client) => {
          const full = normalize(`${c.firstName} ${c.lastName}`);
          const phone = normalize(c.phone || "");
          return full.includes(q) || phone.includes(q);
        })
        .slice(0, 6)
        .map((c: Client) => ({
          type: "client",
          id: c.id,
          label: `${c.firstName} ${c.lastName}`,
          hint: c.phone || c.email || "Fiche client",
          emoji: "👤",
          onSelect: () => {
            navigate(`/clients/${c.id}`);
            setOpen(false);
          },
        }));
    }

    return [...navItems, ...clientItems];
  }, [query, clients, navigate]);

  // Clamp activeIdx quand items changent
  useEffect(() => {
    if (activeIdx >= items.length) setActiveIdx(Math.max(0, items.length - 1));
  }, [items.length, activeIdx]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`);
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const onInputKey = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(items.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = items[activeIdx];
        if (item) item.onSelect();
      }
    },
    [items, activeIdx],
  );

  if (!currentUser) return null;
  if (!open) return null;

  return (
    <div
      role="presentation"
      aria-hidden="true"
      onClick={() => setOpen(false)}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10010,
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "12vh 16px 16px",
      }}
    >
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events -- stopPropagation only, dialog role on element */}
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Recherche universelle"
        style={{
          width: "100%",
          maxWidth: 580,
          background: "var(--ls-surface)",
          border: "0.5px solid var(--ls-border)",
          borderRadius: 16,
          boxShadow: "0 24px 64px rgba(0,0,0,0.30)",
          overflow: "hidden",
          fontFamily: "DM Sans, sans-serif",
          animation: "ls-cmdk-enter 220ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      >
        <style>{`
          @keyframes ls-cmdk-enter {
            0% { opacity: 0; transform: translateY(-8px) scale(0.98); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>

        {/* Input */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 16px",
            borderBottom: "0.5px solid var(--ls-border)",
          }}
        >
          <span style={{ fontSize: 18, opacity: 0.6 }}>🔎</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIdx(0);
            }}
            onKeyDown={onInputKey}
            placeholder="Naviguer ou chercher un client…"
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: 15,
              color: "var(--ls-text)",
              fontFamily: "inherit",
            }}
          />
          <kbd
            style={{
              fontSize: 10,
              fontFamily: "inherit",
              fontWeight: 600,
              padding: "2px 6px",
              borderRadius: 4,
              background: "var(--ls-surface2)",
              border: "0.5px solid var(--ls-border)",
              color: "var(--ls-text-muted)",
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Liste des items */}
        <div
          ref={listRef}
          style={{
            maxHeight: "50vh",
            overflowY: "auto",
            padding: 6,
          }}
        >
          {items.length === 0 ? (
            <div
              style={{
                padding: "28px 16px",
                textAlign: "center",
                fontSize: 13,
                color: "var(--ls-text-muted)",
              }}
            >
              Aucun résultat pour « {query} »
            </div>
          ) : (
            items.map((item, idx) => {
              const isActive = idx === activeIdx;
              return (
                <button
                  key={`${item.type}-${item.id}`}
                  type="button"
                  data-idx={idx}
                  onClick={() => item.onSelect()}
                  onMouseEnter={() => setActiveIdx(idx)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: isActive
                      ? "color-mix(in srgb, var(--ls-gold) 12%, transparent)"
                      : "transparent",
                    border: isActive
                      ? "0.5px solid var(--ls-gold)"
                      : "0.5px solid transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "inherit",
                    transition: "background 80ms ease",
                  }}
                >
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{item.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--ls-text)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {item.label}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--ls-text-muted)",
                        marginTop: 1,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {item.hint}
                    </div>
                  </div>
                  {item.type === "client" ? (
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: 0.4,
                        padding: "2px 6px",
                        borderRadius: 4,
                        background: "color-mix(in srgb, var(--ls-teal) 18%, transparent)",
                        color: "var(--ls-teal)",
                        flexShrink: 0,
                      }}
                    >
                      CLIENT
                    </span>
                  ) : null}
                  {isActive ? (
                    <kbd
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 6px",
                        borderRadius: 4,
                        background: "var(--ls-gold)",
                        color: "var(--ls-bg)",
                        flexShrink: 0,
                      }}
                    >
                      ↵
                    </kbd>
                  ) : null}
                </button>
              );
            })
          )}
        </div>

        {/* Footer hint */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 14px",
            borderTop: "0.5px solid var(--ls-border)",
            background: "var(--ls-surface2)",
            fontSize: 10,
            color: "var(--ls-text-hint)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span>
              <kbd style={kbdInline}>↑</kbd> <kbd style={kbdInline}>↓</kbd> Naviguer
            </span>
            <span>
              <kbd style={kbdInline}>↵</kbd> Sélectionner
            </span>
          </div>
          <span>
            <kbd style={kbdInline}>⌘ K</kbd> ou <kbd style={kbdInline}>Ctrl K</kbd>
          </span>
        </div>
      </div>
    </div>
  );
}

const kbdInline: React.CSSProperties = {
  fontSize: 9,
  fontFamily: "inherit",
  fontWeight: 600,
  padding: "1px 5px",
  borderRadius: 3,
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
  color: "var(--ls-text-muted)",
};
