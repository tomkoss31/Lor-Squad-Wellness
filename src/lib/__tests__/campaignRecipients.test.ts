import { describe, it, expect } from "vitest";
import { parseRecipients } from "../campaignRecipients";

describe("parseRecipients", () => {
  it("parse un CSV avec en-tête email + prénom", () => {
    const r = parseRecipients("email,prénom\nmarie.l@gmail.com,marie\nkarim@outlook.fr,Karim");
    expect(r.recipients).toEqual([
      { email: "marie.l@gmail.com", firstName: "Marie" },
      { email: "karim@outlook.fr", firstName: "Karim" },
    ]);
    expect(r.hasFirstName).toBe(true);
    expect(r.invalid).toBe(0);
  });

  it("gère une liste sans en-tête, une adresse par ligne", () => {
    const r = parseRecipients("a@x.fr\nb@y.com\n");
    expect(r.recipients.map((x) => x.email)).toEqual(["a@x.fr", "b@y.com"]);
    expect(r.hasFirstName).toBe(false);
  });

  it("déduplique par email (casse ignorée)", () => {
    const r = parseRecipients("marie@x.fr\nMARIE@x.fr\nautre@y.fr");
    expect(r.recipients).toHaveLength(2);
    expect(r.duplicates).toBe(1);
  });

  it("compte les lignes invalides sans planter", () => {
    const r = parseRecipients("pas-un-email\nok@x.fr\n\n   \nencore nul");
    expect(r.recipients).toHaveLength(1);
    expect(r.invalid).toBe(2);
  });

  it("accepte le point-virgule et le tab comme séparateurs", () => {
    const semi = parseRecipients("Prénom;Email\nLila;lila@z.fr");
    expect(semi.recipients).toEqual([{ email: "lila@z.fr", firstName: "Lila" }]);
    const tab = parseRecipients("paul@z.fr\tPaul");
    expect(tab.recipients).toEqual([{ email: "paul@z.fr", firstName: "Paul" }]);
  });

  it("capitalise les prénoms composés proprement", () => {
    const r = parseRecipients("jean-luc@x.fr,jean-luc");
    expect(r.recipients[0].firstName).toBe("Jean-Luc");
  });

  it("trouve l'email quelle que soit la colonne", () => {
    const r = parseRecipients("Marie,marie@x.fr,0600000000");
    expect(r.recipients[0]).toEqual({ email: "marie@x.fr", firstName: "Marie" });
  });

  it("renvoie un résultat vide sur une entrée vide", () => {
    const r = parseRecipients("   \n  \n");
    expect(r.recipients).toHaveLength(0);
    expect(r.totalLines).toBe(0);
  });
});
