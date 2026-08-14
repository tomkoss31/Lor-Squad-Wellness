// Chantier BBC — saisie EBE / bilan des 10 (2026-08-14).
// L'arithmétique % ↔ kg : le piège central est qu'une conversion se fait avec
// LE POIDS DU RELEVÉ, et que se tromper de poids produit un chiffre faux mais
// plausible — donc invisible. Ces tests existent pour qu'il devienne visible.

import { describe, it, expect } from "vitest";
import {
  bodyFatKgToPercent,
  bodyFatPercentToKg,
  compareReadings,
  computeMetricDelta,
  decimalsOf,
  desiredDirection,
  displayMetric,
  judgeMetricDelta,
  literalUnitOf,
  muscleMassKgToPercent,
  muscleMassPercentToKg,
  parseStoredUnit,
  serializeUnit,
  stabilityThresholdOf,
  toNativeValue,
  type MetricReading,
} from "../bodyMetricUnits";

// Le cas de la maquette validée : femme, 10 visites, ~5 semaines.
const DEPART: MetricReading = { value: 34.2, weight: 74.5 }; // masse grasse native (%)
const AUJOURDHUI: MetricReading = { value: 31.1, weight: 70.3 };
const MUSCLE_DEPART: MetricReading = { value: 44.1, weight: 74.5 }; // muscle natif (kg)
const MUSCLE_AUJOURDHUI: MetricReading = { value: 44.2, weight: 70.3 };

describe("bodyMetricUnits — conversions élémentaires", () => {
  it("masse grasse : 34,2 % de 74,5 kg = 25,5 kg de gras", () => {
    expect(bodyFatPercentToKg(74.5, 34.2)).toBe(25.5);
  });

  it("masse grasse : 25,5 kg sur 74,5 kg = 34,2 %", () => {
    expect(bodyFatKgToPercent(74.5, 25.5)).toBe(34.2);
  });

  it("muscle : 44,1 kg sur 74,5 kg = 59,2 % du poids", () => {
    expect(muscleMassKgToPercent(74.5, 44.1)).toBe(59.2);
  });

  it("muscle : 59,2 % de 74,5 kg = 44,1 kg", () => {
    expect(muscleMassPercentToKg(74.5, 59.2)).toBe(44.1);
  });
});

describe("bodyMetricUnits — l'aller-retour ne dérive pas au-delà de l'arrondi", () => {
  const cas: Array<{ weight: number; percent: number }> = [
    { weight: 74.5, percent: 34.2 },
    { weight: 70.3, percent: 31.1 },
    { weight: 52.4, percent: 41.7 },
    { weight: 96.2, percent: 22.8 },
    { weight: 61.8, percent: 18.4 },
  ];

  it("masse grasse : % → kg → % reste à 0,2 point près", () => {
    for (const { weight, percent } of cas) {
      const kg = bodyFatPercentToKg(weight, percent);
      expect(kg).not.toBeNull();
      const retour = bodyFatKgToPercent(weight, kg);
      expect(retour).not.toBeNull();
      expect(Math.abs((retour as number) - percent)).toBeLessThanOrEqual(0.2);
    }
  });

  const casMuscle: Array<{ weight: number; kg: number }> = [
    { weight: 74.5, kg: 44.1 },
    { weight: 70.3, kg: 44.2 },
    { weight: 61.8, kg: 38.4 },
    { weight: 88.9, kg: 55.3 },
    { weight: 52.4, kg: 30.9 },
  ];

  it("muscle : kg → % → kg reste à 0,15 kg près", () => {
    for (const { weight, kg } of casMuscle) {
      const pct = muscleMassKgToPercent(weight, kg);
      expect(pct).not.toBeNull();
      const retour = muscleMassPercentToKg(weight, pct);
      expect(retour).not.toBeNull();
      expect(Math.abs((retour as number) - kg)).toBeLessThanOrEqual(0.15);
    }
  });
});

