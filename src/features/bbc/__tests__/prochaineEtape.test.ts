import { describe, expect, it } from "vitest";
import { prochaineEtape } from "../prochaineEtape";
import { nextPalier } from "../useBbcHearts";
import type { BbcMember } from "../useBbcMembers";

const membre = (p: Partial<BbcMember>): BbcMember =>
  ({ id: "m1", name: "Léa", started: true, visits: 4, hearts: 0, pendingHearts: 0, visitedToday: false, card: { type: 10, used: 4, remaining: 6, expired: false }, ...p }) as BbcMember;

describe("la prochaine étape d'une membre", () => {
  it("carte finie → le bilan des 10, en premier et en plein", () => {
    const e = prochaineEtape(membre({ card: { type: 10, used: 10, remaining: 0, expired: false } }));
    expect(e[0]).toMatchObject({ cle: "bilan", action: "bilan", fort: true });
    expect(e[0].titre).toContain("bilan des 10");
  });

  it("9e visite → on prépare le bilan, la check-list s'ouvre déjà", () => {
    const e = prochaineEtape(membre({ card: { type: 10, used: 9, remaining: 1, expired: false } }));
    expect(e[0]).toMatchObject({ cle: "bilan_bientot", action: "bilan", fort: true });
  });

  it("sans carte → lui donner une carte ; périmée → la renouveler", () => {
    expect(prochaineEtape(membre({ card: null }))[0]).toMatchObject({ cle: "carte", fort: true });
    expect(prochaineEtape(membre({ card: { type: 30, used: 12, remaining: 18, expired: true } }))[0].titre).toBe("Renouveler sa carte");
  });

  it("des recos à valider, et le cœur qui manque au palier", () => {
    const aUnCoeur = (nextPalier(0) ?? 1) - 1;
    const cles = prochaineEtape(membre({ pendingHearts: 2, hearts: aUnCoeur })).map((e) => e.cle);
    expect(cles).toEqual(["recos", "coeur", "appels"]);
    expect(prochaineEtape(membre({ pendingHearts: 2 }))[0].titre).toBe("2 recos à valider");
  });

  it("l'invitation aux appels ferme toujours la liste, et une membre calme n'a que ça", () => {
    const e = prochaineEtape(membre({}));
    expect(e).toHaveLength(1);
    expect(e[0].action).toBe("appels");
  });
});
