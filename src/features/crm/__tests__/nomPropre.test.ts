// =============================================================================
// Écrire le nom des gens correctement.
//
// Les trois premiers cas reprennent la FORME de vraies lignes de la base de prod,
// relevées le 16/08 (noms remplacés) : c'est ce qui s'affichait en titre de fiche.
// =============================================================================

import { describe, expect, it } from "vitest";
import { nomPropre } from "../nomPropre";

describe("les cas réels de la base", () => {
  it("« claire lefranc » → « Claire Lefranc »", () => {
    expect(nomPropre("claire lefranc")).toBe("Claire Lefranc");
  });

  it("« Sonia Roche martel » → « Sonia Roche Martel »", () => {
    expect(nomPropre("Sonia Roche martel")).toBe("Sonia Roche Martel");
  });

  it("« DUPUIS » crié en majuscules → « Dupuis »", () => {
    expect(nomPropre("DUPUIS")).toBe("Dupuis");
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
    expect(nomPropre("  claire   lefranc  ")).toBe("Claire Lefranc");
  });
});
