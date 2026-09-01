// =============================================================================
// Qui tient ce club, et de qui on regarde la semaine.
//
// LE CONSTAT (audit du 01/09/2026) : le front ne savait pas que Thomas et
// Mélanie tiennent le MÊME club. `clubs.settings.discovery.coach_user_ids`
// existe en base, vaut bien leurs deux identifiants, et n'était lu NULLE PART
// dans `src/`. Conséquence : la seule façon de voir les rendez-vous de l'autre
// était « toute l'équipe » — les douze comptes actifs, dont neuf n'ont jamais
// rien fait. D'où une portée qui n'était jamais utilisée, et deux personnes qui
// travaillent au même endroit sans jamais voir la journée l'une de l'autre.
//
// Module pur : aucune requête, aucun rendu. C'est ce qui permet de verrouiller
// la règle par des tests plutôt que par un clic.
// =============================================================================

import type { ClubSettings } from "../../types/domain";

/** De qui on regarde la semaine.
 *  `"moi"` · `"club"` (tous les coachs du club) · un identifiant précis. */
export type Portee = "moi" | "club" | (string & {});

export interface CoachDuClub {
  id: string;
  /** Le prénom tel qu'on l'affiche sur la pastille — jamais un identifiant. */
  prenom: string;
}

/**
 * Les identifiants des coachs qui tiennent ce club, propriétaire compris.
 *
 * Le propriétaire est TOUJOURS dedans, même s'il ne figure pas dans le réglage :
 * un club sans son propriétaire n'existe pas, et l'oublier ferait disparaître
 * ses propres rendez-vous de sa propre vue « Le club ».
 */
export function idsCoachsDuClub(
  settings: ClubSettings | null | undefined,
  ownerUserId: string | null | undefined,
): string[] {
  const out: string[] = [];
  const vus = new Set<string>();
  const ajouter = (v: unknown) => {
    if (typeof v !== "string") return;
    const s = v.trim();
    if (!s || vus.has(s)) return;
    vus.add(s);
    out.push(s);
  };
  ajouter(ownerUserId);
  for (const x of settings?.discovery?.coach_user_ids ?? []) ajouter(x);
  return out;
}

/** Le prénom d'affichage : ce qu'on met sur la pastille d'un rendez-vous. */
export function prenomDe(nomComplet: string | null | undefined, repli = "Coach"): string {
  const n = (nomComplet ?? "").trim();
  if (!n) return repli;
  return n.split(/\s+/)[0];
}

/**
 * Les coachs du club, prêts à afficher — dans l'ordre du réglage, le
 * propriétaire d'abord.
 */
export function coachsDuClub(
  settings: ClubSettings | null | undefined,
  ownerUserId: string | null | undefined,
  noms: Map<string, string>,
): CoachDuClub[] {
  return idsCoachsDuClub(settings, ownerUserId).map((id) => ({
    id,
    prenom: prenomDe(noms.get(id)),
  }));
}

/**
 * Ce rendez-vous entre-t-il dans la portée choisie ?
 *
 * ⚠️ UN RENDEZ-VOUS SANS PROPRIÉTAIRE APPARTIENT AU CLUB, PAS À UNE PERSONNE.
 * Il n'apparaît donc ni sous « Moi » ni sous le nom de quelqu'un — seulement
 * sous « Le club ». Le faire tomber dans « Moi » revient à s'attribuer le
 * travail d'un autre ; le cacher partout le ferait disparaître. Mesuré le
 * 01/09 : 0 réservation sur 36 est dans ce cas, mais la règle doit tenir le
 * jour où quelqu'un réserve par un chemin qui n'attribue personne.
 */
export function dansLaPortee(
  portee: Portee,
  proprietaire: string | null | undefined,
  ctx: { moi: string | null | undefined; club: string[] },
): boolean {
  if (portee === "club") {
    if (!proprietaire) return true;
    return ctx.club.includes(proprietaire) || proprietaire === ctx.moi;
  }
  if (!proprietaire) return false;
  if (portee === "moi") return proprietaire === ctx.moi;
  return proprietaire === portee;
}

/**
 * La portée relue depuis le stockage du navigateur.
 *
 * ⚠️ Elle DOIT survivre à une navigation. Dans l'agenda classique, le même
 * réglage existait déjà et se faisait réécrire à « Moi » à chaque montage : on
 * pouvait donc choisir « Toute l'équipe », partir sur une fiche, revenir, et
 * retrouver sa vue perso sans avoir rien demandé. Personne ne s'en servait.
 *
 * Une valeur devenue invalide (coach parti du club, réglage bidouillé) retombe
 * sur « Le club » plutôt que sur « Moi » : mieux vaut montrer trop que faire
 * disparaître en silence les rendez-vous de quelqu'un.
 */
export function porteeValide(brut: string | null | undefined, idsClub: string[]): Portee {
  if (brut === "moi" || brut === "club") return brut;
  if (brut && idsClub.includes(brut)) return brut;
  return "club";
}
