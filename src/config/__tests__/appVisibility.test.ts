import { describe, expect, it } from "vitest";
import {
  featureStage,
  isFeatureUnlocked,
  isFeatureVisible,
  STAGE_CONDITION,
  type FeatureKey,
} from "../appVisibility";

// Chantier « l'app d'un débutant » (2026-08-04). Ces règles décident de ce que
// voit quelqu'un qui ouvre l'app pour la première fois : elles méritent d'être
// verrouillées, d'autant qu'on ne peut pas les voir en tant qu'admin (un admin
// est toujours au palier « lancé »).

describe("paliers de démarrage", () => {
  it("le jour 1, on ne montre que le strict minimum", () => {
    // Ce qu'un débutant voit dès la première minute…
    expect(isFeatureUnlocked("nav.copilote", "demarrage")).toBe(true);
    expect(isFeatureUnlocked("nav.clients", "demarrage")).toBe(true);
    expect(isFeatureUnlocked("nav.messages", "demarrage")).toBe(true);
    expect(isFeatureUnlocked("nav.parametres", "demarrage")).toBe(true);

    // …et ce qu'il ne voit pas encore.
    expect(isFeatureUnlocked("nav.crm", "demarrage")).toBe(false);
    expect(isFeatureUnlocked("nav.agenda", "demarrage")).toBe(false);
    expect(isFeatureUnlocked("nav.business", "demarrage")).toBe(false);
  });

  it("les premiers contacts ouvrent le CRM et l'agenda", () => {
    expect(isFeatureUnlocked("nav.crm", "premiers_pas")).toBe(true);
    expect(isFeatureUnlocked("nav.agenda", "premiers_pas")).toBe(true);
    // Mais pas encore les outils business.
    expect(isFeatureUnlocked("nav.business", "premiers_pas")).toBe(false);
  });

  it("le 1er bilan ouvre les outils business", () => {
    expect(isFeatureUnlocked("nav.business", "en_route")).toBe(true);
    expect(isFeatureUnlocked("nav.developpement", "en_route")).toBe(true);
  });

  it("une fois lancé, plus aucun verrou de palier", () => {
    const keys: FeatureKey[] = [
      "nav.crm",
      "nav.agenda",
      "nav.business",
      "nav.developpement",
      "nav.copilote",
    ];
    for (const k of keys) {
      expect(isFeatureUnlocked(k, "lance")).toBe(true);
    }
  });

  it("les paliers sont cumulatifs — on ne re-verrouille jamais", () => {
    // Tout ce qui est ouvert à un palier reste ouvert aux suivants.
    const stages = ["demarrage", "premiers_pas", "en_route", "lance"] as const;
    const keys: FeatureKey[] = ["nav.crm", "nav.agenda", "nav.business", "nav.developpement"];
    for (const k of keys) {
      let seenUnlocked = false;
      for (const s of stages) {
        const open = isFeatureUnlocked(k, s);
        if (open) seenUnlocked = true;
        // une fois ouverte, jamais refermée
        if (seenUnlocked) expect(open).toBe(true);
      }
    }
  });

  it("chaque feature verrouillée sait dire QUAND elle s'ouvre", () => {
    // Sinon le débutant voit un cadenas sans explication — le contraire du but.
    const locked: FeatureKey[] = ["nav.crm", "nav.agenda", "nav.business", "nav.developpement"];
    for (const k of locked) {
      const stage = featureStage(k);
      expect(stage).not.toBeNull();
      expect(STAGE_CONDITION[stage!]).toBeTruthy();
    }
  });

  it("le palier ne remplace pas le niveau d'app : les deux se composent", () => {
    // `nav.developpement` est réservé au niveau « complet » : même au palier
    // « lancé », un compte en « essentiel » ne doit pas le voir.
    expect(isFeatureUnlocked("nav.developpement", "lance")).toBe(true);
    expect(isFeatureVisible("nav.developpement", "essentiel")).toBe(false);
    expect(isFeatureVisible("nav.developpement", "complet")).toBe(true);
  });
});
