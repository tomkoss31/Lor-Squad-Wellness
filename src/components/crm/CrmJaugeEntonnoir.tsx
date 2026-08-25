// =============================================================================
// CrmJaugeEntonnoir — l'entonnoir en une ligne, et chaque segment filtre.
//
// Lot 3 du chantier CRM Board V2. RÉÉCRIT le 20/08 : la première version
// alignait des boîtes encadrées avec un chiffre dedans. La maquette fait tout
// autre chose, et c'est ce qui la rend lisible d'un coup d'œil.
//
// ── CE QUE LA MAQUETTE FAIT, MESURÉ ───────────────────────────────────────
// Chaque segment = un libellé 11.5px discret, un chiffre Syne 17px/800 À LA
// TEINTE DE L'ÉTAPE, et surtout UNE BARRE de 4 px (rayon 3) remplie de cette
// teinte. C'est la barre qui fait la jauge — sans elle, ce ne sont que des
// compteurs alignés. Entre deux segments, le taux « ↳ 71% » en 10.5px/700,
// posé DEHORS, dans la respiration.
//
// Le segment filtré prend un fond à 8 %, un liseré à 30 % et le rayon passe de
// 8 à 10 px. Les autres n'ont NI fond NI bordure : un cadre permanent sur cinq
// segments transforme une jauge en tableau.
//
// Teintes, traduites de la maquette vers les jetons de l'app (décision Thomas
// du 20/08 — structure de la maquette, couleurs de l'app) :
//   Nouveau lime · Contacté teal · À relancer coral · RDV violet ·
//   Converti ambre (la maquette met du doré, que l'app a purgé).
//
// ── CE QUE LE POURCENTAGE DIT, ET CE QU'IL NE DIT PAS ─────────────────────
// ⚠️ IL N'EXISTE AUCUN HISTORIQUE DES CHANGEMENTS D'ÉTAPE en base (vérifié le
// 20/08 : ni table d'événements, ni colonne de transition). Le « taux de
// passage sur 30 jours glissants » de la spec est donc INCALCULABLE. Ce qui
// est affiché est un instantané : parmi ceux arrivés au moins à cette étape,
// la part allée au moins à la suivante. L'infobulle l'écrit en toutes lettres.
//
// Et il n'y a PAS de taux autour d'« À relancer » : la maquette lui en donne
// un, mais ce n'est pas une étape de la chaîne — c'est `relanceDue`, un dérivé
// qui frappe n'importe quelle colonne. Un pourcentage y serait un nombre sans
// signification.
// =============================================================================

import type { CrmLead, CrmStatus } from "../../hooks/useCrmLeads";
import { etapeDuLead } from "../../features/crm/etapeLead";

type CleSegment = CrmStatus | "relance";

const SEGMENTS: Array<{ cle: CleSegment; label: string; teinte: string }> = [
  { cle: "new", label: "Nouveau", teinte: "var(--ls-lime)" },
  { cle: "contacted", label: "Contacté", teinte: "var(--ls-teal)" },
  { cle: "relance", label: "À relancer", teinte: "var(--ls-coral)" },
  { cle: "qualified", label: "RDV calé", teinte: "var(--ls-purple)" },
  { cle: "converted", label: "Converti", teinte: "var(--ls-amber)" },
];

/** Le rang d'une étape dans la chaîne. `relance` et `lost` n'en ont pas. */
const RANG: Partial<Record<string, number>> = { new: 0, contacted: 1, qualified: 2, converted: 3 };

export interface JaugeFiltre {
  etape: CrmStatus | null;
  relance: boolean;
}

interface Props {
  leads: CrmLead[];
  filtre: JaugeFiltre;
  onFiltrer: (f: JaugeFiltre) => void;
}

const CSS = `
.crm-jauge{display:flex;align-items:flex-end;gap:2px;flex-wrap:wrap}
.crm-jauge-seg{flex:1 1 120px;min-width:104px;min-height:35px;padding:6px 14px;
  border-radius:8px;background:transparent;border:1px solid transparent;
  cursor:pointer;text-align:left;font-family:"DM Sans",sans-serif;color:inherit}
.crm-jauge-taux{flex:0 0 auto;padding:0 2px 8px;font-size:10.5px;font-weight:700}
@media (max-width: 1023.98px){
  /* Au doigt il faut 44 px, et les taux intercalaires deviennent du bruit
     quand chaque segment fait 40 % de la largeur. */
  .crm-jauge-seg{min-height:44px !important;flex-basis:calc(50% - 4px) !important}
  .crm-jauge-taux{display:none}
}
`;

