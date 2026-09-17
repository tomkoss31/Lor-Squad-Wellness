// =============================================================================
// La palette des coachs — verrouillée après le 17/09/2026.
//
// Elle avait un doublon (« Turquoise » et « Cyan » = #2DD4BF) et une valeur qui
// n'était pas un hex (« Doré » = var(--ls-teal)). Le repli par hachage tirait
// dans ces six entrées : quatre coachs sur dix étaient turquoise. Ces tests
// empêchent que ça revienne.
// =============================================================================

import { describe, expect, it } from "vitest";
import { CALENDAR_PALETTE, fallbackOwnerColor, makeOwnerColorResolver } from "../calendarEvents";

const HEX = /^#[0-9A-Fa-f]{6}$/;

describe("la palette des coachs", () => {
  it("ne contient que des hex valides — un `var(--x)` serait rejeté par le résolveur", () => {
    for (const c of CALENDAR_PALETTE) expect(c.hex).toMatch(HEX);
  });

  it("n'a aucun doublon : deux libellés, deux couleurs", () => {
    const hex = CALENDAR_PALETTE.map((c) => c.hex.toLowerCase());
    expect(new Set(hex).size).toBe(hex.length);
  });

  it("commence par les quatre couleurs de TimeTree, validées par Thomas", () => {
    expect(CALENDAR_PALETTE.slice(0, 4).map((c) => c.label)).toEqual(["Rose", "Vert", "Violet", "Bleu"]);
  });
});

describe("le repli par hachage", () => {
  it("rend toujours une couleur de la palette, stable pour un même identifiant", () => {
    const id = "656dcf35-4859-4a70-9d20-990104813423";
    const c = fallbackOwnerColor(id);
    expect(CALENDAR_PALETTE.map((p) => p.hex)).toContain(c);
    expect(fallbackOwnerColor(id)).toBe(c);
  });
});

describe("le résolveur", () => {
  const THOMAS = "656dcf35-4859-4a70-9d20-990104813423";

  it("préfère la couleur choisie quand c'est un hex", () => {
    const r = makeOwnerColorResolver(new Map([[THOMAS, "#22C55E"]]));
    expect(r(THOMAS)).toBe("#22C55E");
  });

  it("retombe sur le repli si la valeur n'est pas un hex — jamais dans le CSS", () => {
    const r = makeOwnerColorResolver(new Map([[THOMAS, "var(--ls-teal)"]]));
    expect(r(THOMAS)).toBe(fallbackOwnerColor(THOMAS));
  });
});
