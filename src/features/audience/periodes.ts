// =============================================================================
// periodes — le calcul derrière les quatre boutons Jour / Semaine / Mois /
// Total, et le « vs période d'avant ».
//
// Fonctions pures, `aujourdhui` en paramètre : c'est ce qui permet de vérifier
// qu'une comparaison à cheval sur un changement de mois ne raconte pas
// n'importe quoi.
//
// Choix assumé : des fenêtres GLISSANTES, pas calendaires. « Cette semaine »
// un lundi matin ne doit pas afficher un chiffre minuscule comparé à une
// semaine pleine — le graphique dirait « −85 % » chaque lundi. Sept jours
// contre les sept d'avant, c'est comparable tous les jours de l'année.
// =============================================================================

export type ClePeriode = "jour" | "semaine" | "mois" | "total";

export const PERIODES: Array<{ cle: ClePeriode; label: string; jours: number | null }> = [
  { cle: "jour", label: "Jour", jours: 1 },
  { cle: "semaine", label: "Semaine", jours: 7 },
  { cle: "mois", label: "Mois", jours: 30 },
  { cle: "total", label: "Total", jours: null },
];

/** Format `YYYY-MM-DD` en heure LOCALE. `toISOString()` bascule en UTC et
 *  décale d'un jour toute la soirée française — c'est le genre de bug qui
 *  fait « disparaître » les visites de 23 h. */
export function jourIso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export interface Fenetre {
  /** Premier jour inclus, ou `null` pour « depuis le début ». */
  debut: string | null;
  /** Fenêtre de même durée juste avant, pour le « vs période d'avant ».
   *  `null` quand la comparaison n'a pas de sens (Total). */
  precedent: { debut: string; fin: string } | null;
}

export function fenetreDe(cle: ClePeriode, aujourdhui: Date): Fenetre {
  const jours = PERIODES.find((p) => p.cle === cle)?.jours ?? null;
  if (jours === null) return { debut: null, precedent: null };

  const debut = new Date(aujourdhui);
  debut.setDate(debut.getDate() - (jours - 1));

  // La période d'avant se termine la VEILLE du début de la période courante :
  // sans ce −1, le jour pivot serait compté deux fois et gonflerait les deux.
  const finPrec = new Date(debut);
  finPrec.setDate(finPrec.getDate() - 1);
  const debutPrec = new Date(finPrec);
  debutPrec.setDate(debutPrec.getDate() - (jours - 1));

  return {
    debut: jourIso(debut),
    precedent: { debut: jourIso(debutPrec), fin: jourIso(finPrec) },
  };
}

/**
 * L'écart en pourcentage entre deux périodes.
 *
 * Rend `null` quand la période d'avant était à zéro : « +∞ % » ou « +100 % »
 * seraient tous les deux des mensonges. On préfère ne rien afficher.
 */
export function evolution(courant: number, precedent: number): number | null {
  if (precedent <= 0) return null;
  return Math.round(((courant - precedent) / precedent) * 100);
}

/** « 2:04 » — une durée en millisecondes, lisible. */
export function duree(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "0:00";
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
