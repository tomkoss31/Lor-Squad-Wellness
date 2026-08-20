// =============================================================================
// CrmJaugeEntonnoir — l'entonnoir en une ligne, et chaque segment filtre.
//
// Lot 3 du chantier CRM Board V2 (maquette Claude Design du 20/08) :
// « la jauge que tu aimes reste — chaque segment devient un filtre, les taux
// de passage restent visibles ».
//
// ── CE QUE LE POURCENTAGE DIT, ET CE QU'IL NE DIT PAS ─────────────────────
// ⚠️ IL N'EXISTE AUCUN HISTORIQUE DES CHANGEMENTS D'ÉTAPE dans la base :
// vérifié le 20/08, ni table d'événements, ni colonne de transition — on n'a
// que `created_at` et `contacted_at`. Un « taux de passage sur 30 jours
// glissants » au sens strict (combien de ceux entrés en Nouveau sont passés en
// Contacté) est donc IMPOSSIBLE à calculer aujourd'hui. L'afficher quand même
// serait un chiffre inventé, et un chiffre inventé dans un tableau de bord est
// pire que pas de chiffre.
//
// Ce qui est affiché est un INSTANTANÉ, honnête et calculable : parmi les gens
// qui ont atteint au moins cette étape, la part qui a atteint au moins la
// suivante. C'est la lecture classique d'un entonnoir en photo. Le libellé le
// dit (« sont allés plus loin »), et l'infobulle l'explique en toutes lettres.
//
// `lost` est EXCLU du calcul : on ne sait pas à quelle étape la personne a été
// perdue, donc la compter quelque part fausserait tous les segments. Elle
// apparaît à part.
//
// ── POURQUOI « À RELANCER » N'EST PAS UN SEGMENT DE PROGRESSION ───────────
// La maquette l'aligne avec les autres, mais dans le code ce n'est pas une
// étape : c'est `relanceDue`, un dérivé qui peut frapper n'importe quelle
// colonne. Le poser entre « Contacté » et « RDV calé » ferait croire à un
// passage obligé. Il est donc rendu APRÈS, comme signal — cliquable lui aussi.
// =============================================================================

import type { CrmLead, CrmStatus } from "../../hooks/useCrmLeads";

/** Les étapes qui se suivent VRAIMENT, dans l'ordre. */
const ETAPES: Array<{ cle: CrmStatus; label: string }> = [
  { cle: "new", label: "Nouveaux" },
  { cle: "contacted", label: "Contactés" },
  { cle: "qualified", label: "RDV calé" },
  { cle: "converted", label: "Convertis" },
];

/** Le rang d'une étape. `lost` n'en a pas — il est hors progression. */
const RANG: Partial<Record<CrmStatus, number>> = { new: 0, contacted: 1, qualified: 2, converted: 3 };

export interface JaugeFiltre {
  /** L'étape sur laquelle le board est filtré, ou null. */
  etape: CrmStatus | null;
  /** Filtre « à relancer » (dérivé, orthogonal aux étapes). */
  relance: boolean;
}

interface Props {
  leads: CrmLead[];
  filtre: JaugeFiltre;
  onFiltrer: (f: JaugeFiltre) => void;
}

const segment: React.CSSProperties = {
  flex: "1 1 110px",
  minWidth: 96,
  minHeight: 44,
  padding: "9px 11px",
  borderRadius: 12,
  background: "var(--ls-surface2)",
  border: "0.5px solid var(--ls-border)",
  cursor: "pointer",
  textAlign: "left",
  fontFamily: "DM Sans, sans-serif",
  color: "var(--ls-text)",
};

export function CrmJaugeEntonnoir({ leads, filtre, onFiltrer }: Props) {
  // On ne compte que les leads en progression : un perdu n'a pas d'étape
  // connue, un endormi est mis de côté exprès.
  const enJeu = leads.filter((l) => !l.dormant && l.status !== "lost");

  const atteint = (rangMin: number) =>
    enJeu.filter((l) => {
      const r = RANG[l.status];
      return r !== undefined && r >= rangMin;
    }).length;

  const perdus = leads.filter((l) => !l.dormant && l.status === "lost").length;
  const aRelancer = enJeu.filter((l) => l.relanceDue).length;

  return (
    <section aria-label="Entonnoir" style={{ margin: "14px 0 0" }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {ETAPES.map((e, i) => {
          const ici = enJeu.filter((l) => l.status === e.cle).length;
          const suivant = ETAPES[i + 1];
          // Part de ceux arrivés au moins ici qui sont allés au moins à l'étape
          // suivante. Sous 3 personnes on n'affiche rien : un pourcentage sur
          // deux cas ne veut rien dire et se lit pourtant comme une tendance.
          const base = atteint(i);
          const passes = suivant ? atteint(i + 1) : 0;
          const taux = suivant && base >= 3 ? Math.round((passes / base) * 100) : null;
          const actif = filtre.etape === e.cle;

          return (
            <button
              key={e.cle}
              type="button"
              aria-pressed={actif}
              onClick={() => onFiltrer({ etape: actif ? null : e.cle, relance: false })}
              style={{
                ...segment,
                background: actif ? "color-mix(in srgb, var(--ls-teal) 14%, var(--ls-surface2))" : segment.background,
                borderColor: actif ? "color-mix(in srgb, var(--ls-teal) 55%, transparent)" : "var(--ls-border)",
              }}
            >
              <div style={{ fontSize: 11.5, color: "var(--ls-text-muted)" }}>
                {e.label}
                {actif ? " ✕" : ""}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
                <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 20 }}>{ici}</span>
                {taux !== null ? (
                  <span
                    title={`Sur les ${base} qui ont atteint « ${e.label} », ${passes} sont allés au moins jusqu'à « ${suivant?.label} ». Photo à l'instant T — l'app ne garde pas l'historique des changements d'étape.`}
                    style={{ fontSize: 11.5, color: "var(--ls-text-muted)" }}
                  >
                    ↳ {taux}%
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      {/* Les deux signaux, à part : ils frappent n'importe quelle colonne et ne
          font pas partie de la progression. */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        <button
          type="button"
          aria-pressed={filtre.relance}
          onClick={() => onFiltrer({ etape: null, relance: !filtre.relance })}
          style={{
            ...segment,
            flex: "0 1 auto",
            background: filtre.relance
              ? "color-mix(in srgb, var(--ls-coral) 14%, var(--ls-surface2))"
              : segment.background,
            borderColor: filtre.relance
              ? "color-mix(in srgb, var(--ls-coral) 55%, transparent)"
              : "var(--ls-border)",
          }}
        >
          <div style={{ fontSize: 11.5, color: "var(--ls-text-muted)" }}>
            À relancer{filtre.relance ? " ✕" : ""}
          </div>
          <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 20 }}>{aRelancer}</span>
        </button>

        <div style={{ ...segment, flex: "0 1 auto", cursor: "default", opacity: 0.75 }}>
          <div style={{ fontSize: 11.5, color: "var(--ls-text-muted)" }}>Perdus</div>
          <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 20 }}>{perdus}</span>
        </div>
      </div>
    </section>
  );
}
