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
  messageClubRelance,
  objectifDuLead,
  ouvertureClub,
  vocatif,
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
  weight_loss: "perdre du poids",
  mass_gain: "prendre de la masse",
  energy: "retrouver de l'énergie au quotidien",
  sleep: "mieux dormir et mieux récupérer",
  wellbeing: "vous sentir mieux au quotidien",
  perf_pro: "être plus performante au travail",
};

/**
 * Ce que cette personne nous a dit vouloir — sa formulation, pas la nôtre.
 *
 * ⚠️ Cette fonction ne lisait QUE `bilanObjectives`, qui n'existe que pour
 * online_bilans. Résultat : un lead venu du club ou de la pub Meta recevait
 * « ton objectif » alors que la base savait qu'il voulait perdre du poids —
 * `prospect_leads.metadata.objectif` est exposé sur `CrmLead.objectif` depuis
 * le tunnel « Réserver au club ». On lit donc celui-là EN PREMIER.
 *
 * Renvoie `null` quand on ne sait pas : au lieu d'une formule creuse, la phrase
 * appelante se referme proprement (cf. `pour()` / `sur()`).
 */
function objectivePhrase(lead: CrmLead): string | null {
  const club = objectifDuLead(lead);
  if (club) return club;

  const objs = lead.bilanObjectives ?? [];
  if (objs.length === 1) return OBJECTIVE_HUMAN[objs[0]] ?? null;
  if (objs.length > 1) return null;
  return null;
}

function sur(lead: CrmLead): string {
  const o = objectivePhrase(lead);
  return o ? ` sur ${o}` : "";
}

/** Là où on envoie quelqu'un choisir son heure. */
const LIEN_RESERVER = "labase-nutrition.com/reserver";

// Le cas « club » vit désormais DANS les builders de crmMessages.ts, pour que
// le 1-clic du board (useLeadQuickActions) et ce panneau disent la même chose.
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
    // Renommé : l'ancien libellé promettait un « RDV » et le texte vendait un
    // appel de 30 min. L'offre du club, c'est le bilan sur place.
    label: "Accueil + réserver",
    description: "Premier contact : on offre le bilan et on laisse choisir l'heure.",
    render: (lead) => {
      const o = objectivePhrase(lead);
      return (
        `${ouvertureClub(lead)} Merci d'avoir laissé vos coordonnées` +
        (o ? ` — on a bien vu que vous vouliez ${o}.` : `.`) +
        ` Ça nous ferait vraiment plaisir de vous accueillir au club et de vous offrir ` +
        `votre bilan : 45 min, body scan et boisson comprise. Vous choisissez votre ` +
        `heure ici : ${LIEN_RESERVER}` +
        `\n\nMerci d'avance.\nMélanie et Thomas`
      );
    },
  },
  {
    id: "welcome_questions",
    emoji: "💬",
    label: "Accueil + une question",
    description: "Soft : on ne propose rien encore, on ouvre la discussion.",
    // Une seule question, pas deux : un questionnaire numéroté par SMS se
    // répond rarement. Et ici la personne PEUT répondre — WhatsApp et SMS
    // partent du téléphone du coach, contrairement aux envois Twilio.
    render: (lead) => (
      `${ouvertureClub(lead)} Merci d'avoir laissé vos coordonnées. Avant de vous ` +
      `proposer quoi que ce soit, on préfère vous demander : qu'est-ce qui vous ` +
      `freine le plus en ce moment ? Répondez quand vous avez un moment, on vous lit.` +
      `\n\nMélanie et Thomas`
    ),
  },
  {
    id: "relance_j3",
    emoji: "🔔",
    label: "Relance douce (sans réponse)",
    description: "Relance après quelques jours de silence.",
    render: (lead) => messageClubRelance(lead),
  },
  {
    id: "redirect_team",
    emoji: "🤝",
    label: "Passer la main",
    description: "Quand quelqu'un d'autre de l'équipe est plus adapté.",
    // L'ancien texte présumait une femme (« Elle te recontacte ») et promettait
    // « sous 24-48h », un délai que personne ne tient. Le prénom du coéquipier
    // est éditable dans l'aperçu — c'est plus honnête qu'un genre deviné.
    render: (lead, ctx) => (
      `Bonjour${vocatif(lead)}, c'est ${ctx.coachFirstName} du Breakfast Club à Verdun. ` +
      `Pour bien vous accompagner${sur(lead)}, je préfère vous confier à un membre ` +
      `de notre équipe : c'est vraiment son domaine. Il ou elle vous écrit très vite.` +
      `\n\nMerci de votre confiance.\n${ctx.coachFirstName}`
    ),
  },
];

export function findCrmTone(id: CrmToneId): CrmTone {
  return CRM_TONES.find((t) => t.id === id) ?? CRM_TONES[0];
}
