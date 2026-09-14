// =============================================================================
// groupesListe — deux gestes différents, deux groupes. Et personne ne se perd.
//
// 14/09 : « À faire aujourd'hui · 29 » mélangeait des gens à qui personne
// n'avait parlé et des relances en retard. Et les sections deviennent
// repliables : la garde du 28/08 (19 personnes introuvables sur téléphone)
// tient ici — la somme des groupes fait TOUJOURS le total.
// =============================================================================

import { describe, it, expect } from "vitest";
import { GROUPES, grouperPourListe, ordreDeListe, sectionsOuvertes } from "../groupesListe";
import { demandeUnGeste } from "../caseLead";
import type { LeadEtape } from "../etapeLead";

type L = LeadEtape & { nom: string };
const l = (nom: string, o: Partial<LeadEtape> = {}): L => ({ nom, status: "new", ...o });

const jamais = l("François");
const retard = l("Natacha", { status: "contacted", relanceDue: true });
const calme = l("Justine", { status: "contacted" });
const rdv = l("Céline", { status: "new", rdv: { passe: false } });
const endormi = l("Paul", { status: "contacted", relanceDue: true, dormant: true });

const noms = (xs: L[]) => xs.map((x) => x.nom);

describe("grouperPourListe — les groupes disent quoi faire", () => {
  it("jamais contacté et relance en retard ne tombent plus dans le même tas", () => {
    const g = grouperPourListe([jamais, retard, calme, rdv, endormi]);
    expect(noms(g.nouveaux)).toEqual(["François"]);
    expect(noms(g.relance)).toEqual(["Natacha"]);
    expect(noms(g.reste)).toEqual(["Justine", "Céline", "Paul"]);
  });

  it("un rendez-vous calé n'est pas « à relancer » : il va dans le reste", () => {
    expect(noms(grouperPourListe([l("Céline", { status: "contacted", rdv: { passe: false }, relanceDue: true })]).reste)).toEqual(["Céline"]);
  });

  it("garde l'ordre reçu à l'intérieur d'un groupe — c'est celui du sélecteur « Trier »", () => {
    const g = grouperPourListe([l("B"), l("A"), l("C")]);
    expect(noms(g.nouveaux)).toEqual(["B", "A", "C"]);
  });

  it("personne ne se perd : la somme des groupes fait toujours le total", () => {
    const tous = [jamais, retard, calme, rdv, endormi, l("X", { status: "converted" }), l("Y", { status: "lost" })];
    const g = grouperPourListe(tous);
    expect(g.nouveaux.length + g.relance.length + g.reste.length).toBe(tous.length);
  });

  it("colle à demandeUnGeste : les groupes urgents, et eux seuls, demandent un geste", () => {
    const g = grouperPourListe([jamais, retard, calme, rdv, endormi]);
    for (const x of [...g.nouveaux, ...g.relance]) expect(demandeUnGeste(x)).toBe(true);
    for (const x of g.reste) expect(demandeUnGeste(x)).toBe(false);
  });
});

describe("ordreDeListe — l'ordre des flèches du volet = l'ordre de l'écran", () => {
  it("les nouveaux, puis les relances, puis le reste, quel que soit l'ordre reçu", () => {
    expect(noms(ordreDeListe([calme, retard, jamais]))).toEqual(["François", "Natacha", "Justine"]);
  });

  it("suit l'ordre déclaré par GROUPES", () => {
    expect(GROUPES.map((g) => g.cle)).toEqual(["nouveaux", "relance", "reste"]);
    expect(GROUPES.map((g) => g.urgent)).toEqual([true, true, false]);
  });
});

describe("sectionsOuvertes — au premier affichage, la première section NON VIDE est ouverte", () => {
  it("avec des nouveaux : seuls les nouveaux", () => {
    expect(sectionsOuvertes(["nouveaux", "relance", "reste"], {}, false)).toEqual({ nouveaux: true, relance: false, reste: false });
  });

  it("un jour sans nouveau lead : les relances s'ouvrent — pas rien (relecture avant prod, 14/09)", () => {
    expect(sectionsOuvertes(["relance", "reste"], {}, false)).toEqual({ nouveaux: false, relance: true, reste: false });
  });

  it("le choix du coach l'emporte sur le défaut", () => {
    expect(sectionsOuvertes(["relance", "reste"], { relance: false, reste: true }, false)).toEqual({ nouveaux: false, relance: false, reste: true });
  });

  it("forcée (recherche, filtre) : toutes les sections non vides, même celles que le coach a fermées", () => {
    expect(sectionsOuvertes(["nouveaux", "reste"], { nouveaux: false }, true)).toEqual({ nouveaux: true, relance: false, reste: true });
  });
});
