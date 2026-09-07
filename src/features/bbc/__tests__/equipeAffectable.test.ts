// =============================================================================
// QUI PEUT TENIR LE BAR — la liste de la feuille « Qui tient le bar ? ».
//
// Deux règles, toutes deux apprises en production le 07/09/2026 :
//
//   · UN COACH DU CLUB N'EST PAS FORCÉMENT DE LA DOWNLINE. Mesuré en base ce
//     jour-là : `users.sponsor_id` de Mélanie vaut **null**. Elle tient
//     pourtant le club avec Thomas. Le filtre « moi + ma downline directe »
//     l'excluait donc de la feuille — la seule autre personne qui ouvre
//     réellement le bar était la seule qu'on ne pouvait pas y affecter, et
//     rien à l'écran ne le disait.
//
//   · LES COACHS DU CLUB PASSENT DEVANT. Thomas, mot pour mot : « imagine j'ai
//     200 coachs et je dois défiler une liste de personnes qui ne sont pas
//     BBC ». Le reste de l'équipe reste joignable, mais replié.
//
// Module pur : c'est ce qui permet de verrouiller la règle par un test plutôt
// que par un clic — celui-ci, justement, n'aurait jamais été fait.
// =============================================================================

import { describe, it, expect } from "vitest";
import { equipeAffectable, equipeParClub, type Affectable } from "../useClubShifts";
import type { User } from "../../../types/domain";

const THOMAS = "656dcf35-4859-4a70-9d20-990104813423";
const MELANIE = "6e552738-3fe5-4cdb-a4c8-15c5d7dca036";
const FILLEUL = "11111111-1111-1111-1111-111111111111";
const INCONNU = "22222222-2222-2222-2222-222222222222";

const user = (id: string, name: string, extra: Partial<User> = {}): User =>
  ({ id, name, active: true, sponsorId: null, title: "coach", ...extra }) as User;

/** L'équipe telle qu'elle est vraiment en base le 07/09 : Mélanie sans parrain. */
const USERS: User[] = [
  user(THOMAS, "Thomas"),
  user(MELANIE, "Mélanie"),
  user(FILLEUL, "Jeremy", { sponsorId: THOMAS }),
  user(INCONNU, "Quelqu'un d'ailleurs"),
];

const ids = (l: Affectable[]) => l.map((p) => p.id);

describe("equipeAffectable", () => {
  it("garde soi-même et sa downline directe", () => {
    const l = equipeAffectable(USERS, THOMAS);
    expect(ids(l)).toContain(THOMAS);
    expect(ids(l)).toContain(FILLEUL);
    expect(ids(l)).not.toContain(INCONNU);
  });

  it("LE CAS MÉLANIE : un coach du club sans parrain reste affectable", () => {
    // Sans les ids du club, elle disparaît — c'est le bug tel qu'il était.
    expect(ids(equipeAffectable(USERS, THOMAS))).not.toContain(MELANIE);
    // Avec, elle est là.
    expect(ids(equipeAffectable(USERS, THOMAS, [THOMAS, MELANIE]))).toContain(MELANIE);
  });

  it("ne double personne quand le coach du club est déjà dans la downline", () => {
    const l = equipeAffectable(USERS, THOMAS, [THOMAS, FILLEUL]);
    expect(ids(l).filter((x) => x === FILLEUL)).toHaveLength(1);
  });

  it("écarte un compte désactivé, même déclaré coach du club", () => {
    const avecPartie = [...USERS, user("33333333-3333-3333-3333-333333333333", "Partie", { active: false })];
    const l = equipeAffectable(avecPartie, THOMAS, ["33333333-3333-3333-3333-333333333333"]);
    expect(ids(l)).not.toContain("33333333-3333-3333-3333-333333333333");
  });

  it("sans session, personne", () => {
    expect(equipeAffectable(USERS, null, [THOMAS, MELANIE])).toEqual([]);
  });
});

describe("equipeParClub", () => {
  const equipe = equipeAffectable(USERS, THOMAS, [THOMAS, MELANIE]);

  it("met les coachs du club devant et replie le reste", () => {
    const { club, autres } = equipeParClub(equipe, [THOMAS, MELANIE], THOMAS);
    expect(ids(club).sort()).toEqual([THOMAS, MELANIE].sort());
    expect(ids(autres)).toEqual([FILLEUL]);
  });

  it("soi-même est toujours devant, club déclaré ou pas", () => {
    const { club } = equipeParClub(equipe, [], THOMAS);
    expect(ids(club)).toContain(THOMAS);
  });

  it("un club sans coach déclaré ne replie PAS tout le monde", () => {
    // Sinon la feuille s'ouvrirait sur une liste vide : montrer trop plutôt que
    // cacher en silence, la même règle que `porteeValide`.
    const { club, autres } = equipeParClub(equipe, [], null);
    expect(club).toHaveLength(equipe.length);
    expect(autres).toHaveLength(0);
  });

  it("ne perd personne au passage", () => {
    const { club, autres } = equipeParClub(equipe, [THOMAS, MELANIE], THOMAS);
    expect(club.length + autres.length).toBe(equipe.length);
  });
});
