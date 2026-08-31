// =============================================================================
// CrmJaugeFiltre — la jauge qui tient sa promesse.
//
// CE QU'ELLE REMPLACE (mesuré dans l'app le 28/08) : l'ancienne jauge annonçait
// « Contacté 18 » et se laissait taper. On tapait, et la liste rendait 7 lignes
// dont AUCUNE n'était contactée. Elle comptait un entonnoir CUMULÉ — chacun
// compté dans toutes les étapes franchies — pendant que la liste, elle, rangeait
// chaque personne à un seul endroit. Un chiffre cliquable qui ne sait pas
// montrer les gens qu'il compte est pire qu'un chiffre pas cliquable.
//
// Ici, les compteurs viennent de `compterParCase`, exactement la fonction avec
// laquelle la liste filtre. Elles ne peuvent plus se contredire : c'est garanti
// par un test, pas par la vigilance.
// =============================================================================

import {
  CASES_ACTIVES,
  LIBELLE_CASE,
  totalEnCours,
  type CaseActive,
  type ComptesParCase,
} from "../../features/crm/caseLead";

interface Props {
  comptes: ComptesParCase;
  /** La case filtrée, ou null quand on voit tout le monde. */
  filtre: CaseActive | null;
  onFiltrer: (c: CaseActive | null) => void;
}

const TEINTE: Record<CaseActive, string> = {
  nouveau: "var(--ls-lime)",
  contacte: "var(--ls-teal)",
  relance: "var(--ls-coral)",
  rdv: "var(--ls-purple)",
};

export function CrmJaugeFiltre({ comptes, filtre, onFiltrer }: Props) {
  const enCours = totalEnCours(comptes);

  return (
    <section aria-label="L'entonnoir" style={{ marginTop: 14 }}>
      <div style={enTete}>
        <span>L'entonnoir — tape pour filtrer</span>
        <span>{enCours} en cours</span>
      </div>

      <div style={puces}>
        {CASES_ACTIVES.map((c) => {
          const actif = filtre === c;
          return (
            <button
              key={c}
              type="button"
              aria-pressed={actif}
              onClick={() => onFiltrer(actif ? null : c)}
              style={{
                ...puce,
                color: TEINTE[c],
                borderColor: actif ? "currentColor" : "var(--ls-border)",
                background: actif
                  ? "color-mix(in srgb, currentColor 12%, var(--ls-surface))"
                  : "var(--ls-surface)",
              }}
            >
              <span style={nombre}>{comptes[c]}</span>
              <span style={mot}>{LIBELLE_CASE[c]}</span>
              <span style={{ ...barre, opacity: actif ? 1 : 0.45 }} />
            </button>
          );
        })}
      </div>

      {/* Ce qui est sorti du flux — pas des filtres, juste la vérité du compte,
          pour que la somme visible corresponde à la base. */}
      {(comptes.converti > 0 || comptes.perdu > 0 || comptes.endormi > 0) && (
        <p style={horsFlux}>
          Hors flux : {comptes.converti} converti{comptes.converti > 1 ? "s" : ""} ·{" "}
          {comptes.perdu} perdu{comptes.perdu > 1 ? "s" : ""} ·{" "}
          {comptes.endormi} endormi{comptes.endormi > 1 ? "s" : ""}
        </p>
      )}
    </section>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const enTete: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  fontFamily: "var(--lb360-mono, 'JetBrains Mono', monospace)",
  fontSize: 9.5,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--ls-text-hint)",
  marginBottom: 8,
};

const puces: React.CSSProperties = { display: "flex", gap: 7, flexWrap: "wrap" };

const puce: React.CSSProperties = {
  flex: "1 1 auto",
  minWidth: 88,
  minHeight: 44,
  textAlign: "left",
  padding: "9px 11px",
  borderRadius: 12,
  border: "1px solid var(--ls-border)",
  cursor: "pointer",
  fontFamily: "'DM Sans', sans-serif",
  transition: "background .15s ease, border-color .15s ease",
};

const nombre: React.CSSProperties = {
  display: "block",
  fontFamily: "Syne, sans-serif",
  fontWeight: 800,
  fontSize: 19,
  lineHeight: 1,
};

const mot: React.CSSProperties = {
  display: "block",
  marginTop: 3,
  fontSize: 11.5,
  color: "var(--ls-text-muted)",
  whiteSpace: "nowrap",
};

const barre: React.CSSProperties = {
  display: "block",
  height: 3,
  borderRadius: 999,
  background: "currentColor",
  marginTop: 7,
};

const horsFlux: React.CSSProperties = {
  margin: "9px 0 0 2px",
  fontFamily: "var(--lb360-mono, 'JetBrains Mono', monospace)",
  fontSize: 10.5,
  color: "var(--ls-text-hint)",
};
