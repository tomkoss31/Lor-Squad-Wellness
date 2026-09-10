// =============================================================================
// LE FIL DE LA NOTE — et le cas réel qui a rendu ce fichier nécessaire.
//
// Le 10/09/2026, Justine a répondu à un SMS de relance en revenant sur le site
// et en laissant « Dispos indiquées : Après 16h du lundi au mercredi ».
// Personne ne l'a vu. Le lendemain, un rappel « deuxième SMS sans réponse →
// APPEL » était posé sur elle.
//
// Deux causes, et les deux sont testées ici et dans fusionFiches.test.ts :
//   · sa note était JETÉE par la fusion des doublons ;
//   · le volet n'affichait aucune note.
//
// La règle que ces tests verrouillent : on épingle par NATURE, jamais par
// POSITION. Chez Justine l'information vitale n'était pas la dernière entrée.
// =============================================================================

import { describe, it, expect } from "vitest";
import { filNote } from "../filNote";

/** La vraie note de la fiche maître de Justine, mot pour mot. */
const TRACE_META =
  "Lead formulaire Meta recu le 03/09. ATTENTION : homonyme partiel - ne pas confondre avec Agnes FLORENTIN";
/** Ce qu'elle a réellement laissé sur le site. */
const SA_PAROLE = "🕑 Dispos indiquées : Après 16h du lundi au mercredi";

describe("filNote — le cas Justine", () => {
  it("épingle SA PAROLE, pas la trace machine qui la suit", () => {
    // ⚠️ L'ordre compte : la parole arrive EN PREMIER, la trace APRÈS.
    // Une règle « montre la dernière entrée » afficherait la trace Meta.
    const fil = filNote(`${SA_PAROLE} | ${TRACE_META}`);
    expect(fil?.epingle.texte).toBe(SA_PAROLE);
    expect(fil?.epingle.rang).toBe("parole");
  });

  it("avoue toujours combien d'entrées elle cache", () => {
    const fil = filNote(`${SA_PAROLE} | ${TRACE_META} | Confiee a Romane le 05/09`);
    expect(fil?.entrees).toHaveLength(3);
  });

  it("ne supprime aucune entrée — les traces sont rangées, pas jetées", () => {
    const fil = filNote(`${SA_PAROLE} | ${TRACE_META}`);
    expect(fil?.entrees.map((e) => e.rang)).toEqual(["parole", "trace"]);
  });
});

describe("filNote — le piège horaire", () => {
  it("NE prend PAS « son RDV du 03/09 14h » pour une disponibilité", () => {
    // Vécu : Agnès FLORENTIN a ANNULÉ son RDV de 14h. Le lire comme une dispo
    // ferait rappeler à 14 h quelqu'un qui vient d'annuler.
    const fil = filNote("A ANNULE PAR MAIL son RDV du 03/09 14h. Elle a PREVENU.");
    expect(fil?.epingle.rang).not.toBe("parole");
  });

  it("reconnaît un horaire SEULEMENT avec sa préposition", () => {
    expect(filNote("dispo apres 16h")?.epingle.rang).toBe("parole");
    expect(filNote("joignable entre 12h et 14h")?.epingle.rang).toBe("parole");
    expect(filNote("rendez-vous cale a 14h")?.epingle.rang).toBe("main");
  });
});

describe("filNote — les rangs", () => {
  it("une trace ne peut jamais être promue en parole", () => {
    // Celle-ci contient « dispo » ET un motif de trace : la trace gagne.
    const fil = filNote("SMS de premier contact envoye : on lui demande ses dispos");
    expect(fil?.epingle.rang).toBe("trace");
  });

  it("le retour d'un lead sur le site est une parole", () => {
    expect(filNote("↩︎ Revenu·e le 08/09 (site-club)")?.epingle.rang).toBe("parole");
  });

  it("à défaut de parole, la dernière décision du coach", () => {
    const fil = filNote(`${TRACE_META} | Appelee le 07/09 : pas de reponse, a rappeler`);
    expect(fil?.epingle.rang).toBe("main");
    expect(fil?.epingle.texte).toContain("Appelee");
  });

  it("si personne n'a jamais rien dit, on montre la trace plutôt qu'une carte vide", () => {
    const fil = filNote(TRACE_META);
    expect(fil?.epingle.rang).toBe("trace");
  });
});

describe("filNote — le découpage", () => {
  it("reconnaît les trois séparateurs réellement écrits en base", () => {
    expect(filNote("a | b")?.entrees).toHaveLength(2);
    expect(filNote("a\nb")?.entrees).toHaveLength(2);
    expect(filNote(`a · ${SA_PAROLE}`)?.entrees).toHaveLength(2);
  });

  it("ne coupe PAS sur un « · » de ponctuation ordinaire", () => {
    // Sans le lookahead sur 🕑, cette phrase serait tranchée en deux.
    expect(filNote("41 ans · Toulouse · via Jeremy")?.entrees).toHaveLength(1);
  });

  it("absorbe les CRLF de Windows sans créer de lignes fantômes", () => {
    expect(filNote("a\r\nb\r\n")?.entrees).toHaveLength(2);
  });
});

describe("filNote — l'aperçu", () => {
  it("coupe à 110 caractères sans trancher un mot", () => {
    const fil = filNote("m".padEnd(60, "o") + " " + "x".padEnd(90, "y"));
    expect(fil?.tronque).toBe(true);
    expect(fil?.apercu.endsWith("…")).toBe(true);
    expect(fil?.apercu.length).toBeLessThanOrEqual(111);
  });

  it("laisse une note courte intacte", () => {
    const fil = filNote("Rappeler lundi");
    expect(fil?.tronque).toBe(false);
    expect(fil?.apercu).toBe("Rappeler lundi");
  });

  it("met l'aperçu sur une seule ligne", () => {
    expect(filNote("Rappeler\n\nlundi")?.entrees).toHaveLength(2);
    expect(filNote("Rappeler   lundi")?.apercu).toBe("Rappeler lundi");
  });
});

describe("filNote — l'absence", () => {
  it("rend null plutôt qu'un état vide inventé", () => {
    // 6 leads sur 91 n'ont pas de note, et une table n'a pas la colonne.
    expect(filNote(null)).toBeNull();
    expect(filNote(undefined)).toBeNull();
    expect(filNote("")).toBeNull();
    expect(filNote("   \n  ")).toBeNull();
  });
});
