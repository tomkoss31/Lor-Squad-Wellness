import { describe, expect, it } from "vitest";
import type { ReglagesHoraires } from "../agenda/agendaClub";
import type { ProduitCarte } from "../caisse/caisse";
import {
  ajouterDeQuoiTenir,
  deQuoiTenir,
  depuisLisible,
  f1AuBout,
  joursFermesApres,
  jourParis,
  lireMaisonClub,
  passerAuPack,
  phraseFermeture,
  prochaineFermeture,
  resumeStock,
  stockMaison,
  suggestionPack,
  tenirDejaAuPanier,
} from "../caisse/maison";

// Les horaires de Verdun (26/09) : semaine 8 h–15 h, samedi 8 h 30–11 h, dimanche fermé.
const VERDUN: ReglagesHoraires = {
  hours: {
    "1": [["08:00", "15:00"]],
    "2": [["08:00", "15:00"], ["16:00", "18:00", "2"]],
    "3": [["08:00", "15:00"]],
    "4": [["08:00", "15:00"]],
    "5": [["08:00", "15:00"], ["16:00", "17:00", "2"]],
    "6": [["08:30", "11:00"]],
  },
  holidays: ["2026-11-02"],
};

function p(id: string, prix: number, maison: ProduitCarte["maison"], over: Partial<ProduitCarte> = {}): ProduitCarte {
  return { id, rubrique: "petit_dej", nom: id, detail: null, prix, sorte: "emporter", ordre: 10, actif: true, maison, ...over };
}

const CARTE: ProduitCarte[] = [
  p("f1", 3.8, { f1: 1 }, { ordre: 10 }),
  p("pdm", 4.5, { pdm: 2 }, { ordre: 20 }),
  p("thermo", 4.1, { the: 3 }, { ordre: 30 }),
  p("pack", 31, { f1: 6, the: 6 }, { ordre: 40 }),
  p("packpdm", 44, { f1: 6, the: 6, pdm: 6 }, { ordre: 50 }),
  p("aloe", 54.5, { aloe: 47 }, { ordre: 60 }),
  p("pdm-dose", 1.9, null, { rubrique: "supplement", sorte: "upgrade" }),
  p("barre", 2.3, null, { rubrique: "encas" }),
];

describe("ce qu'elle a à la maison", () => {
  it("compte un sachet par jour sans club — le cas de la maquette", () => {
    // Vendredi 25/09 : 5 F1 + 3 PDM (6 doses). Samedi et dimanche chez elle, lundi au club.
    const s = stockMaison({ achats: [{ jour: "2026-09-25", doses: { f1: 5, pdm: 6 } }], visites: ["2026-09-25", "2026-09-28"] }, "2026-09-28");
    expect(s).not.toBeNull();
    expect(s!.depuis).toBe("2026-09-25");
    expect(s!.restant).toMatchObject({ f1: 3, pdm: 4 });
    expect(s!.sur).toMatchObject({ f1: 5, pdm: 6 });
    expect(s!.joursSansClub).toBe(2);
    expect(s!.jours).toEqual([
      { jour: "2026-09-26", auClub: false },
      { jour: "2026-09-27", auClub: false },
      { jour: "2026-09-28", auClub: true },
    ]);
  });

  it("ne descend jamais sous zéro, et un nouvel achat repart de ce qui reste", () => {
    const s = stockMaison({ achats: [{ jour: "2026-09-10", doses: { f1: 2 } }, { jour: "2026-09-20", doses: { f1: 3 } }], visites: [] }, "2026-09-26");
    expect(s!.sur.f1).toBe(3);
    expect(s!.restant.f1).toBe(0);
    expect(s!.depuis).toBe("2026-09-20");
  });

  it("l'achat du jour compte, la journée en cours ne retire rien", () => {
    const s = stockMaison({ achats: [{ jour: "2026-09-26", doses: { f1: 5 } }], visites: ["2026-09-26"] }, "2026-09-26");
    expect(s!.restant.f1).toBe(5);
    expect(s!.jours).toEqual([]);
  });

  it("rien d'emporté, ou un achat daté du futur : pas de stock", () => {
    expect(stockMaison(null, "2026-09-26")).toBeNull();
    expect(stockMaison({ achats: [{ jour: "2026-09-30", doses: { f1: 2 } }], visites: [] }, "2026-09-26")).toBeNull();
  });

  it("dit depuis quand", () => {
    expect(depuisLisible("2026-09-26", "2026-09-26")).toBe("aujourd'hui");
    expect(depuisLisible("2026-09-25", "2026-09-26")).toBe("hier");
    expect(depuisLisible("2026-09-25", "2026-09-28")).toBe("vendredi");
    expect(depuisLisible("2026-09-12", "2026-09-28")).toBe("le 12 septembre");
  });

  it("se dit en une ligne", () => {
    expect(resumeStock({ f1: 3, pdm: 4, the: 1 })).toBe("3 F1 · 4 doses de PDM · 1 thé");
  });
});

