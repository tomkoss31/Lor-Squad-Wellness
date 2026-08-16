// =============================================================================
// « Quoi faire, dans l'ordre » — un seul geste à la fois.
//
// Le défaut qu'on corrige n'est pas visuel : c'est qu'un coach avait quatre
// actions possibles et aucune indication de laquelle faire. Donc le premier
// test n'est pas « ça s'affiche », c'est « il n'y en a qu'une ».
// =============================================================================

import { describe, expect, it } from "vitest";
import { etapeEnCours, etapesDuLead, etatRdvDe, type LeadEtapes } from "../etapes";

/** Jeudi 13 août 2026, 9 h 10. */
const T0 = new Date("2026-08-13T09:10:00+02:00");

const lead = (p: Partial<LeadEtapes> = {}): LeadEtapes => ({
  prenom: "Claire",
  status: "new",
  contactedAt: null,
  derniereReponse: null,
  relanceDueAt: null,
  rdv: "aucun",
  abandonAvantCreneau: false,
  peutConvertir: false,
  dormant: false,
  ...p,
});

const cles = (l: LeadEtapes) => etapesDuLead(l, T0).map((e) => e.cle);
const etats = (l: LeadEtapes) => etapesDuLead(l, T0).map((e) => e.etat);

describe("l'invariant : un seul geste en cours", () => {
  const cas: Array<[string, LeadEtapes]> = [
    ["jamais contacté, sans créneau", lead()],
    ["jamais contacté, avec créneau", lead({ rdv: "aVenir" })],
    ["appelé, sans suite", lead({ status: "contacted", contactedAt: "2026-08-12T10:00:00+02:00" })],
    [
      "appelé, relance jeudi prochain",
      lead({
        status: "contacted",
        contactedAt: "2026-08-12T10:00:00+02:00",
        derniereReponse: "rappellera",
        relanceDueAt: "2026-08-20T09:00:00+02:00",
      }),
    ],
    [
      "a réservé et déjà appelé",
      lead({ rdv: "aVenir", status: "contacted", contactedAt: "2026-08-12T10:00:00+02:00" }),
    ],
    ["abandon avant créneau", lead({ abandonAvantCreneau: true })],
    ["rendez-vous déjà passé", lead({ rdv: "passe", status: "contacted" })],
  ];

  for (const [nom, l] of cas) {
    it(`${nom} → exactement une étape « maintenant »`, () => {
      const n = etapesDuLead(l, T0).filter((e) => e.etat === "maintenant").length;
      expect(n).toBe(1);
    });
  }

  it("aucune étape « faite » ne réapparaît sous une étape « à venir »", () => {
    for (const [, l] of cas) {
      const suite = etats(l);
      const premierAVenir = suite.indexOf("aVenir");
      if (premierAVenir === -1) continue;
      expect(suite.slice(premierAVenir)).not.toContain("faite");
    }
  });
});

describe("le parcours dépend du créneau, pas du statut", () => {
  it("sans créneau : appeler → poser le rendez-vous → dire", () => {
    expect(cles(lead())).toEqual(["appel", "poser", "dire"]);
  });

  it("avec créneau : « poser » disparaît — c'est lui qui créait le doublon", () => {
    const c = cles(lead({ rdv: "aVenir" }));
    expect(c).not.toContain("poser");
    expect(c).toEqual(["rdv-existe", "appel-confirmation", "dire", "jour-j"]);
  });

  it("avec créneau, le rendez-vous est déjà acquis", () => {
    expect(etapesDuLead(lead({ rdv: "aVenir" }), T0)[0].etat).toBe("faite");
  });

  it("avec créneau et jamais appelé : le geste du jour est l'appel de confirmation", () => {
    expect(etapeEnCours(lead({ rdv: "aVenir" }), T0)?.cle).toBe("appel-confirmation");
  });
});

describe("le rendez-vous passé — le cas que la maquette n'avait pas", () => {
  const passe = lead({ rdv: "passe", status: "contacted", contactedAt: "2026-08-11T10:00:00+02:00" });

  it("on ne propose plus de caler ni de confirmer quoi que ce soit", () => {
    const c = cles(passe);
    expect(c).not.toContain("poser");
    expect(c).not.toContain("appel-confirmation");
    expect(c).toEqual(["rdv-passe", "dire", "conclure"]);
  });

  it("le geste du jour est de dire ce qui s'est passé", () => {
    expect(etapeEnCours(passe, T0)?.cle).toBe("dire");
  });

  it("une fois la réponse donnée, il reste à conclure", () => {
    const repondu = { ...passe, derniereReponse: "ne_sait_pas" as const };
    expect(etapeEnCours(repondu, T0)?.cle).toBe("conclure");
  });
});

describe("etatRdvDe — à venir, passé, ou rien", () => {
  it("un créneau à venir", () => {
    expect(etatRdvDe({ slotStart: "2026-08-21T09:00:00+02:00" }, T0)).toBe("aVenir");
  });

  it("un créneau d'il y a deux mois n'est pas « à venir »", () => {
    // Le bug d'origine : la liste était triée par date croissante SANS filtrer
    // le passé, donc le premier créneau trouvé pouvait dater de juin.
    expect(etatRdvDe({ slotStart: "2026-06-12T09:00:00+02:00" }, T0)).toBe("passe");
  });

  it("aucun créneau, ou une date illisible → aucun", () => {
    expect(etatRdvDe(null, T0)).toBe("aucun");
    expect(etatRdvDe(undefined, T0)).toBe("aucun");
    expect(etatRdvDe({ slotStart: "pas une date" }, T0)).toBe("aucun");
  });
});

