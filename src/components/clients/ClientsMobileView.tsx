// =============================================================================
// ClientsMobileView — Chantier refonte mobile Onde 2 (2026-05-20)
//
// Vue mobile-first du tab "Clients" de /clients basée sur le mockup
// Claude Design "La Base 360 - Mobile mockups" (page 3) validé Thomas.
//
// Sections (top → bottom) :
//   1. Tabs sticky (Clients / Leads / Témoignages) avec compteur
//   2. Search bar 44px + bouton filtres (avec count)
//   3. Mini-stats compactes (row scroll-x)
//   4. Liste cards clients : avatar coloré + nom + chip status + meta + chevron
//   5. Bottom sheet filtres ouvre sur tap bouton "Filtres"
//
// Sur desktop ≥ 1280px (xl), ce composant est masqué via xl:hidden.
// La vue desktop actuelle de ClientsPage continue de fonctionner.
//
// Pas de duplication de logique data : reçoit filteredClients depuis le
// parent ClientsPage qui calcule déjà les memo.
// =============================================================================

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Client, FollowUp, LifecycleStatus } from "../../types/domain";
import { FiltersBottomSheet, type FiltersSheetState } from "./FiltersBottomSheet";

interface ClientsMobileViewProps {
  activeTab: "clients" | "leads" | "temoignages";
  onTabChange: (tab: "clients" | "leads" | "temoignages") => void;
  clientsCount: number;
  leadsCount: number;
  testimonialsCount: number;
  filteredClients: Client[];
  pvByClient: Map<string, number>;
  visibleFollowUps: FollowUp[];
  search: string;
  onSearchChange: (s: string) => void;
  /** État courant des filtres pour affichage de count + bottom sheet. */
  filters: FiltersSheetState;
  onFiltersApply: (next: FiltersSheetState) => void;
  /** Total visibles après filtres (pour stats row). */
  totalVisible: number;
  /** Count clients dormants/à relancer dans la sélection. */
  relanceCount: number;
}

const STATUS_LABELS: Record<LifecycleStatus | "fragile" | "all", string> = {
  all: "Tous",
  not_started: "Pas démarré",
  active: "Actif",
  paused: "Pause",
  stopped: "Stoppé",
  lost: "Perdu",
  fragile: "Fragile",
};

const STATUS_COLORS: Record<LifecycleStatus | "fragile", { bg: string; fg: string }> = {
  active: { bg: "color-mix(in srgb, var(--ls-teal) 14%, transparent)", fg: "var(--ls-teal)" },
  paused: { bg: "color-mix(in srgb, var(--ls-gold) 14%, transparent)", fg: "var(--ls-gold)" },
  stopped: { bg: "color-mix(in srgb, var(--ls-coral) 14%, transparent)", fg: "var(--ls-coral)" },
  lost: { bg: "color-mix(in srgb, var(--ls-coral) 14%, transparent)", fg: "var(--ls-coral)" },
  not_started: { bg: "var(--ls-surface2)", fg: "var(--ls-text-muted)" },
  fragile: { bg: "color-mix(in srgb, var(--ls-coral) 14%, transparent)", fg: "var(--ls-coral)" },
};

function avatarColor(name: string): string {
  // Hash léger pour couleur stable par client
  const palette = ["#1f8a7b", "#b04e3f", "#3f6db0", "#9c7a2d", "#8a4ea0", "#6b6f76"];
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return palette[Math.abs(h) % palette.length];
}

function clientInitials(c: Client): string {
  return ((c.firstName?.[0] || "") + (c.lastName?.[0] || "")).toUpperCase() || "?";
}

function clientMeta(
  c: Client,
  pvByClient: Map<string, number>,
  visibleFollowUps: FollowUp[],
): string {
  const pv = pvByClient.get(c.id) ?? 0;
  const dueFollowUp = visibleFollowUps.find(
    (fu) => fu.clientId === c.id && fu.status === "pending",
  );
  if (pv > 0 && dueFollowUp) {
    return `${pv} PV ce mois · Suivi dû`;
  }
  if (pv > 0) return `${pv} PV ce mois`;
  if (dueFollowUp) return `Suivi dû · ${c.lifecycleStatus ?? "actif"}`;
  // Fallback : date du dernier bilan si disponible
  const latestAssessment = c.assessments?.[c.assessments.length - 1];
  if (latestAssessment) {
    try {
      const d = new Date(latestAssessment.date);
      const diffDays = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 1) return "Dernier bilan aujourd'hui";
      if (diffDays < 30) return `Dernier bilan J-${diffDays}`;
      return `Bilan il y a ${Math.floor(diffDays / 30)} mois`;
    } catch {
      // ignore
    }
  }
  return c.lifecycleStatus ? STATUS_LABELS[c.lifecycleStatus as LifecycleStatus] : "—";
}