describe("bodyMetricUnits — le cas de la maquette validée", () => {
  it("masse grasse affichée en kg : 25,5 → 21,9, soit −3,6 kg", () => {
    const depart = displayMetric("bodyFat", "kg", DEPART);
    const actuel = displayMetric("bodyFat", "kg", AUJOURDHUI);
    expect(depart.value).toBe(25.5);
    expect(actuel.value).toBe(21.9);
    expect(depart.unit).toBe("kg");
    expect(depart.converted).toBe(true);

    const delta = computeMetricDelta("bodyFat", "kg", DEPART, AUJOURDHUI);
    expect(delta.value).toBe(-3.6);
    expect(delta.state).toBe("baisse");
    expect(delta.unit).toBe("kg");
    expect(judgeMetricDelta("bodyFat", "kg", "weight-loss", delta)).toBe("bon");
  });

  it("masse grasse affichée en % : 34,2 → 31,1, soit −3,1 points", () => {
    const delta = computeMetricDelta("bodyFat", "percent", DEPART, AUJOURDHUI);
    expect(delta.value).toBe(-3.1);
    expect(delta.unit).toBe("%");
    expect(delta.state).toBe("baisse");
  });

  it("muscle affiché en % : 59,2 → 62,9, soit +3,7 points", () => {
    const depart = displayMetric("muscleMass", "percent", MUSCLE_DEPART);
    const actuel = displayMetric("muscleMass", "percent", MUSCLE_AUJOURDHUI);
    expect(depart.value).toBe(59.2);
    expect(actuel.value).toBe(62.9);

    const delta = computeMetricDelta("muscleMass", "percent", MUSCLE_DEPART, MUSCLE_AUJOURDHUI);
    expect(delta.value).toBe(3.7);
    expect(delta.state).toBe("hausse");
    expect(delta.unit).toBe("%");
  });

  it("muscle affiché en kg : 44,1 → 44,2, donc stable (bruit de balance)", () => {
    const delta = computeMetricDelta("muscleMass", "kg", MUSCLE_DEPART, MUSCLE_AUJOURDHUI);
    expect(delta.value).toBe(0.1);
    expect(delta.state).toBe("stable"); // seuil kg = 0,2
    expect(judgeMetricDelta("muscleMass", "kg", "weight-loss", delta)).toBe("neutre");
  });

  it("le poids ne suit pas l'inverseur : il reste en kg dans les deux unités", () => {
    const poids: MetricReading = { value: 70.3, weight: 70.3 };
    expect(displayMetric("weight", "percent", poids).unit).toBe("kg");
    expect(displayMetric("weight", "percent", poids).value).toBe(70.3);
    expect(literalUnitOf("weight", "percent")).toBe("kg");
  });
});

describe("bodyMetricUnits — le changement de signe (muscle 44,1 → 43,8 kg)", () => {
  const depart: MetricReading = { value: 44.1, weight: 74.5 };
  const actuel: MetricReading = { value: 43.8, weight: 70.3 };

  it("en kilos : −0,3 kg, donc une baisse", () => {
    const delta = computeMetricDelta("muscleMass", "kg", depart, actuel);
    expect(delta.value).toBe(-0.3);
    expect(delta.state).toBe("baisse");
    expect(judgeMetricDelta("muscleMass", "kg", "weight-loss", delta)).toBe("mauvais");
  });

  it("en points : +3,1 points, donc une hausse — les deux lectures sont vraies", () => {
    const delta = computeMetricDelta("muscleMass", "percent", depart, actuel);
    expect(delta.value).toBe(3.1);
    expect(delta.state).toBe("hausse");
    expect(judgeMetricDelta("muscleMass", "percent", "weight-loss", delta)).toBe("bon");
  });
});

describe("bodyMetricUnits — chaque colonne se convertit avec SON poids", () => {
  it("le départ utilise le poids du départ, jamais celui d'aujourd'hui", () => {
    const juste = computeMetricDelta("muscleMass", "percent", MUSCLE_DEPART, MUSCLE_AUJOURDHUI);
    expect(juste.value).toBe(3.7);

    // La faute classique : convertir les deux colonnes avec le poids d'aujourd'hui.
    // 44,1 / 70,3 = 62,7 % au lieu de 59,2 % → l'écart tombe à +0,2 point.
    const faux = computeMetricDelta(
      "muscleMass",
      "percent",
      { value: 44.1, weight: 70.3 },
      MUSCLE_AUJOURDHUI,
    );
    expect(faux.value).toBe(0.2);
    expect(juste.value).not.toBe(faux.value);
  });

  it("même piège sur la masse grasse en kg", () => {
    const juste = computeMetricDelta("bodyFat", "kg", DEPART, AUJOURDHUI);
    expect(juste.value).toBe(-3.6);

    // 34,2 % lus sur le poids d'aujourd'hui = 24,0 kg au lieu de 25,5 kg.
    const faux = computeMetricDelta("bodyFat", "kg", { value: 34.2, weight: 70.3 }, AUJOURDHUI);
    expect(faux.value).toBe(-2.1);
    expect(juste.value).not.toBe(faux.value);
  });
});

