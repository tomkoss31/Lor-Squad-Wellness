// =============================================================================
// resolveDuration — la cascade de durée d'un RDV (LOT 6.4).
//
//   1. la durée portée par le RDV       (le coach l'a choisie à la création)
//   2. le réglage « mes RDV durent X »  (par coach)
//   3. 45 minutes                        (dernier recours)
//
// Une erreur ici ne lève rien : elle dessine juste des blocs de la mauvaise
// hauteur, ou pire, un bloc géant qui écrase la grille.
// =============================================================================

import { describe, it, expect } from "vitest";
import { DEFAULT_RDV_MINUTES, resolveDuration } from "../calendarEvents";

describe("resolveDuration", () => {
  it("préfère la durée du RDV lui-même", () => {
    expect(resolveDuration(90, 30)).toBe(90);
  });

  it("retombe sur le réglage du coach quand le RDV n'a pas de durée", () => {
    expect(resolveDuration(null, 60)).toBe(60);
    expect(resolveDuration(undefined, 30)).toBe(30);
  });

  it("retombe sur 45 min quand ni l'un ni l'autre n'est renseigné", () => {
    expect(resolveDuration(null, null)).toBe(DEFAULT_RDV_MINUTES);
    expect(resolveDuration(undefined, undefined)).toBe(45);
  });

  it("ignore une durée aberrante portée par le RDV et passe au réglage du coach", () => {
    // Un 0 ou un négatif rendrait le bloc invisible ; 3000 min écraserait la grille.
    expect(resolveDuration(0, 60)).toBe(60);
    expect(resolveDuration(-30, 60)).toBe(60);
    expect(resolveDuration(3000, 60)).toBe(60);
    expect(resolveDuration(Number.NaN, 60)).toBe(60);
  });

  it("ignore un réglage coach aberrant et retombe sur le défaut", () => {
    expect(resolveDuration(null, 0)).toBe(45);
    expect(resolveDuration(null, 100000)).toBe(45);
    expect(resolveDuration(null, Number.POSITIVE_INFINITY)).toBe(45);
  });

  it("accepte les bornes exactes du domaine autorisé (5 à 480 min)", () => {
    expect(resolveDuration(5, null)).toBe(5);
    expect(resolveDuration(480, null)).toBe(480);
    expect(resolveDuration(481, null)).toBe(45);
    expect(resolveDuration(4, null)).toBe(45);
  });
});
