// =============================================================================
// ClientsFiltersMenu — bouton « ⚙️ Filtres ▾ » + menu déroulant premium pour la
// page Dossiers clients (refonte archi 2026-06-12, d'après la maquette Claude
// Design validée par Thomas).
//
// Replie ce qu'on change RAREMENT (tri · statut · responsable) dans un seul
// menu, pour désengorger le haut de page. Les chips rapides quotidiens restent
// visibles ailleurs. Rendu en PORTAL (jamais coupé). Badge « ·N » quand des
// filtres statut/responsable sont actifs. Tokens var(--ls-*) → theme-aware.
// =============================================================================

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface OwnerOption {
  id: string;
  name: string;
  count: number;
  initials: string;
}

interface Props {
  sortKey: string;
  onSortChange: (k: string) => void;
  statusFilter: string;
  onStatusChange: (s: string) => void;
  ownerFilter: string;
  onOwnerChange: (id: string) => void;
  owners: OwnerOption[];
  allOwnersCount: number;
  /** Section responsable visible (admin/référent qui gère plusieurs coachs). */
  showResponsable: boolean;
}

const SORTS: { id: string; label: string }[] = [
  { id: "smart", label: "Intelligent" },
  { id: "name-asc", label: "Nom A→Z" },
  { id: "last-bilan-desc", label: "Dernier bilan ↓" },
  { id: "last-bilan-asc", label: "Dernier bilan ↑" },
  { id: "pv-month-desc", label: "PV ce mois ↓" },
];

const STATUTS: { id: string; label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "active", label: "Actifs" },
  { id: "not_started", label: "Pas démarrés" },
  { id: "paused", label: "En pause" },
  { id: "stopped", label: "Arrêtés" },
  { id: "lost", label: "Perdus" },
  { id: "fragile", label: "⚠ Fragiles" },
];

const SECTION_LABEL: React.CSSProperties = {
  fontFamily: "Syne, sans-serif",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.09em",
  textTransform: "uppercase",
  color: "var(--ls-text-hint)",
  margin: "2px 2px 8px",
};

