// =============================================================================
// La date est la conséquence du geste — c'est toute la promesse de l'écran.
//
// Si quelqu'un « améliore » ces délais un jour, c'est ici que ça doit casser,
// pas le matin où Thomas cherche pourquoi Laure n'est jamais remontée.
// =============================================================================

import { describe, expect, it } from "vitest";
import {
  REPONSES,
  REPONSE_PAR_CLE,
  HEURE_DE_RELANCE,
  dateDeRetour,
  ecritureFor,
  quandRevient,
  quandCourt,
  messageDeRelance,
  type CleReponse,
} from "../qualification";

/** Jeudi 13 août 2026, 9 h 10 — le moment exact décrit par Thomas. */
const T0 = new Date("2026-08-13T09:10:00+02:00");

describe("les six réponses", () => {
  it("couvre exactement ce que Thomas a demandé", () => {
    expect(REPONSES.map((r) => r.cle)).toEqual([
      "pas_de_reponse",
      "rappellera",
      "ne_sait_pas",
      "pas_maintenant",
      "plus_interesse",
      "rdv",
    ]);
  });

  it("annonce toujours ce qui va se passer — aucun tap ne doit surprendre", () => {
    for (const r of REPONSES) {
      expect(r.titre.trim()).not.toBe("");
      expect(r.quand.trim()).not.toBe("");
      expect(r.resume.trim()).not.toBe("");
    }
  });

  it("deux seulement ne font pas revenir la personne", () => {
    const sansRetour = REPONSES.filter((r) => r.jours === null).map((r) => r.cle);
    expect(sansRetour).toEqual(["plus_interesse", "rdv"]);
  });

  it("aucune ne laisse quelqu'un dans le vide : « contacté » sans échéance n'existe plus", () => {
    for (const r of REPONSES) {
      if (r.jours !== null) expect(r.statut).toBe("to_recontact");
    }
  });
});

describe("dateDeRetour", () => {
  it("« pas de réponse » ramène demain", () => {
    const iso = dateDeRetour(REPONSE_PAR_CLE.pas_de_reponse, T0)!;
    expect(new Date(iso).getDate()).toBe(14);
  });

  it("cale à 9 h du matin, pas à l'heure du clic", () => {
    const tard = new Date("2026-08-13T23:50:00+02:00");
    const d = new Date(dateDeRetour(REPONSE_PAR_CLE.pas_de_reponse, tard)!);
    expect(d.getHours()).toBe(HEURE_DE_RELANCE);
    // Sinon la relance retomberait à 23 h 50 — après la journée de travail,
    // donc jamais vue.
    expect(d.getDate()).toBe(14);
  });

  it("respecte les quatre délais annoncés", () => {
    const attendus: Array<[CleReponse, number]> = [
      ["pas_de_reponse", 1],
      ["rappellera", 3],
      ["ne_sait_pas", 7],
      ["pas_maintenant", 30],
    ];
    for (const [cle, jours] of attendus) {
      const d = new Date(dateDeRetour(REPONSE_PAR_CLE[cle], T0)!);
      const attendu = new Date(T0);
      attendu.setDate(attendu.getDate() + jours);
      expect(d.getDate()).toBe(attendu.getDate());
      expect(d.getMonth()).toBe(attendu.getMonth());
    }
  });

  it("franchit proprement la fin du mois", () => {
    const finAout = new Date("2026-08-30T10:00:00+02:00");
    const d = new Date(dateDeRetour(REPONSE_PAR_CLE.pas_maintenant, finAout)!);
    expect(d.getMonth()).toBe(8); // septembre
    expect(d.getDate()).toBe(29);
  });

  it("rend null quand la personne ne revient pas", () => {
    expect(dateDeRetour(REPONSE_PAR_CLE.plus_interesse, T0)).toBeNull();
    expect(dateDeRetour(REPONSE_PAR_CLE.rdv, T0)).toBeNull();
  });
});

describe("ce qu'on écrit en base", () => {
  it("une nouvelle échéance naît OUVERTE, sinon elle ne sonne jamais", () => {
    // `crm-relance-notifier` lit « encore due » comme
    // `relance_due_at <= now AND relance_done_at IS NULL`. Poser une échéance
    // ET la marquer faite du même geste, c'est créer un rappel muet.
    const e = ecritureFor(REPONSE_PAR_CLE.rappellera, T0);
    expect(e.relance_due_at).not.toBeNull();
    expect(e.relance_done_at).toBeNull();
  });

  it("referme au contraire quand personne ne revient", () => {
    for (const cle of ["plus_interesse", "rdv"] as const) {
      const e = ecritureFor(REPONSE_PAR_CLE[cle], T0);
      expect(e.relance_due_at).toBeNull();
      expect(e.relance_done_at).toBe(T0.toISOString());
    }
  });

  it("marque toujours le contact — c'est ce qui sort la personne des « jamais rappelés »", () => {
    for (const r of REPONSES) {
      expect(ecritureFor(r, T0).contacted_at).toBe(T0.toISOString());
    }
  });

  it("« plus intéressé » referme sans échéance", () => {
    const e = ecritureFor(REPONSE_PAR_CLE.plus_interesse, T0);
    expect(e.status).toBe("lost");
    expect(e.relance_due_at).toBeNull();
  });

  it("« RDV calé » sort du CRM par le bon statut", () => {
    expect(ecritureFor(REPONSE_PAR_CLE.rdv, T0).status).toBe("qualified");
  });

  it("n'écrit que des valeurs acceptées par la contrainte en base", () => {
    const autorises = ["new", "contacted", "to_recontact", "converted", "lost", "qualified"];
    for (const r of REPONSES) {
      expect(autorises).toContain(ecritureFor(r, T0).status);
    }
  });
});

