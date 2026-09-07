// =============================================================================
// Garde-fou visuel du BBC — pas du design : du lisible et du cliquable.
//
// POURQUOI IL EXISTE. Audit du 07/09, mesuré dans /atelier-bbc sur les 20
// écrans à 375 px : 21 cibles tactiles sous 44 px dans Réglages, 21 textes sous
// 11 px dans Rentabilité, 11 dans le Bilan des 10. Tout ça vivait en production
// depuis des mois, avec un build vert à chaque livraison. C'est exactement la
// raison d'être de l'atelier — sauf que l'atelier demande un œil humain, donc
// il ne protège que quand on y pense.
//
// LES DEUX SEUILS, ET D'OÙ ILS VIENNENT
//   • 44 px pour une cible cliquable : le minimum tenable au doigt. En dessous,
//     le taux d'erreur devient réel — et le BBC s'utilise debout, à une main,
//     sur la tablette du comptoir. Un tap raté dans Réglages ouvre ou ferme un
//     créneau par erreur.
//   • 11 px pour du texte : en dessous, on ne lit plus en diagonale. Or c'est
//     ainsi qu'on lit un écran de chiffres pendant un rendez-vous, parfois
//     face au membre.
//
// ⚠️ CE TEST NE DEMANDE PAS DE TOUT CORRIGER. Il restait 99 textes sous 11 px
// et 5 cibles trop petites au moment de l'écrire. Les corriger d'un coup serait
// un chamboulement visuel que personne n'a validé. Le test GÈLE donc l'existant
// et interdit d'empirer : un fichier ne peut pas dépasser son budget, et un
// fichier absent de la liste doit rester à ZÉRO.
//
// QUAND IL ÉCHOUE, deux réponses — et une seule est bonne par défaut :
//   1. corriger la taille (c'est presque toujours ça) ;
//   2. si la valeur est vraiment justifiée, augmenter le budget du fichier ICI
//      en disant pourquoi dans le message de commit. Jamais en silence.
//
// Les trois fichiers nettoyés le 07/09 n'ont pas d'entrée : ils sont à zéro et
// un test dédié les y maintient.
// =============================================================================

import { describe, expect, it } from "vitest";

/**
 * Les sources des écrans BBC, lues par Vite — PAS par `node:fs`.
 *
 * `tsc -b` type-vérifie ce fichier avec la config de l'application, qui ne
 * connaît pas les types Node : `readFileSync` y casse le build alors que les
 * tests passent. `import.meta.glob` est natif à Vite, donc valable dans les
 * deux mondes.
 */
