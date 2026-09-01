// =============================================================================
// Le filet du 21/08. Il a déjà été retiré une fois par accident — pas deux.
// =============================================================================

import { describe, it, expect } from "vitest";
import { confirmationsRatees, estUnEmail, type RdvConfirmable } from "../confirmationRatee";

const MAINTENANT = new Date("2026-09-01T09:00:00Z");
const DEMAIN = "2026-09-02T08:00:00Z";
const HIER = "2026-08-31T08:00:00Z";

const rdv = (p: Partial<RdvConfirmable>): RdvConfirmable => ({
  id: "b1",
  first_name: "Ghislaine",
  last_name: "M.",
  contact: "ghislaine@example.com",
  slot_start: DEMAIN,
  status: "confirmed",
  confirm_email_sent_at: null,
  ...p,
});

describe("qui n'a pas eu son mail", () => {
  it("le cas Ghislaine : rendez-vous confirmé, mail jamais parti", () => {
    const r = confirmationsRatees([rdv({})], MAINTENANT);
    expect(r).toHaveLength(1);
    expect(r[0].nom).toBe("Ghislaine M.");
    expect(r[0].email).toBe("ghislaine@example.com");
  });

  it("le mail est parti → aucune alerte", () => {
    expect(confirmationsRatees([rdv({ confirm_email_sent_at: "2026-08-31T10:00:00Z" })], MAINTENANT)).toHaveLength(0);
  });

  it("venue avec un NUMÉRO → aucune alerte, elle n'attendait pas de mail", () => {
    expect(confirmationsRatees([rdv({ contact: "0612345678" })], MAINTENANT)).toHaveLength(0);
  });

  it("aucun contact du tout → rien à annoncer", () => {
    expect(confirmationsRatees([rdv({ contact: null })], MAINTENANT)).toHaveLength(0);
  });

  it("demande pas encore acceptée → il n'y a pas de confirmation à envoyer", () => {
    expect(confirmationsRatees([rdv({ status: "requested" })], MAINTENANT)).toHaveLength(0);
  });

  it("rendez-vous annulé → on ne prévient plus personne", () => {
    expect(confirmationsRatees([rdv({ status: "canceled" })], MAINTENANT)).toHaveLength(0);
  });

  it("rendez-vous déjà passé → prévenir de l'horaire n'a plus d'objet", () => {
    expect(confirmationsRatees([rdv({ slot_start: HIER })], MAINTENANT)).toHaveLength(0);
  });

  it("les plus proches en premier", () => {
    const r = confirmationsRatees(
      [rdv({ id: "tard", slot_start: "2026-09-10T08:00:00Z" }), rdv({ id: "tot", slot_start: DEMAIN })],
      MAINTENANT,
    );
    expect(r.map((x) => x.id)).toEqual(["tot", "tard"]);
  });

  it("un créneau illisible ne fait pas planter la liste", () => {
    expect(confirmationsRatees([rdv({ slot_start: "n'importe quoi" })], MAINTENANT)).toHaveLength(0);
  });
});

describe("ce qui compte comme une adresse", () => {
  it.each([
    ["marie@labase360.fr", true],
    ["0612345678", false],
    ["marie@", false],
    ["marie labase.fr", false],
    ["  marie@labase360.fr  ", true],
    [null, false],
  ])("%s → %s", (contact, attendu) => {
    expect(estUnEmail(contact as string | null)).toBe(attendu);
  });
});