describe("quandRevient — ce qu'on lit dans la liste", () => {
  it("dit « aujourd'hui » pour une échéance passée ou du jour", () => {
    expect(quandRevient("2026-08-13T09:00:00+02:00", T0)).toBe("aujourd'hui");
    expect(quandRevient("2026-08-01T09:00:00+02:00", T0)).toBe("aujourd'hui");
  });

  it("dit « demain », puis le jour de la semaine, puis la date", () => {
    expect(quandRevient("2026-08-14T09:00:00+02:00", T0)).toBe("demain");
    expect(quandRevient("2026-08-16T09:00:00+02:00", T0)).toMatch(/dimanche/i);
    expect(quandRevient("2026-09-12T09:00:00+02:00", T0)).toMatch(/sept/i);
  });

  it("ne ment pas sur une date absente ou invalide", () => {
    expect(quandRevient(null, T0)).toBe("ne revient pas");
    expect(quandRevient("pas une date", T0)).toBe("date inconnue");
  });
});

describe("le message de 2e tentative", () => {
  it("nomme ce qui s'est passé la fois d'avant", () => {
    expect(messageDeRelance("pas_de_reponse", "Laure", "Thomas")).toMatch(/sans réussir à vous joindre/i);
    expect(messageDeRelance("rappellera", "Laure", "Thomas")).toMatch(/vous me rappeliez/i);
    expect(messageDeRelance("ne_sait_pas", "Laure", "Thomas")).toMatch(/hésitiez/i);
    expect(messageDeRelance("pas_maintenant", "Laure", "Thomas")).toMatch(/pas le bon moment/i);
  });

  it("ne redit JAMAIS « tu as laissé tes coordonnées » à quelqu'un déjà appelé", () => {
    const dejaContactes: CleReponse[] = ["pas_de_reponse", "rappellera", "ne_sait_pas", "pas_maintenant"];
    for (const cle of dejaContactes) {
      expect(messageDeRelance(cle, "Laure", "Thomas")).not.toMatch(/laissé (vos|tes) coordonnées/i);
    }
  });

  it("signe toujours du prénom du coach, et nomme la personne", () => {
    for (const cle of REPONSES.map((r) => r.cle)) {
      const m = messageDeRelance(cle, "Laure", "Thomas");
      expect(m).toContain("Laure");
      expect(m).toContain("Thomas");
    }
  });

  it("supporte un premier contact sans historique", () => {
    const m = messageDeRelance(null, "Laure", "Thomas");
    expect(m).toContain("Laure");
    expect(m.trim().length).toBeGreaterThan(30);
  });
});

// =============================================================================
// La version courte, pour la barre des relances en lot (18/08).
// =============================================================================

describe("quandCourt — le delai en trois mots", () => {
  it("donne le meme sens que `quand`, en plus court", () => {
    expect(quandCourt(REPONSE_PAR_CLE.pas_de_reponse)).toBe("demain");
    expect(quandCourt(REPONSE_PAR_CLE.rappellera)).toBe("dans 3 jours");
    expect(quandCourt(REPONSE_PAR_CLE.ne_sait_pas)).toBe("dans 7 jours");
    expect(quandCourt(REPONSE_PAR_CLE.pas_maintenant)).toBe("dans 1 mois");
  });

  it("ne raccourcit PAS les reponses qui ne posent aucune date", () => {
    // Elles ne sont pas dans la barre en lot, mais si un jour elles y passent,
    // « dans null jours » ne doit pas apparaitre.
    expect(quandCourt(REPONSE_PAR_CLE.plus_interesse)).toBe(REPONSE_PAR_CLE.plus_interesse.quand);
    expect(quandCourt(REPONSE_PAR_CLE.rdv)).toBe(REPONSE_PAR_CLE.rdv.quand);
  });

  it("reste court pour les quatre reponses de la barre", () => {
    // La barre tient sur une ligne parce que ces textes sont courts : un
    // libelle qui rallonge la ferait passer a deux rangees sans prevenir.
    for (const r of REPONSES.filter((x) => x.jours !== null)) {
      expect(quandCourt(r).length).toBeLessThanOrEqual(13);
    }
  });

  it("ne dit jamais « dans 1 jours »", () => {
    for (const r of REPONSES) expect(quandCourt(r)).not.toMatch(/1 jours/);
  });
});
