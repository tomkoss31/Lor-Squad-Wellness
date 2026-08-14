// =============================================================================
// goProSteps — LA définition unique du parcours de démarrage (2026-08-04).
//
// Chantier « l'app d'un débutant », lot 1 : le fil unique.
//
// AVANT, la même chose était décrite à DEUX endroits qui divergeaient :
//   • useSalleOps.ts        → le cockpit du coach
//   • useTeamStarterProgress.ts → la grille Apprentissage de l'équipe
// Chacun avait sa copie des 7 étapes et de la liste des portes. Résultat :
// le coach voyait « étape 5/7 » pendant que son parrain lisait autre chose
// sur son tableau de bord — d'où le « j'en ai 12 de coché ??? » de Thomas
// (le 12 venait en réalité d'un TROISIÈME compteur, la formation Herbalife).
//
// Toute modification du parcours se fait DÉSORMAIS ici, et nulle part ailleurs.
//
// ⚠ Les PORTES D'ACTIVATION sont décidées côté serveur (`mark_starter_task` /
// `_mark_starter_gate_for`). La liste ci-dessous doit rester leur miroir exact :
// si tu la changes, change la migration SQL correspondante — sinon le coach et
// le serveur ne seront plus d'accord sur qui est activé.
// =============================================================================

export interface GoProStepDef {
  /** Numéro affiché (1-based) — le même partout. */
  n: number;
  key: string;
  label: string;
  /** Clés de suivi côté base. Vide = étape sans enregistrement. */
  gates: string[];
  /** Clé de leçon quand elle diffère de la clé de porte. */
  lessonKey?: string;
  /** Étape présentée mais non atteignable (réservée à plus tard). */
  locked?: boolean;
}

export const GO_PRO_STEPS: GoProStepDef[] = [
  { n: 1, key: "sequiper", label: "S'équiper", gates: ["commande_250pv"] },
  { n: 2, key: "trouver", label: "Trouver", gates: ["liste_50"] },
  { n: 3, key: "inviter", label: "Inviter", gates: ["premiere_story"] },
  {
    n: 4,
    key: "presenter",
    label: "Présenter",
    gates: ["premier_bilan", "premier_hom", "premier_pv_pack"],
  },
  // « Relancer » : compétence continue, pas une porte d'activation. Elle a
  // néanmoins une clé de SUIVI depuis le 2026-08-04 (preuve chiffrée « 3
  // relances ») — sans elle, l'étape ne se terminait jamais et le parcours
  // s'y figeait pour tout le monde.
  { n: 5, key: "relancer", label: "Relancer", gates: ["relances_3"], lessonKey: "relancer" },
  { n: 6, key: "demarrer", label: "Démarrer ta recrue", gates: [], lessonKey: "demarrer_recrue" },
  { n: 7, key: "dupliquer", label: "Dupliquer", gates: [], lessonKey: "dupliquer" },
];

export const GO_PRO_TOTAL = GO_PRO_STEPS.length;

/**
 * Portes qui déclenchent l'activation (`users.activated_at`).
 *
 * ⚠ MIROIR EXACT du serveur — migration `activation_sans_hom` (2026-08-04) :
 * `premier_hom` en a été RETIRÉ. C'était une réunion physique, invérifiable
 * par l'app, cochée par 2 personnes sur 19 : elle bloquait l'activation de
 * TOUT LE MONDE. L'étape reste dans le parcours, elle ne verrouille plus.
 */
export const ACTIVATION_GATES = [
  "liste_50",
  "premiere_story",
  "premier_bilan",
  "premier_pv_pack",
] as const;

// =============================================================================
// LE CHOIX DE L'ÉTAPE EN COURS (2026-08-12)
//
// Règle : une étape ne retient le fil que si l'app peut CONSTATER sa preuve.
// Ce qu'elle ne sait pas mesurer, elle le propose — elle ne le bloque pas.
//
// Avant, l'étape en cours était « la première non cochée ». Résultat mesuré :
// dix coachs sur onze figés à l'étape 1 (« commande 250 PV », un lien vers
// myHerbalife que l'app ne peut pas vérifier), Maria comprise avec ses
// 41 bilans. Le parcours ne guidait pas : il mentait.
//
// Fonctions PURES, sans React ni base : c'est ce qui les rend testables, et
// les tests portent les vrais profils des coachs (cf. __tests__).
// =============================================================================

/**
 * L'étape porte-t-elle une preuve constatable qui manque encore ?
 *
 * ⚠️ `estMesurable` reçoit AUSSI la `lessonKey` de l'étape. Sans ça, « Relancer »
 * passerait pour non mesurable : sa porte s'appelle `relances_3` alors que sa
 * leçon — celle qui porte le compteur de 3 gestes — s'appelle `relancer`.
 * Le piège a été rencontré et corrigé le 12/08/2026 ; un test le garde.
 */
export function retientLeFil(
  step: GoProStepDef,
  estFaite: (gate: string) => boolean,
  estMesurable: (gate: string, lessonKey?: string) => boolean,
): boolean {
  if (step.locked) return false;
  const mesurables = step.gates.filter((gate) => estMesurable(gate, step.lessonKey));
  if (mesurables.length === 0) return false; // que du déclaratif → on propose
  return !mesurables.every(estFaite);
}

/**
 * Index (0-based) de l'étape à mettre en avant.
 *
 * 1. La première qui retient vraiment le fil.
 * 2. Sinon, la première SANS porte — « Démarrer ta recrue », puis
 *    « Dupliquer » : les compétences continues, jamais terminées.
 * 3. Sinon, la dernière.
 */
export function choisirEtapeActive(
  estFaite: (gate: string) => boolean,
  estMesurable: (gate: string, lessonKey?: string) => boolean,
): number {
  const bloquante = GO_PRO_STEPS.findIndex((g) => retientLeFil(g, estFaite, estMesurable));
  if (bloquante !== -1) return bloquante;
  const sansPorte = GO_PRO_STEPS.findIndex((g) => !g.locked && g.gates.length === 0);
  return sansPorte !== -1 ? sansPorte : GO_PRO_STEPS.length - 1;
}

/** Phases du parcours, dérivées du numéro d'étape. */
export type OpsPhase = "allumage" | "acceleration" | "profondeur" | "levier";

export const OPS_PHASES: { key: OpsPhase; label: string; short: string }[] = [
  { key: "allumage", label: "Allumage", short: "Allumage" },
  { key: "acceleration", label: "Accélération", short: "Accél." },
  { key: "profondeur", label: "Profondeur", short: "Profond." },
  { key: "levier", label: "Levier", short: "Levier" },
];
