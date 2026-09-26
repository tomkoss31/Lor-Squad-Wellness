import { describe, expect, it } from "vitest";
import type { ReglagesHoraires } from "../agenda/agendaClub";
import type { ProduitCarte } from "../caisse/caisse";
import {
  ajouterDeQuoiTenir,
  avecLeJournal,
  clubFerme,
  deQuoiTenir,
  depuisLisible,
  f1AuBout,
  joursFermesApres,
  jourParis,
  lireMaison,
  lireMaisonClub,
  notesDesLignes,
  passerAuPack,
  pastillesStock,
  phraseFermeture,
  phraseSachets,
  prochaineFermeture,
  resumeStock,
  sachetsDuJour,
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
      { jour: "2026-09-26", auClub: false, note: false },
      { jour: "2026-09-27", auClub: false, note: false },
      { jour: "2026-09-28", auClub: true, note: false },
    ]);
  });

  it("le journal fait foi quand elle note ses shakes (lot 5)", () => {
    const base = { achats: [{ jour: "2026-09-25", doses: { f1: 5, pdm: 6, the: 3 } }], visites: ["2026-09-25", "2026-09-28"] };
    // Samedi noté (un shake du club), dimanche rien noté : le même compte que la règle, mais « shake noté ».
    const a = stockMaison({ ...base, notes: { "2026-09-26": { f1: 1, pdm: 1 } } }, "2026-09-28");
    expect(a!.restant).toMatchObject({ f1: 3, pdm: 4, the: 1 });
    expect(a!.jours[0]).toEqual({ jour: "2026-09-26", auClub: false, note: true });
    // Deux shakes notés samedi : deux sachets partis ce jour-là. Le thé garde la règle.
    const b = stockMaison({ ...base, notes: { "2026-09-26": { f1: 2, pdm: 2 } } }, "2026-09-28");
    expect(b!.restant).toMatchObject({ f1: 2, pdm: 3, the: 1 });
  });

  it("un shake au lait ne touche pas au PDM ; un sachet entier en prend deux doses", () => {
    const base = { achats: [{ jour: "2026-09-25", doses: { f1: 5, pdm: 6 } }], visites: ["2026-09-25"] };
    // Samedi : F1 + lait. Dimanche : F1 + un sachet de PDM. Lundi : on regarde.
    const s = stockMaison({ ...base, notes: { "2026-09-26": { f1: 1, pdm: 0 }, "2026-09-27": { f1: 1, pdm: 2 } } }, "2026-09-28");
    expect(s!.restant).toMatchObject({ f1: 3, pdm: 4 });
  });

  it("du PDM noté à part, sans shake F1 : la règle garde le F1, le PDM prend le plus grand", () => {
    const base = { achats: [{ jour: "2026-09-25", doses: { f1: 5, pdm: 6 } }], visites: ["2026-09-25"] };
    const s = stockMaison({ ...base, notes: { "2026-09-26": { f1: 0, pdm: 2 } } }, "2026-09-27");
    expect(s!.restant).toMatchObject({ f1: 4, pdm: 4 });
    expect(s!.jours).toEqual([{ jour: "2026-09-26", auClub: false, note: false }]);
  });

  it("noté aujourd'hui : un sachet de moins tout de suite", () => {
    const s = stockMaison({ achats: [{ jour: "2026-09-26", doses: { f1: 5 } }], visites: [], notes: { "2026-09-27": { f1: 1, pdm: 1 } } }, "2026-09-27");
    // Samedi 26 : achat (pas pointée, rien noté → un sachet compté) ; dimanche 27 : noté.
    expect(s!.restant.f1).toBe(3);
    expect(s!.jours).toEqual([{ jour: "2026-09-27", auClub: false, note: true }]);
  });

  it("un shake noté un soir de club compte aussi", () => {
    const s = stockMaison({ achats: [{ jour: "2026-09-21", doses: { f1: 3 } }], visites: ["2026-09-21", "2026-09-22"], notes: { "2026-09-22": { f1: 1, pdm: 1 } } }, "2026-09-23");
    expect(s!.restant.f1).toBe(2);
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
    expect(r.membres.get("m1")).toEqual({ achats: [{ jour: "2026-09-25", doses: { f1: 5, pdm: 6 } }], visites: ["2026-09-25"], notes: {} });
  });

  it("relit les notes du journal, sans jamais planter", () => {
    const d = lireMaison({
      achats: [{ jour: "2026-09-25", doses: { f1: 5 } }],
      visites: [],
      notes: { "2026-09-26": { f1: 1, pdm: "2" }, "2026-09-27": { f1: 0, pdm: 0 }, "pas-un-jour": { f1: 1 }, "2026-09-28": 3 },
    });
    expect(d?.notes).toEqual({ "2026-09-26": { f1: 1, pdm: 2 } });
  });

  it("donne le jour de Paris, pas celui du fuseau de l'appareil", () => {
    expect(jourParis(new Date("2026-09-26T23:30:00Z"))).toBe("2026-09-27");
  });
});

