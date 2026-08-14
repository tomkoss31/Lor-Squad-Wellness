// =============================================================================
// L'ordre de la file — la seule chose qui porte la valeur du lot.
//
// Ces cas ne sont pas inventés : ce sont les vraies lignes lues en base le
// 12/08/2026. Si quelqu'un « améliore » le tri un jour, c'est ici que ça doit
// casser, pas sur le Co-pilote de Thomas un lundi matin.
// =============================================================================

import { describe, expect, it } from "vitest";
import { ordonner, suivisEnRetardVersAttentes, RANG, type Attente } from "../useFileDuJour";

function attente(p: Partial<Attente> & { cle: string; jours: number; rang: number }): Attente {
  return {
    qui: "Quelqu'un",
    motifCourt: "Test",
    pourquoi: "Test",
    motif: "lead",
    telephone: null,
    chemin: "/crm",
    ...p,
  };
}

describe("ordonner — qui passe devant qui", () => {
  it("met celui qui a levé la main devant le dormant, même bien plus ancien", () => {
    // Le cas EXACT qui a motivé le lot : Clément dort depuis 111 jours et
    // n'attend rien ; Florian a laissé son numéro il y a 5 jours et attend.
    const file = ordonner([
      attente({ cle: "dormant:clement", qui: "Clément", jours: 111, rang: RANG.dormant }),
      attente({ cle: "lead:florian", qui: "Florian", jours: 5, rang: RANG.mainLevee }),
    ]);
    expect(file.map((a) => a.qui)).toEqual(["Florian", "Clément"]);
  });

  it("met un engagement pris devant un dormant, et derrière une main levée", () => {
    const file = ordonner([
      attente({ cle: "d", qui: "Dormant", jours: 111, rang: RANG.dormant }),
      attente({ cle: "s", qui: "Suivi", jours: 44, rang: RANG.engagement }),
      attente({ cle: "l", qui: "Lead", jours: 1, rang: RANG.mainLevee }),
    ]);
    expect(file.map((a) => a.qui)).toEqual(["Lead", "Suivi", "Dormant"]);
  });

  it("à rang égal, le plus ancien passe devant", () => {
    const file = ordonner([
      attente({ cle: "a", qui: "Récent", jours: 1, rang: RANG.mainLevee }),
      attente({ cle: "b", qui: "Vieux", jours: 50, rang: RANG.mainLevee }),
      attente({ cle: "c", qui: "Moyen", jours: 9, rang: RANG.mainLevee }),
    ]);
    expect(file.map((a) => a.qui)).toEqual(["Vieux", "Moyen", "Récent"]);
  });

  it("ne modifie pas le tableau reçu", () => {
    const source = [
      attente({ cle: "a", qui: "A", jours: 1, rang: RANG.dormant }),
      attente({ cle: "b", qui: "B", jours: 2, rang: RANG.mainLevee }),
    ];
    ordonner(source);
    expect(source.map((a) => a.qui)).toEqual(["A", "B"]);
  });

  it("supporte la file vide", () => {
    expect(ordonner([])).toEqual([]);
  });
});

describe("suivisEnRetardVersAttentes", () => {
  it("calcule les jours de retard et classe au rang « engagement »", () => {
    const ilYA44Jours = new Date(Date.now() - 44 * 86_400_000).toISOString();
    const [a] = suivisEnRetardVersAttentes([
      { id: "f1", clientId: "c1", clientName: "Matheo Dupont", dueDate: ilYA44Jours },
    ]);
    expect(a.qui).toBe("Matheo Dupont");
    expect(a.jours).toBe(44);
    expect(a.rang).toBe(RANG.engagement);
    // Sans numéro : la carte doit proposer « Ouvrir », pas un WhatsApp vide.
    expect(a.telephone).toBeNull();
    expect(a.chemin).toBe("/clients/c1?tab=actions");
  });

  it("donne une clé stable et distincte des leads (persistance « fait » du jour)", () => {
    const [a] = suivisEnRetardVersAttentes([
      { id: "abc", clientId: "c1", clientName: "X", dueDate: new Date().toISOString() },
    ]);
    expect(a.cle).toBe("suivi:abc");
  });

  it("ne descend pas sous zéro pour un suivi dû aujourd'hui", () => {
    const [a] = suivisEnRetardVersAttentes([
      { id: "f", clientId: "c", clientName: "X", dueDate: new Date(Date.now() + 3_600_000).toISOString() },
    ]);
    expect(a.jours).toBe(0);
  });

  it("remplace un nom vide plutôt que d'afficher une ligne anonyme", () => {
    const [a] = suivisEnRetardVersAttentes([
      { id: "f", clientId: "c", clientName: "   ", dueDate: new Date().toISOString() },
    ]);
    expect(a.qui).toBe("Quelqu'un");
  });
});

describe("le profil réel de Thomas au 12/08/2026", () => {
  it("range sa file dans l'ordre qu'on attend à l'écran", () => {
    const j = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
    const file = ordonner([
      // Ce que la file affichait AVANT ce lot — et rien d'autre.
      attente({ cle: "dormant:clement", qui: "Clément", jours: 111, rang: RANG.dormant }),
      // Ce qu'elle ignorait.
      attente({ cle: "lead:florian", qui: "Florian", jours: 5, rang: RANG.mainLevee }),
      attente({ cle: "lead:colis", qui: "Thomas", jours: 25, rang: RANG.mainLevee }),
      ...suivisEnRetardVersAttentes([
        { id: "s1", clientId: "c1", clientName: "Matheo", dueDate: j(44) },
      ]),
    ]);
    expect(file.map((a) => a.qui)).toEqual(["Thomas", "Florian", "Matheo", "Clément"]);
  });
});
