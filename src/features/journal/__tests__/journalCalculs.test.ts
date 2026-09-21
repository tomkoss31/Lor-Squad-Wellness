import { describe, expect, it } from "vitest";
import {
  aRetenir,
  chercher,
  creneauANoter,
  creneauDeLHeure,
  defisDuJour,
  eauAtteinte,
  frequenceHabituel,
  habituelsDuCreneau,
  kcalDe,
  litres,
  niveauDe,
  normaliser,
  planFinDeJournee,
  protAliment,
  protHabituel,
  resume,
  suggestions,
  texteKcal,
  verresObjectif,
  type Aliment,
  type EtatJour,
  type Habituel,
  type SemaineCoach,
} from "../journalCalculs";

// Un extrait fidèle du catalogue en base (valeurs CIQUAL / étiquettes Herbalife FR).
const A = (x: Partial<Aliment> & { cle: string; nom: string }): Aliment => ({
  famille: null, herbalife: false, prot_portion: null, prot_100g: null, portions: null, unite: null, indice: null, rangs: {}, ...x,
});
const CATALOGUE: Aliment[] = [
  A({ cle: "f1demi", nom: "Shake F1 + ½ sachet PDM", famille: "f1", herbalife: true, prot_portion: 18, rangs: { pdj: 1, enc: 5 } }),
  A({ cle: "f1plein", nom: "Shake F1 + 1 sachet PDM (28 g)", famille: "f1", herbalife: true, prot_portion: 25.5, rangs: { pdj: 2 } }),
  A({ cle: "barre", nom: "Barre aux protéines", herbalife: true, prot_portion: 10, rangs: { enc: 1 } }),
  A({ cle: "achieve", nom: "Barre Achieve (sport)", herbalife: true, prot_portion: 21, rangs: { enc: 2 } }),
  A({ cle: "pdmdemi", nom: "PDM · ½ sachet en shake", famille: "pdm", herbalife: true, prot_portion: 7.5, rangs: { enc: 3 } }),
  A({ cle: "pdmplein", nom: "PDM · 1 sachet en shake (28 g)", famille: "pdm", herbalife: true, prot_portion: 15, rangs: { enc: 4 } }),
  A({ cle: "fromage_blanc0", nom: "Fromage blanc 0 %", prot_100g: 7.95, portions: [100, 150, 200], rangs: { pdj: 20, enc: 20 } }),
  A({ cle: "skyr", nom: "Skyr nature", prot_100g: 10, portions: [100, 150], rangs: { pdj: 21, enc: 21 } }),
  A({ cle: "oeuf", nom: "Œuf", prot_100g: 13.5, portions: [50, 100, 150], rangs: { pdj: 23, repas: 5 } }),
  A({ cle: "poulet", nom: "Poulet (blanc), cuit", prot_100g: 30.1, portions: [100, 150, 200], rangs: { repas: 1 } }),
  A({ cle: "poisson_blanc", nom: "Poisson blanc (cabillaud), cuit", prot_100g: 23.1, portions: [100, 130, 160], rangs: { repas: 2 } }),
  A({ cle: "pates", nom: "Pâtes, cuites", prot_100g: 3.99, portions: [100, 150, 200], rangs: { repas: 9 } }),
];

const jour = (x: Partial<EtatJour> = {}): EtatJour => ({
  jour: "2026-09-22", aujourdhui: "2026-09-22",
  objectifs: { poids: 69, coef: 1.2, proteines: 83, eau_l: 2.3 },
  lignes: [], veille: [], verres: 0, boisson_club: false, activite: null, humeur: null, remarque: null, xp_total: 0,
  ...x,
});
const L = (creneau: EtatJour["lignes"][number]["creneau"], prot_g: number, origine: "membre" | "club" = "membre", libelle = "x") =>
  ({ id: `${creneau}-${prot_g}`, creneau, aliment: "x", libelle, grammes: null, quantite: 1, prot_g, origine });

describe("l'eau (1 L par 30 kg, la boisson du club comptée)", () => {
  it("69 kg : 9 verres sans club, 8 avec la boisson du club", () => {
    expect(verresObjectif(2.3, false)).toBe(9);
    expect(verresObjectif(2.3, true)).toBe(8);
  });
  it("9 verres de 25 cl valent l'objectif de 2,3 L", () => {
    expect(eauAtteinte(2.3, 9, false)).toBe(true);
    expect(eauAtteinte(2.3, 8, false)).toBe(false);
    expect(eauAtteinte(2.3, 8, true)).toBe(true);
    expect(eauAtteinte(2.3, 7, true)).toBe(false);
  });
  it("compte les litres au centilitre près", () => {
    expect(litres(4, true)).toBe(1.4);
    expect(litres(6, false)).toBe(1.5);
  });
});

