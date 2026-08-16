// =============================================================================
// etapes — « Quoi faire, dans l'ordre » sur la fiche d'un lead.
//
// Le constat qui a déclenché ce module (Thomas, 16/08) : « le CRM trop
// compliqué […] moi je comprends, Mélanie moins, alors un coach nouveau c'est
// la quata ». La fiche montrait une douzaine de boutons, tous disponibles tout
// le temps, et aucun ne disait s'il fallait l'utiliser MAINTENANT.
//
// Ici on ne calcule pas un « statut » de plus : on calcule le PROCHAIN GESTE.
// Trois règles, et elles sont testées :
//
//   1. Une seule étape est « maintenant ». S'il y en a deux, c'est qu'on
//      redemande au coach de choisir — exactement ce qu'on essaie de retirer.
//   2. Aucune étape « faite » après une étape « à venir ». La colonne se lit de
//      haut en bas ; un passé qui réapparaît sous le futur ne se lit plus.
//   3. Jamais de genre deviné. On dit « Claire a pris rendez-vous », pas
//      « Elle a pris rendez-vous » : le prénom ne dit pas le genre, et se
//      tromper sur une vraie personne coûte plus cher qu'une phrase neutre.
//
// Fonctions pures, `maintenant` en paramètre — même contrat que echeances.ts.
// =============================================================================

import { REPONSE_PAR_CLE, quandRevient, type CleReponse } from "./qualification";

export type EtatEtape = "faite" | "maintenant" | "aVenir";

export interface Etape {
  cle: string;
  titre: string;
  detail: string;
  etat: EtatEtape;
}

/**
 * Où en est le rendez-vous de cette personne. Trois états, jamais deux à la
 * fois — c'est de là que vient le « un seul jeu de boutons » de la fiche.
 */
export type EtatRdv = "aVenir" | "passe" | "aucun";

/**
 * L'état du créneau à un instant donné.
 *
 * Le cas « passé » n'est pas un détail : la fiche annonçait « il est déjà dans
 * ton agenda » pour un rendez-vous vieux de deux mois, et proposait d'aller
 * l'y voir.
 */
export function etatRdvDe(
  rdv: { slotStart: string } | null | undefined,
  maintenant: Date,
): EtatRdv {
  if (!rdv) return "aucun";
  const t = new Date(rdv.slotStart).getTime();
  if (Number.isNaN(t)) return "aucun";
  return t >= maintenant.getTime() ? "aVenir" : "passe";
}

/** Le sous-ensemble de `CrmLead` dont dépendent les étapes. Structurel exprès. */
export interface LeadEtapes {
  prenom: string;
  status: "new" | "contacted" | "qualified" | "converted" | "lost";
  contactedAt: string | null;
  derniereReponse: CleReponse | null;
  relanceDueAt: string | null;
  /** Où en est son créneau — réservé en ligne, ou posé par le coach. */
  rdv: EtatRdv;
  /** A laissé ses coordonnées puis quitté la page avant le calendrier. */
  abandonAvantCreneau: boolean;
  /** Ce lead peut devenir une fiche client depuis le CRM (bilan en ligne). */
  peutConvertir: boolean;
  /** Mis de côté : plus aucune relance, donc plus aucun geste à proposer. */
  dormant: boolean;
}

/** A-t-on déjà eu un échange avec cette personne ? */
function dejaContacte(l: LeadEtapes): boolean {
  return Boolean(l.contactedAt) || l.derniereReponse !== null || l.status !== "new";
}

/** Une relance est-elle posée dans le futur ? */
function relanceEnAttente(l: LeadEtapes, maintenant: Date): boolean {
  if (!l.relanceDueAt) return false;
  const t = new Date(l.relanceDueAt).getTime();
  return !Number.isNaN(t) && t > maintenant.getTime();
}

/** Une relance est-elle arrivée à échéance, ou passée ? */
function relanceEchue(l: LeadEtapes, maintenant: Date): boolean {
  if (!l.relanceDueAt) return false;
  const t = new Date(l.relanceDueAt).getTime();
  return !Number.isNaN(t) && t <= maintenant.getTime();
}

/** Une étape avant d'avoir son état — l'état se déduit de l'ordre, pas de la ligne. */
type Brouillon = Omit<Etape, "etat"> & { faite: boolean };

/**
 * Les étapes du lead, dans l'ordre, avec exactement une étape « maintenant ».
 *
 * Renvoie un tableau vide quand il n'y a plus rien à faire ici : converti,
 * perdu, ou mis de côté. Une colonne de conseils sur un dossier refermé ne
 * conseille rien, elle occupe de la place.
 */
