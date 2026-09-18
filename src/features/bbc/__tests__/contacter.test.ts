import { describe, expect, it } from "vitest";
import { aContacter, attente, messagePour } from "../contacter";
import type { CrmLead } from "../../../hooks/useCrmLeads";
import type { BbcMember } from "../useBbcMembers";
import type { HeartMember } from "../useBbcHearts";

const now = new Date("2026-09-18T07:02:00+02:00");

const lead = (p: Partial<CrmLead>): CrmLead =>
  ({
    key: "pl:1", table: "prospect_leads", id: "1", firstName: "Camille", contact: null, contactIsPhone: true,
    phone: "0612345678", email: null, city: null, source: "welcome", status: "new", viaName: null, parrainPhone: null,
    parrainClientId: null, extra: null, ownerUserId: null, relanceDue: false, relanceDueAt: null, derniereReponse: null,
    createdAt: "2026-09-18T06:41:00+02:00",
    ...p,
  }) as CrmLead;

const membre = (p: Partial<BbcMember>): BbcMember =>
  ({ id: "m1", name: "Léa", started: true, visits: 9, hearts: 0, pendingHearts: 0, visitedToday: false, card: { type: 10, used: 9, remaining: 1, expired: false }, ...p }) as BbcMember;

describe("qui contacter aujourd'hui", () => {
  it("un lead nouveau vient en premier, avec son attente", () => {
    const l = aContacter({ leads: [lead({})], membres: [], coeurs: [], maintenant: now });
    expect(l).toHaveLength(1);
    expect(l[0].raison).toBe("lead_nouveau");
    expect(l[0].geste).toBe("appeler");
    expect(l[0].texte).toContain("attend depuis 21 min");
  });

  it("un lead sans téléphone se contacte par écrit", () => {
    const l = aContacter({ leads: [lead({ phone: null, email: "a@b.fr" })], membres: [], coeurs: [], maintenant: now });
    expect(l[0].geste).toBe("ecrire");
  });

  it("un lead perdu, converti ou dormant n'apparaît pas", () => {
    const l = aContacter({ leads: [lead({ status: "lost" }), lead({ key: "pl:2", status: "converted" }), lead({ key: "pl:3", dormant: true })], membres: [], coeurs: [], maintenant: now });
    expect(l).toHaveLength(0);
  });

  it("une relance due passe après les nouveaux", () => {
    const l = aContacter({ leads: [lead({ key: "pl:2", status: "contacted", relanceDue: true }), lead({})], membres: [], coeurs: [], maintenant: now });
    expect(l.map((c) => c.raison)).toEqual(["lead_nouveau", "relance_due"]);
  });

  it("la 9e visite et la carte finie remontent depuis les membres", () => {
    const l = aContacter({ leads: [], membres: [membre({}), membre({ id: "m2", name: "Malik", card: { type: 10, used: 10, remaining: 0, expired: false } })], coeurs: [], maintenant: now });
    expect(l.map((c) => c.raison).sort()).toEqual(["carte_finie", "neuvieme_visite"]);
  });

  it("une carte expirée ou absente ne déclenche rien", () => {
    const l = aContacter({ leads: [], membres: [membre({ card: null }), membre({ id: "m2", card: { type: 10, used: 10, remaining: 0, expired: true } })], coeurs: [], maintenant: now });
    expect(l).toHaveLength(0);
  });

  it("à un cœur du palier → on demande une amie, sauf si la personne est déjà dans la liste", () => {
    const coeurs: HeartMember[] = [{ key: "m1", name: "Léa", hearts: 1, pending: 0 } as HeartMember, { key: "m9", name: "Yann", hearts: 1, pending: 0 } as HeartMember];
    const l = aContacter({ leads: [], membres: [membre({})], coeurs, maintenant: now });
    expect(l.map((c) => c.nom)).toEqual(["Léa", "Yann"]);
    expect(l.find((c) => c.nom === "Yann")?.raison).toBe("coeur");
  });

  it("le tri : urgence, puis la plus longue attente", () => {
    const l = aContacter({ leads: [lead({}), lead({ key: "pl:2", firstName: "Bruno", createdAt: "2026-09-17T23:10:00+02:00" })], membres: [], coeurs: [], maintenant: now });
    expect(l.map((c) => c.nom)).toEqual(["Bruno", "Camille"]);
  });
});

describe("les petites phrases", () => {
  it("attente", () => {
    expect(attente(21)).toBe("attend depuis 21 min");
    expect(attente(8 * 60)).toBe("attend depuis 8 h");
    expect(attente(3 * 24 * 60)).toBe("attend depuis 3 jours");
  });
  it("le message parle à la première personne, avec le prénom du coach", () => {
    const c = aContacter({ leads: [lead({})], membres: [], coeurs: [], maintenant: now })[0];
    expect(messagePour(c, "Thomas")).toContain("c'est Thomas du Breakfast Club");
    expect(messagePour(c, "Thomas")).toContain("Camille");
  });
});
