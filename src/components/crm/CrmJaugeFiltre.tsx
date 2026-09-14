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
//
// ── 14/09/2026 — UNE BANDE, PAS DEUX ZONES ───────────────────────────────────
// « Beaucoup trop dense » : un libellé « L'entonnoir — tape pour filtrer »,
// quatre grosses cartes, puis une bande violette pour les rendez-vous. Deux
// zones empilées avant la recherche. Elles tiennent désormais sur UNE bande :
// les quatre cases (toujours des filtres, même comptage), « X en cours », et
// au bout ce que le parent y met — la ligne des rendez-vous.
//
// « Hors flux » quitte la bande : il décrit l'Historique et les Endormis, qui
// vivent maintenant dans le tiroir « Filtres ». Il y est rendu par `HorsFlux`,
// à côté de leurs onglets. Rien n'est retiré.
// =============================================================================

import type { ReactNode } from "react";
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
  /** Rendu au bout de la bande (la ligne des rendez-vous). */
  children?: ReactNode;
}

const TEINTE: Record<CaseActive, string> = {
  nouveau: "var(--ls-lime)",
  contacte: "var(--ls-teal)",
  relance: "var(--ls-coral)",
  rdv: "var(--ls-purple)",
};

export function CrmJaugeFiltre({ comptes, filtre, onFiltrer, children }: Props) {
  const enCours = totalEnCours(comptes);

  return (
    <section aria-label="L'entonnoir — tape une étape pour filtrer" className="crm-bande">
      <style>{CSS}</style>
      {CASES_ACTIVES.map((c) => {
        const actif = filtre === c;
        return (
          <button
            key={c}
            type="button"
            className="crm-case"
            aria-pressed={actif}
            title={actif ? "Retape pour revoir tout le monde" : `Ne voir que « ${LIBELLE_CASE[c]} »`}
            onClick={() => onFiltrer(actif ? null : c)}
            // Seule la COULEUR passe en ligne : elle varie par case et ne
            // touche pas la disposition, que les media queries gardent.
            style={{ color: TEINTE[c] }}
          >
            <span className="crm-case-pt" aria-hidden="true" />
            <span className="crm-case-n">{comptes[c]}</span>
            <span className="crm-case-lib">{LIBELLE_CASE[c]}</span>
          </button>
        );
      })}
      <span className="crm-bande-encours">{enCours} en cours</span>
      {children ? <div className="crm-bande-fin">{children}</div> : null}
    </section>
  );
}

/** « Hors flux : X convertis · Y perdus · Z endormis » — la vérité du compte,
 *  pour que la somme visible corresponde à la base. Rendu dans le tiroir
 *  « Filtres », à côté des onglets Historique et Endormis qu'il décrit. */
export function HorsFlux({ comptes }: { comptes: ComptesParCase }) {
  if (comptes.converti === 0 && comptes.perdu === 0 && comptes.endormi === 0) return null;
  return (
    <p style={horsFlux}>
      Hors flux : {comptes.converti} converti{comptes.converti > 1 ? "s" : ""} ·{" "}
      {comptes.perdu} perdu{comptes.perdu > 1 ? "s" : ""} ·{" "}
      {comptes.endormi} endormi{comptes.endormi > 1 ? "s" : ""}
    </p>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const CSS = `
.crm-bande{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:14px}
.crm-case{display:inline-flex;align-items:center;gap:7px;min-height:44px;padding:0 12px;border-radius:999px;border:1px solid var(--ls-border2);background:var(--ls-surface);cursor:pointer;font-family:"DM Sans",sans-serif;transition:background .15s ease,border-color .15s ease}
.crm-case:hover{border-color:currentColor}
.crm-case:focus-visible{outline:2px solid currentColor;outline-offset:2px}
.crm-case[aria-pressed="true"]{background:color-mix(in srgb,currentColor 9%,var(--ls-surface));border-color:currentColor}
.crm-case-pt{width:7px;height:7px;border-radius:50%;background:currentColor;flex:none}
.crm-case-n{font-family:Syne,sans-serif;font-weight:800;font-size:14px;color:var(--ls-text)}
.crm-case-lib{font-size:13px;color:var(--ls-text-muted);white-space:nowrap}
.crm-case[aria-pressed="true"] .crm-case-lib{color:var(--ls-text)}
.crm-bande-encours{margin:0 4px;font-family:var(--lb360-mono,'JetBrains Mono',monospace);font-size:11px;letter-spacing:.06em;color:var(--ls-text-hint);white-space:nowrap}
.crm-bande-fin{margin-left:auto;display:flex;min-width:0}
@media (min-width:768px){
  .crm-case{min-height:36px}
}
@media (max-width:767.98px){
  .crm-bande-encours{display:none}
  .crm-bande-fin{margin-left:0;width:100%}
}
`;

const horsFlux: React.CSSProperties = {
  margin: "10px 0 0 2px",
  fontFamily: "var(--lb360-mono, 'JetBrains Mono', monospace)",
  fontSize: 10.5,
  color: "var(--ls-text-hint)",
};
