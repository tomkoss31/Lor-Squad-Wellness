import { describe, it, expect } from "vitest";
import {
  estAConclure,
  rdvAConclure,
  retardEnJours,
  EFFET_ISSUE,
  FENETRE_A_CONCLURE_MS,
} from "../aConclure";
import { REPONSE_PAR_CLE } from "../qualification";

const MAINTENANT = new Date("2026-08-28T16:00:00.000Z");
const ilYA = (ms: number) => new Date(MAINTENANT.getTime() - ms).toISOString();
const MIN = 60_000;
const JOUR = 24 * 60 * 60 * 1000;

const rdv = (over: Partial<{ id: string; slotStart: string; status: string }> = {}) => ({
  id: "r1",
  slotStart: ilYA(2 * JOUR),
  status: "confirmed",
  ...over,
});

describe("estAConclure", () => {
  it("un rendez-vous passé et non soldé attend une réponse", () => {
    expect(estAConclure(rdv(), MAINTENANT)).toBe(true);
  });

  it("une demande jamais acceptée mais passée compte aussi", () => {
    // Les 2 « requested » passés trouvés en base le 28/08 : ils étaient morts.
    expect(estAConclure(rdv({ status: "requested" }), MAINTENANT)).toBe(true);
  });

  it("un rendez-vous à venir n'est pas à conclure", () => {
    expect(estAConclure(rdv({ slotStart: new Date(MAINTENANT.getTime() + JOUR).toISOString() }), MAINTENANT)).toBe(false);
  });

  it("pendant la grâce de 15 min, on ne demande pas encore", () => {
    expect(estAConclure(rdv({ slotStart: ilYA(5 * MIN) }), MAINTENANT)).toBe(false);
  });

  it("juste après la grâce, on demande", () => {
    expect(estAConclure(rdv({ slotStart: ilYA(20 * MIN) }), MAINTENANT)).toBe(true);
  });

  it.each(["honored", "no_show", "canceled"])("« %s » est déjà soldé", (status) => {
    expect(estAConclure(rdv({ status }), MAINTENANT)).toBe(false);
  });

  it("au-delà de 14 jours, le rendez-vous s'oublie", () => {
    expect(estAConclure(rdv({ slotStart: ilYA(FENETRE_A_CONCLURE_MS + JOUR) }), MAINTENANT)).toBe(false);
  });

  it("une date illisible ne fait pas planter", () => {
    expect(estAConclure(rdv({ slotStart: "pas-une-date" }), MAINTENANT)).toBe(false);
  });
});

describe("rdvAConclure", () => {
  it("ne garde que ceux à solder, le plus ancien d'abord", () => {
    const liste = [
      rdv({ id: "recent", slotStart: ilYA(1 * JOUR) }),
      rdv({ id: "soldé", slotStart: ilYA(3 * JOUR), status: "honored" }),
      rdv({ id: "vieux", slotStart: ilYA(5 * JOUR) }),
      rdv({ id: "futur", slotStart: new Date(MAINTENANT.getTime() + JOUR).toISOString() }),
    ];
    expect(rdvAConclure(liste, MAINTENANT).map((r) => r.id)).toEqual(["vieux", "recent"]);
  });

  it("liste vide → rien", () => {
    expect(rdvAConclure([], MAINTENANT)).toEqual([]);
  });
});

describe("retardEnJours", () => {
  it("donne un chiffre, pas un « récemment »", () => {
    expect(retardEnJours(rdv({ slotStart: ilYA(3 * JOUR) }), MAINTENANT)).toBe(3);
    expect(retardEnJours(rdv({ slotStart: ilYA(2 * MIN) }), MAINTENANT)).toBe(0);
  });
});

describe("EFFET_ISSUE — les trois issues", () => {
  it("« venue, elle démarre » sort du CRM et n'écrit pas de relance", () => {
    const e = EFFET_ISSUE.venue_demarre;
    expect(e.statutRdv).toBe("honored");
    expect(e.sortDuCrm).toBe(true);
    expect(e.reponseLead).toBeNull();
  });

  it("« venue, pas démarré » reste dans la file, sans mail automatique", () => {
    const e = EFFET_ISSUE.venue_pas_demarre;
    expect(e.statutRdv).toBe("honored");
    expect(e.sortDuCrm).toBe(false);
    expect(e.proposerMail).toBe(false);
  });

  it("« pas venue » marque le lapin et propose d'écrire", () => {
    const e = EFFET_ISSUE.pas_venue;
    expect(e.statutRdv).toBe("no_show");
    expect(e.sortDuCrm).toBe(false);
    expect(e.proposerMail).toBe(true);
  });

  it("les délais validés par Thomas : J+2 et J+7", () => {
    expect(REPONSE_PAR_CLE.pas_venue.jours).toBe(2);
    expect(REPONSE_PAR_CLE.venue_pas_demarre.jours).toBe(7);
  });

  it("les deux réponses renvoient bien dans la file (pas un placard)", () => {
    expect(REPONSE_PAR_CLE.pas_venue.statut).toBe("to_recontact");
    expect(REPONSE_PAR_CLE.venue_pas_demarre.statut).toBe("to_recontact");
  });

  it("aucune ne réutilise le libellé « pas de réponse », qui serait faux", () => {
    expect(REPONSE_PAR_CLE.pas_venue.resume).not.toMatch(/pas de réponse/i);
    expect(REPONSE_PAR_CLE.venue_pas_demarre.resume).not.toMatch(/pas de réponse/i);
  });
});
