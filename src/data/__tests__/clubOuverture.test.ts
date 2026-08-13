import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CLUB_OUVERTURE, clubEstOuvert, mentionOuverture } from "../clubOuverture";

describe("date d'ouverture du club", () => {
  // La duplication vers api/og/club.ts est imposée : les fonctions Vercel ne
  // peuvent pas importer le front. Une duplication qui ne repose que sur la
  // vigilance finit toujours par diverger — c'est exactement ce qui est arrivé
  // au catalogue PV. Ce test la surveille à notre place.
  it("est la même dans la bannière de partage (api/og/club.ts)", () => {
    const source = readFileSync(resolve(__dirname, "../../../api/og/club.ts"), "utf8");
    const trouve = source.match(/CLUB_OUVERTURE\s*=\s*"([\d-]+)"/);
    expect(trouve, "CLUB_OUVERTURE introuvable dans api/og/club.ts").not.toBeNull();
    expect(trouve?.[1]).toBe(CLUB_OUVERTURE);
  });

  // Le piège du fuseau : comparer des objets Date aurait fait basculer
  // l'affichage à 2 h du matin pour un visiteur français, l'été. On compare des
  // dates de Paris, écrites en AAAA-MM-JJ.
  it("bascule à minuit heure de Paris, pas à minuit UTC", () => {
    // 6 septembre 21h30 UTC = 23h30 à Verdun : encore la veille.
    expect(clubEstOuvert(new Date("2026-09-06T21:30:00Z"))).toBe(false);
    // 6 septembre 23h00 UTC = 1h du matin le 7 à Verdun : c'est ouvert.
    expect(clubEstOuvert(new Date("2026-09-06T23:00:00Z"))).toBe(true);
  });

  it("annonce une date avant, les horaires après", () => {
    expect(mentionOuverture(new Date("2026-08-13T20:00:00Z"))).toBe("ouverture le 7 septembre");
    expect(mentionOuverture(new Date("2026-09-07T05:00:00Z"))).toBe("ouvert dès 7h");
    expect(mentionOuverture(new Date("2026-12-01T10:00:00Z"))).toBe("ouvert dès 7h");
  });
});
