// Chantier Co-pilote V4 (2026-04-24).
// Tests unitaires des helpers purs utilisés par /co-pilote.

import { describe, expect, it } from "vitest";
import {
  greetingFor,
  moodForLoad,
  pvProgressPercent,
  daysRemainingInMonth,
  formatCountdown,
  conversionRatePercent,
} from "../copiloteHelpers";

describe("greetingFor", () => {
  it("retourne 'Bonne nuit' entre 23h et 5h", () => {
    expect(greetingFor(0)).toBe("Bonne nuit");
    expect(greetingFor(4)).toBe("Bonne nuit");
    expect(greetingFor(23)).toBe("Bonne nuit");
  });
  it("retourne 'Bonjour' entre 5h et 12h", () => {
    expect(greetingFor(5)).toBe("Bonjour");
    expect(greetingFor(9)).toBe("Bonjour");
    expect(greetingFor(11)).toBe("Bonjour");
  });
  it("retourne 'Bon après-midi' entre 12h et 18h", () => {
    expect(greetingFor(12)).toBe("Bon après-midi");
    expect(greetingFor(17)).toBe("Bon après-midi");
  });
  it("retourne 'Bonsoir' entre 18h et 23h", () => {
    expect(greetingFor(18)).toBe("Bonsoir");
    expect(greetingFor(22)).toBe("Bonsoir");
  });
});

describe("moodForLoad", () => {
  it("renvoie 'calm' si 0 événements", () => {
    const m = moodForLoad(0);
    expect(m.level).toBe("calm");
    expect(m.label).toContain("calme");
  });
  it("renvoie 'easy' entre 1 et 3 événements", () => {
    expect(moodForLoad(1).level).toBe("easy");
    expect(moodForLoad(3).level).toBe("easy");
  });
  it("renvoie 'productive' entre 4 et 6", () => {
    expect(moodForLoad(4).level).toBe("productive");
    expect(moodForLoad(6).level).toBe("productive");
  });
  it("renvoie 'intense' au-delà de 6", () => {
    expect(moodForLoad(7).level).toBe("intense");
    expect(moodForLoad(20).level).toBe("intense");
  });
});

describe("pvProgressPercent", () => {
  it("retourne 0 si target invalide", () => {
    expect(pvProgressPercent(5000, 0)).toBe(0);
    expect(pvProgressPercent(5000, -100)).toBe(0);
  });
  it("clamp à 100% max", () => {
    expect(pvProgressPercent(20_000, 13_000)).toBe(100);
  });
  it("arrondit au plus proche", () => {
    expect(pvProgressPercent(6500, 13_000)).toBe(50);
    expect(pvProgressPercent(6499, 13_000)).toBe(50); // round down
  });
  it("clamp à 0% min", () => {
    expect(pvProgressPercent(-100, 13_000)).toBe(0);
  });
});

describe("daysRemainingInMonth", () => {
  it("compte aujourd'hui inclus", () => {
    // 1er du mois en janvier → 31 jours restants (1..31).
    const firstJan = new Date(2026, 0, 1, 12, 0, 0);
    expect(daysRemainingInMonth(firstJan)).toBe(31);
  });
  it("dernier jour du mois = 1", () => {
    const lastFeb = new Date(2026, 1, 28, 12, 0, 0);
    expect(daysRemainingInMonth(lastFeb)).toBe(1);
  });
  it("milieu de mois", () => {
    const mid = new Date(2026, 3, 15, 12, 0, 0);
    // Avril a 30 jours → 30 - 15 + 1 = 16
    expect(daysRemainingInMonth(mid)).toBe(16);
  });
});

describe("formatCountdown", () => {
  const base = new Date("2026-04-24T10:00:00");
  it("renvoie 'maintenant' si < 1 minute", () => {
    expect(formatCountdown(new Date("2026-04-24T10:00:30"), base)).toBe("maintenant");
  });
  it("renvoie 'dans X min' si < 60 min", () => {
    expect(formatCountdown(new Date("2026-04-24T10:05:00"), base)).toBe("dans 5 min");
    expect(formatCountdown(new Date("2026-04-24T10:45:00"), base)).toBe("dans 45 min");
  });
  it("renvoie 'dans Xh' pour heures rondes", () => {
    expect(formatCountdown(new Date("2026-04-24T13:00:00"), base)).toBe("dans 3h");
  });
  it("renvoie 'dans Xh YY' pour heures+minutes", () => {
    expect(formatCountdown(new Date("2026-04-24T12:20:00"), base)).toBe("dans 2h 20");
  });
  it("renvoie 'dans X jours' si > 24h", () => {
    expect(formatCountdown(new Date("2026-04-26T10:00:00"), base)).toBe("dans 2 jours");
    expect(formatCountdown(new Date("2026-04-25T10:00:00"), base)).toBe("dans 1 jour");
  });
});

describe("conversionRatePercent", () => {
  it("retourne 0 si pas de bilans (pas de div/0)", () => {
    expect(conversionRatePercent(0, 5)).toBe(0);
  });
  it("calcule le ratio arrondi", () => {
    expect(conversionRatePercent(10, 6)).toBe(60);
    expect(conversionRatePercent(3, 2)).toBe(67); // arrondi à 67
    expect(conversionRatePercent(10, 0)).toBe(0);
  });
});
