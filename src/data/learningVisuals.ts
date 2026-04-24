// Chantier Prise de masse (2026-04-24) : extraction depuis mockPrograms.ts
// pour préparer la suppression de ce fichier (commit #5). Visuels pédagogiques
// utilisés (ou utilisables) par les composants d'apprentissage / bilan.
import type { VisualCardContent } from "../types/domain";

export const learningVisuals: VisualCardContent[] = [
  {
    id: "hydration",
    title: "Hydratation",
    description: "Faire visualiser le besoin theorique en eau, la consommation actuelle et l'ecart a combler.",
    kind: "info",
    points: ["Besoin theorique clair", "Consommation actuelle", "Ecart a ameliorer"],
    accent: "blue"
  },
  {
    id: "breakfast",
    title: "Petit-dejeuner",
    description: "Comparer rapidement une routine improvisee avec une routine structuree, simple a reproduire.",
    kind: "comparison",
    points: ["Routine improvisee", "Routine structuree", "Gain en regularite"],
    accent: "red"
  },
  {
    id: "formula",
    title: "Routine Formula 1",
    description: "Montrer une solution pratique, credible et coherente avec l'objectif du client.",
    kind: "routine",
    points: ["Rapide a preparer", "Repère proteines", "Regularite quotidienne"],
    accent: "green"
  },
  {
    id: "pdm",
    title: "Protein Drink Mix",
    description: "Appuyer l'apport proteique et la constance dans la routine du matin ou post-entrainement.",
    kind: "focus",
    points: ["Soutien recuperation", "Structure du matin", "Option post-entrainement"],
    accent: "blue"
  }
];
