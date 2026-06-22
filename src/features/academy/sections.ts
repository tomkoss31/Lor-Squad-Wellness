// Chantier Academy (2026-04-26 ; maj contenu 2026-06-15 ; refonte « langage simple » 2026-06-22).
// Définition statique des sections du parcours La Base 360 Academy
// (ACADEMY_SECTIONS) — steps + quiz remplis.
//
// ⚠️ RÈGLE D'ÉCRITURE (refonte 2026-06-22, validée Thomas) : on écrit comme
// on parle à un pote qui débute. Tutoiement, phrases courtes (~15 mots max),
// zéro jargon (pas de « lignage », « scope », « upsell », « cron », « RLS »…),
// 1 idée par phrase. Quiz : 3 questions max par chapitre, explications en
// 1-2 phrases. Action d'abord, le « pourquoi » en 1 ligne.

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
  /** Polish direction 2 (2026-04-28) : quiz post-section pour memorisation. */
  quiz?: AcademyQuiz;
}

export interface AcademyQuizQuestion {
  id: string;
  question: string;
  answers: string[];
  correctIndex: number;
  /** Explication pédagogique toujours affichée après la réponse. */
  explanation: string;
  /**
   * Hint ciblé par mauvaise réponse (Chantier Quiz V2 — 2026-04-29).
   * Clé = index de la mauvaise réponse, valeur = correction explicative.
   * Exemple : { 0: "Pas tout à fait — la ZA c'est le mois 1, pas la semaine 1." }
   * Si défini pour la réponse choisie : affiché AVANT explanation.
   */
  wrongAnswerHints?: Record<number, string>;
}

export interface AcademyQuiz {
  questions: AcademyQuizQuestion[];
  /** Seuil pour considerer le quiz reussi. Defaut 60%. */
  passThreshold?: number;
}

