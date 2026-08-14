// =============================================================================
// bodyMetricUnits — toute l'arithmétique % ↔ kg de la composition corporelle.
// Chantier BBC « saisie EBE / bilan des 10 » (2026-08-14).
//
// ── POURQUOI DEUX UNITÉS QUI NE SE RESSEMBLENT PAS ───────────────────────────
// La balance Tanita ne rend pas ses deux mesures phares dans la même unité, et
// l'app a toujours stocké EXACTEMENT ce que la balance affiche :
//
//   • bodyFat    → un POURCENTAGE du poids   (ex. 34,2 = 34,2 % de masse grasse)
//   • muscleMass → des KILOS                 (ex. 44,1 = 44,1 kg de muscle)
//
// Ce n'est ni une erreur ni un héritage : c'est ce que le coach lit sur l'écran
// de la balance et recopie sur la fiche papier. 679 bilans sont déjà écrits
// ainsi. **Le stockage ne bouge JAMAIS.** Ce module ne convertit que pour
// l'AFFICHAGE, et sait refaire le chemin inverse (`toNativeValue`) quand le
// coach saisit une valeur dans l'unité qu'il a choisie à l'écran.
//
// ── LA RÈGLE QUI FAIT TOUT LE TRAVAIL ────────────────────────────────────────
// Une conversion a besoin d'un poids, et pas de n'importe lequel : celui DU
// RELEVÉ concerné. Le départ se convertit avec le poids du départ, aujourd'hui
// avec le poids d'aujourd'hui. Mélanger les deux fabrique un écart faux —
// c'est précisément le piège que ce module existe pour rendre impossible :
// chaque valeur voyage avec son poids dans un `MetricReading`.
//
// Exemple vécu (femme, 10 visites) : muscle 44,1 → 43,8 kg, poids 74,5 → 70,3.
// En kilos elle en a perdu 0,3. En points elle en a gagné 3,1 — parce que le
// poids a baissé. Les deux lectures sont vraies, aucune ne se déduit de l'autre
// sans les deux poids.
//
// ── POIDS MANQUANT ───────────────────────────────────────────────────────────
// Sans poids, la conversion est IMPOSSIBLE. On ne renvoie ni NaN, ni 0, ni la
// valeur native déguisée : on renvoie `value: null` avec `unavailable: true` et
// `reason: "poids-manquant"`, pour que l'UI puisse désactiver l'inverseur et
// l'expliquer plutôt que d'afficher un chiffre inventé.
//
// Aucun état, aucun React, aucun accès réseau : tout est pur et testable.
// =============================================================================

import {
  estimateBodyFatKg,
  estimateMuscleMassKg,
  estimateMuscleMassPercent,
  estimateRelativeMassPercent,
} from "./calculations";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/** L'unité choisie par le coach dans l'inverseur « % | kg ». */
export type DisplayUnit = "percent" | "kg";

/** L'unité telle qu'elle s'écrit à l'écran, à côté du nombre. */
export type LiteralUnit = "%" | "kg" | "indice" | "ans" | "kcal";

/** Les 8 mesures du body scan. Clés alignées sur `BodyScanMetrics`. */
export type BodyMetricKey =
  | "weight"
  | "bodyFat"
  | "muscleMass"
  | "hydration"
  | "visceralFat"
  | "metabolicAge"
  | "bmr"
  | "boneMass";

/** L'objectif du membre, qui décide du sens de « bien ». */
export type Goal = "weight-loss" | "mass-gain";

/** L'état d'un écart, seuil de stabilité appliqué. */
export type DeltaState = "stable" | "hausse" | "baisse";

/** L'écart va-t-il dans le sens voulu ? */
export type DirectionVerdict = "bon" | "mauvais" | "neutre";

/** Pourquoi une valeur ne peut pas être affichée. */
export type UnavailableReason = "poids-manquant" | "valeur-manquante";

/**
 * Un relevé : la valeur NATIVE (telle qu'en base) et LE POIDS DU MÊME RELEVÉ.
 * Les deux voyagent ensemble — c'est le garde-fou central de ce module.
 */
export interface MetricReading {
  /** Valeur native : bodyFat en %, muscleMass en kg. `null` si non mesurée. */
  value: number | null;
  /** Poids (kg) du relevé d'où vient `value`. `null` si inconnu. */
  weight: number | null;
}