describe("les protéines", () => {
  it("portion fixe × quantité, ou grammes × valeur pour 100 g", () => {
    expect(protAliment(CATALOGUE[2], null, 2)).toBe(20);
    expect(protAliment(CATALOGUE[9], 150)).toBe(45.2);
  });
});

describe("les défis du jour", () => {
  it("le shake pré-rempli par le club ne compte pas comme « journée notée »", () => {
    const d = defisDuJour(jour({ lignes: [L("pdj", 18, "club")] }));
    expect(d.find((x) => x.cle === "journal_note")?.atteint).toBe(false);
  });
  it("journée complète = petit-déj + déjeuner + dîner + au moins un encas", () => {
    const sansEncas = defisDuJour(jour({ lignes: [L("pdj", 18), L("dej", 40), L("din", 30)] }));
    expect(sansEncas.find((x) => x.cle === "journal_complete")?.atteint).toBe(false);
    const avec = defisDuJour(jour({ lignes: [L("pdj", 18), L("enc2", 10), L("dej", 40), L("din", 30)] }));
    expect(avec.find((x) => x.cle === "journal_complete")?.atteint).toBe(true);
    expect(avec.find((x) => x.cle === "journal_proteines")?.atteint).toBe(true);
    expect(avec.find((x) => x.cle === "journal_proteines")?.libelle).toBe("83 g de prot");
  });
  it("sans bilan pesé, pas d'objectif protéines (donc pas de défi atteint par erreur)", () => {
    const d = defisDuJour(jour({ objectifs: { poids: null, coef: 1.2, proteines: null, eau_l: 2 }, lignes: [L("dej", 200)] }));
    expect(d.find((x) => x.cle === "journal_proteines")?.atteint).toBe(false);
  });
});

describe("chercher un aliment", () => {
  it("sans accents : « oeuf » trouve Œuf, « pates » trouve Pâtes", () => {
    expect(normaliser("Œuf")).toBe("oeuf");
    expect(chercher(CATALOGUE, "oeuf").map((a) => a.cle)).toEqual(["oeuf"]);
    expect(chercher(CATALOGUE, "pates").map((a) => a.cle)).toEqual(["pates"]);
  });
  it("Herbalife d'abord dans les résultats", () => {
    expect(chercher(CATALOGUE, "barre")[0].herbalife).toBe(true);
    expect(chercher(CATALOGUE, "").length).toBe(0);
  });
});

describe("les idées proposées selon le créneau", () => {
  it("encas : barre, Achieve, PDM, shake — puis fromage blanc, skyr en dernier", () => {
    const s = suggestions(CATALOGUE, "enc2");
    expect(s.herbalife.map((a) => a.cle)).toEqual(["barre", "achieve", "pdmdemi", "pdmplein", "f1demi"]);
    expect(s.autres.map((a) => a.cle)).toEqual(["fromage_blanc0", "skyr"]);
  });
  it("jamais de poulet au petit-déj", () => {
    const s = suggestions(CATALOGUE, "pdj");
    expect([...s.herbalife, ...s.autres].some((a) => a.cle === "poulet")).toBe(false);
    expect(s.herbalife[0].cle).toBe("f1demi");
  });
  it("aucun shake « F1 seul » : le shake n'existe qu'en combo", () => {
    expect(CATALOGUE.filter((a) => a.famille === "f1").every((a) => /\+/.test(a.nom))).toBe(true);
  });
});

