// =============================================================================
// Les fenêtres de comparaison — là où les tableaux de bord mentent le plus.
//
// Deux pièges verrouillés ici : le jour pivot compté dans les DEUX périodes
// (qui gonfle tout), et le passage en UTC qui fait disparaître les visites du
// soir.
// =============================================================================

import { describe, expect, it } from "vitest";
import { PERIODES, duree, evolution, fenetreDe, jourIso } from "../periodes";

/** Jeudi 13 août 2026, 21 h 40 — volontairement le soir. */
const T0 = new Date("2026-08-13T21:40:00+02:00");

describe("jourIso", () => {
  it("reste sur le bon jour en soirée française", () => {
    // `toISOString()` aurait donné le 14 à partir de 22 h en été : toutes les
    // visites du soir auraient été comptées le lendemain.
    expect(jourIso(T0)).toBe("2026-08-13");
    expect(jourIso(new Date("2026-08-13T23:59:00+02:00"))).toBe("2026-08-13");
  });

  it("complète les zéros", () => {
    expect(jourIso(new Date("2026-01-05T12:00:00+01:00"))).toBe("2026-01-05");
  });
});

describe("fenetreDe", () => {
  it("« Jour » = aujourd'hui, comparé à hier", () => {
    const f = fenetreDe("jour", T0);
    expect(f.debut).toBe("2026-08-13");
    expect(f.precedent).toEqual({ debut: "2026-08-12", fin: "2026-08-12" });
  });

  it("« Semaine » = 7 jours, comparés aux 7 précédents", () => {
    const f = fenetreDe("semaine", T0);
    expect(f.debut).toBe("2026-08-07");
    expect(f.precedent).toEqual({ debut: "2026-07-31", fin: "2026-08-06" });
  });

  it("ne compte JAMAIS le jour pivot dans les deux périodes", () => {
    // Sans le −1, le 7 août serait à la fois le 1er jour de la période
    // courante et le dernier de la précédente : les deux chiffres gonflent et
    // l'écart affiché devient faux.
    const f = fenetreDe("semaine", T0);
    expect(f.precedent!.fin < f.debut!).toBe(true);
  });

  it("les deux fenêtres ont exactement la même durée", () => {
    for (const p of PERIODES) {
      if (p.jours === null) continue;
      const f = fenetreDe(p.cle, T0);
      const j = (a: string, b: string) =>
        Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000) + 1;
      expect(j(f.debut!, jourIso(T0)), p.cle).toBe(p.jours);
      expect(j(f.precedent!.debut, f.precedent!.fin), p.cle).toBe(p.jours);
    }
  });

  it("franchit proprement le changement de mois", () => {
    const debutSept = new Date("2026-09-02T10:00:00+02:00");
    const f = fenetreDe("semaine", debutSept);
    expect(f.debut).toBe("2026-08-27");
    expect(f.precedent).toEqual({ debut: "2026-08-20", fin: "2026-08-26" });
  });

  it("« Total » n'a ni début ni comparaison", () => {
    expect(fenetreDe("total", T0)).toEqual({ debut: null, precedent: null });
  });
});

describe("evolution", () => {
  it("calcule l'écart en pourcentage", () => {
    expect(evolution(120, 100)).toBe(20);
    expect(evolution(80, 100)).toBe(-20);
  });

  it("se tait plutôt que d'inventer une hausse depuis zéro", () => {
    // « +100 % » depuis 0 visite est un chiffre sans signification, et
    // « +∞ % » n'est pas affichable. On n'affiche rien.
    expect(evolution(42, 0)).toBeNull();
    expect(evolution(0, 0)).toBeNull();
  });
});

describe("duree", () => {
  it("écrit minutes:secondes", () => {
    expect(duree(124_000)).toBe("2:04");
    expect(duree(51_000)).toBe("0:51");
  });

  it("ne rend jamais NaN sur une donnée absente", () => {
    expect(duree(0)).toBe("0:00");
    expect(duree(Number.NaN)).toBe("0:00");
    expect(duree(-5)).toBe("0:00");
  });
});