describe("les jours où le club est fermé", () => {
  it("samedi : dimanche est fermé", () => {
    expect(joursFermesApres(VERDUN, "2026-09-26")).toEqual(["2026-09-27"]);
    expect(phraseFermeture(["2026-09-27"], "2026-09-26")).toBe("Club fermé dimanche, elle revient lundi.");
  });

  it("vendredi : samedi est ouvert, rien à dire", () => {
    expect(joursFermesApres(VERDUN, "2026-09-25")).toEqual([]);
    expect(phraseFermeture([], "2026-09-25")).toBeNull();
  });

  it("un férié qui colle au dimanche fait deux jours", () => {
    const f = joursFermesApres(VERDUN, "2026-10-31");
    expect(f).toEqual(["2026-11-01", "2026-11-02"]);
    expect(phraseFermeture(f, "2026-10-31")).toBe("Club fermé dimanche et lundi, elle revient mardi.");
  });

  it("sans horaires réglés, on ne dit jamais « fermé »", () => {
    expect(joursFermesApres(null, "2026-09-26")).toEqual([]);
    expect(joursFermesApres({ hours: {} }, "2026-09-26")).toEqual([]);
    expect(prochaineFermeture(null, "2026-09-25")).toBeNull();
  });

  it("la prochaine fermeture dans les deux jours", () => {
    expect(prochaineFermeture(VERDUN, "2026-09-25")).toBe("2026-09-27");
    expect(prochaineFermeture(VERDUN, "2026-09-23")).toBeNull();
  });
});

describe("de quoi tenir", () => {
  it("un F1 par jour fermé, même sans rien à la maison", () => {
    expect(deQuoiTenir(1, null, CARTE)).toEqual({ f1: 1 });
  });

  it("déduit ce qu'elle a, et ajoute le PDM seulement si elle en prend", () => {
    const stock = stockMaison({ achats: [{ jour: "2026-09-25", doses: { f1: 2, pdm: 2 } }], visites: ["2026-09-25"] }, "2026-09-26");
    // Samedi 26 pas encore fini : il lui reste 2 F1 et 2 doses de PDM. Trois jours fermés.
    expect(deQuoiTenir(3, stock, CARTE)).toEqual({ f1: 1, pdm: 1 });
    expect(deQuoiTenir(2, stock, CARTE)).toEqual({});
  });

  it("ne double jamais ce que la coach a déjà mis", () => {
    expect(ajouterDeQuoiTenir({ f1: 2, barre: 1 }, { f1: 1, pdm: 1 })).toEqual({ f1: 2, barre: 1, pdm: 1 });
    expect(tenirDejaAuPanier({ f1: 2, pdm: 1 }, { f1: 1, pdm: 1 })).toBe(true);
    expect(tenirDejaAuPanier({ f1: 2 }, { f1: 1, pdm: 1 })).toBe(false);
    expect(tenirDejaAuPanier({}, {})).toBe(false);
  });
});

