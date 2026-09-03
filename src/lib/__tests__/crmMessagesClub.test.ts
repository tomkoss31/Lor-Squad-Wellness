// Les messages du club — les deux pièges qui sont VRAIMENT partis en prod
// le 03/09/2026, à quelques minutes d'intervalle. Ils se voient à l'œil en
// une seconde et ne se voient pas du tout dans une relecture de diff.
//
//   1. le repli du prénom valait "toi" → « Salut toi 👋 » à une inconnue ;
//   2. le vocatif portait sa propre virgule alors que la phrase en avait déjà
//      une → « Bonjour, Eric, c'est Mélanie et Thomas ».
//
// Cf. feedback_ton_messages_prospects.

import { describe, expect, it } from "vitest";
import { buildCrmMessage, buildCrmRelanceMessage, vocatif } from "../crmMessages";
import type { CrmLead } from "../../hooks/useCrmLeads";

const CTX = { coachFirstName: "Thomas", bilanUrl: "https://x/bilan", vipUrl: "https://x/vip" };

/** Un lead du club réduit à ce dont les messages se servent. */
function lead(p: Partial<CrmLead>): CrmLead {
  return {
    key: "t:0600000000",
    table: "prospect_leads",
    id: "id",
    firstName: "Eric",
    contact: "0600000000",
    contactIsPhone: true,
    phone: "0600000000",
    email: null,
    city: null,
    source: "meta-ads",
    status: "new",
    viaName: null,
    parrainPhone: null,
    parrainClientId: null,
    extra: null,
    ownerUserId: null,
    relanceDue: false,
    relanceDueAt: null,
    derniereReponse: null,
    ...p,
  } as CrmLead;
}

describe("le prénom dans les messages du club", () => {
  it("écrit « Bonjour Eric, c'est » — une seule virgule", () => {
    const m = buildCrmMessage(lead({ firstName: "Eric" }), CTX);
    expect(m).toContain("Bonjour Eric, c'est Mélanie et Thomas");
    expect(m).not.toContain("Bonjour, Eric");
  });

  it("sans prénom, garde la virgule mais n'invente personne", () => {
    const m = buildCrmMessage(lead({ firstName: "  " }), CTX);
    expect(m.startsWith("Bonjour, c'est Mélanie et Thomas")).toBe(true);
    expect(m).not.toMatch(/\btoi\b/);
  });

  it("ne bouche jamais un prénom absent par un mot creux", () => {
    expect(vocatif(lead({ firstName: "" }))).toBe("");
    expect(vocatif(lead({ firstName: " Laure " }))).toBe(" Laure");
  });
});

describe("ce que le message dit", () => {
  it("nomme l'objectif réel du lead, pas « ton objectif »", () => {
    const m = buildCrmMessage(lead({ objectif: "poids" }), CTX);
    expect(m).toContain("perdre du poids");
    expect(m).not.toContain("ton objectif");
  });

  it("se referme proprement quand l'objectif est inconnu", () => {
    const m = buildCrmMessage(lead({ objectif: null }), CTX);
    expect(m).toContain("Vous aviez rempli vos coordonnées.");
  });

  it("vouvoie, et ne signe pas La Base 360 pour un lead du club", () => {
    const m = buildCrmMessage(lead({}), CTX);
    expect(m).toContain("Breakfast Club");
    expect(m).not.toContain("La Base 360");
    expect(m).not.toMatch(/\btu\b|\bton\b|\bta\b/);
  });

  it("la relance passe par le texte du club, pas par le générique", () => {
    const m = buildCrmRelanceMessage(lead({ status: "contacted" }), CTX);
    expect(m).toContain("Bonjour Eric, c'est Mélanie et Thomas");
    expect(m).not.toContain("Hello");
  });

  it("laisse les autres sources tranquilles (VIP garde son angle)", () => {
    const m = buildCrmMessage(lead({ source: "vip" }), CTX);
    expect(m).toContain("Club VIP");
  });
});
