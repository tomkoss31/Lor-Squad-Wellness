// =============================================================================
// L'ordre de la zone 1 — ce qui passe devant quoi.
//
// Les profils rejoués ici sont ceux lus en base le 12/08/2026. Si quelqu'un
// « améliore » la priorité un jour, c'est ici que ça doit casser, pas sur le
// Co-pilote de Thomas un jeudi matin à 8 h 40.
// =============================================================================

import { describe, expect, it } from "vitest";
import {
  ceQuiCompte,
  extrait,
  FENETRE_RDV_MIN,
  GRACE_RDV_MIN,
  type Matiere,
} from "../ceQuiCompte";
import { RANG, type Attente } from "../../../hooks/useFileDuJour";

const T0 = new Date("2026-08-14T08:40:00+02:00");
const dans = (min: number) => new Date(T0.getTime() + min * 60_000);
const ilYa = (min: number) => new Date(T0.getTime() - min * 60_000).toISOString();

function attente(p: Partial<Attente> & { cle: string; qui: string; jours: number }): Attente {
  return {
    motifCourt: "Suivi en retard",
    pourquoi: "Un point que tu avais calé",
    motif: "suivi-en-retard",
    rang: RANG.engagement,
    telephone: null,
    chemin: "/clients/x",
    ...p,
  };
}

function matiere(p: Partial<Matiere> = {}): Matiere {
  return { maintenant: T0, rdvs: [], messages: [], paiements: [], attentes: [], ...p };
}

const MATHEO = attente({ cle: "suivi:1", qui: "Matheo", jours: 44 });

const RDV_9H = {
  id: "r1", clientId: "c1", nom: "Sylvie", type: "Bilan de suivi", heure: dans(20),
};
const MESSAGE = {
  id: "m1", clientId: "c2", nom: "Manuela",
  texte: "Coucou ! J'ai fini ma boîte de Formula 1, je reprends quoi ?",
  recuLe: ilYa(6), enAttente: true,
};
const PAIEMENT = { id: "o1", nom: "Manon", montantEur: 135.15, payeLe: ilYa(3), telephone: "0612345678" };

describe("l'ordre de priorité", () => {
  it("un RDV dans 20 min passe devant Matheo qui attend depuis 44 jours", () => {
    const r = ceQuiCompte(matiere({ rdvs: [RDV_9H], attentes: [MATHEO] }));
    expect(r.quoi).toBe("rdv");
    if (r.quoi === "rdv") {
      expect(r.dansMinutes).toBe(20);
      expect(r.nom).toBe("Sylvie");
    }
  });

  it("le RDV passe même devant un message et un paiement", () => {
    const r = ceQuiCompte(matiere({
      rdvs: [RDV_9H], messages: [MESSAGE], paiements: [PAIEMENT], attentes: [MATHEO],
    }));
    expect(r.quoi).toBe("rdv");
  });

  it("sans RDV, un client qui écrit passe devant le paiement et la file", () => {
    const r = ceQuiCompte(matiere({
      messages: [MESSAGE], paiements: [PAIEMENT], attentes: [MATHEO],
    }));
    expect(r.quoi).toBe("message");
    if (r.quoi === "message") {
      expect(r.nom).toBe("Manuela");
      expect(r.ilYaMinutes).toBe(6);
    }
  });

  it("sans RDV ni message, le paiement passe devant la file", () => {
    const r = ceQuiCompte(matiere({ paiements: [PAIEMENT], attentes: [MATHEO] }));
    expect(r.quoi).toBe("paiement");
    if (r.quoi === "paiement") expect(r.montantEur).toBe(135.15);
  });

  it("sinon, la personne en tête de file, et on annonce combien il en reste", () => {
    const r = ceQuiCompte(matiere({
      attentes: [MATHEO, attente({ cle: "l:2", qui: "Florian", jours: 4 })],
    }));
    expect(r.quoi).toBe("personne");
    if (r.quoi === "personne") {
      expect(r.attente.qui).toBe("Matheo");
      expect(r.reste).toBe(1);
    }
  });
});

describe("le démarrage — le cas Charlène (0 client, aucun bilan)", () => {
  const demarrage = { etape: 1, total: 7, titre: "Ton 1er bilan", fini: false };

  it("prend l'écran quand plus personne n'attend", () => {
    const r = ceQuiCompte(matiere({ demarrage }));
    expect(r.quoi).toBe("demarrage");
    if (r.quoi === "demarrage") expect(r.etape).toBe(1);
  });

  it("passe DERRIÈRE une vraie personne — un humain vaut mieux qu'un tutoriel", () => {
    const r = ceQuiCompte(matiere({ attentes: [MATHEO], demarrage }));
    expect(r.quoi).toBe("personne");
  });

  it("disparaît une fois terminé — Thomas ne doit plus jamais le voir", () => {
    const r = ceQuiCompte(matiere({ demarrage: { ...demarrage, fini: true } }));
    expect(r.quoi).toBe("rien");
  });
});