describe("le pack 6 jours", () => {
  it("5 F1 + 3 PDM : le pack avec PDM, 1 F1 et 6 thés en plus pour 11,50 €", () => {
    const s = suggestionPack({ f1: 5, pdm: 3 }, CARTE);
    expect(s?.pack.id).toBe("packpdm");
    expect(s?.supplement).toBe(11.5);
    expect(s?.enPlus).toBe("1 F1 et 6 thés");
    expect(passerAuPack({ f1: 5, pdm: 3, barre: 2 }, s!)).toEqual({ barre: 2, packpdm: 1 });
  });

  it("5 F1 seuls : le pack simple, 12 € de plus", () => {
    const s = suggestionPack({ f1: 5 }, CARTE);
    expect(s?.pack.id).toBe("pack");
    expect(s?.supplement).toBe(12);
  });

  it("jamais un pack qui n'apporte rien de plus au même prix", () => {
    // 6 F1 + 2 Thermo = 31 € : exactement le pack 6 jours, rien à gagner avec lui.
    // Reste le pack avec PDM : 6 doses de PDM en plus pour 13 € (3 sachets valent 13,50 €).
    const s = suggestionPack({ f1: 6, thermo: 2 }, CARTE);
    expect(s?.pack.id).toBe("packpdm");
    expect(s?.enPlus).toBe("6 doses de PDM");
    expect(s?.supplement).toBe(13);
    const sansPackPdm = CARTE.filter((x) => x.id !== "packpdm");
    expect(suggestionPack({ f1: 6, thermo: 2 }, sansPackPdm)).toBeNull();
  });

  it("pas de pack pour 3 F1, ni quand il coûte trop en plus", () => {
    expect(suggestionPack({ f1: 3 }, CARTE)).toBeNull();
    // 4 F1 = 15,20 € : le pack à 31 € coûterait 15,80 € de plus (> 40 %).
    expect(suggestionPack({ f1: 4 }, CARTE)).toBeNull();
  });
});

describe("son F1 arrive au bout (Contacter)", () => {
  const achat = { achats: [{ jour: "2026-09-21", doses: { f1: 3 } }], visites: ["2026-09-21", "2026-09-22"] };

  it("vendredi, un sachet ou moins, le club ferme dimanche : on la prévient", () => {
    // Lundi 3 F1, au club lundi et mardi, chez elle mercredi et jeudi : il en reste 1.
    expect(f1AuBout(achat, VERDUN, "2026-09-25")).toEqual({ reste: 1, ferme: "2026-09-27" });
  });

  it("plus assez de F1, mais la fermeture est trop loin", () => {
    const presqueVide = { achats: [{ jour: "2026-09-21", doses: { f1: 1 } }], visites: ["2026-09-21"] };
    expect(f1AuBout(presqueVide, VERDUN, "2026-09-23")).toBeNull();
  });

  it("assez de F1 : rien à dire", () => {
    expect(f1AuBout({ achats: [{ jour: "2026-09-24", doses: { f1: 5 } }], visites: ["2026-09-24"] }, VERDUN, "2026-09-25")).toBeNull();
  });

  it("jamais pour quelqu'un qui n'emporte plus rien depuis un mois", () => {
    const vieux = { achats: [{ jour: "2026-08-10", doses: { f1: 3 } }], visites: [] };
    expect(f1AuBout(vieux, VERDUN, "2026-09-25")).toBeNull();
  });
});

describe("lecture de la base", () => {
  it("relit club_maison sans planter", () => {
    const r = lireMaisonClub({
      horaires: { hours: { "1": [["08:00", "15:00"]] }, holidays: ["2026-11-02"] },
      membres: [
        { client_id: "m1", achats: [{ jour: "2026-09-25", doses: { f1: "5", pdm: 6, autre: 3 } }], visites: ["2026-09-25", 12] },
        { client_id: "m2", achats: [] },
        null,
      ],
    });
    expect(r.horaires?.holidays).toEqual(["2026-11-02"]);
    expect([...r.membres.keys()]).toEqual(["m1"]);
    expect(r.membres.get("m1")).toEqual({ achats: [{ jour: "2026-09-25", doses: { f1: 5, pdm: 6 } }], visites: ["2026-09-25"] });
  });

  it("donne le jour de Paris, pas celui du fuseau de l'appareil", () => {
    expect(jourParis(new Date("2026-09-26T23:30:00Z"))).toBe("2026-09-27");
  });
});
