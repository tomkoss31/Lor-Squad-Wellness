// =============================================================================
// FiltersBottomSheet — Chantier refonte mobile Onde 2 (2026-05-20)
//
// Bottom sheet pour filtres /clients sur mobile, basé sur le mockup
// "La Base 360 - Mobile mockups" (FiltersSheet) validé Thomas.
//
// - Slide depuis le bas, 280ms cubic-bezier
// - Drag handle en haut
// - 3 sections multi-select : Statut / Activité / Quick filter
// - Footer "Appliquer · X dossiers"
// - Fermeture : tap scrim, drag down (V2), ESC, bouton "Réinitialiser"
// =============================================================================

import { useEffect, useState } from "react";
import type { LifecycleStatus } from "../../types/domain";

export interface FiltersSheetState {
  statusFilter: LifecycleStatus | "fragile" | "all";
  quickFilter: string;
  ownerFilter: string;
}

interface FiltersBottomSheetProps {
  open: boolean;
  onClose: () => void;
  initial: FiltersSheetState;
  onApply: (next: FiltersSheetState) => void;
  totalAfterApply: number;
}

const STATUS_OPTIONS: Array<{ id: FiltersSheetState["statusFilter"]; label: string }> = [
  { id: "active", label: "Actif" },
  { id: "paused", label: "En pause" },
  { id: "stopped", label: "Stoppé" },
  { id: "lost", label: "Perdu" },
  { id: "fragile", label: "Fragile" },
];

const QUICK_OPTIONS: Array<{ id: string; label: string }> = [
  { id: "due-soon", label: "RDV cette semaine" },
  { id: "no-rdv", label: "Sans RDV programmé" },
  { id: "inactive-30d", label: "Inactifs > 30j" },
  { id: "vip", label: "VIP" },
  { id: "new", label: "Nouveau" },
];

export function FiltersBottomSheet({
  open,
  onClose,
  initial,
  onApply,
  totalAfterApply,
}: FiltersBottomSheetProps) {
  // État local interne (commit sur Apply)
  const [draft, setDraft] = useState<FiltersSheetState>(initial);

  // Sync draft quand initial change (ex : ouverture du sheet)
  useEffect(() => {
    if (open) setDraft(initial);
  }, [open, initial]);

  // ESC pour fermer
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleReset = () => {
    setDraft({ statusFilter: "all", quickFilter: "all", ownerFilter: "all" });
  };

  const toggleStatus = (id: FiltersSheetState["statusFilter"]) => {
    setDraft((d) => ({
      ...d,
      statusFilter: d.statusFilter === id ? "all" : id,
    }));
  };

  const toggleQuick = (id: string) => {
    setDraft((d) => ({
      ...d,
      quickFilter: d.quickFilter === id ? "all" : id,
    }));
  };

  if (!open) return null;

  return (
    <>
      <div className="lb-sheet-scrim" onClick={onClose} aria-hidden="true" />
      <div
        className="lb-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Filtres clients"
        style={{
          transform: open ? "translateY(0)" : "translateY(100%)",
          transition: "transform 280ms cubic-bezier(.2,.7,.2,1)",
        }}
      >
        <div className="lb-sheet-handle" aria-hidden="true" />
        <header className="lb-sheet-head">
          <h2 className="t">Filtres</h2>
          <button type="button" className="reset" onClick={handleReset}>
            Réinitialiser
          </button>
        </header>

        <div className="lb-sheet-body">
          <section className="lb-sheet-section">
            <div className="label">Statut</div>
            <div className="lb-filter-pills">
              {STATUS_OPTIONS.map((o) => {
                const on = draft.statusFilter === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    className={`lb-fp${on ? " on" : ""}`}
                    onClick={() => toggleStatus(o.id)}
                    aria-pressed={on}
                  >
                    {o.label}
                    {on ? <span className="x" aria-hidden="true">✓</span> : null}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="lb-sheet-section">
            <div className="label">Activité</div>
            <div className="lb-filter-pills">
              {QUICK_OPTIONS.map((o) => {
                const on = draft.quickFilter === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    className={`lb-fp${on ? " on" : ""}`}
                    onClick={() => toggleQuick(o.id)}
                    aria-pressed={on}
                  >
                    {o.label}
                    {on ? <span className="x" aria-hidden="true">✓</span> : null}
                  </button>
                );
              })}
            </div>
          </section>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 12px",
              borderRadius: 12,
              background: "var(--ls-surface2)",
              border: "1px dashed var(--ls-border)",
              fontFamily: "DM Sans, sans-serif",
              fontSize: 11.5,
              color: "var(--ls-text-muted)",
            }}
          >
            <span aria-hidden="true">💡</span>
            <span>
              La recherche par responsable se gère côté <strong>Mon équipe</strong>.
            </span>
          </div>
        </div>

        <footer className="lb-sheet-foot">
          <button
            type="button"
            className="lb-sheet-apply"
            onClick={() => onApply(draft)}
          >
            Appliquer · {totalAfterApply} dossier{totalAfterApply > 1 ? "s" : ""}
          </button>
        </footer>
      </div>
    </>
  );
}
