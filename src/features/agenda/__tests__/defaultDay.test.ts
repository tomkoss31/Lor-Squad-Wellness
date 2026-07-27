// =============================================================================
// Le jour affiché par défaut sur téléphone (correctif 2026-07-27).
//
// Le défaut était le LUNDI de la semaine, toujours. Sur téléphone — donc pour
// la coach qui utilise le plus l'agenda — ouvrir la vue Semaine un jeudi
// affichait lundi, et le bouton « Aujourd'hui » ramenait au lundi.
//
// La règle testée ici est celle que la grille applique : aujourd'hui s'il
// tombe dans la semaine affichée, sinon le lundi de cette semaine.
// =============================================================================

import { describe, it, expect } from "vitest";
import { isSameDay, weekDays } from "../calendarEvents";

/** Réplique exacte de defaultDayFor dans AgendaWeekGrid. */
function defaultDayFor(anchor: Date, now: Date): Date {
  const list = weekDays(anchor);
  return list.find((d) => isSameDay(d, now)) ?? list[0];
}

describe("jour par défaut de la vue mobile", () => {
  it("choisit AUJOURD'HUI quand il tombe dans la semaine affichée", () => {
    // Semaine du lundi 27 juillet 2026 ; on est le jeudi 30.
    const jeudi = new Date(2026, 6, 30, 14, 0, 0);
    const jour = defaultDayFor(new Date(2026, 6, 27), jeudi);
    expect(jour.getDate()).toBe(30);
  });

  it("choisit le LUNDI quand la semaine affichée ne contient pas aujourd'hui", () => {
    // On navigue vers la semaine suivante : aucun jour n'est « aujourd'hui ».
    const jeudi = new Date(2026, 6, 30, 14, 0, 0);
    const jour = defaultDayFor(new Date(2026, 7, 3), jeudi);
    expect(jour.getDate()).toBe(3);
    expect(jour.getDay()).toBe(1);
  });

  it("tient le dimanche : il appartient à la semaine qui a commencé le lundi", () => {
    // Dimanche 2 août 2026 → semaine du lundi 27 juillet.
    const dimanche = new Date(2026, 7, 2, 9, 0, 0);
    const jour = defaultDayFor(new Date(2026, 6, 27), dimanche);
    expect(jour.getDate()).toBe(2);
    expect(jour.getMonth()).toBe(7);
  });

  it("ignore l'heure : un ancrage à 23h et un à 6h donnent le même jour", () => {
    const now = new Date(2026, 6, 30, 23, 45, 0);
    const a = defaultDayFor(new Date(2026, 6, 27, 23, 59, 0), now);
    const b = defaultDayFor(new Date(2026, 6, 27, 6, 0, 0), now);
    expect(a.toDateString()).toBe(b.toDateString());
    expect(a.getDate()).toBe(30);
  });

  it("ne renvoie jamais un jour hors de la semaine affichée", () => {
    const now = new Date(2026, 6, 30);
    for (let i = 0; i < 20; i += 1) {
      const anchor = new Date(2026, 6, 6 + i);
      const jour = defaultDayFor(anchor, now);
      const semaine = weekDays(anchor).map((d) => d.toDateString());
      expect(semaine).toContain(jour.toDateString());
    }
  });
});