export function ClientsMobileView({
  activeTab,
  onTabChange,
  clientsCount,
  leadsCount,
  testimonialsCount,
  filteredClients,
  pvByClient,
  visibleFollowUps,
  search,
  onSearchChange,
  filters,
  onFiltersApply,
  totalVisible,
  relanceCount,
}: ClientsMobileViewProps) {
  const navigate = useNavigate();
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Compte filtres actifs (pour le badge sur bouton Filtres)
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.statusFilter !== "all") count++;
    if (filters.quickFilter !== "all") count++;
    if (filters.ownerFilter && filters.ownerFilter !== "all") count++;
    return count;
  }, [filters]);

  return (
    <div className="xl:hidden lb-clients-mobile">
      {/* Tabs sticky */}
      <div className="lb-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "clients"}
          className={`lb-tab${activeTab === "clients" ? " active" : ""}`}
          onClick={() => onTabChange("clients")}
        >
          Clients
          <span className="count">{clientsCount}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "leads"}
          className={`lb-tab${activeTab === "leads" ? " active" : ""}`}
          onClick={() => onTabChange("leads")}
        >
          Leads
          <span className="count">{leadsCount}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "temoignages"}
          className={`lb-tab${activeTab === "temoignages" ? " active" : ""}`}
          onClick={() => onTabChange("temoignages")}
        >
          Témoignages
          <span className="count">{testimonialsCount}</span>
        </button>
      </div>

      {/* Tab Clients : search + stats + liste */}
      {activeTab === "clients" ? (
        <>
          {/* Search + filtres */}
          <div className="lb-search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ls-text-muted)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4-4" />
            </svg>
            <input
              type="search"
              placeholder="Nom, ville, programme…"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label="Rechercher un client"
            />
            <button
              type="button"
              className="filt-btn"
              onClick={() => setFiltersOpen(true)}
              aria-label={`Ouvrir les filtres${activeFiltersCount > 0 ? ` (${activeFiltersCount} actifs)` : ""}`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 5h18M6 12h12M10 19h4" />
              </svg>
              Filtres
              {activeFiltersCount > 0 ? (
                <span className="filt-count">{activeFiltersCount}</span>
              ) : null}
            </button>
          </div>

          {/* Mini-stats row */}
          <div className="lb-mini-stats">
            <div className="lb-mini">
              <span className="v">{totalVisible}</span>
              <span className="l">visibles</span>
            </div>
            {relanceCount > 0 ? (
              <div className="lb-mini accent-coral">
                <span className="v">{relanceCount}</span>
                <span className="l">relances</span>
              </div>
            ) : null}
            <div className="lb-mini">
              <span className="v">{clientsCount}</span>
              <span className="l">total</span>
            </div>
          </div>

          {/* Liste compacte */}
          {filteredClients.length === 0 ? (
            <div className="lb-empty">
              <p>Aucun client ne correspond à ta recherche.</p>
              <button type="button" onClick={() => onSearchChange("")} className="lb-btn-ghost">
                Réinitialiser la recherche
              </button>
            </div>
          ) : (
            <ul className="lb-client-list">
              {filteredClients.map((c) => {
                const meta = clientMeta(c, pvByClient, visibleFollowUps);
                const statusKey = (c.lifecycleStatus ?? "active") as LifecycleStatus;
                const colors = STATUS_COLORS[statusKey] ?? STATUS_COLORS.active;
                return (
                  <li key={c.id} className="lb-client">
                    <button
                      type="button"
                      onClick={() => navigate(`/clients/${c.id}`)}
                      className="lb-client-btn"
                    >
                      <span
                        className="av"
                        style={{ background: avatarColor(`${c.firstName} ${c.lastName}`) }}
                        aria-hidden="true"
                      >
                        {clientInitials(c)}
                      </span>
                      <span className="body">
                        <span className="row1">
                          <span className="name">{`${c.firstName} ${c.lastName}`.trim()}</span>
                          <span
                            className="lb-status"
                            style={{ background: colors.bg, color: colors.fg }}
                          >
                            {STATUS_LABELS[statusKey] ?? statusKey}
                          </span>
                        </span>
                        <span className="row2">{meta}</span>
                      </span>
                      <span className="chev" aria-hidden="true">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      ) : null}

      {/* Bottom sheet filtres */}
      <FiltersBottomSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        initial={filters}
        onApply={(next) => {
          onFiltersApply(next);
          setFiltersOpen(false);
        }}
        totalAfterApply={totalVisible}
      />
    </div>
  );
}
