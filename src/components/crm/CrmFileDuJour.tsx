// =============================================================================
// CrmFileDuJour — la file unique du téléphone (CRM Board V2, lot 6).
//
// Sur téléphone, pas de board : une seule colonne qui se lit de haut en bas,
// « commence en haut ». Le rangement est celui de `zones.ts` (`grouperParZone`)
// — le MÊME que la vue Liste desktop, pas un second qui divergerait — et chaque
// ligne porte sa phrase d'état (`phraseEtat`), pas un badge à décoder.
//
// ── CE QU'ELLE MONTRE, ET CE QU'ELLE TAIT ─────────────────────────────────
// Seulement les gestes du jour : à contacter, à relancer, RDV du jour. Les
// zones « cette semaine / plus tard » reviennent d'elles-mêmes — elles tiennent
// dans une seule phrase de pied, pas dans la file. Les refermés (convertis /
// perdus) n'y sont pas : ce n'est pas un historique.
//
// ── PAS DE DURÉE INVENTÉE ─────────────────────────────────────────────────
// « N gestes », jamais « ≈ 25 min » : rien en base ne dit combien de temps
// prend un appel (décision déjà tranchée dans CrmPage). Un chiffre faux sur
// lequel un coach cale sa matinée est pire que pas de chiffre.
// =============================================================================

import { useMemo } from "react";
import type { CrmLead } from "../../hooks/useCrmLeads";
import { computeLeadScore } from "../../lib/leadScoring";
import { etatRdvDe } from "../../features/crm/etapes";
import { grouperParZone, phraseEtat, ZONES, type CleZone } from "../../features/crm/zones";
import { nomAffiche } from "../../features/crm/nomPropre";

/** Un lead dont l'état de RDV est résolu — même cast que la vue Liste (CrmLead
 *  et LeadZone divergent sur `rdv`, on force celui d'`etatRdvDe`). */
type LeadDuJour = CrmLead & { rdv: ReturnType<typeof etatRdvDe> };

interface Props {
  leads: CrmLead[];
  maintenant: Date;
  onOuvrir: (lead: CrmLead) => void;
  onWhatsApp: (lead: CrmLead) => void;
  onAlors: (lead: CrmLead) => void;
  /** Le raccourci « Entonnoir › » — bascule vers le board (optionnel). */
  onEntonnoir?: () => void;
}

/** Un pictogramme par zone. `zones.ts` ne les porte pas (structurel). */
const EMOJI: Record<CleZone, string> = {
  jamais: "🌱", relancer: "🔴", rdv: "📅", semaine: "🗓️", plusTard: "💤", refermes: "✅",
};

/** Les zones qui demandent un geste AUJOURD'HUI, dans l'ordre de lecture. */
const ZONES_DU_JOUR: CleZone[] = ["jamais", "relancer", "rdv"];
/** Celles qui reviennent seules — résumées en pied, pas listées. */
const ZONES_PLUS_TARD: CleZone[] = ["semaine", "plusTard"];

const CSS = `
.crm-file{max-width:440px;margin:0 auto;padding:4px 2px 28px;font-family:"DM Sans",sans-serif;color:var(--ls-text)}
.crm-file-tete{font-family:Syne,sans-serif;font-weight:800;font-size:21px}
.crm-file-sous{font-size:11.5px;color:var(--ls-text-muted);margin:2px 0 14px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.crm-file-ent{background:transparent;border:0;color:var(--ls-teal);font-weight:800;font-size:11.5px;cursor:pointer;font-family:inherit;padding:0}
.crm-file-sec{font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--ls-text-muted);margin:16px 0 8px;font-weight:600}
.crm-file-ligne{display:flex;align-items:center;gap:10px;background:var(--ls-surface);border:1px solid var(--ls-border);border-left-width:3px;border-radius:12px;padding:11px 12px;margin-bottom:8px;width:100%;text-align:left;cursor:pointer;font-family:inherit;color:var(--ls-text)}
.crm-file-corps{min-width:0;flex:1}
.crm-file-nom{font-weight:700;font-size:13.5px}
.crm-file-ctx{font-size:11px;color:var(--ls-text-muted);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.crm-file-actions{margin-left:auto;display:flex;gap:6px;flex:none}
.crm-file-actions button{min-width:44px;min-height:44px;border-radius:10px;border:1px solid var(--ls-border);background:var(--ls-surface2);color:var(--ls-text);font-size:15px;cursor:pointer;font-family:inherit;font-weight:700}
.crm-file-actions .wa{background:var(--ls-wa,#25D366);color:var(--ls-wa-ink,#04210f);border:0}
.crm-file-actions .prep{min-width:auto;padding:0 12px;font-size:12px;background:color-mix(in srgb,var(--ls-teal) 16%,var(--ls-surface2));border-color:color-mix(in srgb,var(--ls-teal) 40%,transparent)}
.crm-file-pied{font-size:11.5px;color:var(--ls-text-muted);text-align:center;margin-top:16px;line-height:1.5}
.crm-file-vide{text-align:center;padding:40px 16px;color:var(--ls-text-muted)}
.crm-file-vide b{font-family:Syne,sans-serif;color:var(--ls-text);font-size:17px;display:block;margin-bottom:6px}
`;

