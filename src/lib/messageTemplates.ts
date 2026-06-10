// =============================================================================
// Templates de messages WhatsApp (Chantier E, 2026-04-29)
// =============================================================================
//
// 5 scenarios pre-cables avec interpolation des donnees client. Pour le
// V1, pas d appel IA — tout est deterministe et instantane. La suggestion
// IA arrivera dans un V2 (edge function vers Anthropic API).
//
// Chaque template a :
//   - id stable
//   - icon emoji
//   - label affiche dans le menu
//   - applicable(client, ctx) : predicat pour savoir si le template est pertinent
//   - render(client, ctx) : retourne le texte avec interpolation
// =============================================================================

import type { Client, FollowUp } from "../types/domain";

export interface TemplateContext {
  /** Coach courant (pour signature). */
  coachFirstName: string;
  /** ID sponsor Herbalife du coach (users.herbalife_id) — pour l'invitation VIP.
      Optionnel : les appelants hors fiche client ne le fournissent pas. */
  coachSponsorId?: string;
  /** 3 premières lettres du nom du sponsor (coach) — pour l'inscription VIP. */
  coachSponsorLetters?: string;
  /** FollowUps du client pour detecter le RDV imminent. */
  followUps: FollowUp[];
  now: Date;
}

export interface MessageTemplate {
  id: string;
  emoji: string;
  label: string;
  description: string;
  /** Predicat de pertinence — affiche dans le menu seulement si true. */
  applicable: (client: Client, ctx: TemplateContext) => boolean;
  /** Genere le texte du message. */
  render: (client: Client, ctx: TemplateContext) => string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function firstName(client: Client): string {
  return (client.firstName || "").trim() || "toi";
}

function getNextFollowUp(client: Client, ctx: TemplateContext): Date | null {
  const candidates: Date[] = [];
  if (client.nextFollowUp) {
    const t = new Date(client.nextFollowUp);
    if (!Number.isNaN(t.getTime()) && t.getTime() > ctx.now.getTime()) candidates.push(t);
  }
  ctx.followUps.forEach((fu) => {
    if (fu.clientId !== client.id || fu.status !== "scheduled") return;
    const t = new Date(fu.dueDate);
    if (!Number.isNaN(t.getTime()) && t.getTime() > ctx.now.getTime()) candidates.push(t);
  });
  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => a.getTime() - b.getTime())[0];
}

function formatDayHour(date: Date): string {
  const isTomorrow = (() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date.toDateString() === tomorrow.toDateString();
  })();
  const isToday = date.toDateString() === new Date().toDateString();
  const hour = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `aujourd'hui à ${hour}`;
  if (isTomorrow) return `demain à ${hour}`;
  return date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }) + ` à ${hour}`;
}

function getLastWeightDelta(client: Client): number | null {
  if (!client.assessments || client.assessments.length < 2) return null;
  const sorted = [...client.assessments].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const first = sorted[0]?.bodyScan?.weight;
  const last = sorted[sorted.length - 1]?.bodyScan?.weight;
  if (!first || !last) return null;
  return Number((last - first).toFixed(1));
}

// ─── 5 Templates ──────────────────────────────────────────────────────────────

