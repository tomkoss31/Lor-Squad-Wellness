import { describe, expect, it } from "vitest";
import {
  lireMaCaisse,
  lireRentabilite,
  rentabiliteDuMois,
  nomDuMois,
  parMembre,
  remiseDuRang,
  totalVentes,
  valeurUnite,
  ventesDuJour,
  type ValeurUnite,
  type VenteMaCaisse,
} from "../caisse/gains";

const proche = (a: number | undefined, b: number) => expect(a).toBeCloseTo(b, 3);

describe("ce que vaut une unité vendue", () => {
  it("un sachet : le pot au prix public, divisé par ses portions", () => {
    // Formula 1 4466 : 63,50 € et 23,95 PV le pot de 550 g, 21 shakes.
    const f1 = valeurUnite({ ref: "4466", portions: 21, maison: { f1: 1 }, recette: null });
    proche(f1?.publicUnite, 63.5 / 21);
    proche(f1?.pvUnite, 23.95 / 21);
  });

  it("le grand thé-aloé : une dose de thé et une d'aloé de la recette du club", () => {
    const g = valeurUnite({ ref: null, portions: null, maison: null, recette: { the: 1, aloe: 1 } });
    proche(g?.publicUnite, 41 / 30 + 54.5 / 47);
  });

  it("un pack : ses doses", () => {
    const p = valeurUnite({ ref: null, portions: null, maison: { f1: 6, the: 6 }, recette: null });
    proche(p?.publicUnite, 6 * (63.5 / 21) + 6 * (41 / 30));
  });

  it("le collagène, absent du catalogue public, vient de pvCatalog", () => {
    const c = valeurUnite({ ref: "076K", portions: 30, maison: null, recette: null });
    proche(c?.publicUnite, 84.5 / 30);
  });

  it("un accessoire : on ne sait pas", () => {
    expect(valeurUnite({ ref: null, portions: null, maison: null, recette: null })).toBeNull();
    expect(valeurUnite({ ref: "ZZZZ", portions: 10, maison: null, recette: null })).toBeNull();
  });
});

describe("ce qu'elle gagne", () => {
  const valeurs = new Map<string, ValeurUnite | null>([
    ["f1", valeurUnite({ ref: "4466", portions: 21, maison: null, recette: null })],
    ["grand", valeurUnite({ ref: null, portions: null, maison: null, recette: { the: 1, aloe: 1 } })],
    ["shaker", null],
  ]);
  const vente = (lignes: Array<[string, number, number]>): VenteMaCaisse => ({
    id: "v", quand: "2026-09-26T06:12:00Z", total: 0, vendeur: "Romane", annulable: false, clientId: "m1", membre: "Mélanie P.",
    lignes: lignes.map(([carteId, prix, qte]) => ({ carteId, nom: carteId, prix, qte, sorte: "emporter" as const })),
  });

  it("Romane à 35 % : prix du club − prix public × 0,65", () => {
    const t = totalVentes([vente([["f1", 3.8, 5], ["grand", 2.6, 1]])], valeurs, 35);
    expect(t.vendu).toBe(21.6);
    // F1 : 3,80 − 3,02 × 0,65 (1,97) = 1,83 × 5 = 9,15 ; grand thé-aloé : 2,60 − 1,64 = 0,96.
    expect(t.gagne).toBe(10.11);
    expect(t.pv).toBe(6.9);
    expect(t.sansCout).toBe(0);
  });

  it("à 50 %, elle gagne plus sur le même sachet", () => {
    expect(totalVentes([vente([["f1", 3.8, 1]])], valeurs, 50).gagne).toBe(2.29);
  });

  it("un accessoire compte dans le vendu, jamais dans le gagné", () => {
    const t = totalVentes([vente([["f1", 3.8, 1], ["shaker", 3.5, 2]])], valeurs, 35);
    expect(t.vendu).toBe(10.8);
    expect(t.gagne).toBe(1.83);
    expect(t.sansCout).toBe(2);
  });

  it("sa remise vient de son rang", () => {
    expect(remiseDuRang("senior_consultant_35")).toBe(35);
    expect(remiseDuRang("active_world_team_50")).toBe(50);
    expect(remiseDuRang(null)).toBe(25);
  });
});