export const ACADEMY_SECTIONS: AcademySection[] = [
  {
    id: "welcome",
    title: "🚀 Démarrer",
    shortLabel: "Profil",
    description: "Remplis ton profil pour que ton coach et ton équipe te reconnaissent.",
    estimatedDurationMinutes: 2,
    icon: "👋",
    steps: [
      {
        id: "intro",
        title: "Bienvenue {firstName} 👋",
        body: "{firstName}, on remplit ton profil en 2 minutes. Ça permet à ton coach et à ton équipe de te reconnaître dans l'app. C'est parti.",
        placement: "center",
        route: "/parametres",
        illustrationKey: "wave",
      },
      {
        id: "name",
        target: '[data-tour-id="profile-name"]',
        placement: "bottom",
        route: "/parametres",
        title: "Ton nom — clique et écris",
        body: "Vérifie l'orthographe : c'est le nom que tes clients voient dans leur app (« Coach {firstName} »). Tape-le, ça avance tout seul.",
        manualAdvance: true,
        advanceOn: { event: "input", valueMatch: ".{2,}", debounceMs: 800 },
      },
      {
        id: "herbalife-id",
        target: '[data-tour-id="profile-herbalife-id"]',
        placement: "bottom",
        route: "/parametres",
        title: "Ton numéro Herbalife",
        body: "Ton numéro à toi (ex : 21Y0103610). Tu le trouves sur MyHerbalife → Mon profil. Tape-le, ça avance dès qu'il est bon.",
        manualAdvance: true,
        requiredRole: "distributor",
        advanceOn: { event: "input", valueMatch: "^\\d{2}[A-Za-z]\\d{7}$", debounceMs: 400 },
      },
      {
        id: "sponsor",
        target: '[data-tour-id="profile-sponsor"]',
        placement: "bottom",
        route: "/parametres",
        title: "Le numéro de ton parrain",
        body: "La personne qui t'a inscrit chez Herbalife (même format de numéro). Souvent c'est ton coach, mais pas toujours — on les sépare pour être sûr.",
        manualAdvance: true,
        requiredRole: "distributor",
      },
      {
        id: "coach-referent",
        target: '[data-tour-id="profile-coach-referent"]',
        placement: "bottom",
        route: "/parametres",
        title: "Ton coach référent",
        body: "La personne qui t'accompagne au quotidien : tes questions, tes premières ventes. Choisis-la dans la liste. C'est elle qu'on prévient si tu as besoin d'un coup de main.",
        manualAdvance: true,
        requiredRole: "distributor",
        crossRefs: [
          { label: "Lui écrire via Messagerie", sectionId: "messages-and-clients" },
        ],
      },
      {
        id: "save",
        target: '[data-tour-id="profile-save"]',
        placement: "top",
        route: "/parametres",
        title: "Enregistre",
        body: "Clique « Enregistrer » avant de partir, sinon rien n'est gardé. Ton équipe voit que ton profil est à jour. C'est tout bon 👍",
        manualAdvance: true,
        isLast: true,
        nextLabel: "Section terminée",
      },
    ],
    quiz: {
      passThreshold: 0.6,
      questions: [
        {
          id: "q1",
          question: "Sponsor et coach référent, c'est pareil ?",
          answers: [
            "Oui, toujours la même personne",
            "Pas forcément : le sponsor t'inscrit chez Herbalife, le coach t'accompagne dans l'app",
            "Le sponsor est optionnel",
          ],
          correctIndex: 1,
          wrongAnswerHints: {
            0: "C'est souvent la même personne, mais pas toujours — d'où les 2 champs.",
            2: "Non, le sponsor est obligatoire à ton inscription Herbalife.",
          },
          explanation: "Souvent c'est la même personne, mais pas toujours. Le sponsor, c'est ton parrain Herbalife. Le coach, c'est qui t'aide au quotidien dans l'app.",
        },
        {
          id: "q2",
          question: "Où trouves-tu ton numéro Herbalife ?",
          answers: [
            "Dans La Base 360, il se crée tout seul",
            "Sur MyHerbalife → Mon profil",
            "Dans tes emails",
          ],
          correctIndex: 1,
          wrongAnswerHints: {
            0: "Non, La Base 360 ne le crée pas — il vient d'Herbalife.",
            2: "Pas sûr. Le plus fiable : MyHerbalife → Mon profil.",
          },
          explanation: "Ton numéro Herbalife est sur MyHerbalife, dans Mon profil. Format : 2 chiffres + 1 lettre + 7 chiffres (ex : 21Y0103610).",
        },
        {
          id: "q3",
          question: "Tu oublies de mettre ton coach référent. Qu'est-ce qui se passe ?",
          answers: [
            "Ton compte est bloqué",
            "Personne n'est prévenu si tu as besoin d'aide",
            "Tu ne peux plus faire de bilan",
          ],
          correctIndex: 1,
          wrongAnswerHints: {
            0: "Non, ton compte marche normalement.",
            2: "Si, tu peux faire des bilans. C'est juste le suivi qui manque.",
          },
          explanation: "Sans coach référent, tout marche, mais personne n'est prévenu si tu galères. C'est ton filet de sécurité, ne le laisse pas vide.",
        },
      ],
    },
  },
  {
    id: "app-tour",
    title: "🧭 L'app en un coup d'œil",
    shortLabel: "Tour",
    description: "Découvre la sidebar (Co-pilote, Clients, CRM, Agenda, Messagerie…), Noaly et où trouver chaque chose.",
    estimatedDurationMinutes: 2,
    icon: "🧭",
    steps: [
      {
        id: "intro",
        title: "La Base 360 en 60 secondes, {firstName}",
        body: "Petit tour des grandes sections de l'app. À la fin, tu sauras où trouver chaque chose. Tu peux quitter quand tu veux et revenir via /academy.",
        placement: "center",
        illustrationKey: "ring-progress",
      },
      {
        id: "copilote",
        target: '[data-tour-id="nav-copilote"]',
        placement: "bottom",
        title: "1️⃣ Co-pilote — ton tableau de bord du jour",
        body: "Ta page du matin : ton prochain RDV, tes suivis à faire, ta jauge de points du mois et 3 chiffres clés. En un coup d'œil, tu sais quoi faire aujourd'hui.",
        manualAdvance: true,
      },
      {
        id: "clients",
        target: '[data-tour-id="nav-clients"]',
        placement: "bottom",
        title: "2️⃣ Dossiers clients — ta base",
        body: "Tous tes clients, triés par statut (actifs, en pause, arrêtés…). Ouvre une fiche : elle a **5 onglets** — Vue, Mesures, Produits, Actions, Club VIP. C'est ton outil de tous les jours.",
        manualAdvance: true,
      },
      {
        id: "crm",
        placement: "center",
        title: "3️⃣ CRM — tous tes contacts au même endroit",
        body: "Tous tes prospects arrivent ici : bilans en ligne, Club VIP, recommandations. Tu les classes (nouveau → contacté → client). Les demandes de RDV s'affichent en haut. 👉 Une seule porte pour transformer tes contacts.",
        manualAdvance: true,
      },
      {
        id: "agenda",
        target: '[data-tour-id="nav-agenda"]',
        placement: "bottom",
        title: "4️⃣ Agenda — bilans, suivis, prospects",
        body: "Tous tes rendez-vous au même endroit, avec des filtres (clients, prospects, suivis). 💡 Tes prospects peuvent même réserver un créneau eux-mêmes via ton lien (à activer dans Paramètres > Profil).",
        manualAdvance: true,
      },
      {
        id: "messagerie",
        target: '[data-tour-id="nav-messagerie"]',
        placement: "bottom",
        title: "5️⃣ Messagerie — tes échanges",
        body: "Tous les messages de tes clients arrivent ici. Pastille rouge = non lus. Le bouton doré « + Démarrer une conversation » te permet d'écrire en premier. Alerte sur ton téléphone à chaque message.",
        manualAdvance: true,
      },
      {
        id: "mon-business",
        target: '[data-tour-id="nav-outils"]',
        placement: "bottom",
        title: "6️⃣ Mon business — ton QG",
        body: "Tout ce qui sert à faire tourner ton activité :\n\n🎯 **Prospecter**\n🔗 **Mes liens** (bilan, VIP, coach…)\n🛒 **Panier** (prix + points + remise)\n💎 **Rentabilité** (ta marge + les points de l'équipe)\n⚡ **FLEX** (ton rythme du jour)\n💰 **Suivi PV** (tes points du mois)\n\nUn seul endroit, fini de chercher.",
        manualAdvance: true,
        crossRefs: [
          { label: "Comment lire la jauge PV", sectionId: "rituals" },
        ],
      },
      {
        id: "developpement",
        target: '[data-tour-id="nav-developpement"]',
        placement: "bottom",
        title: "7️⃣ Mon développement — pour apprendre",
        body: "Tout ce qui sert à apprendre et progresser :\n\n🎓 Academy\n📚 Formation Herbalife\n🛠 Boîte à outils (scripts, checklists)\n📔 Cahier de bord\n🎯 Simulateur EBE (entraînement)\n⚡ Comment marche FLEX\n🆕 Nouveautés de l'app\n\nTout est au même endroit.",
        manualAdvance: true,
      },
      {
        id: "noaly",
        placement: "center",
        title: "✨ Noaly — ton assistant, partout",
        body: "La bulle ✨ en bas à droite te suit partout. Elle t'aide pour de vrai :\n\n• **Sur un bilan** → un résumé + une phrase à dire au client\n• **Dans le CRM** → elle écrit ton message de relance\n• **Au quotidien** → pose-lui une question, demande qui relancer\n\nDès que tu bloques, demande-lui.",
        manualAdvance: true,
      },
      {
        id: "new-bilan",
        target: '[data-tour-id="nav-new-bilan"]',
        placement: "top",
        title: "Le bouton doré de tous les jours",
        body: "« + Nouveau bilan » : ton geste central. En un seul parcours, il crée le client, son bilan, son programme et son app perso. C'est le sujet de la prochaine section.",
        isLast: true,
        manualAdvance: true,
        nextLabel: "Section terminée",
      },
    ],
    quiz: {
      passThreshold: 0.6,
      questions: [
        {
          id: "q1",
          question: "Le Co-pilote, c'est quoi ?",
          answers: [
            "Une page de réglages",
            "Ta page du matin : ce que tu dois faire aujourd'hui + tes points du mois",
            "Un robot qui répond aux clients à ta place",
          ],
          correctIndex: 1,
          wrongAnswerHints: {
            0: "Non, les réglages sont dans Paramètres.",
            2: "Non, c'est toi le coach. Pas de robot qui répond.",
          },
          explanation: "Le Co-pilote, c'est ta page du matin : ton prochain RDV, tes suivis, ta jauge de points et tes chiffres clés.",
        },
        {
          id: "q2",
          question: "Où vois-tu tous tes rendez-vous ?",
          answers: ["Onglet Clients", "Onglet Agenda", "Messagerie"],
          correctIndex: 1,
          wrongAnswerHints: {
            0: "Clients = tes clients, pas tes RDV.",
            2: "La messagerie = tes échanges, pas tes RDV.",
          },
          explanation: "L'Agenda regroupe tous tes RDV (jour, semaine, mois). Tu reçois aussi une alerte juste avant chaque rendez-vous.",
        },
        {
          id: "q3",
          question: "Le bouton « + Nouveau bilan » fait quoi ?",
          answers: [
            "Il crée juste un client vide",
            "Il crée le client + son bilan + son programme + son app perso, d'un coup",
            "Il envoie un mail à ton coach",
          ],
          correctIndex: 1,
          wrongAnswerHints: {
            0: "Il fait bien plus que ça.",
            2: "Non, aucun mail envoyé.",
          },
          explanation: "En un seul parcours, il crée le client, son bilan, son programme et son app personnelle. C'est ton geste central.",
        },
      ],
    },
  },
  {
    id: "first-bilan",
    title: "🥗 Bilan → 1er client",
    shortLabel: "Premier bilan",
    description: "Le bouton + Nouveau bilan crée le client et son bilan en un seul parcours.",
    estimatedDurationMinutes: 4,
    icon: "📋",
    steps: [
      {
        id: "intro",
        title: "Le bilan, ta porte d'entrée",
        body: "Le bilan, c'est le cœur de ton activité. En un seul parcours guidé, il crée le client et son premier état des lieux. Compte 8 à 12 minutes en vrai RDV — l'app gère l'administratif, toi tu écoutes.",
        placement: "center",
        illustrationKey: "person-card",
      },
      {
        id: "open-form",
        target: '[data-tour-id="nav-new-bilan"]',
        placement: "top",
        title: "Le bouton doré qui sert tous les jours",
        body: "Ce bouton ouvre le bilan. Pas besoin de créer le client avant : il est créé tout seul à la fin, avec sa fiche et son accès perso.",
        manualAdvance: true,
      },
      {
        id: "client-info",
        target: '[data-tour-id="bilan-client-info"]',
        placement: "bottom",
        route: "/assessments/new?demo=academy",
        title: "Étape 1 — Qui est ton client ?",
        body: "Prénom, nom, téléphone, email, sexe, âge. Tape un prénom, ça avance tout seul. Si la personne existe déjà (même téléphone), l'app ouvre sa fiche et tu fais un suivi au lieu d'un nouveau bilan.",
        manualAdvance: true,
        advanceOn: { event: "input", valueMatch: ".{2,}", debounceMs: 800 },
      },
      {
        id: "body-scan",
        target: '[data-tour-id="bilan-body-scan"]',
        placement: "bottom",
        title: "Le body scan — 4 chiffres qui parlent",
        body: "Poids, masse grasse, hydratation, masse musculaire. Ces 4 chiffres montrent les progrès au fil du temps. L'idéal : une balance Tanita, mais l'estimation suffit pour démarrer.",
        manualAdvance: true,
      },
      {
        id: "objective",
        target: '[data-tour-id="bilan-objective"]',
        placement: "bottom",
        title: "L'objectif change tout le programme",
        body: "Deux familles : perte de poids, ou sport (prise de masse, force, sèche…). Pour le sport, 2 étapes en plus arrivent. Tout le programme produits s'adapte à ce choix.",
        manualAdvance: true,
      },
      {
        id: "submit",
        target: '[data-tour-id="bilan-submit"]',
        placement: "top",
        title: "Le programme se crée tout seul",
        body: "L'app propose les bons produits selon le bilan (Formula 1, CR7 Drive, créatine…). Elle repère aussi 6 alertes (hydratation, protéines, sommeil…) à lire avant de valider. Pas de bilan validé sans les lire.",
        manualAdvance: true,
      },
      {
        id: "outro",
        title: "La page de fin = effet wahou",
        body: "À la validation, tu arrives sur une page plein écran : grand QR code à scanner + boutons WhatsApp / SMS / Telegram + parrainage + avis Google. Le client a son app perso en 1 scan. Astuce : passe en mode sombre juste avant, le QR ressort magnifique.",
        placement: "center",
        illustrationKey: "mockup-thank-you",
      },
      {
        id: "prog-intro",
        title: "Le programme — proposé automatiquement",
        body: "L'app choisit les produits selon l'objectif et le body scan du client. Tu valides, tu ajustes les quantités, tu envoies. Pas d'Excel, pas de catalogue à apprendre par cœur.",
        placement: "center",
        illustrationKey: "mockup-program-card",
      },
      {
        id: "prog-open-program",
        target: '[data-tour-id="nav-clients"]',
        placement: "bottom",
        title: "Étape 1 — ouvre une fiche client",
        body: "Dans Dossiers clients, ouvre n'importe quelle fiche pour voir son programme. Tout est sur la même page : bilan, mesures, produits, RDV, conseils.",
        manualAdvance: true,
      },
      {
        id: "prog-recommendations",
        target: '[data-tour-id="program-recommendations"]',
        placement: "top",
        route: DEMO_FICHE_CLIENT_ROUTE,
        title: "Le bloc Programme actuel",
        body: "Ce bloc liste les produits que le client utilise (quantités, durée de stock, points). Tu ajoutes ou retires en direct. Pour les sportifs, un résumé sport apparaît avec ses besoins et son plan de journée.",
        manualAdvance: true,
      },
      {
        id: "prog-boosters",
        target: '[data-tour-id="program-sport-summary"]',
        placement: "bottom",
        route: DEMO_FICHE_CLIENT_ROUTE,
        title: "Résumé sport — 3 cartes",
        body: "Pour un client sportif, 3 cartes s'affichent toutes seules : ses Besoins (protéines, eau, sommeil), son Plan de journée (les bons produits avant/après le sport) et les Boosters conseillés (CR7, créatine…). Tu les ajoutes au programme en 1 clic.",
        manualAdvance: true,
      },
      {
        id: "prog-alerts",
        title: "6 alertes sport détectées toutes seules",
        body: "L'app repère : hydratation faible, protéines basses, sommeil court, masse musculaire, snack manquant, fréquence de sport incohérente. Une fenêtre te bloque tant que tu n'as pas lu chaque alerte. Ça évite de valider un programme bancal sans le voir.",
        placement: "center",
        illustrationKey: "mockup-sport-alerts",
        crossRefs: [
          { label: "Profil sport saisi en bilan", sectionId: "first-bilan" },
        ],
      },
      {
        id: "prog-recommended",
        target: '[data-tour-id="program-recommended-not-taken"]',
        placement: "top",
        route: DEMO_FICHE_CLIENT_ROUTE,
        title: "Recommandés non pris",
        body: "L'app repère les produits utiles à son objectif que le client n'a pas encore. Un bouton WhatsApp tout prêt te permet de les proposer en 1 clic. Pas de forcing : c'est basé sur ses vrais besoins.",
        manualAdvance: true,
      },
      {
        id: "prog-generate",
        title: "La page de fin",
        body: "À la fin du bilan, une page plein écran s'ouvre : grand QR code, message WhatsApp tout prêt, boutons SMS, Telegram, parrainage, avis Google. Tu peux aussi revenir modifier un bilan plus tard depuis la fiche client.",
        placement: "center",
      },
      {
        id: "prog-outro",
        title: "Le programme = ta différence",
        body: "Ton client repart avec un programme à son nom, calé sur ses vrais chiffres. C'est ça que les autres distri n'ont pas. C'est ça qui fidélise.",
        placement: "center",
        isLast: true,
        nextLabel: "Section terminée",
        illustrationKey: "sparkles",
      },
    ],
    quiz: {
      passThreshold: 0.6,
      questions: [
        {
          id: "q1",
          question: "Le client choisit l'objectif « sport ». Qu'est-ce que ça change ?",
          answers: [
            "Rien, c'est le même bilan",
            "2 étapes en plus arrivent et le programme produits s'adapte",
            "Le bilan est plus court",
          ],
          correctIndex: 1,
          wrongAnswerHints: {
            0: "Non, le bilan s'adapte à l'objectif.",
            2: "Au contraire, il y a 2 étapes en plus.",
          },
          explanation: "L'objectif sport ajoute 2 étapes (profil sport + apports actuels) et adapte tous les produits conseillés.",
        },
        {
          id: "q2",
          question: "Une fois le bilan validé, qu'est-ce que le client voit ?",
          answers: [
            "Sa fiche côté coach",
            "Une page de fin plein écran avec un QR code à scanner",
            "Rien de spécial",
          ],
          correctIndex: 1,
          wrongAnswerHints: {
            0: "Non, la fiche c'est ton outil à toi.",
            2: "Si, une vraie page de fin avec QR code et boutons de partage.",
          },
          explanation: "Après validation, une page plein écran s'ouvre avec un grand QR code + WhatsApp/SMS/Telegram. Le client a son app en 1 scan. C'est ton moment wahou.",
        },
        {
          id: "q3",
          question: "Les 6 alertes sport (hydratation, protéines…), tu peux les ignorer ?",
          answers: [
            "Oui, c'est juste indicatif",
            "Non, tu dois les lire avant de pouvoir valider",
            "Elles n'existent pas",
          ],
          correctIndex: 1,
          wrongAnswerHints: {
            0: "Non, l'app te bloque tant qu'elles ne sont pas lues.",
            2: "Si, l'app les détecte toute seule.",
          },
          explanation: "L'app détecte 6 alertes et te bloque tant que tu ne les as pas lues. Ça évite de valider un programme bancal sans le voir.",
        },
      ],
    },
  },
  {
    id: "agenda",
    title: "🎯 Capter & convertir",
    shortLabel: "Agenda",
    description: "Cale un rendez-vous, marque-le comme fait, comprends le suivi automatique.",
    estimatedDurationMinutes: 2,
    icon: "📅",
    steps: [
      {
        id: "intro",
        title: "L'agenda, ton GPS",
        body: "Bilans, suivis et prospects sur un seul calendrier. Tu filtres par type, par date et par statut. Tu vois d'un coup d'œil ce qui arrive.",
        placement: "center",
        illustrationKey: "mockup-agenda-list",
      },
      {
        id: "new-rdv",
        target: '[data-tour-id="agenda-new-rdv"]',
        placement: "bottom",
        route: DEMO_AGENDA_ROUTE,
        title: "Cale un RDV en 30 secondes",
        body: "Choisis un client, une date, une heure. Le lieu (La Base — Verdun) est déjà rempli. Au save, le client reçoit une alerte + un rappel la veille. Toi, tu es prévenu juste avant le RDV.",
        manualAdvance: true,
      },
      {
        id: "filters",
        target: '[data-tour-id="agenda-filters"]',
        placement: "bottom",
        route: DEMO_AGENDA_ROUTE,
        title: "Les filtres — 4 vues en 1 clic",
        body: "Les pastilles en haut trient ton agenda : Tous, Clients, Prospects, Suivis. Chacune a un compteur et une couleur (doré = clients, violet = prospects, turquoise = suivis).",
        manualAdvance: true,
      },
      {
        id: "client-export",
        title: "Côté client : ajout au calendrier",
        body: "Sur sa carte RDV, le client a 4 boutons : ajouter à son calendrier, télécharger le fichier .ics, ouvrir l'itinéraire, ou demander un changement. Il peut cocher « Ajouté à mon agenda » — tu vois la confirmation sur sa fiche.",
        placement: "center",
      },
      {
        id: "follow-up",
        title: "Le suivi automatique J+1 → J+10",
        body: "Après chaque bilan, l'app te rappelle 4 moments clés : J+1 (bienvenue), J+3 (ressentis), J+7 (VIP), J+10 (énergie). Tu reçois un résumé chaque matin à 7h. Les clients « pas démarrés » sont mis de côté : pas de relance inutile.",
        placement: "center",
        crossRefs: [
          { label: "Templates messages multi-canal", sectionId: "messages-and-clients" },
        ],
      },
      {
        id: "outro",
        title: "Ton rythme sous contrôle",
        body: "Tu sais caler, suivre, relancer. Plus aucun client oublié, plus aucun RDV manqué. C'est ça, passer de coach débordé à coach qui pilote.",
        placement: "center",
        illustrationKey: "rocket",
      },
      {
        id: "liste-intro",
        title: "Liste 100 et Agenda : c'est connecté 🔗",
        body:
          "Avant, ta Liste 100 et ton agenda étaient séparés. Tu devais retaper le nom du prospect à chaque RDV. Maintenant, c'est connecté. On regarde ensemble.",
        placement: "center",
        route: "/cahier-de-bord",
        illustrationKey: "calendar-glow",
      },
      {
        id: "liste-open-liste",
        target: '[data-tour-id="cahier-tab-liste"]',
        placement: "bottom",
        route: "/cahier-de-bord",
        title: "1️⃣ Ouvre l'onglet Liste 100",
        body:
          "Clique sur l'onglet « Liste 100 » du Cahier de bord. C'est là que vit toute ta liste de connaissances, classée par méthode FRANK.",
      },
      {
        id: "liste-le-funnel",
        title: "2️⃣ Le parcours en 5 étapes",
        body:
          "Chaque contact passe par 5 étapes, dans l'ordre :\n\n⚪ **Non contacté**\n💬 **Contacté** → tu lui as écrit\n📅 **RDV calé** → il a accepté un RDV\n📊 **EBE fait** → tu as fait le RDV, en attente de sa décision\n✅ **Client** → il a signé\n\n(+ ❌ Refus si pas intéressé)\n\nTu changes le statut directement sur sa ligne. Pas de double-saisie.",
        placement: "center",
        route: "/cahier-de-bord",
        illustrationKey: "ring-progress",
      },
      {
        id: "liste-magic-rdv-cale",
        title: "3️⃣ La magie au passage « RDV calé » ✨",
        body:
          "Quand tu passes un contact en « RDV calé », une fenêtre s'ouvre, déjà remplie avec son nom, son téléphone et la source. Tu valides → le prospect apparaît dans ton agenda. Et le contact reste dans ta Liste 100. Résultat : 1 clic au lieu de 5 minutes.",
        placement: "center",
        route: "/cahier-de-bord",
        illustrationKey: "sparkles",
      },
      {
        id: "liste-annulation",
        title: "4️⃣ Si tu changes d'avis",
        body:
          "Cette fenêtre est facultative : si tu la fermes, aucun prospect n'est créé. Tu as cliqué « RDV calé » par erreur ? Ferme la fenêtre et remets le statut sur « Contacté ». Pas de panique.",
        placement: "center",
        route: "/cahier-de-bord",
        illustrationKey: "alert-shield",
        isLast: true,
      },
    ],
    quiz: {
      passThreshold: 0.6,
      questions: [
        {
          id: "q1",
          question: "Le suivi automatique te rappelle quels moments ?",
          answers: [
            "J+1, J+7, J+30, J+90",
            "J+1, J+3, J+7, J+10",
            "Tous les jours pendant 10 jours",
          ],
          correctIndex: 1,
          wrongAnswerHints: {
            0: "Trop espacé, tu perds le client.",
            2: "Trop : un message par jour, ça fatigue.",
          },
          explanation: "4 rappels : J+1 (bienvenue), J+3 (ressentis), J+7 (VIP), J+10 (énergie). Les jours qui comptent le plus, sans spammer.",
        },
        {
          id: "q2",
          question: "Tu passes un contact en « RDV calé » dans ta Liste 100. Que se passe-t-il ?",
          answers: [
            "Rien, tu dois créer le RDV à la main dans l'Agenda",
            "Une fenêtre déjà remplie te propose de créer le prospect dans l'agenda",
            "Le contact disparaît de ta liste",
          ],
          correctIndex: 1,
          wrongAnswerHints: {
            0: "Non, c'est connecté maintenant.",
            2: "Non, il reste dans ta Liste 100.",
          },
          explanation: "Une fenêtre s'ouvre, déjà remplie (nom, téléphone, source). Tu valides → c'est dans ton agenda. Le contact reste dans ta liste.",
        },
        {
          id: "q3",
          question: "Un client « pas démarré », ça veut dire quoi pour les relances ?",
          answers: [
            "Il reçoit toutes les relances automatiques",
            "Il est mis de côté : pas de relance inutile",
            "Son compte est bloqué",
          ],
          correctIndex: 1,
          wrongAnswerHints: {
            0: "L'inverse : on évite de le harceler.",
            2: "Non, aucun blocage.",
          },
          explanation: "« Pas démarré » = il n'a pas commencé son programme. On le met de côté pour ne pas lui envoyer « comment ça se passe ? » alors qu'il n'a rien commencé.",
        },
      ],
    },
  },
  {
    id: "messages-and-clients",
    title: "💬 Fidéliser",
    shortLabel: "Messages",
    description: "Envoie un message multi-canal, filtre tes clients, archive ceux qui ne suivent plus.",
    estimatedDurationMinutes: 3,
    icon: "💬",
    steps: [
      {
        id: "intro",
        title: "Communiquer & gérer — le duo gagnant",
        body: "Deux outils qui marchent ensemble : la messagerie pour tes échanges, les dossiers clients pour organiser ta base. Fini les Post-it et les WhatsApp perdus.",
        placement: "center",
        illustrationKey: "chat-bubble",
      },
      {
        id: "messages-tab",
        target: '[data-tour-id="nav-messagerie"]',
        placement: "bottom",
        title: "La Messagerie",
        body: "Toutes les demandes de tes clients arrivent ici. Pastille rouge = non lus. Tu reçois aussi une alerte sur ton téléphone à chaque nouveau message.",
        manualAdvance: true,
      },
      {
        id: "messages-tabs",
        target: '[data-tour-id="messages-tabs"]',
        placement: "bottom",
        route: "/messages",
        title: "3 boîtes séparées",
        body: "En haut, 3 pastilles trient les demandes : questions des clients, commandes de produits, recommandations. Chacune montre son nombre de non-lus.",
        manualAdvance: true,
      },
      {
        id: "compose",
        target: '[data-tour-id="messages-compose"]',
        placement: "bottom",
        route: "/messages",
        title: "Démarrer une conversation",
        body: "Le bouton doré ouvre une fenêtre : choisis un client, écris ton message, envoie. Il reçoit une alerte et voit ton message dans son app. Parfait pour relancer ou féliciter.",
        manualAdvance: true,
      },
      {
        id: "quick-templates-cta",
        title: "Messages rapides — WhatsApp / SMS / Telegram",
        body: "La messagerie interne sert pour les clients déjà sur l'app. Mais le plus souvent, tes échanges passent par WhatsApp ou SMS. Sur chaque fiche client, le bouton doré « 💬 Envoyer un message » t'ouvre ces canaux avec des messages déjà rédigés.",
        placement: "center",
        illustrationKey: "sparkles",
      },
      {
        id: "quick-templates-modal",
        title: "5 messages prêts + 4 canaux",
        body: "Clique le bouton doré → une fenêtre s'ouvre. À gauche : 5 messages prêts (confirmation de RDV, félicitations, relance douce, rappel de commande, anniversaire de programme). Les plus utiles pour CE client passent en tête. À droite : l'aperçu, déjà rempli avec son prénom et ses chiffres — modifiable. En bas : WhatsApp, SMS, Telegram ou Copier. 30 secondes au lieu de 5 minutes.",
        placement: "center",
        illustrationKey: "rocket",
      },
      {
        id: "filter-clients",
        target: '[data-tour-id="clients-filter-active"]',
        placement: "bottom",
        route: "/clients",
        title: "Filtre par statut",
        body: "Trie tes clients : Actifs, Pas démarrés, En pause, Arrêtés, Perdus, ⚠ Fragiles (à surveiller). Le statut change la couleur du badge et décide si le client entre ou non dans les relances auto.",
        manualAdvance: true,
      },
      {
        id: "archive",
        title: "Pas de suppression brutale",
        body: "Pas de bouton « Supprimer ». Quand un client décroche, passe-le en « Arrêté » ou « Perdu ». Il reste dans ta base (historique gardé) mais sort des relances. Tu peux le réactiver quand tu veux.",
        placement: "center",
      },
      {
        id: "outro",
        title: "Plus jamais perdu le fil",
        body: "Tes échanges sont gardés par client, ta base est rangée, tes alertes sont sur ton téléphone. C'est la différence entre courir après ses clients et piloter son activité.",
        placement: "center",
        illustrationKey: "rocket",
      },
      {
        id: "client-intro",
        title: "L'app client — ta vitrine",
        body: "Chaque client a sa propre app, qu'il installe sur son téléphone sans passer par un store. Il y voit son bilan, son évolution, ses RDV, ses produits et ses conseils. C'est ton meilleur outil pour fidéliser (avec l'avis Google intégré).",
        placement: "center",
        illustrationKey: "phone-pwa",
      },
      {
        id: "client-open-clients",
        target: '[data-tour-id="nav-clients"]',
        placement: "bottom",
        title: "Étape 1 — ouvre une fiche client",
        body: "Pour activer l'app d'un client, pars de sa fiche. Ouvre Dossiers clients et clique sur le client.",
        manualAdvance: true,
      },
      {
        id: "client-send-access",
        target: '[data-tour-id="client-send-access"]',
        placement: "bottom",
        route: DEMO_FICHE_CLIENT_ROUTE,
        title: "« Envoyer l'accès » — bouton doré",
        body: "Ce bouton doré crée un lien unique (valable 1 an) et ouvre une fenêtre avec 4 façons de l'envoyer : QR code, WhatsApp, SMS, ou copier. Tu peux régénérer le lien à tout moment.",
        manualAdvance: true,
      },
      {
        id: "client-qr-code",
        target: '[data-tour-id="client-access-qr"]',
        placement: "bottom",
        route: DEMO_FICHE_CLIENT_WITH_ACCESS_MODAL,
        title: "Le QR code — en RDV",
        body: "Quand tu cliques « Envoyer l'accès », un QR code s'affiche. En RDV, le client le scanne avec son appareil photo — son app s'ouvre tout de suite. Effet wahou garanti.",
        manualAdvance: true,
      },
      {
        id: "client-share-buttons",
        target: '[data-tour-id="client-access-share"]',
        placement: "top",
        title: "WhatsApp / SMS — à distance",
        body: "Pas de RDV en personne ? Deux boutons : WhatsApp (ouvre une conversation avec le lien) et SMS. Le bouton doré « Copier le lien » couvre tout le reste (Telegram, mail…). Le client clique, son app s'ouvre.",
        manualAdvance: true,
      },
      {
        id: "client-client-experience",
        title: "Ce que le client voit",
        body: "Un accueil à son nom, sa carte RDV, son évolution de poids depuis le départ, ses conseils (alertes sport + assiette idéale), ses produits, et ses mensurations avec photos avant/après.",
        placement: "center",
      },
      {
        id: "client-google-review",
        title: "Avis Google — ta croissance",
        body: "Dans son app, un bouton « Laisser un avis Google » l'envoie sur ta fiche Google. Le bon moment : juste après qu'il ait vu ses progrès. Plus tes clients progressent, plus tu récoltes d'avis 5 étoiles, mieux tu remontes dans les recherches.",
        placement: "center",
      },
      {
        id: "client-outro",
        title: "L'app client = ton multiplicateur",
        body: "Elle s'installe comme une vraie app et marche même hors connexion. Plus le client l'utilise, plus il progresse. Plus il progresse, plus il en parle. C'est ce qui transforme un coach actif en un coach reconnu.",
        placement: "center",
        isLast: true,
        nextLabel: "Section terminée",
        illustrationKey: "rocket",
        crossRefs: [
          { label: "Comment installer la PWA côté coach", sectionId: "rituals" },
        ],
      },
    ],
    quiz: {
      passThreshold: 0.6,
      questions: [
        {
          id: "q1",
          question: "Comment « supprimer » un client qui ne suit plus ?",
          answers: [
            "Un bouton Supprimer en haut de sa fiche",
            "Tu le passes en « Arrêté » ou « Perdu » (il reste dans ta base)",
            "Tu écris à l'admin",
          ],
          correctIndex: 1,
          wrongAnswerHints: {
            0: "Il n'y a pas de bouton Supprimer : l'historique est précieux.",
            2: "Pas besoin, tu le fais toi-même via le statut.",
          },
          explanation: "Pas de suppression brutale. Passe-le en « Arrêté » ou « Perdu » : il sort des relances mais reste dans ta base. Réactivable quand tu veux.",
        },
        {
          id: "q2",
          question: "Les messages rapides sur la fiche client, c'est quoi ?",
          answers: [
            "Un seul message passe-partout",
            "5 messages prêts qui s'adaptent au client, à envoyer par WhatsApp / SMS / Telegram",
            "Rien, tu écris tout à la main",
          ],
          correctIndex: 1,
          wrongAnswerHints: {
            0: "Non, il y en a 5, et ils s'adaptent.",
            2: "Justement, ils t'évitent de tout réécrire.",
          },
          explanation: "5 messages prêts (confirmation RDV, félicitations, relance douce, rappel commande, anniversaire). Déjà remplis avec le prénom et les chiffres du client. Les plus utiles passent en tête.",
        },
        {
          id: "q3",
          question: "À quoi sert le QR code dans la fenêtre d'accès client ?",
          answers: [
            "À rien, c'est décoratif",
            "En RDV, le client le scanne et son app s'ouvre tout de suite",
            "À vérifier ton numéro Herbalife",
          ],
          correctIndex: 1,
          wrongAnswerHints: {
            0: "Au contraire, c'est l'effet wahou du RDV.",
            2: "Aucun rapport avec ton numéro.",
          },
          explanation: "En RDV, le client scanne le QR code avec son appareil photo et son app s'ouvre direct. Simple et bluffant.",
        },
      ],
    },
  },
  {
    id: "rituals",
    title: "💎 Piloter & grandir",
    shortLabel: "Rituels",
    description: "Installe l'app sur ton téléphone et apprends à suivre tes points du mois.",
    estimatedDurationMinutes: 2,
    icon: "🎯",
    steps: [
      {
        id: "intro",
        title: "Tes deux réflexes du quotidien",
        body: "Le métier de distri, c'est un rythme, pas un sprint. Deux habitudes font 80 % du résultat : avoir l'app sous la main (répondre vite à un client) et regarder tes points chaque matin (piloter ton mois sans surprise). On installe les deux ici.",
        placement: "center",
        illustrationKey: "sparkles",
      },
      {
        id: "pwa-install",
        target: '[data-tour-id="pwa-install"]',
        placement: "top",
        title: "Installe l'app sur ton téléphone",
        body: "Le bouton « Installer La Base 360 » ajoute l'icône sur ton écran d'accueil. L'app s'ouvre alors en plein écran, avec les alertes activées. Chrome / Edge : 1 clic. iPhone : Partager → Sur l'écran d'accueil. Pourquoi ? Un client attend une réponse en minutes, pas en heures. Avec l'app + les alertes, tu réponds en 1 tap.",
        manualAdvance: true,
      },
      {
        id: "pv-gauge",
        target: '[data-tour-id="pv-gauge"]',
        placement: "top",
        route: "/co-pilote",
        title: "La jauge de points du mois",
        body: "Sur ton Co-pilote, la jauge change de couleur : rouge (en retard), ambre (en cours), vert (bien). Objectif de départ : 2 500 points par mois (modifiable dans Paramètres). Regarde-la le matin : 5 secondes pour savoir où tu en es. En rouge le 20 ? Pousse 2-3 relances cette semaine.",
        manualAdvance: true,
      },
      {
        id: "mini-stats",
        target: '[data-tour-id="pv-mini-stats"]',
        placement: "top",
        route: "/co-pilote",
        title: "3 chiffres — la santé de ton activité",
        body: "À côté de la jauge : tes Clients actifs (avec l'évolution vs le mois dernier), tes RDV de la semaine, et ton taux de conversion (prospects devenus clients). Lis-les comme une prise de sang : pas pour stresser, pour ajuster.",
        manualAdvance: true,
      },
      {
        id: "pv-detail",
        target: '[data-tour-id="nav-outils"]',
        placement: "bottom",
        title: "Suivi PV — le détail produit par produit",
        body: "Pour creuser : ton historique, ta projection de fin de mois, et les produits de chaque client (stock restant, dates de relance). Un client en retard de commande passe en rouge : c'est ton signal pour l'appeler avant qu'il décroche. Fidéliser coûte 5× moins cher que trouver un nouveau client.",
        manualAdvance: true,
      },
      {
        id: "monthly-rhythm",
        title: "Le rythme du mois",
        body: "Vise ton objectif chaque mois, sans exception. C'est la régularité qui fait monter ton rang Herbalife — pas un gros mois isolé. Le bon réflexe : chaque dimanche soir, 5 minutes pour regarder ta jauge et prévoir 2-3 relances. Ça vaut mieux que 3h de panique le 28.",
        placement: "center",
      },
      {
        id: "outro",
        title: "{firstName}, tu es prêt 🎉",
        body: "Bravo {firstName}, tu as terminé l'Academy La Base 360. Tu connais le bilan, le programme, l'agenda, la messagerie, l'app client et tes réflexes points. {coachName} voit que tu as terminé. Tu peux relancer une section quand tu veux via /academy. À toi de jouer : ton premier vrai bilan.",
        placement: "center",
        illustrationKey: "trophy",
        isLast: true,
        nextLabel: "Terminer l'Academy",
      },
    ],
    quiz: {
      passThreshold: 0.6,
      questions: [
        {
          id: "q1",
          question: "Tu installes l'app sur ton écran d'accueil. Le vrai gain ?",
          answers: [
            "Elle prend moins de place",
            "Les alertes + l'accès en 1 tap → tu réponds vite à tes clients",
            "Tu n'as plus besoin d'internet",
          ],
          correctIndex: 1,
          wrongAnswerHints: {
            0: "Marginal. Le vrai gain, c'est la réactivité.",
            2: "Non, internet reste nécessaire.",
          },
          explanation: "App installée = alertes activées + ouverture en 1 tap. Tu réponds en 1 minute au lieu d'1 heure. C'est ça qui fait sentir ton client suivi.",
        },
        {
          id: "q2",
          question: "La jauge de points passe au vert à partir de quel niveau ?",
          answers: ["≥ 40 %", "≥ 60 %", "≥ 80 %"],
          correctIndex: 1,
          wrongAnswerHints: {
            0: "À 40 % tu es encore en ambre.",
            2: "Trop strict, ce serait toujours rouge.",
          },
          explanation: "Rouge sous 40 %, ambre entre 40 et 60 %, vert à partir de 60 %. À 60 %, tu es sur une bonne trajectoire pour finir le mois.",
        },
        {
          id: "q3",
          question: "Le bon réflexe de la semaine ?",
          answers: [
            "5 minutes le dimanche soir pour regarder tes points et prévoir tes relances",
            "Appeler chaque client une fois par semaine",
            "Renvoyer un message à tous tes prospects le lundi",
          ],
          correctIndex: 0,
          wrongAnswerHints: {
            1: "Trop : un appel par semaine à chacun, tu épuises la relation.",
            2: "C'est du spam. Mieux vaut cibler.",
          },
          explanation: "5 minutes le dimanche soir : regarder ta jauge, prévoir 2-3 relances ciblées. Bien plus efficace que 3h de panique le 28 du mois.",
        },
      ],
    },
  },
  {
    id: "cahier-de-bord-tour",
    title: "🧰 Outils perso",
    shortLabel: "Cahier de bord",
    description:
      "Ton journal perso : tracker 21 jours cobaye, Liste 100 (méthode FRANK), journal EBE après chaque bilan. C'est privé (seul l'admin peut le voir pour t'aider).",
    estimatedDurationMinutes: 6,
    icon: "📔",
    steps: [
      {
        id: "intro",
        title: "Bienvenue dans ton Cahier de bord 📔",
        body:
          "Le Cahier de bord, c'est 3 outils que tout distri utilise. On va les voir tous les 3, je te montre où cliquer. Compte 5 minutes.",
        placement: "center",
        route: "/cahier-de-bord",
        illustrationKey: "wave",
      },
      {
        id: "tab-cobaye",
        target: '[data-tour-id="cahier-tab-cobaye"]',
        placement: "bottom",
        route: "/cahier-de-bord",
        title: "Onglet 1 — 21 jours cobaye 🥤",
        body:
          "Ton test perso : tu prends les produits toi-même pendant 21 jours et tu notes chaque jour ton énergie, ton sommeil, ton poids. Le but : parler de TON vécu, pas d'un argumentaire.\n\nTu vois une grille J0 → J21 (les jalons J0, J7, J14, J21 sont en doré). Clique un jour pour le remplir.",
      },
      {
        id: "tab-liste",
        target: '[data-tour-id="cahier-tab-liste"]',
        placement: "bottom",
        route: "/cahier-de-bord",
        title: "Onglet 2 — Liste 100 📒",
        body:
          "Tes 100 contacts classés par méthode FRANK (Famille / Relations / Amis / Network / parents d'amis des enfants). Pour chacun, tu choisis :\n\n• Une température : 🔥 Chaud / 🌤 Tiède / ❄️ Froid\n• Un statut : non contacté → contacté → RDV calé → EBE fait → Client / Refus\n\nLes stats en haut te montrent où tu en es.",
      },
      {
        id: "tab-ebe",
        target: '[data-tour-id="cahier-tab-ebe"]',
        placement: "bottom",
        route: "/cahier-de-bord",
        title: "Onglet 3 — Journal EBE 📊",
        body:
          "Ton ressenti après chaque RDV bilan. Une fiche est **créée toute seule** à la fin de chaque bilan, avec le prénom du prospect. Tu la complètes à froid :\n\n• Ta note sur 10\n• Ce qui a bien marché\n• Ce qu'il faut ajuster\n• Le résultat (signé / en attente / refusé)\n• Le nombre de recommandations\n\nLes stats résument ton mois.",
      },
      {
        id: "rules",
        title: "🛡 C'est TON cahier",
        body:
          "Personne d'autre que toi (et l'admin, pour t'aider si tu galères) ne le voit. Tu peux y mettre des notes brutes, des doutes, des prénoms.\n\nLa promesse : dans 3, 6, 12 mois, tu retrouves tout ton parcours, de zéro jusqu'à où tu en es.",
        placement: "center",
        route: "/cahier-de-bord",
        illustrationKey: "trophy",
      },
      {
        id: "simu-intro",
        title: "Le Simulateur EBE 🎯",
        body:
          "Entraîne-toi à un EBE complet sans risquer un vrai prospect. Un faux prospect, 6 étapes, 3 choix de réponse à chaque fois, et un feedback immédiat. Score final + debrief.",
        placement: "center",
        route: "/simulateur-ebe",
        illustrationKey: "rocket",
      },
      {
        id: "simu-scenarios",
        target: '[data-tour-id="simulateur-scenarios"]',
        placement: "top",
        route: "/simulateur-ebe",
        title: "1️⃣ Choisis un scénario",
        body:
          "2 scénarios :\n\n🙋‍♀️ **Sophie · 32 ans** — prof sceptique, perte de poids, 3 régimes ratés\n💪 **Karim · 28 ans** — sportif, prise de masse, stagne depuis 3 mois\n\nClique pour démarrer. Tu peux recommencer autant que tu veux.",
      },
      {
        id: "simu-trame-6-etapes",
        title: "2️⃣ Les 6 étapes de l'EBE",
        body:
          "La trame officielle La Base 360, la même qu'en vrai RDV :\n\n1. **Accueil** — mettre à l'aise\n2. **Découverte** — comprendre le vrai besoin\n3. **Body scan** — mesurer le présent\n4. **Solution** — relier le besoin au programme\n5. **Closing** — engager une décision\n6. **Recommandations** — obtenir 2-3 prénoms\n\nLe simulateur suit cette trame.",
        placement: "center",
        route: "/simulateur-ebe",
        illustrationKey: "ring-progress",
      },
      {
        id: "simu-scoring",
        title: "3️⃣ Le score : 0 / 5 / 10 par étape",
        body:
          "À chaque étape, 3 choix :\n\n✨ **Excellent** = 10 pts\n⚠️ **Moyen** = 5 pts\n❌ **À éviter** = 0 pt\n\nFeedback immédiat : tu comprends pourquoi ton choix était bon ou non. Score final sur 60.",
        placement: "center",
        route: "/simulateur-ebe",
        illustrationKey: "sparkles",
      },
      {
        id: "simu-debrief",
        title: "4️⃣ Le debrief",
        body:
          "À la fin, ton verdict :\n\n🏆 ≥ 50 : **Maître EBE** — tu peux closer en vrai\n✅ ≥ 35 : **EBE solide**\n📝 ≥ 20 : **À retravailler**\n🔄 < 20 : **Reprendre les bases**\n\nPlus un récap étape par étape. Le bouton **« Sauvegarder dans mon journal »** crée une fiche [Simulation] pour suivre tes progrès.",
        placement: "center",
        route: "/simulateur-ebe",
        illustrationKey: "trophy",
        isLast: true,
      },
    ],
    quiz: {
      passThreshold: 0.6,
      questions: [
        {
          id: "q1",
          question: "Le « 21 jours cobaye », c'est quoi ?",
          answers: [
            "Un essai gratuit que je propose au client",
            "Tester moi-même les produits 21 jours pour parler vrai aux prospects",
            "Un protocole médical Herbalife",
          ],
          correctIndex: 1,
          wrongAnswerHints: {
            0: "Non, c'est un test sur TOI, pas sur le client.",
            2: "Non, c'est juste un test perso, rien de médical.",
          },
          explanation:
            "Tu prends les produits toi-même pendant 21 jours et tu notes énergie, sommeil, poids. Résultat : tu parles de ton vécu réel, pas d'un argumentaire.",
        },
        {
          id: "q2",
          question: "FRANK, ça veut dire quoi ?",
          answers: [
            "Le prénom du créateur de la méthode",
            "Famille / Relations / Amis / Network / parents d'amis des enfants",
            "Une marque de carnet",
          ],
          correctIndex: 1,
          wrongAnswerHints: {
            0: "Non, c'est juste un moyen mnémotechnique.",
            2: "Aucun rapport.",
          },
          explanation:
            "FRANK = Famille / Relations / Amis / Network / parents d'amis (Kids). C'est la façon de classer ta Liste 100.",
        },
        {
          id: "q3",
          question: "L'EBE (et le simulateur) a combien d'étapes ?",
          answers: [
            "4",
            "6 : accueil → découverte → body scan → solution → closing → recommandations",
            "Ça dépend du prospect",
          ],
          correctIndex: 1,
          wrongAnswerHints: {
            0: "Trop court : tu sautes la découverte et les recos.",
            2: "Non, la trame est fixe pour ne rien oublier.",
          },
          explanation:
            "6 étapes fixes : accueil, découverte, body scan, solution, closing, recommandations. Toujours dans cet ordre.",
        },
      ],
    },
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
