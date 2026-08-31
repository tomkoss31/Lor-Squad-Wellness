// =============================================================================
// La garantie de ce fichier : LA JAUGE NE PEUT PLUS MENTIR.
//
// Constat Thomas du 28/08, reproduit dans l'app : on tapait « Contacté 18 » et
// la liste montrait 7 lignes, aucune contactée. Si quelqu'un réintroduit un
// jour un compteur cumulé, c'est ici que ça doit casser.
// =============================================================================

import { describe, it, expect } from "vitest";
import {
  caseDuLead,
  compterParCase,
  totalEnCours,
  demandeUnGeste,
  CASES_ACTIVES,
  LIBELLE_CASE,
  type CaseLead,
} from "../caseLead";
import type { LeadEtape } from "../etapeLead";

const lead = (o: Partial<LeadEtape> = {}): LeadEtape => ({ status: "new", ...o });

describe("caseDuLead — une personne, une seule case", () => {
  it("endormi passe avant tout le reste", () => {
    expect(caseDuLead(lead({ dormant: true, status: "contacted", relanceDue: true }))).toBe("endormi");
  });

  it("les fins de parcours priment", () => {
    expect(caseDuLead(lead({ status: "converted" }))).toBe("converti");
    expect(caseDuLead(lead({ status: "lost" }))).toBe("perdu");
  });

  it("un rendez-vous à venir passe AVANT l'échéance de relance", () => {
    // Quelqu'un qui a un créneau vendredi n'est pas « à relancer » parce qu'un
    // rappel traîne : il faut le recevoir.
    expect(caseDuLead(lead({ status: "new", rdv: { passe: false }, relanceDue: true }))).toBe("rdv");
  });

  it("le filet qui a sonné range en « à relancer »", () => {
    expect(caseDuLead(lead({ status: "contacted", relanceDue: true }))).toBe("relance");
  });

  it("sinon, l'étape brute", () => {
    expect(caseDuLead(lead({ status: "new" }))).toBe("nouveau");
    expect(caseDuLead(lead({ status: "contacted" }))).toBe("contacte");
  });

  it("« RDV calé » dit à la main ne tient plus une fois le filet sonné", () => {
    expect(caseDuLead(lead({ status: "contacted", derniereReponse: "rdv" }))).toBe("rdv");
    expect(caseDuLead(lead({ status: "contacted", derniereReponse: "rdv", relanceDue: true }))).toBe("relance");
  });
});

describe("compterParCase — la somme fait le total", () => {
  const echantillon: LeadEtape[] = [
    lead({ status: "new" }),
    lead({ status: "contacted" }),
    lead({ status: "contacted" }),
    lead({ status: "contacted", relanceDue: true }),
    lead({ status: "new", rdv: { passe: false } }),
    lead({ status: "converted" }),
    lead({ status: "lost" }),
    lead({ status: "contacted", dormant: true }),
  ];

  it("chaque personne est comptée UNE fois — jamais deux", () => {
    const c = compterParCase(echantillon);
    const somme = (Object.keys(c) as CaseLead[]).reduce((n, k) => n + c[k], 0);
    expect(somme).toBe(echantillon.length);
  });

  it("compte juste, case par case", () => {
    expect(compterParCase(echantillon)).toEqual({
      nouveau: 1, contacte: 2, relance: 1, rdv: 1,
      converti: 1, perdu: 1, endormi: 1,
    });
  });

  it("« en cours » exclut converti, perdu et endormi", () => {
    expect(totalEnCours(compterParCase(echantillon))).toBe(5);
  });

  it("liste vide → tout à zéro", () => {
    expect(totalEnCours(compterParCase([]))).toBe(0);
  });

  it("LE CONTRAT : filtrer sur une case rend EXACTEMENT le compte annoncé", () => {
    // C'est précisément ce qui était faux dans l'app : la jauge annonçait un
    // nombre que la liste ne savait pas produire.
    const c = compterParCase(echantillon);
    for (const k of CASES_ACTIVES) {
      const filtres = echantillon.filter((l) => caseDuLead(l) === k);
      expect(filtres.length).toBe(c[k]);
    }
  });
});

describe("demandeUnGeste", () => {
  it("un nouveau et une relance due demandent un geste", () => {
    expect(demandeUnGeste(lead({ status: "new" }))).toBe(true);
    expect(demandeUnGeste(lead({ status: "contacted", relanceDue: true }))).toBe(true);
  });

  it("un rendez-vous calé n'en demande pas — il est calé", () => {
    expect(demandeUnGeste(lead({ status: "new", rdv: { passe: false } }))).toBe(false);
  });

  it("un contacté en attente de réponse n'en demande pas", () => {
    expect(demandeUnGeste(lead({ status: "contacted" }))).toBe(false);
  });

  it("ni un endormi, ni un converti, ni un perdu", () => {
    expect(demandeUnGeste(lead({ status: "contacted", dormant: true }))).toBe(false);
    expect(demandeUnGeste(lead({ status: "converted" }))).toBe(false);
    expect(demandeUnGeste(lead({ status: "lost" }))).toBe(false);
  });
});

describe("libellés", () => {
  it("chaque case a un mot affichable", () => {
    for (const k of Object.keys(LIBELLE_CASE) as CaseLead[]) {
      expect(LIBELLE_CASE[k].trim()).not.toBe("");
    }
  });
});
