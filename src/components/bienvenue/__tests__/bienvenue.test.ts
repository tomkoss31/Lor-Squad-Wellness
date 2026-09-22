import { describe, expect, it } from "vitest";
import { appareilDepuisUA, GESTES_MAISONS, ICONE_ACCUEIL, MAISON_DE, ORDRE_MAISONS } from "../bienvenue";

describe("les gestes des maisons sur l'accueil", () => {
  it("le coaching mène à Découvrir, le club à son site, le bar à sa commande (hors de l'app)", () => {
    expect(GESTES_MAISONS.nutrition.href).toBe("/decouvrir");
    expect(GESTES_MAISONS.bbc.href).toBe("/club");
    expect(GESTES_MAISONS.shakes.externe).toBe(true);
    expect(GESTES_MAISONS.shakes.href.startsWith("https://")).toBe(true);
  });
});

describe("les trois maisons", () => {
  it("une membre du club voit d'abord son club, une cliente en coaching son coaching", () => {
    expect(ORDRE_MAISONS.club[0]).toBe(MAISON_DE.club);
    expect(ORDRE_MAISONS.coaching[0]).toBe(MAISON_DE.coaching);
  });

  it("les trois maisons sont toujours là, une seule fois", () => {
    for (const ordre of Object.values(ORDRE_MAISONS)) {
      expect([...ordre].sort()).toEqual(["bbc", "nutrition", "shakes"]);
    }
  });
});

describe("appareilDepuisUA", () => {
  it("reconnaît un Android", () => {
    expect(appareilDepuisUA("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/128 Mobile")).toBe("android");
  });
  it("prend l'iPhone par défaut (iPhone, iPad, inconnu)", () => {
    expect(appareilDepuisUA("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1")).toBe("iphone");
    expect(appareilDepuisUA("")).toBe("iphone");
  });
});

describe("l'icône d'écran d'accueil", () => {
  it("une membre du club installe « Mon club », les autres La Base 360", () => {
    expect(ICONE_ACCUEIL.club.nom).toBe("Mon club");
    expect(ICONE_ACCUEIL.club.src).toContain("breakfast-club");
    expect(ICONE_ACCUEIL.coaching.src).toContain("labase360");
  });
});
