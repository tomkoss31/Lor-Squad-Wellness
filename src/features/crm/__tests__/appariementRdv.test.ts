import { describe, expect, it } from "vitest";
import { cleIdentite } from "../appariementRdv";

describe("cleIdentite", () => {
  it("LE BUG DU 21/08 : deux Manon differentes ne doivent PAS se confondre", () => {
    const legrand = cleIdentite("Manon", "Legrand");
    const perrin = cleIdentite("Manon", "PERRIN");
    expect(legrand).not.toBe(perrin);
    expect(legrand).toBe("manon legrand");
    expect(perrin).toBe("manon perrin");
  });

  it("sans nom de famille, on n'apparie pas — c'est tout le correctif", () => {
    // Le cas du prospect « Thomas » qui heritait du rendez-vous d'essai de
    // Thomas : cote reservation, le nom de famille etait vide.
    expect(cleIdentite("Thomas", "")).toBeNull();
    expect(cleIdentite("Thomas", null)).toBeNull();
    expect(cleIdentite("Thomas", "   ")).toBeNull();
    expect(cleIdentite("", "Veyrat")).toBeNull();
  });

  it("la meme personne reste appariee malgre la casse et les accents", () => {
    expect(cleIdentite("claire", "dehaese")).toBe(cleIdentite("CLAIRE", "Dehaese"));
    expect(cleIdentite("Mélanie", "Dupré")).toBe(cleIdentite("MELANIE", "dupre"));
  });

  it("les espaces en trop ne creent pas deux personnes", () => {
    expect(cleIdentite("  Jean-Luc ", " De  La Tour ")).toBe("jean-luc de la tour");
  });
});
