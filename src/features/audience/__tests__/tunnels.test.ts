// =============================================================================
// L'entonnoir est la partie de la page sur laquelle Thomas va AGIR. S'il
// désigne la mauvaise étape, il répare la mauvaise chose.
// =============================================================================

import { describe, expect, it } from "vitest";
import { analyserTunnels, type EtapeBrute } from "../tunnels";

const bilan: EtapeBrute[] = [
  { tunnel: "bilan", etape: "accueil", rang: 0, n: 164 },
  { tunnel: "bilan", etape: "formulaire", rang: 1, n: 121 },
  { tunnel: "bilan", etape: "mensurations", rang: 2, n: 44 },
  { tunnel: "bilan", etape: "coordonnees", rang: 3, n: 31 },
  { tunnel: "bilan", etape: "envoye", rang: 4, n: 27 },
];

describe("analyserTunnels", () => {
  it("désigne l'étape qui perd la plus grosse PART, pas le plus de monde", () => {
    // Club : 96 → 58 perd 38 personnes (−40 %), 58 → 22 en perd 36 (−62 %).
    // C'est la seconde qu'il faut réparer, même si elle perd moins de têtes.
    const club: EtapeBrute[] = [
      { tunnel: "club", etape: "page", rang: 0, n: 96 },
      { tunnel: "club", etape: "formulaire", rang: 1, n: 58 },
      { tunnel: "club", etape: "creneau", rang: 2, n: 22 },
      { tunnel: "club", etape: "confirme", rang: 3, n: 19 },
    ];
    const [t] = analyserTunnels(club);
    expect(t.pire).toEqual({ etape: "creneau", chute: 62 });
    expect(t.etapes.find((e) => e.pire)?.etape).toBe("creneau");
  });

  it("la barre rouge et la phrase désignent TOUJOURS la même étape", () => {
    // L'incohérence exacte trouvée dans la maquette.
    for (const brutes of [bilan]) {
      const [t] = analyserTunnels(brutes);
      expect(t.etapes.filter((e) => e.pire)).toHaveLength(1);
      expect(t.etapes.find((e) => e.pire)!.etape).toBe(t.pire!.etape);
      expect(t.etapes.find((e) => e.pire)!.chute).toBe(t.pire!.chute);
    }
  });

  it("calcule les chutes et le taux d'arrivée", () => {
    const [t] = analyserTunnels(bilan);
    expect(t.entrent).toBe(164);
    expect(t.arrivent).toBe(27);
    expect(t.tauxFin).toBe(16);
    expect(t.etapes.map((e) => e.chute)).toEqual([null, 26, 64, 30, 13]);
  });

  it("respecte le rang, pas l'ordre d'arrivée des lignes", () => {
    const melange = [...bilan].reverse();
    const [t] = analyserTunnels(melange);
    expect(t.etapes.map((e) => e.etape)).toEqual([
      "accueil", "formulaire", "mensurations", "coordonnees", "envoye",
    ]);
  });

  it("ne montre jamais une chute NÉGATIVE", () => {
    // Cas réel : les compteurs sont agrégés par jour, donc quelqu'un peut
    // atteindre l'étape 2 aujourd'hui après avoir vu l'étape 1 hier. Une
    // « remontée » affichée ferait croire à un bug.
    const bizarre: EtapeBrute[] = [
      { tunnel: "x", etape: "a", rang: 0, n: 10 },
      { tunnel: "x", etape: "b", rang: 1, n: 14 },
    ];
    const [t] = analyserTunnels(bizarre);
    expect(t.etapes[1].chute).toBe(0);
    expect(t.etapes[1].part).toBeLessThanOrEqual(100);
  });

  it("ne désigne aucune étape quand personne ne décroche", () => {
    const parfait: EtapeBrute[] = [
      { tunnel: "x", etape: "a", rang: 0, n: 5 },
      { tunnel: "x", etape: "b", rang: 1, n: 5 },
    ];
    expect(analyserTunnels(parfait)[0].pire).toBeNull();
  });

  it("survit à un tunnel d'une seule étape", () => {
    const [t] = analyserTunnels([{ tunnel: "x", etape: "a", rang: 0, n: 3 }]);
    expect(t.pire).toBeNull();
    expect(t.tauxFin).toBe(100);
  });

  it("ne divise jamais par zéro", () => {
    const vide: EtapeBrute[] = [
      { tunnel: "x", etape: "a", rang: 0, n: 0 },
      { tunnel: "x", etape: "b", rang: 1, n: 0 },
    ];
    const [t] = analyserTunnels(vide);
    expect(t.tauxFin).toBe(0);
    expect(t.etapes.every((e) => Number.isFinite(e.part))).toBe(true);
  });

  it("sépare les tunnels et met le plus fréquenté en premier", () => {
    const deux = [...bilan, { tunnel: "club", etape: "page", rang: 0, n: 900 }];
    expect(analyserTunnels(deux).map((t) => t.tunnel)).toEqual(["club", "bilan"]);
  });

  it("rend une liste vide sans rien casser", () => {
    expect(analyserTunnels([])).toEqual([]);
  });
});
