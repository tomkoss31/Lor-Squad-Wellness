import { describe, expect, it } from "vitest";
import {
  boiteMuette,
  classementPoseurs,
  entonnoir,
  etatBoite,
  fuites,
  ilYA,
  prochainNumero,
  sousTitreBoite,
  trierBoites,
  type Boite,
  type Coupon,
} from "../boites";

// Mardi 16 septembre 2026, 8 h du matin — l'heure où l'on relève une boîte.
const MAINTENANT = Date.parse("2026-09-16T06:00:00Z");
const JOUR = 86_400_000;
const ilYaJours = (n: number) => new Date(MAINTENANT - n * JOUR).toISOString();

function boite(o: Partial<Boite> = {}): Boite {
  return {
    id: "b1",
    numero: 3,
    commerce: "Institut Éclat",
    ou: "sur le comptoir",
    contactCommercant: "Aurélie",
    ville: "Verdun",
    poseurUserId: "u-melanie",
    poseurClientId: null,
    poseurNom: "Mélanie",
    poseeLe: ilYaJours(14),
    releveeLe: ilYaJours(1),
    retireeLe: null,
    ...o,
  };
}

function coupon(o: Partial<Coupon> = {}): Coupon {
  return {
    id: "c1",
    boiteId: "b1",
    prenom: "Patricia",
    nom: "R.",
    ville: "Verdun",
    telephone: "0612345678",
    leadId: null,
    appeleLe: null,
    issue: null,
    saisiLe: ilYaJours(1),
    ...o,
  };
}

describe("etatBoite", () => {
  it("reste posée tant qu'on l'a relevée récemment", () => {
    expect(etatBoite(boite(), MAINTENANT)).toBe("posee");
  });

  it("passe à relever après 4 semaines sans relève", () => {
    expect(etatBoite(boite({ releveeLe: ilYaJours(28) }), MAINTENANT)).toBe("a_relever");
    expect(etatBoite(boite({ releveeLe: ilYaJours(27) }), MAINTENANT)).toBe("posee");
  });

  it("compte depuis la POSE quand on ne l'a jamais relevée", () => {
    expect(etatBoite(boite({ releveeLe: null, poseeLe: ilYaJours(30) }), MAINTENANT)).toBe("a_relever");
    expect(etatBoite(boite({ releveeLe: null, poseeLe: ilYaJours(3) }), MAINTENANT)).toBe("posee");
  });

  it("une boîte retirée ne réclame plus rien", () => {
    expect(etatBoite(boite({ releveeLe: ilYaJours(90), retireeLe: ilYaJours(2) }), MAINTENANT)).toBe("retiree");
  });
});

describe("boiteMuette", () => {
  it("signale un emplacement qui n'a rien donné depuis 6 semaines", () => {
    expect(boiteMuette(boite({ poseeLe: ilYaJours(42) }), 0, MAINTENANT)).toBe(true);
  });

  it("se tait dès qu'un seul coupon est tombé", () => {
    expect(boiteMuette(boite({ poseeLe: ilYaJours(90) }), 1, MAINTENANT)).toBe(false);
  });

  it("laisse sa chance à une boîte récente", () => {
    expect(boiteMuette(boite({ poseeLe: ilYaJours(10) }), 0, MAINTENANT)).toBe(false);
  });
});

describe("sousTitreBoite", () => {
  it("dit toujours qui l'a posée", () => {
    expect(sousTitreBoite(boite(), 9, MAINTENANT)).toBe("posée par Mélanie · relevée hier");
  });

  it("annonce la relève avant tout le reste", () => {
    expect(sousTitreBoite(boite({ releveeLe: ilYaJours(40) }), 3, MAINTENANT)).toBe("posée par Mélanie · à relever");
  });

  it("dénonce un emplacement muet", () => {
    expect(sousTitreBoite(boite({ poseeLe: ilYaJours(50), releveeLe: null }), 0, MAINTENANT)).toBe(
      "posée par Mélanie · rien depuis la pose",
    );
  });
});

describe("trierBoites", () => {
  it("remonte ce qui réclame une décision, et enterre les retirées", () => {
    const ordre = trierBoites(
      [
        boite({ id: "fraiche", releveeLe: ilYaJours(1) }),
        boite({ id: "retiree", retireeLe: ilYaJours(1) }),
        boite({ id: "a-relever", releveeLe: ilYaJours(35) }),
      ],
      MAINTENANT,
    ).map((b) => b.id);
    expect(ordre).toEqual(["a-relever", "fraiche", "retiree"]);
  });

  it("entre deux boîtes vivantes, la plus négligée passe devant", () => {
    const ordre = trierBoites(
      [boite({ id: "recente", releveeLe: ilYaJours(2) }), boite({ id: "ancienne", releveeLe: ilYaJours(20) })],
      MAINTENANT,
    ).map((b) => b.id);
    expect(ordre).toEqual(["ancienne", "recente"]);
  });
});

