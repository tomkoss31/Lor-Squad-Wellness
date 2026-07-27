// =============================================================================
// layoutDay — répartition en colonnes des RDV qui se chevauchent (LOT 6.3).
//
// Cette fonction décide si deux RDV se cachent l'un l'autre ou se partagent la
// largeur. Elle casse en silence : un mauvais calcul ne lève aucune erreur, il
// masque juste un rendez-vous. D'où ces tests.
// =============================================================================

import { describe, it, expect } from "vitest";
import { layoutDay, type CalendarEvent } from "../calendarEvents";

function ev(id: string, hhmm: string, durationMin = 45): CalendarEvent {
  const [h, m] = hhmm.split(":").map(Number);
  const start = new Date(2026, 6, 27, h, m, 0, 0);
  return {
    id,
    kind: "prospect",
    start,
    durationMin,
    title: id,
    ownerId: "coach-1",
    entry: {
      kind: "prospect",
      id,
      date: start.toISOString(),
      distributorId: "coach-1",
      // Le placement n'utilise que start/durationMin : un prospect minimal suffit.
      prospect: {} as never,
    },
  };
}

/** Deux blocs se recouvrent-ils réellement à l'écran ? */
function overlapsOnScreen(
  a: { start: Date; durationMin: number; column: number; columnCount: number },
  b: { start: Date; durationMin: number; column: number; columnCount: number },
): boolean {
  const aStart = a.start.getTime();
  const aEnd = aStart + a.durationMin * 60_000;
  const bStart = b.start.getTime();
  const bEnd = bStart + b.durationMin * 60_000;
  const timeOverlap = aStart < bEnd && bStart < aEnd;
  // Même largeur de grappe → même colonne = superposition visuelle.
  return timeOverlap && a.column === b.column;
}

describe("layoutDay", () => {
  it("laisse un RDV seul occuper toute la largeur", () => {
    const placed = layoutDay([ev("a", "09:00")]);
    expect(placed).toHaveLength(1);
    expect(placed[0].column).toBe(0);
    expect(placed[0].columnCount).toBe(1);
  });

  it("partage la largeur entre deux RDV à la même heure", () => {
    const placed = layoutDay([ev("a", "09:00"), ev("b", "09:00")]);
    expect(placed).toHaveLength(2);
    expect(placed.every((p) => p.columnCount === 2)).toBe(true);
    expect(new Set(placed.map((p) => p.column))).toEqual(new Set([0, 1]));
  });

  it("ne partage PAS la largeur quand les RDV se suivent sans se toucher", () => {
    // 09:00-09:45 puis 10:00-10:45 : aucun recouvrement, chacun pleine largeur.
    const placed = layoutDay([ev("a", "09:00"), ev("b", "10:00")]);
    expect(placed.every((p) => p.columnCount === 1)).toBe(true);
  });

  it("traite un RDV qui commence exactement à la fin du précédent comme non chevauchant", () => {
    // 09:00 + 45 min = 09:45, et le suivant démarre à 09:45 pile.
    const placed = layoutDay([ev("a", "09:00", 45), ev("b", "09:45", 45)]);
    expect(placed.every((p) => p.columnCount === 1)).toBe(true);
  });

  it("réutilise une colonne libérée à l'intérieur d'une même grappe", () => {
    // a 09:00-10:30 (long) · b 09:15-09:45 · c 10:00-10:20
    // b et c ne se chevauchent pas entre eux → c reprend la colonne de b.
    const placed = layoutDay([ev("a", "09:00", 90), ev("b", "09:15", 30), ev("c", "10:00", 20)]);
    const byId = Object.fromEntries(placed.map((p) => [p.event.id, p]));
    expect(byId.a.column).toBe(0);
    expect(byId.b.column).toBe(1);
    expect(byId.c.column).toBe(1);
    expect(placed.every((p) => p.columnCount === 2)).toBe(true);
  });

  it("ne laisse jamais deux RDV qui se chevauchent partager la même colonne", () => {
    const events = [
      ev("a", "09:00", 120),
      ev("b", "09:30", 60),
      ev("c", "09:45", 90),
      ev("d", "10:00", 30),
      ev("e", "14:00", 45),
      ev("f", "14:00", 45),
      ev("g", "14:00", 45),
    ];
    const placed = layoutDay(events);
    expect(placed).toHaveLength(events.length);
    for (let i = 0; i < placed.length; i += 1) {
      for (let j = i + 1; j < placed.length; j += 1) {
        const a = { ...placed[i].event, column: placed[i].column, columnCount: placed[i].columnCount };
        const b = { ...placed[j].event, column: placed[j].column, columnCount: placed[j].columnCount };
        expect(overlapsOnScreen(a, b)).toBe(false);
      }
    }
    // Les trois RDV de 14h forment une grappe distincte de celle du matin.
    const afternoon = placed.filter((p) => p.event.start.getHours() === 14);
    expect(afternoon.every((p) => p.columnCount === 3)).toBe(true);
  });

  it("n'oublie aucun RDV et ne dépend pas de l'ordre d'entrée", () => {
    const events = [ev("c", "11:00"), ev("a", "09:00"), ev("b", "09:15")];
    const placed = layoutDay(events);
    expect(placed.map((p) => p.event.id).sort()).toEqual(["a", "b", "c"]);
  });
});
