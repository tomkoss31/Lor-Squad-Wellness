// Cas construits sur les doublons REELS mesures en base le 24/08.
import { describe, expect, it } from "vitest";
import { fusionnerGroupe, type FicheFusionnable } from "../fusionFiches";

// Les fiches reelles portent bien plus que le contrat minimal (bilan, funnel,
// rdv...) : le helper accepte donc n'importe quel champ annexe, comme en vrai.
type FicheTest = FicheFusionnable & Record<string, unknown>;

const base = (p: Record<string, unknown> = {}): FicheTest => ({
  table: "prospect_leads",
  status: "new",
  source: "site-club",
  createdAt: "2026-08-07T20:22:00.000Z",
  contactedAt: null,
  relanceDueAt: null,
  ownerUserId: null,
  ...p,
});

describe("fusionnerGroupe", () => {
  it("rend une fiche seule telle quelle", () => {
    const f = base();
    const r = fusionnerGroupe([f]);
    expect(r.vue).toBe(f);
    expect(r.autres).toHaveLength(0);
    expect(r.conflits).toHaveLength(0);
  });

  // ── LE CAS FLORIAN (mesure du 24/08) ────────────────────────────────────
  // Fiche club a 20:22, bilan en ligne a 20:23. Une minute d'ecart.
  it("LE CAS FLORIAN : le bilan gagne meme s'il etait arrive AVANT", () => {
    const club = base({
      table: "prospect_leads", createdAt: "2026-08-07T20:23:00.000Z", // le PLUS RECENT
      lastName: "D.", phone: "0656767578",
    });
    const bilan = base({
      table: "online_bilans", createdAt: "2026-08-07T20:22:00.000Z", // le plus ancien
      bilanObjectives: ["Perte de poids", "Sommeil", "Energie"], bilanMotivation: 7, bilanAge: 26,
    });
    const r = fusionnerGroupe([club, bilan]);
    // L'ancienne regle « la plus recente » aurait choisi la fiche club et
    // cache les 3 objectifs. La richesse les sauve.
    expect(r.maitre).toBe(bilan);
    expect(r.vue.bilanObjectives).toEqual(["Perte de poids", "Sommeil", "Energie"]);
    // …sans PERDRE ce que portait la fiche club :
    expect(r.vue.lastName).toBe("D.");
    expect(r.vue.phone).toBe("0656767578");
  });

  it("signale l'arrivee par deux portes, sans la masquer", () => {
    const r = fusionnerGroupe([
      base({ table: "prospect_leads" }),
      base({ table: "online_bilans", createdAt: "2026-08-08T10:00:00.000Z" }),
    ]);
    expect(r.conflits.some((c) => c.includes("deux portes") || c.includes("2 portes"))).toBe(true);
  });

  it("garde la PREMIERE arrivee comme date et comme source", () => {
    const r = fusionnerGroupe([
      base({ createdAt: "2026-08-16T10:19:00.000Z", source: "bilan-online" }),
      base({ createdAt: "2026-08-11T12:06:00.000Z", source: "site-club" }),
    ]);
    expect(r.vue.createdAt).toBe("2026-08-11T12:06:00.000Z");
    expect(r.vue.source).toBe("site-club"); // ce qui l'a fait venir
  });

  it("garde le dernier contact et la relance la PLUS PROCHE", () => {
    const r = fusionnerGroupe([
      base({ contactedAt: "2026-08-11T08:12:00.000Z", relanceDueAt: "2026-09-13T00:00:00.000Z" }),
      base({ createdAt: "2026-08-12T00:00:00.000Z", contactedAt: "2026-08-16T18:41:00.000Z", relanceDueAt: "2026-08-30T00:00:00.000Z" }),
    ]);
    expect(r.vue.contactedAt).toBe("2026-08-16T18:41:00.000Z"); // le plus recent
    expect(r.vue.relanceDueAt).toBe("2026-08-30T00:00:00.000Z"); // la plus urgente
  });

  it("LE CAS CLAIRE : 3 fiches aux statuts divergents => le plus avance gagne", () => {
    // Mesure du 24/08 : contacted / new / contacted en 4 minutes.
    const r = fusionnerGroupe([
      base({ status: "contacted", createdAt: "2026-08-16T10:15:52.000Z" }),
      base({ status: "new", createdAt: "2026-08-16T10:17:31.000Z" }),
      base({ status: "contacted", createdAt: "2026-08-16T10:19:54.000Z" }),
    ]);
    expect(r.vue.status).toBe("contacted");
    expect(r.autres).toHaveLength(2);
  });

  it("quelqu'un classe perdu qui revient redevient vivant", () => {
    const r = fusionnerGroupe([
      base({ status: "lost", createdAt: "2026-06-01T00:00:00.000Z" }),
      base({ status: "new", createdAt: "2026-08-20T00:00:00.000Z" }),
    ]);
    expect(r.vue.status).toBe("new");
  });

  it("« converti » l'emporte sur tout", () => {
    const r = fusionnerGroupe([
      base({ status: "converted" }),
      base({ status: "contacted", createdAt: "2026-08-20T00:00:00.000Z" }),
    ]);
    expect(r.vue.status).toBe("converted");
  });

  it("une seule fiche active suffit a garder la personne dans le flux", () => {
    const r = fusionnerGroupe([
      base({ dormant: true, enAttente: true }),
      base({ dormant: false, enAttente: false, createdAt: "2026-08-20T00:00:00.000Z" }),
    ]);
    expect(r.vue.dormant).toBe(false);
    expect(r.vue.enAttente).toBe(false);
  });

  it("n'est endormie que si TOUTES le sont", () => {
    const r = fusionnerGroupe([base({ dormant: true }), base({ dormant: true, createdAt: "2026-08-20T00:00:00.000Z" })]);
    expect(r.vue.dormant).toBe(true);
  });

  // ── L'ATTRIBUTION NE SE TRANCHE PAS EN SILENCE ──────────────────────────
  it("SIGNALE deux coachs differents au lieu de choisir sans le dire", () => {
    const r = fusionnerGroupe([
      base({ ownerUserId: "coach-thomas", bilanObjectives: ["Perte de poids"] }),
      base({ ownerUserId: "coach-melanie", createdAt: "2026-08-20T00:00:00.000Z" }),
    ]);
    expect(r.vue.ownerUserId).toBe("coach-thomas"); // celui du maitre
    expect(r.conflits.some((c) => c.includes("coachs"))).toBe(true);
  });

  it("recupere un coach quand le maitre n'en a pas", () => {
    const r = fusionnerGroupe([
      base({ ownerUserId: null, bilanObjectives: ["Perte de poids"] }),
      base({ ownerUserId: "coach-melanie", createdAt: "2026-08-20T00:00:00.000Z" }),
    ]);
    expect(r.vue.ownerUserId).toBe("coach-melanie");
  });

  it("ne perd JAMAIS les fiches absorbees", () => {
    const a = base({ createdAt: "2026-08-01T00:00:00.000Z" });
    const b = base({ createdAt: "2026-08-02T00:00:00.000Z" });
    const c = base({ createdAt: "2026-08-03T00:00:00.000Z", bilanObjectives: ["x"] });
    const r = fusionnerGroupe([a, b, c]);
    expect([r.maitre, ...r.autres]).toHaveLength(3);
    expect(r.autres).toEqual([a, b]); // dans l'ordre d'arrivee
  });

  // ── LE CAS JUSTINE (mesure du 10/09) ─────────────────────────────────────
  // Elle repond a un SMS de relance en revenant sur le site et en laissant ses
  // disponibilites. Ca cree une 2e fiche, PAUVRE : un prenom, un numero. Sa
  // fiche maitre Meta porte deja la note automatique de l'import, donc elle est
  // plus RICHE. `notes` etait resolu par `premiere()` : sa reponse etait JETEE
  // ici, avant d'atteindre le moindre ecran. Le lendemain, un rappel
  // « deuxieme SMS sans reponse -> APPEL » etait pose sur elle.
  it("LE CAS JUSTINE : la note de la fiche PAUVRE n'est plus jetee", () => {
    const maitre = base({
      createdAt: "2026-09-03T07:10:00.000Z",
      lastName: "Santos", email: "j@ex.fr", phone: "0763920109", city: "Verdun",
      notes: "Lead formulaire Meta recu le 03/09.",
    });
    const doublon = base({
      createdAt: "2026-09-08T09:17:00.000Z",
      phone: "0763920109",
      notes: "Dispos indiquees : Apres 16h du lundi au mercredi",
    });
    const r = fusionnerGroupe([maitre, doublon]);
    // Le maitre reste le plus riche — ca, c'etait deja juste.
    expect(r.maitre).toBe(maitre);
    // Mais sa disponibilite SURVIT desormais a la fusion.
    expect(String(r.vue.notes)).toContain("Apres 16h");
    expect(String(r.vue.notes)).toContain("Lead formulaire Meta");
  });

  it("les notes se rejoignent dans l'ordre du TEMPS, pas de la richesse", () => {
    const ancienne = base({ createdAt: "2026-09-01T10:00:00.000Z", notes: "A", email: "x@y.fr", city: "Verdun" });
    const recente = base({ createdAt: "2026-09-05T10:00:00.000Z", notes: "B" });
    expect(String(fusionnerGroupe([ancienne, recente]).vue.notes)).toBe("A | B");
  });

  it("deux fiches portant la MEME note automatique n'en font qu'une", () => {
    const a = base({ createdAt: "2026-09-01T10:00:00.000Z", notes: "Lead formulaire Meta", email: "x@y.fr" });
    const b = base({ createdAt: "2026-09-02T10:00:00.000Z", notes: "Lead formulaire Meta" });
    expect(String(fusionnerGroupe([a, b]).vue.notes)).toBe("Lead formulaire Meta");
  });

  it("un groupe sans aucune note ne fabrique pas de note vide", () => {
    const a = base({ createdAt: "2026-09-01T10:00:00.000Z", email: "x@y.fr" });
    const b = base({ createdAt: "2026-09-02T10:00:00.000Z" });
    expect(fusionnerGroupe([a, b]).vue.notes).toBeUndefined();
  });

});
