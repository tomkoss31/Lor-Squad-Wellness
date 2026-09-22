import { describe, expect, it } from "vitest";
import type { Client } from "../../../types/domain";
import {
  jourParis,
  joursDeLaSemaine,
  normaliserApercu,
  nomClient,
  pourRecherche,
  repartirApercu,
  type ApercuJournal,
} from "../apercuJournal";

// Noms inventés : le dépôt est public.
function cliente(id: string, firstName: string, lastName: string, extra: Partial<Client> = {}): Client {
  return { id, firstName, lastName, lifecycleStatus: "active", ...extra } as Client;
}

function apercu(clientId: string, joursNotes: number, derniere: string, protMoy = 60): ApercuJournal {
  return { clientId, jours: [0, 0, 0, 0, 0, 1, 1], joursNotes, protMoy, derniere };
}

describe("normaliserApercu", () => {
  it("lit les lignes de la base", () => {
    const sortie = normaliserApercu([
      { client_id: "a", jours: [0, 2, 1, 0, 1, 1, 1], jours_notes: 4, prot_moy: 71, derniere: "2026-09-22" },
    ]);
    expect(sortie).toEqual([{ clientId: "a", jours: [0, 2, 1, 0, 1, 1, 1], joursNotes: 4, protMoy: 71, derniere: "2026-09-22" }]);
  });

  it("écarte une ligne sans cliente et répare une semaine abîmée", () => {
    const sortie = normaliserApercu([
      { jours: [1], jours_notes: 1 },
      { client_id: "b", jours: [1, 9, "x"], jours_notes: null, prot_moy: null, derniere: null },
    ]);
    expect(sortie).toEqual([{ clientId: "b", jours: [1, 0, 0, 0, 0, 0, 0], joursNotes: 0, protMoy: null, derniere: null }]);
  });

  it("rend une liste vide pour une réponse inattendue", () => {
    expect(normaliserApercu(null)).toEqual([]);
    expect(normaliserApercu({})).toEqual([]);
  });
});

describe("repartirApercu", () => {
  const clientes = [
    cliente("1", "Zoé", "Martin"),
    cliente("2", "Hélène", "Petit"),
    cliente("3", "Anna", "Roux"),
    cliente("4", "Julie", "Blanc", { lifecycleStatus: "paused" }),
    cliente("5", "Carla", "Noir"),
  ];

  it("met en tête celles qui notent, les plus régulières d'abord", () => {
    const { tiennent } = repartirApercu(clientes, [apercu("3", 2, "2026-09-22"), apercu("1", 5, "2026-09-21")], "");
    expect(tiennent.map((l) => l.client.id)).toEqual(["1", "3"]);
  });

  it("à régularité égale, celle qui a noté le plus récemment passe devant", () => {
    const { tiennent } = repartirApercu(clientes, [apercu("3", 2, "2026-09-20"), apercu("5", 2, "2026-09-22")], "");
    expect(tiennent.map((l) => l.client.id)).toEqual(["5", "3"]);
  });

  it("sans recherche, le bas de liste ne garde que les clientes actives, par ordre alphabétique", () => {
    const { autres } = repartirApercu(clientes, [apercu("1", 3, "2026-09-22")], "");
    expect(autres.map((l) => l.client.id)).toEqual(["3", "5", "2"]);
  });

  it("avec une recherche, on trouve tout le monde, accents compris", () => {
    const { tiennent, autres } = repartirApercu(clientes, [], "helene");
    expect(tiennent).toEqual([]);
    expect(autres.map((l) => l.client.id)).toEqual(["2"]);
    expect(repartirApercu(clientes, [], "blanc").autres.map((l) => l.client.id)).toEqual(["4"]);
  });

  it("ignore une cliente du journal absente de la liste (hors périmètre)", () => {
    const { tiennent } = repartirApercu(clientes, [apercu("inconnue", 4, "2026-09-22")], "");
    expect(tiennent).toEqual([]);
  });
});

describe("jourParis / joursDeLaSemaine", () => {
  it("prend le jour de Paris, pas celui de Londres (0 h 30 à Paris = encore la veille en UTC)", () => {
    expect(jourParis(Date.UTC(2026, 8, 21, 22, 30))).toBe("2026-09-22");
    expect(jourParis(Date.UTC(2026, 8, 21, 21, 30))).toBe("2026-09-21");
  });

  it("donne les 7 jours jusqu'à aujourd'hui, dans l'ordre de la base", () => {
    // Le mardi 22/09/2026 : de mercredi 16 à mardi 22.
    const semaine = joursDeLaSemaine("2026-09-22");
    expect(semaine.map((j) => j.lettre).join("")).toBe("MJVSDLM");
    expect(semaine[0].nom).toBe("mercredi");
    expect(semaine[6].nom).toBe("mardi");
  });
});

describe("nomClient / pourRecherche", () => {
  it("assemble le nom complet", () => {
    expect(nomClient({ firstName: " Anna ", lastName: "Roux" })).toBe("Anna Roux");
    expect(nomClient({ firstName: "", lastName: "" })).toBe("—");
  });
  it("normalise pour chercher", () => {
    expect(pourRecherche("  Hélène   PETIT ")).toBe("helene petit");
  });
});