export function ClientsFiltersMenu({
  sortKey,
  onSortChange,
  statusFilter,
  onStatusChange,
  ownerFilter,
  onOwnerChange,
  owners,
  allOwnersCount,
  showResponsable,
}: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const activeCount =
    (statusFilter !== "all" ? 1 : 0) + (ownerFilter !== "all" ? 1 : 0);

  const place = useCallback(() => {
    const b = btnRef.current?.getBoundingClientRect();
    if (!b) return;
    setPos({ top: b.bottom + 9, right: Math.max(8, window.innerWidth - b.right) });
  }, []);
  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    // Fix 2026-06-23 : la liste du menu est scrollable (overflowY:auto, ex.
    // section Responsable en bas). Le listener scroll en capture se déclenchait
    // AUSSI sur le scroll INTERNE du menu → fermeture instantanée dès qu'on
    // essayait de descendre (desktop). On ne ferme que sur le scroll de la PAGE
    // (popover position:fixed qui se détacherait du bouton).
    const onScroll = (e: Event) => {
      const t = e.target as Node | null;
      if (t && menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onResize = () => setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const reset = () => {
    onStatusChange("all");
    onOwnerChange("all");
    onSortChange("smart");
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          height: 44,
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          padding: "0 14px",
          borderRadius: 12,
          border: open ? "1px solid var(--ls-teal)" : "1px solid var(--ls-border)",
          background: "var(--ls-surface)",
          color: "var(--ls-text)",
          fontSize: 13.5,
          fontWeight: 600,
          fontFamily: "DM Sans, sans-serif",
          cursor: "pointer",
          whiteSpace: "nowrap",
          boxShadow: open ? "0 0 0 2px color-mix(in srgb, var(--ls-teal) 30%, transparent)" : "none",
        }}
      >
        <span aria-hidden>⚙️</span>
        <span>Filtres</span>
        {activeCount > 0 ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 18,
              height: 18,
              padding: "0 5px",
              borderRadius: 999,
              background: "linear-gradient(92deg,var(--ls-teal),var(--ls-purple))",
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {activeCount}
          </span>
        ) : null}
        <span style={{ opacity: 0.5, fontSize: 11 }} aria-hidden>▾</span>
      </button>

      {open && pos
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              style={{
                position: "fixed",
                top: pos.top,
                right: pos.right,
                width: 330,
                maxWidth: "84vw",
                maxHeight: "80vh",
                overflowY: "auto",
                background: "var(--ls-surface)",
                border: "1px solid var(--ls-border2, var(--ls-border))",
                borderRadius: 18,
                boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
                padding: 16,
                zIndex: 9999,
              }}
            >
              {/* Tri */}
              <div style={SECTION_LABEL}>Trier</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {SORTS.map((o) => {
                  const on = sortKey === o.id;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => onSortChange(o.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 11,
                        padding: "9px 10px",
                        borderRadius: 10,
                        border: "none",
                        textAlign: "left",
                        background: on ? "color-mix(in srgb, var(--ls-teal) 9%, transparent)" : "transparent",
                        color: "var(--ls-text)",
                        cursor: "pointer",
                        fontFamily: "DM Sans, sans-serif",
                      }}
                    >
                      <span
                        style={{
                          flex: "0 0 auto",
                          width: 15,
                          height: 15,
                          borderRadius: "50%",
                          boxSizing: "border-box",
                          border: on ? "5px solid var(--ls-teal)" : "2px solid var(--ls-border2, var(--ls-border))",
                        }}
                      />
                      <span style={{ fontSize: 13.5, fontWeight: 500 }}>{o.label}</span>
                    </button>
                  );
                })}
              </div>

              <div style={{ height: 1, background: "var(--ls-border)", margin: "13px 0" }} />

              {/* Statut */}
              <div style={SECTION_LABEL}>Statut</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {STATUTS.map((o) => {
                  const on = statusFilter === o.id;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => onStatusChange(o.id)}
                      style={{
                        padding: "7px 12px",
                        borderRadius: 999,
                        border: on
                          ? "1px solid color-mix(in srgb, var(--ls-purple) 55%, transparent)"
                          : "1px solid var(--ls-border)",
                        background: on
                          ? "color-mix(in srgb, var(--ls-purple) 14%, transparent)"
                          : "var(--ls-surface2)",
                        color: on ? "var(--ls-text)" : "var(--ls-text-muted)",
                        fontSize: 12.5,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "DM Sans, sans-serif",
                      }}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>

              {/* Responsable (admin) */}
              {showResponsable && owners.length > 0 ? (
                <>
                  <div style={{ height: 1, background: "var(--ls-border)", margin: "13px 0" }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 7, ...{ margin: "2px 2px 8px" } }}>
                    <span style={{ ...SECTION_LABEL, margin: 0 }}>Responsable</span>
                    <span
                      style={{
                        fontSize: 9.5,
                        fontWeight: 700,
                        color: "var(--ls-purple)",
                        background: "color-mix(in srgb, var(--ls-purple) 14%, transparent)",
                        padding: "2px 7px",
                        borderRadius: 999,
                      }}
                    >
                      Admin
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <OwnerRow
                      ini="🌐"
                      label="Toute la base"
                      count={allOwnersCount}
                      on={ownerFilter === "all"}
                      onClick={() => onOwnerChange("all")}
                    />
                    {owners.map((o) => (
                      <OwnerRow
                        key={o.id}
                        ini={o.initials}
                        label={o.name}
                        count={o.count}
                        on={ownerFilter === o.id}
                        onClick={() => onOwnerChange(o.id)}
                      />
                    ))}
                  </div>
                </>
              ) : null}

              {/* Footer */}
              <div style={{ display: "flex", gap: 9, marginTop: 16 }}>
                <button
                  type="button"
                  onClick={reset}
                  style={{
                    flex: "0 0 auto",
                    height: 40,
                    padding: "0 15px",
                    borderRadius: 11,
                    border: "1px solid var(--ls-border)",
                    background: "transparent",
                    color: "var(--ls-text-muted)",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "DM Sans, sans-serif",
                  }}
                >
                  Réinitialiser
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  style={{
                    flex: 1,
                    height: 40,
                    borderRadius: 11,
                    border: "none",
                    background: "linear-gradient(92deg,var(--ls-teal),var(--ls-purple))",
                    color: "#fff",
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "DM Sans, sans-serif",
                  }}
                >
                  Voir les résultats
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function OwnerRow({
  ini,
  label,
  count,
  on,
  onClick,
}: {
  ini: string;
  label: string;
  count: number;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        padding: "7px 8px",
        borderRadius: 10,
        border: "none",
        textAlign: "left",
        background: on ? "color-mix(in srgb, var(--ls-teal) 9%, transparent)" : "transparent",
        color: "var(--ls-text)",
        cursor: "pointer",
        fontFamily: "DM Sans, sans-serif",
      }}
    >
      <span
        style={{
          flex: "0 0 auto",
          width: 26,
          height: 26,
          borderRadius: "50%",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10.5,
          fontWeight: 700,
          fontFamily: "Syne, sans-serif",
          color: "#fff",
          background: "linear-gradient(135deg,var(--ls-teal),var(--ls-purple))",
        }}
      >
        {ini}
      </span>
      <span style={{ fontSize: 13.5, fontWeight: 500, flex: 1 }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ls-text-muted)" }}>{count}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ls-teal)", opacity: on ? 1 : 0 }}>✓</span>
    </button>
  );
}
