// Les cas sont ceux MESURÉS en base le 24/08, pas des cas inventés.
import { describe, expect, it } from "vitest";
import {
  clesDoublon,
  grouperParPersonne,
  memePersonne,
  normaliserEmail,
  normaliserTelephone,
} from "../cleDoublon";

describe("normaliserTelephone", () => {
  it("reduit toutes les ecritures d'un numero a la meme cle", () => {
    const attendu = "612345678";
    for (const forme of ["0612345678", "06 12 34 56 78", "+33 6 12 34 56 78", "0033612345678", "06.12.34.56.78"]) {
      expect(normaliserTelephone(forme)).toBe(attendu);
    }
  });

  it("REFUSE un email — c'etait le bug du badge", () => {
    // `sarah123456@gmail.com` devenait le « telephone » 123456.
    expect(normaliserTelephone("sarah123456@gmail.com")).toBeNull();
    expect(normaliserTelephone("fatihaa4399@gmail.com")).toBeNull();
    expect(normaliserTelephone("manon.perrin.55@gmail.com")).toBeNull();
  });

  it("refuse ce qui est trop court pour identifier quelqu'un", () => {
    expect(normaliserTelephone("12345678")).toBeNull(); // 8 chiffres
    expect(normaliserTelephone("06 12")).toBeNull();
    expect(normaliserTelephone("")).toBeNull();
    expect(normaliserTelephone(null)).toBeNull();
  });
});

describe("normaliserEmail", () => {
  it("met en minuscules et enleve les espaces", () => {
    expect(normaliserEmail("  Manon.PERRIN.55@Gmail.com ")).toBe("manon.perrin.55@gmail.com");
  });

  it("refuse ce qui n'est pas une adresse", () => {
    expect(normaliserEmail("0612345678")).toBeNull();
    expect(normaliserEmail("pas-une-adresse")).toBeNull();
    expect(normaliserEmail("a@b")).toBeNull(); // pas de point
    expect(normaliserEmail(null)).toBeNull();
  });
});

describe("clesDoublon", () => {
  it("rend le numero ET l'adresse quand les deux sont connus", () => {
    expect(clesDoublon({ phone: "06 12 34 56 78", email: "X@Y.FR" })).toEqual(["t:612345678", "e:x@y.fr"]);
  });

  it("sait encore lire l'ancien champ `contact` (phone || email)", () => {
    expect(clesDoublon({ contact: "0612345678" })).toEqual(["t:612345678"]);
    expect(clesDoublon({ contact: "x@y.fr" })).toEqual(["e:x@y.fr"]);
  });

  it("ne rend rien pour une intention de parrainage (aucun contact)", () => {
    // client_referral_intentions : `contact: null` en dur — jamais rapprochable.
    expect(clesDoublon({ contact: null })).toEqual([]);
  });
});

describe("memePersonne", () => {
  it("rapproche par telephone meme si l'ecriture differe (cas boite d'arrivee)", () => {
    expect(memePersonne({ contact: "06 12 34 56 78" }, { contact: "0612345678" })).toBe(true);
  });

  it("LE CAS DEUX PORTES : telephone au club, email sur le bilan", () => {
    // Le blocage principal : `contact = phone || email` donnait « t:… » d'un
    // cote et « e:… » de l'autre, donc aucun rapprochement.
    const club = { phone: "0612345678", email: "djamal@exemple.fr" };
    const bilan = { phone: null, email: "djamal@exemple.fr" };
    expect(memePersonne(club, bilan)).toBe(true);
  });

  it("ne rapproche PAS deux inconnus qui partagent des chiffres dans leur adresse", () => {
    expect(memePersonne({ contact: "fatihaa4399@gmail.com" }, { contact: "milmel4399@gmail.com" })).toBe(false);
  });

  it("ne rapproche personne quand on ne sait rien", () => {
    expect(memePersonne({ contact: null }, { contact: null })).toBe(false);
  });
});

describe("grouperParPersonne", () => {
  it("regroupe les 3 fiches de claire (formulaire soumis 3x en 4 minutes)", () => {
    const fiches = [
      { id: "a", phone: "0625014946", email: null },
      { id: "b", phone: "06 25 01 49 46", email: null },
      { id: "c", phone: "+33625014946", email: null },
    ];
    const groupes = grouperParPersonne(fiches);
    expect(groupes).toHaveLength(1);
    expect(groupes[0]).toHaveLength(3);
  });

  it("est TRANSITIF : A~B par telephone, B~C par email => A, B et C ensemble", () => {
    const a = { id: "a", phone: "0612345678", email: null };
    const b = { id: "b", phone: "0612345678", email: "x@y.fr" };
    const c = { id: "c", phone: null, email: "x@y.fr" };
    const groupes = grouperParPersonne([a, b, c]);
    expect(groupes).toHaveLength(1);
    expect(groupes[0].map((f) => f.id).sort()).toEqual(["a", "b", "c"]);
  });

  it("laisse seules les fiches sans contact, sans jamais les fusionner entre elles", () => {
    const groupes = grouperParPersonne([
      { id: "a", contact: null },
      { id: "b", contact: null },
    ]);
    expect(groupes).toHaveLength(2);
  });

  it("ne melange pas deux personnes differentes", () => {
    const groupes = grouperParPersonne([
      { id: "manon-perrin", phone: "0608338106", email: "manon.perrin.55@gmail.com" },
      { id: "manon-legrand", phone: "0699887766", email: "manon.legrand@gmail.com" },
    ]);
    expect(groupes).toHaveLength(2);
  });
});
