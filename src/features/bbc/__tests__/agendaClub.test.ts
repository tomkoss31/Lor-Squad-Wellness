import { describe, expect, it } from "vitest";
import {
  aQualifier,
  cleJour,
  couleurCoach,
  couloirs,
  creneauxLibres,
  auPlusTot,
  fmtHeure,
  decalerJour,
  grilleMois,
  type Plage,
  libelleSemaine,
  plageOuverture,
  heureDe,
  libelleJour,
  libelleMois,
  lundiDe,
  marqueDe,
  peutChanger,
  effetAnnulation,
  motDeplacement,
  nomComplet,
  parJour,
  prenomSeul,
  semaineDe,
  versRdvClub,
  contactDe,
  telLisible,
  estIndispo,
  sansIndispos,
  horairesDuJour,
  plageIndispo,
  rdvSurLaPlage,
  QUAND_INDISPO,
  PROPOSITION,
  type RdvClub,
} from "../agenda/agendaClub";
import { fallbackOwnerColor } from "../../agenda/calendarEvents";

// Jeudi 17 septembre 2026, 10 h 45 — heure locale.
const MAINTENANT = new Date(2026, 8, 17, 10, 45).getTime();

function ligne(o: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    source: "prospect",
    id: "r1",
    coach_user_id: "romane",
    debut: new Date(2026, 8, 17, 10, 0).toISOString(),
    fin: new Date(2026, 8, 17, 11, 0).toISOString(),
    prenom: "Pauline",
    nom: "Roux",
    telephone: "0612345602",
    statut: "scheduled",
    nature: "bilan",
    ...o,
  };
}

describe("versRdvClub", () => {
  it("lit une ligne de la fonction", () => {
    const r = versRdvClub(ligne())!;
    expect(r.source).toBe("prospect");
    expect(r.coachId).toBe("romane");
    expect(r.nom).toBe("Roux");
  });

  it("rejette une source inconnue ou une date illisible", () => {
    expect(versRdvClub(ligne({ source: "autre" }))).toBeNull();
    expect(versRdvClub(ligne({ debut: "pas une date" }))).toBeNull();
  });

  it("un rendez-vous sans coach appartient au club", () => {
    expect(versRdvClub(ligne({ coach_user_id: null }))!.coachId).toBeNull();
  });

  it("une fin illisible retombe sur le début", () => {
    const r = versRdvClub(ligne({ fin: null }))!;
    expect(r.fin).toBe(r.debut);
  });
});

describe("le temps", () => {
  it("une clé de jour en heure locale", () => {
    expect(cleJour(new Date(2026, 8, 7))).toBe("2026-09-07");
    expect(heureDe(new Date(2026, 8, 17, 9, 5).toISOString())).toBe("09:05");
  });

  it("parle français", () => {
    expect(libelleMois(new Date(2026, 8, 1))).toBe("Septembre 2026");
    expect(libelleJour(new Date(2026, 8, 17))).toBe("jeudi 17 septembre");
  });

  it("la semaine commence le lundi", () => {
    expect(cleJour(lundiDe(new Date(2026, 8, 17)))).toBe("2026-09-14");
    expect(cleJour(lundiDe(new Date(2026, 8, 20)))).toBe("2026-09-14");
    expect(semaineDe(lundiDe(new Date(2026, 8, 17)))).toEqual([
      "2026-09-14", "2026-09-15", "2026-09-16", "2026-09-17", "2026-09-18", "2026-09-19", "2026-09-20",
    ]);
  });

  it("septembre 2026 tient en 5 semaines, du lundi 31 août au dimanche 4 octobre", () => {
    const g = grilleMois(2026, 8);
    expect(g).toHaveLength(5);
    expect(g[0][0]).toBe("2026-08-31");
    expect(g[4][6]).toBe("2026-10-04");
  });

  it("août 2026 commence un samedi : six semaines", () => {
    const g = grilleMois(2026, 7);
    expect(g).toHaveLength(6);
    expect(g[0][0]).toBe("2026-07-27");
    expect(g[5][0]).toBe("2026-08-31");
  });
});

