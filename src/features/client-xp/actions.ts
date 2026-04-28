// =============================================================================
// Client XP Actions — table de mapping (Tier B Premium Client, 2026-04-28)
// =============================================================================
//
// Ce module est la SEULE source de verite cote front pour les actions XP
// client + leurs metadata (label, emoji, gain XP, cap strategy).
//
// IMPORTANT : la SQL function record_client_xp() encode aussi ces gains/caps.
// En cas de modification d un XP cote SQL, il FAUT mettre a jour ce fichier
// pour rester aligne (et inversement). Ce fichier sert UNIQUEMENT a l UI
// (panel "Comment ca marche ?" + label des toasts) — la source de verite
// reste le SQL pour le calcul reel.
// =============================================================================

export type ClientXpActionKey =
  // 1x lifetime
  | "first_login"
  | "install_pwa"
  | "sandbox_completed"
  | "tutorial_completed"
  | "silhouette_complete"
  | "telegram_joined"
  | "anniversary_1m"
  | "anniversary_3m"
  | "anniversary_6m"
  | "google_review"
  // 1x/jour
  | "tab_agenda"
  | "tab_pv"
  | "tab_evolution"
  | "tab_conseils"
  | "message_sent"
  | "mood_checkin"
  | "measurement_added"
  // 1x/semaine
  | "weekly_weigh_in"
  // no cap
  | "photo_uploaded";

export type ClientXpCapStrategy = "lifetime" | "daily" | "weekly" | "none";

export interface ClientXpActionDef {
  key: ClientXpActionKey;
  emoji: string;
  label: string;
  hint: string;
  xp: number;
  cap: ClientXpCapStrategy;
  /** Categorie pour l UI "Comment ca marche". */
  category: "discover" | "daily" | "milestone" | "engage";
}

