// =============================================================================
// ceQuiCompte — la seule décision du nouveau Co-pilote.
//
// L'écran ne montre JAMAIS deux choses en haut. Toute la refonte tient à ça :
// s'il en montrait deux, on serait revenu à une liste, et une liste, Thomas
// n'en ouvrait plus une seule (mesuré : la file du Plan du jour contenait
// deux dormants, et rien d'autre, pendant que trois personnes attendaient).
//
// ── L'ORDRE, ET POURQUOI ────────────────────────────────────────────────────
//
//   1. UN RDV QUI APPROCHE      rien ne passe devant : c'est calé, quelqu'un
//                               se déplace, et l'heure ne se négocie pas.
//   2. UN CLIENT QUI ÉCRIT      il attend une réponse MAINTENANT. Aujourd'hui
//                               c'est un compteur dans l'inbox — invisible.
//   3. UN PAIEMENT REÇU         une victoire à saluer, et ça se périme : dire
//                               merci trois jours après, ça ne vaut plus rien.
//   4. LA PERSONNE EN TÊTE      celle qui attend depuis le plus longtemps
//                               (l'ordre vient de useFileDuJour).
//   5. LE DÉMARRAGE            pour qui n'a encore personne. Il passe APRÈS
//                               les vraies personnes : un humain qui attend
//                               vaut mieux qu'un tutoriel. Mais quand la file
//                               est vide, il PREND l'écran — il n'est pas un
//                               lien en haut qu'on ignore depuis des mois
//                               (10 coachs sur 11 gelés à l'étape 1).
//   6. RIEN                     et on le dit franchement.
//
// ── POURQUOI C'EST UNE FONCTION PURE ────────────────────────────────────────
//
// Aucun React, aucun fetch, aucune horloge implicite : `maintenant` est un
// paramètre. C'est ce qui permet de rejouer les vrais profils du 12/08 dans
// les tests, et de vérifier qu'un RDV de 9 h passe devant Matheo qui attend
// depuis 44 jours — ce qu'aucune relecture de code ne prouve.
// =============================================================================

import type { Attente } from "../../hooks/useFileDuJour";

/** Au-delà, un RDV n'est plus « ce qui compte maintenant » : c'est demain. */
export const FENETRE_RDV_MIN = 90;
/** Un RDV reste en tête un moment APRÈS l'heure : le client a du retard, ou
 *  il est déjà en face de toi. Aligné sur RDV_GRACE_PERIOD_MS (15 min). */
export const GRACE_RDV_MIN = 15;
/** Un merci n'a de sens que dans la foulée. */
export const FENETRE_PAIEMENT_H = 12;

export interface RdvEnVue {
  id: string;
  clientId: string;
  nom: string;
  type: string;
  heure: Date;
}

export interface MessageRecu {
  id: string;
  clientId: string;
  nom: string;
  texte: string;
  recuLe: string;
  /** Non lu, non résolu, non archivé — sinon il resterait collé en haut. */
  enAttente: boolean;
}

export interface PaiementRecu {
  id: string;
  nom: string;
  montantEur: number;
  payeLe: string;
}

export interface Demarrage {
  etape: number;
  total: number;
  titre: string;
  fini: boolean;
}

export type CeQuiCompte =
  | { quoi: "rdv"; heure: Date; dansMinutes: number; clientId: string; nom: string; type: string }
  | { quoi: "message"; messageId: string; clientId: string; nom: string; extrait: string; ilYaMinutes: number }
  | { quoi: "paiement"; commandeId: string; nom: string; montantEur: number; ilYaMinutes: number }
  | { quoi: "personne"; attente: Attente; reste: number }
  | { quoi: "demarrage"; etape: number; total: number; titre: string }
  | { quoi: "rien"; resteEquipe: number };

export interface Matiere {
  maintenant: Date;
  rdvs: RdvEnVue[];
  messages: MessageRecu[];
  paiements: PaiementRecu[];
  attentes: Attente[];
  demarrage?: Demarrage;
  /** Paiements déjà salués aujourd'hui — sinon le merci revient à chaque refresh. */
  paiementsSalues?: string[];
  /** Ce qui attend chez l'équipe : sert uniquement à l'écran « rien ». */
  resteEquipe?: number;
}

const MIN_MS = 60_000;

function minutesEntre(de: Date, a: Date): number {
  return Math.round((a.getTime() - de.getTime()) / MIN_MS);
}

/** Coupe proprement, sans laisser un mot à moitié ni un blanc avant les points. */
export function extrait(texte: string, max = 150): string {
  const propre = (texte ?? "").replace(/\s+/g, " ").trim();
  if (propre.length <= max) return propre;
  const coupe = propre.slice(0, max);
  const dernierEspace = coupe.lastIndexOf(" ");
  return `${(dernierEspace > max * 0.6 ? coupe.slice(0, dernierEspace) : coupe).trimEnd()}…`;
}

export function ceQuiCompte(m: Matiere): CeQuiCompte {
  const maintenant = m.maintenant;

  // 1. Un RDV qui approche — ou qui vient tout juste de commencer.
  const rdv = [...m.rdvs]
    .filter((r) => {
      const dans = minutesEntre(maintenant, r.heure);
      return dans <= FENETRE_RDV_MIN && dans >= -GRACE_RDV_MIN;
    })
    .sort((a, b) => a.heure.getTime() - b.heure.getTime())[0];
  if (rdv) {
    return {
      quoi: "rdv",
      heure: rdv.heure,
      dansMinutes: minutesEntre(maintenant, rdv.heure),
      clientId: rdv.clientId,
      nom: rdv.nom,
      type: rdv.type,
    };
  }

  // 2. Un client qui écrit. Le plus RÉCENT gagne : c'est celui qui a l'écran
  //    encore ouvert, donc celui qu'on peut encore rattraper.
  const message = m.messages
    .filter((x) => x.enAttente)
    .sort((a, b) => new Date(b.recuLe).getTime() - new Date(a.recuLe).getTime())[0];
  if (message) {
    return {
      quoi: "message",
      messageId: message.id,
      clientId: message.clientId,
      nom: message.nom,
      extrait: extrait(message.texte),
      ilYaMinutes: minutesEntre(new Date(message.recuLe), maintenant),
    };
  }

  // 3. Un paiement reçu, pas encore salué.
  const salues = new Set(m.paiementsSalues ?? []);
  const paiement = m.paiements
    .filter((p) => {
      if (salues.has(p.id)) return false;
      const h = minutesEntre(new Date(p.payeLe), maintenant) / 60;
      return h >= 0 && h <= FENETRE_PAIEMENT_H;
    })
    .sort((a, b) => new Date(b.payeLe).getTime() - new Date(a.payeLe).getTime())[0];
  if (paiement) {
    return {
      quoi: "paiement",
      commandeId: paiement.id,
      nom: paiement.nom,
      montantEur: paiement.montantEur,
      ilYaMinutes: minutesEntre(new Date(paiement.payeLe), maintenant),
    };
  }

  // 4. La personne en tête de file.
  if (m.attentes.length > 0) {
    return { quoi: "personne", attente: m.attentes[0], reste: m.attentes.length - 1 };
  }

  // 5. Le démarrage — seulement quand plus personne n'attend.
  if (m.demarrage && !m.demarrage.fini) {
    const d = m.demarrage;
    return { quoi: "demarrage", etape: d.etape, total: d.total, titre: d.titre };
  }

  // 6. Rien, et on le dit.
  return { quoi: "rien", resteEquipe: m.resteEquipe ?? 0 };
}
