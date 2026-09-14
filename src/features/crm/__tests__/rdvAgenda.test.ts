import { describe, expect, it } from "vitest";
import {
  DUREE_RDV_PAR_DEFAUT_MIN,
  indexerAgenda,
  meilleurRdv,
  prefillRdvDepuisLead,
  rdvAgendaDuLead,
  rdvDepuisAgenda,
  type LeadPourRdv,
} from "../rdvAgenda";

// Le 14/09 à 16 h (Paris) : le moment où Romane a calé le rendez-vous.
const MAINTENANT = Date.parse("2026-09-14T14:00:00Z");

/** La ligne réelle de Nathalie Duhayon dans `prospects`, à peine anonymisée. */
function ligne(o: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "agenda-1",
    status: "scheduled",
    rdv_date: "2026-09-15T15:15:00+00:00",
    duration_min: null,
    distributor_id: "romane",
    first_name: "Nathalie",
    last_name: "Duhayon",
    phone: "0645770460",
    email: "nathalieduhayon51@gmail.com",
    ...o,
  };
}

describe("rdvDepuisAgenda", () => {
  it("fait d'une ligne d'agenda un rendez-vous marqué comme tel", () => {
    const rdv = rdvDepuisAgenda(ligne(), MAINTENANT);
    expect(rdv).not.toBeNull();
    expect(rdv!.origine).toBe("agenda");
    expect(rdv!.clubId).toBeNull();
    expect(rdv!.coachUserId).toBe("romane");
    expect(rdv!.passe).toBe(false);
  });

  it("applique une heure quand aucune durée n'est saisie", () => {
    const rdv = rdvDepuisAgenda(ligne(), MAINTENANT)!;
    const ecart = Date.parse(rdv.slotEnd!) - Date.parse(rdv.slotStart);
    expect(ecart).toBe(DUREE_RDV_PAR_DEFAUT_MIN * 60_000);
  });

  it("respecte la durée saisie", () => {
    const rdv = rdvDepuisAgenda(ligne({ duration_min: 45 }), MAINTENANT)!;
    expect(Date.parse(rdv.slotEnd!) - Date.parse(rdv.slotStart)).toBe(45 * 60_000);
  });

  it("ignore un rendez-vous déjà tranché", () => {
    for (const status of ["done", "no_show", "cancelled", "converted"]) {
      expect(rdvDepuisAgenda(ligne({ status }), MAINTENANT)).toBeNull();
    }
  });

  it("ignore une date illisible", () => {
    expect(rdvDepuisAgenda(ligne({ rdv_date: "pas une date" }), MAINTENANT)).toBeNull();
    expect(rdvDepuisAgenda(ligne({ rdv_date: null }), MAINTENANT)).toBeNull();
  });

  it("sait qu'un rendez-vous est passé", () => {
    const rdv = rdvDepuisAgenda(ligne({ rdv_date: "2026-09-10T08:00:00Z" }), MAINTENANT)!;
    expect(rdv.passe).toBe(true);
  });
});

describe("rdvAgendaDuLead — le cas de Nathalie Duhayon", () => {
  const index = indexerAgenda([ligne()], MAINTENANT);

  it("retrouve le rendez-vous calé depuis le CRM, même numéro écrit autrement", () => {
    const rdv = rdvAgendaDuLead({ phone: "+33 6 45 77 04 60", email: null }, index);
    expect(rdv?.id).toBe("agenda-1");
  });

  it("retrouve par l'adresse, sans tenir compte des majuscules", () => {
    const rdv = rdvAgendaDuLead({ phone: null, email: "NathalieDuhayon51@Gmail.com" }, index);
    expect(rdv?.id).toBe("agenda-1");
  });

  it("retrouve par le nom complet quand le contact manque des deux côtés", () => {
    const sansContact = indexerAgenda([ligne({ phone: null, email: null })], MAINTENANT);
    const rdv = rdvAgendaDuLead(
      { phone: null, email: null, firstName: "nathalie", lastName: "DUHAYON" },
      sansContact,
    );
    expect(rdv?.id).toBe("agenda-1");
  });

  it("ne rattache JAMAIS sur le prénom seul", () => {
    const sansContact = indexerAgenda([ligne({ phone: null, email: null })], MAINTENANT);
    expect(
      rdvAgendaDuLead({ phone: null, email: null, firstName: "Nathalie", lastName: null }, sansContact),
    ).toBeNull();
  });

  it("ne rattache pas un inconnu", () => {
    expect(rdvAgendaDuLead({ phone: "0611223344", email: "autre@exemple.fr" }, index)).toBeNull();
  });
});

