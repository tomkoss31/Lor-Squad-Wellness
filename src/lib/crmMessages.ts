// =============================================================================
// crmMessages — messages de premier contact par source de lead (VIP-4
// 2026-06-10, demande Thomas « plus pro avec les messages »).
//
// Chaque source a son angle :
//   - reco-client : Message B qualification (brief Thomas) — on cite la
//     personne qui a recommandé + on qualifie via le bilan online.
//   - vip : suite logique de la page publique Club VIP (remise).
//   - bilan-online : accusé réception + proposition de créneau.
//   - opportunite / simulateur / business : angle revenu/projet.
//   - welcome : générique chaleureux.
//
// Tous se terminent par une porte de sortie douce (« dis-moi ce qui
// t'arrange ») — pas de pression, ton La Base 360.
// =============================================================================

import type { CrmLead } from "../hooks/useCrmLeads";

export interface CrmMessageContext {
  coachFirstName: string;
  /** URL bilan online perso du coach (qualification). */
  bilanUrl: string;
  /** URL page publique Club VIP du coach. */
  vipUrl: string;
}

export function buildCrmMessage(lead: CrmLead, ctx: CrmMessageContext): string {
  const f = lead.firstName.trim() || "toi";
  const c = ctx.coachFirstName;

  switch (lead.source) {
    case "reco-client": {
      const via = lead.viaName ? lead.viaName.split(/\s+/)[0] : "un de mes clients";
      return (
        `Bonjour ${f} ! 👋\n\n` +
        `C'est ${c}, de La Base 360. ${via} nous a partagé ton contact — merci à ${lead.viaName ? "lui/elle" : "cette personne"} 🙏\n\n` +
        `On serait ravis de t'offrir une évaluation bien-être personnalisée, comme ${via}. ` +
        `Pour nous aider à cerner tes besoins, voici un questionnaire rapide (2 min) :\n${ctx.bilanUrl}\n\n` +
        `Aucune obligation — et si tu préfères qu'on s'appelle d'abord, dis-moi ce qui t'arrange 🌿\n${c}`
      );
    }
    case "vip":
      return (
        `Bonjour ${f} ! 👋\n\n` +
        `C'est ${c}, de La Base 360 — j'ai bien reçu ta demande pour le Club VIP 👑\n\n` +
        `Bonne nouvelle : tu peux profiter de 15% à 35% de remise à vie sur ta nutrition. ` +
        `Pour qu'on personnalise ton démarrage, fais ton mini-bilan (2 min) :\n${ctx.bilanUrl}\n\n` +
        `Ou dis-moi quand tu es dispo pour qu'on en parle 5 minutes 🌿\n${c}`
      );
    case "bilan-online":
      return (
        `Bonjour ${f} ! 👋\n\n` +
        `C'est ${c}, de La Base 360 — j'ai bien reçu ton bilan, merci pour ta confiance 🙏\n\n` +
        `J'ai déjà quelques conseils personnalisés pour toi. On se cale un petit échange ` +
        `(téléphone ou sur place, comme tu préfères) ? Dis-moi tes dispos cette semaine 🌿\n${c}`
      );
    case "opportunite":
    case "simulateur":
    case "business":
      return (
        `Bonjour ${f} ! 👋\n\n` +
        `C'est ${c}, de La Base 360 — merci pour ton intérêt pour le projet 💼\n\n` +
        `Je te propose un échange rapide (15 min) pour répondre à tes questions et voir ` +
        `si ça matche avec ce que tu cherches. Tu préfères un appel ou un café ? ` +
        `Dis-moi tes dispos 🌿\n${c}`
      );
    case "welcome":
    default:
      return (
        `Bonjour ${f} ! 👋\n\n` +
        `C'est ${c}, de La Base 360 — merci pour ton message 🙏\n\n` +
        `Pour qu'on fasse connaissance et que je comprenne ton objectif, voici un mini ` +
        `questionnaire (2 min) :\n${ctx.bilanUrl}\n\n` +
        `Ou réponds-moi directement ici, comme tu préfères 🌿\n${c}`
      );
  }
}

/** Intentions VIP : message AU PARRAIN pour demander le contact du prospect.
    (Le lead n'a pas de coordonnées — c'est le client parrain qu'on contacte.) */
export function buildAskContactMessage(lead: CrmLead, ctx: CrmMessageContext): string {
  const parrain = (lead.viaName ?? "").split(/\s+/)[0] || "toi";
  const prospect = lead.firstName.trim() || "la personne";
  const rel = lead.extra ? ` (${lead.extra})` : "";
  return (
    `Salut ${parrain} ! 🌿\n\n` +
    `Tu m'avais parlé de ${prospect}${rel} qui pourrait être intéressé·e — ` +
    `merci encore pour la reco 🙏\n\n` +
    `Tu peux me partager son numéro, ou mieux : nous mettre en contact ` +
    `(un petit groupe WhatsApp à 3, c'est parfait) ? Je m'occupe du reste, ` +
    `en douceur comme toujours 🙂\n${ctx.coachFirstName}`
  );
}

/** Message de relance douce (J+3 sans réponse), toutes sources. */
export function buildCrmRelanceMessage(lead: CrmLead, ctx: CrmMessageContext): string {
  const f = lead.firstName.trim() || "toi";
  return (
    `Hello ${f} ! 🌿\n\n` +
    `C'est ${ctx.coachFirstName} (La Base 360) — je me permets un petit rappel, ` +
    `mon précédent message a pu passer à la trappe.\n\n` +
    `Si c'est toujours d'actualité pour toi, je suis dispo cette semaine. ` +
    `Et si ce n'est plus le moment, pas de souci, dis-le-moi simplement 🙂\n${ctx.coachFirstName}`
  );
}

export function buildCrmWhatsAppLink(contact: string | null, message: string): string {
  const phone = (contact ?? "").replace(/[^\d+]/g, "").replace(/^\+?/, "");
  const text = encodeURIComponent(message);
  return phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
}

export function buildCrmSmsLink(contact: string | null, message: string): string {
  const phone = (contact ?? "").replace(/[^\d+]/g, "");
  const text = encodeURIComponent(message);
  return phone ? `sms:${phone}?body=${text}` : `sms:?body=${text}`;
}

/** Telegram n'accepte pas de destinataire par numéro dans l'URL de partage
    (contrairement à wa.me) — le coach choisit le contact dans l'app. */
export function buildCrmTelegramLink(message: string): string {
  const text = encodeURIComponent(message);
  return `https://t.me/share/url?url=&text=${text}`;
}
