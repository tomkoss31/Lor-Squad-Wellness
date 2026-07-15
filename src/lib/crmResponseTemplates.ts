// =============================================================================
// crmResponseTemplates — templates de réponse unifiés, toutes sources CRM.
//
// Chantier refonte CRM Liste/Pipeline/Fiche détail, Phase 4 (2026-07-16).
// Fusionne deux logiques qui vivaient séparément et divergeaient :
//   - crmMessages.ts : 1 message par source (déjà adapté au contexte —
//     bilan-online/vip/reco-client/opportunite/...), EXPLOITE lead.contact
//     (téléphone) pour générer des liens wa.me/sms directs.
//   - leadResponseTemplates.ts + LeadResponsePanel.tsx (retirés) : 4 tons
//     éditoriaux (accueil+RDV / accueil+questions / relance / redirection),
//     mais scopés à OnlineBilanRow uniquement et SANS téléphone (bug — les
//     liens wa.me/sms s'ouvraient vides alors que le téléphone était déjà en
//     base pour online_bilans).
//
// Ici : les 4 tons éditoriaux généralisés à N'IMPORTE QUEL CrmLead, + un 5e
// ton "Recommandé" qui délègue à crmMessages.ts (comportement identique à
// useLeadQuickActions, donc au 1-clic déjà utilisé en Liste/Pipeline). Le
// téléphone (ou celui du parrain pour une intention) est résolu par
// l'appelant (CrmResponsePanel), pas ici — ce fichier ne fait que du texte.
// =============================================================================

import type { CrmLead } from "../hooks/useCrmLeads";
import {
  buildAskContactMessage,
  buildCrmMessage,
  buildCrmRelanceMessage,
  type CrmMessageContext,
} from "./crmMessages";

export type CrmToneId = "auto" | "welcome_rdv" | "welcome_questions" | "relance_j3" | "redirect_team";

export interface CrmTone {
  id: CrmToneId;
  emoji: string;
  label: string;
  description: string;
  render: (lead: CrmLead, ctx: CrmMessageContext) => string;
}

const OBJECTIVE_HUMAN: Record<string, string> = {
  weight_loss: "ton objectif perte de poids",
  mass_gain: "ta prise de masse",
  energy: "ton énergie au quotidien",
  sleep: "ton sommeil et ta récupération",
  wellbeing: "ton bien-être global",
  perf_pro: "ta performance au travail",
};

// Seul online_bilans porte des objectifs structurés (bilanObjectives) — les
// autres sources retombent sur une formule générique, éditable par le coach.
function objectivePhrase(lead: CrmLead): string {
  const objs = lead.bilanObjectives ?? [];
  if (objs.length === 0) return "ton objectif";
  if (objs.length === 1) return OBJECTIVE_HUMAN[objs[0]] ?? "ton objectif";
  return "tes objectifs";
}

function autoMessage(lead: CrmLead, ctx: CrmMessageContext): string {
  if (lead.source === "intention") return buildAskContactMessage(lead, ctx);
  if (lead.status === "contacted") return buildCrmRelanceMessage(lead, ctx);
  return buildCrmMessage(lead, ctx);
}

export const CRM_TONES: CrmTone[] = [
  {
    id: "auto",
    emoji: "✨",
    label: "Recommandé",
    description: "Message adapté automatiquement à la source et au statut du lead.",
    render: autoMessage,
  },
  {
    id: "welcome_rdv",
    emoji: "👋",
    label: "Accueil + propose RDV",
    description: "Premier contact chaud, propose un appel ou RDV.",
    render: (lead, ctx) => {
      const f = lead.firstName.trim() || "toi";
      const obj = objectivePhrase(lead);
      return [
        `Salut ${f} 👋`,
        ``,
        `C'est ${ctx.coachFirstName} de La Base 360. J'ai bien reçu ton message, merci pour ta confiance 🙏`,
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
    render: (lead, ctx) => {
      const f = lead.firstName.trim() || "toi";
      const obj = objectivePhrase(lead);
      return [
        `Salut ${f} ! 🌿`,
        ``,
        `${ctx.coachFirstName} de La Base 360 — merci pour ton message, je l'ai bien lu.`,
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
    label: "Relance douce (sans réponse)",
    description: "Relance après quelques jours de silence.",
    render: (lead, ctx) => {
      const f = lead.firstName.trim() || "toi";
      return [
        `Re ${f} 🙂`,
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
    description: "Si tu n'es pas la bonne personne pour ce profil.",
    render: (lead) => {
      const f = lead.firstName.trim() || "toi";
      return [
        `Salut ${f} 👋`,
        ``,
        `Merci pour ton message ! Pour bien t'accompagner sur ${objectivePhrase(lead)}, je te mets en relation avec une coach de l'équipe La Base 360 qui sera plus adaptée à ton profil.`,
        ``,
        `Elle te recontacte sous 24-48h. À très vite 🙏`,
      ].join("\n");
    },
  },
];

export function findCrmTone(id: CrmToneId): CrmTone {
  return CRM_TONES.find((t) => t.id === id) ?? CRM_TONES[0];
}