describe("le plan de fin de journée", () => {
  it("une idée par créneau vide, Herbalife aux encas, jusqu'à l'objectif", () => {
    const p = planFinDeJournee(jour({ lignes: [L("pdj", 18, "club")] }), CATALOGUE);
    expect(p.manque).toBe(65);
    // 18 + barre 10 + poulet 150 g (45,2) + PDM 15 = 88,2 : le poisson n'est plus utile.
    expect(p.lignes.map((l) => l.aliment.cle)).toEqual(["barre", "poulet", "pdmplein"]);
    expect(p.total).toBeGreaterThanOrEqual(83);
  });
  it("s'arrête dès que l'objectif est atteint", () => {
    const p = planFinDeJournee(jour({ lignes: [L("pdj", 18), L("dej", 60)] }), CATALOGUE);
    expect(p.lignes.map((l) => l.aliment.cle)).toEqual(["barre"]);
  });
  it("selon l'heure : à 16 h, plus d'encas du matin ni de déjeuner (maquette v8)", () => {
    const seize = new Date(2026, 8, 22, 16, 0);
    const p = planFinDeJournee(jour({ lignes: [L("pdj", 18, "club")] }), CATALOGUE, seize);
    expect(p.lignes.map((l) => l.creneau)).toEqual(["enc2", "din"]);
    // 18 + PDM 15 + cabillaud 100 g (23,1) : on n'atteint pas 83, et le plan ne le cache pas.
    expect(Math.round(p.total)).toBe(56);
  });
  it("un jour passé garde le plan complet (on ne lit pas l'heure)", () => {
    const p = planFinDeJournee(jour({ jour: "2026-09-21", lignes: [L("pdj", 18)] }), CATALOGUE, new Date(2026, 8, 22, 21, 0));
    expect(p.lignes[0].creneau).toBe("enc1");
  });
});

describe("le repas que propose l'accueil", () => {
  const a = (h: number, m = 0) => new Date(2026, 8, 22, h, m);
  it("les heures des repas", () => {
    expect(creneauDeLHeure(a(8))).toBe("pdj");
    expect(creneauDeLHeure(a(10, 30))).toBe("enc1");
    expect(creneauDeLHeure(a(12))).toBe("dej");
    expect(creneauDeLHeure(a(16))).toBe("enc2");
    expect(creneauDeLHeure(a(20))).toBe("din");
  });
  it("le repas de l'heure s'il est vide, sinon le suivant vide", () => {
    expect(creneauANoter([], a(12))).toBe("dej");
    expect(creneauANoter([L("dej", 45)], a(12))).toBe("enc2");
    // BBC : le shake du club remplit le petit-déj, on propose l'encas.
    expect(creneauANoter([L("pdj", 18, "club")], a(8))).toBe("enc1");
  });
  it("tout est noté jusqu'au dîner : plus rien à proposer (place aux conseils)", () => {
    expect(creneauANoter([L("din", 30)], a(21))).toBeNull();
  });
});

describe("les niveaux (ceux de l'app)", () => {
  it("680 XP : niveau 3, 20 avant le 4", () => {
    const n = niveauDe(680);
    expect(n.courant.level).toBe(3);
    expect(n.suivant?.level).toBe(4);
    expect(n.suivant!.threshold - 680).toBe(20);
  });
});

describe("résumé d'un repas", () => {
  it("se lit comme une phrase, sans parenthèses de cuisson", () => {
    expect(resume([{ libelle: "Poulet (blanc), cuit", quantite: 1 }, { libelle: "Pâtes, cuites", quantite: 1 }])).toBe("Poulet, pâtes");
    expect(resume([{ libelle: "Barre aux protéines", quantite: 2 }])).toBe("Barre aux protéines × 2");
  });
});

describe("« À retenir » (coach)", () => {
  const vide = { verres: 0, boisson_club: false, activite: null, humeur: null, lignes: [] };
  const s: SemaineCoach = {
    aujourdhui: "2026-09-22",
    objectifs: { poids: 69, coef: 1.2, proteines: 83, eau_l: 2.3 },
    remarque: null,
    jours: [
      { ...vide, jour: "2026-09-16", verres: 6, lignes: [{ creneau: "pdj", libelle: "a", grammes: null, quantite: 1, prot_g: 18, origine: "club" }, { creneau: "dej", libelle: "b", grammes: 100, quantite: 1, prot_g: 45, origine: "membre" }] },
      { ...vide, jour: "2026-09-17", verres: 9, lignes: [{ creneau: "dej", libelle: "b", grammes: 100, quantite: 1, prot_g: 90, origine: "membre" }] },
      { ...vide, jour: "2026-09-18" }, { ...vide, jour: "2026-09-19" }, { ...vide, jour: "2026-09-20" }, { ...vide, jour: "2026-09-21" },
      { ...vide, jour: "2026-09-22", lignes: [{ creneau: "pdj", libelle: "a", grammes: null, quantite: 1, prot_g: 18, origine: "club" }] },
    ],
  };
  it("ne compte pas aujourd'hui, repère le point faible et les jours vides", () => {
    const r = aRetenir(s, "Camille");
    expect(r[0].gras).toBe("Protéines : 77 g en moyenne");
    expect(r[0].texte).toBe("objectif atteint 1 jour sur 2");
    expect(r[1].texte).toBe("objectif atteint 1 jour sur 2");
    expect(r[2]).toMatchObject({ faible: true, gras: "Encas de l'après-midi : jamais noté" });
    expect(r[3].texte).toBe("Rien de noté vendredi, samedi, dimanche et lundi");
  });
});