export function CrmFileDuJour({ leads, maintenant, onOuvrir, onWhatsApp, onAlors, onEntonnoir }: Props) {
  // Même adaptateur que la vue Liste : chaque lead porte son état de RDV, c'est
  // lui qui décide « à relancer » vs « rien à caler ».
  const groupes = useMemo(() => {
    const avecRdv = leads.map((l) => ({ ...l, rdv: etatRdvDe(l.rdv, maintenant) }) as LeadDuJour);
    return grouperParZone(avecRdv, maintenant);
  }, [leads, maintenant]);

  const parZone = useMemo(() => {
    const m = new Map<CleZone, LeadDuJour[]>();
    for (const g of groupes) m.set(g.cle, g.leads);
    return m;
  }, [groupes]);

  const nbGestes = ZONES_DU_JOUR.reduce((n, z) => n + (parZone.get(z)?.length ?? 0), 0);
  const nbPlusTard = ZONES_PLUS_TARD.reduce((n, z) => n + (parZone.get(z)?.length ?? 0), 0);
  const meta = (cle: CleZone) => ZONES.find((z) => z.cle === cle)!;

  /** Les gestes d'une ligne, selon sa zone. */
  function actions(cle: CleZone, lead: LeadDuJour) {
    if (cle === "rdv") {
      return <button type="button" className="prep" onClick={(e) => { e.stopPropagation(); onOuvrir(lead); }}>Préparer</button>;
    }
    // jamais / relancer : joindre, ou consigner l'issue de l'appel.
    return (
      <>
        {lead.contactIsPhone ? (
          <button type="button" className="wa" aria-label={`WhatsApp ${lead.firstName}`} onClick={(e) => { e.stopPropagation(); onWhatsApp(lead); }}>📱</button>
        ) : null}
        <button type="button" aria-label={`Et alors ? ${lead.firstName}`} onClick={(e) => { e.stopPropagation(); onAlors(lead); }}>🎯</button>
      </>
    );
  }

  return (
    <div className="crm-file">
      <style>{CSS}</style>
      <div className="crm-file-tete">Aujourd'hui</div>
      <div className="crm-file-sous">
        {nbGestes > 0 ? <span>{nbGestes} geste{nbGestes > 1 ? "s" : ""} — commence en haut.</span> : <span>Aucun geste en attente.</span>}
        {onEntonnoir ? <button type="button" className="crm-file-ent" onClick={onEntonnoir}>Entonnoir ›</button> : null}
      </div>

      {nbGestes === 0 ? (
        <div className="crm-file-vide">
          <b>Boîte propre 👌</b>
          {nbPlusTard > 0 ? `${nbPlusTard} personne${nbPlusTard > 1 ? "s" : ""} reviendront d'elles-mêmes plus tard.` : "Rien en attente."}
        </div>
      ) : (
        ZONES_DU_JOUR.map((cle) => {
          const liste = parZone.get(cle) ?? [];
          if (liste.length === 0) return null;
          const m = meta(cle);
          return (
            <div key={cle}>
              <div className="crm-file-sec">{EMOJI[cle]} {m.titre} · {liste.length}</div>
              {liste.map((lead) => {
                const chaud = computeLeadScore(lead).temperature === "hot";
                return (
                  <button
                    key={lead.key}
                    type="button"
                    className="crm-file-ligne"
                    style={{ borderLeftColor: m.teinte }}
                    onClick={() => onOuvrir(lead)}
                  >
                    <div className="crm-file-corps">
                      <div className="crm-file-nom">{nomAffiche(lead.firstName, lead.lastName)} {chaud ? "🔥" : ""}</div>
                      <div className="crm-file-ctx">{phraseEtat(lead, maintenant)}</div>
                    </div>
                    <div className="crm-file-actions">{actions(cle, lead)}</div>
                  </button>
                );
              })}
            </div>
          );
        })
      )}

      {nbGestes > 0 && nbPlusTard > 0 ? (
        <div className="crm-file-pied">
          Puis {nbPlusTard} calée{nbPlusTard > 1 ? "s" : ""} plus tard — rien à faire maintenant 👌
        </div>
      ) : null}
    </div>
  );
}
