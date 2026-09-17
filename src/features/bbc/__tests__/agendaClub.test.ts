import { describe, expect, it } from "vitest";
import {
  aQualifier,
  cleJour,
  couleurCoach,
  couloirs,
  decalerJour,
  grilleMois,
  libelleSemaine,
  plageOuverture,
  heureDe,
  libelleJour,
  libelleMois,
  lundiDe,
  marqueDe,
  nomComplet,
  parJour,
  prenomSeul,
  semaineDe,
  versRdvClub,
  type RdvClub,
} from "../agenda/agendaClub";
import { fallbackOwnerColor } from "../../agenda/calendarEvents";

// Jeudi 17 septembre 2026, 10 h 45 — heure locale.
const MAINTENANT = new Date(2026, 8, 17, 10, 45).getTime();

function ligne(o: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    source: "prospect",
    id: "r1",
    coach_user_id: "romane",
    debut: new Date(2026, 8, 17, 10, 0).toISOString(),
    fin: new Date(2026, 8, 17, 11, 0).toISOString(),
    prenom: "Pauline",
    nom: "Roux",
    telephone: "0612345602",
    statut: "scheduled",
    nature: "bilan",
    ...o,
  };
}

describe("versRdvClub", () => {
  it("lit une ligne de la fonction", () => {
    const r = versRdvClub(ligne())!;
    expect(r.source).toBe("prospect");
    expect(r.coachId).toBe("romane");
    expect(r.nom).toBe("Roux");
  });

  it("rejette une source inconnue ou une date illisible", () => {
    expect(versRdvClub(ligne({ source: "autre" }))).toBeNull();
    expect(versRdvClub(ligne({ debut: "pas une date" }))).toBeNull();
  });

  it("un rendez-vous sans coach appartient au club", () => {
    expect(versRdvClub(ligne({ coach_user_id: null }))!.coachId).toBeNull();
  });

  it("une fin illisible retombe sur le début", () => {
    const r = versRdvClub(ligne({ fin: null }))!;
    expect(r.fin).toBe(r.debut);
  });
});

describe("le temps", () => {
  it("une clé de jour en heure locale", () => {
    expect(cleJour(new Date(2026, 8, 7))).toBe("2026-09-07");
    expect(heureDe(new Date(2026, 8, 17, 9, 5).toISOString())).toBe("09:05");
  });

  it("parle français", () => {
    expect(libelleMois(new Date(2026, 8, 1))).toBe("Septembre 2026");
    expect(libelleJour(new Date(2026, 8, 17))).toBe("jeudi 17 septembre");
  });

  it("la semaine commence le lundi", () => {
    expect(cleJour(lundiDe(new Date(2026, 8, 17)))).toBe("2026-09-14");
    expect(cleJour(lundiDe(new Date(2026, 8, 20)))).toBe("2026-09-14");
    expect(semaineDe(lundiDe(new Date(2026, 8, 17)))).toEqual([
      "2026-09-14", "2026-09-15", "2026-09-16", "2026-09-17", "2026-09-18", "2026-09-19", "2026-09-20",
    ]);
  });

  it("septembre 2026 tient en 5 semaines, du lundi 31 août au dimanche 4 octobre", () => {
    const g = grilleMois(2026, 8);
    expect(g).toHaveLength(5);
    expect(g[0][0]).toBe("2026-08-31");
    expect(g[4][6]).toBe("2026-10-04");
  });

  it("août 2026 commence un samedi : six semaines", () => {
    const g = grilleMois(2026, 7);
    expect(g).toHaveLength(6);
    expect(g[0][0]).toBe("2026-07-27");
    expect(g[5][0]).toBe("2026-08-31");
  });
});

describe("parJour", () => {
  it("range par jour et trie chaque jour par heure", () => {
    const tard = versRdvClub(ligne({ id: "tard", debut: new Date(2026, 8, 17, 15, 0).toISOString() }))!;
    const tot = versRdvClub(ligne({ id: "tot", debut: new Date(2026, 8, 17, 8, 0).toISOString() }))!;
    const demain = versRdvClub(ligne({ id: "demain", debut: new Date(2026, 8, 18, 9, 0).toISOString() }))!;
    const m = parJour([tard, demain, tot]);
    expect(m.get("2026-09-17")!.map((r) => r.id)).toEqual(["tot", "tard"]);
    expect(m.get("2026-09-18")!.map((r) => r.id)).toEqual(["demain"]);
  });
});

describe("ce qu'on écrit", () => {
  const r = versRdvClub(ligne())!;
  it("le prénom seul sur la pastille, le nom complet sur la fiche", () => {
    expect(prenomSeul(r)).toBe("Pauline");
    expect(nomComplet(r)).toBe("Pauline Roux");
  });
  it("ne rend jamais une chaîne vide", () => {
    expect(prenomSeul(versRdvClub(ligne({ prenom: "", nom: null }))!)).toBe("—");
  });
});