describe("parJour", () => {
  it("range par jour et trie chaque jour par heure", () => {
    const tard = versRdvClub(ligne({ id: "tard", debut: new Date(2026, 8, 17, 15, 0).toISOString() }))!;
    const tot = versRdvClub(ligne({ id: "tot", debut: new Date(2026, 8, 17, 8, 0).toISOString() }))!;
    const demain = versRdvClub(ligne({ id: "demain", debut: new Date(2026, 8, 18, 9, 0).toISOString() }))!;
    const m = parJour([tard, demain, tot]);
    expect(m.get("2026-09-17")!.map((r) => r.id)).toEqual(["tot", "tard"]);
    expect(m.get("2026-09-18")!.map((r) => r.id)).toEqual(["demain"]);
  });
});

describe("ce qu'on écrit", () => {
  const r = versRdvClub(ligne())!;
  it("le prénom seul sur la pastille, le nom complet sur la fiche", () => {
    expect(prenomSeul(r)).toBe("Pauline");
    expect(nomComplet(r)).toBe("Pauline Roux");
  });
  it("ne rend jamais une chaîne vide", () => {
    expect(prenomSeul(versRdvClub(ligne({ prenom: "", nom: null }))!)).toBe("—");
  });
});

describe("la marque — trois tables, trois vocabulaires", () => {
  const p = (statut: string): RdvClub => versRdvClub(ligne({ statut }))!;
  const b = (statut: string): RdvClub => versRdvClub(ligne({ source: "reservation", statut }))!;

  it("un prospect", () => {
    expect(marqueDe(p("scheduled"))).toBeNull();
    expect(marqueDe(p("converted"))?.code).toBe("demarre");
    expect(marqueDe(p("done"))?.code).toBe("fait");
    expect(marqueDe(p("no_show"))?.code).toBe("pas_venue");
    expect(marqueDe(p("cold"))?.code).toBe("relance");
    expect(marqueDe(p("lost"))?.code).toBe("perdue");
  });

  it("une réservation du site", () => {
    expect(marqueDe(b("confirmed"))).toBeNull();
    expect(marqueDe(b("honored"))?.libelle).toBe("venue");
    expect(marqueDe(b("no_show"))?.code).toBe("pas_venue");
  });

  it("un suivi n'a jamais de marque", () => {
    expect(marqueDe(versRdvClub(ligne({ source: "suivi", statut: "scheduled" }))!)).toBeNull();
  });
});

describe("à qualifier", () => {
  it("un rendez-vous passé sans marque saute aux yeux", () => {
    const hier = versRdvClub(ligne({ debut: new Date(2026, 8, 16, 10, 0).toISOString(), fin: new Date(2026, 8, 16, 11, 0).toISOString() }))!;
    expect(aQualifier(hier, MAINTENANT)).toBe(true);
    expect(aQualifier({ ...hier, statut: "done" }, MAINTENANT)).toBe(false);
  });

  it("pas un rendez-vous à venir, ni un suivi", () => {
    const demain = versRdvClub(ligne({ debut: new Date(2026, 8, 18, 10, 0).toISOString(), fin: new Date(2026, 8, 18, 11, 0).toISOString() }))!;
    expect(aQualifier(demain, MAINTENANT)).toBe(false);
    const suivi = versRdvClub(ligne({ source: "suivi", debut: new Date(2026, 8, 1, 10, 0).toISOString(), fin: new Date(2026, 8, 1, 10, 30).toISOString() }))!;
    expect(aQualifier(suivi, MAINTENANT)).toBe(false);
  });
});

