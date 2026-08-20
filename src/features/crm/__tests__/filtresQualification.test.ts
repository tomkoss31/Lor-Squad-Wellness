import { describe, expect, it } from "vitest";
import type { CrmLead } from "../../../hooks/useCrmLeads";
import { FILTRE_VIDE, nbActifs, passe, porteLeSignal } from "../filtresQualification";

const JOUR = 86_400_000;

/** Un lead minimal — seuls les champs que le filtre regarde sont posés. */
function lead(p: Partial<CrmLead> = {}): CrmLead {
  return {
    key: "k",
    id: "i",
    table: "prospect_leads",
    firstName: "Test",
    status: "new",
    source: "site-web",
    createdAt: new Date().toISOString(),
    contactedAt: null,
    relanceDueAt: null,
    relanceDue: false,
    derniereReponse: null,
    ownerUserId: null,
    dormant: false,
    ...p,
  } as unknown as CrmLead;
}

describe("filtres de qualification", () => {
  it("laisse tout passer quand rien n'est coché", () => {
    expect(passe(lead(), FILTRE_VIDE)).toBe(true);
    expect(nbActifs(FILTRE_VIDE)).toBe(0);
  });

  describe("les signaux ne parlent que des leads vivants", () => {
    // C'est le piège du filtre : sans cette règle, « sans suite prévue » se
    // remplit de convertis et de perdus — qui n'ont par définition aucune
    // suite à prévoir — et devient inutilisable au bout d'un mois.
    it("un converti n'est PAS « sans suite prévue »", () => {
      expect(porteLeSignal(lead({ status: "converted" }), "sansSuite")).toBe(false);
    });

    it("un perdu n'est PAS « jamais contacté »", () => {
      expect(porteLeSignal(lead({ status: "lost" }), "jamaisContacte")).toBe(false);
    });

    it("un endormi n'est PAS « sans mouvement »", () => {
      const vieux = new Date(Date.now() - 30 * JOUR).toISOString();
      expect(porteLeSignal(lead({ createdAt: vieux, dormant: true }), "sansMouvement")).toBe(false);
    });

    it("mais un lead vivant sans date de retour l'est", () => {
      expect(porteLeSignal(lead({ relanceDueAt: null }), "sansSuite")).toBe(true);
    });
  });

  it("« non attribué » vaut aussi pour un lead refermé — il reste sans propriétaire", () => {
    expect(porteLeSignal(lead({ status: "converted", ownerUserId: null }), "nonAttribue")).toBe(true);
    expect(porteLeSignal(lead({ ownerUserId: "u1" }), "nonAttribue")).toBe(false);
  });

  it("« sans mouvement » se déclenche à 5 jours, pas à 4", () => {
    const j4 = new Date(Date.now() - 4 * JOUR).toISOString();
    const j5 = new Date(Date.now() - 5 * JOUR).toISOString();
    expect(porteLeSignal(lead({ createdAt: j4 }), "sansMouvement")).toBe(false);
    expect(porteLeSignal(lead({ createdAt: j5 }), "sansMouvement")).toBe(true);
  });

  it("plusieurs signaux se cumulent en ET — on cherche les cas les plus abîmés", () => {
    const recent = lead({ createdAt: new Date().toISOString(), ownerUserId: "u1" });
    // Il est bien sans suite, mais il a un propriétaire : les deux exigés → non.
    expect(passe(recent, { ...FILTRE_VIDE, signaux: ["sansSuite", "nonAttribue"] })).toBe(false);
    expect(passe(recent, { ...FILTRE_VIDE, signaux: ["sansSuite"] })).toBe(true);
  });

  it("l'objectif filtre sur la valeur exacte, et un lead sans objectif est écarté", () => {
    expect(passe(lead({ objectif: "poids" }), { ...FILTRE_VIDE, objectifs: ["poids"] })).toBe(true);
    expect(passe(lead({ objectif: "muscle" }), { ...FILTRE_VIDE, objectifs: ["poids"] })).toBe(false);
    expect(passe(lead({ objectif: null }), { ...FILTRE_VIDE, objectifs: ["poids"] })).toBe(false);
  });

  it("compte les filtres actifs toutes familles confondues", () => {
    expect(nbActifs({ temperatures: ["hot"], signaux: ["sansSuite"], objectifs: [] })).toBe(2);
  });
});