export const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: "rdv-confirmation",
    emoji: "📅",
    label: "Confirmation RDV imminent",
    description: "Rappelle le prochain RDV (jour + heure).",
    applicable: (client, ctx) => {
      const next = getNextFollowUp(client, ctx);
      if (!next) return false;
      const hoursAway = (next.getTime() - ctx.now.getTime()) / 3_600_000;
      return hoursAway > 0 && hoursAway < 48;
    },
    render: (client, ctx) => {
      const next = getNextFollowUp(client, ctx);
      const when = next ? formatDayHour(next) : "à confirmer";
      return `Coucou ${firstName(client)} ! 👋\n\nPetit rappel pour notre rendez-vous ${when}. Hâte de voir tes avancées !\n\nÀ tout à l'heure 💪\n${ctx.coachFirstName}`;
    },
  },
  {
    id: "felicitation-poids",
    emoji: "🎉",
    label: "Félicitation perte de poids",
    description: "Célèbre une perte de poids constatée entre 2 bilans.",
    applicable: (client) => {
      const delta = getLastWeightDelta(client);
      return delta !== null && delta <= -1; // perte d au moins 1 kg
    },
    render: (client, ctx) => {
      const delta = getLastWeightDelta(client) ?? 0;
      const lostKg = Math.abs(delta).toFixed(1);
      return `${firstName(client)}, j'ai vu tes derniers chiffres et franchement chapeau ! 🎉\n\n${lostKg} kg de moins, c'est concret et c'est mérité. La régularité paye, continue comme ça.\n\nOn fait le point bientôt sur la prochaine étape ?\n\n${ctx.coachFirstName}`;
    },
  },
  {
    id: "relance-douce",
    emoji: "💌",
    label: "Relance douce (silence prolongé)",
    description: "Reprend contact sans pression après ≥14j sans nouvelles.",
    applicable: (client, ctx) => {
      if (client.lifecycleStatus === "lost") return false;
      const lastDate = client.assessments?.length
        ? [...client.assessments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.date
        : null;
      if (!lastDate) return true;
      const daysSince = Math.floor((ctx.now.getTime() - new Date(lastDate).getTime()) / 86_400_000);
      return daysSince >= 14;
    },
    render: (client, ctx) => {
      return `Hello ${firstName(client)}, j'espère que tu vas bien ! 🌿\n\nJe pensais à toi, ça fait un moment qu'on ne s'est pas écrit. Comment ça se passe de ton côté ? Tu as continué le programme ou tu as pris une pause ?\n\nDis-moi simplement où tu en es, sans pression — je suis là si tu veux qu'on reprenne ensemble.\n\nÀ très vite,\n${ctx.coachFirstName}`;
    },
  },
  {
    id: "rappel-produit",
    emoji: "📦",
    label: "Rappel commande produit",
    description: "Préviens qu'il est temps de renouveler.",
    applicable: (client) => {
      // Simple : tout client actif avec au moins 1 bilan
      return client.lifecycleStatus === "active" && (client.assessments?.length ?? 0) >= 1;
    },
    render: (client, ctx) => {
      return `Coucou ${firstName(client)} ! 👋\n\nÇa va faire 30 jours bientôt sur ton programme — je voulais te demander où tu en es de tes produits. Tu as encore de quoi tenir 1 semaine ou il faut qu'on prépare ta prochaine commande ?\n\nDis-moi quand tu peux, je m'occupe de tout 🙌\n\n${ctx.coachFirstName}`;
    },
  },
  {
    id: "anniversaire-programme",
    emoji: "🎂",
    label: "Anniversaire programme (1 mois / 3 mois)",
    description: "Marque le coup quand le client atteint un jalon.",
    applicable: (client, ctx) => {
      if (!client.startDate) return false;
      const days = Math.floor((ctx.now.getTime() - new Date(client.startDate).getTime()) / 86_400_000);
      return days === 30 || days === 90 || days === 180;
    },
    render: (client, ctx) => {
      if (!client.startDate) return "";
      const days = Math.floor((ctx.now.getTime() - new Date(client.startDate).getTime()) / 86_400_000);
      const milestone = days === 30 ? "1 mois" : days === 90 ? "3 mois" : "6 mois";
      return `${firstName(client)}, c'est jour J : ça fait ${milestone} aujourd'hui que tu as commencé ton programme avec nous 🎂\n\nT'as déjà fait du chemin, et c'est en grande partie grâce à toi (oui oui). On fait le point cette semaine pour célébrer ?\n\nÀ très vite,\n${ctx.coachFirstName}`;
    },
  },
  {
    id: "vip-privilege-pitch",
    emoji: "⭐",
    label: "Pitch Client Privilégié (teaser)",
    description:
      "Donne envie : remises -15% / -25% / -35% + parrainage. Plafond client honnête.",
    // Toujours applicable : tu peux pitcher le programme à n'importe quel client actif.
    applicable: (client) =>
      !client.vipHerbalifeId
      && (client.lifecycleStatus === "active" || client.lifecycleStatus === undefined),
    render: (client, ctx) => {
      return `Salut ${firstName(client)} 👋\n\nJ'ai un truc qui peut vraiment te plaire : devenir Client Privilégié Herbalife. Tu paies ta nutrition moins cher, à vie :\n\n🥉 -15% dès ta 1ère commande\n🥈 -25% en devenant régulier·e\n🥇 -35% le max client privilégié\n\nLe bonus : quand des proches que tu sponsorises (famille, collègues, amis) commandent aussi, ta remise grimpe plus vite. Et si un jour tu veux aller encore plus loin (-42% à -50%), c'est possible en passant distributeur — on en parle quand tu veux.\n\nÇa te dit qu'on regarde ensemble ?\n\n${ctx.coachFirstName}`;
    },
  },
  {
    id: "vip-inscription",
    emoji: "📝",
    label: "Invitation inscription Client Privilégié",
    description:
      "Le message complet pour s'enregistrer : lien + ton ID sponsor + 3 lettres + appli commandes.",
    // Pour un client (ou prospect) chaud, prêt à s'inscrire et commander.
    applicable: (client) =>
      !client.vipHerbalifeId
      && (client.lifecycleStatus === "active" || client.lifecycleStatus === undefined),
    render: (client, ctx) => {
      const sponsorId = ctx.coachSponsorId || "[renseigne ton ID Herbalife dans Paramètres > Profil]";
      const letters = ctx.coachSponsorLetters || "[3 lettres de ton nom]";
      return `Salut ${firstName(client)} ! 👋\n\nVoici le lien pour t'enregistrer en tant que Client Privilégié et profiter de tes remises :\n\nhttps://accounts.myherbalife.com/Account/Create?appId=1&locale=fr-FR&redirect=https://fr.myherbalife.com\n\nPendant l'inscription, on te demandera :\n☑️ ID sponsor : ${sponsorId}\n☑️ 3 premières lettres du nom : ${letters}\n☑️ Déjà en possession d'un pack de client privilégié : NON\n\nTu finalises en réglant ton kit de client privilégié.\n\nEnsuite, télécharge l'appli « Commandes Herbalife » :\n📌 Play Store : https://play.google.com/store/apps/details?id=com.hrbl.mobile.android.ordering&hl=fr\n📌 App Store : https://apps.apple.com/fr/app/commandes-herbalife-nutrition/id1154285940\n\nTu pourras alors commander ton programme avec 15% à 35% de remise à vie sur tous les produits Herbalife.\n\nUne question ? Je suis là 🌿\n${ctx.coachFirstName}`;
    },
  },
];

// ─── Helpers de rendu ──────────────────────────────────────────────────────────

export function getApplicableTemplates(
  client: Client,
  ctx: TemplateContext,
): MessageTemplate[] {
  return MESSAGE_TEMPLATES.filter((t) => t.applicable(client, ctx));
}

export function buildWhatsAppLink(phone: string | null | undefined, message: string): string {
  const cleanedPhone = (phone || "").replace(/[^\d+]/g, "").replace(/^\+?/, "");
  const text = encodeURIComponent(message);
  if (cleanedPhone) {
    return `https://wa.me/${cleanedPhone}?text=${text}`;
  }
  // Sans numero, ouvre WhatsApp Web sans destinataire — l user choisit
  return `https://wa.me/?text=${text}`;
}
