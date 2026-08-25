// Le cas vu sur l'ecran de Thomas le 25/08 : une carte qui crie « aucune suite
// prevue » a quelqu'un qui a rendez-vous le lendemain.
import { describe, expect, it } from "vitest";
import { etatDe } from "../CrmCarteLead";
import type { CrmLead } from "../../../hooks/useCrmLeads";

const jours = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
const lead = (p: Record<string, unknown> = {}): CrmLead => ({
  key: "x", table: "prospect_leads", id: "x", firstName: "Ghislaine",
  contact: "g@x.fr", contactIsPhone: false, phone: null, email: "g@x.fr",
  city: null, source: "site-club", status: "new", viaName: null,
  parrainPhone: null, parrainClientId: null, extra: null, ownerUserId: null,
  relanceDue: false, relanceDueAt: null, derniereReponse: null,
  resultToken: null, callbackRequestedAt: null, engagement: null,
  createdAt: jours(1), contactedAt: null, notes: null,
  ...p,
} as unknown as CrmLead);

describe("etatDe — la carte du board", () => {
  it("LE CAS DU 25/08 : un RDV a venir sans date de relance n'est PAS « sans suite »", () => {
    expect(etatDe(lead({ rdv: { passe: false }, relanceDueAt: null }))).toBe("saine");
  });

  it("un RDV a venir bat aussi « N jours sans mouvement »", () => {
    expect(etatDe(lead({ createdAt: jours(20), rdv: { passe: false } }))).toBe("saine");
  });

  it("sans rendez-vous, « aucune suite prevue » reste juste", () => {
    expect(etatDe(lead({ relanceDueAt: null }))).toBe("sansSuite");
  });

  it("un RDV PASSE reste signale — c'est le seul cas ou il faut agir", () => {
    expect(etatDe(lead({ rdv: { passe: true } }))).toBe("rdvPasse");
  });

  it("une relance en retard reste en retard quand il n'y a pas de RDV", () => {
    expect(etatDe(lead({ relanceDueAt: jours(3), relanceDue: true }))).toBe("retard");
  });
});
