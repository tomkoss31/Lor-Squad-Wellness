// =============================================================================
// Ranger par GESTE — et surtout : les trois gestes ne se mélangent plus.
//
// Le défaut qu'on corrige, ce n'est pas « il y a trop d'informations », c'est
// que « Aujourd'hui · 7 » contenait quelqu'un qu'on n'a jamais appelé, quatre
// relances en retard et deux rendez-vous déjà pris. Le premier test est donc
// celui-là : les sept personnes réelles du CRM, et où elles tombent.
// =============================================================================

import { describe, expect, it } from "vitest";
import { grouperParZone, phraseEtat, zoneDe, ZONES, type LeadZone } from "../zones";

/** Mardi 18 août 2026, 9 h 20 — l'heure de la capture de Thomas. */
const T0 = new Date("2026-08-18T09:20:00+02:00");

const lead = (p: Partial<LeadZone> = {}): LeadZone => ({
  status: "new",
  createdAt: "2026-08-17T10:00:00+02:00",
  contactedAt: null,
  relanceDueAt: null,
  derniereReponse: null,
  rdv: "aucun",
  ...p,
});

describe("les 7 personnes du CRM ce matin-là", () => {
  const anthony = lead({ createdAt: "2026-08-17T18:00:00+02:00", rdv: "aVenir" });
  const armonie = lead({
    status: "contacted", contactedAt: "2026-08-12T18:46:00+02:00",
    derniereReponse: "pas_de_reponse", relanceDueAt: "2026-08-15T09:00:00+02:00",
  });
  const djamal = lead({ status: "contacted", contactedAt: "2026-08-05T10:00:00+02:00" });
  const malone = lead({ status: "contacted", contactedAt: "2026-08-17T10:00:00+02:00" });
  const celine = lead({ status: "contacted", rdv: "aVenir" });
  const mylene = lead({ status: "qualified", derniereReponse: "rdv" });

  it("Anthony a un rendez-vous : il n'est pas « à relancer »", () => {
    // Il n'a jamais été appelé, mais il a déjà un créneau — le geste est de le
    // recevoir, pas de le rappeler pour en caler un.
    expect(zoneDe(anthony, T0)).toBe("rdv");
  });

  it("Armonie devait être rappelée il y a 3 jours → à relancer", () => {
    expect(zoneDe(armonie, T0)).toBe("relancer");
  });

  it("Djamal et Malone, contactés sans suite → à relancer", () => {
    expect(zoneDe(djamal, T0)).toBe("relancer");
    expect(zoneDe(malone, T0)).toBe("relancer");
  });

  it("Céline et Mylène ont leur rendez-vous → rien à caler", () => {
    expect(zoneDe(celine, T0)).toBe("rdv");
    expect(zoneDe(mylene, T0)).toBe("rdv");
  });

  it("quelqu'un que personne n'a appelé et qui n'a pas de créneau est SEUL en tête", () => {
    const neuf = lead({ createdAt: "2026-08-18T08:00:00+02:00" });
    expect(zoneDe(neuf, T0)).toBe("jamais");
  });
});

describe("les deux pieges vus a l'ecran le 18/08", () => {
  it("un lead prospect qui a dit « RDV cale » compte comme un rendez-vous", () => {
    // `prospect_leads` ne connait pas le statut « qualified » : la traduction
    // le range en « contacted ». Mylene, qui avait pris rendez-vous, retombait
    // donc dans « A relancer » — sa derniere reponse est la seule preuve.
    const mylene = lead({ status: "contacted", derniereReponse: "rdv", contactedAt: "2026-08-16T10:00:00+02:00" });
    expect(zoneDe(mylene, T0)).toBe("rdv");
    expect(phraseEtat(mylene, T0)).toBe("Rendez-vous pris");
  });

  it("un rendez-vous passe ne masque pas ce qui a ete dit depuis", () => {
    // Sinon « son rendez-vous est passe » recouvrait le « pas le bon moment »
    // qui a suivi — la vraie raison de son retour dans un mois.
    const l = lead({
      status: "contacted", rdv: "passe", derniereReponse: "pas_maintenant",
      relanceDueAt: "2026-09-17T09:00:00+02:00",
    });
    expect(phraseEtat(l, T0)).toBe("Pas le bon moment");
    expect(zoneDe(l, T0)).toBe("plusTard");
  });

  it("sans rien de prevu, le rendez-vous passe reste ce qu'il faut dire", () => {
    const l = lead({ status: "contacted", rdv: "passe", contactedAt: "2026-08-10T10:00:00+02:00" });
    expect(phraseEtat(l, T0)).toBe("Son rendez-vous est passe".replace("passe", "passé"));
  });
});