describe("sa journée", () => {
  const v = (id: string, quand: string, clientId: string | null, membre: string, total: number, lignes: Array<[string, number]>): VenteMaCaisse => ({
    id, quand, total, vendeur: "Romane", annulable: true, clientId, membre,
    lignes: lignes.map(([nom, qte]) => ({ carteId: nom, nom, prix: 1, qte, sorte: "emporter" as const })),
  });

  it("réunit les achats d'une membre, dans l'ordre de passage", () => {
    const l = parMembre([
      v("a", "2026-09-26T09:00:00Z", "m2", "Audrey L.", 2.3, [["Barre", 1]]),
      v("b", "2026-09-26T06:12:00Z", "m1", "Mélanie P.", 19, [["Formula 1", 5]]),
      v("c", "2026-09-26T06:20:00Z", "m1", "Mélanie P.", 20.7, [["Formula 1", 1], ["PDM", 3]]),
    ]);
    expect(l).toEqual([
      { cle: "m1", membre: "Mélanie P.", resume: "6 × Formula 1, 3 × PDM", total: 39.7 },
      { cle: "m2", membre: "Audrey L.", resume: "Barre", total: 2.3 },
    ]);
  });

  it("ne garde que les ventes du jour, à l'heure de Paris", () => {
    const ventes = [v("a", "2026-09-26T21:30:00Z", "m1", "M", 1, []), v("b", "2026-09-26T08:00:00Z", "m1", "M", 1, [])];
    // 21 h 30 UTC le 26 = 23 h 30 à Paris, toujours le 26 ; 22 h 30 UTC serait le 27.
    expect(ventesDuJour(ventes, "2026-09-26").map((x) => x.id)).toEqual(["a", "b"]);
    expect(ventesDuJour([v("c", "2026-09-26T22:30:00Z", "m1", "M", 1, [])], "2026-09-27").map((x) => x.id)).toEqual(["c"]);
  });

  it("relit club_ma_caisse sans planter", () => {
    const d = lireMaCaisse({
      mois: "2026-09",
      rang: "senior_consultant_35",
      carte: [
        { id: "f1", ref: "4466", portions: "21.00", maison: { f1: 1 }, recette: null },
        { id: "shaker", ref: null, portions: null, maison: null, recette: null },
        null,
      ],
      ventes: [
        { id: "v1", created_at: "2026-09-26T06:12:00Z", client_id: "m1", membre: "Mélanie P.", total: 19, lignes: [{ carte_id: "f1", nom: "Formula 1", prix: 3.8, qte: 5 }] },
      ],
    });
    expect(d.rang).toBe("senior_consultant_35");
    expect(d.valeurs.get("f1")?.publicUnite).toBeCloseTo(63.5 / 21, 3);
    expect(d.valeurs.get("shaker")).toBeNull();
    expect(d.ventes[0]).toMatchObject({ id: "v1", clientId: "m1", membre: "Mélanie P.", total: 19 });
    expect(lireMaCaisse(null)).toEqual({ mois: "", rang: null, valeurs: new Map(), ventes: [] });
  });

  it("nomme le mois", () => {
    expect(nomDuMois("2026-09")).toBe("Septembre");
    expect(nomDuMois("2026-08")).toBe("Août");
  });
});

describe("ce qui reste au club (lot 4)", () => {
  const f1 = (qte: number) => [{ carte_id: "f1", nom: "Formula 1", prix: 3.8, qte }];
  const brut = {
    mois: "2026-09",
    cartes: [{ type: 10, prix: 80 }, { type: 30, prix: "185" }, { type: 10, prix: null }],
    visites: 186,
    carte: [{ id: "f1", ref: "4466", portions: 21, maison: { f1: 1 }, recette: null }],
    ventes: [
      { id: "a", created_at: "2026-09-26T06:00:00Z", vendeur_id: "romane", total: 19, lignes: f1(5) },
      { id: "b", created_at: "2026-09-26T07:00:00Z", vendeur_id: "thomas", total: 7.6, lignes: f1(2) },
      { id: "c", created_at: "2026-09-26T08:00:00Z", vendeur_id: "maria", total: 3.8, lignes: f1(1) },
    ],
    vendeurs: [
      { id: "romane", prenom: "Romane", rang: "senior_consultant_35", proprio: false },
      { id: "thomas", prenom: "Thomas", rang: "active_world_team_50", proprio: true },
      { id: "maria", prenom: "Maria", rang: "supervisor_50", proprio: false },
    ],
  };

  it("cartes − produits servis + vos ventes + écarts", () => {
    const d = lireRentabilite(brut)!;
    const r = rentabiliteDuMois(d, 3.67, { "10": 80, "30": 185 });
    // Une carte sans prix prend le tarif du club.
    expect(r.cartes).toEqual({ total: 345, nb10: 2, nb30: 1, autres: 0, estimees: 1 });
    expect(r.produitsServis).toBe(682.62);
    // Thomas (propriétaire, 50 %) : 2 F1 → 7,60 € vendus, 2 × (3,80 − 1,51) gagnés.
    expect(r.vosVentes).toEqual({ vendu: 7.6, gagne: 4.58, prenoms: ["Thomas"] });
    // Romane à 35 % : 5 F1 = 5,7 PV × 15 % × 1,78 € ; Maria à 50 % ne donne pas d'écart.
    expect(r.ecarts).toEqual([{ id: "romane", prenom: "Romane", remise: 35, pv: 5.7, ecart: 1.52 }]);
    // 345 − 682,62 + 4,58 + 1,52, au centime.
    expect(r.reste).toBe(-331.52);
  });

  it("le calcul de la maquette : 159 PV à 35 % font 42 € d'écart", () => {
    const d = { ...lireRentabilite(brut)!, ventes: [], vendeurs: [] };
    expect(rentabiliteDuMois(d, 3.67, {}).ecarts).toEqual([]);
    expect(Math.round((159 * (50 - 35) * 1.78) / 100)).toBe(42);
  });

  it("sans coût de visite, pas de « reste » inventé", () => {
    const r = rentabiliteDuMois(lireRentabilite(brut)!, null, { "10": 80, "30": 185 });
    expect(r.produitsServis).toBeNull();
    expect(r.reste).toBeNull();
  });

  it("rien pour quelqu'un qui n'est pas propriétaire", () => {
    expect(lireRentabilite(null)).toBeNull();
  });
});