describe("ses habituels (bloc B, 6)", () => {
  const H = (x: Partial<Habituel> & { libelle: string }): Habituel => ({
    aliment: null, grammes: null, quantite: 1, prot_100g: null, prot_g: 0, jours: 2, ...x,
  });
  const poulet = H({ aliment: "poulet", libelle: "Poulet (blanc), cuit", grammes: 150, prot_g: 45.2, jours: 6 });
  const burrata = H({ libelle: "Salade tomate burrata", grammes: 250, prot_100g: 6, prot_g: 15 });
  const riz = H({ aliment: "riz", libelle: "Riz blanc, cuit", grammes: 150, prot_g: 4.4 });

  it("ce qui est déjà noté à ce repas n'est pas reproposé (aliment, ou plat estimé au même nom)", () => {
    const e = jour({
      habituels: { dej: [poulet, burrata, riz] },
      lignes: [
        { id: "a", creneau: "dej", aliment: "poulet", libelle: "Poulet (blanc), cuit", grammes: 150, quantite: 1, prot_g: 45.2, origine: "membre" },
        { id: "b", creneau: "dej", aliment: null, libelle: " salade tomate BURRATA", grammes: 250, quantite: 1, prot_g: 15, prot_100g: 6, origine: "noaly" },
        { id: "c", creneau: "din", aliment: "riz", libelle: "Riz blanc, cuit", grammes: 150, quantite: 1, prot_g: 4.4, origine: "membre" },
      ],
    });
    // Le riz du dîner n'empêche pas le riz du déjeuner.
    expect(habituelsDuCreneau(e, "dej").map((h) => h.libelle)).toEqual(["Riz blanc, cuit"]);
    expect(habituelsDuCreneau(e, "pdj")).toEqual([]);
    expect(habituelsDuCreneau(jour(), "dej")).toEqual([]);
  });

  it("« 5 fois en 2 semaines », et « tous les matins » quand c'est chaque jour", () => {
    expect(frequenceHabituel(5, "dej")).toBe("5 fois en 2 semaines");
    expect(frequenceHabituel(14, "pdj")).toBe("tous les matins");
    expect(frequenceHabituel(13, "din")).toBe("tous les soirs");
    expect(frequenceHabituel(13, "enc2")).toBe("tous les jours");
  });

  it("les protéines suivent le catalogue d'aujourd'hui ; un plat estimé garde l'estimation de Noaly", () => {
    expect(protHabituel(poulet, CATALOGUE)).toBe(45.2); // 30,1 × 150 / 100
    expect(protHabituel(burrata, CATALOGUE)).toBe(15);
    expect(protHabituel(H({ aliment: "f1demi", libelle: "Shake F1 + ½ sachet PDM", quantite: 2, prot_g: 36 }), CATALOGUE)).toBe(36);
    // Un aliment absent du catalogue chargé : la valeur figée de la ligne.
    expect(protHabituel(H({ aliment: "disparu", libelle: "Disparu", grammes: 100, prot_g: 12 }), CATALOGUE)).toBe(12);
  });
});

describe("les kcal, discrètes (bloc B, 9)", () => {
  it("additionne les kcal connues ; « estimé » dès qu'un plat est estimé ou sans kcal", () => {
    expect(kcalDe([{ aliment: "f1demi", kcal: 157 }, { aliment: "skyr", kcal: 90 }])).toEqual({ kcal: 247, estime: false, connu: true });
    expect(kcalDe([{ aliment: "poulet", kcal: 212 }, { aliment: null, kcal: 261 }])).toEqual({ kcal: 473, estime: true, connu: true });
    // Les chips du club n'ont pas de kcal : le total reste une indication (≈).
    expect(kcalDe([{ aliment: "poulet", kcal: 212 }, { aliment: "chipsbbq", kcal: null }])).toEqual({ kcal: 212, estime: true, connu: true });
    expect(kcalDe([{ aliment: null, kcal: null }]).connu).toBe(false);
  });

  it("« 157 kcal », « ≈ 453 kcal », et la journée à 10 près", () => {
    expect(texteKcal(157, false)).toBe("157 kcal");
    expect(texteKcal(452.6, true)).toBe("≈ 453 kcal");
    expect(texteKcal(774, true, true)).toBe("≈ 770 kcal");
    expect(texteKcal(1184, false, true)).toBe("≈ 1 180 kcal");
  });
});