describe("meilleurRdv", () => {
  const a = rdvDepuisAgenda(ligne({ id: "futur-loin", rdv_date: "2026-09-20T08:00:00Z" }), MAINTENANT)!;
  const b = rdvDepuisAgenda(ligne({ id: "futur-proche", rdv_date: "2026-09-15T08:00:00Z" }), MAINTENANT)!;
  const c = rdvDepuisAgenda(ligne({ id: "passe", rdv_date: "2026-09-01T08:00:00Z" }), MAINTENANT)!;

  it("préfère un rendez-vous à venir à un rendez-vous passé", () => {
    expect(meilleurRdv(c, a)?.id).toBe("futur-loin");
    expect(meilleurRdv(a, c)?.id).toBe("futur-loin");
  });

  it("entre deux à venir, garde le plus proche", () => {
    expect(meilleurRdv(a, b)?.id).toBe("futur-proche");
  });

  it("supporte l'absence d'un des deux", () => {
    expect(meilleurRdv(null, a)?.id).toBe("futur-loin");
    expect(meilleurRdv(a, undefined)?.id).toBe("futur-loin");
    expect(meilleurRdv(null, null)).toBeNull();
  });

  it("l'index garde le plus pertinent quand une personne a deux rendez-vous", () => {
    const index = indexerAgenda(
      [ligne({ id: "passe", rdv_date: "2026-09-01T08:00:00Z" }), ligne({ id: "demain" })],
      MAINTENANT,
    );
    expect(rdvAgendaDuLead({ phone: "0645770460", email: null }, index)?.id).toBe("demain");
  });
});

describe("prefillRdvDepuisLead", () => {
  const lead: LeadPourRdv = {
    firstName: "Nathalie",
    lastName: "Duhayon",
    phone: "0645770460",
    email: "nathalieduhayon51@gmail.com",
    contact: "0645770460",
    contactIsPhone: true,
    source: "meta-ads",
    viaName: null,
    notes: "Lead Meta",
    ownerUserId: "romane",
  };

  it("transmet le nom ET l'email — c'était le trou du 14/09", () => {
    const p = prefillRdvDepuisLead(lead, "Pub Meta");
    expect(p.lastName).toBe("Duhayon");
    expect(p.email).toBe("nathalieduhayon51@gmail.com");
    expect(p.phone).toBe("0645770460");
  });

  it("range un lead de la pub dans la source « Meta Ads » de l'agenda", () => {
    expect(prefillRdvDepuisLead(lead, "Pub Meta").source).toBe("Meta Ads");
    expect(prefillRdvDepuisLead({ ...lead, source: "reco-client" }, "Reco").source).toBe("Parrainage");
    expect(prefillRdvDepuisLead({ ...lead, source: "welcome" }, "Site web").source).toBe("Autre");
  });

  it("met le rendez-vous chez le coach à qui le lead est confié", () => {
    expect(prefillRdvDepuisLead(lead, "Pub Meta").distributorId).toBe("romane");
    expect(prefillRdvDepuisLead({ ...lead, ownerUserId: null }, "Pub Meta").distributorId).toBeUndefined();
  });

  it("ne pré-remplit pas le tiret qui remplace un prénom absent", () => {
    expect(prefillRdvDepuisLead({ ...lead, firstName: "—" }, "Pub Meta").firstName).toBeUndefined();
  });

  it("garde le téléphone de l'ancien champ quand la colonne dédiée manque", () => {
    const p = prefillRdvDepuisLead({ ...lead, phone: null, email: null }, "Pub Meta");
    expect(p.phone).toBe("0645770460");
    expect(p.email).toBeUndefined();
  });

  it("décrit la provenance comme avant", () => {
    expect(prefillRdvDepuisLead({ ...lead, viaName: "Marie D." }, "Pub Meta").sourceDetail).toBe(
      "CRM · Pub Meta (via Marie D.)",
    );
  });
});
