import { describe, expect, it } from "vitest";
import { CLUB_TEL, CLUB_ADRESSE, HORAIRES, HORAIRES_PHRASE, HORAIRES_COURT } from "../clubInfos";

// On lit les fichiers du site via `?raw` — même motif que les autres tests du
// dépôt. `node:fs` compilerait sous vitest mais casserait `npm run build` :
// les types de Node sont absents du tsconfig du front.
const pagesClub = import.meta.glob("../../pages/club/*.tsx", { eager: true, query: "?raw", import: "default" }) as Record<string, string>;
const accueil = import.meta.glob("../../pages/ClubLandingPage.tsx", { eager: true, query: "?raw", import: "default" }) as Record<string, string>;
const TOUT = { ...pagesClub, ...accueil };

type Sujet = "tel" | "adresse" | "horaires";

/**
 * Les endroits où la valeur en dur est VOULUE, avec la raison.
 *
 * L'exception porte sur un COUPLE (fichier, sujet). La poser par FICHIER était
 * trop large : elle excusait au passage l'adresse recopiée dans la page RDV,
 * qui devait bien être rangée. Toute autre occurrence est une recopie, et ce
 * test la refuse.
 */
const EXCEPTIONS: Array<{ fichier: string; sujet: Sujet; pourquoi: string }> = [
  // Le numéro y sert d'exemple de format dans un champ « ton téléphone » :
  // ce n'est pas un affichage du club.
  { fichier: "ClubRejoindreRdvPage.tsx", sujet: "tel", pourquoi: "placeholder de formulaire" },
  // Ces deux-là décrivent ce qui est écrit sur l'enseigne de la devanture, pas
  // les horaires du club : y ajouter le samedi décrirait la photo inexactement.
  { fichier: "ClubLeClubPage.tsx", sujet: "horaires", pourquoi: "texte alternatif d'une photo" },
  { fichier: "ClubLeClubPage.tsx", sujet: "adresse", pourquoi: "texte alternatif d'une photo" },
];

function fichiersAvec(motif: RegExp, sujet: Sujet): string[] {
  const excuses = EXCEPTIONS.filter((e) => e.sujet === sujet).map((e) => e.fichier);
  return Object.entries(TOUT)
    .filter(([, source]) => motif.test(source))
    .map(([chemin]) => chemin.split("/").pop() as string)
    .filter((nom) => !excuses.includes(nom));
}

describe("les faits du club ne sont écrits qu'une fois", () => {
  // Relevé du 13/08 avant rangement : le téléphone apparaissait 13 fois dans
  // 8 fichiers, l'adresse 10 fois dans 5. Une modification en oubliait
  // forcément une partie.
  it("le téléphone n'est pas recopié dans les pages", () => {
    expect(fichiersAvec(/06 79 44 87 59/, "tel")).toEqual([]);
  });

  it("l'adresse n'est pas recopiée dans les pages", () => {
    expect(fichiersAvec(/11 rue Saint Pierre/, "adresse")).toEqual([]);
  });

  // LE DÉFAUT QUI A DÉCLENCHÉ CE RANGEMENT : quatre formulations d'horaires
  // coexistaient et deux seulement mentionnaient le samedi. Quelqu'un qui
  // lisait « entre 7h et 11h » repartait en pensant que le club ferme le
  // samedi — une information perdue sur quatre emplacements sur six.
  it("aucune page n'annonce les horaires sans le samedi", () => {
    expect(fichiersAvec(/entre 7h et 11h|de 7h à 11h/, "horaires")).toEqual([]);
  });
});

describe("les phrases d'horaires disent bien le samedi", () => {
  it("la phrase longue mentionne les deux plages", () => {
    expect(HORAIRES_PHRASE).toContain(HORAIRES.semaine.debut);
    expect(HORAIRES_PHRASE).toContain(HORAIRES.samedi.debut);
    expect(HORAIRES_PHRASE).toMatch(/samedi/i);
  });

  it("la version courte aussi", () => {
    expect(HORAIRES_COURT).toMatch(/Sam/);
  });
});

describe("les valeurs elles-mêmes", () => {
  it("le téléphone est au format lisible", () => {
    expect(CLUB_TEL).toMatch(/^0\d( \d\d){4}$/);
  });

  it("l'adresse porte la ville et le code postal", () => {
    expect(CLUB_ADRESSE).toContain("Verdun");
    expect(CLUB_ADRESSE).toMatch(/\b55100\b/);
  });
});
