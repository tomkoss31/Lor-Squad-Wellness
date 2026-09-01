// =============================================================================
// LA PORTÉE DE LA SEMAINE — la règle qui décide de qui on voit la journée.
//
// Deux personnes tiennent le club de Verdun. Avant ce module, le front ne le
// savait pas : `coach_user_ids` existait en base et n'était lu nulle part, si
// bien que voir l'autre imposait « toute l'équipe » — douze comptes, dont neuf
// n'ayant jamais rien fait. Personne ne s'en servait.
//
// Deux règles se cassent facilement et coûtent cher :
//   · le propriétaire du club doit TOUJOURS être dans « Le club » ;
//   · un rendez-vous sans propriétaire appartient au club, pas à quelqu'un.
// =============================================================================

import { describe, it, expect } from "vitest";
import {
  idsCoachsDuClub,
  coachsDuClub,
  dansLaPortee,
  porteeValide,
  prenomDe,
} from "../coachsDuClub";
import type { ClubSettings } from "../../../types/domain";

const THOMAS = "656dcf35-4859-4a70-9d20-990104813423";
const MELANIE = "6e552738-3fe5-4cdb-a4c8-15c5d7dca036";
const AUTRE = "11111111-1111-1111-1111-111111111111";

const reglage = (ids?: string[]): ClubSettings =>
  ({ discovery: ids ? { coach_user_ids: ids } : {} }) as ClubSettings;

describe("qui tient le club", () => {
  it("le réglage réel de Verdun : les deux, propriétaire d'abord", () => {
    expect(idsCoachsDuClub(reglage([THOMAS, MELANIE]), THOMAS)).toEqual([THOMAS, MELANIE]);
  });

  it("LE PROPRIÉTAIRE EST TOUJOURS DEDANS, même absent du réglage", () => {
    // Sinon Thomas ne verrait pas ses propres rendez-vous dans « Le club ».
    expect(idsCoachsDuClub(reglage([MELANIE]), THOMAS)).toEqual([THOMAS, MELANIE]);
  });

  it("aucun réglage → le propriétaire seul", () => {
    expect(idsCoachsDuClub(reglage(), THOMAS)).toEqual([THOMAS]);
    expect(idsCoachsDuClub(null, THOMAS)).toEqual([THOMAS]);
  });

  it("pas de doublon si le propriétaire figure aussi dans le réglage", () => {
    expect(idsCoachsDuClub(reglage([THOMAS, MELANIE, THOMAS]), THOMAS)).toEqual([THOMAS, MELANIE]);
  });

  it("ignore les valeurs vides ou non textuelles", () => {
    const sale = { discovery: { coach_user_ids: ["", "  ", null, 42, MELANIE] } } as unknown as ClubSettings;
    expect(idsCoachsDuClub(sale, THOMAS)).toEqual([THOMAS, MELANIE]);
  });

  it("sans club connu, la liste est vide plutôt que fausse", () => {
    expect(idsCoachsDuClub(null, null)).toEqual([]);
  });
});

describe("le prénom affiché", () => {
  it.each([
    ["Mélanie Dubois", "Mélanie"],
    ["Thomas", "Thomas"],
    ["  ZANARDI Sébastien  ", "ZANARDI"],
    ["", "Coach"],
    [null, "Coach"],
  ])("%s → %s", (entree, attendu) => {
    expect(prenomDe(entree as string | null)).toBe(attendu);
  });

  it("rend les coachs prêts à afficher", () => {
    const noms = new Map([[THOMAS, "Thomas"], [MELANIE, "Mélanie"]]);
    expect(coachsDuClub(reglage([THOMAS, MELANIE]), THOMAS, noms)).toEqual([
      { id: THOMAS, prenom: "Thomas" },
      { id: MELANIE, prenom: "Mélanie" },
    ]);
  });
});

describe("ce que la portée laisse passer", () => {
  const ctx = { moi: THOMAS, club: [THOMAS, MELANIE] };

  it("« Moi » ne montre que les miens", () => {
    expect(dansLaPortee("moi", THOMAS, ctx)).toBe(true);
    expect(dansLaPortee("moi", MELANIE, ctx)).toBe(false);
  });

  it("« Le club » montre les deux", () => {
    expect(dansLaPortee("club", THOMAS, ctx)).toBe(true);
    expect(dansLaPortee("club", MELANIE, ctx)).toBe(true);
  });

  it("« Le club » n'ouvre PAS la porte à toute l'équipe", () => {
    // C'est tout l'objet de ce chantier : le club, pas les douze actifs.
    expect(dansLaPortee("club", AUTRE, ctx)).toBe(false);
  });

  it("un coach nommé ne montre que lui", () => {
    expect(dansLaPortee(MELANIE, MELANIE, ctx)).toBe(true);
    expect(dansLaPortee(MELANIE, THOMAS, ctx)).toBe(false);
  });
});

describe("un rendez-vous sans propriétaire appartient au CLUB", () => {
  const ctx = { moi: THOMAS, club: [THOMAS, MELANIE] };

  it("il apparaît sous « Le club »", () => {
    expect(dansLaPortee("club", null, ctx)).toBe(true);
  });

  it("mais JAMAIS sous « Moi » — on ne s'attribue pas le travail d'un autre", () => {
    expect(dansLaPortee("moi", null, ctx)).toBe(false);
  });

  it("ni sous le nom de quelqu'un", () => {
    expect(dansLaPortee(MELANIE, null, ctx)).toBe(false);
    expect(dansLaPortee("moi", undefined, ctx)).toBe(false);
  });
});

describe("la portée relue au démarrage", () => {
  const ids = [THOMAS, MELANIE];

  it("garde un choix valide", () => {
    expect(porteeValide("moi", ids)).toBe("moi");
    expect(porteeValide("club", ids)).toBe("club");
    expect(porteeValide(MELANIE, ids)).toBe(MELANIE);
  });

  it("un coach qui n'est plus du club retombe sur « Le club », pas sur « Moi »", () => {
    // Retomber sur « Moi » ferait disparaître en silence les rendez-vous de
    // l'autre — exactement le défaut qu'on corrige.
    expect(porteeValide(AUTRE, ids)).toBe("club");
  });

  it("rien de mémorisé → « Le club »", () => {
    expect(porteeValide(null, ids)).toBe("club");
    expect(porteeValide(undefined, ids)).toBe("club");
    expect(porteeValide("n'importe quoi", ids)).toBe("club");
  });
});
