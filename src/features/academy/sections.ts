// Chantier Academy Phase 1 (2026-04-26).
// Definition statique des 8 sections du parcours Lor'Squad Academy.
// Les `steps` sont vides en Phase 1 — ils seront remplis section par section
// en Phase 2 (un chantier par section).

import type { TutorialStep } from "../onboarding/types";
import { getDemoClientId } from "./utils/getDemoClientId";
/** Builder partage : ouvre la fiche du 1er client dispo, sinon /clients. */
async function routeToClientFiche(): Promise<string> {
  const id = await getDemoClientId();
  return id ? `/clients/${id}` : "/clients";
}

/**
 * Identifiant utilise par useTourProgress et user_tour_progress.tour_key
 * pour scoper la progression du parcours Academy.
 */
export const ACADEMY_TOUR_KEY = "academy";

export interface AcademySection {
  /** Identifiant stable, utilise en URL (/academy/:sectionId) et en cle de progression */
  id: string;
  /** Titre long affiche dans la liste de l onglet Academy */
  title: string;
  /** Label court (sidebar, breadcrumb) */
  shortLabel: string;
  /** Phrase descriptive affichee sous le titre */
  description: string;
  /** Duree estimee en minutes (utilisee pour le total + l estimation "il te reste X min") */
  estimatedDurationMinutes: number;
  /** Emoji ou caractere unique servant d icone visuelle */
  icon: string;
  /** Etapes du tutoriel interactif. Vide en Phase 1, rempli en Phase 2. */
  steps: TutorialStep[];
}

