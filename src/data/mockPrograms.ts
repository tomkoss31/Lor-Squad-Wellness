import type { Program } from "../types/domain";

export const mockPrograms: Program[] = [
  {
    id: "p-discovery",
    title: "Programme Decouverte",
    category: "weight-loss",
    kind: "main",
    price: "159 EUR",
    summary: "Pour demarrer simplement avec une routine claire.",
    benefits: [
      "Base du petit-dejeuner structuree",
      "Hydratation et routine du matin",
      "Solution simple pour commencer"
    ],
    composition: ["Aloe", "Formula 1", "Base routine"],
    accent: "blue",
    badge: "Decouverte"
  },
  {
    id: "p-premium",
    title: "Programme Premium",
    category: "weight-loss",
    kind: "main",
    price: "234 EUR",
    summary: "La version la plus equilibree pour installer une vraie routine.",
    benefits: [
      "Routine plus complete",
      "Plus de confort au quotidien",
      "Meilleur cadre pour tenir dans le temps"
    ],
    composition: ["Aloe", "Formula 1", "Protein Drink Mix", "Base routine"],
    accent: "green",
    badge: "Premium"
  },
  {
    id: "p-booster-1",
    title: "Programme Booster 1",
    category: "weight-loss",
    kind: "main",
    price: "277 EUR",
    summary: "Pour les clients qui veulent renforcer digestion et confort abdominal.",
    benefits: [
      "Digestion / ventre plat",
      "Routine plus soutenue",
      "Accompagnement plus complet"
    ],
    composition: ["Base routine", "Focus digestion", "Formule renforcee"],
    accent: "blue",
    badge: "Booster 1"
  },
  {
    id: "p-booster-2",
    title: "Programme Booster 2",
    category: "weight-loss",
    kind: "main",
    price: "324 EUR",
    summary: "Pour les clients qui veulent une routine plus dynamique et plus complete.",
    benefits: ["Energie", "Routine plus renforcee", "Cadre plus appuye"],
    composition: ["Base routine", "Focus energie", "Formule plus complete"],
    accent: "red",
    badge: "Booster 2"
  },
  {
    id: "p-sport-discovery",
    title: "Programme Decouverte",
    category: "sport",
    kind: "main",
    price: "190 EUR",
    summary: "Pour poser une base simple en nutrition sportive.",
    benefits: [
      "Petits-dejeuners structures",
      "Collations proteinees",
      "Base simple pour progresser"
    ],
    composition: ["42 petits-dejeuners", "24 collations proteinees", "Shaker offert"],
    accent: "blue",
    badge: "Decouverte"
  },
  {
    id: "p-sport-premium",
    title: "Programme Premium",
    category: "sport",
    kind: "main",
    price: "285 EUR",
    summary: "Pour une routine sport plus complete avec recuperation.",
    benefits: [
      "Plus de structure au quotidien",
      "Recuperation renforcee",
      "Hydratation et collation mieux gerees"
    ],
    composition: [
      "42 petits-dejeuners",
      "24 collations proteinees",
      "30 recuperations sport",
      "10 litres boisson sport"
    ],
    accent: "green",
    badge: "Premium"
  },
  {
    id: "p-sport-boost-protein-snack",
    title: "Collations sport 21 g proteine",
    category: "sport",
    kind: "booster",
    price: "+27,50 EUR",
    summary: "Renfort proteines",
    benefits: ["Renfort proteines", "Collation simple", "Autour de la journee"],
    accent: "blue",
    badge: "Option"
  },
  {
    id: "p-sport-boost-liftoff",
    title: "Pre-workout Liftoff 24",
    category: "sport",
    kind: "booster",
    price: "+38,50 EUR",
    summary: "Avant l'entrainement",
    benefits: ["Avant l'entrainement", "Impulsion", "Usage simple"],
    accent: "red",
    badge: "Option"
  },
  {
    id: "p-sport-boost-cr7",
    title: "During workout CR7 Drive",
    category: "sport",
    kind: "booster",
    price: "+27,50 EUR",
    summary: "Pendant l'effort",
    benefits: ["Pendant l'effort", "Hydratation sport", "Accompagnement effort"],
    accent: "green",
    badge: "Option"
  },
  {
    id: "p-sport-boost-hydration",
    title: "Hydration Boost",
    category: "sport",
    kind: "booster",
    price: "+47,50 EUR",
    summary: "Hydratation",
    benefits: ["Hydratation", "Booster simple", "Effort plus regulier"],
    accent: "green",
    badge: "Option"
  },
  {
    id: "p-sport-boost-creatine",
    title: "Creatine +",
    category: "sport",
    kind: "booster",
    price: "+47,50 EUR",
    summary: "Recuperation / soutien complementaire",
    benefits: ["Recuperation", "Renfort progression", "Usage cible"],
    accent: "red",
    badge: "Option"
  },
  {
    id: "p-sport-boost-collagen",
    title: "Collagene",
    category: "sport",
    kind: "booster",
    price: "+84,50 EUR",
    summary: "Soutien complementaire",
    benefits: ["Soutien complementaire", "Option premium", "Personnalisation"],
    accent: "blue",
    badge: "Option"
  }
];

// learningVisuals a été déplacé vers src/data/learningVisuals.ts
// (Chantier Prise de masse 2026-04-24).
