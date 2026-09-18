// Les créneaux qu'on PROPOSE doivent suivre les horaires du club — sinon la
// feuille « Caler » ouvre le dimanche et le samedi après-midi (vu en prod le
// 18/09/2026 : dimanche 8 h–18 h proposé alors que le club ne reçoit pas).
import { describe, expect, it } from "vitest";
import { auPlusTot, creneauxDuJour, type ReglagesHoraires } from "../agendaClub";

// Les vrais réglages du club de Verdun, réduits : semaine 8 h–15 h (mardi aussi
// 16 h–18 h), samedi 8 h 30–11 h, dimanche absent = repos.
const reglages: ReglagesHoraires = {
  hours: {
    "1": [["08:00", "15:00"]],
    "2": [["08:00", "15:00"], ["16:00", "18:00", "2"]],
    "6": [["08:30", "11:00"]],
  },
  hours_by_date: { "2026-09-23": [["09:00", "10:00"]] },
  holidays: ["2026-09-25"],
};

// Un lundi, un mardi, un mercredi (sans horaire), un samedi, un dimanche.
const LUNDI = "2026-09-21";
const MARDI = "2026-09-22";
const SAMEDI = "2026-09-26";
const DIMANCHE = "2026-09-20";
const jadis = new Date("2026-09-01T00:00:00+02:00").getTime();

describe("les créneaux proposés suivent les horaires du club", () => {
  it("le dimanche, aucun créneau : le club ne reçoit pas", () => {
    expect(creneauxDuJour([], DIMANCHE, 60, jadis, reglages)).toHaveLength(0);
  });

  it("le samedi s'arrête à 11 h — un bilan d'1 h ne commence pas à 10 h 30", () => {
    const l = creneauxDuJour([], SAMEDI, 60, jadis, reglages);
    expect(l[0]).toBe(8.5);
    expect(l[l.length - 1]).toBe(10);
  });

  it("un jour de fermeture ne propose rien, même s'il a des horaires habituels", () => {
    expect(creneauxDuJour([], "2026-09-25", 60, jadis, reglages)).toHaveLength(0);
  });

  it("en semaine on s'arrête à 15 h, et les deux plages du mardi se suivent", () => {
    const lundi = creneauxDuJour([], LUNDI, 60, jadis, reglages);
    expect(lundi[lundi.length - 1]).toBe(14);
    const mardi = creneauxDuJour([], MARDI, 60, jadis, reglages);
    expect(mardi).toContain(16);
    expect(mardi[mardi.length - 1]).toBe(17);
  });

  it("un horaire d'exception sur une date précise prime sur l'habituel", () => {
    expect(creneauxDuJour([], "2026-09-23", 30, jadis, reglages)).toEqual([9, 9.5]);
  });

  it("« hors horaires » rouvre 8 h – 18 h, y compris le dimanche", () => {
    const l = creneauxDuJour([], DIMANCHE, 60, jadis, reglages, true);
    expect(l[0]).toBe(8);
    expect(l[l.length - 1]).toBe(17);
  });

  it("sans horaires réglés, on ne bloque personne : 8 h – 18 h", () => {
    expect(creneauxDuJour([], DIMANCHE, 60, jadis, null)).not.toHaveLength(0);
    expect(creneauxDuJour([], DIMANCHE, 60, jadis, { hours: {} })).not.toHaveLength(0);
  });

  it("un créneau déjà pris reste exclu", () => {
    const pris = [{ debut: new Date("2026-09-21T08:00:00+02:00").getTime(), fin: new Date("2026-09-21T09:00:00+02:00").getTime() }];
    const l = creneauxDuJour(pris, LUNDI, 60, jadis, reglages);
    expect(l).not.toContain(8);
    expect(l).toContain(9);
  });

  it("« au plus tôt » saute le dimanche et tombe sur le lundi à 8 h", () => {
    const parCoach = new Map([["c1", []]]);
    expect(auPlusTot(parCoach, [DIMANCHE, LUNDI], 60, jadis, reglages)).toEqual({ jour: LUNDI, coachId: "c1", heure: 8 });
  });
});
