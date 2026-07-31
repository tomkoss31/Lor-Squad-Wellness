import { describe, it, expect } from "vitest";
import { personalize, normalizeRichContent, defaultRichContent } from "../campaignContent";

describe("personalize", () => {
  it("remplace {prénom} par le prénom", () => {
    expect(personalize("Bonjour {prénom}, ça va ?", "Marie")).toBe("Bonjour Marie, ça va ?");
  });
  it("accepte {prenom} sans accent", () => {
    expect(personalize("Salut {prenom} !", "Karim")).toBe("Salut Karim !");
  });
  it("nettoie « Bonjour , » quand le prénom manque", () => {
    expect(personalize("Bonjour {prénom},", null)).toBe("Bonjour,");
    expect(personalize("Bonjour {prénom},", "")).toBe("Bonjour,");
  });
  it("laisse le texte intact sans balise", () => {
    expect(personalize("Aucune balise ici", "Marie")).toBe("Aucune balise ici");
  });
});

describe("normalizeRichContent", () => {
  it("renvoie le défaut sur une entrée vide/invalide", () => {
    expect(normalizeRichContent(null)).toEqual(defaultRichContent());
    expect(normalizeRichContent([])).toEqual(defaultRichContent());
    expect(normalizeRichContent("x")).toEqual(defaultRichContent());
  });
  it("préserve les champs valides et complète les manquants", () => {
    const r = normalizeRichContent({ hero_title: "Salut", blocks: [{ title: "T", body: "B" }] });
    expect(r.hero_title).toBe("Salut");
    expect(r.blocks[0]).toMatchObject({ title: "T", body: "B", emoji: "" });
    expect(r.offer.enabled).toBe(false);
    expect(r.cta.enabled).toBe(false);
  });
});