export const ACADEMY_SECTIONS: AcademySection[] = [
  {
    id: "welcome",
    title: "Bienvenue & profil distri",
    shortLabel: "Profil",
    description: "Renseigne ton profil pour que ton coach et ton équipe te reconnaissent.",
    estimatedDurationMinutes: 2,
    icon: "👋",
    steps: [
      {
        id: "intro",
        title: "Bienvenue dans Lor'Squad 👋",
        body: "On va remplir ton profil ensemble. Ces infos servent à relier ton compte à ton équipe Herbalife et à ton coach. Compte 2 minutes.",
        placement: "center",
        route: "/parametres",
      },
      {
        id: "name",
        target: '[data-tour-id="profile-name"]',
        placement: "bottom",
        route: "/parametres",
        title: "Ton nom complet",
        body: "Vérifie l'orthographe — c'est le nom que tes clients verront en haut de leur app personnelle.",
        manualAdvance: true,
      },
      {
        id: "herbalife-id",
        target: '[data-tour-id="profile-herbalife-id"]',
        placement: "bottom",
        route: "/parametres",
        title: "Ton ID Herbalife",
        body: "Ton identifiant officiel à 10 caractères : 2 chiffres + 1 lettre + 7 chiffres (ex : 21Y0103610). Tu le trouves sur ton compte MyHerbalife.",
        manualAdvance: true,
        requiredRole: "distributor",
      },
      {
        id: "sponsor",
        target: '[data-tour-id="profile-sponsor"]',
        placement: "bottom",
        route: "/parametres",
        title: "L'ID de ton sponsor Herbalife",
        body: "Même format que ton ID. C'est l'identifiant de la personne qui t'a parrainé chez Herbalife. Indispensable pour ton lignage officiel.",
        manualAdvance: true,
        requiredRole: "distributor",
      },
      {
        id: "coach-referent",
        target: '[data-tour-id="profile-coach-referent"]',
        placement: "bottom",
        route: "/parametres",
        title: "Ton coach référent dans Lor'Squad",
        body: "C'est la personne qui te suit au quotidien dans l'app. Souvent ton sponsor. C'est elle qu'on contactera pour t'aider si besoin.",
        manualAdvance: true,
        requiredRole: "distributor",
      },
      {
        id: "save",
        target: '[data-tour-id="profile-save"]',
        placement: "top",
        route: "/parametres",
        title: "Sauvegarde ton profil",
        body: "Pense à enregistrer avant de quitter cette section. Ton profil est complet, tu peux passer à la suite.",
        manualAdvance: true,
        isLast: true,
        nextLabel: "Section terminée",
      },
    ],
  },
  {
    id: "app-tour",
    title: "L'app en 60 secondes",
    shortLabel: "Tour",
    description: "Découvre les 5 onglets principaux et où chaque chose se trouve.",
    estimatedDurationMinutes: 1,
    icon: "🧭",
    steps: [
      {
        id: "intro",
        title: "Bienvenue sur Lor'Squad",
        body: "Je vais te faire un tour rapide de l'app en 1 minute. Tu peux skip à tout moment.",
        placement: "center",
      },
      {
        id: "copilote",
        target: '[data-tour-id="nav-copilote"]',
        placement: "bottom",
        title: "Le Co-pilote",
        body: "Ton tableau de bord. Tu retrouves ici tes RDV du jour, tes anniversaires de clients et ton suivi de volume PV.",
        manualAdvance: true,
      },
      {
        id: "agenda",
        target: '[data-tour-id="nav-agenda"]',
        placement: "bottom",
        title: "L'agenda",
        body: "Tous tes rendez-vous. Tu peux y caler un nouveau RDV, voir ceux à venir et marquer ceux qui sont passés.",
        manualAdvance: true,
      },
      {
        id: "messagerie",
        target: '[data-tour-id="nav-messagerie"]',
        placement: "bottom",
        title: "La messagerie",
        body: "Tes échanges avec tes clients. Le compteur rouge indique les messages non lus.",
        manualAdvance: true,
      },
      {
        id: "clients",
        target: '[data-tour-id="nav-clients"]',
        placement: "bottom",
        title: "Les dossiers clients",
        body: "Ta base clients : leurs bilans, leur progression, leurs RDV à venir. C'est ton outil de travail principal.",
        manualAdvance: true,
      },
      {
        id: "pv",
        target: '[data-tour-id="nav-pv"]',
        placement: "bottom",
        title: "Le suivi PV",
        body: "Ton volume de points Herbalife. Tu vois ce qu'il te reste à faire pour atteindre ton seuil mensuel.",
        manualAdvance: true,
      },
      {
        id: "new-bilan",
        target: '[data-tour-id="nav-new-bilan"]',
        placement: "top",
        title: "Le bouton qui sert tous les jours",
        body: "Crée un nouveau bilan client en un clic. Tu verras ça en détail dans les prochaines sections.",
        isLast: true,
        manualAdvance: true,
        nextLabel: "Section terminée",
      },
    ],
  },
  {
    id: "first-bilan",
    title: "Crée ton premier bilan (et ton premier client)",
    shortLabel: "Premier bilan",
    description: "Le bouton + Nouveau bilan crée le client et le bilan initial en un seul flow.",
    estimatedDurationMinutes: 4,
    icon: "📋",
    steps: [
      {
        id: "intro",
        title: "Le bilan, ta porte d'entrée",
        body: "Le bilan, c'est le rituel central de ton activité. Il crée le client ET son premier état des lieux en un seul parcours guidé. 13 étapes dynamiques qui s'adaptent à l'objectif (les sportifs ont 2 étapes en plus). Compte 8 à 12 minutes en RDV réel — Lor'Squad fait tout le boulot administratif, toi tu te concentres sur l'écoute.",
        placement: "center",
      },
      {
        id: "open-form",
        target: '[data-tour-id="nav-new-bilan"]',
        placement: "top",
        title: "Le bouton gold qui sert tous les jours",
        body: "Ce CTA ouvre le wizard. Pas besoin de créer le client avant : il est créé automatiquement à la fin du bilan, avec sa fiche complète et son accès personnel.",
        manualAdvance: true,
      },
      {
        id: "client-info",
        title: "Étape 1 — Qui est ton client ?",
        body: "Prénom, nom, téléphone, email, sexe, âge. Si la personne existe déjà dans ta base (téléphone reconnu), Lor'Squad t'ouvre sa fiche et tu fais un suivi au lieu d'un bilan initial. Sinon création auto. Le téléphone sert ensuite à envoyer le récap par WhatsApp en 1 clic.",
        placement: "center",
      },
      {
        id: "body-scan",
        title: "Le body scan — 4 chiffres qui parlent",
        body: "Poids, masse grasse, hydratation, masse musculaire. Ces 4 indicateurs deviennent ton tableau de bord pour montrer les progrès dans le temps. Source idéale : balance Tanita ou impédancemètre (mais l'estimation visuelle marche pour démarrer). Bonus : âge métabolique, masse osseuse et graisse viscérale si la balance les donne.",
        placement: "center",
      },
      {
        id: "objective",
        title: "L'objectif change tout le programme",
        body: "Deux univers : perte de poids (programme nutrition standard) ou sport (6 sous-objectifs : prise de masse, force, sèche, endurance, fitness, compétition). Pour le sport, 2 étapes en plus arrivent : profil sport (fréquence, types) et apports actuels (protéines par moment de la journée). Toutes les recommandations produits qui suivent sont calibrées sur ce choix.",
        placement: "center",
      },
      {
        id: "submit",
        title: "Le programme se génère tout seul",
        body: "Lor'Squad propose les bons produits selon le bilan : Formula 1, CR7 Drive, Rebuild Strength, créatine, collagène, hydrate, plus les boosters cliquables (avec stepper de quantité par produit). Détection automatique de 6 alertes (hydratation faible, protéines basses, sommeil court, masse musculaire, snack manquant, fréquence sport incohérente) qu'il faut acquitter avant validation. Pas de bilan validé sans alertes lues.",
        placement: "center",
      },
      {
        id: "outro",
        title: "Page remerciement = effet wahou",
        body: "Une fois validé, tu arrives sur une page plein écran : QR code géant à scanner + boutons WhatsApp / SMS / Telegram + parrainage + lien Avis Google. Le client a son app personnelle en 1 scan, son programme s'y affiche, ses RDV aussi. Astuce : bascule en mode sombre juste avant cette page, le QR ressort spectaculaire.",
        placement: "center",
        isLast: true,
        nextLabel: "Section terminée",
      },
    ],
  },
  {
    id: "program",
    title: "Le Programme bilan",
    shortLabel: "Programme",
    description: "Recommande des produits, ajoute des boosters, génère le récap à envoyer au client.",
    estimatedDurationMinutes: 3,
    icon: "🛒",
    steps: [
      {
        id: "intro",
        title: "Le Programme bilan",
        body: "Une fois le bilan fait, tu vas générer un programme produits adapté à ton client.",
        placement: "center",
      },
      {
        id: "open-program",
        target: '[data-tour-id="nav-clients"]',
        placement: "bottom",
        title: "Ouvre la fiche du client",
        body: "Sur Dossiers clients, clique sur un client pour voir son bilan, ses produits, son agenda.",
        manualAdvance: true,
      },
      {
        id: "recommendations",
        target: '[data-tour-id="program-recommendations"]',
        placement: "top",
        routeBuilder: routeToClientFiche,
        title: "Les produits recommandés",
        body: "Sur la fiche du client, ce bloc liste sa sélection actuelle. Lor'Squad la propose selon son objectif et son body scan.",
        manualAdvance: true,
      },
      {
        id: "boosters",
        title: "Les boosters sport",
        body: "Pour les clients en objectif sport, tu peux ajouter des produits complémentaires (Rebuild, CR7, créatine) en un clic depuis le bilan.",
        placement: "center",
      },
      {
        id: "generate",
        title: "Génère le récap à envoyer",
        body: "À la fin du bilan, un récap propre est généré avec un lien partageable WhatsApp / Telegram pour ton client.",
        placement: "center",
      },
      {
        id: "outro",
        title: "Programme maîtrisé",
        body: "Ton client va recevoir un programme propre et personnalisé. C'est ce qui fait la différence.",
        placement: "center",
        isLast: true,
        nextLabel: "Section terminée",
      },
    ],
  },
  {
    id: "agenda",
    title: "Agenda & RDV",
    shortLabel: "Agenda",
    description: "Cale un rendez-vous, marque-le comme fait, comprends le suivi automatique.",
    estimatedDurationMinutes: 2,
    icon: "📅",
    steps: [
      {
        id: "intro",
        title: "L'agenda, ton GPS",
        body: "Bilans, suivis et prospects sur un calendrier unique. Tu filtres par type (clients / prospects / suivis), par date (aujourd'hui, semaine, mois) et par statut. La page liste tous tes prochains rendez-vous classés par date — tu vois en un coup d'œil ce qui arrive.",
        placement: "center",
      },
      {
        id: "new-rdv",
        target: '[data-tour-id="agenda-new-rdv"]',
        placement: "bottom",
        route: "/agenda",
        title: "Cale un RDV en 30 secondes",
        body: "Choisis un client + une date + une heure. Le lieu (La Base — Verdun) est pré-rempli. Au save, le client reçoit une notif push + un rappel automatique 24h avant. Côté coach, tu reçois aussi un push 5 minutes avant chaque RDV (cron rdv-imminent-notifier).",
        manualAdvance: true,
      },
      {
        id: "upcoming",
        target: '[data-tour-id="agenda-upcoming"]',
        placement: "top",
        route: "/agenda",
        title: "Côté client : Google Agenda + .ics",
        body: "Sur la card RDV de son app, le client a 4 actions : « Ajouter au calendrier » (lien Google Calendar direct, ouvre l'agenda du téléphone), « Fichier .ics » (téléchargement universel iOS/Android/Outlook), « Itinéraire » (Google Maps La Base) et « Modifier » (envoie une demande de changement). Une checkbox « Ajouté à mon agenda » permet au client de confirmer — tu vois la confirmation côté fiche coach.",
        manualAdvance: true,
      },
      {
        id: "follow-up",
        title: "Le suivi automatique J+1 → J+10",
        body: "Après chaque bilan, Lor'Squad note 4 checkpoints sur ton dashboard Co-pilote : J+1 (message bienvenue), J+3 (ressentis), J+7 (VIP), J+10 (check-in énergie). Tu reçois un digest tous les matins à 7h (cron morning-suivis-digest) avec les actions du jour. Les clients « Pas démarré » sont automatiquement exclus du protocole — pas de spam de relances. Période de grâce de 15 min : un RDV reste « actif » 15 minutes après l'heure prévue (utile si le client est en retard ou si tu es en RDV).",
        placement: "center",
      },
      {
        id: "outro",
        title: "Le rythme sous contrôle",
        body: "Tu sais caler, exporter, suivre, relancer. Plus aucun client ne passe entre les mailles, plus aucun RDV oublié. C'est ce qui transforme un coach occupé en un coach pro.",
        placement: "center",
        isLast: true,
        nextLabel: "Section terminée",
      },
    ],
  },
  {
    id: "messages-and-clients",
    title: "Messagerie & dossiers clients",
    shortLabel: "Messages",
    description: "Envoie un message, filtre tes clients, archive ceux qui ne suivent plus.",
    estimatedDurationMinutes: 2,
    icon: "💬",
    steps: [
      {
        id: "intro",
        title: "Reste en contact",
        body: "Deux outils complémentaires : la messagerie pour échanger, les dossiers clients pour gérer.",
        placement: "center",
      },
      {
        id: "messages-tab",
        target: '[data-tour-id="nav-messagerie"]',
        placement: "bottom",
        title: "L'onglet Messagerie",
        body: "Toutes les demandes reçues de tes clients atterrissent ici. Tu réponds en un clic, par WhatsApp, SMS ou directement dans l'app.",
        manualAdvance: true,
      },
      {
        id: "filter-clients",
        target: '[data-tour-id="clients-filter-active"]',
        placement: "bottom",
        route: "/clients",
        title: "Filtre tes clients",
        body: "Actifs, en pause, arrêtés, fragiles — tu retrouves vite les bonnes personnes.",
        manualAdvance: true,
      },
      {
        id: "archive",
        title: "Archiver un client",
        body: "Quand un client ne suit plus, passe-le en Arrêté. Il reste dans ta base mais ne pollue plus ton dashboard.",
        placement: "center",
      },
      {
        id: "outro",
        title: "Communication fluide",
        body: "Tes échanges sont historisés, tes dossiers sont organisés. Plus de Post-it qui traînent.",
        placement: "center",
        isLast: true,
        nextLabel: "Section terminée",
      },
    ],
  },
  {
    id: "client-app",
    title: "L'app client (la vitrine)",
    shortLabel: "App client",
    description: "Active le partage, copie le lien, comprends comment ton client laisse un avis Google.",
    estimatedDurationMinutes: 2,
    icon: "✨",
    steps: [
      {
        id: "intro",
        title: "L'app client, ta vitrine",
        body: "Chaque client a sa propre app PWA : il y voit son bilan, son évolution, ses RDV. C'est ton outil de fidélisation.",
        placement: "center",
      },
      {
        id: "open-clients",
        target: '[data-tour-id="nav-clients"]',
        placement: "bottom",
        title: "Ouvre un dossier client",
        body: "Pour activer l'app d'un client, on commence par ouvrir sa fiche depuis Dossiers clients.",
        manualAdvance: true,
      },
      {
        id: "send-access",
        target: '[data-tour-id="client-send-access"]',
        placement: "bottom",
        routeBuilder: routeToClientFiche,
        title: "Active le partage",
        body: "Le bouton gold Envoyer l'accès à l'app génère un lien personnel pour le client.",
        manualAdvance: true,
      },
      {
        id: "copy-link",
        title: "Copie et partage",
        body: "La modale d'envoi te propose 4 canaux : QR code à scanner, WhatsApp, SMS, ou copier-coller.",
        placement: "center",
      },
      {
        id: "google-review",
        title: "Le bouton avis Google",
        body: "Dans son app, le client peut laisser un avis Google en un clic. C'est ton meilleur outil de croissance organique.",
        placement: "center",
      },
      {
        id: "outro",
        title: "App client activée",
        body: "Plus le client utilise son app, plus il progresse. Plus il progresse, plus il parle de toi.",
        placement: "center",
        isLast: true,
        nextLabel: "Section terminée",
      },
    ],
  },
  {
    id: "rituals",
    title: "Les rituels du distri",
    shortLabel: "Rituels",
    description: "Installe l'app sur ton téléphone et apprends à suivre ton volume PV.",
    estimatedDurationMinutes: 2,
    icon: "🎯",
    steps: [
      {
        id: "intro",
        title: "Tes rituels quotidiens",
        body: "Deux habitudes à prendre dès le départ : installer l'app et suivre ton volume PV.",
        placement: "center",
      },
      {
        id: "pwa-install",
        target: '[data-tour-id="pwa-install"]',
        placement: "top",
        title: "Installe Lor'Squad sur ton téléphone",
        body: "Ce bouton ajoute l'app à ton écran d'accueil. Tu auras Lor'Squad comme une app native, avec notifs push. Sur iPhone Safari, utilise plutôt Partage > Sur l'écran d'accueil.",
        manualAdvance: true,
      },
      {
        id: "pv-gauge",
        target: '[data-tour-id="pv-gauge"]',
        placement: "top",
        route: "/co-pilote",
        title: "Ton volume PV",
        body: "Sur ton Co-pilote, ce bloc te montre ton compteur de points Herbalife du mois et ce qu'il te reste à faire.",
        manualAdvance: true,
      },
      {
        id: "pv-detail",
        target: '[data-tour-id="nav-pv"]',
        placement: "bottom",
        title: "Le détail de ton PV",
        body: "Cet onglet montre l'historique de tes points et te projette sur le mois.",
        manualAdvance: true,
      },
      {
        id: "outro",
        title: "Tu es prêt 🎉",
        body: "Bravo, tu as terminé l'Academy. Tu as toutes les clés pour faire de Lor'Squad ton outil quotidien.",
        placement: "center",
        isLast: true,
        nextLabel: "Terminer l'Academy",
      },
    ],
  },
];

// ============================================================================
// Helpers utilitaires
// ============================================================================

export const ACADEMY_TOTAL_DURATION_MINUTES = ACADEMY_SECTIONS.reduce(
  (acc, s) => acc + s.estimatedDurationMinutes,
  0,
);

export const ACADEMY_SECTION_COUNT = ACADEMY_SECTIONS.length;

export function getAcademySectionById(id: string): AcademySection | undefined {
  return ACADEMY_SECTIONS.find((s) => s.id === id);
}

export function getAcademySectionIndex(id: string): number {
  return ACADEMY_SECTIONS.findIndex((s) => s.id === id);
}

/**
 * Donne la section "courante" (a reprendre) selon un last_step global Academy.
 * Le last_step ici est l index global (0..N-1) de la derniere section travaillee,
 * pas un index d etape interne a une section.
 */
export function getCurrentAcademySection(lastStep: number): AcademySection {
  const safe = Math.max(0, Math.min(lastStep, ACADEMY_SECTIONS.length - 1));
  return ACADEMY_SECTIONS[safe];
}