export const CLIENT_XP_ACTIONS: ClientXpActionDef[] = [
  // ─── Discover (1x lifetime) ────────────────────────────────────────────────
  {
    key: "first_login",
    emoji: "🎉",
    label: "Première connexion",
    hint: "Bienvenue dans ton espace",
    xp: 50,
    cap: "lifetime",
    category: "discover",
  },
  {
    key: "install_pwa",
    emoji: "📲",
    label: "Installer l'app sur ton téléphone",
    hint: "Comme une vraie app native",
    xp: 50,
    cap: "lifetime",
    category: "discover",
  },
  {
    key: "tutorial_completed",
    emoji: "🎓",
    label: "Terminer le tutoriel",
    hint: "Tu connais ton espace",
    xp: 30,
    cap: "lifetime",
    category: "discover",
  },
  {
    key: "sandbox_completed",
    emoji: "🎮",
    label: "Compléter le mode pratique",
    hint: "4 quêtes interactives",
    xp: 100,
    cap: "lifetime",
    category: "discover",
  },
  {
    key: "telegram_joined",
    emoji: "✈️",
    label: "Rejoindre les Challengers Telegram",
    hint: "La communauté Lor'Squad",
    xp: 30,
    cap: "lifetime",
    category: "discover",
  },

  // ─── Daily (1x/jour) ───────────────────────────────────────────────────────
  {
    key: "tab_agenda",
    emoji: "📅",
    label: "Vérifier ton agenda RDV",
    hint: "Tous les jours ça compte",
    xp: 5,
    cap: "daily",
    category: "daily",
  },
  {
    key: "tab_evolution",
    emoji: "📈",
    label: "Consulter ton évolution",
    hint: "Voir tes progrès",
    xp: 5,
    cap: "daily",
    category: "daily",
  },
  {
    key: "tab_conseils",
    emoji: "💡",
    label: "Lire tes conseils du jour",
    hint: "Assiette idéale + routine",
    xp: 5,
    cap: "daily",
    category: "daily",
  },
  {
    key: "tab_pv",
    emoji: "🛒",
    label: "Vérifier tes produits",
    hint: "Programme + recommandés",
    xp: 5,
    cap: "daily",
    category: "daily",
  },
  {
    key: "mood_checkin",
    emoji: "😊",
    label: "Comment tu te sens aujourd'hui",
    hint: "Check-in mood quotidien",
    xp: 5,
    cap: "daily",
    category: "daily",
  },
  {
    key: "message_sent",
    emoji: "💬",
    label: "Écrire à ton coach",
    hint: "Question, ressentis, partage",
    xp: 15,
    cap: "daily",
    category: "engage",
  },
  {
    key: "measurement_added",
    emoji: "📏",
    label: "Saisir une mensuration",
    hint: "Cou / poitrine / taille / hanches…",
    xp: 10,
    cap: "daily",
    category: "engage",
  },

  // ─── Engage (mensuel / hebdo) ──────────────────────────────────────────────
  {
    key: "weekly_weigh_in",
    emoji: "⚖️",
    label: "Pesée hebdomadaire",
    hint: "Le matin à jeun, 1×/semaine",
    xp: 20,
    cap: "weekly",
    category: "engage",
  },

  // ─── Milestones (1x lifetime) ──────────────────────────────────────────────
  {
    key: "silhouette_complete",
    emoji: "📐",
    label: "Compléter ta silhouette (5 mensurations)",
    hint: "Cou + poitrine + taille + hanches + bras",
    xp: 50,
    cap: "lifetime",
    category: "milestone",
  },
  {
    key: "photo_uploaded",
    emoji: "📸",
    label: "Uploader une photo avant/après",
    hint: "Trace visuelle de ta progression",
    xp: 50,
    cap: "none",
    category: "milestone",
  },
  {
    key: "anniversary_1m",
    emoji: "🎂",
    label: "1 mois sur le programme",
    hint: "Premier jalon atteint",
    xp: 200,
    cap: "lifetime",
    category: "milestone",
  },
  {
    key: "anniversary_3m",
    emoji: "🎂",
    label: "3 mois sur le programme",
    hint: "Régularité confirmée",
    xp: 500,
    cap: "lifetime",
    category: "milestone",
  },
  {
    key: "anniversary_6m",
    emoji: "🎂",
    label: "6 mois sur le programme",
    hint: "Habitude installée",
    xp: 800,
    cap: "lifetime",
    category: "milestone",
  },
  {
    key: "google_review",
    emoji: "⭐",
    label: "Laisser un avis Google",
    hint: "Cadeau pour ton coach",
    xp: 200,
    cap: "lifetime",
    category: "milestone",
  },
];

// Lookup helper
export function getXpAction(key: ClientXpActionKey): ClientXpActionDef | undefined {
  return CLIENT_XP_ACTIONS.find((a) => a.key === key);
}

// ─── Levels ──────────────────────────────────────────────────────────────────

export interface ClientXpLevel {
  level: number;
  title: string;
  threshold: number;
  badge: string;
  hint: string;
  tone: "neutral" | "bronze" | "silver" | "gold" | "diamond";
}

export const CLIENT_XP_LEVELS: ClientXpLevel[] = [
  { level: 1, title: "Débutant.e",  threshold: 0,    badge: "🌱", hint: "Tu démarres ton parcours",          tone: "neutral" },
  { level: 2, title: "En route",    threshold: 100,  badge: "🥉", hint: "Tu prends tes marques",             tone: "bronze" },
  { level: 3, title: "Engagé.e",    threshold: 300,  badge: "🥈", hint: "Tu maîtrises ton espace",           tone: "silver" },
  { level: 4, title: "Champion.ne", threshold: 700,  badge: "🥇", hint: "Régularité au top",                 tone: "gold" },
  { level: 5, title: "Légende",     threshold: 1500, badge: "💎", hint: "Référence de la communauté",        tone: "diamond" },
];

export function levelTone(level: number): ClientXpLevel["tone"] {
  return CLIENT_XP_LEVELS.find((l) => l.level === level)?.tone ?? "neutral";
}