describe("l'ordre des tests compte", () => {
  it("un rendez-vous passe avant une relance en retard", () => {
    // Sinon quelqu'un qui a pris rendez-vous vendredi resterait « à relancer »
    // parce qu'une vieille date de rappel traîne sur sa fiche.
    const l = lead({
      status: "contacted", contactedAt: "2026-08-10T10:00:00+02:00",
      relanceDueAt: "2026-08-12T09:00:00+02:00", rdv: "aVenir",
    });
    expect(zoneDe(l, T0)).toBe("rdv");
  });

  it("converti ou perdu passe avant tout le reste, même avec un créneau", () => {
    expect(zoneDe(lead({ status: "converted", rdv: "aVenir" }), T0)).toBe("refermes");
    expect(zoneDe(lead({ status: "lost", rdv: "aVenir" }), T0)).toBe("refermes");
  });

  it("un rendez-vous PASSÉ ne protège plus : il faut conclure", () => {
    const l = lead({ status: "contacted", contactedAt: "2026-08-10T10:00:00+02:00", rdv: "passe" });
    expect(zoneDe(l, T0)).toBe("relancer");
  });
});

describe("ce qui n'est pas pour aujourd'hui reste rangé par date", () => {
  it("une relance à J+3 va dans « Cette semaine »", () => {
    const l = lead({
      status: "contacted", contactedAt: "2026-08-18T08:00:00+02:00",
      derniereReponse: "rappellera", relanceDueAt: "2026-08-21T09:00:00+02:00",
    });
    expect(zoneDe(l, T0)).toBe("semaine");
  });

  it("une relance à un mois va dans « Plus tard »", () => {
    const l = lead({
      status: "contacted", derniereReponse: "pas_maintenant",
      relanceDueAt: "2026-09-17T09:00:00+02:00",
    });
    expect(zoneDe(l, T0)).toBe("plusTard");
  });
});

describe("personne ne disparaît", () => {
  it("chaque lead tombe dans une zone et une seule", () => {
    const echantillon = [
      lead(), lead({ status: "contacted" }), lead({ status: "qualified" }),
      lead({ status: "converted" }), lead({ status: "lost" }),
      lead({ rdv: "aVenir" }), lead({ rdv: "passe" }),
      lead({ status: "contacted", relanceDueAt: "2026-08-25T09:00:00+02:00" }),
    ];
    const groupes = grouperParZone(echantillon, T0);
    const total = groupes.reduce((n, g) => n + g.leads.length, 0);
    expect(total).toBe(echantillon.length);
  });

  it("les six zones sont toujours rendues, même vides", () => {
    expect(grouperParZone([], T0).map((g) => g.cle)).toEqual(ZONES.map((z) => z.cle));
  });

  it("dans une zone, le plus ancien passe devant", () => {
    const vieux = lead({ status: "contacted", contactedAt: "2026-08-01T10:00:00+02:00", createdAt: "2026-08-01T10:00:00+02:00" });
    const recent = lead({ status: "contacted", contactedAt: "2026-08-17T10:00:00+02:00", createdAt: "2026-08-17T10:00:00+02:00" });
    const zone = grouperParZone([recent, vieux], T0).find((g) => g.cle === "relancer")!;
    expect(zone.leads[0]).toBe(vieux);
  });
});

describe("la phrase remplace quatre badges", () => {
  it("dit depuis quand on devait rappeler, pas un nombre de jours nu", () => {
    const armonie = lead({
      status: "contacted", derniereReponse: "pas_de_reponse",
      relanceDueAt: "2026-08-15T09:00:00+02:00",
    });
    expect(phraseEtat(armonie, T0)).toBe("Appelé·e, pas de réponse · tu devais rappeler il y a 3 jours");
  });

  it("dit « aucune suite prévue » en clair, pas « sans suite » en badge", () => {
    const djamal = lead({ status: "contacted", contactedAt: "2026-08-05T10:00:00+02:00" });
    expect(phraseEtat(djamal, T0)).toBe("Contacté·e il y a 13 jours · aucune suite prévue");
  });

  it("« hier » plutôt que « il y a 1 jour »", () => {
    const malone = lead({ status: "contacted", contactedAt: "2026-08-17T10:00:00+02:00" });
    expect(phraseEtat(malone, T0)).toContain("hier");
  });

  it("un nouveau dit depuis quand il attend", () => {
    expect(phraseEtat(lead(), T0)).toBe("Jamais rappelé·e · arrivé·e hier");
  });

  it("un rendez-vous se dit en deux mots", () => {
    expect(phraseEtat(lead({ rdv: "aVenir" }), T0)).toBe("Rendez-vous pris");
    expect(phraseEtat(lead({ status: "qualified" }), T0)).toBe("Rendez-vous pris");
  });

  it("aucune phrase n'est vide, quel que soit le lead", () => {
    for (const l of [lead(), lead({ status: "converted" }), lead({ status: "lost" }),
                     lead({ rdv: "passe" }), lead({ status: "contacted", relanceDueAt: "2026-08-30T09:00:00+02:00" })]) {
      expect(phraseEtat(l, T0).length).toBeGreaterThan(8);
    }
  });
});
