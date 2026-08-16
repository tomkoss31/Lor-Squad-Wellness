// =============================================================================
// Le lien « Ajouter à mon agenda ».
//
// Ce qu'on protège ici : l'heure. Le club vit à Paris, Google veut de l'UTC, et
// une erreur d'une heure sur un rendez-vous fait venir quelqu'un pour rien.
// =============================================================================

import { describe, expect, it } from "vitest";
import { horodatageGoogle, lienGoogleAgenda } from "../agendaLien";

describe("horodatage", () => {
  it("convertit l'heure de Paris en UTC (été : −2 h)", () => {
    expect(horodatageGoogle("2026-08-21T09:00:00+02:00")).toBe("20260821T070000Z");
  });

  it("gère l'hiver aussi (−1 h)", () => {
    expect(horodatageGoogle("2026-01-15T09:00:00+01:00")).toBe("20260115T080000Z");
  });

  it("refuse une date illisible plutôt que d'inventer un instant", () => {
    expect(horodatageGoogle("bientôt")).toBeNull();
  });
});

describe("le lien", () => {
  const rdv = { slotStart: "2026-08-21T09:00:00+02:00", slotEnd: "2026-08-21T10:00:00+02:00" };

  it("porte le bon créneau et le bon titre", () => {
    const url = lienGoogleAgenda(rdv, { titre: "RDV découverte — Claire" })!;
    const p = new URL(url).searchParams;
    expect(p.get("action")).toBe("TEMPLATE");
    expect(p.get("dates")).toBe("20260821T070000Z/20260821T080000Z");
    expect(p.get("text")).toBe("RDV découverte — Claire");
  });

  it("une heure par défaut quand la fin est inconnue", () => {
    const url = lienGoogleAgenda({ slotStart: rdv.slotStart }, { titre: "x" })!;
    expect(new URL(url).searchParams.get("dates")).toBe("20260821T070000Z/20260821T080000Z");
  });

  it("une fin AVANT le début ne produit pas un événement à l'envers", () => {
    const url = lienGoogleAgenda(
      { slotStart: rdv.slotStart, slotEnd: "2026-08-21T08:00:00+02:00" },
      { titre: "x" },
    )!;
    const [d1, d2] = new URL(url).searchParams.get("dates")!.split("/");
    expect(d2 > d1).toBe(true);
  });

  it("les accents et espaces du titre survivent à l'encodage", () => {
    const url = lienGoogleAgenda(rdv, { titre: "Bilan — Mylène Roux", lieu: "La Base, Verdun" })!;
    const p = new URL(url).searchParams;
    expect(p.get("text")).toBe("Bilan — Mylène Roux");
    expect(p.get("location")).toBe("La Base, Verdun");
  });

  it("pas de rendez-vous, ou date illisible → pas de bouton", () => {
    expect(lienGoogleAgenda(null, { titre: "x" })).toBeNull();
    expect(lienGoogleAgenda({ slotStart: "jeudi" }, { titre: "x" })).toBeNull();
  });
});
