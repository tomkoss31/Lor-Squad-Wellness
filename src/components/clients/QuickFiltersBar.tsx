// =============================================================================
// QuickFiltersBar — barre de chips de filtre rapide pour /clients (2026-04-29)
// =============================================================================
//
// Composant d affichage qui prend la liste des QUICK_FILTERS, calcule le
// compteur de chaque chip selon les clients/followUps en entree, et rend
// les boutons actifs/inactifs avec accent de couleur par tone.
//
// Pas de logique metier ici : tout est dans clientQuickFilters.ts. Ce
// composant est purement presentationnel + gere le clic.
// =============================================================================

import { useMemo } from "react";
import type { Client, FollowUp } from "../../types/domain";
import {
  QUICK_FILTERS,
  type QuickFilterId,
  countClientsForFilter,
  getQuickFilterToneColors,
} from "../../lib/clientQuickFilters";

interface QuickFiltersBarProps {
  /** Filtre actif courant. */
  activeFilter: QuickFilterId;
  /** Callback quand l user change de filtre. */
  onChange: (id: QuickFilterId) => void;
  /** Liste des clients sur laquelle calculer les compteurs. */
  clients: Client[];
  /** FollowUps pour evaluer les predicats RDV. */
  followUps: FollowUp[];
}

export function QuickFiltersBar({
  activeFilter,
  onChange,
  clients,
  followUps,
}: QuickFiltersBarProps) {
  const now = useMemo(() => new Date(), []);
  const ctx = useMemo(() => ({ followUps, now }), [followUps, now]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div
        style={{
          fontSize: 9,
          letterSpacing: "2px",
          textTransform: "uppercase",
          color: "var(--ls-text-hint)",
          fontWeight: 500,
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        Filtres rapides
      </div>
      <div
        role="tablist"
        aria-label="Filtres rapides clients"
        style={{
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
        }}
      >
        {QUICK_FILTERS.map((filter) => {
          const isActive = activeFilter === filter.id;
          const count = countClientsForFilter(filter.id, clients, ctx);
          const colors = getQuickFilterToneColors(filter.tone);
          const isHidden = filter.id !== "all" && count === 0;

          // On masque les filtres a 0 client (sauf "Tous") pour reduire le bruit.
          if (isHidden) return null;

          return (
            <button
              key={filter.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={`${filter.label} — ${filter.description}`}
              title={filter.description}
              onClick={() => onChange(filter.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 12px",
                borderRadius: 20,
                background: isActive ? colors.bg : "var(--ls-surface)",
                border: isActive ? `1px solid ${colors.border}` : "1px solid var(--ls-border)",
                color: isActive ? colors.text : "var(--ls-text-muted)",
                fontSize: 11,
                fontWeight: isActive ? 600 : 400,
                fontFamily: "DM Sans, sans-serif",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
                userSelect: "none",
              }}
            >
              <span style={{ fontSize: 13 }}>{filter.emoji}</span>
              <span>{filter.label}</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "1px 6px",
                  borderRadius: 10,
                  background: isActive
                    ? `color-mix(in srgb, ${colors.border} 18%, transparent)`
                    : "color-mix(in srgb, var(--ls-text-muted) 10%, transparent)",
                  color: isActive ? colors.text : "var(--ls-text-muted)",
                  minWidth: 16,
                  textAlign: "center",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
