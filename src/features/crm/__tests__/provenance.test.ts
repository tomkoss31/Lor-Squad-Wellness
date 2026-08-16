// =============================================================================
// « D'où vient cette personne » — ce qu'on écrit sur sa fiche.
//
// Le piège à éviter est une phrase qui ment : « Réseaux de Mandy » laisserait
// croire que Mandy tient le compte Instagram du club. Seuls un flyer et une
// conversation ont quelqu'un derrière.
// =============================================================================

import { describe, expect, it } from "vitest";
import { PROVENANCE_META, prenomProvenance, provenanceTexte } from "../../../hooks/useCrmLeads";
import {
  PROVENANCE_CANAUX,
  PROVENANCE_CANAUX_TUNNEL,
  provenanceDesigneQuelquun,
} from "../../../types/domain";

// Le SQL des migrations, lu tel quel. Import `?raw` et non `node:fs` : les
// types de Node sont absents du tsconfig du front, donc `readFileSync`
// compilerait sous vitest mais casserait `npm run build` (même motif que
// src/data/__tests__/clubOuverture.test.ts).
const MIGRATIONS = import.meta.glob("../../../../supabase/migrations/*.sql", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

/**
 * Le vocabulaire fermé de la RPC, lu dans la DERNIÈRE migration qui définit
 * `noter_provenance_lead`. On prend la plus récente et pas un fichier nommé en
 * dur : le jour où quelqu'un redéfinit la fonction, c'est sa version qui fait
 * foi, et ce test doit la suivre tout seul.
 */
function vocabulaireDeLaRpc(): string[] {
  const definitions = Object.keys(MIGRATIONS)
    .filter((chemin) => /create\s+or\s+replace\s+function\s+public\.noter_provenance_lead/i.test(MIGRATIONS[chemin]))
    .sort();
  const derniere = definitions[definitions.length - 1];
  expect(derniere, "aucune migration ne définit noter_provenance_lead").toBeTruthy();
  // La garde du canal : `if p_canal is null or p_canal not in ('a', 'b', …)`.
  const trouve = MIGRATIONS[derniere].match(/p_canal\s+not\s+in\s*\(([^)]*)\)/i);
  expect(trouve, `garde du vocabulaire introuvable dans ${derniere}`).not.toBeNull();
  return [...(trouve?.[1] ?? "").matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
}

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

describe("le prénom cité", () => {
  // Le 16/08, un prénom écrit à la main s'affichait « · hors équipe », en rouge.
  // Depuis que le tunnel ne propose plus de liste de coachs (17/08), c'est le
  // cas de TOUS les prénoms venus de /reserver : la marque ne distinguait plus
  // rien, et affirmait du prénom de Mélanie qu'il ne correspondait à aucun
  // compte — alors qu'elle est l'une des deux personnes qui distribuent les
  // flyers. Ces tests figent ce qui reste : une seule chose à l'écran.
  it("s'affiche pareil, qu'il vienne d'un compte ou d'une case à écrire", () => {
    expect(provenanceTexte("flyer", prenomProvenance("Mélanie", null))).toBe("📬 Flyer de Mélanie");
    expect(provenanceTexte("flyer", prenomProvenance(null, "Mélanie"))).toBe("📬 Flyer de Mélanie");
  });

  it("le compte d'équipe l'emporte — la RPC efface déjà l'autre", () => {
    expect(prenomProvenance("Mélanie", "mélaniee")).toBe("Mélanie");
  });

  it("une case laissée vide ne fabrique pas de prénom", () => {
    expect(prenomProvenance(null, "   ")).toBeNull();
    expect(prenomProvenance(undefined, undefined)).toBeNull();
    expect(provenanceTexte("flyer", prenomProvenance(null, ""))).toBe("📬 Flyer");
  });

  it("aux réseaux, le prénom reste ignoré même écrit à la main", () => {
    // Sinon « 📱 Réseaux de Camille » laisserait croire que Camille tient le
    // compte Instagram du club — le piège que ce fichier existe pour tenir.
    expect(provenanceTexte("reseaux", prenomProvenance(null, "Camille"))).toBe("📱 Réseaux");
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

// =============================================================================
// LE RISQUE N°1 DE CE CHANTIER : quatre endroits posent ou relisent la même
// question — le tunnel /reserver, la fiche BBC, le bilan classique, le CRM —
// et un cinquième la stocke, la RPC. Deux vocabulaires qui divergent, ce sont
// deux comptages qui ne se recoupent JAMAIS, et rien à l'écran pour le dire.
//
// Le code ne recopie plus la liste (tout dérive de src/types/domain.ts), mais
// le SQL, lui, ne peut pas importer le TypeScript. Ces tests-là sont la seule
// couture entre les deux.
// =============================================================================
describe("une seule liste de canaux, partout", () => {
  it("le CRM lit exactement les canaux que le tunnel propose", () => {
    expect([...PROVENANCE_CANAUX_TUNNEL].sort()).toEqual(Object.keys(PROVENANCE_META).sort());
  });

  it("la RPC accepte exactement ces mêmes canaux (SQL lu dans la migration)", () => {
    // Le seul test qui traverse la frontière TS ↔ SQL. Sans lui, ajouter un
    // canal côté écran le ferait rejeter en base par « canal_invalide » — et le
    // tunnel avale ses échecs en silence, donc personne ne le verrait.
    expect(vocabulaireDeLaRpc().sort()).toEqual([...PROVENANCE_CANAUX_TUNNEL].sort());
  });

  it("les bilans ajoutent « en passant », et rien d'autre", () => {
    // Le présentiel a un cas de plus : on ne passe pas devant un site web.
    const bilans = PROVENANCE_CANAUX.map((c) => c.valeur);
    expect(bilans.filter((v) => !PROVENANCE_CANAUX_TUNNEL.includes(v as never))).toEqual(["passage"]);
    for (const canal of PROVENANCE_CANAUX_TUNNEL) expect(bilans).toContain(canal);
  });

  it("« en passant » ne doit jamais partir au tunnel : la RPC le refuserait", () => {
    expect(vocabulaireDeLaRpc()).not.toContain("passage");
    expect(PROVENANCE_CANAUX_TUNNEL).not.toContain("passage" as never);
  });

  it("chaque canal des bilans a un libellé, emoji compris", () => {
    for (const c of PROVENANCE_CANAUX) {
      expect(c.label.length, c.valeur).toBeGreaterThan(3);
      expect(c.label, c.valeur).toMatch(/^\P{ASCII}/u);
    }
  });
});

describe("qui a quelqu'un derrière", () => {
  // Règle recopiée à trois endroits avant ce recollage (tunnel, CRM, RPC).
  // Elle vit maintenant dans domain.ts ; ce test la fige.
  it("un flyer et une conversation, oui — les réseaux, non", () => {
    expect(provenanceDesigneQuelquun("flyer")).toBe(true);
    expect(provenanceDesigneQuelquun("parle")).toBe(true);
    expect(provenanceDesigneQuelquun("reseaux")).toBe(false);
    expect(provenanceDesigneQuelquun("autre")).toBe(false);
    expect(provenanceDesigneQuelquun("passage")).toBe(false);
    expect(provenanceDesigneQuelquun(null)).toBe(false);
    expect(provenanceDesigneQuelquun(undefined)).toBe(false);
  });

  it("dit la même chose que la RPC, qui efface le prénom ailleurs", () => {
    const definitions = Object.keys(MIGRATIONS)
      .filter((c) => /create\s+or\s+replace\s+function\s+public\.noter_provenance_lead/i.test(MIGRATIONS[c]))
      .sort();
    const sql = MIGRATIONS[definitions[definitions.length - 1]];
    // `provenance_user_id = case when p_canal in ('flyer', 'parle') then …`
    const trouve = sql.match(/p_canal\s+in\s*\(([^)]*)\)/i);
    expect(trouve, "la règle du prénom est introuvable dans le SQL").not.toBeNull();
    const designent = [...(trouve?.[1] ?? "").matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
    expect(designent.sort()).toEqual(
      [...PROVENANCE_CANAUX_TUNNEL].filter(provenanceDesigneQuelquun).sort(),
    );
  });
});