describe("bodyMetricUnits — poids manquant : dit explicitement, jamais NaN", () => {
  it("muscle demandé en %, sans poids → indisponible et motivé", () => {
    const affiche = displayMetric("muscleMass", "percent", { value: 44.2, weight: null });
    expect(affiche.value).toBeNull();
    expect(affiche.unavailable).toBe(true);
    expect(affiche.reason).toBe("poids-manquant");
    expect(Number.isNaN(affiche.value as unknown as number)).toBe(false);
  });

  it("mais l'unité native reste lisible sans poids", () => {
    const affiche = displayMetric("muscleMass", "kg", { value: 44.2, weight: null });
    expect(affiche.value).toBe(44.2);
    expect(affiche.unavailable).toBe(false);
    expect(affiche.converted).toBe(false);
  });

  it("un écart impossible se déclare, il ne vaut pas 0", () => {
    const delta = computeMetricDelta("muscleMass", "percent", MUSCLE_DEPART, {
      value: 44.2,
      weight: null,
    });
    expect(delta.value).toBeNull();
    expect(delta.unavailable).toBe(true);
    expect(delta.reason).toBe("poids-manquant");
    expect(judgeMetricDelta("muscleMass", "percent", "weight-loss", delta)).toBe("neutre");
  });

  it("les conversions renvoient null, jamais NaN ni 0", () => {
    for (const poids of [null, undefined, 0, -5, Number.NaN]) {
      expect(bodyFatPercentToKg(poids, 34.2)).toBeNull();
      expect(bodyFatKgToPercent(poids, 25.5)).toBeNull();
      expect(muscleMassKgToPercent(poids, 44.1)).toBeNull();
      expect(muscleMassPercentToKg(poids, 59.2)).toBeNull();
    }
  });

  it("une valeur absente ou NaN se distingue d'un poids absent", () => {
    const sansValeur = displayMetric("bodyFat", "percent", { value: null, weight: 74.5 });
    expect(sansValeur.reason).toBe("valeur-manquante");
    const nan = displayMetric("bodyFat", "percent", { value: Number.NaN, weight: 74.5 });
    expect(nan.value).toBeNull();
    expect(nan.reason).toBe("valeur-manquante");
  });

  it("retour vers le natif : sans poids, on ne stocke rien", () => {
    expect(toNativeValue("muscleMass", "percent", 62.9, null)).toBeNull();
    expect(toNativeValue("bodyFat", "kg", 21.9, null)).toBeNull();
    // En unité native, aucun poids n'est requis.
    expect(toNativeValue("muscleMass", "kg", 44.2, null)).toBe(44.2);
    expect(toNativeValue("bodyFat", "percent", 31.1, null)).toBe(31.1);
  });

  it("retour vers le natif : la valeur saisie en unité affichée redevient native", () => {
    expect(toNativeValue("muscleMass", "percent", 62.9, 70.3)).toBe(44.2);
    expect(toNativeValue("bodyFat", "kg", 25.5, 74.5)).toBe(34.2);
  });
});

