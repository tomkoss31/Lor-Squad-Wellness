import { describe, expect, it } from "vitest";
import { estRefusDeSession, reactionSession } from "../sessionAuth";

describe("reactionSession", () => {
  it("une session supprimee sans qu'on l'ait demandee doit alerter", () => {
    // Le cas du 21/08 : jeton de rafraichissement refuse, personne n'a rien demande.
    expect(reactionSession("SIGNED_OUT", false)).toBe("expiree");
  });

  it("« Sortir » ne doit JAMAIS afficher « ta session a expire »", () => {
    // Meme evenement, intention opposee. C'est toute la raison d'etre du drapeau.
    expect(reactionSession("SIGNED_OUT", true)).toBe("sortie-voulue");
  });

  it("une reconnexion et un renouvellement reussi effacent l'alerte", () => {
    expect(reactionSession("SIGNED_IN", false)).toBe("retablie");
    expect(reactionSession("TOKEN_REFRESHED", false)).toBe("retablie");
  });

  it("un renouvellement reussi efface l'alerte meme si le drapeau traine", () => {
    // Sinon un « Sortir » avorte (echec reseau, l'utilisateur reste connecte)
    // laisserait le drapeau arme et la prochaine vraie expiration serait muette.
    expect(reactionSession("TOKEN_REFRESHED", true)).toBe("retablie");
  });

  it("les autres evenements ne declenchent rien", () => {
    for (const e of ["INITIAL_SESSION", "USER_UPDATED", "PASSWORD_RECOVERY", "MFA_CHALLENGE_VERIFIED"]) {
      expect(reactionSession(e, false)).toBe("rien");
      expect(reactionSession(e, true)).toBe("rien");
    }
  });
});

describe("estRefusDeSession", () => {
  it("un 401 sur une lecture ou une ecriture de donnees leve l'alerte", () => {
    // Le cas du 22/08 : six POST /rest/v1/assessments refuses d'affilee.
    expect(estRefusDeSession("https://x.supabase.co/rest/v1/assessments", 401)).toBe(true);
    expect(estRefusDeSession("https://x.supabase.co/rest/v1/clients?select=*", 401)).toBe(true);
  });

  it("un autre code sur la meme route ne leve rien", () => {
    for (const s of [200, 204, 403, 404, 406, 409, 500]) {
      expect(estRefusDeSession("https://x.supabase.co/rest/v1/clients", s)).toBe(false);
    }
  });

  it("les fonctions edge et l'auth sont hors perimetre — elles ont leurs propres 401", () => {
    expect(estRefusDeSession("https://x.supabase.co/functions/v1/book-rdv", 401)).toBe(false);
    expect(estRefusDeSession("https://x.supabase.co/auth/v1/token", 401)).toBe(false);
  });
});
