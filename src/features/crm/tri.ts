// =============================================================================
// tri — l'ordre de la liste du CRM. Un seul endroit, et il est BRANCHÉ.
//
// LE CONSTAT (revue d'avant-prod du 31/08) : le sélecteur « Trier » était
// toujours à l'écran, mais plus personne ne lisait sa valeur. Il mentait même
// deux fois : il affichait « Par échéance » alors que la liste sortait dans
// l'ordre d'arrivée. Un contrôle qui ne fait rien est pire qu'un contrôle
// absent — on le tape, il ne se passe rien, et on croit que l'app a planté.
//
// Module pur : aucune requête, aucun rendu, une forme minimale en entrée.
// C'est ce qui permet de verrouiller l'ordre par des tests plutôt que par un
// clic à la main.
// =============================================================================

export type CleTri = "echeance" | "recent" | "oldest" | "name";

export const OPTIONS_TRI: Array<{ valeur: CleTri; label: string }> = [
  { valeur: "echeance", label: "Par échéance" },
  { valeur: "recent", label: "Plus récents" },
  { valeur: "oldest", label: "Plus anciens" },
  { valeur: "name", label: "Nom A→Z" },
];

/** Ce dont l'ordre dépend. Volontairement plus petit que `CrmLead`. */
export interface LeadTriable {
  firstName: string;
  lastName?: string | null;
  createdAt: string;
  /** Quand cette personne doit revenir dans la file. `null` = tout de suite. */
  relanceDueAt?: string | null;
}

const COMPARER_FR = new Intl.Collator("fr", { sensitivity: "base", numeric: true });

function horodatage(iso: string | null | undefined): number {
  if (!iso) return Number.NaN;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? Number.NaN : t;
}

/**
 * L'échéance d'un lead, en millisecondes.
 *
 * ⚠️ `relanceDueAt` à null ne veut PAS dire « plus tard » mais « aucune suite
 * prévue », donc « à traiter maintenant » (même lecture que `echeances.ts`).
 * Ces gens-là passent donc DEVANT, pas derrière — c'est la seule lecture qui
 * ne fait perdre personne au fond de la liste.
 */
export function echeanceMs(l: LeadTriable): number {
  const t = horodatage(l.relanceDueAt);
  return Number.isNaN(t) ? Number.NEGATIVE_INFINITY : t;
}

function nomComplet(l: LeadTriable): string {
  return `${l.firstName} ${l.lastName ?? ""}`.trim();
}

/** Départage deux leads pour une clé donnée. Exporté pour être testé seul. */
export function comparerPourTri(cle: CleTri, a: LeadTriable, b: LeadTriable): number {
  switch (cle) {
    case "name":
      return COMPARER_FR.compare(nomComplet(a), nomComplet(b));
    case "recent":
      return (horodatage(b.createdAt) || 0) - (horodatage(a.createdAt) || 0);
    case "oldest":
      return (horodatage(a.createdAt) || 0) - (horodatage(b.createdAt) || 0);
    case "echeance": {
      const d = echeanceMs(a) - echeanceMs(b);
      if (d !== 0 && Number.isFinite(d)) return d;
      // Deux échéances identiques (ou deux « maintenant ») : le plus ancien
      // arrivé passe devant — il attend depuis plus longtemps.
      if (echeanceMs(a) === echeanceMs(b)) {
        return (horodatage(a.createdAt) || 0) - (horodatage(b.createdAt) || 0);
      }
      return echeanceMs(a) === Number.NEGATIVE_INFINITY ? -1 : 1;
    }
  }
}

/** Rend une NOUVELLE liste triée. N'altère jamais celle qu'on lui donne. */
export function trierLeads<T extends LeadTriable>(leads: T[], cle: CleTri): T[] {
  return [...leads].sort((a, b) => comparerPourTri(cle, a, b));
}
