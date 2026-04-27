// Chantier Academy direction 1 (2026-04-28).
// Mini-tour "Mode Présentation client" — 4 steps modales center pour
// etre montre AU CLIENT en RDV physique. Le coach ouvre, le client
// regarde, le coach lit a haute voix.
//
// Ton : tutoiement direct au client, copies orientees benefice client
// (pas coach). Ce tour utilise le meme moteur TourRunner mais avec un
// id distinct ("presentation-client") afin que onClose soit oriente
// vers /clients/<id> au lieu de /academy.

import type { TutorialStep } from "../onboarding/types";

export const PRESENTATION_CLIENT_TOUR_ID = "presentation-client";

export const PRESENTATION_CLIENT_STEPS: TutorialStep[] = [
  {
    id: "intro",
    title: "Bienvenue dans ton espace Lor'Squad",
    body: "Tu vas avoir ta propre app, sur ton téléphone, qui te suit dans ta progression. Pas de mail, pas de papier, pas de groupe Whatsapp à scroller. Tout est ici, organisé, accessible 24/7. Je te montre en 1 minute.",
    placement: "center",
    illustrationKey: "wave",
  },
  {
    id: "your-progress",
    title: "Ton évolution, en chiffres et en visuel",
    body: "Tu y verras ton poids, ta masse grasse, ton hydratation, ta masse musculaire — bilan après bilan. Un graphique qui te montre où tu pars d'où tu vas. Tu visualises tes progrès sans calculer.",
    placement: "center",
    illustrationKey: "ring-progress",
  },
  {
    id: "your-program",
    title: "Ton programme produits, expliqué",
    body: "Pour chaque produit de ton programme : quand le prendre, comment le préparer, à quoi il sert. Pas de doute, pas de ratage de prise. Tu scanne, tu lis, tu prépares.",
    placement: "center",
    illustrationKey: "shopping-bag",
  },
  {
    id: "your-rdv",
    title: "Tes RDV avec moi, calés et synchronisés",
    body: "Tous nos RDV s'affichent dans ton agenda. Tu peux les ajouter à Google Calendar en 1 clic, télécharger un fichier .ics universel, ou voir l'itinéraire La Base. Si tu veux décaler, tu m'envoies un message direct depuis l'app.",
    placement: "center",
    illustrationKey: "calendar-glow",
  },
  {
    id: "qr-scan",
    title: "On active maintenant — scanne ce QR",
    body: "Je te montre ton QR code juste après. Tu le scannes avec l'appareil photo de ton téléphone, ton app s'ouvre, tu l'ajoutes à ton écran d'accueil, et tu l'as comme une vraie app native. Prêt ?",
    placement: "center",
    illustrationKey: "qr-share",
    isLast: true,
    nextLabel: "Voir mon QR code 🎯",
  },
];
