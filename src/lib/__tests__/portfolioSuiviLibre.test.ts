// Le prochain rendez-vous d'une cliente en « suivi libre » (22/09/2026).
//
// Vécu : Gwen, membre du club en suivi libre, ne pouvait pas recevoir de
// rendez-vous depuis sa fiche standard — la fiche cachait TOUT rendez-vous
// d'une cliente en suivi libre, même posé à la main, et reproposait
// « Planifier » en boucle. Le suivi libre reste hors relances automatiques,
// mais un rendez-vous calé à la main se montre.

import { describe, expect, it } from "vitest";
import { getClientActiveFollowUp } from "../portfolio";
import type { Client, FollowUp } from "../../types/domain";

const HEURE = 3_600_000;
const iso = (decalageMs: number) => new Date(Date.now() + decalageMs).toISOString();

function cliente(overrides: Partial<Client> = {}): Client {
  return {
    id: "gwen",
    firstName: "Gwen",
    lastName: "B.",
    distributorId: "melanie",
    distributorName: "Mélanie",
    status: "active",
    lifecycleStatus: "active",
    freeFollowUp: true,
    // La date figée de la fiche, restée sur l'ancien suivi : jamais montrée.
    nextFollowUp: iso(-24 * HEURE),
    assessments: [],
    ...overrides,
  } as Client;
}

function suivi(overrides: Partial<FollowUp>): FollowUp {
  return {
    id: "s1",
    clientId: "gwen",
    clientName: "Gwen B.",
    dueDate: iso(48 * HEURE),
    type: "Suivi terrain",
    status: "scheduled",
    programTitle: "",
    lastAssessmentDate: "",
    ...overrides,
  } as FollowUp;
}

describe("getClientActiveFollowUp — cliente en suivi libre", () => {
  it("rien quand son seul suivi est celui d'avant la bascule (inactive)", () => {
    expect(getClientActiveFollowUp(cliente(), [suivi({ status: "inactive", dueDate: iso(-24 * HEURE) })])).toBeNull();
  });

  it("montre le rendez-vous posé à la main", () => {
    const r = getClientActiveFollowUp(cliente(), [suivi({ dueDate: iso(48 * HEURE) })]);
    expect(r?.id).toBe("s1");
  });

  it("ne remplace jamais sa date par la date figée de la fiche", () => {
    const quand = iso(48 * HEURE);
    expect(getClientActiveFollowUp(cliente(), [suivi({ dueDate: quand })])?.dueDate).toBe(quand);
  });

  it("le garde pendant la grâce de 15 min, plus après", () => {
    expect(getClientActiveFollowUp(cliente(), [suivi({ dueDate: iso(-10 * 60_000) })])).not.toBeNull();
    expect(getClientActiveFollowUp(cliente(), [suivi({ dueDate: iso(-2 * HEURE) })])).toBeNull();
  });

  it("jamais une relance : le suivi libre reste hors relances", () => {
    expect(getClientActiveFollowUp(cliente(), [suivi({ status: "pending" })])).toBeNull();
  });

  it("jamais le suivi d'une autre cliente", () => {
    expect(getClientActiveFollowUp(cliente(), [suivi({ clientId: "autre" })])).toBeNull();
  });
});