/** Une valeur prête à afficher, dans l'unité demandée. */
export interface DisplayedMetric {
  /** Valeur convertie, arrondie. `null` si elle ne peut pas être affichée. */
  value: number | null;
  /** L'unité à écrire à côté du nombre. */
  unit: LiteralUnit;
  /** Nombre de décimales à afficher. */
  decimals: number;
  /** `true` si la valeur a été recalculée depuis son unité native. */
  converted: boolean;
  /** `true` quand rien ne peut être affiché (voir `reason`). */
  unavailable: boolean;
  reason: UnavailableReason | null;
}

/** L'écart entre deux relevés, exprimé DANS L'UNITÉ AFFICHÉE. */
export interface MetricDelta {
  /** Écart `aujourd'hui − départ`, arrondi au centième. `null` si impossible. */
  value: number | null;
  unit: LiteralUnit;
  decimals: number;
  /** Signe BRUT de l'écart, avant application du seuil de stabilité. */
  sign: -1 | 0 | 1;
  /** État après seuil : un micro-écart est déclaré `stable`. */
  state: DeltaState;
  /** Le seuil de stabilité retenu, pour que l'UI puisse l'expliquer. */
  threshold: number;
  unavailable: boolean;
  reason: UnavailableReason | null;
}

/** Le paquet complet départ → aujourd'hui pour une mesure. */
export interface MetricComparison {
  metric: BodyMetricKey;
  unit: LiteralUnit;
  decimals: number;
  start: DisplayedMetric;
  current: DisplayedMetric;
  delta: MetricDelta;
  verdict: DirectionVerdict;
}

// -----------------------------------------------------------------------------
// Constantes
// -----------------------------------------------------------------------------

/** Les deux seules mesures que l'inverseur bascule. */
export const CONVERTIBLE_METRICS: readonly BodyMetricKey[] = ["bodyFat", "muscleMass"];

/** L'unité de STOCKAGE de chaque mesure. Ne bouge jamais. */
export const NATIVE_UNITS: Record<BodyMetricKey, LiteralUnit> = {
  weight: "kg",
  bodyFat: "%",
  muscleMass: "kg",
  hydration: "%",
  visceralFat: "indice",
  metabolicAge: "ans",
  bmr: "kcal",
  boneMass: "kg",
};

/**
 * En deçà de ce seuil, un écart n'est pas un mouvement : c'est du bruit de
 * balance. Annoncer « +0,1 kg de muscle » à quelqu'un serait mentir sur la
 * précision de l'appareil.
 */
export const STABILITY_THRESHOLDS: Record<LiteralUnit, number> = {
  "%": 0.1,
  kg: 0.2,
  indice: 0.5,
  ans: 0.5,
  kcal: 20,
};

/** Décimales d'affichage par unité littérale. */
const DECIMALS: Record<LiteralUnit, number> = {
  "%": 1,
  kg: 1,
  indice: 0,
  ans: 0,
  kcal: 0,
};

/** Clé localStorage de l'inverseur (source de vérité unique, cf. la maquette). */
export const BBC_UNIT_STORAGE_KEY = "bbc-cmp-unit";

/** Le message affiché quand l'inverseur est bloqué faute de poids. */
export const POIDS_MANQUANT_MESSAGE =
  "Poids d'aujourd'hui manquant : l'inverseur est bloqué, la conversion a besoin du poids du relevé.";

