import { describe, expect, it } from "vitest";
import { GO_PRO_STEPS, choisirEtapeActive, retientLeFil } from "../goProSteps";
import { ACADEMY_LESSONS } from "../academyLessons";

// =============================================================================
// Le choix de l'étape en cours — chantier du 12/08/2026.
//
// CE QUE CES TESTS PROTÈGENT
//
// L'étape en cours était « la première non cochée ». Mesuré en base sur les
// 12 coachs vivants : DIX sur onze figés à l'étape 1, dont Maria et ses
// 41 bilans. La cause : l'étape 1 se coche à la main (« commande 250 PV » sur
// myHerbalife), l'app ne peut pas le constater, personne n'y pense — et une
// case jamais cochée gèle le fil pour toujours.
//
// Les profils ci-dessous sont les VRAIS relevés du 12/08. Si quelqu'un remet
// une porte déclarative en travers du chemin, ces tests tombent.
// =============================================================================

/** La règle de mesurabilité, telle que le hook l'applique — repli compris. */
const estMesurable = (gate: string, lessonKey?: string) => {
  const lecon = ACADEMY_LESSONS[gate] ?? (lessonKey ? ACADEMY_LESSONS[lessonKey] : undefined);
  return Boolean(lecon?.autoOnly) || Boolean(lecon?.proofCounter);
};

/** Fabrique un « qui a coché quoi » à partir de la liste des portes franchies. */
const profil = (...portesFaites: string[]) => (gate: string) => portesFaites.includes(gate);

/** Le libellé de l'étape mise en avant — plus lisible qu'un index dans un échec. */
const etapeMiseEnAvant = (estFaite: (g: string) => boolean) =>
  GO_PRO_STEPS[choisirEtapeActive(estFaite, estMesurable)].label;

describe("ce que l'app sait constater", () => {
  it("le 1er bilan et le 1er pack sont mesurables — le serveur les détecte", () => {
    expect(estMesurable("premier_bilan")).toBe(true);
    expect(estMesurable("premier_pv_pack")).toBe(true);
  });

  it("les 250 PV, la Liste 100, la story et le HOM ne le sont PAS", () => {
    // Un lien vers myHerbalife, une liste papier, une story Instagram, une
    // réunion physique : rien de tout ça n'atteint la base.
    expect(estMesurable("commande_250pv")).toBe(false);
    expect(estMesurable("liste_50")).toBe(false);
    expect(estMesurable("premiere_story")).toBe(false);
    expect(estMesurable("premier_hom")).toBe(false);
  });

  it("« Relancer » se termine grâce à son compteur de 3 gestes", () => {
    // Sa PORTE s'appelle `relances_3`, sa LEÇON s'appelle `relancer` : il faut
    // le repli pour la reconnaître. Sans lui, l'étape serait sautée.
    expect(estMesurable("relances_3")).toBe(false);
    expect(estMesurable("relances_3", "relancer")).toBe(true);
  });
});

describe("aucune case invérifiable ne retient le fil", () => {
  it("S'équiper, Trouver et Inviter ne bloquent jamais", () => {
    const rien = profil();
    ["sequiper", "trouver", "inviter"].forEach((cle) => {
      const etape = GO_PRO_STEPS.find((s) => s.key === cle)!;
      expect(retientLeFil(etape, rien, estMesurable)).toBe(false);
    });
  });

  it("Présenter bloque tant que le bilan ou le pack manque", () => {
    const presenter = GO_PRO_STEPS.find((s) => s.key === "presenter")!;
    expect(retientLeFil(presenter, profil(), estMesurable)).toBe(true);
    expect(retientLeFil(presenter, profil("premier_bilan"), estMesurable)).toBe(true);
    expect(retientLeFil(presenter, profil("premier_bilan", "premier_pv_pack"), estMesurable)).toBe(false);
  });

  it("le HOM manquant n'empêche PAS Présenter d'être acquise", () => {
    // Le piège corrigé par Thomas le 04/08 sur l'activation, appliqué ici.
    const presenter = GO_PRO_STEPS.find((s) => s.key === "presenter")!;
    expect(retientLeFil(presenter, profil("premier_bilan", "premier_pv_pack"), estMesurable)).toBe(false);
  });
});

describe("les vrais coachs, relevés le 12/08/2026", () => {
  it("Charlène, Sohyer, Vivien — aucune porte : on vise le 1er bilan", () => {
    expect(etapeMiseEnAvant(profil())).toBe("Présenter");
  });

  it("Maria (41 bilans), Mandy (27), Alexis, Manon, ZANARDI — on vise le 1er pack", () => {
    // AVANT ce chantier : toutes ces personnes voyaient « Étape 1 · S'équiper ».
    const elles = profil("premier_bilan");
    expect(etapeMiseEnAvant(elles)).toBe("Présenter");
    expect(etapeMiseEnAvant(elles)).not.toBe("S'équiper");
  });

  it("Victoria (bilan + pack) — on passe à Relancer", () => {
    expect(etapeMiseEnAvant(profil("premier_bilan", "premier_pv_pack"))).toBe("Relancer");
  });

  it("Judith (tout sauf HOM et relances) — on passe à Relancer aussi", () => {
    const judith = profil("commande_250pv", "liste_50", "premiere_story", "premier_bilan", "premier_pv_pack");
    expect(etapeMiseEnAvant(judith)).toBe("Relancer");
  });

  it("Thomas et Mélanie (tout fait) — on se pose sur Démarrer ta recrue", () => {
    const tout = profil(
      "commande_250pv", "liste_50", "premiere_story",
      "premier_bilan", "premier_hom", "premier_pv_pack", "relances_3",
    );
    expect(etapeMiseEnAvant(tout)).toBe("Démarrer ta recrue");
  });

  it("PERSONNE ne reste bloqué sur « S'équiper » dès qu'un bilan existe", () => {
    // Le cœur du chantier, en une phrase : faire un bilan suffit à avancer.
    expect(etapeMiseEnAvant(profil("premier_bilan"))).not.toBe("S'équiper");
  });

  it("et même sans aucun bilan, on ne voit jamais « S'équiper »", () => {
    // Un débutant doit viser son 1er bilan, pas une commande sur un autre site.
    expect(etapeMiseEnAvant(profil())).not.toBe("S'équiper");
  });
});
