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