describe("bodyMetricUnits — seuils de stabilité, aux bornes", () => {
  const releve = (v: number): MetricReading => ({ value: v, weight: 70 });

  it("pourcentage : 0,1 est stable, 0,2 est une hausse", () => {
    expect(stabilityThresholdOf("%")).toBe(0.1);
    expect(computeMetricDelta("hydration", "percent", releve(47.8), releve(47.9)).state).toBe("stable");
    expect(computeMetricDelta("hydration", "percent", releve(47.8), releve(48)).state).toBe("hausse");
    expect(computeMetricDelta("hydration", "percent", releve(47.8), releve(47.6)).state).toBe("baisse");
  });

  it("kilos : 0,2 est stable, 0,3 est une hausse", () => {
    expect(stabilityThresholdOf("kg")).toBe(0.2);
    expect(computeMetricDelta("weight", "kg", releve(70), releve(70.2)).state).toBe("stable");
    expect(computeMetricDelta("weight", "kg", releve(70), releve(70.3)).state).toBe("hausse");
    expect(computeMetricDelta("weight", "kg", releve(70), releve(69.7)).state).toBe("baisse");
  });

  it("indice viscéral : 0,5 est stable, 0,6 est une hausse", () => {
    expect(stabilityThresholdOf("indice")).toBe(0.5);
    expect(computeMetricDelta("visceralFat", "kg", releve(8), releve(8.5)).state).toBe("stable");
    expect(computeMetricDelta("visceralFat", "kg", releve(8), releve(8.6)).state).toBe("hausse");
    expect(computeMetricDelta("visceralFat", "kg", releve(8), releve(6)).state).toBe("baisse");
  });

  it("âge métabolique : 0,5 est stable, 1 an est une baisse", () => {
    expect(stabilityThresholdOf("ans")).toBe(0.5);
    expect(computeMetricDelta("metabolicAge", "kg", releve(51), releve(51.5)).state).toBe("stable");
    expect(computeMetricDelta("metabolicAge", "kg", releve(51), releve(50)).state).toBe("baisse");
  });

  it("métabolisme : 20 kcal est stable, 25 kcal est une hausse", () => {
    expect(stabilityThresholdOf("kcal")).toBe(20);
    expect(computeMetricDelta("bmr", "kg", releve(1420), releve(1440)).state).toBe("stable");
    expect(computeMetricDelta("bmr", "kg", releve(1420), releve(1445)).state).toBe("hausse");
  });

  it("un écart nul ne s'affiche jamais « −0 »", () => {
    const delta = computeMetricDelta("weight", "kg", releve(70), releve(70));
    expect(delta.value).toBe(0);
    expect(Object.is(delta.value, -0)).toBe(false);
    expect(delta.sign).toBe(0);
    expect(delta.state).toBe("stable");
  });

  it("les décimales suivent l'unité", () => {
    expect(decimalsOf("%")).toBe(1);
    expect(decimalsOf("kg")).toBe(1);
    expect(decimalsOf("indice")).toBe(0);
    expect(decimalsOf("ans")).toBe(0);
    expect(decimalsOf("kcal")).toBe(0);
  });
});