export function CrmJaugeEntonnoir({ leads, filtre, onFiltrer }: Props) {
  // Un perdu n'a pas d'étape connue, un endormi est mis de côté exprès.
  // ⚠️ 25/08 — on comptait `l.status`, une colonne écrite à la main qui reste
  // à « new » même quand la personne a réservé. Résultat à l'écran : « RDV
  // calé : 1 » alors que SIX personnes avaient un créneau confirmé à venir.
  // `etapeDuLead` est la MÊME règle que la vue Liste et le board.
  const enJeu = leads.filter((l) => !l.dormant && etapeDuLead(l) !== "lost");
  const atteint = (rangMin: number) =>
    enJeu.filter((l) => { const r = RANG[etapeDuLead(l)]; return r !== undefined && r >= rangMin; }).length;

  const compteur = (cle: CleSegment) =>
    cle === "relance"
      ? enJeu.filter((l) => l.relanceDue && etapeDuLead(l) !== "qualified").length
      : enJeu.filter((l) => etapeDuLead(l) === cle).length;

  const total = enJeu.length;
  const perdus = leads.filter((l) => !l.dormant && etapeDuLead(l) === "lost").length;

  /** Le taux affiché ENTRE deux segments, quand il veut dire quelque chose. */
  function tauxApres(cle: CleSegment): { valeur: number; base: number; passes: number; vers: string } | null {
    const r = RANG[cle];
    if (r === undefined || r >= 3) return null;      // « relance » et « converti » n'ont pas de suite
    const base = atteint(r);
    // Sous 3 personnes, un pourcentage se lit comme une tendance alors qu'il
    // n'en est pas une.
    if (base < 3) return null;
    const passes = atteint(r + 1);
    const vers = SEGMENTS.find((s) => RANG[s.cle] === r + 1)?.label ?? "";
    return { valeur: Math.round((passes / base) * 100), base, passes, vers };
  }

  return (
    <section aria-label="Entonnoir" style={{ margin: "14px 0 0", padding: "14px 16px", borderRadius: 16, background: "var(--ls-surface)", border: "1px solid var(--ls-border)" }}>
      <style>{CSS}</style>

      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <span style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ls-text-muted)" }}>
          l'entonnoir
        </span>
        <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 17, color: "var(--ls-text)" }}>{total}</span>
        <span style={{ fontSize: 11.5, color: "var(--ls-text-muted)" }}>
          en cours{perdus > 0 ? ` · ${perdus} perdu${perdus > 1 ? "s" : ""}` : ""}
        </span>
      </div>

      <div className="crm-jauge">
        {SEGMENTS.map((s, i) => {
          const actif = s.cle === "relance" ? filtre.relance : filtre.etape === s.cle;
          const n = compteur(s.cle);
          const taux = tauxApres(s.cle);
          const suivant = SEGMENTS[i + 1];
          return (
            <div key={s.cle} style={{ display: "contents" }}>
              <button
                type="button"
                className="crm-jauge-seg"
                aria-pressed={actif}
                onClick={() =>
                  onFiltrer(
                    s.cle === "relance"
                      ? { etape: null, relance: !actif }
                      : { etape: actif ? null : (s.cle as CrmStatus), relance: false },
                  )
                }
                style={
                  actif
                    ? {
                        background: `color-mix(in srgb, ${s.teinte} 8%, transparent)`,
                        borderColor: `color-mix(in srgb, ${s.teinte} 30%, transparent)`,
                        borderRadius: 10,
                      }
                    : undefined
                }
              >
                <div style={{ fontSize: 11.5, color: "var(--ls-text-muted)" }}>
                  {s.label}
                  {actif ? " · filtré ✕" : ""}
                </div>
                <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 17, color: "var(--ls-text)", lineHeight: 1.2 }}>
                  {n}
                </div>
                {/* LA BARRE — c'est elle qui fait la jauge. Elle porte la
                    teinte ; le chiffre reste en encre pleine, parce qu'un
                    chiffre coloré sur nos surfaces ne tient pas le contraste
                    (la maquette se le permet sur un fond noir). */}
                <div
                  aria-hidden="true"
                  style={{
                    height: 4,
                    borderRadius: 3,
                    marginTop: 6,
                    background: n > 0 ? s.teinte : "var(--ls-border)",
                    opacity: n > 0 ? 1 : 0.6,
                  }}
                />
              </button>

              {taux && suivant ? (
                <span
                  className="crm-jauge-taux"
                  title={`Sur les ${taux.base} qui ont atteint « ${s.label} », ${taux.passes} sont allés au moins jusqu'à « ${taux.vers} ». Photo à l'instant T — l'app ne garde pas l'historique des changements d'étape.`}
                  style={{ color: "var(--ls-text-muted)" }}
                >
                  ↳ {taux.valeur}%
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
