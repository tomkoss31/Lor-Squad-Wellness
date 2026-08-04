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

/** Phases du parcours, dérivées du numéro d'étape. */
export type OpsPhase = "allumage" | "acceleration" | "profondeur" | "levier";

export const OPS_PHASES: { key: OpsPhase; label: string; short: string }[] = [
  { key: "allumage", label: "Allumage", short: "Allumage" },
  { key: "acceleration", label: "Accélération", short: "Accél." },
  { key: "profondeur", label: "Profondeur", short: "Profond." },
  { key: "levier", label: "Levier", short: "Levier" },
];
