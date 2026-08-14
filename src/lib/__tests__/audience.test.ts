// =============================================================================
// La liste des chemins existe en DEUX exemplaires (le front et l'edge Deno,
// qui ne peuvent pas s'importer). Le catalogue PV a déjà coûté cher pour cette
// raison exacte : deux copies, une seule mise à jour, et des chiffres faux
// pendant des mois sans que rien ne casse.
//
// Ce fichier lit les deux sources et refuse qu'elles divergent.
// =============================================================================

import { describe, expect, it } from "vitest";
// `?raw` de Vite : on lit le SOURCE de l'edge comme du texte, sans jamais
// l'exécuter (c'est du Deno, il ne tournerait pas ici) et sans dépendre de
// `node:fs`, absent des types du front.
import edgeSource from "../../../supabase/functions/audience-collect/index.ts?raw";
import { CHEMINS, motifDe, coachDe } from "../audience";

describe("les deux listes de chemins", () => {
  it("sont identiques entre le front et l'edge", () => {
    const bloc = edgeSource.match(/export const CHEMINS = \[([\s\S]*?)\] as const;/);
    expect(bloc, "bloc CHEMINS introuvable dans l'edge").toBeTruthy();
    const cheminsEdge = [...bloc![1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);

    // Message explicite : celui qui casse ce test doit savoir quoi recopier.
    const manquantsEdge = CHEMINS.filter((c) => !cheminsEdge.includes(c));
    const manquantsFront = cheminsEdge.filter((c) => !CHEMINS.includes(c as never));
    expect(manquantsEdge, "présents dans le front, absents de l'edge").toEqual([]);
    expect(manquantsFront, "présents dans l'edge, absents du front").toEqual([]);
    expect(cheminsEdge.length).toBe(CHEMINS.length);
  });
});

describe("les tunnels connus de l'edge", () => {
  it("sont exactement ceux que les pages instrumentent", () => {
    // Une page qui pose un tunnel absent de cette liste serait jetee EN
    // SILENCE par l'edge : l'entonnoir resterait vide sans explication.
    const bloc = edgeSource.match(/const TUNNELS = \[([^\]]*)\]/);
    expect(bloc, "bloc TUNNELS introuvable dans l'edge").toBeTruthy();
    const tunnelsEdge = [...bloc![1].matchAll(/"([^"]+)"/g)].map((m) => m[1]).sort();
    expect(tunnelsEdge).toEqual(
      ["bilan-en-ligne", "colis", "rejoindre-equipe", "reserver-club"],
    );
  });
});

describe("motifDe", () => {
  it("range une page publique sous son motif", () => {
    expect(motifDe("/club/le-rituel")).toBe("/club/le-rituel");
    expect(motifDe("/bilan-online")).toBe("/bilan-online");
  });

  it("remplace le segment variable — sinon une ligne par coach ET par jour", () => {
    expect(motifDe("/bilan-online/thomas/formulaire")).toBe("/bilan-online/:coach/formulaire");
    expect(motifDe("/coach/melanie")).toBe("/coach/:coach");
    expect(motifDe("/resultat-bilan/8f3a-....")).toBe("/resultat-bilan/:token");
  });

  it("ignore la query et l'ancre", () => {
    expect(motifDe("/club?utm_source=insta")).toBe("/club");
    expect(motifDe("/club#tarifs")).toBe("/club");
  });

  it("tolère la barre finale", () => {
    expect(motifDe("/club/")).toBe("/club");
    expect(motifDe("/")).toBe("/");
  });

  it("ne mesure RIEN hors des pages publiques", () => {
    // L'app coach n'est pas concernée : ni /crm, ni /clients, ni une URL
    // inventée. C'est ce qui borne le nombre de lignes possibles en base.
    for (const p of ["/crm", "/clients/42", "/copilote", "/parametres", "/n-importe-quoi"]) {
      expect(motifDe(p), p).toBeNull();
    }
  });

  it("ne confond pas deux chemins de longueurs différentes", () => {
    expect(motifDe("/club/rejoindre/rdv")).toBe("/club/rejoindre/rdv");
    expect(motifDe("/club/rejoindre/rdv/thomas")).toBe("/club/rejoindre/rdv/:coach");
  });
});

describe("coachDe", () => {
  it("extrait le slug quand le chemin en porte un", () => {
    expect(coachDe("/bilan-online/thomas/formulaire")).toBe("thomas");
    expect(coachDe("/boutique/melanie/infos")).toBe("melanie");
    expect(coachDe("/coach/thomas")).toBe("thomas");
  });

  it("rend null sur une page sans coach", () => {
    expect(coachDe("/club")).toBeNull();
    expect(coachDe("/bilan-online")).toBeNull();
  });

  it("ne prend pas un token pour un coach", () => {
    // `/resultat-bilan/:token` n'a pas de segment :coach — attribuer ce
    // trafic à un « coach » nommé comme un uuid créerait des lignes fantômes.
    expect(coachDe("/resultat-bilan/8f3a-1234")).toBeNull();
    expect(coachDe("/qualif/abcd")).toBeNull();
  });

  it("rend null hors des pages publiques", () => {
    expect(coachDe("/crm")).toBeNull();
  });
});