/**
 * Sens souhaité de l'écart : +1 « ça doit monter », −1 « ça doit descendre »,
 * 0 « on l'affiche, on ne le juge pas ».
 *
 * Règles de la maquette validée (« 4 · Bilan des 10 », fonction `dirOf`) :
 *  • le MUSCLE qui monte est une bonne nouvelle dans TOUS les objectifs — on ne
 *    grise jamais la meilleure nouvelle de l'écran ;
 *  • SEUL LE POIDS s'inverse avec l'objectif. Il n'existe aucun objectif où
 *    prendre du gras ou perdre du muscle est une bonne nouvelle ;
 *  • la MASSE GRASSE se juge donc dans les deux objectifs. En prise de masse on
 *    ne REPROCHE pas quelques kilos de gras — mais on ne les annonce pas
 *    « stable » non plus : +4,5 points, c'est un mouvement, et l'écran doit le
 *    dire devant le membre (le mot du verdict est « stable » quand le sens
 *    attendu vaut 0 — l'afficher sous une hausse de 4,5 points serait faux) ;
 *  • la MASSE OSSEUSE ne se juge pas, elle ne bouge quasiment pas : c'est la
 *    SEULE mesure à 0, comme dans la maquette.
 *
 * Table à trois niveaux : l'unité affichée n'inverse aucun sens aujourd'hui,
 * mais la règle est écrite par unité pour qu'une future divergence s'exprime
 * ici — dans la donnée — et pas dans une condition perdue au fond d'une vue.
 */
const SENS_SOUHAITE: Record<BodyMetricKey, Record<DisplayUnit, Record<Goal, -1 | 0 | 1>>> = {
  weight: memeDansLesDeuxUnites(-1, 1),
  bodyFat: memeDansLesDeuxUnites(-1, -1),
  muscleMass: memeDansLesDeuxUnites(1, 1),
  hydration: memeDansLesDeuxUnites(1, 1),
  visceralFat: memeDansLesDeuxUnites(-1, -1),
  metabolicAge: memeDansLesDeuxUnites(-1, -1),
  bmr: memeDansLesDeuxUnites(1, 1),
  boneMass: memeDansLesDeuxUnites(0, 0),
};

function memeDansLesDeuxUnites(
  perteDePoids: -1 | 0 | 1,
  priseDeMasse: -1 | 0 | 1,
): Record<DisplayUnit, Record<Goal, -1 | 0 | 1>> {
  const sens: Record<Goal, -1 | 0 | 1> = { "weight-loss": perteDePoids, "mass-gain": priseDeMasse };
  return { percent: sens, kg: sens };
}

// -----------------------------------------------------------------------------
// Petits utilitaires
// -----------------------------------------------------------------------------

/** Un poids exploitable : fini et strictement positif. Rien d'autre. */
export function isWeightUsable(weight: number | null | undefined): weight is number {
  return typeof weight === "number" && Number.isFinite(weight) && weight > 0;
}

