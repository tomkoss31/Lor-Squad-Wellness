// Les deux cassages REELS de ce reglage, figes en tests pour qu'il n'y en ait
// pas un troisieme. Donnees du 25/08 : club « La Base Nutrition » possede par
// Thomas, rendez-vous menes par Melanie.
import { describe, expect, it } from "vitest";
import { voitCeRdvDuClub } from "../visibiliteRdvClub";

const THOMAS = "656dcf35"; // proprietaire du club
const MELANIE = "6e552738"; // coache des RDV
const AUTRE = "zzz";

describe("voitCeRdvDuClub", () => {
  // ── LE CASSAGE DU 25/08 ────────────────────────────────────────────────
  it("LE PROPRIETAIRE voit un RDV de son club mene par quelqu'un d'autre", () => {
    expect(voitCeRdvDuClub({
      aQui: MELANIE, moi: THOMAS, filtre: "mine",
      proprietaireDuClub: true, estAdmin: true,
    })).toBe(true);
  });

  // ── LE CASSAGE D'AVANT LE 19/08 ────────────────────────────────────────
  it("LA COACHE voit le RDV qu'elle mene, meme sans posseder le club", () => {
    expect(voitCeRdvDuClub({
      aQui: MELANIE, moi: MELANIE, filtre: "mine",
      proprietaireDuClub: false, estAdmin: true,
    })).toBe(true);
  });

  it("les deux le voient EN MEME TEMPS — c'est tout l'objet de la regle", () => {
    const rdv = { aQui: MELANIE, filtre: "mine", estAdmin: true };
    const vuParLaCoache = voitCeRdvDuClub({ ...rdv, moi: MELANIE, proprietaireDuClub: false });
    const vuParLeProprio = voitCeRdvDuClub({ ...rdv, moi: THOMAS, proprietaireDuClub: true });
    expect([vuParLaCoache, vuParLeProprio]).toEqual([true, true]);
  });

  it("un tiers sans club ne voit pas le RDV d'un autre", () => {
    expect(voitCeRdvDuClub({
      aQui: MELANIE, moi: AUTRE, filtre: "mine",
      proprietaireDuClub: false, estAdmin: true,
    })).toBe(false);
  });

  it("« toute l'equipe » montre tout", () => {
    expect(voitCeRdvDuClub({
      aQui: MELANIE, moi: AUTRE, filtre: "all",
      proprietaireDuClub: false, estAdmin: true,
    })).toBe(true);
  });

  // ── L'EXCEPTION NE DOIT PAS DEBORDER ───────────────────────────────────
  it("filtrer sur UN distributeur precis ignore l'exception du club", () => {
    // Thomas possede le club, mais il demande l'agenda de « AUTRE » :
    // un RDV mene par Melanie ne doit PAS s'y inviter.
    expect(voitCeRdvDuClub({
      aQui: MELANIE, moi: THOMAS, filtre: AUTRE,
      proprietaireDuClub: true, estAdmin: true,
    })).toBe(false);
  });

  it("filtrer sur un distributeur montre bien SES rendez-vous", () => {
    expect(voitCeRdvDuClub({
      aQui: MELANIE, moi: THOMAS, filtre: MELANIE,
      proprietaireDuClub: true, estAdmin: true,
    })).toBe(true);
  });

  it("un non-admin reste enferme dans son perimetre, club ou pas", () => {
    expect(voitCeRdvDuClub({
      aQui: MELANIE, moi: THOMAS, filtre: "all",
      proprietaireDuClub: true, estAdmin: false,
    })).toBe(false);
  });

  it("sans utilisateur, on ne montre rien", () => {
    expect(voitCeRdvDuClub({
      aQui: MELANIE, moi: null, filtre: "all",
      proprietaireDuClub: true, estAdmin: true,
    })).toBe(false);
  });
});