describe("fuites", () => {
  it("met les gens avant les boîtes, du plus ancien au plus récent", () => {
    const f = fuites(
      [boite()],
      [
        coupon({ id: "hier", saisiLe: ilYaJours(1) }),
        coupon({ id: "vieux", saisiLe: ilYaJours(9) }),
        coupon({ id: "ce-matin", saisiLe: ilYaJours(0) }),
      ],
      MAINTENANT,
    );
    expect(f.aAppeler.map((c) => c.id)).toEqual(["vieux", "hier", "ce-matin"]);
    expect(f.attenteMax).toBe(9);
  });

  it("oublie un coupon déjà appelé", () => {
    const f = fuites([boite()], [coupon({ appeleLe: ilYaJours(0) })], MAINTENANT);
    expect(f.aAppeler).toHaveLength(0);
    expect(f.attenteMax).toBe(0);
  });

  it("oublie aussi un coupon tranché sans trace d'appel", () => {
    // Sans cette règle, « pas intéressée » resterait à appeler pour toujours.
    const f = fuites([boite()], [coupon({ issue: "pas_interesse" })], MAINTENANT);
    expect(f.aAppeler).toHaveLength(0);
  });

  it("liste les boîtes à relever", () => {
    const f = fuites([boite({ id: "vieille", releveeLe: ilYaJours(40) }), boite()], [], MAINTENANT);
    expect(f.aRelever.map((b) => b.id)).toEqual(["vieille"]);
  });
});

describe("entonnoir", () => {
  it("compte chaque étape, et range un démarrage parmi les RDV", () => {
    const e = entonnoir([
      coupon({ id: "1", appeleLe: ilYaJours(1), issue: "demarre" }),
      coupon({ id: "2", appeleLe: ilYaJours(1), issue: "rdv" }),
      coupon({ id: "3", appeleLe: ilYaJours(1), issue: "sans_reponse" }),
      coupon({ id: "4" }),
    ]);
    expect(e).toEqual({ coupons: 4, joints: 3, rdv: 2, demarrages: 1 });
  });
});

describe("classementPoseurs", () => {
  const boites = [
    boite({ id: "b1", poseurUserId: "u-melanie", poseurClientId: null, poseurNom: "Mélanie" }),
    boite({ id: "b2", poseurUserId: null, poseurClientId: "c-karine", poseurNom: "Karine" }),
    boite({ id: "b3", poseurUserId: null, poseurClientId: "c-karine", poseurNom: "Karine" }),
  ];
  const coupons = [
    coupon({ id: "1", boiteId: "b1", issue: "demarre" }),
    coupon({ id: "2", boiteId: "b2", issue: "demarre" }),
    coupon({ id: "3", boiteId: "b2", issue: "demarre" }),
    coupon({ id: "4", boiteId: "b3" }),
  ];

  it("classe par démarrages, et regroupe les boîtes d'un même poseur", () => {
    const c = classementPoseurs(boites, coupons);
    expect(c.map((p) => p.nom)).toEqual(["Karine", "Mélanie"]);
    expect(c[0]).toMatchObject({ estMembre: true, boites: 2, coupons: 3, demarrages: 2 });
    expect(c[1]).toMatchObject({ estMembre: false, boites: 1, coupons: 1, demarrages: 1 });
  });

  it("garde un poseur sans compte grâce à son nom figé", () => {
    const c = classementPoseurs([boite({ poseurUserId: null, poseurClientId: null, poseurNom: "Judith" })], []);
    expect(c[0]).toMatchObject({ nom: "Judith", boites: 1, coupons: 0 });
  });
});

describe("prochainNumero", () => {
  it("prend le plus petit numéro libre", () => {
    expect(prochainNumero([boite({ numero: 1 }), boite({ numero: 3 })])).toBe(2);
  });

  it("récupère le numéro d'une boîte retirée", () => {
    expect(prochainNumero([boite({ numero: 1 }), boite({ numero: 2, retireeLe: ilYaJours(3) })])).toBe(2);
  });

  it("commence à 1 quand il n'y a rien", () => {
    expect(prochainNumero([])).toBe(1);
  });
});

describe("ilYA", () => {
  it("parle en jours, jamais en dates", () => {
    expect(ilYA(ilYaJours(0), MAINTENANT)).toBe("aujourd'hui");
    expect(ilYA(ilYaJours(1), MAINTENANT)).toBe("hier");
    expect(ilYA(ilYaJours(6), MAINTENANT)).toBe("il y a 6 j");
    expect(ilYA(null, MAINTENANT)).toBe("jamais");
  });
});
