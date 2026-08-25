// Le cas REEL du 25/08 : 6 RDV confirmes, l'entonnoir en affichait 1.
import { describe, expect, it } from "vitest";
import { etapeDuLead } from "../etapeLead";

describe("etapeDuLead", () => {
  it("LE CAS DU 25/08 : un creneau a venir vaut « RDV cale », meme si status=new", () => {
    // Ghislaine / Amandine / Cassandre : reservation confirmee, `status` reste
    // « new » en base parce que personne ne l'a changee a la main.
    expect(etapeDuLead({ status: "new", rdv: { passe: false } })).toBe("qualified");
  });

  it("un RDV PASSE ne vaut plus « RDV cale » — c'est le suivi qui tranche", () => {
    expect(etapeDuLead({ status: "new", rdv: { passe: true } })).toBe("new");
  });

  it("la reponse « rdv » de la feuille Et alors ? compte aussi", () => {
    // prospect_leads ne connait pas le statut « qualified » : sans cette regle,
    // un lead club qui a dit « RDV cale » retombait en « Contacte ».
    expect(etapeDuLead({ status: "contacted", derniereReponse: "rdv" })).toBe("qualified");
  });

  it("sans rendez-vous, on garde le statut tel quel", () => {
    expect(etapeDuLead({ status: "new" })).toBe("new");
    expect(etapeDuLead({ status: "contacted" })).toBe("contacted");
  });

  // ── LE PLACARD (mesure du 25/08 : 9 personnes injoignables) ────────────
  it("« RDV cale » dit a la main vaut TANT QUE le filet n'a pas sonne", () => {
    expect(etapeDuLead({ status: "contacted", derniereReponse: "rdv", relanceDue: false })).toBe("qualified");
  });

  it("quand le filet SONNE, la personne sort du placard et redevient joignable", () => {
    // Avant le 25/08, « rdv » collait a la fiche a vie : le rendez-vous etait
    // passe depuis des jours, aucune fiche cliente creee, et la personne
    // restait rangee « rien a faire » pour toujours.
    expect(etapeDuLead({ status: "contacted", derniereReponse: "rdv", relanceDue: true })).toBe("contacted");
  });

  it("mais un vrai creneau A VENIR prime sur le filet", () => {
    // Elle a un rendez-vous demain : peu importe qu'une echeance traine.
    expect(etapeDuLead({ status: "new", derniereReponse: "rdv", relanceDue: true, rdv: { passe: false } })).toBe("qualified");
  });

  it("converti et perdu priment sur tout", () => {
    expect(etapeDuLead({ status: "converted", rdv: { passe: false } })).toBe("converted");
    expect(etapeDuLead({ status: "lost", rdv: { passe: false } })).toBe("lost");
  });

  it("un statut inconnu retombe sur « new » plutot que de disparaitre", () => {
    // Les tables n'ont pas le meme vocabulaire (online_bilans dit « contact »).
    // Un statut non reconnu ne doit jamais faire sortir quelqu'un de l'entonnoir.
    expect(etapeDuLead({ status: "n_importe_quoi" })).toBe("new");
  });

  it("MEME REPONSE que la vue Liste pour le meme lead", () => {
    // C'est tout l'objet du module : board, entonnoir et liste s'accordent.
    const lead = { status: "new", rdv: { passe: false } };
    expect(etapeDuLead(lead)).toBe("qualified"); // board + entonnoir
    // `zoneDe` rangeait deja ce lead dans « rdv » (features/crm/zones.ts:69).
  });
});