describe("les horaires du club", () => {
  it("lit les formes qu'on trouve dans les réglages", () => {
    expect(plageOuverture("7h-11h")).toEqual({ debut: 7, fin: 11 });
    expect(plageOuverture("7h30-11h")).toEqual({ debut: 7.5, fin: 11 });
    expect(plageOuverture("08:00-15:00")).toEqual({ debut: 8, fin: 15 });
    expect(plageOuverture("8h → 15h")).toEqual({ debut: 8, fin: 15 });
  });

  it("ne rend rien plutôt que faux", () => {
    expect(plageOuverture("")).toBeNull();
    expect(plageOuverture(null)).toBeNull();
    expect(plageOuverture("fermé")).toBeNull();
    expect(plageOuverture("11h-7h")).toBeNull();
  });
});

describe("les couloirs", () => {
  const r = (id: string, h1: number, h2: number) => ({
    id,
    debut: new Date(2026, 8, 17, h1, 0).toISOString(),
    fin: new Date(2026, 8, 17, h2, 0).toISOString(),
  });

  it("deux rendez-vous qui se chevauchent prennent deux couloirs", () => {
    const { items, nb } = couloirs([r("a", 10, 11), r("b", 10, 11)]);
    expect(nb).toBe(2);
    expect(items.map((i) => i.couloir)).toEqual([0, 1]);
  });

  it("un rendez-vous qui commence quand l'autre finit reprend son couloir", () => {
    const { items, nb } = couloirs([r("a", 10, 11), r("b", 11, 12)]);
    expect(nb).toBe(1);
    expect(items.map((i) => i.couloir)).toEqual([0, 0]);
  });

  it("trie par heure de début, quel que soit l'ordre d'arrivée", () => {
    const { items } = couloirs([r("tard", 15, 16), r("tot", 8, 9)]);
    expect(items.map((i) => i.rdv.id)).toEqual(["tot", "tard"]);
  });

  it("une liste vide donne quand même un couloir", () => {
    expect(couloirs([]).nb).toBe(1);
  });
});

describe("naviguer", () => {
  it("décale d'un jour, d'une semaine, et passe les mois", () => {
    expect(decalerJour("2026-09-30", 1)).toBe("2026-10-01");
    expect(decalerJour("2026-09-14", 7)).toBe("2026-09-21");
    expect(decalerJour("2026-09-01", -1)).toBe("2026-08-31");
  });

  it("la semaine se lit d'un coup", () => {
    expect(libelleSemaine(new Date(2026, 8, 14))).toBe("14 – 20 sept.");
    expect(libelleSemaine(new Date(2026, 8, 28))).toBe("28 sept. – 4 oct.");
  });
});

describe("les créneaux libres", () => {
  const JOUR = new Date(2026, 8, 17);
  const plage = (h1: number, h2: number) => ({
    debut: new Date(2026, 8, 17, Math.floor(h1), (h1 % 1) * 60).getTime(),
    fin: new Date(2026, 8, 17, Math.floor(h2), (h2 % 1) * 60).getTime(),
  });
  const MINUIT = new Date(2026, 8, 16).getTime();

  it("un rendez-vous 10 h–11 h laisse 11 h libre, pas 9 h 30 ni 10 h 30", () => {
    const l = creneauxLibres([plage(10, 11)], JOUR, 60, MINUIT);
    expect(l).toContain(11);
    expect(l).toContain(9);
    expect(l).not.toContain(9.5);
    expect(l).not.toContain(10);
    expect(l).not.toContain(10.5);
  });

  it("un suivi de 30 min tient à 9 h 30 avant un rendez-vous à 10 h", () => {
    expect(creneauxLibres([plage(10, 11)], JOUR, 30, MINUIT)).toContain(9.5);
  });

  it("le dernier créneau ne déborde jamais 18 h", () => {
    const l = creneauxLibres([], JOUR, 60, MINUIT);
    expect(l[l.length - 1]).toBe(17);
    expect(creneauxLibres([], JOUR, 30, MINUIT).pop()).toBe(17.5);
  });

  it("rien dans le passé", () => {
    const onzeHeures = new Date(2026, 8, 17, 10, 45).getTime();
    const l = creneauxLibres([], JOUR, 60, onzeHeures);
    expect(l[0]).toBe(11);
  });

  it("une journée entièrement bloquée ne propose rien", () => {
    expect(creneauxLibres([plage(8, 18)], JOUR, 60, MINUIT)).toEqual([]);
  });

  it("« au plus tôt » : le premier trou de toute l'équipe, jour après jour", () => {
    const occ = new Map<string, Plage[]>([
      ["mel", [plage(8, 12)]],
      ["romane", [plage(8, 10)]],
    ]);
    expect(auPlusTot(occ, ["2026-09-17", "2026-09-18"], 60, MINUIT)).toEqual({ jour: "2026-09-17", coachId: "romane", heure: 10 });
  });

  it("« au plus tôt » passe au lendemain quand le jour est plein", () => {
    const occ = new Map<string, Plage[]>([["mel", [plage(8, 18)]]]);
    const r = auPlusTot(occ, ["2026-09-17", "2026-09-18"], 60, MINUIT);
    expect(r?.jour).toBe("2026-09-18");
    expect(r?.heure).toBe(8);
  });

  it("fmtHeure", () => {
    expect(fmtHeure(9.5)).toBe("09:30");
    expect(fmtHeure(14)).toBe("14:00");
  });
});