describe("le journal qui décompte (lot 5)", () => {
  const ligne = (aliment: string | null, origine = "membre", quantite = 1) => ({ aliment, origine, quantite });

  it("lit ses shakes et son PDM, jamais le shake pré-rempli au club", () => {
    expect(notesDesLignes([ligne("f1demi"), ligne("f1lait", "noaly"), ligne("pdmplein"), ligne("f1demi", "club"), ligne("barre"), ligne(null)])).toEqual({ f1: 2, pdm: 3 });
    expect(notesDesLignes([ligne("f1plein", "membre", 2)])).toEqual({ f1: 2, pdm: 4 });
    // Une clé qui ressemble à une propriété d'objet ne compte pour rien.
    expect(notesDesLignes([ligne("constructor"), ligne("toString")])).toEqual({ f1: 0, pdm: 0 });
  });

  it("son journal ouvert remplace les notes du jour : le compteur suit tout de suite", () => {
    const d = { achats: [{ jour: "2026-09-25", doses: { f1: 5, pdm: 6 } }], visites: ["2026-09-25"], notes: { "2026-09-27": { f1: 2, pdm: 2 } } };
    expect(avecLeJournal(d, "2026-09-27", [ligne("f1demi")])?.notes).toEqual({ "2026-09-27": { f1: 1, pdm: 1 } });
    // Elle retire son shake : la note du jour disparaît, la règle reprend.
    expect(avecLeJournal(d, "2026-09-27", [])?.notes).toEqual({});
    expect(avecLeJournal(null, "2026-09-27", [])).toBeNull();
  });

  it("« Shake F1 · tes sachets du club » : un jour sans pointage, avec du F1 chez elle", () => {
    // Vendredi 25 : 5 F1 + 3 PDM au club. Samedi 26, chez elle, rien de noté encore.
    const d = { achats: [{ jour: "2026-09-25", doses: { f1: 5, pdm: 6 } }], visites: ["2026-09-25"] };
    const stock = stockMaison(d, "2026-09-26");
    expect(sachetsDuJour(d, stock, "2026-09-26", [])).toEqual({ aliment: "f1demi", f1: 5 });
    // Un café noté ne change rien ; un shake F1 noté (le sien ou celui du club), si.
    expect(sachetsDuJour(d, stock, "2026-09-26", [{ aliment: "cafe" }])).not.toBeNull();
    expect(sachetsDuJour(d, stock, "2026-09-26", [{ aliment: "f1lait" }])).toBeNull();
    // Pointée au club ce jour-là : elle a eu son shake au club.
    expect(sachetsDuJour({ ...d, visites: ["2026-09-25", "2026-09-26"] }, stock, "2026-09-26", [])).toBeNull();
  });

  it("sans PDM chez elle, le shake proposé est au lait ; sans F1, rien", () => {
    const d = { achats: [{ jour: "2026-09-25", doses: { f1: 6, the: 6 } }], visites: ["2026-09-25"] };
    expect(sachetsDuJour(d, stockMaison(d, "2026-09-26"), "2026-09-26", [])).toEqual({ aliment: "f1lait", f1: 6 });
    const vide = { achats: [{ jour: "2026-09-20", doses: { f1: 1 } }], visites: [] };
    expect(sachetsDuJour(vide, stockMaison(vide, "2026-09-26"), "2026-09-26", [])).toBeNull();
    expect(sachetsDuJour(null, null, "2026-09-26", [])).toBeNull();
  });

  it("un toucher = noté ET un sachet de moins (la maquette : il en reste 4)", () => {
    const d = { achats: [{ jour: "2026-09-25", doses: { f1: 5, pdm: 6 } }], visites: ["2026-09-25"] };
    const apres = avecLeJournal(d, "2026-09-26", [ligne("f1demi")]);
    const stock = stockMaison(apres, "2026-09-26");
    expect(stock?.restant).toMatchObject({ f1: 4, pdm: 5 });
    expect(pastillesStock(stock!.restant)).toEqual(["4 sachets F1", "5 doses PDM"]);
    expect(phraseSachets(4)).toBe("Il te reste 4 sachets de F1 à la maison.");
  });

  it("dit ce qu'elle a, au singulier comme au pluriel", () => {
    expect(pastillesStock({ f1: 1, pdm: 1, the: 1, aloe: 1 })).toEqual(["1 sachet F1", "1 dose PDM", "1 thé", "1 dose d'aloé"]);
    expect(pastillesStock({ f1: 0, the: 3, aloe: 40 })).toEqual(["3 thés", "40 doses d'aloé"]);
    expect(phraseSachets(1)).toBe("Il te reste 1 sachet de F1 à la maison.");
    expect(phraseSachets(0)).toBe("C'était ton dernier sachet de F1.");
  });

  it("club fermé aujourd'hui : dimanche et fériés, jamais sans horaires", () => {
    expect(clubFerme(VERDUN, "2026-09-27")).toBe(true);
    expect(clubFerme(VERDUN, "2026-09-28")).toBe(false);
    expect(clubFerme({ ...VERDUN, holidays: ["2026-09-28"] }, "2026-09-28")).toBe(true);
    expect(clubFerme(null, "2026-09-27")).toBe(false);
  });
});
