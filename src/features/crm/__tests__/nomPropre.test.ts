// =============================================================================
// Écrire le nom des gens correctement.
//
// Les trois premiers cas sont de VRAIES lignes de la base de prod, relevées le
// 16/08 : c'est ce qui s'affichait en gros en titre de fiche.
// =============================================================================

import { describe, expect, it } from "vitest";
import { nomPropre } from "../nomPropre";

describe("les cas réels de la base", () => {
  it("« claire dehaese » → « Claire Dehaese »", () => {
    expect(nomPropre("claire dehaese")).toBe("Claire Dehaese");
  });

  it("« Fatiha Lamri zeggar » → « Fatiha Lamri Zeggar »", () => {
    expect(nomPropre("Fatiha Lamri zeggar")).toBe("Fatiha Lamri Zeggar");
  });

  it("« PERRIN » crié en majuscules → « Perrin »", () => {
    expect(nomPropre("PERRIN")).toBe("Perrin");
  });
});

describe("les noms composés", () => {
  it.each([
    ["jean-marc", "Jean-Marc"],
    ["d'artagnan", "D'Artagnan"],
    ["anne-sophie leroy", "Anne-Sophie Leroy"],
    ["l’hermite", "L’Hermite"],
  ])("« %s » → « %s »", (brut, attendu) => {
    expect(nomPropre(brut)).toBe(attendu);
  });
});

describe("ce qu'on ne casse pas", () => {
  it("un nom déjà bien écrit ne bouge pas", () => {
    expect(nomPropre("Leslie Becker")).toBe("Leslie Becker");
  });

  it("une majuscule intérieure est un choix, pas une faute", () => {
    // Le piège de la capitalisation naïve : elle produit « Mcdonald ».
    expect(nomPropre("McDonald")).toBe("McDonald");
    expect(nomPropre("LeGall")).toBe("LeGall");
    expect(nomPropre("O'Brien")).toBe("O'Brien");
  });

  it("les particules restent basses au milieu, hautes en tête", () => {
    expect(nomPropre("jean de la fontaine")).toBe("Jean de la Fontaine");
    expect(nomPropre("de gaulle")).toBe("De Gaulle");
  });

  it("les accents survivent", () => {
    expect(nomPropre("mélanie éGLÉ")).toBe("Mélanie Églé");
  });
});

describe("les entrées vides", () => {
  it.each([null, undefined, "", "   "])("%s → chaîne vide, sans inventer de tiret", (v) => {
    expect(nomPropre(v)).toBe("");
  });

  it("les espaces en trop sont ravalés", () => {
    expect(nomPropre("  claire   dehaese  ")).toBe("Claire Dehaese");
  });
});
