// =============================================================================
// Le lien « répondre par mail ».
//
// Ce qu'on protège : le message arrive ENTIER et LISIBLE dans la messagerie.
// Un encodage approximatif et le coach relit « Bonjour+Malone+!+👋 » avant
// d'envoyer — il repartirait aussitôt au copier-coller.
// =============================================================================

import { describe, expect, it } from "vitest";
import { buildCrmMailLink, objetPourLead, type CrmMessageContext } from "../crmMessages";
import type { CrmLead } from "../../hooks/useCrmLeads";

const CTX: CrmMessageContext = {
  coachFirstName: "Thomas",
  bilanUrl: "https://labase360.fr/bilan-online/thomas",
  vipUrl: "https://labase360.fr/vip/thomas",
};

const lead = (p: Partial<CrmLead> = {}): CrmLead =>
  ({
    key: "online_bilans:1", table: "online_bilans", id: "1",
    firstName: "Malone", contact: "malone.muri9@gmail.com", contactIsPhone: false,
    city: null, source: "bilan-online", status: "contacted", viaName: null,
    parrainPhone: null, parrainClientId: null, extra: null, ownerUserId: null,
    relanceDue: false, relanceDueAt: null, derniereReponse: null, resultToken: null,
    callbackRequestedAt: null, engagement: null, createdAt: "2026-08-16T10:00:00Z",
    contactedAt: null, notes: null, ...p,
  }) as CrmLead;

describe("le destinataire", () => {
  it("est bien la personne — plus besoin de copier son adresse", () => {
    const url = buildCrmMailLink("malone.muri9@gmail.com", "Bonjour", "Objet");
    expect(url.startsWith("mailto:malone.muri9@gmail.com?")).toBe(true);
  });

  it("sans adresse, le mail s'ouvre quand même avec le message prêt", () => {
    // Mieux qu'un bouton mort : le coach colle l'adresse, le texte est déjà là.
    expect(buildCrmMailLink(null, "Bonjour", "Objet").startsWith("mailto:?")).toBe(true);
  });

  it("un numéro de téléphone n'est pas un destinataire", () => {
    expect(buildCrmMailLink("06 25 01 49 46", "Bonjour", "Objet").startsWith("mailto:?")).toBe(true);
  });
});

describe("le message arrive intact", () => {
  const message = "Bonjour Malone ! 👋\n\nC'est Thomas, de La Base 360.\nÀ bientôt 🌿";

  it("les retours à la ligne et les accents survivent", () => {
    const u = new URL(buildCrmMailLink("a@b.fr", message, "Objet"));
    expect(u.searchParams.get("body")).toBe(message);
  });

  it("les espaces restent des espaces, pas des +", () => {
    // Le piège de URLSearchParams : il encode l'espace en « + », que les
    // clients mail affichent littéralement dans le corps du message.
    const url = buildCrmMailLink("a@b.fr", "deux mots", "trois petits mots");
    expect(url).not.toContain("+");
    expect(new URL(url).searchParams.get("body")).toBe("deux mots");
    expect(new URL(url).searchParams.get("subject")).toBe("trois petits mots");
  });

  it("une esperluette ne coupe pas le message en deux", () => {
    const avecEt = "Toi & moi, on se cale ça ?";
    expect(new URL(buildCrmMailLink("a@b.fr", avecEt, "O")).searchParams.get("body")).toBe(avecEt);
  });
});

describe("l'objet", () => {
  it("dit de quoi il s'agit, et de la part de qui", () => {
    expect(objetPourLead(lead(), CTX)).toBe("Ton bilan bien-être — Thomas, La Base 360");
  });

  it("s'adapte à la source", () => {
    expect(objetPourLead(lead({ source: "vip" }), CTX)).toMatch(/Club VIP/);
    expect(objetPourLead(lead({ source: "site-club" }), CTX)).toMatch(/Breakfast Club/);
    expect(objetPourLead(lead({ source: "reco-client" }), CTX)).toMatch(/parlé de toi/);
  });

  it("n'est jamais vide, même pour une source inconnue", () => {
    for (const s of ["welcome", "colis", "inconnue", "intention"] as const) {
      expect(objetPourLead(lead({ source: s }), CTX).length).toBeGreaterThan(5);
    }
  });

  it("ne finit pas par un point — c'est un objet, pas une phrase", () => {
    expect(objetPourLead(lead(), CTX).endsWith(".")).toBe(false);
  });
});
