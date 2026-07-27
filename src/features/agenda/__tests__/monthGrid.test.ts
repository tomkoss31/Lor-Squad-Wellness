// =============================================================================
// monthGridDays — la trame de la vue mois (LOT 6.5).
//
// Une erreur d'un jour ici décale toute la grille : les RDV apparaissent dans
// la mauvaise case, sans que rien ne plante. D'où ces tests, notamment sur les
// mois qui commencent un dimanche (le piège classique quand la semaine
// démarre le lundi).
// =============================================================================

import { describe, it, expect } from "vitest";
import { monthGridDays, startOfWeekMonday } from "../calendarEvents";

describe("monthGridDays", () => {
  it("renvoie toujours 42 jours, quel que soit le mois", () => {
    for (let m = 0; m < 12; m += 1) {
      expect(monthGridDays(new Date(2026, m, 15))).toHaveLength(42);
    }
    // Février 2027 : 28 jours commençant un lundi — le cas le plus court.
    expect(monthGridDays(new Date(2027, 1, 10))).toHaveLength(42);
  });

  it("commence toujours un lundi", () => {
    for (let m = 0; m < 12; m += 1) {
      const days = monthGridDays(new Date(2026, m, 15));
      expect(days[0].getDay()).toBe(1);
    }
  });

  it("contient tous les jours du mois affiché", () => {
    const days = monthGridDays(new Date(2026, 6, 15)); // juillet 2026, 31 jours
    const inJuly = days.filter((d) => d.getMonth() === 6).map((d) => d.getDate());
    expect(inJuly).toHaveLength(31);
    expect(inJuly[0]).toBe(1);
    expect(inJuly[30]).toBe(31);
  });

  it("gère un mois de 31 jours qui commence un dimanche", () => {
    // Le 1er mars 2026 est un dimanche : la grille doit démarrer le lundi
    // 23 février et couvrir le 31 mars sans déborder des 42 cases.
    const first = new Date(2026, 2, 1);
    expect(first.getDay()).toBe(0);
    const days = monthGridDays(first);
    expect(days).toHaveLength(42);
    expect(days[0].getMonth()).toBe(1); // février
    expect(days[0].getDate()).toBe(23);
    const inMarch = days.filter((d) => d.getMonth() === 2);
    expect(inMarch).toHaveLength(31);
  });

  it("donne la même grille pour n'importe quelle date du même mois", () => {
    const a = monthGridDays(new Date(2026, 6, 1)).map((d) => d.toDateString());
    const b = monthGridDays(new Date(2026, 6, 31)).map((d) => d.toDateString());
    expect(a).toEqual(b);
  });

  it("enchaîne les jours sans trou ni doublon", () => {
    const days = monthGridDays(new Date(2026, 9, 15));
    for (let i = 1; i < days.length; i += 1) {
      const diffDays = Math.round(
        (days[i].getTime() - days[i - 1].getTime()) / (24 * 60 * 60 * 1000),
      );
      // 1 jour d'écart partout — y compris à travers le changement d'heure
      // d'octobre, d'où l'arrondi.
      expect(diffDays).toBe(1);
    }
  });
});

describe("startOfWeekMonday", () => {
  it("renvoie le lundi de la semaine, dimanche compris", () => {
    // Dimanche 2 août 2026 → lundi 27 juillet, pas le 3 août.
    const sunday = new Date(2026, 7, 2);
    expect(sunday.getDay()).toBe(0);
    const monday = startOfWeekMonday(sunday);
    expect(monday.getDay()).toBe(1);
    expect(monday.getDate()).toBe(27);
    expect(monday.getMonth()).toBe(6);
  });

  it("est idempotent sur un lundi", () => {
    const monday = new Date(2026, 6, 27);
    expect(startOfWeekMonday(monday).toDateString()).toBe(monday.toDateString());
  });

  it("remet l'heure à minuit", () => {
    const d = startOfWeekMonday(new Date(2026, 6, 29, 17, 42, 13));
    expect([d.getHours(), d.getMinutes(), d.getSeconds()]).toEqual([0, 0, 0]);
  });
});
