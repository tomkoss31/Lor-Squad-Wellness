import { describe, expect, it } from "vitest";
import { ACTIVATION_GATES, GO_PRO_STEPS, GO_PRO_TOTAL } from "../goProSteps";
import { STARTER_ACTIVATION_KEYS } from "../../../../data/starterPlan";

// Lot 1 du chantier « l'app d'un débutant » (2026-08-04) — LE FIL UNIQUE.
//
// Le parcours de démarrage était décrit à TROIS endroits qui divergeaient :
// le cockpit du coach, la grille Apprentissage de l'équipe, et le plan
// starter. D'où le « j'en ai 12 de coché ??? » de Thomas : trois compteurs,
// trois réponses différentes.
//
// Ces tests empêchent la divergence de revenir.

describe("le fil unique de progression", () => {
  it("le parcours fait bien 7 étapes numérotées de 1 à 7", () => {
    expect(GO_PRO_TOTAL).toBe(7);
    GO_PRO_STEPS.forEach((step, i) => {
      expect(step.n).toBe(i + 1);
    });
  });

  it("les numéros d'étape sont uniques et les clés aussi", () => {
    expect(new Set(GO_PRO_STEPS.map((s) => s.n)).size).toBe(GO_PRO_TOTAL);
    expect(new Set(GO_PRO_STEPS.map((s) => s.key)).size).toBe(GO_PRO_TOTAL);
  });

  it("les portes d'activation ne contiennent PLUS le HOM", () => {
    // Une réunion physique est invérifiable par l'app : elle bloquait
    // l'activation des 19 coachs (cochée par 2 d'entre eux).
    expect(ACTIVATION_GATES).not.toContain("premier_hom");
  });

  it("le plan starter et le cockpit s'accordent sur les portes", () => {
    // C'est LE test qui évite que le coach et son parrain lisent deux
    // progressions différentes.
    expect([...STARTER_ACTIVATION_KEYS].sort()).toEqual([...ACTIVATION_GATES].sort());
  });

  it("chaque porte d'activation appartient à une étape du parcours", () => {
    const allGates = GO_PRO_STEPS.flatMap((s) => s.gates);
    for (const gate of ACTIVATION_GATES) {
      expect(allGates).toContain(gate);
    }
  });

  it("« Relancer » a une clé de suivi — sinon l'étape ne se termine jamais", () => {
    const relancer = GO_PRO_STEPS.find((s) => s.key === "relancer");
    expect(relancer).toBeDefined();
    expect(relancer!.gates.length).toBeGreaterThan(0);
    // …mais elle ne doit PAS être une porte d'activation (compétence continue).
    for (const gate of relancer!.gates) {
      expect(ACTIVATION_GATES).not.toContain(gate);
    }
  });
});
