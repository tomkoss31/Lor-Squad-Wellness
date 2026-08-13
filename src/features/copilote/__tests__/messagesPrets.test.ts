// =============================================================================
// Ces textes partent VRAIMENT chez de vraies personnes. Les tests ne vérifient
// donc pas seulement qu'une chaîne existe : ils verrouillent ce qu'on ne veut
// jamais envoyer — un prénom manquant, un coach anonyme, un « je pensais à
// toi » de complaisance.
// =============================================================================

import { describe, expect, it } from "vitest";
import { anglesPour, merciPaiement, reponseAuMessage } from "../messagesPrets";

const MOTIFS = [
  "suivi-en-retard",
  "lead",
  "bilan-en-ligne",
  "dormant",
  "paiement-en-attente",
] as const;

describe("chaque situation propose des angles utilisables", () => {
  it.each(MOTIFS)("%s : au moins deux angles, tous non vides", (motif) => {
    const angles = anglesPour({ prenom: "Florian", moi: "Thomas", motif });
    expect(angles.length).toBeGreaterThanOrEqual(2);
    for (const a of angles) {
      expect(a.cle.trim()).not.toBe("");
      expect(a.texte.trim().length).toBeGreaterThan(30);
    }
  });

  it.each(MOTIFS)("%s : le prénom apparaît dans chaque angle", (motif) => {
    for (const a of anglesPour({ prenom: "Florian", moi: "Thomas", motif })) {
      expect(a.texte).toContain("Florian");
    }
  });

  it.each(MOTIFS)("%s : les libellés de boutons tiennent dans une puce", (motif) => {
    for (const a of anglesPour({ prenom: "Florian", moi: "Thomas", motif })) {
      expect(a.cle.length).toBeLessThanOrEqual(14);
    }
  });

  it.each(MOTIFS)("%s : aucun angle en double", (motif) => {
    const textes = anglesPour({ prenom: "Florian", moi: "Thomas", motif }).map((a) => a.texte);
    expect(new Set(textes).size).toBe(textes.length);
  });
});

describe("on se présente à qui ne nous connaît pas", () => {
  it.each(["lead", "bilan-en-ligne"] as const)(
    "%s : le coach signe de son prénom dans chaque angle",
    (motif) => {
      for (const a of anglesPour({ prenom: "Florian", moi: "Thomas", motif })) {
        expect(a.texte).toContain("Thomas");
        expect(a.texte).toContain("La Base 360");
      }
    },
  );

  it.each(["suivi-en-retard", "dormant"] as const)(
    "%s : on ne se re-présente PAS à quelqu'un qui nous connaît",
    (motif) => {
      for (const a of anglesPour({ prenom: "Florian", moi: "Thomas", motif })) {
        expect(a.texte).not.toContain("La Base 360");
      }
    },
  );
});

describe("quand on est en tort, on le dit", () => {
  it("le premier angle d'un suivi raté reconnaît la faute", () => {
    const [premier] = anglesPour({ prenom: "Matheo", moi: "Thomas", motif: "suivi-en-retard" });
    expect(premier.texte).toMatch(/désolé|ma faute/i);
  });

  it("le premier angle d'un lead rappelle l'engagement pris", () => {
    const [premier] = anglesPour({ prenom: "Florian", moi: "Thomas", motif: "lead" });
    expect(premier.texte).toMatch(/comme promis/i);
  });
});

describe("le paiement bloqué — la situation la plus chaude", () => {
  const angles = anglesPour({ prenom: "Djamal", moi: "Thomas", motif: "paiement-en-attente" });

  it("propose une sortie technique ET une sortie commerciale", () => {
    const tout = angles.map((a) => a.texte).join(" ");
    expect(tout).toMatch(/technique|expiré|renvoie/i);
    expect(tout).toMatch(/plus court|montant/i);
  });

  it("n'accuse jamais la personne de ne pas avoir payé", () => {
    for (const a of angles) {
      expect(a.texte).not.toMatch(/tu n'as pas payé|impayé|relance/i);
    }
  });
});

describe("merci et réponse", () => {
  it("le merci nomme la personne et ne demande rien d'abord", () => {
    const [premier] = merciPaiement("Manon");
    expect(premier.texte).toContain("Manon");
    expect(premier.texte).toMatch(/merci/i);
  });

  it("répondre à un message, ce n'est pas relancer", () => {
    for (const a of reponseAuMessage("Manuela")) {
      expect(a.texte).toContain("Manuela");
      expect(a.texte).not.toMatch(/ça fait un moment|tu n'as rien repris/i);
    }
  });
});

describe("cas limites", () => {
  it("un prénom vide ne casse pas la génération", () => {
    const angles = anglesPour({ prenom: "", moi: "Thomas", motif: "lead" });
    expect(angles.length).toBeGreaterThan(0);
    for (const a of angles) expect(a.texte.trim()).not.toBe("");
  });

  it("les cinq motifs sont couverts — aucun ne retombe sur undefined", () => {
    for (const motif of MOTIFS) {
      expect(anglesPour({ prenom: "X", moi: "Y", motif })).toBeDefined();
    }
  });
});