describe("bodyMetricUnits — le sens métier", () => {
  it("seul le poids s'inverse avec l'objectif", () => {
    expect(desiredDirection("weight", "kg", "weight-loss")).toBe(-1);
    expect(desiredDirection("weight", "kg", "mass-gain")).toBe(1);
  });

  it("le muscle qui monte est bon dans TOUS les objectifs et dans les deux unités", () => {
    expect(desiredDirection("muscleMass", "kg", "weight-loss")).toBe(1);
    expect(desiredDirection("muscleMass", "kg", "mass-gain")).toBe(1);
    expect(desiredDirection("muscleMass", "percent", "weight-loss")).toBe(1);
    expect(desiredDirection("muscleMass", "percent", "mass-gain")).toBe(1);

    const delta = computeMetricDelta("muscleMass", "kg", { value: 44.1, weight: 74.5 }, { value: 45.4, weight: 76.8 });
    expect(delta.state).toBe("hausse");
    expect(judgeMetricDelta("muscleMass", "kg", "mass-gain", delta)).toBe("bon");
    expect(judgeMetricDelta("muscleMass", "kg", "weight-loss", delta)).toBe("bon");
  });

  it("la masse grasse se juge dans les DEUX objectifs : elle doit descendre", () => {
    expect(desiredDirection("bodyFat", "percent", "weight-loss")).toBe(-1);
    expect(desiredDirection("bodyFat", "kg", "weight-loss")).toBe(-1);
    expect(desiredDirection("bodyFat", "percent", "mass-gain")).toBe(-1);
    expect(desiredDirection("bodyFat", "kg", "mass-gain")).toBe(-1);

    const delta = computeMetricDelta("bodyFat", "kg", DEPART, AUJOURDHUI);
    expect(judgeMetricDelta("bodyFat", "kg", "weight-loss", delta)).toBe("bon");
    expect(judgeMetricDelta("bodyFat", "kg", "mass-gain", delta)).toBe("bon");
  });

  it("prendre 4,5 points de gras en prise de masse n'est pas « stable »", () => {
    // Le cas qui avait fait retenir 0 pour la prise de masse : l'écran
    // annonçait « stable » sous +4,5 points, devant le membre.
    const delta = computeMetricDelta(
      "bodyFat",
      "percent",
      { value: 22, weight: 74.5 },
      { value: 26.5, weight: 78 },
    );
    expect(delta.value).toBe(4.5);
    expect(delta.state).toBe("hausse");
    expect(judgeMetricDelta("bodyFat", "percent", "mass-gain", delta)).toBe("mauvais");
  });

  it("prendre du poids : bon en prise de masse, mauvais en perte de poids", () => {
    const delta = computeMetricDelta("weight", "kg", { value: 74.5, weight: 74.5 }, { value: 76.8, weight: 76.8 });
    expect(delta.state).toBe("hausse");
    expect(judgeMetricDelta("weight", "kg", "mass-gain", delta)).toBe("bon");
    expect(judgeMetricDelta("weight", "kg", "weight-loss", delta)).toBe("mauvais");
  });

  it("la masse osseuse s'affiche mais ne se juge pas", () => {
    expect(desiredDirection("boneMass", "kg", "weight-loss")).toBe(0);
    const delta = computeMetricDelta("boneMass", "kg", { value: 2.4, weight: 74.5 }, { value: 2.9, weight: 70.3 });
    expect(delta.state).toBe("hausse");
    expect(judgeMetricDelta("boneMass", "kg", "weight-loss", delta)).toBe("neutre");
  });

  it("un écart sous le seuil reste neutre, quel que soit le sens attendu", () => {
    const delta = computeMetricDelta("weight", "kg", { value: 70, weight: 70 }, { value: 70.1, weight: 70.1 });
    expect(delta.state).toBe("stable");
    expect(judgeMetricDelta("weight", "kg", "weight-loss", delta)).toBe("neutre");
  });
});

describe("bodyMetricUnits — compareReadings, l'entrée unique des vues", () => {
  it("rend les deux colonnes, l'écart et le verdict d'un seul appel", () => {
    const cmp = compareReadings("muscleMass", "percent", "weight-loss", MUSCLE_DEPART, MUSCLE_AUJOURDHUI);
    expect(cmp.unit).toBe("%");
    expect(cmp.decimals).toBe(1);
    expect(cmp.start.value).toBe(59.2);
    expect(cmp.current.value).toBe(62.9);
    expect(cmp.delta.value).toBe(3.7);
    expect(cmp.verdict).toBe("bon");
  });

  it("propage l'impossibilité au lieu d'inventer un verdict", () => {
    const cmp = compareReadings("bodyFat", "kg", "weight-loss", DEPART, { value: 31.1, weight: null });
    expect(cmp.current.value).toBeNull();
    expect(cmp.delta.unavailable).toBe(true);
    expect(cmp.verdict).toBe("neutre");
  });
});

describe("bodyMetricUnits — mémorisation du choix d'unité", () => {
  it("relit les deux écritures possibles, rejette le reste", () => {
    expect(parseStoredUnit("kg")).toBe("kg");
    expect(parseStoredUnit("percent")).toBe("percent");
    expect(parseStoredUnit("%")).toBe("percent"); // forme héritée de la maquette
    expect(parseStoredUnit("livres")).toBeNull();
    expect(parseStoredUnit(null)).toBeNull();
    expect(parseStoredUnit(undefined)).toBeNull();
  });

  it("écrit une forme qu'elle sait relire", () => {
    expect(parseStoredUnit(serializeUnit("kg"))).toBe("kg");
    expect(parseStoredUnit(serializeUnit("percent"))).toBe("percent");
  });
});
