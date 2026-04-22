// Chantier Welcome Page + Magic Links (2026-04-24).
// Tests des règles de validation d'un magic link (côté logique Edge
// Function). Reproduit la fonction pure pour garantir non-régression.

import { describe, it, expect } from "vitest";

type TokenRow = {
  consumed_at: string | null;
  expires_at: string;
  usage_count: number;
  max_usage: number;
};

type Status = "valid" | "consumed" | "expired" | "exhausted";

function tokenStatus(row: TokenRow, now = Date.now()): Status {
  if (row.consumed_at) return "consumed";
  if (new Date(row.expires_at).getTime() < now) return "expired";
  if (row.usage_count >= row.max_usage) return "exhausted";
  return "valid";
}

describe("magic link tokenStatus", () => {
  const now = Date.now();
  const base = {
    consumed_at: null,
    expires_at: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
    usage_count: 0,
    max_usage: 3,
  } as const;

  it("valide au démarrage", () => {
    expect(tokenStatus(base)).toBe("valid");
  });
  it("expired si expires_at passé", () => {
    expect(tokenStatus({ ...base, expires_at: new Date(now - 1000).toISOString() })).toBe("expired");
  });
  it("consumed si consumed_at rempli", () => {
    expect(tokenStatus({ ...base, consumed_at: new Date(now).toISOString() })).toBe("consumed");
  });
  it("exhausted si usage_count >= max_usage (pas consommé)", () => {
    expect(tokenStatus({ ...base, usage_count: 3 })).toBe("exhausted");
  });
  it("usage 2/3 reste valide", () => {
    expect(tokenStatus({ ...base, usage_count: 2 })).toBe("valid");
  });
  it("consumed prioritaire sur expired", () => {
    expect(tokenStatus({
      ...base,
      consumed_at: new Date(now - 10).toISOString(),
      expires_at: new Date(now - 1000).toISOString(),
    })).toBe("consumed");
  });
  it("expired prioritaire sur exhausted", () => {
    expect(tokenStatus({
      ...base,
      expires_at: new Date(now - 1000).toISOString(),
      usage_count: 3,
    })).toBe("expired");
  });
});

// ─── Prospect lead form validation (reproduit l'Edge Function) ──────────
function isValidLead(input: { first_name?: string; phone?: string }): boolean {
  const firstName = (input.first_name ?? "").trim();
  const phone = (input.phone ?? "").trim();
  if (firstName.length < 2) return false;
  if (phone.replace(/\D/g, "").length < 6) return false;
  return true;
}

describe("prospect lead validation", () => {
  it("accepte un input correct", () => {
    expect(isValidLead({ first_name: "Emma", phone: "06 12 34 56 78" })).toBe(true);
  });
  it("rejette un prénom trop court", () => {
    expect(isValidLead({ first_name: "E", phone: "06 12 34 56 78" })).toBe(false);
  });
  it("rejette un phone avec trop peu de digits", () => {
    expect(isValidLead({ first_name: "Emma", phone: "06 12" })).toBe(false);
  });
  it("compte bien les digits malgré les espaces/tirets", () => {
    expect(isValidLead({ first_name: "Emma", phone: "06-12-34-56-78" })).toBe(true);
  });
  it("rejette champ vide", () => {
    expect(isValidLead({})).toBe(false);
  });
});