/** Une valeur exploitable : finie. Le 0 reste une valeur légitime en écart. */
function isValueUsable(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Arrondi maison au dixième / centième. `roundMetric` de `calculations.ts` fait
 * exactement ça mais n'est pas exporté, et `calculations.ts` est sacré en
 * écriture — on ne l'ouvre pas pour ajouter un `export`. Les conversions, elles,
 * passent bien par les fonctions exportées de ce fichier (donc par son arrondi).
 */
function arrondir(value: number, decimals: number): number {
  // Le `+ 0` normalise le −0 que produit `toFixed` sur les petits négatifs :
  // un écart nul ne doit jamais s'afficher « −0 ».
  return Number(value.toFixed(decimals)) + 0;
}

/** Cette mesure suit-elle l'inverseur ? */
export function isConvertibleMetric(metric: BodyMetricKey): boolean {
  return CONVERTIBLE_METRICS.includes(metric);
}

/** L'unité de stockage de la mesure. */
export function nativeUnitOf(metric: BodyMetricKey): LiteralUnit {
  return NATIVE_UNITS[metric];
}

/**
 * L'unité à écrire à l'écran. Seules les mesures inversables suivent le choix
 * du coach ; le poids reste en kg, l'âge métabolique en ans, etc.
 */
export function literalUnitOf(metric: BodyMetricKey, unit: DisplayUnit): LiteralUnit {
  if (!isConvertibleMetric(metric)) return NATIVE_UNITS[metric];
  return unit === "kg" ? "kg" : "%";
}

export function decimalsOf(unit: LiteralUnit): number {
  return DECIMALS[unit];
}

export function stabilityThresholdOf(unit: LiteralUnit): number {
  return STABILITY_THRESHOLDS[unit];
}

// -----------------------------------------------------------------------------
// Conversions élémentaires — toutes exigent LE POIDS DU RELEVÉ
// -----------------------------------------------------------------------------

/** Masse grasse : % du poids → kilos de gras. `null` sans poids exploitable. */
export function bodyFatPercentToKg(
  weight: number | null | undefined,
  bodyFatPercent: number | null | undefined,
): number | null {
  if (!isWeightUsable(weight) || !isValueUsable(bodyFatPercent)) return null;
  return estimateBodyFatKg(weight, bodyFatPercent);
}

/** Masse grasse : kilos de gras → % du poids. `null` sans poids exploitable. */
export function bodyFatKgToPercent(
  weight: number | null | undefined,
  bodyFatKg: number | null | undefined,
): number | null {
  if (!isWeightUsable(weight) || !isValueUsable(bodyFatKg)) return null;
  return estimateRelativeMassPercent(weight, bodyFatKg);
}

/** Masse musculaire : kilos de muscle → % du poids. `null` sans poids. */
export function muscleMassKgToPercent(
  weight: number | null | undefined,
  muscleMassKg: number | null | undefined,
): number | null {
  if (!isWeightUsable(weight) || !isValueUsable(muscleMassKg)) return null;
  return estimateMuscleMassPercent(weight, muscleMassKg);
}

/** Masse musculaire : % du poids → kilos de muscle. `null` sans poids. */
export function muscleMassPercentToKg(
  weight: number | null | undefined,
  muscleMassPercent: number | null | undefined,
): number | null {
  if (!isWeightUsable(weight) || !isValueUsable(muscleMassPercent)) return null;
  return estimateMuscleMassKg(weight, muscleMassPercent);
}

// -----------------------------------------------------------------------------
// Affichage
// -----------------------------------------------------------------------------

/**
 * La valeur à afficher pour une mesure, dans l'unité demandée, à partir d'un
 * relevé (valeur native + SON poids).
 *
 * Renvoie toujours l'unité littérale et le nombre de décimales : l'appelant
 * n'a jamais à redevenir savant sur « est-ce que c'est un % ou des kilos ».
 */
export function displayMetric(
  metric: BodyMetricKey,
  unit: DisplayUnit,
  reading: MetricReading,
): DisplayedMetric {
  const literal = literalUnitOf(metric, unit);
  const decimals = decimalsOf(literal);
  const base: Omit<DisplayedMetric, "value" | "converted" | "unavailable" | "reason"> = {
    unit: literal,
    decimals,
  };

  if (!isValueUsable(reading.value)) {
    return { ...base, value: null, converted: false, unavailable: true, reason: "valeur-manquante" };
  }

  // Mesure non inversable, ou unité affichée = unité native : rien à convertir,
  // et donc aucun besoin du poids.
  if (!isConvertibleMetric(metric) || literal === NATIVE_UNITS[metric]) {
    return { ...base, value: reading.value, converted: false, unavailable: false, reason: null };
  }

  const converted =
    metric === "bodyFat"
      ? bodyFatPercentToKg(reading.weight, reading.value) // % natif → kg affiché
      : muscleMassKgToPercent(reading.weight, reading.value); // kg natif → % affiché

  if (converted === null) {
    return { ...base, value: null, converted: true, unavailable: true, reason: "poids-manquant" };
  }

  return { ...base, value: converted, converted: true, unavailable: false, reason: null };
}

/**
 * Le chemin inverse : ce que l'on GARDERAIT en base à partir d'une valeur
 * saisie par le coach dans l'unité affichée. Sans poids, une valeur saisie en
 * unité non native est inexploitable → `null` (surtout ne pas la stocker telle
 * quelle, on écrirait des kilos dans une colonne de pourcentages).
 */
export function toNativeValue(
  metric: BodyMetricKey,
  unit: DisplayUnit,
  displayedValue: number | null | undefined,
  weight: number | null | undefined,
): number | null {
  if (!isValueUsable(displayedValue)) return null;

  const literal = literalUnitOf(metric, unit);
  if (!isConvertibleMetric(metric) || literal === NATIVE_UNITS[metric]) {
    return displayedValue;
  }

  return metric === "bodyFat"
    ? bodyFatKgToPercent(weight, displayedValue) // kg saisis → % stocké
    : muscleMassPercentToKg(weight, displayedValue); // % saisis → kg stocké
}

// -----------------------------------------------------------------------------
// Écart et sens
// -----------------------------------------------------------------------------

/**
 * L'écart départ → aujourd'hui, DANS L'UNITÉ AFFICHÉE.
 *
 * Chaque colonne est convertie avec SON propre poids : `start.weight` pour le
 * départ, `current.weight` pour aujourd'hui. C'est non négociable — utiliser le
 * même poids des deux côtés donne un écart faux (et plausible, donc invisible).
 */
export function computeMetricDelta(
  metric: BodyMetricKey,
  unit: DisplayUnit,
  start: MetricReading,
  current: MetricReading,
): MetricDelta {
  const depart = displayMetric(metric, unit, start);
  const aujourdhui = displayMetric(metric, unit, current);
  const literal = literalUnitOf(metric, unit);
  const decimals = decimalsOf(literal);
  const threshold = stabilityThresholdOf(literal);

  if (depart.value === null || aujourdhui.value === null) {
    return {
      value: null,
      unit: literal,
      decimals,
      sign: 0,
      state: "stable",
      threshold,
      unavailable: true,
      reason: depart.reason ?? aujourdhui.reason ?? "valeur-manquante",
    };
  }

  // Arrondi au centième : les deux membres sont déjà arrondis au dixième, la
  // soustraction ne fait que ramasser le bruit binaire (25,5 − 21,9).
  const ecart = arrondir(aujourdhui.value - depart.value, 2);
  const sign: -1 | 0 | 1 = ecart > 0 ? 1 : ecart < 0 ? -1 : 0;
  const state: DeltaState =
    Math.abs(ecart) <= threshold ? "stable" : ecart > 0 ? "hausse" : "baisse";

  return {
    value: ecart,
    unit: literal,
    decimals,
    sign,
    state,
    threshold,
    unavailable: false,
    reason: null,
  };
}

/**
 * Le sens souhaité pour cette mesure, cette unité et cet objectif.
 * +1 « ça doit monter », −1 « ça doit descendre », 0 « ne se juge pas ».
 */
export function desiredDirection(
  metric: BodyMetricKey,
  unit: DisplayUnit,
  goal: Goal,
): -1 | 0 | 1 {
  return SENS_SOUHAITE[metric][unit][goal];
}

/**
 * L'écart va-t-il dans le bon sens ? Un écart absent, sous le seuil de
 * stabilité, ou portant sur une mesure qu'on ne juge pas → « neutre ».
 */
export function judgeMetricDelta(
  metric: BodyMetricKey,
  unit: DisplayUnit,
  goal: Goal,
  delta: MetricDelta,
): DirectionVerdict {
  if (delta.unavailable || delta.value === null || delta.state === "stable") return "neutre";

  const attendu = desiredDirection(metric, unit, goal);
  if (attendu === 0) return "neutre";

  return delta.sign === attendu ? "bon" : "mauvais";
}

/**
 * Tout d'un coup : les deux valeurs affichées, l'écart et le verdict.
 * C'est l'entrée que les vues doivent utiliser — elle rend structurellement
 * impossible de convertir les deux colonnes avec le même poids.
 */
export function compareReadings(
  metric: BodyMetricKey,
  unit: DisplayUnit,
  goal: Goal,
  start: MetricReading,
  current: MetricReading,
): MetricComparison {
  const delta = computeMetricDelta(metric, unit, start, current);
  return {
    metric,
    unit: delta.unit,
    decimals: delta.decimals,
    start: displayMetric(metric, unit, start),
    current: displayMetric(metric, unit, current),
    delta,
    verdict: judgeMetricDelta(metric, unit, goal, delta),
  };
}

// -----------------------------------------------------------------------------
// Persistance du choix d'unité (le stockage lui-même vit dans le composant)
// -----------------------------------------------------------------------------

/**
 * Relit le choix mémorisé. Tolère la forme `"%"` de la maquette d'origine,
 * pour qu'un réglage posé avant ce module ne soit pas perdu au premier chargement.
 */
export function parseStoredUnit(raw: string | null | undefined): DisplayUnit | null {
  if (raw === "kg") return "kg";
  if (raw === "percent" || raw === "%") return "percent";
  return null;
}

/** La forme écrite en localStorage. */
export function serializeUnit(unit: DisplayUnit): string {
  return unit;
}