describe("une relance calée devient l'étape en cours", () => {
  const relance = lead({
    status: "contacted",
    contactedAt: "2026-08-12T10:00:00+02:00",
    derniereReponse: "rappellera",
    relanceDueAt: "2026-08-20T09:00:00+02:00",
  });

  it("elle s'insère juste après l'appel", () => {
    expect(cles(relance)).toEqual(["appel", "attendre", "poser", "dire"]);
    expect(etapeEnCours(relance, T0)?.cle).toBe("attendre");
  });

  it("elle rappelle ce qui avait été répondu, sans redemander de date", () => {
    const e = etapeEnCours(relance, T0)!;
    expect(e.titre).toMatch(/Rappelle Claire/);
    expect(e.detail).toMatch(/Doit rappeler/);
    expect(e.detail).not.toMatch(/saisis|écris une date/i);
  });

  it("une relance en RETARD rouvre l'appel au lieu de s'insérer", () => {
    // Le 13/08 pour une échéance du 01/08 : la ligne est déjà remontée dans
    // « Aujourd'hui ». Lui dire « rappelle-la le 1er août » serait absurde, et
    // lui dire « pose le rendez-vous » sauterait l'appel.
    const enRetard = { ...relance, relanceDueAt: "2026-08-01T09:00:00+02:00" };
    expect(cles(enRetard)).not.toContain("attendre");
    const e = etapeEnCours(enRetard, T0)!;
    expect(e.cle).toBe("appel");
    expect(e.titre).toMatch(/Rappelle Claire/);
    expect(e.detail).toMatch(/délai est passé|remontée toute seule/);
  });

  it("une relance due AUJOURD'HUI compte comme échue, pas comme à venir", () => {
    const ceMatin = { ...relance, relanceDueAt: "2026-08-13T09:00:00+02:00" };
    expect(cles(ceMatin)).not.toContain("attendre");
    expect(etapeEnCours(ceMatin, T0)?.cle).toBe("appel");
  });
});

describe("un dossier refermé ne conseille rien", () => {
  it.each(["converted", "lost"] as const)("%s → aucune étape", (status) => {
    expect(etapesDuLead(lead({ status }), T0)).toEqual([]);
    expect(etapeEnCours(lead({ status }), T0)).toBeNull();
  });

  it("mis de côté → aucune étape non plus", () => {
    expect(etapesDuLead(lead({ dormant: true }), T0)).toEqual([]);
  });
});

describe("on ne devine jamais le genre de la personne", () => {
  // Le parcours « rendez-vous passé » manquait à cette liste, et c'est
  // exactement là que « Bascule-LE en fiche client » est passé en prod-1.
  const tous = [
    lead(),
    lead({ rdv: "aVenir" }),
    lead({ rdv: "passe" }),
    lead({ rdv: "passe", peutConvertir: true, derniereReponse: "ne_sait_pas" }),
    lead({ abandonAvantCreneau: true }),
    lead({ status: "contacted", contactedAt: "2026-08-12T10:00:00+02:00" }),
    lead({
      status: "contacted",
      contactedAt: "2026-08-12T10:00:00+02:00",
      derniereReponse: "rappellera",
      relanceDueAt: "2026-08-20T09:00:00+02:00",
    }),
  ].flatMap((l) => etapesDuLead(l, T0));

  it("aucun pronom ni impératif genré dans les titres ni les détails", () => {
    // `-le`/`-la` accrochés à un verbe : « bascule-le », « rappelle-la ».
    // Le « il » impersonnel (« il n'y a plus rien », « il faut ») est exclu :
    // il ne désigne personne, et l'interdire pousserait à des phrases tordues.
    const genre = /\b(elle|lui|celui|celle)\b|\bil\b(?!\s+(n'y|y\s|faut|reste|suffit|vaut|s'agit))|-l[ea]\b/i;
    for (const e of tous) {
      expect(e.titre, e.titre).not.toMatch(genre);
      expect(e.detail, e.detail).not.toMatch(genre);
    }
  });

  it("le prénom est utilisé tel quel", () => {
    expect(etapesDuLead(lead({ prenom: "Leslie" }), T0)[0].titre).toContain("Leslie");
  });

  it("un prénom vide ne produit pas de phrase bancale", () => {
    const e = etapesDuLead(lead({ prenom: "  " }), T0)[0];
    expect(e.titre).toBe("Appelle cette personne");
  });
});

describe("le cas du lead qui vient d'un bilan en ligne", () => {
  it("le jour J mène à la création de fiche depuis le CRM", () => {
    const e = etapesDuLead(lead({ rdv: "aVenir", peutConvertir: true }), T0).find(
      (x) => x.cle === "jour-j",
    )!;
    expect(e.detail).toMatch(/créer la fiche client/i);
  });

  it("sinon, il mène à l'agenda", () => {
    const e = etapesDuLead(lead({ rdv: "aVenir", peutConvertir: false }), T0).find(
      (x) => x.cle === "jour-j",
    )!;
    expect(e.detail).toMatch(/agenda/i);
  });
});
