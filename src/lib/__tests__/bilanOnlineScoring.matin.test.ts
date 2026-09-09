// =============================================================================
// La 7e dimension « Le matin » (bilan « Mon point de départ », 2026-09-09).
//
// Ce que ce fichier protège vraiment : le moteur de score est PARTAGÉ entre le
// bilan La Base 360 (6 dimensions, 13 bilans déjà en base) et le bilan
// Breakfast Club (7). La page « Résultat Bilan » relit les anciens bilans avec
// le moteur d'aujourd'hui — si le matin s'invitait dans un bilan qui n'a jamais
// répondu à ces questions, le score global et le top 3 des 13 bilans existants
// changeraient sous les pieds du coach, sans que rien ne casse bruyamment.
//
// D'où le premier test, qui est le plus important du fichier.
// =============================================================================

import { describe, expect, it } from "vitest";
import { computeBilanResults, type ScoringInput } from "../bilanOnlineScoring";

/**
 * Un bilan La Base 360 : aucune question sur le matin n'a été posée.
 *
 * Ce ne sont pas des valeurs inventées — ce sont exactement les réponses
 * saisies pendant le parcours joué à blanc sur labase360.fr le 09/09/2026,
 * qui a rendu 34/100 et le trio activité / alimentation / hydratation. Les
 * attendus ci-dessous sont donc vérifiables à l'écran, pas seulement dans
 * le moteur.
 */
const SANS_MATIN: ScoringInput = {
  meals_balanced: "no",
  water_per_day: "1-3",
  coffee_per_day: "3-4",
  soda_per_day: "2-3",
  alcohol_per_week: "0",
  sleep_quality: "meh",
  sleep_hours: "<6",
  stress_level: 5,
  mental_load: "heavy",
  job_feeling: "routine",
  social_circle: "couple",
  active_daily: "no",
  sport_frequency: "never",
};

describe("un bilan qui n'a pas été interrogé sur le matin", () => {
  it("garde exactement ses 6 dimensions", () => {
    const r = computeBilanResults(SANS_MATIN);
    expect(r.dimensions.map((d) => d.key)).toEqual([
      "food", "water", "sleep", "mind", "activity", "social",
    ]);
  });

  it("garde son score global et son top 3 au point près", () => {
    const r = computeBilanResults(SANS_MATIN);
    expect(r.globalScore).toBe(34);
    expect(r.priorities.map((p) => p.key)).toEqual(["activity", "food", "water"]);
  });

  it("n'est pas non plus altéré par une chaîne vide", () => {
    // Le formulaire initialise ses champs à "" — une réponse vide ne doit pas
    // compter comme une réponse.
    const r = computeBilanResults({
      ...SANS_MATIN,
      breakfast_freq: "", breakfast_time: "", breakfast_type: "", breakfast_holds: "",
    });
    expect(r.dimensions).toHaveLength(6);
    expect(r.globalScore).toBe(34);
  });
});

describe("un bilan Breakfast Club", () => {
  // Le même profil, plus les quatre questions du matin. C'est Sylvie, 59 ans,
  // Verdun — le profil joué pendant l'audit du 09/09.
  const SYLVIE: ScoringInput = {
    ...SANS_MATIN,
    breakfast_freq: "sometimes",
    breakfast_time: "7to9",
    breakfast_type: "sweet",
    breakfast_holds: "no",
  };

  it("gagne la dimension du matin, en tête de liste", () => {
    const r = computeBilanResults(SYLVIE);
    expect(r.dimensions).toHaveLength(7);
    expect(r.dimensions[0].key).toBe("morning");
  });

  it("fait entrer le matin dans les trois priorités", () => {
    // Tout l'intérêt du chantier : chez ce profil, le matin passe devant
    // l'hydratation. « Bois plus d'eau » se lit partout ; « ton petit-déj ne
    // tient pas jusqu'à midi » est un diagnostic.
    const r = computeBilanResults(SYLVIE);
    expect(r.priorities.map((p) => p.key)).toContain("morning");
    expect(r.priorities.map((p) => p.key)).not.toContain("water");
  });

  it("suffit d'une seule réponse pour que la dimension existe", () => {
    const r = computeBilanResults({ ...SANS_MATIN, breakfast_freq: "never" });
    expect(r.dimensions).toHaveLength(7);
  });
});

describe("l'échelle du matin", () => {
  const note = (m: Partial<ScoringInput>) =>
    computeBilanResults({ ...SANS_MATIN, ...m })
      .dimensions.find((d) => d.key === "morning")!.score;

  it("classe le petit-déjeuner qui tient au-dessus de celui qui ne tient pas", () => {
    const tient = note({ breakfast_freq: "daily", breakfast_type: "savory", breakfast_holds: "yes" });
    const pasTient = note({ breakfast_freq: "daily", breakfast_type: "savory", breakfast_holds: "no" });
    expect(tient).toBeGreaterThan(pasTient);
  });

  it("ne récompense pas la régularité toute seule", () => {
    // Une viennoiserie tous les jours à 7h, c'est régulier — et ça ne tient
    // pas. Ça doit noter moins qu'un petit-déjeuner salé occasionnel.
    const viennoiserieQuotidienne = note({
      breakfast_freq: "daily", breakfast_time: "before7",
      breakfast_type: "sweet", breakfast_holds: "no",
    });
    const saleDeTempsEnTemps = note({
      breakfast_freq: "sometimes", breakfast_time: "7to9",
      breakfast_type: "savory", breakfast_holds: "yes",
    });
    expect(saleDeTempsEnTemps).toBeGreaterThan(viennoiserieQuotidienne);
  });

  it("met « jamais de petit-déjeuner » tout en bas", () => {
    expect(note({ breakfast_freq: "never" })).toBeLessThan(20);
  });

  it("reste dans les bornes, même en cumulant tous les bonus ou tous les malus", () => {
    const max = note({
      breakfast_freq: "daily", breakfast_time: "7to9",
      breakfast_type: "savory", breakfast_holds: "yes",
    });
    const min = note({
      breakfast_freq: "never", breakfast_time: "varies",
      breakfast_type: "coffee_only", breakfast_holds: "no",
    });
    expect(max).toBeLessThanOrEqual(100);
    expect(min).toBeGreaterThanOrEqual(0);
  });
});