export function etapesDuLead(l: LeadEtapes, maintenant: Date): Etape[] {
  if (l.status === "converted" || l.status === "lost" || l.dormant) return [];

  const p = l.prenom.trim() || "cette personne";
  const contacte = dejaContacte(l);
  const brouillons: Brouillon[] = [];

  if (l.rdv === "passe") {
    // ── Parcours « le rendez-vous a eu lieu » ─────────────────────────────
    // Ni l'un ni l'autre des deux écrans de la maquette : ce lead n'attend
    // plus un créneau, il attend une conclusion. Lui proposer d'en caler un
    // deuxième, ou de « confirmer » celui d'hier, n'a aucun sens.
    brouillons.push({
      cle: "rdv-passe",
      titre: `Le rendez-vous de ${p} est passé`,
      detail: "Le créneau est derrière vous — il n'y a plus rien à caler ici.",
      faite: true,
    });
    brouillons.push({
      cle: "dire",
      titre: "Dis ce qui s'est passé",
      detail:
        "Venu·e ? Pas venu·e ? Le bouton « Et alors ? » range la fiche et pose la date de retour — sans ça, la fiche reste en travers de ta liste.",
      faite: l.derniereReponse !== null,
    });
    brouillons.push({
      cle: "conclure",
      titre: "Crée sa fiche client",
      detail: l.peutConvertir
        ? "« Valider le bilan → créer la fiche client ». Ce lead quitte le CRM et rejoint tes dossiers clients."
        : "Depuis l'agenda ou les dossiers clients, une fois le bilan fait.",
      faite: false,
    });
  } else if (l.rdv === "aVenir") {
    // ── Parcours « le créneau existe déjà » ───────────────────────────────
    // Le piège qu'on répare : la fiche proposait « Caler un RDV » à quelqu'un
    // qui venait d'en réserver un. Un clic, et le coach se retrouvait avec
    // deux rendez-vous dans son agenda.
    brouillons.push({
      cle: "rdv-existe",
      titre: `${p} a un rendez-vous`,
      detail: "Le créneau est déjà pris — tu n'as rien à caler.",
      faite: true,
    });
    brouillons.push({
      cle: "appel-confirmation",
      titre: `Appelle ${p} avant le rendez-vous`,
      detail: "Un appel court : tu confirmes le créneau et tu mets une voix sur le nom.",
      faite: contacte,
    });
    brouillons.push({
      cle: "dire",
      titre: "Dis ce qui s'est passé",
      detail:
        "Le bouton « Et alors ? ». Tu choisis une réponse, la date de rappel se pose toute seule — tu n'écris aucune date.",
      faite: l.derniereReponse !== null,
    });
    brouillons.push({
      cle: "jour-j",
      titre: "Le jour du rendez-vous : son bilan",
      detail: l.peutConvertir
        ? "Tu fais le body scan, puis « Valider le bilan → créer la fiche client ». Ce lead quitte le CRM et rejoint tes dossiers clients."
        : "Tu fais le body scan et tu crées sa fiche client depuis l'agenda.",
      faite: false,
    });
  } else {
    // ── Parcours « pas encore de créneau » ────────────────────────────────
    // Une relance échue rouvre l'étape d'appel au lieu d'être barrée : c'est
    // très exactement la ligne qui vient de remonter dans « Aujourd'hui », et
    // le geste attendu est de décrocher — pas de « poser le rendez-vous ».
    const aRappelerMaintenant = contacte && relanceEchue(l, maintenant);
    const resumePasse = l.derniereReponse ? REPONSE_PAR_CLE[l.derniereReponse].resume : null;
    brouillons.push({
      cle: "appel",
      titre: aRappelerMaintenant ? `Rappelle ${p} — c'était prévu aujourd'hui` : `Appelle ${p}`,
      detail: aRappelerMaintenant
        ? resumePasse
          ? `La dernière fois : « ${resumePasse} ». Le délai est passé, sa ligne est remontée toute seule.`
          : "Le délai que tu avais posé est passé — sa ligne est remontée toute seule."
        : l.abandonAvantCreneau
          ? `${p} a laissé son numéro sur le site puis a quitté la page avant le calendrier. C'est le signal le plus fort du CRM : l'envie était là.`
          : "Le plus tôt possible — l'envie retombe vite.",
      faite: contacte && !aRappelerMaintenant,
    });

    // Une relance calée n'est pas une étape de plus : c'est l'étape en cours.
    // Sans elle, la colonne dirait « Pose le rendez-vous » à quelqu'un qui a
    // demandé qu'on le rappelle jeudi.
    if (contacte && relanceEnAttente(l, maintenant)) {
      brouillons.push({
        cle: "attendre",
        titre: `Rappelle ${p} ${quandRevient(l.relanceDueAt, maintenant)}`,
        detail: resumePasse
          ? `C'est ce que tu as répondu la dernière fois : « ${resumePasse} ». Sa ligne remontera toute seule dans « Aujourd'hui » ce jour-là.`
          : "Sa ligne remontera toute seule dans « Aujourd'hui » ce jour-là.",
        faite: false,
      });
    }

    brouillons.push({
      cle: "poser",
      titre: "Pose le rendez-vous pendant l'appel",
      detail: `« Poser le rendez-vous » ouvre ton agenda : tu choisis le créneau avec ${p}, au téléphone. C'est ce bouton-là qui crée un rendez-vous.`,
      faite: false,
    });
    brouillons.push({
      cle: "dire",
      titre: "Dis ce qui s'est passé",
      detail:
        "Même si personne n'a décroché — surtout dans ce cas. Sans ça, aucune date de retour n'est posée et la ligne finit par sortir de ta vue.",
      faite: l.derniereReponse !== null,
    });
  }

  return ordonner(brouillons);
}

/**
 * Transforme les prédicats en états lisibles : tout ce qui est fait reste fait,
 * la PREMIÈRE chose non faite devient « maintenant », le reste attend.
 *
 * C'est ici qu'on garantit l'invariant « une seule étape en cours ». Le calculer
 * ligne par ligne, comme le faisait la maquette à la main, laissait passer deux
 * badges « à faire » sur le même écran.
 */
function ordonner(brouillons: Brouillon[]): Etape[] {
  let enCoursPosee = false;
  return brouillons.map(({ faite, ...reste }) => {
    if (faite && !enCoursPosee) return { ...reste, etat: "faite" as const };
    if (!enCoursPosee) {
      enCoursPosee = true;
      return { ...reste, etat: "maintenant" as const };
    }
    return { ...reste, etat: "aVenir" as const };
  });
}

/** Le geste du moment, ou `null` quand le dossier est refermé. */
export function etapeEnCours(l: LeadEtapes, maintenant: Date): Etape | null {
  return etapesDuLead(l, maintenant).find((e) => e.etat === "maintenant") ?? null;
}
