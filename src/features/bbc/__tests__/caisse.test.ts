import { describe, expect, it } from "vitest";
import {
  ajouter,
  enTete,
  euro,
  lignesPanier,
  lireAchats,
  lireCaisse,
  lirePrix,
  nbArticles,
  parRubrique,
  quandLisible,
  resumeLignes,
  totalPanier,
  upgrades,
  type ProduitCarte,
} from "../caisse/caisse";

function p(id: string, prix: number, over: Partial<ProduitCarte> = {}): ProduitCarte {
  return { id, rubrique: "petit_dej", nom: id, detail: null, prix, sorte: "emporter", ordre: 10, actif: true, ...over };
}

const CARTE: ProduitCarte[] = [
  p("f1", 3.8, { nom: "Formula 1", ordre: 10 }),
  p("pdm", 4.5, { nom: "PDM", ordre: 20 }),
  p("thermo", 4.1, { nom: "Thermo", ordre: 30 }),
  p("pack", 31, { nom: "Pack 6 jours", ordre: 40 }),
  p("grand", 2.6, { nom: "Grand thé-aloé", rubrique: "supplement", sorte: "upgrade", ordre: 10 }),
  p("coll", 2.8, { nom: "Collagène", rubrique: "supplement", sorte: "upgrade", ordre: 20 }),
  p("barre", 2.3, { nom: "Barre vanille amande", rubrique: "encas", ordre: 10 }),
  p("chips", 2.8, { nom: "Chips barbecue", rubrique: "encas", ordre: 70 }),
  p("vieux", 9, { nom: "Retiré", rubrique: "encas", actif: false, ordre: 5 }),
];

describe("le panier", () => {
  it("ajoute, retire et borne les quantités", () => {
    let panier = ajouter({}, "f1", 1);
    panier = ajouter(panier, "f1", 4);
    expect(panier).toEqual({ f1: 5 });
    expect(ajouter(panier, "f1", -5)).toEqual({});
    expect(ajouter({}, "f1", -1)).toEqual({});
    expect(ajouter({ f1: 98 }, "f1", 5)).toEqual({ f1: 99 });
  });

  it("calcule le total au centime, sans erreur d'arrondi", () => {
    // 3 × 3,80 + 2,60 = 14,00 — le cas testé en base le 26/09.
    expect(totalPanier({ f1: 3, grand: 1 }, CARTE)).toBe(14);
    // 0,1 + 0,2 : le piège des flottants.
    expect(totalPanier({ a: 1, b: 1 }, [p("a", 0.1), p("b", 0.2)])).toBe(0.3);
    expect(totalPanier({ inconnu: 2 }, CARTE)).toBe(0);
  });

  it("n'envoie que des identifiants et des quantités", () => {
    expect(lignesPanier({ f1: 5, pdm: 3 })).toEqual([
      { carte_id: "f1", qte: 5 },
      { carte_id: "pdm", qte: 3 },
    ]);
    expect(nbArticles({ f1: 5, pdm: 3 })).toBe(8);
  });
});

describe("les gros boutons du haut", () => {
  it("met ses habituels d'abord, puis les plus vendus, puis le petit déj", () => {
    const tete = enTete(CARTE, [{ carteId: "barre", qte: 2 }], ["chips", "f1"], 4);
    expect(tete.map((x) => x.id)).toEqual(["barre", "chips", "f1", "pdm"]);
  });

  it("ne montre ni un upgrade, ni un produit retiré, ni un doublon", () => {
    const tete = enTete(CARTE, [{ carteId: "grand", qte: 1 }, { carteId: "vieux", qte: 1 }], ["f1", "f1"], 6);
    expect(tete.map((x) => x.id)).toEqual(["f1", "pdm", "thermo", "pack"]);
  });

  it("range les upgrades à part, dans l'ordre de la carte", () => {
    expect(upgrades(CARTE).map((x) => x.id)).toEqual(["grand", "coll"]);
  });
});

describe("le tableau complet", () => {
  it("suit l'ordre du comptoir et cache ce qui est retiré", () => {
    const g = parRubrique(CARTE);
    expect(g.map((x) => x.cle)).toEqual(["petit_dej", "supplement", "encas"]);
    expect(g[2].produits.map((x) => x.id)).toEqual(["barre", "chips"]);
  });

  it("montre aussi ce qui est retiré dans les Réglages", () => {
    const g = parRubrique(CARTE, true);
    expect(g[2].produits.map((x) => x.id)).toEqual(["vieux", "barre", "chips"]);
  });
});

describe("lecture des réponses de la base", () => {
  it("relit club_caisse sans planter sur une ligne abîmée", () => {
    const d = lireCaisse({
      club: "c1",
      modifiable: true,
      carte: [
        { id: "f1", rubrique: "petit_dej", nom: "Formula 1", detail: "sachet", prix: "3.80", sorte: "emporter", ordre: 10, actif: true },
        { id: "x", rubrique: "inconnue", nom: "?", prix: 1 },
        null,
      ],
      habituels: [{ carte_id: "f1", qte: 3 }, { qte: 1 }],
      meilleures: ["f1", 4],
    });
    expect(d.club).toBe("c1");
    expect(d.modifiable).toBe(true);
    expect(d.carte).toHaveLength(1);
    expect(d.carte[0].prix).toBe(3.8);
    expect(d.habituels).toEqual([{ carteId: "f1", qte: 3 }]);
    expect(d.meilleures).toEqual(["f1"]);
    expect(lireCaisse(null)).toEqual({ club: null, modifiable: false, carte: [], habituels: [], meilleures: [], horaires: null, maison: null });
  });

  it("relit club_achats", () => {
    const a = lireAchats([
      {
        id: "v1",
        created_at: "2026-09-26T06:12:00Z",
        total: 14,
        vendeur: "Romane",
        annulable: true,
        lignes: [
          { carte_id: "f1", nom: "Formula 1", prix: 3.8, qte: 3, sorte: "emporter" },
          { carte_id: "grand", nom: "Grand thé-aloé", prix: 2.6, qte: 1, sorte: "upgrade" },
        ],
      },
    ]);
    expect(a).toHaveLength(1);
    expect(a[0].vendeur).toBe("Romane");
    expect(resumeLignes(a[0].lignes)).toBe("3 × Formula 1, Grand thé-aloé");
    expect(lireAchats("rien")).toEqual([]);
  });
});

describe("les mots et les nombres", () => {
  it("écrit les euros à la française", () => {
    expect(euro(14)).toBe("14,00 €");
    expect(euro(2.6)).toBe("2,60 €");
  });

  it("lit un prix tapé au clavier", () => {
    expect(lirePrix("2,6")).toBe(2.6);
    expect(lirePrix("2.60")).toBe(2.6);
    expect(lirePrix(" 19 ")).toBe(19);
    expect(lirePrix("")).toBeNull();
    expect(lirePrix("2,605")).toBeNull();
    expect(lirePrix("abc")).toBeNull();
    expect(lirePrix("-3")).toBeNull();
  });

  it("dit quand un achat a eu lieu", () => {
    const maintenant = new Date(2026, 8, 26, 18, 0);
    expect(quandLisible(new Date(2026, 8, 26, 8, 12).toISOString(), maintenant)).toBe("aujourd'hui · 8 h 12");
    expect(quandLisible(new Date(2026, 8, 25, 18, 5).toISOString(), maintenant)).toBe("hier · 18 h 05");
    expect(quandLisible("n'importe quoi", maintenant)).toBe("");
  });
});