const SOURCES = import.meta.glob("../**/*.tsx", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

/** Le chemin tel qu'on l'écrit dans le budget, depuis celui que rend Vite. */
function cheminNormalise(cle: string): string {
  return `src/features/bbc/${cle.replace(/^\.\.\//, "")}`;
}

/** Le budget toléré par fichier. Ne JAMAIS l'augmenter sans le justifier. */
const BUDGET: Record<string, { micro: number; petits: number }> = {
  "src/features/bbc/BbcApp.tsx": { micro: 3, petits: 0 },
  "src/features/bbc/BbcBilan10.tsx": { micro: 3, petits: 0 },
  "src/features/bbc/BbcClientApp.tsx": { micro: 10, petits: 0 },
  "src/features/bbc/BbcCobayeSheet.tsx": { micro: 1, petits: 0 },
  "src/features/bbc/BbcMemberEntry.tsx": { micro: 3, petits: 0 },
  "src/features/bbc/BbcModeSwitch.tsx": { micro: 0, petits: 1 },
  "src/features/bbc/BbcNewMemberButton.tsx": { micro: 1, petits: 0 },
  "src/features/bbc/BbcNewMemberSheet.tsx": { micro: 18, petits: 0 },
  "src/features/bbc/BbcPeseeSheet.tsx": { micro: 1, petits: 0 },
  "src/features/bbc/BbcScanner.tsx": { micro: 0, petits: 1 },
  "src/features/bbc/atelier/AtelierBbcPage.tsx": { micro: 1, petits: 0 },
  "src/features/bbc/member/MemberCoeurs.tsx": { micro: 4, petits: 0 },
  "src/features/bbc/member/MemberConseils.tsx": { micro: 3, petits: 0 },
  "src/features/bbc/member/MemberEvolution.tsx": { micro: 3, petits: 1 },
  "src/features/bbc/member/MemberMensurations.tsx": { micro: 5, petits: 0 },
  "src/features/bbc/member/MemberMessages.tsx": { micro: 3, petits: 0 },
  "src/features/bbc/views/BbcAppels.tsx": { micro: 2, petits: 0 },
  "src/features/bbc/views/BbcClub.tsx": { micro: 1, petits: 0 },
  "src/features/bbc/views/BbcCoeurs.tsx": { micro: 1, petits: 0 },
  "src/features/bbc/views/BbcCrm.tsx": { micro: 3, petits: 0 },
  "src/features/bbc/views/BbcFormation.tsx": { micro: 9, petits: 0 },
  "src/features/bbc/views/BbcLexique.tsx": { micro: 2, petits: 0 },
  "src/features/bbc/views/BbcLiens.tsx": { micro: 1, petits: 0 },
  "src/features/bbc/views/BbcMemberCorps.tsx": { micro: 4, petits: 0 },
  "src/features/bbc/views/BbcMessages.tsx": { micro: 5, petits: 0 },
  "src/features/bbc/views/BbcPrelancement.tsx": { micro: 4, petits: 0 },
  "src/features/bbc/views/BbcScripts.tsx": { micro: 1, petits: 0 },
  "src/features/bbc/views/BbcSemaine.tsx": { micro: 6, petits: 2 },
  "src/features/bbc/views/BbcSupprimerMembre.tsx": { micro: 1, petits: 0 },
};

/** Les trois écrans remis à zéro le 07/09. Ils doivent y rester. */
const DEJA_PROPRES = [
  "src/features/bbc/views/BbcReglages.tsx",
  "src/features/bbc/views/BbcClub100.tsx",
  "src/features/bbc/BbcBilan10Scan.tsx",
];

/**
 * Compte les manquements d'un fichier.
 *
 * On lit les objets `style={{ … }}`, pas le DOM. Un test qui ouvrirait un
 * navigateur coûterait des minutes et une dépendance de 300 Mo pour attraper
 * les mêmes fautes : les deux classes de défaut trouvées le 07/09 se voient
 * toutes deux à la lecture.
 *
 * `minHeight` n'est compté que dans un bloc portant `cursor: "pointer"` —
 * c'est ce qui distingue une cible cliquable d'un simple encadré.
 */
function compter(source: string): { micro: number; petits: number } {
  let micro = 0;
  let petits = 0;
  const blocs = source.match(/style=\{\{[\s\S]*?\}\}/g) ?? [];
  for (const bloc of blocs) {
    for (const m of bloc.matchAll(/fontSize:\s*(\d+(?:\.\d+)?)/g)) {
      if (Number(m[1]) < 11) micro += 1;
    }
    if (bloc.includes('cursor: "pointer"')) {
      for (const m of bloc.matchAll(/minHeight:\s*(\d+)/g)) {
        if (Number(m[1]) < 44) petits += 1;
      }
    }
  }
  return { micro, petits };
}

describe("garde-fou visuel du BBC", () => {
  const fichiers = Object.entries(SOURCES).map(([cle, src]) => ({
    nom: cheminNormalise(cle),
    src,
  }));

  it("trouve bien les ecrans a analyser", () => {
    expect(fichiers.length).toBeGreaterThan(20);
  });

  it("aucun fichier ne depasse son budget de texte sous 11 px", () => {
    const depassements: string[] = [];
    for (const f of fichiers) {
      const { micro } = compter(f.src);
      const tolere = BUDGET[f.nom]?.micro ?? 0;
      if (micro > tolere) depassements.push(`${f.nom} : ${micro} au lieu de ${tolere} max`);
    }
    expect(depassements).toEqual([]);
  });

  it("aucun fichier ne depasse son budget de cibles sous 44 px", () => {
    const depassements: string[] = [];
    for (const f of fichiers) {
      const { petits } = compter(f.src);
      const tolere = BUDGET[f.nom]?.petits ?? 0;
      if (petits > tolere) depassements.push(`${f.nom} : ${petits} au lieu de ${tolere} max`);
    }
    expect(depassements).toEqual([]);
  });

  it("les trois ecrans nettoyes le 07/09 restent a zero", () => {
    for (const nom of DEJA_PROPRES) {
      expect(BUDGET[nom]).toBeUndefined();
      const f = fichiers.find((x) => x.nom === nom);
      expect(f, `${nom} introuvable`).toBeDefined();
      expect(compter(f!.src)).toEqual({ micro: 0, petits: 0 });
    }
  });
});
