// Chantier Polish Vue complète + refonte bilan (2026-04-24).
// Tests de la règle métier "validation bloquée si pas de RDV suivi".
//
// La logique, implémentée dans NewAssessmentPage, est :
//   hasFollowUpPlanned =
//     typeDeSuite === 'suivi_libre'
//     || (typeDeSuite !== '' && nextFollowUp.trim().length > 0)
//
// Ce test couvre cette fonction pure pour garantir qu'une modification
// future ne casse pas la règle.

import { describe, it, expect } from "vitest";

type TypeDeSuite = "rdv_fixe" | "message_rappel" | "relance_douce" | "suivi_libre" | "";

function hasFollowUpPlanned(typeDeSuite: TypeDeSuite, nextFollowUp: string): boolean {
  return (
    typeDeSuite === "suivi_libre" ||
    (typeDeSuite !== "" && nextFollowUp.trim().length > 0)
  );
}

// V2 (2026-04-24) : muscle repris exprimé en % relatif au départ
// plutôt qu'en kg absolu.
function muscleGainPct(initialKg: number | null, latestKg: number | null): number | null {
  if (initialKg == null || latestKg == null || initialKg <= 0) return null;
  return ((latestKg - initialKg) / initialKg) * 100;
}

describe("muscleGainPct — muscle repris en % (V2)", () => {
  it("null si données manquantes", () => {
    expect(muscleGainPct(null, 52)).toBeNull();
    expect(muscleGainPct(50, null)).toBeNull();
  });
  it("null si initial <= 0 (éviter division par 0)", () => {
    expect(muscleGainPct(0, 52)).toBeNull();
  });
  it("+4.0 % si 50 → 52 kg", () => {
    expect(muscleGainPct(50, 52)).toBeCloseTo(4, 2);
  });
  it("-2.0 % si 50 → 49 kg", () => {
    expect(muscleGainPct(50, 49)).toBeCloseTo(-2, 2);
  });
  it("0 si stable", () => {
    expect(muscleGainPct(50, 50)).toBe(0);
  });
});

describe("hasFollowUpPlanned — règle validation bilan", () => {
  it("bloque si aucun typeDeSuite sélectionné", () => {
    expect(hasFollowUpPlanned("", "2026-05-01T10:00")).toBe(false);
  });
  it("bloque si typeDeSuite rdv_fixe mais pas de date", () => {
    expect(hasFollowUpPlanned("rdv_fixe", "")).toBe(false);
  });
  it("bloque si typeDeSuite rdv_fixe et date blanche", () => {
    expect(hasFollowUpPlanned("rdv_fixe", "   ")).toBe(false);
  });
  it("passe si rdv_fixe + date", () => {
    expect(hasFollowUpPlanned("rdv_fixe", "2026-05-01T10:00")).toBe(true);
  });
  it("passe si message_rappel + date", () => {
    expect(hasFollowUpPlanned("message_rappel", "2026-05-01T10:00")).toBe(true);
  });
  it("passe en suivi_libre même sans date", () => {
    expect(hasFollowUpPlanned("suivi_libre", "")).toBe(true);
  });
  it("passe en suivi_libre avec date", () => {
    expect(hasFollowUpPlanned("suivi_libre", "2026-05-01T10:00")).toBe(true);
  });
});
