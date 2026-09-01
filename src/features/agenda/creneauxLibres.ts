// =============================================================================
// Des plages occupées → des créneaux proposables.
//
// LE PRINCIPE, POSÉ PAR THOMAS (01/09) : « les coachs voient bien les créneaux
// libres, les créneaux avec RDV, mais PAS l'info du lead ! »
//
// Le serveur ne rend donc QUE des couples [début, fin] (RPC `creneaux_occupes`,
// migration 20261215290000) : ni nom, ni motif, ni type. Ce module ne sait rien
// de plus, et c'est voulu — il ne PEUT pas divulguer ce qu'il n'a pas.
//
// Module pur : aucune requête, aucun rendu, aucune horloge implicite (l'instant
// est toujours passé en paramètre). C'est ce qui permet de verrouiller par des
// tests une règle où une erreur d'une minute fait réserver sur quelqu'un.
// =============================================================================

/** Une plage occupée, telle que la rend le serveur. */
export interface Plage {
  debut: Date;
  fin: Date;
}

export interface Creneau {
  debut: Date;
  fin: Date;
  libre: boolean;
}

export interface OptionsCreneaux {
  /** Le jour à découper. Seule sa date compte, pas son heure. */
  jour: Date;
  /** Heure d'ouverture et de fermeture, en minutes depuis minuit. */
  ouvertureMin: number;
  fermetureMin: number;
  /** Durée d'un créneau proposé, en minutes. */
  pasMin: number;
  /** Ce qui est déjà pris. */
  occupees: Plage[];
  /** Maintenant — un créneau passé n'est jamais proposable. */
  maintenant: Date;
}

/** `09:30` → 570. Rend `null` si ce n'est pas une heure. */
export function enMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mn = Number(m[2]);
  if (h > 23 || mn > 59) return null;
  return h * 60 + mn;
}

/** 570 → `09:30`. */
export function enHeure(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Deux plages se chevauchent-elles ?
 *
 * ⚠️ LES BORNES SONT OUVERTES À DROITE. Un rendez-vous de 14 h à 15 h ne
 * bloque PAS le créneau de 15 h : sinon chaque réservation en mangerait une
 * seconde, et une journée de six rendez-vous d'affilée deviendrait impossible
 * à remplir. C'est la convention de tous les agendas, et elle se casse
 * facilement en écrivant `<=` par réflexe.
 */
export function seChevauchent(a: Plage, b: Plage): boolean {
  return a.debut < b.fin && b.debut < a.fin;
}

/**
 * Découpe une journée en créneaux et dit lesquels sont libres.
 *
 * Un créneau est libre s'il ne chevauche AUCUNE plage occupée et s'il n'est pas
 * derrière nous. Le dernier créneau ne dépasse jamais l'heure de fermeture :
 * proposer 17 h 30 quand on ferme à 18 h pour des rendez-vous d'une heure
 * revient à promettre une demi-heure qui n'existe pas.
 */
export function creneauxDuJour(o: OptionsCreneaux): Creneau[] {
  const { jour, ouvertureMin, fermetureMin, pasMin, occupees, maintenant } = o;
  if (pasMin <= 0 || fermetureMin <= ouvertureMin) return [];

  const base = new Date(jour.getFullYear(), jour.getMonth(), jour.getDate());
  const out: Creneau[] = [];

  for (let m = ouvertureMin; m + pasMin <= fermetureMin; m += pasMin) {
    const debut = new Date(base.getTime() + m * 60_000);
    const fin = new Date(base.getTime() + (m + pasMin) * 60_000);
    const passe = debut.getTime() <= maintenant.getTime();
    const pris = occupees.some((p) => seChevauchent({ debut, fin }, p));
    out.push({ debut, fin, libre: !passe && !pris });
  }
  return out;
}

/** Combien de créneaux restent proposables — le chiffre sous chaque jour. */
export function compterLibres(creneaux: Creneau[]): number {
  return creneaux.filter((c) => c.libre).length;
}

/**
 * Le créneau demandé est-il encore proposable ?
 *
 * ⚠️ À REVÉRIFIER AVANT D'ÉCRIRE, pas seulement à l'affichage. Entre le moment
 * où l'écran dessine les créneaux et celui où l'on tape « Réserver », quelqu'un
 * a pu prendre la place — c'est précisément ce qui arrive quand deux coachs
 * regardent le même agenda, donc exactement la situation qu'on est en train de
 * créer. Une liste affichée est une photo, pas une réservation.
 */
export function encoreLibre(voulu: Plage, occupees: Plage[], maintenant: Date): boolean {
  if (voulu.debut.getTime() <= maintenant.getTime()) return false;
  return !occupees.some((p) => seChevauchent(voulu, p));
}
