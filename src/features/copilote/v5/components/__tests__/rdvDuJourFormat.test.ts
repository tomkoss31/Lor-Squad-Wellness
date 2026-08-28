import { describe, it, expect } from "vitest";
import { formatDelai, heure, jourLabel } from "../RdvDuJour";

// Ancre fixe pour des tests déterministes (heure locale de la machine).
const at = (h: number, m: number, day = 28) => new Date(2026, 7, day, h, m, 0, 0); // août = mois 7

describe("formatDelai", () => {
  const now = at(16, 20);
  it("passé ou maintenant → « Maintenant »", () => {
    expect(formatDelai(at(16, 20), now)).toBe("Maintenant");
    expect(formatDelai(at(16, 10), now)).toBe("Maintenant");
  });
  it("moins d'une heure → minutes", () => {
    expect(formatDelai(at(16, 45), now)).toBe("Dans 25 min");
  });
  it("heures pleines", () => {
    expect(formatDelai(at(18, 20), now)).toBe("Dans 2 h");
  });
  it("heures + minutes, minutes sur deux chiffres", () => {
    expect(formatDelai(at(18, 30), now)).toBe("Dans 2 h 10");
    expect(formatDelai(at(17, 25), now)).toBe("Dans 1 h 05");
  });
});

describe("heure", () => {
  it("formate en « HH h MM »", () => {
    expect(heure(at(18, 30))).toBe("18 h 30");
    expect(heure(at(8, 0))).toBe("08 h 00");
  });
});

describe("jourLabel", () => {
  const now = at(16, 20, 28);
  it("le lendemain → « Demain · … »", () => {
    expect(jourLabel(at(8, 0, 29), now)).toBe("Demain · 08 h 00");
  });
  it("au-delà → jour abrégé + heure", () => {
    // 8 septembre 2026 (mardi)
    const r = jourLabel(new Date(2026, 8, 8, 10, 0), now);
    expect(r).toMatch(/·\s10 h 00$/);
    expect(r).toMatch(/sept/i);
  });
});
