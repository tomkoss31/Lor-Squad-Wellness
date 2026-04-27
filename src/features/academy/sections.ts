// Chantier Academy Phase 1 (2026-04-26).
// Definition statique des 8 sections du parcours Lor'Squad Academy.
// Les `steps` sont vides en Phase 1 — ils seront remplis section par section
// en Phase 2 (un chantier par section).

import type { TutorialStep } from "../onboarding/types";
/**
 * Pages démo Academy (2026-04-28) : on utilise des mockups dédiés
 * (/academy/demo/*) au lieu de pointer la vraie data du user.
 * Avantages : pas de risque de pollution DB, expérience identique pour
 * tous les users (même sans clients), spotlights toujours alignés.
 */
const DEMO_FICHE_CLIENT_ROUTE = "/academy/demo/fiche-client";
const DEMO_FICHE_CLIENT_WITH_ACCESS_MODAL = "/academy/demo/fiche-client?openAccessModal=true";
const DEMO_AGENDA_ROUTE = "/academy/demo/agenda";

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
        body: "On commence par ton profil. C'est ce qui relie ton compte à ton lignage Herbalife (pour les commissions) ET à ton coach référent dans Lor'Squad (pour le suivi opérationnel). Deux choses différentes, on les sépare ici. Compte 2 minutes.",
        placement: "center",
        route: "/parametres",
        illustrationKey: "wave",
      },
      {
        id: "name",
        target: '[data-tour-id="profile-name"]',
        placement: "bottom",
        route: "/parametres",
        title: "Ton nom complet",
        body: "Vérifie l'orthographe — c'est ce nom qui s'affiche en haut de l'app personnelle de tes clients (« Coach Thomas », « Coach Mandy »). Évite les pseudos, garde un nom pro.",
        manualAdvance: true,
      },
      {
        id: "herbalife-id",
        target: '[data-tour-id="profile-herbalife-id"]',
        placement: "bottom",
        route: "/parametres",
        title: "Ton ID Herbalife (commissions)",
        body: "Ton identifiant officiel 10 caractères : 2 chiffres + 1 lettre majuscule + 7 chiffres (ex : 21Y0103610). Tu le trouves sur MyHerbalife → Mon profil. Format validé automatiquement par Lor'Squad — si erroné, tu auras une alerte au save. C'est ce qui permet de tracer tes commissions et ton lignage officiel.",
        manualAdvance: true,
        requiredRole: "distributor",
      },
      {
        id: "sponsor",
        target: '[data-tour-id="profile-sponsor"]',
        placement: "bottom",
        route: "/parametres",
        title: "L'ID de ton sponsor Herbalife",
        body: "Même format que ton propre ID. C'est la personne qui t'a parrainé chez Herbalife — elle perçoit les commissions de ta branche dans l'arbre Herbalife. À ne pas confondre avec ton coach référent Lor'Squad au step suivant.",
        manualAdvance: true,
        requiredRole: "distributor",
      },
      {
        id: "coach-referent",
        target: '[data-tour-id="profile-coach-referent"]',
        placement: "bottom",
        route: "/parametres",
        title: "Ton coach référent (suivi Lor'Squad)",
        body: "C'est la personne qui te suit au quotidien dans l'app — tes questions, tes blocages, tes premières ventes. Souvent c'est ton sponsor Herbalife, mais pas obligé : tu choisis dans la liste de tous les utilisateurs actifs (admin, coach ou autre distri). C'est ce contact qui sera notifié si tu décroches.",
        manualAdvance: true,
        requiredRole: "distributor",
      },
      {
        id: "save",
        target: '[data-tour-id="profile-save"]',
        placement: "top",
        route: "/parametres",
        title: "Enregistre tout ça",
        body: "Pense à cliquer Enregistrer avant de quitter — sans ça, rien n'est sauvegardé en base. Tes infos sont synchronisées avec ton équipe (admin Lor'Squad voit ton statut Academy + ton ID Herbalife sur sa fiche distri).",
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
        title: "Lor'Squad en 60 secondes",
        body: "Tour rapide des 6 sections principales et du CTA gold. À la fin tu sauras où chaque chose vit. Skip possible à tout moment, on revient quand tu veux via /academy.",
        placement: "center",
        illustrationKey: "ring-progress",
      },
      {
        id: "copilote",
        target: '[data-tour-id="nav-copilote"]',
        placement: "bottom",
        title: "Co-pilote — ton dashboard du jour",
        body: "Hero action (prochain RDV ou suivi à faire), agenda du jour, suivis protocole en attente, jauge PV mensuelle, 3 mini-stats (clients actifs, semaine, conversion prospects). L'horloge en haut affiche un mood emoji selon l'intensité de ta journée. Admin : un toggle « Vue équipe » permet de voir tout le monde.",
        manualAdvance: true,
      },
      {
        id: "agenda",
        target: '[data-tour-id="nav-agenda"]',
        placement: "bottom",
        title: "Agenda — bilans, suivis, prospects",
        body: "Calendrier unique avec filtres par type (clients / prospects / suivis), date (aujourd'hui / semaine / mois) et statut. Badge gold si tu as des prospects programmés aujourd'hui. CTA « + Nouveau RDV » en haut, RDV pré-remplis avec le lieu La Base — Verdun.",
        manualAdvance: true,
      },
      {
        id: "messagerie",
        target: '[data-tour-id="nav-messagerie"]',
        placement: "bottom",
        title: "Messagerie — inbox + compose",
        body: "Toutes les demandes reçues depuis l'app cliente atterrissent ici (3 onglets : demandes clients, produits, recommandations). Compteur rouge = messages non lus. CTA gold « + Démarrer une conversation » pour initier l'échange. Push notif temps réel via Supabase Realtime.",
        manualAdvance: true,
      },
      {
        id: "clients",
        target: '[data-tour-id="nav-clients"]',
        placement: "bottom",
        title: "Dossiers clients — ta base",
        body: "Tous tes clients filtrés par lifecycle (Actifs, Pas démarrés, En pause, Arrêtés, Perdus, ⚠ Fragiles). Cliquer sur une fiche te donne accès au bilan, à l'évolution body scan, aux produits, à l'agenda et à la messagerie du client. C'est ton outil de travail principal au quotidien.",
        manualAdvance: true,
      },
      {
        id: "pv",
        target: '[data-tour-id="nav-pv"]',
        placement: "bottom",
        title: "Suivi PV — ton volume Herbalife",
        body: "Compteur de points volume du mois en cours, projection sur la fin du mois, historique mensuel. Seuil par défaut 13 000 PV — éditable dans tes paramètres si tu vises un palier supérieur. Badge rouge si tu as des produits en retard à renouveler.",
        manualAdvance: true,
      },
      {
        id: "new-bilan",
        target: '[data-tour-id="nav-new-bilan"]',
        placement: "top",
        title: "Le CTA gold qui sert tous les jours",
        body: "« + Nouveau bilan » : ton geste central. Crée un client + son bilan initial + son programme produits + son lien d'app personnelle, en un seul flow guidé. C'est le sujet entier de la section suivante de l'Academy.",
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
        illustrationKey: "person-card",
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
        target: '[data-tour-id="bilan-client-info"]',
        placement: "bottom",
        route: "/assessments/new?demo=academy",
        title: "Étape 1 — Qui est ton client ?",
        body: "Prénom, nom, téléphone, email, sexe, âge. Si la personne existe déjà dans ta base (téléphone reconnu), Lor'Squad t'ouvre sa fiche et tu fais un suivi au lieu d'un bilan initial. Sinon création auto. Le téléphone sert ensuite à envoyer le récap par WhatsApp en 1 clic.",
        manualAdvance: true,
      },
      {
        id: "body-scan",
        target: '[data-tour-id="bilan-body-scan"]',
        placement: "bottom",
        title: "Le body scan — 4 chiffres qui parlent",
        body: "Poids, masse grasse, hydratation, masse musculaire. Ces 4 indicateurs deviennent ton tableau de bord pour montrer les progrès dans le temps. Source idéale : balance Tanita ou impédancemètre (mais l'estimation visuelle marche pour démarrer). Bonus : âge métabolique, masse osseuse et graisse viscérale si la balance les donne.",
        manualAdvance: true,
      },
      {
        id: "objective",
        target: '[data-tour-id="bilan-objective"]',
        placement: "bottom",
        title: "L'objectif change tout le programme",
        body: "Deux univers : perte de poids (programme nutrition standard) ou sport (6 sous-objectifs : prise de masse, force, sèche, endurance, fitness, compétition). Pour le sport, 2 étapes en plus arrivent : profil sport (fréquence, types) et apports actuels (protéines par moment de la journée). Toutes les recommandations produits qui suivent sont calibrées sur ce choix.",
        manualAdvance: true,
      },
      {
        id: "submit",
        target: '[data-tour-id="bilan-submit"]',
        placement: "top",
        title: "Le programme se génère tout seul",
        body: "Lor'Squad propose les bons produits selon le bilan : Formula 1, CR7 Drive, Rebuild Strength, créatine, collagène, hydrate, plus les boosters cliquables (avec stepper de quantité par produit). Détection automatique de 6 alertes (hydratation faible, protéines basses, sommeil court, masse musculaire, snack manquant, fréquence sport incohérente) qu'il faut acquitter avant validation. Pas de bilan validé sans alertes lues.",
        manualAdvance: true,
      },
      {
        id: "outro",
        title: "Page remerciement = effet wahou",
        body: "Une fois validé, tu arrives sur une page plein écran : QR code géant à scanner + boutons WhatsApp / SMS / Telegram + parrainage + lien Avis Google. Le client a son app personnelle en 1 scan, son programme s'y affiche, ses RDV aussi. Astuce : bascule en mode sombre juste avant cette page, le QR ressort spectaculaire.",
        placement: "center",
        isLast: true,
        nextLabel: "Section terminée",
        illustrationKey: "mockup-thank-you",
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
        title: "Le Programme — recommandation auto",
        body: "Lor'Squad génère le programme produits du client selon 6 règles métier déterministes (collations, liftoff, CR7, hydrate, créatine, collagène) déclenchées par son objectif et son body scan. Tu valides, tu ajustes les quantités, tu envoies. Pas de feuille Excel, pas de catalogue à apprendre par cœur.",
        placement: "center",
        illustrationKey: "mockup-program-card",
      },
      {
        id: "open-program",
        target: '[data-tour-id="nav-clients"]',
        placement: "bottom",
        title: "Étape 1 — ouvre une fiche client",
        body: "Depuis Dossiers clients, ouvre n'importe quelle fiche pour voir son programme actuel. La même page contient bilan, body scan, produits actifs, RDV, conseils sport et messagerie.",
        manualAdvance: true,
      },
      {
        id: "recommendations",
        target: '[data-tour-id="program-recommendations"]',
        placement: "top",
        route: DEMO_FICHE_CLIENT_ROUTE,
        title: "Le bloc Programme actuel",
        body: "Sur la fiche client, ce bloc liste les produits que le client utilise actuellement (avec quantités, durée de stock, points volume). Tu peux ajouter / retirer / modifier directement. Pour les sportifs, une section « Sport Summary » apparaît avec 3 cards : Besoins (protéines, eau, sommeil), Plan jour (sport vs repos) et Programme + boosters + lien WhatsApp pré-rempli.",
        manualAdvance: true,
      },
      {
        id: "boosters",
        title: "Les boosters cliquables (objectif sport)",
        body: "Au step Programme du bilan, jusqu'à 6 boosters apparaissent en card avec étoile et fond teal : Formula 1 collations, Liftoff énergie, CR7 Drive, H24 Hydrate, créatine, collagène. Clic = sélection (avec stepper de quantité 1-10). Chaque booster a son PV et son prix qui se cumulent dans le ticket du jour à droite.",
        placement: "center",
      },
      {
        id: "alerts",
        title: "Détection auto de 6 alertes sport",
        body: "Le wizard détecte automatiquement : hydratation faible, protéines basses, sommeil court, masse musculaire insuffisante, snack manquant, fréquence sport incohérente. Une popup style Apple Health bloque la validation tant que tu n'as pas acquitté chaque alerte (avec un commentaire si pertinent). Évite de valider un programme bancal sans s'en rendre compte.",
        placement: "center",
        illustrationKey: "mockup-sport-alerts",
      },
      {
        id: "generate",
        title: "Récap final — page remerciement",
        body: "À la fin du bilan, génération automatique d'une page plein écran avec : QR code géant, message WhatsApp pré-rempli (« Voici ton programme + lien d'accès »), boutons SMS, Telegram, parrainage, et lien Avis Google. Tu peux aussi re-éditer un bilan plus tard depuis la fiche client (mode édition complet, pas un nouveau bilan).",
        placement: "center",
      },
      {
        id: "outro",
        title: "Programme = différenciation",
        body: "Ton client reçoit un programme nominatif, calibré sur ses chiffres réels, avec ses produits, ses ressentis et son plan jour. C'est ça que tes concurrents distri n'ont pas. C'est ça qui fidélise.",
        placement: "center",
        isLast: true,
        nextLabel: "Section terminée",
        illustrationKey: "sparkles",
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
        illustrationKey: "mockup-agenda-list",
      },
      {
        id: "new-rdv",
        target: '[data-tour-id="agenda-new-rdv"]',
        placement: "bottom",
        route: DEMO_AGENDA_ROUTE,
        title: "Cale un RDV en 30 secondes",
        body: "Choisis un client + une date + une heure. Le lieu (La Base — Verdun) est pré-rempli. Au save, le client reçoit une notif push + un rappel automatique 24h avant. Côté coach, tu reçois aussi un push 5 minutes avant chaque RDV (cron rdv-imminent-notifier).",
        manualAdvance: true,
      },
      {
        id: "filters",
        target: '[data-tour-id="agenda-filters"]',
        placement: "bottom",
        route: DEMO_AGENDA_ROUTE,
        title: "Filtres entité — 4 vues en 1 clic",
        body: "Les pills en haut de page filtrent ton agenda par type : Tous (vue mixte), Clients (RDV programmés), Prospects (1ers contacts à travailler), Suivis (relances protocole en attente). Chaque pill affiche un compteur live et un point coloré pour reconnaître le type d'un coup d'œil (gold = clients, purple = prospects, teal = suivis).",
        manualAdvance: true,
      },
      {
        id: "client-export",
        title: "Côté client : Google Agenda + .ics",
        body: "Sur la card RDV de son app, le client a 4 actions : « Ajouter au calendrier » (lien Google Calendar direct, ouvre l'agenda du téléphone), « Fichier .ics » (téléchargement universel iOS/Android/Outlook), « Itinéraire » (Google Maps La Base) et « Modifier » (envoie une demande de changement). Une checkbox « Ajouté à mon agenda » permet au client de confirmer — tu vois la confirmation côté fiche coach.",
        placement: "center",
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
        illustrationKey: "rocket",
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
        title: "Communication & gestion — duo gagnant",
        body: "Deux outils qui marchent ensemble : la messagerie centralise les échanges (avec push notif temps réel), les dossiers clients organisent ta base par lifecycle. Le résultat : plus de Post-it, plus de WhatsApp perdus, plus de clients oubliés en pause.",
        placement: "center",
        illustrationKey: "chat-bubble",
      },
      {
        id: "messages-tab",
        target: '[data-tour-id="nav-messagerie"]',
        placement: "bottom",
        title: "Messagerie — onglet sidebar",
        body: "L'onglet Messagerie centralise toutes les demandes reçues depuis l'app cliente. Compteur rouge sur l'icône = messages non lus. Notifs push automatiques sur ton téléphone via Web Push (3 types : nouveau message, RDV imminent à 5 min, digest matin à 7h).",
        manualAdvance: true,
      },
      {
        id: "messages-tabs",
        target: '[data-tour-id="messages-tabs"]',
        placement: "bottom",
        route: "/messages",
        title: "3 inbox spécialisés",
        body: "Sur la page Messagerie, les pills en haut séparent les types de demandes : Demandes clients (questions, RDV, ressentis), Demandes produits (commandes en attente), Recommandations (clients qui te recommandent à un proche). Chaque pill affiche son compteur de non-lus en temps réel.",
        manualAdvance: true,
      },
      {
        id: "compose",
        target: '[data-tour-id="messages-compose"]',
        placement: "bottom",
        route: "/messages",
        title: "Démarrer une conversation",
        body: "Le CTA gold en haut de Messagerie ouvre une modale compose : tu sélectionnes un client dans ta base + tu rédiges ton message + Envoyer. Le client reçoit une push notif et le message s'affiche dans son onglet « Coach » de l'app. Pratique pour relancer ou féliciter sans attendre qu'il écrive.",
        manualAdvance: true,
      },
      {
        id: "filter-clients",
        target: '[data-tour-id="clients-filter-active"]',
        placement: "bottom",
        route: "/clients",
        title: "Filtre lifecycle — 5 statuts + fragile",
        body: "Filtre par statut : Actifs (programme en cours), Pas démarrés (bilan fait mais pas commencé), En pause (suspendu temporairement), Arrêtés (programme stoppé), Perdus (parti chez un concurrent), ⚠ Fragiles (signaux faibles, à surveiller). Chaque statut change la couleur du badge sur la card et l'inclusion dans les digests automatiques.",
        manualAdvance: true,
      },
      {
        id: "archive",
        title: "Archivage soft via lifecycle",
        body: "Pas de bouton « Supprimer » classique. Quand un client décroche, tu le passes en Arrêté ou Perdu via le sélecteur lifecycle. Il reste dans ta base (historique conservé) mais sort des digests, du dashboard Co-pilote et du protocole de suivi auto. Tu peux le réactiver à tout moment.",
        placement: "center",
      },
      {
        id: "outro",
        title: "Plus jamais perdu de fil",
        body: "Tes échanges sont historisés par client, tes dossiers organisés par cycle de vie, tes notifs centralisées sur ton téléphone. C'est ça la différence entre un coach qui court après ses clients et un coach qui pilote son activité.",
        placement: "center",
        isLast: true,
        nextLabel: "Section terminée",
        illustrationKey: "rocket",
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
        title: "L'app client — vitrine premium PWA",
        body: "Chaque client a sa propre Progressive Web App, installable sur l'écran d'accueil sans passer par un store. Il y voit son bilan, son évolution body scan dans le temps, ses RDV avec export Google Calendar / .ics, ses produits actifs, ses conseils sport personnalisés et un onglet Mensurations pour photos avant/après. C'est ton meilleur outil de fidélisation et de référencement (avis Google intégré).",
        placement: "center",
        illustrationKey: "phone-pwa",
      },
      {
        id: "open-clients",
        target: '[data-tour-id="nav-clients"]',
        placement: "bottom",
        title: "Étape 1 — ouvre une fiche client",
        body: "Pour activer l'app d'un client, on part toujours de sa fiche. Ouvre Dossiers clients, clique sur le client concerné. La fiche affiche bilan, body scan, programme, agenda, mensurations, conversations.",
        manualAdvance: true,
      },
      {
        id: "send-access",
        target: '[data-tour-id="client-send-access"]',
        placement: "bottom",
        route: DEMO_FICHE_CLIENT_ROUTE,
        title: "« Envoyer l'accès » — bouton gold",
        body: "Sur la fiche client, ce CTA gold lance la génération d'un token UUID unique (valide 1 an). Il ouvre une modale unifiée avec 4 canaux : QR code (scan en RDV), WhatsApp (lien préformaté), SMS (lien court), Copier-coller (paste manuel). Tu peux régénérer le token à tout moment si compromis.",
        manualAdvance: true,
      },
      {
        id: "qr-code",
        target: '[data-tour-id="client-access-qr"]',
        placement: "bottom",
        route: DEMO_FICHE_CLIENT_WITH_ACCESS_MODAL,
        title: "Le QR code — démo en RDV",
        body: "Quand tu cliques « Envoyer l'accès », la modale s'ouvre avec un QR code 180×180. En RDV physique, ton client le scanne avec l'appareil photo de son téléphone — l'app s'ouvre instantanément sur son espace personnel, prêt à être ajouté à l'écran d'accueil. Effet wahou garanti.",
        manualAdvance: true,
      },
      {
        id: "share-buttons",
        target: '[data-tour-id="client-access-share"]',
        placement: "top",
        title: "WhatsApp / SMS — partage à distance",
        body: "Si pas de RDV physique, deux boutons : WhatsApp (vert, ouvre une conversation pré-rempllie avec le lien et un message), SMS (teal, native iOS/Android avec le lien). Le bouton gold « Copier le lien » couvre tous les autres canaux (Telegram, Messenger, mail). Le client clique, son app s'ouvre, ton job est fait.",
        manualAdvance: true,
      },
      {
        id: "client-experience",
        title: "Côté client — ce qu'il voit dans l'app",
        body: "Hero personnalisé (« Bonjour Sarah »), card RDV avec 4 actions (Google Calendar, .ics, Maps, Modifier), bloc Évolution avec graphique poids/MG depuis le départ, onglet Conseils avec 6 alertes sport personnalisées + assiette idéale 3 secteurs SVG (protéines / glucides / légumes), onglet Produits avec son programme actuel + section « Recommandés pour ta progression », onglet Mensurations avec photos avant/après et tour de taille/cuisses/bras.",
        placement: "center",
      },
      {
        id: "google-review",
        title: "Avis Google — croissance organique",
        body: "Dans la page remerciement et le menu profil de l'app client, un bouton « Laisser un avis Google » envoie le client directement sur ta fiche Google My Business. Le timing parfait : juste après la transformation visible dans son onglet Évolution. Plus tes clients progressent, plus tu collectes d'avis 5 étoiles, plus tu remontes en référencement local.",
        placement: "center",
      },
      {
        id: "outro",
        title: "App client = ton multiplicateur",
        body: "PWA installable, fonctionne offline (cache 30s), résiliente aux pannes Supabase (fallback snapshot avec bandeau orange si l'edge plante). Plus le client l'utilise, plus il progresse. Plus il progresse, plus il en parle. C'est le levier qui transforme un coach actif en un coach reconnu.",
        placement: "center",
        isLast: true,
        nextLabel: "Section terminée",
        illustrationKey: "rocket",
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
        body: "Deux habitudes prises dès le départ font 80 % du résultat : avoir Lor'Squad sous la main comme une app native, et regarder ton volume PV chaque matin pour piloter ton mois. C'est l'objet de cette dernière section.",
        placement: "center",
        illustrationKey: "sparkles",
      },
      {
        id: "pwa-install",
        target: '[data-tour-id="pwa-install"]',
        placement: "top",
        title: "Installe l'app native (PWA)",
        body: "Le bouton « Installer Lor'Squad » dans la sidebar ajoute l'icône à ton écran d'accueil — l'app s'ouvre alors en plein écran sans barre navigateur, avec notifs push activées. Chrome / Edge : 1 clic. iPhone Safari : Partage → Sur l'écran d'accueil. Une fois installé, tu lances Lor'Squad comme WhatsApp ou Instagram.",
        manualAdvance: true,
      },
      {
        id: "pv-gauge",
        target: '[data-tour-id="pv-gauge"]',
        placement: "top",
        route: "/co-pilote",
        title: "La jauge PV mensuelle",
        body: "Sur ton Co-pilote, le bloc PV affiche ta jauge circulaire avec couleur graduée : rouge (< 40 % du seuil), ambre (40-60 %), vert (≥ 60 %). Seuil par défaut 13 000 PV — éditable dans Paramètres si tu vises un palier supérieur. La jauge se met à jour en temps réel à chaque commande client validée.",
        manualAdvance: true,
      },
      {
        id: "mini-stats",
        title: "Les 3 mini-stats à côté du PV",
        body: "Toujours sur Co-pilote, à côté de la jauge : Clients actifs (avec delta vs mois dernier en + ou –), Semaine (nombre de RDV programmés sur 7 jours glissants), Conversion (% de prospects transformés en clients sur le mois). Ces 3 chiffres te disent en 5 secondes si ton activité est en santé ou si tu dois pousser.",
        placement: "center",
      },
      {
        id: "pv-detail",
        target: '[data-tour-id="nav-pv"]',
        placement: "bottom",
        title: "L'onglet Suivi PV — le détail",
        body: "Pour creuser : historique mensuel, projection sur la fin du mois (en fonction du rythme actuel), liste des produits actifs par client (durée de stock restante, dates de relance auto). Si un client n'a pas reçu sa commande renouvelée à temps, il apparaît en alerte rouge — c'est ton signal pour le contacter avant qu'il décroche.",
        manualAdvance: true,
      },
      {
        id: "monthly-rhythm",
        title: "Le rythme mensuel = paliers Herbalife",
        body: "Vise ton seuil PV chaque mois sans exception. La régularité est ce qui fait monter ton rang Herbalife (Senior Consultant → Success Builder → Supervisor → World Team → GET → Millionaire). Ton coach référent voit aussi ta progression Academy + ton PV — il peut te coacher au bon moment.",
        placement: "center",
      },
      {
        id: "outro",
        title: "Tu es prêt 🎉",
        body: "Bravo, tu as terminé l'Academy Lor'Squad. Tu connais le bilan, le programme, l'agenda, la messagerie, l'app client et tes rituels PV. Tu peux relancer n'importe quelle section quand tu veux via /academy. Maintenant : ton premier vrai bilan client.",
        placement: "center",
        illustrationKey: "trophy",
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