describe("la couleur", () => {
  const coachs = [{ id: "mel", couleur: "#EC4899" }, { id: "tom", couleur: null }];

  it("celle que la coach a choisie", () => {
    expect(couleurCoach("mel", coachs)).toBe("#EC4899");
  });

  it("sinon LE MÊME repli que l'agenda classique", () => {
    expect(couleurCoach("tom", coachs)).toBe(fallbackOwnerColor("tom"));
    expect(couleurCoach("inconnue", coachs)).toBe(fallbackOwnerColor("inconnue"));
  });

  it("un rendez-vous sans coach reste neutre", () => {
    expect(couleurCoach(null, coachs)).toBe("var(--ls-bbc-sage)");
  });
});

describe("comment joindre la personne", () => {
  it("un numéro : on appelle, en chiffres seuls", () => {
    expect(contactDe(versRdvClub(ligne({ telephone: "06 12 34 56 02" }))!)).toEqual({ tel: "0612345602", mail: null });
  });

  it("une adresse mail (réservation du site) : on ÉCRIT, on ne fabrique pas un faux numéro", () => {
    expect(contactDe(versRdvClub(ligne({ telephone: "prenom.nom0273@exemple.fr" }))!)).toEqual({ tel: null, mail: "prenom.nom0273@exemple.fr" });
  });

  it("rien, ou trois chiffres perdus : ni l'un ni l'autre", () => {
    expect(contactDe(versRdvClub(ligne({ telephone: null }))!)).toEqual({ tel: null, mail: null });
    expect(contactDe(versRdvClub(ligne({ telephone: "poste 12" }))!)).toEqual({ tel: null, mail: null });
  });

  it("le numéro ET le mail, comme dans le CRM (22/09 : le rendez-vous de Sandrine)", () => {
    expect(contactDe(versRdvClub(ligne({ telephone: "06 12 34 56 53", email: "prenom.nom0273@exemple.fr" }))!))
      .toEqual({ tel: "0612345653", mail: "prenom.nom0273@exemple.fr" });
    // Un « mail » qui n'en est pas un ne devient pas un lien mailto.
    expect(contactDe(versRdvClub(ligne({ telephone: "0612345653", email: "pas de mail" }))!)).toEqual({ tel: "0612345653", mail: null });
  });

  it("un numéro français se lit par paires ; un numéro étranger reste tel quel", () => {
    expect(telLisible("0612345653")).toBe("06 12 34 56 53");
    expect(telLisible("+32470123456")).toBe("+32470123456");
  });
});

