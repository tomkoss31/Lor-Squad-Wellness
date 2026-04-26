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
    description: "Renseigne ton ID Herbalife, ton sponsor et ton coach référent.",
    estimatedDurationMinutes: 2,
    icon: "👋",
    steps: [
      {
        id: "intro",
        title: "Bienvenue dans Lor'Squad",
        body: "On va remplir ton profil ensemble. Ça permettra à ton coach et à ton équipe de te reconnaître.",
        placement: "center",
        route: "/settings",
      },
      {
        id: "name",
        target: '[data-tour-id="profile-name"]',
        placement: "bottom",
        title: "Ton nom",
        body: "Vérifie qu'il est bien orthographié. C'est ce que tes clients verront en haut de leur app.",
        manualAdvance: true,
      },
      {
        id: "herbalife-id",
        target: '[data-tour-id="profile-herbalife-id"]',
        placement: "bottom",
        title: "Ton ID Herbalife",
        body: "Ton identifiant officiel (8 chiffres). Il relie ton compte à l'écosystème Herbalife.",
        manualAdvance: true,
      },
      {
        id: "sponsor",
        target: '[data-tour-id="profile-sponsor"]',
        placement: "bottom",
        title: "Ton sponsor",
        body: "La personne qui t'a fait découvrir Herbalife. Indique son ID pour relier ton lignage.",
        manualAdvance: true,
      },
      {
        id: "coach-referent",
        target: '[data-tour-id="profile-coach-referent"]',
        placement: "bottom",
        title: "Ton coach référent",
        body: "Le coach interne qui te suit. C'est lui qu'on contactera si tu as besoin d'aide.",
        manualAdvance: true,
      },
      {
        id: "save",
        target: '[data-tour-id="profile-save"]',
        placement: "top",
        title: "Sauvegarde ton profil",
        body: "Pense à enregistrer avant de partir. Tu peux revenir modifier à tout moment.",
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
        title: "Crée ton premier bilan",
        body: "Le bilan, c'est le point de départ de tout. Il crée le client ET son premier état des lieux en un seul flow.",
        placement: "center",
      },
      {
        id: "open-form",
        target: '[data-tour-id="nav-new-bilan"]',
        placement: "top",
        title: "Lance un nouveau bilan",
        body: "Ce bouton t'ouvre le formulaire de création.",
        manualAdvance: true,
      },
      {
        id: "client-info",
        title: "Les infos client",
        body: "Première étape du formulaire : prénom, nom, téléphone. Le client est créé en même temps que le bilan, pas besoin de l'ajouter avant.",
        placement: "center",
      },
      {
        id: "body-scan",
        title: "Le body scan",
        body: "Poids, masse grasse, hydratation, masse musculaire. Ce sont les chiffres clés que tu suivras dans le temps.",
        placement: "center",
      },
      {
        id: "objective",
        title: "L'objectif du client",
        body: "Sport ou perte de poids. Ce choix oriente toutes les recommandations produits qui suivent.",
        placement: "center",
      },
      {
        id: "submit",
        title: "Sauvegarde et passe à la suite",
        body: "Une fois le bilan validé, tu arrives sur une page de remerciement avec un lien à partager au client.",
        placement: "center",
      },
      {
        id: "outro",
        title: "Premier bilan en poche",
        body: "Tu maîtrises l'essentiel. La prochaine section te montrera comment générer un programme produits depuis ce bilan.",
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
        title: "Ton agenda",
        body: "C'est ici que tu cales tous tes RDV avec tes clients : bilans, suivis, premiers contacts.",
        placement: "center",
      },
      {
        id: "new-rdv",
        target: '[data-tour-id="agenda-new-rdv"]',
        placement: "bottom",
        route: "/agenda",
        title: "Crée un nouveau RDV",
        body: "Choisis un client, une date, une heure. Le client recevra une notif et un rappel automatique.",
        manualAdvance: true,
      },
      {
        id: "upcoming",
        target: '[data-tour-id="agenda-upcoming"]',
        placement: "top",
        route: "/agenda",
        title: "Tes RDV à venir",
        body: "La liste de tes prochains rendez-vous, classés par date. Tu peux filtrer par type et statut au-dessus.",
        manualAdvance: true,
      },
      {
        id: "follow-up",
        title: "Le suivi automatique",
        body: "Après chaque bilan, Lor'Squad te rappelle de relancer ton client à J+1, J+3, J+7, J+10. Tu n'oublies plus personne.",
        placement: "center",
      },
      {
        id: "outro",
        title: "Agenda maîtrisé",
        body: "Tu sais caler, suivre, et relancer. Le rythme de ton activité est sous contrôle.",
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
