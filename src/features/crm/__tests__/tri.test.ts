// =============================================================================
// L'ORDRE DE LA LISTE — verrouillé, parce qu'il a déjà été perdu une fois.
//
// Le sélecteur « Trier » est resté affiché pendant toute la refonte sans que
// personne ne lise sa valeur : quatre choix, un seul ordre réel. Si un jour on
// re-débranche le tri, c'est ici que ça doit casser.
// =============================================================================

import { describe, it, expect } from "vitest";
import { trierLeads, comparerPourTri, echeanceMs, OPTIONS_TRI, type LeadTriable } from "../tri";

const lead = (p: Partial<LeadTriable> & { firstName: string }): LeadTriable => ({
  lastName: null,
  createdAt: "2026-08-01T10:00:00Z",
  relanceDueAt: null,
  ...p,
});

const noms = (l: LeadTriable[]) => l.map((x) => x.firstName);

describe("Nom A→Z", () => {
  it("range par nom complet, insensible à la casse", () => {
    const l = [lead({ firstName: "zoé" }), lead({ firstName: "Amel" }), lead({ firstName: "Marc" })];
    expect(noms(trierLeads(l, "name"))).toEqual(["Amel", "Marc", "zoé"]);
  });

  it("ignore les accents — Élodie se range avec les E, pas à la fin", () => {
    const l = [lead({ firstName: "Fabien" }), lead({ firstName: "Élodie" })];
    expect(noms(trierLeads(l, "name"))).toEqual(["Élodie", "Fabien"]);
  });

  it("le nom de famille départage deux prénoms identiques", () => {
    const l = [
      lead({ firstName: "Marie", lastName: "Zidane" }),
      lead({ firstName: "Marie", lastName: "Abitbol" }),
    ];
    expect(trierLeads(l, "name").map((x) => x.lastName)).toEqual(["Abitbol", "Zidane"]);
  });
});

describe("Plus récents / plus anciens", () => {
  const l = [
    lead({ firstName: "Milieu", createdAt: "2026-08-15T09:00:00Z" }),
    lead({ firstName: "Vieux", createdAt: "2026-07-01T09:00:00Z" }),
    lead({ firstName: "Neuf", createdAt: "2026-08-30T09:00:00Z" }),
  ];

  it("les plus récents d'abord", () => {
    expect(noms(trierLeads(l, "recent"))).toEqual(["Neuf", "Milieu", "Vieux"]);
  });

  it("et l'inverse, exactement", () => {
    expect(noms(trierLeads(l, "oldest"))).toEqual(["Vieux", "Milieu", "Neuf"]);
  });
});

describe("Par échéance — la plus urgente en haut", () => {
  it("la date de retour la plus proche passe devant", () => {
    const l = [
      lead({ firstName: "Vendredi", relanceDueAt: "2026-09-05T09:00:00Z" }),
      lead({ firstName: "Mardi", relanceDueAt: "2026-09-02T09:00:00Z" }),
    ];
    expect(noms(trierLeads(l, "echeance"))).toEqual(["Mardi", "Vendredi"]);
  });

  it("SANS échéance = à traiter maintenant → tout en haut, jamais au fond", () => {
    // La lecture inverse enterrerait les nouveaux arrivants sous les leads
    // déjà programmés — c'est-à-dire exactement ceux qu'il faut appeler.
    const l = [
      lead({ firstName: "Programmée", relanceDueAt: "2026-09-02T09:00:00Z" }),
      lead({ firstName: "Sans suite", relanceDueAt: null }),
    ];
    expect(noms(trierLeads(l, "echeance"))).toEqual(["Sans suite", "Programmée"]);
  });

  it("à échéance égale, celui qui attend depuis le plus longtemps passe devant", () => {
    const l = [
      lead({ firstName: "Arrivé hier", createdAt: "2026-08-30T09:00:00Z", relanceDueAt: "2026-09-02T09:00:00Z" }),
      lead({ firstName: "Arrivé en juin", createdAt: "2026-06-02T09:00:00Z", relanceDueAt: "2026-09-02T09:00:00Z" }),
    ];
    expect(noms(trierLeads(l, "echeance"))).toEqual(["Arrivé en juin", "Arrivé hier"]);
  });

  it("une date illisible ne fait pas exploser l'ordre", () => {
    expect(echeanceMs(lead({ firstName: "X", relanceDueAt: "pas-une-date" }))).toBe(Number.NEGATIVE_INFINITY);
  });
});

describe("les garanties de base", () => {
  it("trier ne modifie JAMAIS la liste d'origine", () => {
    const l = [lead({ firstName: "B" }), lead({ firstName: "A" })];
    const avant = noms(l);
    trierLeads(l, "name");
    expect(noms(l)).toEqual(avant);
  });

  it("chaque option proposée à l'écran sait vraiment comparer", () => {
    const a = lead({ firstName: "A", createdAt: "2026-08-01T00:00:00Z" });
    const b = lead({ firstName: "B", createdAt: "2026-08-02T00:00:00Z" });
    for (const o of OPTIONS_TRI) {
      expect(Number.isFinite(comparerPourTri(o.valeur, a, b))).toBe(true);
    }
  });
});
