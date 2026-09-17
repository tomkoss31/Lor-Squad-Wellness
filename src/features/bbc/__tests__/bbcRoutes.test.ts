import { describe, expect, it } from "vitest";
import { vueBbcPourAdresse } from "../bbcRoutes";

describe("en mode BBC, c'est l'adresse qui décide", () => {
  it("l'accueil reste dans BBC", () => {
    expect(vueBbcPourAdresse("/")).toBe("cockpit");
    expect(vueBbcPourAdresse("/co-pilote")).toBe("cockpit");
    expect(vueBbcPourAdresse("/co-pilote/")).toBe("cockpit");
    expect(vueBbcPourAdresse("")).toBe("cockpit");
  });

  it("l'agenda et les messages ouvrent LEUR onglet de BBC", () => {
    expect(vueBbcPourAdresse("/agenda")).toBe("agenda");
    expect(vueBbcPourAdresse("/messages")).toBe("messages");
    expect(vueBbcPourAdresse("/messagerie/conversation/abc")).toBe("messages");
  });

  it("LE BUG : les 10 notifications vers /crm ouvrent le lead, plus « Ce matin »", () => {
    expect(vueBbcPourAdresse("/crm")).toBeNull();
    expect(vueBbcPourAdresse("/crm/leads/3f2a")).toBeNull();
    expect(vueBbcPourAdresse("/crm?lead=3f2a")).toBeNull();
  });

  it("tout ce que BBC ne sait pas servir passe au standard", () => {
    for (const adresse of ["/clients", "/clients/42", "/encaissement", "/suivis-du-jour", "/rentabilite", "/parametres", "/assessments/new"]) {
      expect(vueBbcPourAdresse(adresse)).toBeNull();
    }
  });

  it("un préfixe qui ressemble ne trompe pas la règle", () => {
    expect(vueBbcPourAdresse("/agenda-club")).toBeNull();
    expect(vueBbcPourAdresse("/messages-archives")).toBeNull();
  });
});
