// =============================================================================
// PvFiltersMenu — bouton « ⚙️ Filtres ▾ » + menu déroulant pour la page Suivi PV
// (chantier 2 refonte Suivi PV, 2026-06-13). Même dynamique / identité que la
// page Dossiers clients (ClientsFiltersMenu). Replie Statut PV + Responsable
// dans un seul menu, rendu en PORTAL (jamais coupé), badge « ·N » si actif.
// Tokens var(--ls-*) → theme-aware.
// =============================================================================

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface ResponsibleOption {
  id: string;
  name: string;
}

interface Props {
  statusFilter: string;
  onStatusChange: (s: string) => void;
  responsibleFilter: string;
  onResponsibleChange: (id: string) => void;
  responsibleOptions: ResponsibleOption[];
  showResponsable: boolean;
}

const STATUTS: { id: string; label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "ok", label: "OK" },
  { id: "relaunch", label: "À relancer" },
  { id: "overdue", label: "En retard" },
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

export function PvFiltersMenu({
  statusFilter,
  onStatusChange,
  responsibleFilter,
  onResponsibleChange,
  responsibleOptions,
  showResponsable,
}: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const activeCount = (statusFilter !== "all" ? 1 : 0) + (responsibleFilter !== "all" ? 1 : 0);

  const place = useCallback(() => {
    const b = btnRef.current?.getBoundingClientRect();
    if (!b) return;
    setPos({ top: b.bottom + 9, right: Math.max(8, window.innerWidth - b.right) });
  }, []);
  useLayoutEffect(() => { if (open) place(); }, [open, place]);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onMove = () => setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open]);

  const reset = () => { onStatusChange("all"); onResponsibleChange("all"); };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          height: 44, display: "inline-flex", alignItems: "center", gap: 7, padding: "0 14px",
          borderRadius: 12, border: open ? "1px solid var(--ls-teal)" : "1px solid var(--ls-border)",
          background: "var(--ls-surface)", color: "var(--ls-text)", fontSize: 13.5, fontWeight: 600,
          fontFamily: "DM Sans, sans-serif", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
          boxShadow: open ? "0 0 0 2px color-mix(in srgb, var(--ls-teal) 30%, transparent)" : "none",
        }}
      >
        <span aria-hidden>⚙️</span>
        <span>Filtres</span>
        {activeCount > 0 ? (
          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 18, height: 18, padding: "0 5px", borderRadius: 999, background: "linear-gradient(92deg,var(--ls-teal),var(--ls-purple))", color: "#fff", fontSize: 11, fontWeight: 700 }}>
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
                position: "fixed", top: pos.top, right: pos.right, width: 320, maxWidth: "84vw",
                maxHeight: "80vh", overflowY: "auto", background: "var(--ls-surface)",
                border: "1px solid var(--ls-border2, var(--ls-border))", borderRadius: 18,
                boxShadow: "0 24px 60px rgba(0,0,0,0.35)", padding: 16, zIndex: 9999,
              }}
            >
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
                        padding: "7px 12px", borderRadius: 999,
                        border: on ? "1px solid color-mix(in srgb, var(--ls-purple) 55%, transparent)" : "1px solid var(--ls-border)",
                        background: on ? "color-mix(in srgb, var(--ls-purple) 14%, transparent)" : "var(--ls-surface2)",
                        color: on ? "var(--ls-text)" : "var(--ls-text-muted)",
                        fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "DM Sans, sans-serif",
                      }}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>

              {/* Responsable (admin) */}
              {showResponsable && responsibleOptions.length > 0 ? (
                <>
                  <div style={{ height: 1, background: "var(--ls-border)", margin: "13px 0" }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 7, margin: "2px 2px 8px" }}>
                    <span style={{ ...SECTION_LABEL, margin: 0 }}>Responsable</span>
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: "var(--ls-purple)", background: "color-mix(in srgb, var(--ls-purple) 14%, transparent)", padding: "2px 7px", borderRadius: 999 }}>Admin</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <OwnerRow label="Tous les portefeuilles" on={responsibleFilter === "all"} onClick={() => onResponsibleChange("all")} />
                    {responsibleOptions.map((o) => (
                      <OwnerRow key={o.id} label={o.name} on={responsibleFilter === o.id} onClick={() => onResponsibleChange(o.id)} />
                    ))}
                  </div>
                </>
              ) : null}

              {/* Footer */}
              <div style={{ display: "flex", gap: 9, marginTop: 16 }}>
                <button type="button" onClick={reset} style={{ flex: "0 0 auto", height: 40, padding: "0 15px", borderRadius: 11, border: "1px solid var(--ls-border)", background: "transparent", color: "var(--ls-text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>Réinitialiser</button>
                <button type="button" onClick={() => setOpen(false)} style={{ flex: 1, height: 40, borderRadius: 11, border: "none", background: "linear-gradient(92deg,var(--ls-teal),var(--ls-purple))", color: "#fff", fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>Voir les résultats</button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function OwnerRow({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 8px", borderRadius: 10,
        border: "none", textAlign: "left", background: on ? "color-mix(in srgb, var(--ls-teal) 9%, transparent)" : "transparent",
        color: "var(--ls-text)", cursor: "pointer", fontFamily: "DM Sans, sans-serif",
      }}
    >
      <span style={{ fontSize: 13.5, fontWeight: 500, flex: 1 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ls-teal)", opacity: on ? 1 : 0 }}>✓</span>
    </button>
  );
}
