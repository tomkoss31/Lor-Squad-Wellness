// =============================================================================
// LE COUPLE COMPTE POUR UN SEUL PARRAIN.
//
// Thomas et Mélanie sont deux comptes pour UN SEUL distributeur Herbalife. Les
// recrues portent l'identifiant de celui qui a signé le parrainage. Compté en
// base le 07/09 : **10 pour Thomas, 3 pour Mélanie**, et `sponsor_id` des deux
// vaut `null` (ils sont en haut de la lignée, c'est normal).
//
// Conséquence sur tout écran qui filtre en `u.sponsorId === currentUser.id` :
// chacun ne voit que sa moitié, jamais les 13. Sur `/formation/mon-equipe` il
// n'existe même aucune porte de sortie « admin » pour rattraper ça.
//
// Thomas, mot pour mot : « mon appli = la sienne en fonctionnalité ».
// =============================================================================

import { describe, it, expect } from "vitest";
import { parrainsDeLaVue, COUPLE_USER_IDS_HARDCODED } from "../teamConfig";
import type { User } from "../../types/domain";

const [THOMAS, MELANIE] = COUPLE_USER_IDS_HARDCODED;
const FILLEUL = "11111111-1111-1111-1111-111111111111";

const user = (id: string, name: string, extra: Partial<User> = {}): User =>
  ({ id, name, active: true, sponsorId: null, ...extra }) as User;

const USERS: User[] = [
  user(THOMAS, "Thomas"),
  user(MELANIE, "Mélanie"),
  user(FILLEUL, "Jeremy", { sponsorId: THOMAS }),
];

describe("parrainsDeLaVue", () => {
  it("un membre du couple regarde sous LES DEUX identifiants", () => {
    expect(parrainsDeLaVue(THOMAS, USERS).sort()).toEqual([THOMAS, MELANIE].sort());
    expect(parrainsDeLaVue(MELANIE, USERS).sort()).toEqual([THOMAS, MELANIE].sort());
  });

  it("LE CAS MÉLANIE : elle retrouve une recrue parrainée par Thomas", () => {
    const parrains = parrainsDeLaVue(MELANIE, USERS);
    const recrues = USERS.filter(
      (u) => u.sponsorId != null && parrains.includes(u.sponsorId) && !parrains.includes(u.id),
    );
    expect(recrues.map((r) => r.id)).toEqual([FILLEUL]);
  });

  it("les deux voient EXACTEMENT la même équipe", () => {
    const vue = (id: string) => {
      const p = parrainsDeLaVue(id, USERS);
      return USERS.filter((u) => u.sponsorId != null && p.includes(u.sponsorId) && !p.includes(u.id))
        .map((u) => u.id)
        .sort();
    };
    expect(vue(MELANIE)).toEqual(vue(THOMAS));
  });

  it("le couple ne se compte jamais lui-même comme sa propre recrue", () => {
    const avecLien = [...USERS.filter((u) => u.id !== MELANIE), user(MELANIE, "Mélanie", { sponsorId: THOMAS })];
    const p = parrainsDeLaVue(THOMAS, avecLien);
    const recrues = avecLien.filter(
      (u) => u.sponsorId != null && p.includes(u.sponsorId) && !p.includes(u.id),
    );
    expect(recrues.map((r) => r.id)).toEqual([FILLEUL]);
  });

  it("quelqu'un d'autre ne regarde que sous son propre identifiant", () => {
    expect(parrainsDeLaVue(FILLEUL, USERS)).toEqual([FILLEUL]);
  });

  it("sans session, la liste est vide — jamais l'équipe de quelqu'un d'autre", () => {
    expect(parrainsDeLaVue(null, USERS)).toEqual([]);
    expect(parrainsDeLaVue(undefined, USERS)).toEqual([]);
  });

  it("si un membre du couple manque dans `users`, on ne le fabrique pas", () => {
    // `resolveCoupleUserIds` ne garde que les identifiants réellement présents :
    // le couple n'est plus complet, chacun retombe sur sa vue perso.
    const seul = USERS.filter((u) => u.id !== MELANIE);
    expect(parrainsDeLaVue(THOMAS, seul)).toEqual([THOMAS]);
  });
});
