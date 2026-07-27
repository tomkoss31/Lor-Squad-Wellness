// =============================================================================
// bbcPrelaunch — les 6 semaines de pré-lancement d'un club BBC.
//
// C'est LE parcours duplicable : ce qu'on déroule à un distri avant qu'il
// ouvre. Source : Notion « 07 — Les 6 semaines de pré-lancement » + Playbook.
// Objectif final : ouvrir avec ~30 membres et un agenda plein d'évaluations.
//
// `gate: true` = non négociable. Tant qu'une porte n'est pas cochée, le club
// n'est pas considéré comme prêt à ouvrir (règle du modèle : on n'ouvre pas
// un club vide, c'est ce qui fait la différence entre un club qui vit et un
// club qui ferme).
// =============================================================================

export interface PrelaunchTask {
  key: string;
  week: number;
  title: string;
  why: string;
  gate?: boolean;
}

export interface PrelaunchWeek {
  week: number;
  title: string;
  subtitle: string;
}

export const PRELAUNCH_WEEKS: PrelaunchWeek[] = [
  { week: 1, title: "Semaine 1 — Le terrain", subtitle: "Tu poses les fondations : ta zone, ta liste, ton équipe." },
  { week: 2, title: "Semaine 2 — Ton marché chaud", subtitle: "Tu commences par ceux qui te connaissent déjà." },
  { week: 3, title: "Semaine 3 — Le quartier", subtitle: "Tu te rends visible autour du futur club." },
  { week: 4, title: "Semaine 4 — La vague de cobayes", subtitle: "Le gros volume : c'est ici que tout se joue." },
  { week: 5, title: "Semaine 5 — Le club tourne à blanc", subtitle: "Tu fais tes évaluations dans le vrai lieu." },
  { week: 6, title: "Semaine 6 — Dernière ligne droite", subtitle: "Tu remplis le jour J." },
];

export const PRELAUNCH_TASKS: PrelaunchTask[] = [
  // ── Semaine 1 ─────────────────────────────────────────────────────────────
  { key: "plan_equipe", week: 1, title: "Partager le plan à ton équipe", why: "Un pré-lancement se fait à plusieurs — personne n'ouvre seul." },
  { key: "zone_15km", week: 1, title: "Définir ta zone (rayon 15 km)", why: "Tes membres viennent le matin : au-delà, ils ne viendront pas tous les jours." },
  { key: "liste_200", week: 1, title: "Écrire ta liste de 200 noms", why: "Ta matière première. Sans liste, pas d'invitations, pas de club.", gate: true },
  { key: "agenda_invit", week: 1, title: "Bloquer 10 h d'invitation par semaine", why: "Si ce n'est pas dans l'agenda, ça ne se fait pas." },

  // ── Semaine 2 ─────────────────────────────────────────────────────────────
  { key: "clients_existants", week: 2, title: "Contacter tous tes clients actuels", why: "Ils te connaissent déjà : ce sont tes premiers membres." },
  { key: "shake_party", week: 2, title: "Organiser une shake party", why: "Faire goûter en groupe : le produit vend mieux que le discours." },
  { key: "b2b", week: 2, title: "Démarcher 5 commerces autour du club", why: "Les commerçants du quartier deviennent membres… et prescripteurs." },

  // ── Semaine 3 ─────────────────────────────────────────────────────────────
  { key: "tracts", week: 3, title: "Distribuer les tracts du quartier", why: "Le voisinage doit savoir qu'un club ouvre." },
  { key: "teasing", week: 3, title: "Lancer le teasing sur les réseaux", why: "Le compte à rebours crée l'attente." },
  { key: "local_pret", week: 3, title: "Préparer le local (ardoise, balance, déco)", why: "Un club prêt = des évaluations qui peuvent démarrer tout de suite." },

  // ── Semaine 4 ─────────────────────────────────────────────────────────────
  { key: "cobayes_200", week: 4, title: "Envoyer 200 messages cobayes (en équipe)", why: "Le seul chiffre qui compte de tout le pré-lancement.", gate: true },
  { key: "ebe_20", week: 4, title: "Réserver 20 évaluations d'entraînement", why: "On s'entraîne AVANT d'ouvrir, pas sur les vrais membres.", gate: true },
  { key: "page_fb", week: 4, title: "Créer la page du club (réseaux)", why: "L'adresse où on envoie les curieux." },

  // ── Semaine 5 ─────────────────────────────────────────────────────────────
  { key: "club_ebe", week: 5, title: "Ouvrir le club pour les évaluations", why: "Le lieu devient réel dans la tête des gens." },
  { key: "sample_3", week: 5, title: "Faire 3 sample parties", why: "Trois occasions de faire goûter à des groupes entiers." },
  { key: "invit_1h", week: 5, title: "Tenir 1 h d'invitation par jour", why: "Le rythme ne baisse pas parce que l'ouverture approche." },

  // ── Semaine 6 ─────────────────────────────────────────────────────────────
  { key: "membres_30", week: 6, title: "Atteindre 30 membres inscrits pour l'ouverture", why: "Un club qui ouvre plein reste plein. Un club qui ouvre vide ferme.", gate: true },
  { key: "rituels_planifies", week: 6, title: "Planifier tes rituels (appels, ateliers)", why: "Les rendez-vous du club existent dès la première semaine." },
  { key: "equipe_prete", week: 6, title: "Répartir les rôles du jour J", why: "Qui accueille, qui pèse, qui sert : rien d'improvisé." },
];

export const PRELAUNCH_GATES = PRELAUNCH_TASKS.filter((t) => t.gate).map((t) => t.key);
