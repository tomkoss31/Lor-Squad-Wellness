// Chantier Invitation distributeur V2 (2026-04-24).
// Tests des fonctions pures de construction de lien WhatsApp + validation
// basique des tokens.

import { describe, it, expect } from "vitest";

// Reprend la logique de buildWhatsAppUrl de InviteDistributorModal
function buildWhatsAppUrl(phone: string, firstName: string, inviteUrl: string): string {
  const digits = phone.replace(/\D/g, "");
  const msg = `Salut ${firstName} ! Bienvenue dans l'équipe 💪 Voici ton lien d'accès : ${inviteUrl}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
}

// Reprend la logique de validation de l'email dans consume-distributor-invite-token
function isValidEmail(email: string): boolean {
  return /.+@.+\..+/.test(email.trim());
}

// Reprend la logique de validation de statut du token côté Edge Function
type TokenRow = {
  consumed_at: string | null;
  expires_at: string;
};
function tokenStatus(row: TokenRow, nowMs = Date.now()): "valid" | "consumed" | "expired" {
  if (row.consumed_at) return "consumed";
  if (new Date(row.expires_at).getTime() < nowMs) return "expired";
  return "valid";
}

describe("buildWhatsAppUrl — nettoyage phone", () => {
  it("supprime espaces et chars non numériques", () => {
    const url = buildWhatsAppUrl("06 12 34 56 78", "Emma", "https://x/abc");
    expect(url).toContain("wa.me/0612345678?");
  });
  it("garde le format international", () => {
    const url = buildWhatsAppUrl("+33 6 12 34 56 78", "Emma", "https://x/abc");
    expect(url).toContain("wa.me/33612345678?");
  });
  it("encode le prénom et l'URL", () => {
    const url = buildWhatsAppUrl("0612", "Émilie", "https://x/abc");
    expect(url).toContain(encodeURIComponent("Émilie"));
    expect(url).toContain(encodeURIComponent("https://x/abc"));
  });
});

describe("isValidEmail — validation basique", () => {
  it("accepte un format correct", () => {
    expect(isValidEmail("thomas@wellness.com")).toBe(true);
    expect(isValidEmail(" emma.dupont@gmail.com ")).toBe(true);
  });
  it("rejette les formats incomplets", () => {
    expect(isValidEmail("pasdemail")).toBe(false);
    expect(isValidEmail("at@no")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });
});

describe("tokenStatus — validation token invitation", () => {
  const now = Date.now();
  it("valide si non consommé et non expiré", () => {
    const r = tokenStatus({
      consumed_at: null,
      expires_at: new Date(now + 1000).toISOString(),
    });
    expect(r).toBe("valid");
  });
  it("consumed si consumed_at rempli", () => {
    const r = tokenStatus({
      consumed_at: new Date(now - 10000).toISOString(),
      expires_at: new Date(now + 10000).toISOString(),
    });
    expect(r).toBe("consumed");
  });
  it("expired si expires_at < now", () => {
    const r = tokenStatus({
      consumed_at: null,
      expires_at: new Date(now - 10).toISOString(),
    });
    expect(r).toBe("expired");
  });
  it("consumed prioritaire sur expired", () => {
    const r = tokenStatus({
      consumed_at: new Date(now - 10).toISOString(),
      expires_at: new Date(now - 1000).toISOString(),
    });
    expect(r).toBe("consumed");
  });
});