// ── Étape 8 : « pas dispo », et les horaires du club jour par jour ───────────
describe("« pas dispo »", () => {
  const indispo = versRdvClub(
    ligne({ source: "indispo", id: "i1", prenom: "Pas dispo", nom: "médecin", telephone: null, statut: "indispo", nature: "indispo" }),
  )!;

  it("est lu comme une quatrième source, pas jeté", () => {
    expect(indispo).not.toBeNull();
    expect(estIndispo(indispo)).toBe(true);
    expect(estIndispo(versRdvClub(ligne())!)).toBe(false);
  });

  it("s'écrit « Pas dispo », avec sa note s'il y en a une", () => {
    expect(prenomSeul(indispo)).toBe("Pas dispo");
    expect(nomComplet(indispo)).toBe("Pas dispo · médecin");
    expect(nomComplet({ ...indispo, nom: null })).toBe("Pas dispo");
  });

  it("n'est jamais « à qualifier », même passé, et ne porte aucune marque", () => {
    const hier = { ...indispo, debut: new Date(2026, 8, 16, 8, 0).toISOString(), fin: new Date(2026, 8, 16, 12, 0).toISOString() };
    expect(aQualifier(hier, MAINTENANT)).toBe(false);
    expect(marqueDe(hier)).toBeNull();
  });

  it("ne compte pas comme un rendez-vous", () => {
    expect(sansIndispos([indispo, versRdvClub(ligne())!]).map((r) => r.id)).toEqual(["r1"]);
  });

  it("bloque les créneaux comme n'importe quelle plage occupée", () => {
    const { debut, fin } = plageIndispo("2026-09-18", "matin");
    const libres = creneauxLibres([{ debut: debut.getTime(), fin: fin.getTime() }], new Date(2026, 8, 18), 60, MAINTENANT);
    expect(libres[0]).toBe(12);
  });

  it("matin, après-midi, journée : en heure locale, alignés sur les heures proposées", () => {
    const m = plageIndispo("2026-09-18", "matin");
    expect([m.debut.getHours(), m.fin.getHours(), m.debut.getDate()]).toEqual([8, 12, 18]);
    const a = plageIndispo("2026-09-18", "aprem");
    expect([a.debut.getHours(), a.fin.getHours()]).toEqual([12, 18]);
    expect(QUAND_INDISPO.journee.debut).toBe(PROPOSITION.debut);
    expect(QUAND_INDISPO.journee.fin).toBe(PROPOSITION.fin);
    expect(QUAND_INDISPO.matin.fin).toBe(QUAND_INDISPO.aprem.debut);
  });

  it("prévient des rendez-vous déjà calés sur la plage — sans compter les tranchés", () => {
    const { debut, fin } = plageIndispo("2026-09-17", "matin");
    const rdvs = [
      versRdvClub(ligne())!, // Romane, 10 h–11 h, à venir
      versRdvClub(ligne({ id: "r2", statut: "lost" }))!, // déjà perdue : ne gêne plus
      versRdvClub(ligne({ id: "r3", coach_user_id: "mel" }))!, // une autre coach
      versRdvClub(ligne({ id: "r4", debut: new Date(2026, 8, 17, 14, 0).toISOString(), fin: new Date(2026, 8, 17, 15, 0).toISOString() }))!,
      indispo,
    ];
    expect(rdvSurLaPlage(rdvs, "romane", debut, fin)).toBe(1);
  });
});

