// =============================================================================
// « D'où vient cette personne » — ce qu'on écrit sur sa fiche.
//
// Le piège à éviter est une phrase qui ment : « Réseaux de Mandy » laisserait
// croire que Mandy tient le compte Instagram du club. Seuls un flyer et une
// conversation ont quelqu'un derrière.
// =============================================================================

import { describe, expect, it } from "vitest";
import { PROVENANCE_META, provenanceTexte } from "../../../hooks/useCrmLeads";

describe("le libellé de provenance", () => {
  it("nomme la personne quand elle a distribué le flyer", () => {
    expect(provenanceTexte("flyer", "Mandy")).toBe("📬 Flyer de Mandy");
  });

  it("la nomme aussi pour le bouche-à-oreille", () => {
    expect(provenanceTexte("parle", "Mélanie")).toBe("💬 Bouche-à-oreille de Mélanie");
  });

  it("ne rattache PERSONNE aux réseaux — personne ne distribue Instagram", () => {
    expect(provenanceTexte("reseaux", "Mandy")).toBe("📱 Réseaux");
    expect(provenanceTexte("autre", "Mandy")).toBe("✨ Autrement");
  });

  it("sans prénom connu, il reste le canal", () => {
    expect(provenanceTexte("flyer", null)).toBe("📬 Flyer");
    expect(provenanceTexte("parle", undefined)).toBe("💬 Bouche-à-oreille");
  });

  it("pas de réponse → rien à afficher, surtout pas un tiret", () => {
    expect(provenanceTexte(null, "Mandy")).toBeNull();
    expect(provenanceTexte(undefined, null)).toBeNull();
  });

  it("une valeur inconnue ne fabrique pas de phrase bancale", () => {
    // La RPC refuse déjà tout ce qui sort du vocabulaire, mais une vieille
    // ligne ou une écriture manuelle ne doit pas rendre « undefined de Mandy ».
    expect(provenanceTexte("pigeon" as never, "Mandy")).toBeNull();
  });
});

describe("le vocabulaire", () => {
  it("les quatre canaux, et seulement eux", () => {
    // Même liste que le CHECK implicite de la RPC noter_provenance_lead : si
    // l'un des deux bouge sans l'autre, les compteurs se trompent en silence.
    expect(Object.keys(PROVENANCE_META).sort()).toEqual(["autre", "flyer", "parle", "reseaux"]);
  });

  it("chaque canal a un emoji et un libellé lisible", () => {
    for (const [cle, m] of Object.entries(PROVENANCE_META)) {
      expect(m.emoji, cle).toBeTruthy();
      expect(m.label.length, cle).toBeGreaterThan(2);
    }
  });
});
