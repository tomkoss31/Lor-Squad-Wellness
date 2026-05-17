// =============================================================================
// Templates de réponse Lead bilan online — chantier #1 étape 1.8 (2026-05-17).
//
// Templates courts, interpolation { firstName, coachFirstName, objective }.
// Le coach copie-colle dans son canal habituel (Instagram DM, WhatsApp,
// SMS) — pas de phone capturé sur le Lead V1 (cf. spec étape 1.3).
// =============================================================================

import type { OnlineBilanRow } from "../hooks/useOnlineBilans";

export interface LeadTemplateContext {
  coachFirstName: string;
  now: Date;
}

export interface LeadTemplate {
  id: string;
  emoji: string;
  label: string;
  description: string;
  render: (bilan: OnlineBilanRow, ctx: LeadTemplateContext) => string;
}

const OBJECTIVE_HUMAN: Record<string, string> = {
  weight_loss: "ton objectif perte de poids",
  mass_gain: "ta prise de masse",
  energy: "ton énergie au quotidien",
  sleep: "ton sommeil et ta récupération",
  wellbeing: "ton bien-être global",
};

function objectivePhrase(bilan: OnlineBilanRow): string {
  if (bilan.objectives.length === 0) return "ton objectif";
  if (bilan.objectives.length === 1) {
    return OBJECTIVE_HUMAN[bilan.objectives[0]] ?? "ton objectif";
  }
  return "tes objectifs";
}

export const LEAD_TEMPLATES: LeadTemplate[] = [
  {
    id: "welcome_rdv",
    emoji: "👋",
    label: "Accueil + propose RDV",
    description: "Premier contact chaud, propose un appel ou RDV physique.",
    render: (b, ctx) => {
      const obj = objectivePhrase(b);
      return [
        `Salut ${b.first_name} 👋`,
        ``,
        `C'est ${ctx.coachFirstName} de La Base 360. J'ai bien reçu ton bilan, merci de l'avoir rempli en détail 🙏`,
        ``,
        `J'ai vu que tu visais ${obj}. J'ai des idées concrètes pour toi.`,
        ``,
        `On se cale un appel cette semaine (30 min, gratuit) ? Dis-moi ce qui t'arrange le mieux.`,
      ].join("\n");
    },
  },
  {
    id: "welcome_questions",
    emoji: "💬",
    label: "Accueil + ouverture conversation",
    description: "Soft : pas de RDV immédiat, ouvre la discussion.",
    render: (b, ctx) => {
      const obj = objectivePhrase(b);
      return [
        `Salut ${b.first_name} ! 🌿`,
        ``,
        `${ctx.coachFirstName} de La Base 360 — merci pour ton bilan, je l'ai bien analysé.`,
        ``,
        `Avant qu'on parle stratégie sur ${obj}, juste 2 questions rapides :`,
        `1. Sur quelle période tu veux des résultats ?`,
        `2. Qu'est-ce qui te bloque le plus aujourd'hui ?`,
        ``,
        `Réponds quand t'as 2 min, à ton rythme 🙂`,
      ].join("\n");
    },
  },
  {
    id: "relance_j3",
    emoji: "🔔",
    label: "Relance J+3 (sans réponse)",
    description: "Soft relance après 3 jours de silence.",
    render: (b, ctx) => {
      return [
        `Re ${b.first_name} 🙂`,
        ``,
        `Je voulais m'assurer que mon dernier message t'est bien arrivé.`,
        ``,
        `Pas de stress si t'es occupé·e — dis-moi juste si tu veux qu'on en parle ou si tu préfères qu'on remette ça à plus tard. Je m'adapte 🤝`,
        ``,
        `${ctx.coachFirstName}`,
      ].join("\n");
    },
  },
  {
    id: "redirect_team",
    emoji: "🤝",
    label: "Redirection vers l'équipe",
    description: "Si tu n'es pas la bonne personne (ex: profil hors zone).",
    render: (b) => {
      return [
        `Salut ${b.first_name} 👋`,
        ``,
        `Merci pour ton bilan ! Pour bien t'accompagner sur ${objectivePhrase(b)}, je te mets en relation avec une coach de l'équipe La Base 360 qui sera plus adaptée à ton profil.`,
        ``,
        `Elle te recontacte sous 24-48h. À très vite 🙏`,
      ].join("\n");
    },
  },
];

export function findTemplateById(id: string): LeadTemplate | undefined {
  return LEAD_TEMPLATES.find((t) => t.id === id);
}
