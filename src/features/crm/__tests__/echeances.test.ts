// =============================================================================
// Le rangement par échéance — et surtout : personne ne disparaît.
//
// Le bug qu'on corrige, c'est quelqu'un qui glisse dans un groupe où on ne
// regarde jamais. C'est donc ça qu'on teste en premier.
// =============================================================================

import { describe, expect, it } from "vitest";
import {
  GROUPES,
  ecartEnJours,
  groupeDe,
  grouperParEcheance,
  pilule,
  pourquoi,
  teinteDe,
  type LeadEcheance,
} from "../echeances";

/** Jeudi 13 août 2026, 9 h 10. */
const T0 = new Date("2026-08-13T09:10:00+02:00");

const lead = (p: Partial<LeadEcheance> = {}): LeadEcheance => ({
  status: "new",
  createdAt: "2026-08-11T10:00:00+02:00",
  contactedAt: null,
  relanceDueAt: null,
  derniereReponse: null,
  ...p,
});

describe("dans quel groupe on tombe", () => {
  it("jamais contacté → aujourd'hui, c'est le travail du jour", () => {
    expect(groupeDe(lead(), T0)).toBe("aujourdhui");
  });

  it("contacté sans échéance → aujourd'hui, pas « plus tard »", () => {
    // Les 15 fiches d'avant le chantier. Les envoyer en « Plus tard »
    // reproduirait exactement la disparition qu'on corrige.
    const l = lead({ status: "contacted", contactedAt: "2026-05-02T10:00:00+02:00" });
    expect(groupeDe(l, T0)).toBe("aujourdhui");
  });

  it("échéance dépassée → aujourd'hui, jamais enterrée", () => {
    const l = lead({ status: "contacted", relanceDueAt: "2026-07-01T09:00:00+02:00" });
    expect(groupeDe(l, T0)).toBe("aujourdhui");
  });

  it("échéance du jour → aujourd'hui, même posée à 9 h pile", () => {
    expect(groupeDe(lead({ relanceDueAt: "2026-08-13T09:00:00+02:00" }), T0)).toBe("aujourdhui");
  });

  it("demain et jusqu'à J+7 → cette semaine", () => {
    expect(groupeDe(lead({ relanceDueAt: "2026-08-14T09:00:00+02:00" }), T0)).toBe("semaine");
    expect(groupeDe(lead({ relanceDueAt: "2026-08-20T09:00:00+02:00" }), T0)).toBe("semaine");
  });

  it("au-delà de 7 jours → plus tard", () => {
    expect(groupeDe(lead({ relanceDueAt: "2026-08-21T09:00:00+02:00" }), T0)).toBe("plusTard");
    expect(groupeDe(lead({ relanceDueAt: "2026-09-12T09:00:00+02:00" }), T0)).toBe("plusTard");
  });

  it("« cette semaine » ne se vide pas le dimanche", () => {
    // Piège de la semaine calendaire : un dimanche, « jusqu'à dimanche » ne
    // couvre plus rien et un rappel calé lundi part en « Plus tard ».
    const dimanche = new Date("2026-08-16T10:00:00+02:00");
    expect(groupeDe(lead({ relanceDueAt: "2026-08-17T09:00:00+02:00" }), dimanche)).toBe("semaine");
  });

  it("converti, perdu et RDV calé sortent de la file", () => {
    for (const status of ["converted", "lost", "qualified"] as const) {
      expect(groupeDe(lead({ status, relanceDueAt: "2026-08-13T09:00:00+02:00" }), T0)).toBe("refermes");
    }
  });

  it("une date illisible ne fait disparaître personne", () => {
    expect(groupeDe(lead({ relanceDueAt: "pas une date" }), T0)).toBe("aujourdhui");
  });
});

describe("grouperParEcheance", () => {
  it("ne perd et ne duplique personne", () => {
    const gens = [
      lead({ status: "new" }),
      lead({ status: "contacted", relanceDueAt: "2026-08-14T09:00:00+02:00" }),
      lead({ status: "contacted", relanceDueAt: "2026-09-12T09:00:00+02:00" }),
      lead({ status: "lost" }),
      lead({ status: "converted" }),
    ];
    const total = grouperParEcheance(gens, T0).reduce((n, g) => n + g.leads.length, 0);
    expect(total).toBe(gens.length);
  });

  it("rend toujours les quatre groupes, même vides — les compteurs suivent", () => {
    const g = grouperParEcheance([], T0);
    expect(g.map((x) => x.cle)).toEqual(GROUPES.map((x) => x.cle));
    expect(g.every((x) => x.leads.length === 0)).toBe(true);
  });

  it("met le plus en retard en haut d'Aujourd'hui", () => {
    const vieux = lead({ status: "contacted", relanceDueAt: "2026-07-01T09:00:00+02:00" });
    const hier = lead({ status: "contacted", relanceDueAt: "2026-08-12T09:00:00+02:00" });
    const [aujourdhui] = grouperParEcheance([hier, vieux], T0);
    expect(aujourdhui.leads[0]).toBe(vieux);
  });

  it("classe celui qui attend depuis le plus longtemps avant l'inscrit du jour", () => {
    const ancien = lead({ createdAt: "2026-08-01T10:00:00+02:00" });
    const frais = lead({ createdAt: "2026-08-13T08:00:00+02:00" });
    const [aujourdhui] = grouperParEcheance([frais, ancien], T0);
    expect(aujourdhui.leads[0]).toBe(ancien);
  });

  it("relit les refermés du plus récent au plus ancien", () => {
    const vieux = lead({ status: "lost", createdAt: "2026-05-01T10:00:00+02:00" });
    const recent = lead({ status: "lost", createdAt: "2026-08-10T10:00:00+02:00" });
    const refermes = grouperParEcheance([vieux, recent], T0).find((g) => g.cle === "refermes")!;
    expect(refermes.leads[0]).toBe(recent);
  });
});