describe("les horaires du club, jour par jour (la règle du tunnel du site)", () => {
  const reglages = {
    hours: {
      "1": [["08:00", "15:00"]],
      "2": [["08:00", "15:00"], ["16:00", "18:00", "2"]],
      "6": [["08:30", "11:00"]],
    },
    hours_by_date: { "2026-09-21": [["12:00", "15:00"]] },
    holidays: ["2026-09-25", "2026-09-22"],
  };

  it("l'horaire habituel du jour de la semaine (clés ISO, 1 = lundi)", () => {
    const lundi = horairesDuJour(reglages, "2026-09-28");
    expect(lundi).toEqual({ etat: "ouvert", plages: [{ debut: 8, fin: 15 }], exception: false, texte: ["08:00", "15:00"] });
    expect(horairesDuJour(reglages, "2026-09-19").plages).toEqual([{ debut: 8.5, fin: 11 }]);
  });

  it("plusieurs plages, et le 3ᵉ élément (la capacité) est ignoré", () => {
    expect(horairesDuJour(reglages, "2026-09-29").plages).toEqual([{ debut: 8, fin: 15 }, { debut: 16, fin: 18 }]);
  });

  it("l'exception du jour prime sur l'habituel", () => {
    const j = horairesDuJour(reglages, "2026-09-21");
    expect(j.exception).toBe(true);
    expect(j.plages).toEqual([{ debut: 12, fin: 15 }]);
  });

  it("une fermeture prime sur tout, même sur un mardi à deux plages", () => {
    expect(horairesDuJour(reglages, "2026-09-22")).toEqual({ etat: "ferme", plages: [], exception: false, texte: null });
  });

  it("un jour sans horaire (dimanche) est « repos », pas « fermé »", () => {
    expect(horairesDuJour(reglages, "2026-09-20").etat).toBe("repos");
    expect(horairesDuJour(null, "2026-09-21").etat).toBe("repos");
  });

  it("une plage illisible ou à l'envers est ignorée plutôt qu'affichée fausse", () => {
    expect(horairesDuJour({ hours: { "1": [["15:00", "08:00"], ["8h", "15h"]] } }, "2026-09-28").etat).toBe("repos");
  });
});

// ─── Déplacer / annuler (22/09) ─────────────────────────────────────────────
// Sandrine M. avait réservé sur le site pour le 2/10 ; au téléphone, elle passait
// au 7/10. L'agenda ne savait pas déplacer une réservation : on en a CRÉÉ une
// deuxième, et la première restait, rappel compris.
describe("déplacer / annuler un rendez-vous", () => {
  const r = (o: Record<string, unknown>): RdvClub => versRdvClub(ligne(o))!;

  it("les trois sortes se déplacent et s'annulent tant qu'elles ne sont pas tranchées", () => {
    expect(peutChanger(r({ source: "prospect", statut: "scheduled" }))).toBe(true);
    expect(peutChanger(r({ source: "reservation", statut: "confirmed" }))).toBe(true);
    expect(peutChanger(r({ source: "reservation", statut: "requested" }))).toBe(true);
    expect(peutChanger(r({ source: "suivi", statut: "scheduled" }))).toBe(true);
  });

  it("un rendez-vous déjà tranché ne bouge plus", () => {
    expect(peutChanger(r({ source: "prospect", statut: "converted" }))).toBe(false);
    expect(peutChanger(r({ source: "prospect", statut: "cold" }))).toBe(false);
    expect(peutChanger(r({ source: "reservation", statut: "honored" }))).toBe(false);
    expect(peutChanger(r({ source: "reservation", statut: "no_show" }))).toBe(false);
  });

  it("un « pas dispo » garde son propre geste", () => {
    expect(peutChanger(r({ source: "indispo", statut: "" }))).toBe(false);
  });

  it("on dit ce que l'annulation déclenche, selon la sorte", () => {
    expect(effetAnnulation(r({ source: "reservation", statut: "confirmed" }))).toMatch(/site du club/);
    expect(effetAnnulation(r({ source: "suivi", statut: "scheduled" }))).toMatch(/espace membre/);
    expect(effetAnnulation(r({ source: "prospect", statut: "scheduled" }))).toBe("Il sort de l'agenda. Pauline reste dans le CRM.");
  });

  it("après un déplacement, on dit toujours si la personne sait", () => {
    expect(motDeplacement("parti", "Camille")).toBe("Rendez-vous déplacé · Camille a reçu sa nouvelle date par mail");
    expect(motDeplacement("pas_de_mail", "Camille")).toMatch(/préviens Camille toi-même/);
    expect(motDeplacement("pas_parti", "Camille")).toMatch(/pas parti/);
    expect(motDeplacement("non_demande", "Camille")).toBe("Rendez-vous déplacé · personne n'a été prévenu");
    expect(motDeplacement(undefined, "")).toBe("Rendez-vous déplacé · personne n'a été prévenu");
  });
});
