// =============================================================================
// starterPlan.ts — Template du « Démarrage 30 jours » (chantier Moteur d'équipe).
//
// 1ʳᵉ version (2026-06-27). Inspiré Go Pro (loi des moyennes, expositions) +
// modèle Nutrition Club. Thomas n'édite QUE ce fichier pour ajuster les tâches.
//
// RÈGLE D'ÉCRITURE (alignée Academy "langage simple") : on parle comme à un pote
// qui débute. Tutoiement, phrases courtes, zéro jargon. Action d'abord, le
// « pourquoi » en 1 ligne.
//
// `isActivationGate: true` = tâche-porte. Quand TOUTES les tâches-portes sont
// cochées, la recrue devient « ACTIVÉE » (users.activated_at). On choisit des
// portes qui prouvent un vrai démarrage SANS exiger d'avoir déjà recruté
// (recruter = « ouvreur de ligne », concept distinct, à venir).
// =============================================================================

export interface StarterTask {
  /** Clé stable (persistée en DB : distributor_starter_progress.task_key). */
  key: string;
  /** Semaine 1 à 4. */
  week: 1 | 2 | 3 | 4;
  /** Emoji d'accroche. */
  emoji: string;
  /** Intitulé de l'action (impératif, court). */
  title: string;
  /** Le « pourquoi » en 1 phrase. */
  why: string;
  /** Tâche-porte : compte dans le calcul d'activation. */
  isActivationGate?: boolean;
  /** Lien interne optionnel vers l'outil concerné. */
  linkPath?: string;
  /** Libellé du lien. */
  linkLabel?: string;
}

export interface StarterWeek {
  week: 1 | 2 | 3 | 4;
  title: string;
  subtitle: string;
}

export const STARTER_WEEKS: StarterWeek[] = [
  { week: 1, title: "Semaine 1 — Tes fondations", subtitle: "On pose les bases solides." },
  { week: 2, title: "Semaine 2 — Premiers contacts", subtitle: "Tu te lances, tu parles aux gens." },
  { week: 3, title: "Semaine 3 — Premiers bilans", subtitle: "Tu fais vivre l'expérience." },
  { week: 4, title: "Semaine 4 — La duplication", subtitle: "Tu passes de vendeur à bâtisseur." },
];

export const STARTER_TASKS: StarterTask[] = [
  // ─── Semaine 1 — Fondations ───────────────────────────────────────────────
  {
    key: "profil_complet",
    week: 1,
    emoji: "🪪",
    title: "Complète ton profil",
    why: "Tes clients et ton équipe te reconnaissent dans l'app.",
    isActivationGate: true,
    linkPath: "/parametres",
    linkLabel: "Ouvrir mon profil",
  },
  {
    key: "charte_signee",
    week: 1,
    emoji: "✍️",
    title: "Signe ta charte d'engagement",
    why: "Ton pourquoi et ton objectif 12 mois, posés noir sur blanc.",
    linkPath: "/charte",
    linkLabel: "Signer ma charte",
  },
  {
    key: "liste_50",
    week: 1,
    emoji: "📒",
    title: "Écris ta liste de 50 contacts",
    why: "Ta matière première. Sans liste, pas d'activité.",
    isActivationGate: true,
    linkPath: "/cahier-de-bord",
    linkLabel: "Ouvrir ma liste 100",
  },
  {
    key: "cobaye_demarre",
    week: 1,
    emoji: "🥤",
    title: "Démarre tes 21 jours cobaye",
    why: "Teste les produits sur toi pour parler de ton vécu, pas d'un script.",
    linkPath: "/cahier-de-bord",
    linkLabel: "Ouvrir mon cahier",
  },

  // ─── Semaine 2 — Premiers contacts ────────────────────────────────────────
  {
    key: "premiere_story",
    week: 2,
    emoji: "📱",
    title: "Publie ta 1ʳᵉ story",
    why: "Tu annonces ton démarrage, tu crées la curiosité.",
    isActivationGate: true,
  },
  {
    key: "cinq_conv_jour",
    week: 2,
    emoji: "💬",
    title: "Tiens 5 conversations par jour",
    why: "La loi des moyennes : plus tu exposes, plus tu recrutes.",
    isActivationGate: true,
    linkPath: "/flex",
    linkLabel: "Suivre mes cibles FLEX",
  },
  {
    key: "premier_hom",
    week: 2,
    emoji: "🎤",
    title: "Assiste à ta 1ʳᵉ réunion (HOM)",
    why: "Vois comment on présente l'opportunité, tu dupliqueras ça.",
  },
  {
    key: "flex_plan",
    week: 2,
    emoji: "⚡",
    title: "Pose ton plan FLEX",
    why: "Tes cibles du jour : invitations, RDV, closings. Ton GPS.",
    linkPath: "/flex",
    linkLabel: "Configurer mon FLEX",
  },

  // ─── Semaine 3 — Premiers bilans ──────────────────────────────────────────
  {
    key: "premier_bilan",
    week: 3,
    emoji: "📋",
    title: "Réalise ton 1er bilan",
    why: "Le cœur du métier. Un bilan = une porte qui s'ouvre.",
    isActivationGate: true,
    linkPath: "/clients",
    linkLabel: "Démarrer un bilan",
  },
  {
    key: "invite_club",
    week: 3,
    emoji: "👑",
    title: "Invite 1 personne au Club",
    why: "Le Club, c'est l'expérience produit vécue en vrai.",
    linkPath: "/vip",
    linkLabel: "Ma page Club VIP",
  },
  {
    key: "premier_client",
    week: 3,
    emoji: "🤝",
    title: "Signe ton 1er client",
    why: "Ta première vente. Tout commence ici.",
  },
  {
    key: "demande_recos",
    week: 3,
    emoji: "🔗",
    title: "Demande 2 recommandations",
    why: "Chaque client heureux connaît 2 personnes pour toi.",
  },

  // ─── Semaine 4 — Duplication ──────────────────────────────────────────────
  {
    key: "premiere_recrue",
    week: 4,
    emoji: "🌱",
    title: "Parraine ta 1ʳᵉ recrue",
    why: "Tu deviens « ouvreur de ligne » : la vraie bascule.",
    linkPath: "/users",
    linkLabel: "Inviter un distributeur",
  },
  {
    key: "aide_recrue_demarrage",
    week: 4,
    emoji: "🤲",
    title: "Aide ta recrue à démarrer",
    why: "La duplication : elle refait, avec toi, ce que tu viens de faire.",
  },
  {
    key: "bilan_30j",
    week: 4,
    emoji: "🏁",
    title: "Fais ton bilan des 30 jours",
    why: "Mesure, ajuste, repars plus fort le mois suivant.",
  },
];

/** Clés des tâches-portes (calcul d'activation). Passées au RPC mark_starter_task. */
export const STARTER_ACTIVATION_KEYS: string[] = STARTER_TASKS
  .filter((t) => t.isActivationGate)
  .map((t) => t.key);

export const STARTER_TASK_COUNT = STARTER_TASKS.length;
