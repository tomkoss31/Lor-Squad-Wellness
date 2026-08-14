// =============================================================================
// momentTools — les « outils du moment » de la Boîte à outils (chantier Boîte à
// outils, 2026-08-06).
//
// PRINCIPE : la Boîte à outils cesse d'être une bibliothèque qu'on visite, elle
// devient LE bon script qui apparaît au moment de besoin. Le pare-objections
// (2026-08-04) l'a prouvé sur 1 cas ; on le décline ici sur les besoins les plus
// fréquents (inviter, suivre/relancer, demander une reco, réveiller un dormant).
//
// SOURCE UNIQUE DE CONTENU = boite-a-outils-content.ts (les `scripts` de chaque
// item, résolus par `slug`). Thomas édite là-bas, ces écrans suivent tout seuls.
// Aucune duplication de texte ici (règle B9 : une feature = un seul endroit).
//
// Chaque outil est rendu par le composant générique MomentToolScreen, atteint
// via /outils/moment/<key> (objections garde son ancien /outils/pare-objections).
// =============================================================================

/** Une clé de statut client, simplifiée, pour choisir l'outil pertinent. */
export type LifecycleHint = "prospect" | "active" | "paused";

export interface MomentToolDef {
  /** Clé courte et stable (segment d'URL, deep-links). */
  key: string;
  /** Slug de l'item boite-a-outils-content.ts d'où viennent les `scripts`. */
  slug: string;
  /** Chemin de la page (peut différer de /outils/moment/<key> pour le legacy). */
  path: string;
  /** Emoji d'entête + pastille barre d'outils. */
  icon: string;
  /** Libellé court (barre d'outils fiche client, cartes boîte). */
  label: string;
  /** Sous-titre une ligne (barre d'outils / cartes). */
  blurb: string;
  /** Bandeau mono au-dessus du titre. */
  eyebrow: string;
  /** Titre Anton de l'écran. */
  title: string;
  /** Accroche — supporte **gras** inline. */
  lede: string;
  /** Question au-dessus de la grille de situations. */
  pickLabel: string;
  /** Micro-étiquette « prêt » / « paré » sur la carte réponse. */
  badge: string;
  /** Libellé du bouton copier. */
  copyLabel: string;
  /** 1 ou 2 colonnes pour la grille de situations (labels longs → 1). */
  columns: 1 | 2;
}

// L'ordre d'affichage dans la section « Au bon moment » de la boîte.
export const MOMENT_TOOL_ORDER = ["objections", "inviter", "relancer", "recos", "reveil"] as const;

export const MOMENT_TOOLS: Record<string, MomentToolDef> = {
  objections: {
    key: "objections",
    slug: "objections-reponses",
    path: "/outils/pare-objections", // route historique conservée (deep-links)
    icon: "🛡️",
    label: "Objections",
    blurb: "On te sort une objection → LA réponse",
    eyebrow: "🛡️ Boîte à outils · au moment de besoin",
    title: "Le pare-objections",
    lede: "On te sort une objection ? Tape-la — voici quoi répondre, **mot pour mot**.",
    pickLabel: "Qu'est-ce qu'on te sort ?",
    badge: "paré",
    copyLabel: "Copier la réponse",
    columns: 2,
  },
  inviter: {
    key: "inviter",
    slug: "scripts-invitation",
    path: "/outils/moment/inviter",
    icon: "✉️",
    label: "Inviter",
    blurb: "Chaud · tiède · froid · réveil",
    eyebrow: "✉️ Boîte à outils · au moment de besoin",
    title: "Inviter au bon moment",
    lede: "Tu veux inviter quelqu'un ? Choisis la situation — voici **le bon message**, prêt à envoyer.",
    pickLabel: "C'est quel type de contact ?",
    badge: "prêt",
    copyLabel: "Copier le message",
    columns: 1,
  },
  relancer: {
    key: "relancer",
    slug: "templates-suivi-jours",
    path: "/outils/moment/relancer",
    icon: "📅",
    label: "Suivre",
    blurb: "J+1 · J+3 · J+7 · J+14 · J+30",
    eyebrow: "📅 Boîte à outils · au moment de besoin",
    title: "Suivre & relancer",
    lede: "Où en est ton client ? Choisis le moment — voici **le message de suivi** à envoyer.",
    pickLabel: "On en est où avec ce client ?",
    badge: "prêt",
    copyLabel: "Copier le message",
    columns: 1,
  },
  recos: {
    key: "recos",
    slug: "phrase-magique-recos",
    path: "/outils/moment/recos",
    icon: "🌟",
    label: "Demander une reco",
    blurb: "La phrase magique, mot pour mot",
    eyebrow: "🌟 Boîte à outils · au moment de besoin",
    title: "Demander une reco",
    lede: "Le moment est venu de demander ? Choisis la situation — voici **quoi dire**, sans avoir l'air de mendier.",
    pickLabel: "Dans quelle situation es-tu ?",
    badge: "prêt",
    copyLabel: "Copier la phrase",
    columns: 1,
  },
  reveil: {
    key: "reveil",
    slug: "reveiller-client-pause",
    path: "/outils/moment/reveil",
    icon: "⏰",
    label: "Réveiller",
    blurb: "Rouvrir un client en pause, en douceur",
    eyebrow: "⏰ Boîte à outils · au moment de besoin",
    title: "Réveiller un client en pause",
    lede: "Un client s'est éteint ? Choisis depuis quand — voici **le message** pour le rouvrir sans pression.",
    pickLabel: "Depuis combien de temps sans nouvelles ?",
    badge: "prêt",
    copyLabel: "Copier le message",
    columns: 1,
  },
};

/** Résout un outil par sa clé (undefined si inconnue). */
export function getMomentTool(key: string | undefined): MomentToolDef | undefined {
  return key ? MOMENT_TOOLS[key] : undefined;
}

/**
 * Quel outil mettre en avant pour un client donné, selon son statut lifecycle.
 * Sert la barre 1-tap de la fiche client : « le bon outil, là où le besoin tombe ».
 */
export function pickMomentForLifecycle(status: string | null | undefined): string {
  switch (status) {
    case "lead":
    case "prospect":
      return "inviter";
    case "paused":
    case "dormant":
    case "lost":
    case "inactive":
      return "reveil";
    case "active":
    case "new":
    case "client":
      return "relancer";
    default:
      return "relancer";
  }
}
