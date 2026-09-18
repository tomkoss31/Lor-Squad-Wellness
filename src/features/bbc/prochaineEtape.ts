// =============================================================================
// « Prochaine étape » d'une membre — ce que le coach fait ENSUITE avec elle,
// dans l'ordre. Thomas (18/09) : « voir la prochaine étape de chacun, voir un
// check du bilan de la 10e visite, les inviter sur les appels ».
//
// Fonction PURE (testée) : la fiche membre (BbcCrm, volet « Prochaine étape »)
// l'affiche telle quelle, un bouton par ligne. Le bilan des 10 s'ouvre dès la
// 9e visite — on le prépare, on ne le subit pas.
// =============================================================================

import type { BbcMember } from "./useBbcMembers";
import { nextPalier } from "./useBbcHearts";

export type ActionEtape = "bilan" | "carte" | "coeurs" | "appels";

export interface EtapeMembre {
  cle: string;
  titre: string;
  detail: string;
  action: ActionEtape;
  /** La première chose à faire — un seul bouton plein par fiche. */
  fort?: boolean;
}

export function prochaineEtape(m: BbcMember): EtapeMembre[] {
  const out: EtapeMembre[] = [];
  const c = m.card;
  const carteVive = !!c && !c.expired;

  if (carteVive && c.used >= c.type) {
    out.push({ cle: "bilan", titre: `Faire son bilan des ${c.type}`, detail: "Le scan, les victoires hors balance, la carte suivante, les recos — la check-list en 9 points.", action: "bilan", fort: true });
  } else if (carteVive && c.used === c.type - 1) {
    out.push({ cle: "bilan_bientot", titre: `Préparer son bilan des ${c.type}`, detail: `À sa ${c.used}e visite : préviens-la, et ouvre déjà la check-list.`, action: "bilan", fort: true });
  }
  if (!carteVive) {
    out.push({ cle: "carte", titre: c?.expired ? "Renouveler sa carte" : "Lui donner une carte", detail: "Sans carte active, ses visites ne comptent vers aucun bilan.", action: "carte", fort: out.length === 0 });
  }
  if (m.pendingHearts > 0) {
    out.push({ cle: "recos", titre: `${m.pendingHearts} reco${m.pendingHearts > 1 ? "s" : ""} à valider`, detail: "Un cœur ne compte que si la personne a démarré.", action: "coeurs" });
  }
  const next = nextPalier(m.hearts);
  if (next !== null && next - m.hearts === 1) {
    out.push({ cle: "coeur", titre: `À 1 cœur du palier ${next}`, detail: "Lui demander une amie : « je lui offre sa première visite »." , action: "coeurs" });
  }
  out.push({ cle: "appels", titre: "L'inviter aux appels", detail: "Ambassadeur, Cœurs, Coach Académie — on réserve le créneau maintenant, pas « plus tard ».", action: "appels" });
  return out;
}