describe("la fenêtre du RDV", () => {
  it("ignore un RDV trop lointain", () => {
    const loin = { ...RDV_9H, heure: dans(FENETRE_RDV_MIN + 1) };
    expect(ceQuiCompte(matiere({ rdvs: [loin], attentes: [MATHEO] })).quoi).toBe("personne");
  });

  it("garde en tête un RDV commencé il y a 10 min — le client est en face de toi", () => {
    const encours = { ...RDV_9H, heure: dans(-10) };
    const r = ceQuiCompte(matiere({ rdvs: [encours] }));
    expect(r.quoi).toBe("rdv");
    if (r.quoi === "rdv") expect(r.dansMinutes).toBe(-10);
  });

  it("lâche un RDV passé depuis plus que la grâce", () => {
    const fini = { ...RDV_9H, heure: dans(-GRACE_RDV_MIN - 1) };
    expect(ceQuiCompte(matiere({ rdvs: [fini] })).quoi).toBe("rien");
  });

  it("prend le plus proche quand il y en a deux", () => {
    const r = ceQuiCompte(matiere({
      rdvs: [{ ...RDV_9H, id: "tard", nom: "Tard", heure: dans(60) }, { ...RDV_9H, id: "tot", nom: "Tôt", heure: dans(10) }],
    }));
    if (r.quoi === "rdv") expect(r.nom).toBe("Tôt");
  });
});

describe("le message ne doit pas rester collé en haut", () => {
  it("un message lu / résolu / archivé ne compte plus", () => {
    const r = ceQuiCompte(matiere({
      messages: [{ ...MESSAGE, enAttente: false }], attentes: [MATHEO],
    }));
    expect(r.quoi).toBe("personne");
  });

  it("le plus récent gagne — c'est celui qu'on peut encore rattraper", () => {
    const r = ceQuiCompte(matiere({
      messages: [
        { ...MESSAGE, id: "vieux", nom: "Vieux", recuLe: ilYa(600) },
        { ...MESSAGE, id: "frais", nom: "Frais", recuLe: ilYa(2) },
      ],
    }));
    if (r.quoi === "message") expect(r.nom).toBe("Frais");
  });
});

describe("le paiement", () => {
  it("ne revient pas une fois salué", () => {
    const r = ceQuiCompte(matiere({
      paiements: [PAIEMENT], paiementsSalues: ["o1"], attentes: [MATHEO],
    }));
    expect(r.quoi).toBe("personne");
  });

  it("se périme — un merci de la veille ne vaut plus rien", () => {
    const vieux = { ...PAIEMENT, payeLe: ilYa(13 * 60) };
    expect(ceQuiCompte(matiere({ paiements: [vieux] })).quoi).toBe("rien");
  });

  it("ignore un paiement daté dans le futur (horloge de travers)", () => {
    const futur = { ...PAIEMENT, payeLe: new Date(T0.getTime() + 60_000).toISOString() };
    expect(ceQuiCompte(matiere({ paiements: [futur] })).quoi).toBe("rien");
  });
});

describe("l'écran vide", () => {
  it("dit qu'il n'y a rien, et ce qui reste chez l'équipe", () => {
    const r = ceQuiCompte(matiere({ resteEquipe: 7 }));
    expect(r.quoi).toBe("rien");
    if (r.quoi === "rien") expect(r.resteEquipe).toBe(7);
  });
});

describe("extrait", () => {
  it("laisse un texte court intact", () => {
    expect(extrait("Bonjour !")).toBe("Bonjour !");
  });

  it("écrase les retours à la ligne", () => {
    expect(extrait("Bonjour\n\n  Thomas")).toBe("Bonjour Thomas");
  });

  it("coupe sur un mot entier, sans blanc avant les points", () => {
    const long = "abcdefgh ".repeat(30);
    const e = extrait(long, 40);
    expect(e.endsWith("…")).toBe(true);
    expect(e).not.toMatch(/\s…$/);
    expect(e.length).toBeLessThanOrEqual(41);
  });

  it("supporte un texte absent", () => {
    expect(extrait(undefined as unknown as string)).toBe("");
  });
});