describe("ce qu'on lit sous le nom", () => {
  it("reprend le mot de la dernière réponse", () => {
    expect(pourquoi(lead({ derniereReponse: "pas_de_reponse" }))).toMatch(/pas de réponse/i);
    expect(pourquoi(lead({ derniereReponse: "rappellera" }))).toMatch(/rappeler/i);
  });

  it("ne dit pas « contacté » quand personne n'a jamais appelé", () => {
    expect(pourquoi(lead())).toBe("Jamais rappelé·e");
  });

  it("avoue quand on a contacté sans rien caler", () => {
    const l = lead({ status: "contacted", contactedAt: "2026-05-02T10:00:00+02:00" });
    expect(pourquoi(l)).toMatch(/sans suite/i);
  });

  it("dit le résultat pour ceux qui sont sortis", () => {
    expect(pourquoi(lead({ status: "converted" }))).toMatch(/client/i);
    expect(pourquoi(lead({ status: "lost" }))).toMatch(/plus intéressé/i);
    expect(pourquoi(lead({ status: "qualified" }))).toMatch(/rendez-vous/i);
  });

  it("la dernière réponse prime sur le statut — sauf quand c'est devenu un client", () => {
    const l = lead({ status: "converted", derniereReponse: "pas_de_reponse" });
    expect(pourquoi(l)).toMatch(/client/i);
  });
});

describe("la pilule de droite", () => {
  it("se tait quand elle répéterait le titre du groupe", () => {
    expect(pilule(lead({ relanceDueAt: "2026-08-13T09:00:00+02:00" }), "aujourdhui", T0)).toBeNull();
    expect(pilule(lead({ status: "lost" }), "refermes", T0)).toBeNull();
  });

  it("distingue « à appeler » de « sans suite »", () => {
    expect(pilule(lead(), "aujourdhui", T0)).toBe("à appeler");
    expect(pilule(lead({ contactedAt: "2026-05-02T10:00:00+02:00" }), "aujourdhui", T0)).toBe("sans suite");
  });

  it("chiffre le retard, parce que 3 jours et 3 mois ne se traitent pas pareil", () => {
    expect(pilule(lead({ relanceDueAt: "2026-08-10T09:00:00+02:00" }), "aujourdhui", T0)).toBe("en retard de 3 j");
  });

  it("dit la date pour la suite", () => {
    expect(pilule(lead({ relanceDueAt: "2026-08-14T09:00:00+02:00" }), "semaine", T0)).toBe("demain");
    expect(pilule(lead({ relanceDueAt: "2026-09-12T09:00:00+02:00" }), "plusTard", T0)).toMatch(/sept/i);
  });
});

describe("teintes", () => {
  it("suit la dernière réponse quand il y en a une", () => {
    expect(teinteDe(lead({ derniereReponse: "pas_maintenant" }), "plusTard")).toBe("var(--ls-purple)");
  });

  it("retombe sur la couleur du groupe sinon", () => {
    expect(teinteDe(lead(), "aujourdhui")).toBe("var(--ls-coral)");
  });

  it("ne rend jamais une couleur vide", () => {
    for (const g of GROUPES) expect(teinteDe(lead(), g.cle)).toMatch(/^var\(--ls-/);
  });
});

describe("ecartEnJours", () => {
  it("compte des jours pleins, pas des heures", () => {
    // 23 h 55 aujourd'hui et 0 h 05 demain, c'est 1 jour d'écart — sinon un
    // rappel du soir basculerait de groupe au fil de la journée.
    expect(ecartEnJours("2026-08-13T23:55:00+02:00", T0)).toBe(0);
    expect(ecartEnJours("2026-08-14T00:05:00+02:00", T0)).toBe(1);
  });

  it("rend 0 sur une date illisible plutôt que NaN", () => {
    expect(ecartEnJours("nawak", T0)).toBe(0);
  });
});