describe("la marque — trois tables, trois vocabulaires", () => {
  const p = (statut: string): RdvClub => versRdvClub(ligne({ statut }))!;
  const b = (statut: string): RdvClub => versRdvClub(ligne({ source: "reservation", statut }))!;

  it("un prospect", () => {
    expect(marqueDe(p("scheduled"))).toBeNull();
    expect(marqueDe(p("converted"))?.code).toBe("demarre");
    expect(marqueDe(p("done"))?.code).toBe("fait");
    expect(marqueDe(p("no_show"))?.code).toBe("pas_venue");
    expect(marqueDe(p("cold"))?.code).toBe("relance");
  });

  it("une réservation du site", () => {
    expect(marqueDe(b("confirmed"))).toBeNull();
    expect(marqueDe(b("honored"))?.libelle).toBe("venue");
    expect(marqueDe(b("no_show"))?.code).toBe("pas_venue");
  });

  it("un suivi n'a jamais de marque", () => {
    expect(marqueDe(versRdvClub(ligne({ source: "suivi", statut: "scheduled" }))!)).toBeNull();
  });
});

describe("à qualifier", () => {
  it("un rendez-vous passé sans marque saute aux yeux", () => {
    const hier = versRdvClub(ligne({ debut: new Date(2026, 8, 16, 10, 0).toISOString(), fin: new Date(2026, 8, 16, 11, 0).toISOString() }))!;
    expect(aQualifier(hier, MAINTENANT)).toBe(true);
    expect(aQualifier({ ...hier, statut: "done" }, MAINTENANT)).toBe(false);
  });

  it("pas un rendez-vous à venir, ni un suivi", () => {
    const demain = versRdvClub(ligne({ debut: new Date(2026, 8, 18, 10, 0).toISOString(), fin: new Date(2026, 8, 18, 11, 0).toISOString() }))!;
    expect(aQualifier(demain, MAINTENANT)).toBe(false);
    const suivi = versRdvClub(ligne({ source: "suivi", debut: new Date(2026, 8, 1, 10, 0).toISOString(), fin: new Date(2026, 8, 1, 10, 30).toISOString() }))!;
    expect(aQualifier(suivi, MAINTENANT)).toBe(false);
  });
});

describe("les horaires du club", () => {
  it("lit les formes qu'on trouve dans les réglages", () => {
    expect(plageOuverture("7h-11h")).toEqual({ debut: 7, fin: 11 });
    expect(plageOuverture("7h30-11h")).toEqual({ debut: 7.5, fin: 11 });
    expect(plageOuverture("08:00-15:00")).toEqual({ debut: 8, fin: 15 });
    expect(plageOuverture("8h → 15h")).toEqual({ debut: 8, fin: 15 });
  });

  it("ne rend rien plutôt que faux", () => {
    expect(plageOuverture("")).toBeNull();
    expect(plageOuverture(null)).toBeNull();
    expect(plageOuverture("fermé")).toBeNull();
    expect(plageOuverture("11h-7h")).toBeNull();
  });
});

describe("les couloirs", () => {
  const r = (id: string, h1: number, h2: number) => ({
    id,
    debut: new Date(2026, 8, 17, h1, 0).toISOString(),
    fin: new Date(2026, 8, 17, h2, 0).toISOString(),
  });

  it("deux rendez-vous qui se chevauchent prennent deux couloirs", () => {
    const { items, nb } = couloirs([r("a", 10, 11), r("b", 10, 11)]);
    expect(nb).toBe(2);
    expect(items.map((i) => i.couloir)).toEqual([0, 1]);
  });

  it("un rendez-vous qui commence quand l'autre finit reprend son couloir", () => {
    const { items, nb } = couloirs([r("a", 10, 11), r("b", 11, 12)]);
    expect(nb).toBe(1);
    expect(items.map((i) => i.couloir)).toEqual([0, 0]);
  });

  it("trie par heure de début, quel que soit l'ordre d'arrivée", () => {
    const { items } = couloirs([r("tard", 15, 16), r("tot", 8, 9)]);
    expect(items.map((i) => i.rdv.id)).toEqual(["tot", "tard"]);
  });

  it("une liste vide donne quand même un couloir", () => {
    expect(couloirs([]).nb).toBe(1);
  });
});

describe("naviguer", () => {
  it("décale d'un jour, d'une semaine, et passe les mois", () => {
    expect(decalerJour("2026-09-30", 1)).toBe("2026-10-01");
    expect(decalerJour("2026-09-14", 7)).toBe("2026-09-21");
    expect(decalerJour("2026-09-01", -1)).toBe("2026-08-31");
  });

  it("la semaine se lit d'un coup", () => {
    expect(libelleSemaine(new Date(2026, 8, 14))).toBe("14 – 20 sept.");
    expect(libelleSemaine(new Date(2026, 8, 28))).toBe("28 sept. – 4 oct.");
  });
});

describe("la couleur", () => {
  const coachs = [{ id: "mel", couleur: "#EC4899" }, { id: "tom", couleur: null }];

  it("celle que la coach a choisie", () => {
    expect(couleurCoach("mel", coachs)).toBe("#EC4899");
  });

  it("sinon LE MÊME repli que l'agenda classique", () => {
    expect(couleurCoach("tom", coachs)).toBe(fallbackOwnerColor("tom"));
    expect(couleurCoach("inconnue", coachs)).toBe(fallbackOwnerColor("inconnue"));
  });

  it("un rendez-vous sans coach reste neutre", () => {
    expect(couleurCoach(null, coachs)).toBe("var(--ls-bbc-sage)");
  });
});
