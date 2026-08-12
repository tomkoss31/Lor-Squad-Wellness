import { describe, expect, it } from "vitest";
import { lienWhatsApp, numeroPourWhatsApp } from "../lienWhatsApp";

// wa.me refuse le zéro initial : « 0679448759 » n'ouvre aucune conversation.
// Ces tests portent les VRAIS numéros de l'équipe (12/08/2026) — s'ils
// tombent, c'est que quelqu'un a repassé un numéro national dans un lien.

describe("le numéro passé à wa.me", () => {
  it("convertit un numéro français national en international", () => {
    expect(numeroPourWhatsApp("0679448759")).toBe("33679448759");
    expect(numeroPourWhatsApp("0630860345")).toBe("33630860345");
    expect(numeroPourWhatsApp("0769409822")).toBe("33769409822");
  });

  it("accepte les espaces et la ponctuation de saisie", () => {
    expect(numeroPourWhatsApp("06 79 44 87 59")).toBe("33679448759");
    expect(numeroPourWhatsApp("06.79.44.87.59")).toBe("33679448759");
    expect(numeroPourWhatsApp(" 06-79-44-87-59 ")).toBe("33679448759");
  });

  it("laisse un numéro déjà international tranquille", () => {
    expect(numeroPourWhatsApp("+33679448759")).toBe("33679448759");
    expect(numeroPourWhatsApp("+33 6 79 44 87 59")).toBe("33679448759");
    expect(numeroPourWhatsApp("0033679448759")).toBe("33679448759");
  });

  it("gère un numéro étranger sans le franciser", () => {
    // Belgique, saisi à l'internationale : on n'ajoute pas 33 par-dessus.
    expect(numeroPourWhatsApp("+32470123456")).toBe("32470123456");
  });

  it("renvoie null quand il n'y a rien d'exploitable", () => {
    expect(numeroPourWhatsApp("")).toBeNull();
    expect(numeroPourWhatsApp(null)).toBeNull();
    expect(numeroPourWhatsApp(undefined)).toBeNull();
    expect(numeroPourWhatsApp("—")).toBeNull();
    expect(numeroPourWhatsApp("06 12")).toBeNull(); // trop court
  });

  it("ne rend JAMAIS un numéro commençant par zéro", () => {
    // Le cœur du piège : c'est exactement ce que wa.me refuse.
    ["0679448759", "06 79 44 87 59", "0033679448759"].forEach((saisie) => {
      expect(numeroPourWhatsApp(saisie)?.startsWith("0")).toBe(false);
    });
  });
});

describe("le lien complet", () => {
  it("vise la bonne personne et porte le message", () => {
    const lien = lienWhatsApp("0679448759", "Salut Thomas !");
    expect(lien).toBe("https://wa.me/33679448759?text=Salut%20Thomas%20!");
  });

  it("sans numéro, retombe sur le partage générique plutôt qu'une erreur", () => {
    // Mieux vaut « à qui veux-tu envoyer ? » qu'un « numéro invalide ».
    expect(lienWhatsApp(null, "Coucou")).toBe("https://wa.me/?text=Coucou");
  });
});
