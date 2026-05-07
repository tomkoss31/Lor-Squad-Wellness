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
  // 1x lifetime — retour Thomas 2026-05-08 : la plupart des actions
  // tab_* / message / etc. passent en lifetime (au lieu de 1x/jour)
  // pour ne pas faire de la presence quotidienne une obligation.
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
  | "tab_agenda"            // V2 lifetime (avant : 1x/jour)
  | "tab_pv"                // V2 lifetime (avant : 1x/jour)
  | "tab_evolution"         // V2 lifetime (avant : 1x/jour)
  | "tab_conseils"          // V2 lifetime (avant : 1x/jour)
  | "message_sent"          // V2 lifetime (avant : 1x/jour)
  // 1x/jour (mood reste daily — c est un check-in volontaire)
  | "mood_checkin"
  // 1x/semaine
  | "measurement_added"     // V2 weekly (avant : 1x/jour)
  // no cap
  | "photo_uploaded"
  // VIP V2 (2026-04-28) — actions du programme Client Privilegie
  | "vip_sandbox_completed"
  | "vip_intentions_filled"
  | "vip_first_referral"
  | "vip_silver_reached"
  | "vip_gold_reached"
  | "vip_ambassador_reached";
// V2 (2026-05-08) — `weekly_weigh_in` retire du tableau (Thomas a
// supprime l onglet Pesee hebdomadaire). La SQL function garde la
// branche pour compat mais l action n est plus listee dans l UI.

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
    hint: "La communauté La Base 360",
    xp: 30,
    cap: "lifetime",
    category: "discover",
  },

  // ─── Decouvrir les onglets (1x lifetime) — V2 retour Thomas 2026-05-08 ────
  // Avant : 1×/jour (presence quotidienne obligatoire). Apres : 1×
  // lifetime — on recompense la decouverte, pas l obligation. Le bonus
  // "à chaque RDV" sera ajoute en V3 via un trigger create_followup.
  {
    key: "tab_agenda",
    emoji: "📅",
    label: "Vérifier ton agenda RDV",
    hint: "1×, juste pour découvrir",
    xp: 5,
    cap: "lifetime",
    category: "discover",
  },
  {
    key: "tab_evolution",
    emoji: "📈",
    label: "Consulter ton évolution",
    hint: "Voir tes progrès graphique",
    xp: 5,
    cap: "lifetime",
    category: "discover",
  },
  {
    key: "tab_conseils",
    emoji: "💡",
    label: "Lire tes conseils du jour",
    hint: "Assiette idéale + routine",
    xp: 5,
    cap: "lifetime",
    category: "discover",
  },
  {
    key: "tab_pv",
    emoji: "🛒",
    label: "Vérifier tes produits",
    hint: "Programme + recommandés",
    xp: 5,
    cap: "lifetime",
    category: "discover",
  },

  // ─── Daily (1x/jour) — uniquement le check-in mood ────────────────────────
  {
    key: "mood_checkin",
    emoji: "😊",
    label: "Comment tu te sens aujourd'hui",
    hint: "Check-in mood quotidien",
    xp: 5,
    cap: "daily",
    category: "daily",
  },

  // ─── Engage (lifetime / weekly) ───────────────────────────────────────────
  {
    key: "message_sent",
    emoji: "💬",
    label: "Écrire à ton coach",
    hint: "1ère prise de contact",
    xp: 15,
    cap: "lifetime",
    category: "engage",
  },
  {
    key: "measurement_added",
    emoji: "📏",
    label: "Saisir une mensuration",
    hint: "Cou / poitrine / taille / hanches…",
    xp: 10,
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

  // ─── VIP V2 (2026-04-28) — Programme Client Privilegie ───────────────────
  {
    key: "vip_sandbox_completed",
    emoji: "🎮",
    label: "Découvrir le programme VIP",
    hint: "Lance le calculateur de remise",
    xp: 20,
    cap: "lifetime",
    category: "discover",
  },
  {
    key: "vip_intentions_filled",
    emoji: "📋",
    label: "Lister 3+ prospects à recommander",
    hint: "Aide ton coach à grandir avec toi",
    xp: 30,
    cap: "lifetime",
    category: "engage",
  },
  {
    key: "vip_first_referral",
    emoji: "🎯",
    label: "1er filleul confirmé",
    hint: "Ton 1er ami démarre Herbalife",
    xp: 100,
    cap: "lifetime",
    category: "milestone",
  },
  {
    key: "vip_silver_reached",
    emoji: "🥈",
    label: "Atteindre Silver (-25 %)",
    hint: "100 pts cumulés",
    xp: 200,
    cap: "lifetime",
    category: "milestone",
  },
  {
    key: "vip_gold_reached",
    emoji: "🥇",
    label: "Atteindre Gold (-35 %)",
    hint: "500 pts cumulés — top client",
    xp: 500,
    cap: "lifetime",
    category: "milestone",
  },
  {
    key: "vip_ambassador_reached",
    emoji: "💎",
    label: "Atteindre Ambassadeur (-42 %)",
    hint: "1 000 pts en 3 mois",
    xp: 1000,
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
