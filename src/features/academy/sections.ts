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
    title: "Bienvenue & profil distri",
    shortLabel: "Profil",
    description: "Renseigne ton profil pour que ton coach et ton équipe te reconnaissent.",
    estimatedDurationMinutes: 2,
    icon: "👋",
    steps: [
      {
        id: "intro",
        title: "Bienvenue {firstName} 👋",
        body: "{firstName}, on commence par ton profil. C'est ce qui relie ton compte à ton lignage Herbalife (pour les commissions) ET à ton coach référent dans Lor'Squad (pour le suivi opérationnel). Deux choses différentes, on les sépare ici. Compte 2 minutes.",
        placement: "center",
        route: "/parametres",
        illustrationKey: "wave",
      },
      {
        id: "name",
        target: '[data-tour-id="profile-name"]',
        placement: "bottom",
        route: "/parametres",
        title: "Ton nom complet — clique et modifie",
        body: "Vérifie l'orthographe — c'est ce nom qui s'affiche en haut de l'app personnelle de tes clients (« Coach Thomas », « Coach Mandy »). Tape directement dans le champ : le tour avance tout seul dès que tu as saisi au moins 2 lettres.",
        manualAdvance: true,
        advanceOn: { event: "input", valueMatch: ".{2,}", debounceMs: 800 },
      },
      {
        id: "herbalife-id",
        target: '[data-tour-id="profile-herbalife-id"]',
        placement: "bottom",
        route: "/parametres",
        title: "Ton ID Herbalife (commissions)",
        body: "Ton identifiant officiel 10 caractères : 2 chiffres + 1 lettre majuscule + 7 chiffres (ex : 21Y0103610). Tu le trouves sur MyHerbalife → Mon profil. Tape ton ID — le tour avance dès que le format est valide. C'est ce qui permet de tracer tes commissions et ton lignage officiel.",
        manualAdvance: true,
        requiredRole: "distributor",
        advanceOn: { event: "input", valueMatch: "^\\d{2}[A-Za-z]\\d{7}$", debounceMs: 400 },
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
        title: "Ton coach référent dans Lor'Squad",
        body: "C'est la personne qui te suit au quotidien dans l'app — tes questions, tes blocages, tes premières ventes. {coachName} apparaît déjà dans ce select si tu l'as déjà renseigné. Sinon, choisis dans la liste de tous les utilisateurs actifs. C'est ce contact qui sera notifié si tu décroches.",
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
        title: "Enregistre tout ça",
        body: "Pense à cliquer Enregistrer avant de quitter — sans ça, rien n'est sauvegardé en base. Tes infos sont synchronisées avec ton équipe (admin Lor'Squad voit ton statut Academy + ton ID Herbalife sur sa fiche distri).",
        manualAdvance: true,
        isLast: true,
        nextLabel: "Section terminée",
      },
    ],
    quiz: {
      passThreshold: 0.8,
      questions: [
        {
          id: "q1",
          question: "Sponsor Herbalife et coach référent Lor'Squad : quelle est la différence ?",
          answers: [
            "Aucune, c'est forcément la même personne",
            "Le sponsor te paie tes commissions Herbalife · le coach te suit au quotidien dans Lor'Squad",
            "Le sponsor est optionnel, le coach est obligatoire",
            "Le sponsor est dans Lor'Squad, le coach est externe",
          ],
          correctIndex: 1,
          wrongAnswerHints: {
            0: "C'est souvent la même personne, mais pas toujours — d'où les 2 champs séparés.",
            2: "Inverse : le sponsor structure ton lignage Herbalife (obligatoire pour toucher tes commissions). Le coach, lui, c'est ton suivi humain quotidien.",
            3: "L'inverse : le sponsor vient d'Herbalife (corporate), le coach est interne au club Lor'Squad.",
          },
          explanation: "👉 Sponsor = arbre Herbalife pour les commissions (ID format 21Y0103610 ou 21XY010361). 👉 Coach référent = qui te suit dans Lor'Squad au quotidien (notifié si tu décroches). Le plus souvent c'est la même personne, mais on garde 2 champs pour les cas où non.",
        },
        {
          id: "q2",
          question: "Quels sont les formats valides pour un ID Herbalife ?",
          answers: [
            "10 chiffres consécutifs",
            "21Y0103610 (distri) ou 21XY010361 (VIP / membership)",
            "Une lettre suivie de 9 chiffres",
            "L'adresse email du distributeur",
          ],
          correctIndex: 1,
          wrongAnswerHints: {
            0: "Pas tout à fait — il y a 1 ou 2 lettres dans le format officiel, pas que des chiffres.",
            2: "Non, le format commence par 2 chiffres (le pays / année), suivi de 1 ou 2 lettres puis des chiffres.",
            3: "L'email c'est ton login Lor'Squad. L'ID Herbalife est différent — tu le trouves sur MyHerbalife.",
          },
          explanation: "📋 2 formats officiels acceptés : • DISTRI = 2 chiffres + 1 lettre + 7 chiffres (ex : 21Y0103610). • VIP / membership = 2 chiffres + 2 lettres + 6 chiffres (ex : 21XY010361). ⚠️ Important : un client VIP qui passe distri **garde son ID 21XY** — Lor'Squad accepte les 2 formats partout (profil, sponsor, fiche client).",
        },
        {
          id: "q3",
          question: "Si tu ne renseignes pas ton coach référent, que se passe-t-il ?",
          answers: [
            "Ton compte est désactivé",
            "Personne n'est notifié si tu décroches, et ton coach perd la visibilité team",
            "Tu ne peux pas faire de bilan",
            "Tu perds tes commissions Herbalife",
          ],
          correctIndex: 1,
          wrongAnswerHints: {
            0: "Non, ton compte fonctionne — c'est juste un manque de suivi.",
            2: "Si si, tu peux faire des bilans. C'est la relation team qui souffre, pas l'usage.",
            3: "Les commissions dépendent de Herbalife (sponsor), pas du coach Lor'Squad.",
          },
          explanation: "Sans coach référent, tu fonctionnes mais tu n'apparais sur la fiche team de personne. Si tu galères, personne n'est alerté. C'est le maillon humain qui te garde dans la dynamique du club.",
        },
        {
          id: "q4",
          question: "Qui voit ton statut Academy + ID Herbalife côté admin Lor'Squad ?",
          answers: [
            "Personne, c'est totalement privé",
            "Tous les utilisateurs",
            "Admin (Thomas, Mélanie) + ton coach référent + ton sponsor s'il est dans Lor'Squad",
            "Uniquement Herbalife corporate",
          ],
          correctIndex: 2,
          wrongAnswerHints: {
            0: "Pas privé : c'est ce qui permet à ton équipe de t'aider.",
            1: "Faux — Lor'Squad respecte les rôles. Un autre distri ne voit pas ton ID.",
            3: "Herbalife n'a aucun accès à Lor'Squad — c'est un outil tiers du club.",
          },
          explanation: "Visibilité scope team : admin Lor'Squad du club + ton coach référent + ton sponsor (s'il est inscrit Lor'Squad). Les autres distri du club ne voient rien de personnel.",
        },
        {
          id: "q5",
          question: "Pourquoi Lor'Squad a besoin de ton ID Herbalife ?",
          answers: [
            "Pour faire de la pub à Herbalife",
            "Pour tracer ton lignage et permettre les rapports PV/commissions par branche",
            "Pour partager tes données avec d'autres clubs",
            "Aucune raison, c'est juste un champ optionnel",
          ],
          correctIndex: 1,
          wrongAnswerHints: {
            0: "Lor'Squad ne fait pas de pub — c'est un outil interne au club.",
            2: "Au contraire : tes données sont scopées à ton club uniquement (RLS Supabase).",
            3: "Pas optionnel — c'est ce qui structure les rapports d'équipe.",
          },
          explanation: "L'ID Herbalife relie ton compte Lor'Squad à ton lignage officiel. Permet les rapports PV par branche, les détections de transferts de parrain, et la cohérence avec les données Herbalife corporate.",
        },
      ],
    },
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
        title: "Lor'Squad en 60 secondes, {firstName}",
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
        body: "Compteur de points volume du mois en cours, projection sur la fin du mois, historique mensuel. Seuil par défaut 2 500 PV — éditable dans Paramètres > Profil > Objectif PV mensuel quand tu veux viser plus haut. Badge rouge si tu as des produits en retard à renouveler.",
        manualAdvance: true,
        crossRefs: [
          { label: "Comment lire la jauge PV", sectionId: "rituals" },
        ],
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
    quiz: {
      passThreshold: 0.8,
      questions: [
        {
          id: "q1",
          question: "Le Co-pilote, c'est quoi exactement ?",
          answers: [
            "Une page de configuration",
            "Le dashboard principal avec jauge PV, mini-stats et accès rapide",
            "Un mode pilote automatique qui répond aux clients",
            "L'onglet d'aide en ligne",
          ],
          correctIndex: 1,
          wrongAnswerHints: {
            0: "Non, la config c'est dans Paramètres.",
            2: "Faux — pas d'IA qui répond aux clients à ta place. C'est toi le coach.",
            3: "Le guide est ailleurs (/guide). Le co-pilote c'est ton tableau de bord.",
          },
          explanation: "Le Co-pilote est ton dashboard quotidien : jauge PV mensuelle, 3 mini-stats (clients actifs / RDV semaine / conversion), CTAs rapides. C'est la page que tu regardes le matin avec ton café.",
        },
        {
          id: "q2",
          question: "Dans la sidebar, où trouves-tu rapidement tous tes RDV à venir ?",
          answers: ["Onglet Clients", "Onglet Messagerie", "Onglet Agenda", "Paramètres"],
          correctIndex: 2,
          wrongAnswerHints: {
            0: "Clients liste tes clients, pas les RDV planifiés.",
            1: "La messagerie c'est les conversations, pas les RDV.",
            3: "Paramètres c'est ton profil + admin du club, rien à voir.",
          },
          explanation: "L'Agenda centralise tous tes RDV (vue jour/semaine/mois) avec filtres par client. Les RDV imminents génèrent aussi des push notif via le cron rdv-imminent-notifier toutes les 5 min.",
        },
        {
          id: "q3",
          question: "Le bouton « + Nouveau bilan » fait quoi en un seul flow ?",
          answers: [
            "Crée juste un client vide",
            "Crée client + bilan initial + programme + lien d'app personnelle",
            "Envoie un mail à ton coach",
            "Réserve un RDV pour toi",
          ],
          correctIndex: 1,
          wrongAnswerHints: {
            0: "Trop limité — le wizard fait bien plus que créer un client.",
            2: "Aucun email envoyé à ton coach lors d'un bilan.",
            3: "Le RDV se fixe APRÈS le bilan, pas pendant.",
          },
          explanation: "« + Nouveau bilan » est ton geste central. Un seul wizard guidé crée le client + son bilan + son programme + son lien d'app perso (auto-login token). C'est le sujet entier de la section « Premier bilan ».",
        },
        {
          id: "q4",
          question: "L'onglet Messagerie a combien de sous-onglets pour organiser les conversations ?",
          answers: ["1 (Toutes)", "2 (Toutes / Non-lues)", "3 (Inbox / À traiter / Archive)", "5"],
          correctIndex: 2,
          wrongAnswerHints: {
            0: "Trop simple — au-delà de 10 conversations on noie l'info.",
            1: "Proche, mais Lor'Squad sépare en plus les conversations à traiter (besoin d'une réponse).",
            3: "Trop fragmenté, on n'a pas besoin de 5 onglets.",
          },
          explanation: "3 sous-onglets : Inbox (tout) / À traiter (où le client attend ta réponse) / Archive (terminé). Le badge sur l'onglet montre le nombre de non-lues.",
        },
        {
          id: "q5",
          question: "Sur l'onglet Suivi PV, quel signal d'alerte rouge dois-tu surveiller ?",
          answers: [
            "Quand tu dépasses 50 % de la jauge",
            "Quand un client a un produit en retard de renouvellement",
            "Quand tu reçois un nouveau message",
            "Quand l'équipe atteint son objectif",
          ],
          correctIndex: 1,
          wrongAnswerHints: {
            0: "À 50 % tu es en zone ambre saine — pas une alerte.",
            2: "Les nouveaux messages sont dans la Messagerie, pas Suivi PV.",
            3: "Atteindre l'objectif est une bonne nouvelle, pas une alerte rouge.",
          },
          explanation: "Le badge rouge sur l'onglet Suivi PV indique qu'un client a un produit en retard de renouvellement (sa cure devrait être finie depuis X jours). Signal pour le contacter avant qu'il décroche.",
        },
      ],
    },
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
        body: "Prénom, nom, téléphone, email, sexe, âge. Tape un prénom dans le 1er champ : le tour avance dès que tu as commencé à saisir. Si la personne existe déjà dans ta base (téléphone reconnu), Lor'Squad t'ouvre sa fiche et tu fais un suivi au lieu d'un bilan initial.",
        manualAdvance: true,
        advanceOn: { event: "input", valueMatch: ".{2,}", debounceMs: 800 },
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
    quiz: {
      passThreshold: 0.8,
      questions: [
        {
          id: "q1",
          question: "Combien d'étapes le wizard de bilan contient-il pour un client en objectif sport ?",
          answers: ["8 étapes", "11 étapes", "13 étapes", "15 étapes"],
          correctIndex: 2,
          wrongAnswerHints: {
            0: "Trop court — un bilan complet va bien au-delà de 8 étapes pour cadrer le client correctement.",
            1: "C'est le nombre par défaut, mais tu oublies les 2 étapes ajoutées en mode sport.",
            3: "Trop long — le wizard reste sous les 15 min pour ne pas fatiguer le client.",
          },
          explanation: "Le wizard a 11 étapes par défaut, +2 pour le sport (profil sport + apports actuels) = 13 au total.",
        },
        {
          id: "q2",
          question: "Le téléphone du client est obligatoire pour quelle raison principale ?",
          answers: [
            "Pour vérifier qu'il est joignable",
            "Pour envoyer le récap par WhatsApp en 1 clic",
            "Pour le contacter en cas d'urgence",
            "Pour facturer",
          ],
          correctIndex: 1,
          wrongAnswerHints: {
            0: "Indirect — la vraie utilité opérationnelle est l'envoi WhatsApp post-bilan.",
            2: "Pas faux mais trop rare. Le téléphone sert d'abord à l'usage régulier WhatsApp.",
            3: "Lor'Squad ne facture pas — c'est ton activité distri Herbalife à part.",
          },
          explanation: "Le téléphone permet d'envoyer le lien d'accès et le récap par WhatsApp depuis la page remerciement, en 1 clic. Sans tél = friction post-bilan.",
        },
        {
          id: "q3",
          question: "Pendant le body scan, qu'est-ce qui est strictement obligatoire pour valider l'étape ?",
          answers: [
            "Poids + taille + âge",
            "Tour de taille uniquement",
            "Photo avant",
            "Composition corporelle (% gras / muscle)",
          ],
          correctIndex: 0,
          wrongAnswerHints: {
            1: "Le tour de taille est utile mais optionnel — on peut faire le bilan sans.",
            2: "La photo avant booste l'engagement client mais n'est pas bloquante.",
            3: "La composition corporelle nécessite une balance impédancemètre — ce n'est pas exigé.",
          },
          explanation: "Le bilan exige juste poids + taille + âge pour calculer IMC, eau cible et protéines. Tout le reste est bonus pour enrichir le suivi.",
        },
        {
          id: "q4",
          question: "Si le client choisit l'objectif « Sport / prise de masse », que se passe-t-il dans le wizard ?",
          answers: [
            "Rien, le wizard est identique",
            "Le programme propose Formula 1 Vanille en priorité",
            "2 étapes sport-only s'ajoutent (profil sport + apports actuels)",
            "Le bilan est plus court car il y a moins de questions nutrition",
          ],
          correctIndex: 2,
          wrongAnswerHints: {
            0: "Erreur classique — le wizard est dynamique, il s'adapte à l'objectif.",
            1: "Au contraire : pour le sport on propose plutôt Formula 1 Sport + boosters protéines.",
            3: "C'est l'inverse : le bilan sport est plus long, pas plus court.",
          },
          explanation: "L'objectif sport déclenche 2 étapes supplémentaires (sport-profile + current-intake) qui alimentent les calculs protéines/hydratation et les alertes sport.",
        },
        {
          id: "q5",
          question: "Une fois le bilan validé, où arrive le client immédiatement ?",
          answers: [
            "Sur sa fiche client coté coach",
            "Sur une page de remerciement plein écran avec QR code",
            "Sur l'agenda pour fixer le suivi",
            "Sur la liste des produits",
          ],
          correctIndex: 1,
          wrongAnswerHints: {
            0: "Non — la fiche client te concerne, toi le coach. Le client a sa propre expérience post-bilan.",
            2: "L'agenda c'est pour toi, pas pour le client. Le suivi se fixe APRÈS la page remerciement.",
            3: "Pas directement. Les produits sont dans son app perso, accessibles via le QR.",
          },
          explanation: "Après validation, ouverture automatique de la page « Bilan terminé » avec QR code + boutons WhatsApp/SMS/Telegram + lien parrainage. C'est ton moment WAOUH en RDV.",
        },
      ],
    },
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
        target: '[data-tour-id="program-sport-summary"]',
        placement: "bottom",
        route: DEMO_FICHE_CLIENT_ROUTE,
        title: "Sport Summary — 3 cards live",
        body: "Pour les clients en objectif sport, ce bloc apparaît automatiquement avec 3 cards : Besoins (protéines/eau/sommeil calculés sur son poids), Plan jour (les bons produits avant/après séance), Boosters recommandés (CR7, créatine, etc. selon sous-objectif). Tu peux ajouter les boosters cliquables au programme depuis le bilan en 1 clic.",
        manualAdvance: true,
      },
      {
        id: "alerts",
        title: "Détection auto de 6 alertes sport",
        body: "Le wizard détecte automatiquement : hydratation faible, protéines basses, sommeil court, masse musculaire insuffisante, snack manquant, fréquence sport incohérente. Une popup style Apple Health bloque la validation tant que tu n'as pas acquitté chaque alerte (avec un commentaire si pertinent). Évite de valider un programme bancal sans s'en rendre compte.",
        placement: "center",
        illustrationKey: "mockup-sport-alerts",
        crossRefs: [
          { label: "Profil sport saisi en bilan", sectionId: "first-bilan" },
        ],
      },
      {
        id: "recommended",
        target: '[data-tour-id="program-recommended-not-taken"]',
        placement: "top",
        route: DEMO_FICHE_CLIENT_ROUTE,
        title: "Recommandés non pris",
        body: "Lor'Squad détecte automatiquement les produits recommandés par son objectif que le client n'a PAS encore. Bouton WhatsApp gold avec message pré-rempli pour les proposer en 1 clic. C'est ton outil d'upsell auto — basé sur les vrais besoins du client, pas du push commercial.",
        manualAdvance: true,
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
    quiz: {
      passThreshold: 0.8,
      questions: [
        {
          id: "q1",
          question: "Combien d'alertes Sport peuvent bloquer la validation du bilan ?",
          answers: ["3 alertes", "4 alertes", "6 alertes", "8 alertes"],
          correctIndex: 2,
          wrongAnswerHints: {
            0: "Trop peu — Lor'Squad couvre plus largement la santé sportive du client.",
            1: "Tu en oublies 2. Pense aux 6 axes : hydratation, protéines, sommeil, masse, snacks, fréquence.",
            3: "Trop — on évite la sur-alerte qui ferait fuir le client.",
          },
          explanation: "Lor'Squad détecte 6 alertes : hydratation faible, protéines basses, sommeil court, masse musculaire, snack manquant, fréquence sport incohérente. Acquittement obligatoire avant validation.",
        },
        {
          id: "q2",
          question: "Pour un client en prise de masse, quel booster recommander en priorité ?",
          answers: ["Aloe Vera", "Formula 1 Vanille", "Rebuild Strength", "Liftoff"],
          correctIndex: 2,
          wrongAnswerHints: {
            0: "Aloe c'est confort digestif, pas prise de masse — c'est plutôt pour le bien-être global.",
            1: "Formula 1 c'est la base, mais en sport on prend la version Sport (chocolat) — pas la vanille standard.",
            3: "Liftoff c'est le pré-entraînement (focus + énergie), pas la récup musculaire.",
          },
          explanation: "Rebuild Strength est conçu pour la récupération musculaire et la prise de masse. À prendre dans les 30 min après l'entraînement, mélangé à de l'eau ou du lait.",
        },
        {
          id: "q3",
          question: "Quelle est la différence entre les boosters proposés et les produits standards dans le ticket bilan ?",
          answers: [
            "Aucune, tous sont au même tarif",
            "Les boosters ont une étoile + fond teal et sont marqués \"recommandés\"",
            "Les boosters sont obligatoires",
            "Les boosters sont gratuits le premier mois",
          ],
          correctIndex: 1,
          wrongAnswerHints: {
            0: "Visuellement ils sont distingués — c'est exprès, pour orienter ton choix de coach.",
            2: "Aucun produit n'est obligatoire — tu coches selon le profil et le budget.",
            3: "Faux. Aucun produit n'est offert dans le programme.",
          },
          explanation: "Les boosters apparaissent avec une étoile ⭐ + fond teal pour signaler que la recommandation vient des règles métier (sport, hydratation, etc.). Ça t'aide à les expliquer au client : « voilà pourquoi je te le propose ».",
        },
        {
          id: "q4",
          question: "Le ticket du jour à droite du Programme affiche quoi en temps réel ?",
          answers: [
            "Juste le total prix",
            "Le total prix + le total PV",
            "Uniquement les produits cochés sans calcul",
            "Le poids du client",
          ],
          correctIndex: 1,
          wrongAnswerHints: {
            0: "Tu rates l'info essentielle pour toi : le PV — c'est ce qui te qualifie chaque mois.",
            2: "Si si, ça calcule. Sinon ce ne serait pas un vrai ticket pro.",
            3: "Le poids n'a rien à faire dans le ticket — il est dans le body scan.",
          },
          explanation: "Le ticket affiche prix total ET PV total qui s'actualisent à chaque ajout / retrait. Indispensable pour suivre ton volume PV mensuel en direct pendant le RDV.",
        },
        {
          id: "q5",
          question: "Sur un produit retenu, tu peux ajuster quoi avant de générer le programme ?",
          answers: [
            "Le prix unitaire",
            "La couleur du packaging",
            "La quantité (stepper − / + entre 1 et 10)",
            "Rien, c'est figé",
          ],
          correctIndex: 2,
          wrongAnswerHints: {
            0: "Les prix sont fixes (catalogue Herbalife) — tu ne négocies pas dans Lor'Squad.",
            1: "C'est de la déco, pas du fonctionnel.",
            3: "Si si, la quantité est ajustable depuis le chantier D-urgent (avril 2026).",
          },
          explanation: "Chaque produit retenu a un stepper de quantité 1-10. Le total prix et PV du ticket recalcule automatiquement. Persisté en jsonb dans questionnaire.selectedProductQuantities.",
        },
      ],
    },
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
        crossRefs: [
          { label: "Templates messages multi-canal", sectionId: "messages-and-clients" },
        ],
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
    quiz: {
      passThreshold: 0.8,
      questions: [
        {
          id: "q1",
          question: "Le protocole de suivi automatique pose 4 checkpoints — lesquels ?",
          answers: [
            "J+1, J+7, J+30, J+90",
            "J+1, J+3, J+7, J+10",
            "Tous les jours pendant 10 jours",
            "Aucun, c'est manuel",
          ],
          correctIndex: 1,
          wrongAnswerHints: {
            0: "Trop espacé — sur 90 jours tu perds le client en route.",
            2: "Trop intrusif — un message par jour fatigue le client.",
            3: "Si si, c'est automatisé. Lor'Squad pousse les bons rappels au bon moment.",
          },
          explanation: "Les 4 checkpoints J+1 / J+3 / J+7 / J+10 couvrent les jours critiques : bienvenue, premiers ressentis, accompagnement VIP, check énergie. Calibrés pour maximiser la rétention sans spam.",
        },
        {
          id: "q2",
          question: "À quelle heure tombe le digest matin avec les actions du jour ?",
          answers: ["6h", "7h", "9h", "12h"],
          correctIndex: 1,
          wrongAnswerHints: {
            0: "Trop tôt — la majorité des coachs dorment encore.",
            2: "Trop tard pour anticiper la journée.",
            3: "C'est le déjeuner — la journée est déjà bien lancée.",
          },
          explanation: "Le cron morning-suivis-digest tourne à 7h00 (Europe/Paris) et envoie une push notif avec les actions du jour : RDV imminents, follow-ups en retard, clients à contacter.",
        },
        {
          id: "q3",
          question: "La période de grâce d'un RDV (durée pendant laquelle il reste « actif » après l'heure prévue) ?",
          answers: ["5 min", "15 min", "30 min", "1 heure"],
          correctIndex: 1,
          wrongAnswerHints: {
            0: "Trop court — un client en retard de transport, c'est plus de 5 min.",
            2: "Trop long — au-delà de 15 min on considère que le RDV est manqué.",
            3: "Beaucoup trop long, l'agenda serait incohérent.",
          },
          explanation: "Période de grâce de 15 min : un RDV reste « actif » 15 minutes après l'heure prévue. Utile si le client est en retard ou si tu es en RDV avec un autre. Au-delà → marqué manqué.",
        },
        {
          id: "q4",
          question: "Un client marqué « Pas démarré » dans le protocole de suivi, ça veut dire quoi ?",
          answers: [
            "Il reçoit toutes les relances automatiques",
            "Il est exclu du protocole automatique (pas de spam relance)",
            "Son compte est suspendu",
            "Il est facturé en double",
          ],
          correctIndex: 1,
          wrongAnswerHints: {
            0: "L'inverse — c'est justement pour ne PAS le harceler de relances.",
            2: "Aucun client n'est suspendu, c'est juste un statut de suivi.",
            3: "Lor'Squad ne facture rien — c'est un outil interne club.",
          },
          explanation: "« Pas démarré » = le client n'a pas commencé le programme. On l'exclut automatiquement du protocole pour éviter les relances « Comment ça s'est passé ? » alors qu'il n'a rien fait.",
        },
        {
          id: "q5",
          question: "Tu peux exporter un client (sa fiche complète) — pour quel usage principal ?",
          answers: [
            "Pour le supprimer définitivement",
            "Pour transmettre la fiche à un autre coach (transfert) ou archive locale",
            "Pour le facturer",
            "Pour copier ses données chez un concurrent",
          ],
          correctIndex: 1,
          wrongAnswerHints: {
            0: "L'export ne supprime rien — c'est une copie.",
            2: "Pas de facturation dans Lor'Squad.",
            3: "Pas l'objectif — et juridiquement risqué (RGPD).",
          },
          explanation: "L'export client génère un fichier complet (bilans, programme, suivis) pour transfert intra-club ou archive personnelle. Utile quand un client change de coach référent ou pour ses propres archives.",
        },
      ],
    },
  },
  {
    id: "messages-and-clients",
    title: "Messagerie & dossiers clients",
    shortLabel: "Messages",
    description: "Envoie un message multi-canal, filtre tes clients, archive ceux qui ne suivent plus.",
    estimatedDurationMinutes: 3,
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
        id: "quick-templates-cta",
        title: "Messages rapides — le canal externe (WhatsApp / SMS / Telegram)",
        body: "La messagerie interne c'est puissant pour les clients déjà installés sur l'app Lor'Squad. Mais 80 % de tes échanges quotidiens passent par WhatsApp / SMS / Telegram — c'est là que tes clients vivent. Sur chaque fiche client, en haut de l'onglet Actions, le bouton gold « 💬 Envoyer un message » te donne un raccourci direct vers ces canaux externes, avec des templates pré-rédigés intelligents.",
        placement: "center",
        illustrationKey: "sparkles",
      },
      {
        id: "quick-templates-modal",
        title: "5 templates intelligents + 4 canaux d'envoi",
        body: "Click sur le CTA gold → modale popup. À gauche : 5 templates (Confirmation RDV imminent, Félicitation perte de poids, Relance douce ≥14j, Rappel commande, Anniversaire programme). Les pertinents pour CE client sont en tête avec un badge teal « PERTINENT » (ex : la félicitation perte de poids n'apparaît PERTINENT que si une perte est constatée entre 2 bilans). À droite : aperçu du message déjà personnalisé avec son prénom, ses chiffres, ton nom de coach — éditable. En bas : 4 boutons d'envoi (📱 WhatsApp / 💬 SMS / ✈️ Telegram / 📋 Copier). Tu choisis le canal, ton message s'envoie pré-rempli avec son numéro. 30 secondes au lieu de 5 minutes par client.",
        placement: "center",
        illustrationKey: "rocket",
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
    quiz: {
      passThreshold: 0.8,
      questions: [
        {
          id: "q1",
          question: "Pour supprimer définitivement un client qui ne suit plus, tu fais quoi ?",
          answers: [
            "Bouton Supprimer en haut de la fiche",
            "Tu le passes en Arrêté ou Perdu via le sélecteur lifecycle (il reste en base)",
            "Tu écris à l'admin pour le retirer",
            "Tu changes son numéro de téléphone",
          ],
          correctIndex: 1,
          wrongAnswerHints: {
            0: "Pas de bouton supprimer dans Lor'Squad — l'historique est précieux.",
            2: "Pas besoin — le sélecteur lifecycle suffit, accessible depuis ta fiche client.",
            3: "Aucun rapport — modifier le tel ne supprime rien.",
          },
          explanation: "Lor'Squad n'a pas de suppression brutale (l'historique a de la valeur). Tu marques le client en Arrêté ou Perdu via lifecycle → il sort des digests, du dashboard et du protocole. Réactivable à tout moment.",
        },
        {
          id: "q2",
          question: "Sur l'onglet À traiter de la messagerie, qu'est-ce qui apparaît ?",
          answers: [
            "Toutes les conversations sans exception",
            "Uniquement les conversations où le client attend ta réponse",
            "Uniquement les conversations archivées",
            "Tes messages envoyés",
          ],
          correctIndex: 1,
          wrongAnswerHints: {
            0: "Trop large — c'est l'onglet Inbox qui montre tout.",
            2: "L'archive est dans son propre onglet, pas À traiter.",
            3: "Tes envois sont dans Inbox aussi, mais marqués « lus ».",
          },
          explanation: "L'onglet À traiter filtre les conversations où c'est ton tour de répondre (dernier message = client, non lu par toi). Vue prioritaire pour ne jamais laisser un client en attente.",
        },
        {
          id: "q3",
          question: "Tu veux relancer tous les clients « En pause » d'un seul coup. Comment fais-tu ?",
          answers: [
            "Tu copies-colles à la main pour chaque client",
            "Tu filtres par statut « En pause » dans Clients, puis utilises Messages rapides ou WhatsApp groupé",
            "Tu attends qu'ils reviennent d'eux-mêmes",
            "Impossible, Lor'Squad ne permet pas",
          ],
          correctIndex: 1,
          wrongAnswerHints: {
            0: "Sloweur — le filtre + templates fait gagner 80 % du temps.",
            2: "Stratégie passive qui te coûte des clients.",
            3: "Au contraire, c'est exactement le cas d'usage prévu.",
          },
          explanation: "Filtre rapide « En pause » sur la page Clients → ouvre la fiche → bouton « Envoyer un message » → template Relance douce + canal WhatsApp/SMS/Telegram. Conçu pour ce cas précis.",
        },
        {
          id: "q4",
          question: "Le bouton « Envoyer un message » sur la fiche client offre quels canaux ?",
          answers: [
            "WhatsApp uniquement",
            "WhatsApp + SMS",
            "WhatsApp + SMS + Telegram + Copier",
            "Email",
          ],
          correctIndex: 2,
          wrongAnswerHints: {
            0: "Pas que. Tous tes clients ne sont pas sur WhatsApp.",
            1: "Il manque les 2 autres canaux qui couvrent les cas restants.",
            3: "Pas d'email pour les messages quotidiens — trop formel pour le coaching.",
          },
          explanation: "4 canaux : 📱 WhatsApp (par défaut, numéro pré-rempli), 💬 SMS (fallback iPhone vieux), ✈️ Telegram (clients sensibles à la confidentialité), 📋 Copier (canal libre).",
        },
        {
          id: "q5",
          question: "Les templates de message rapides s'adaptent au contexte du client. Combien y en a-t-il et qu'est-ce qui détermine leur pertinence ?",
          answers: [
            "1 template universel",
            "5 templates avec un prédicat applicable() qui détecte si pertinent (RDV imminent, perte poids, silence prolongé, etc.)",
            "10 templates au hasard",
            "Aucun, tu écris tout à la main",
          ],
          correctIndex: 1,
          wrongAnswerHints: {
            0: "Trop simple — un seul template ne couvre pas tous les contextes coaching.",
            2: "Pas au hasard — chaque template a une logique métier précise.",
            3: "Sans templates tu perds 30 min/jour à rédiger les mêmes messages.",
          },
          explanation: "5 templates : confirmation RDV imminent, félicitation perte poids, relance douce silence ≥14j, rappel commande produit, anniversaire programme (1/3/6 mois). Chacun a un applicable(client, ctx) qui détermine la pertinence. Badge PERTINENT affiché si applicable.",
        },
      ],
    },
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
        crossRefs: [
          { label: "Comment installer la PWA côté coach", sectionId: "rituals" },
        ],
      },
    ],
    quiz: {
      passThreshold: 0.8,
      questions: [
        {
          id: "q1",
          question: "Le QR code dans la modale d'accès client, c'est utile quand ?",
          answers: [
            "Jamais, c'est juste pour faire joli",
            "En RDV physique : le client scanne avec son téléphone et son app s'ouvre",
            "Pour vérifier ton ID Herbalife",
            "Pour valider tes commissions",
          ],
          correctIndex: 1,
          wrongAnswerHints: {
            0: "Pas du tout — c'est l'effet WAOUH du RDV physique.",
            2: "Aucun rapport avec ton ID Herbalife.",
            3: "Aucun rapport avec les commissions.",
          },
          explanation: "QR code 180×180 dans la modale Accès client : en RDV physique, le client scanne avec son appareil photo, son app s'ouvre instantanément sur son espace perso. Moment WAOUH qui ferme la vente sur le service.",
        },
        {
          id: "q2",
          question: "Côté client dans son app, qu'est-ce qu'il voit en priorité sur l'onglet Accueil ?",
          answers: [
            "Un compteur de PV",
            "Un hero personnalisé + card RDV avec 4 actions (Calendar, ICS, Maps, Modifier)",
            "Un formulaire de feedback",
            "Une pub Herbalife",
          ],
          correctIndex: 1,
          wrongAnswerHints: {
            0: "Le PV c'est ton compteur côté distri, pas côté client.",
            2: "Le feedback est ailleurs (avis Google), pas en page d'accueil.",
            3: "Aucune pub — Lor'Squad respecte l'expérience client.",
          },
          explanation: "Hero perso (« Bonjour Sarah ») + card RDV gold avec 4 CTAs : Ajouter à Google Calendar, télécharger .ics, ouvrir Maps, contacter pour modifier. C'est ce qui rend le RDV vivant pour le client.",
        },
        {
          id: "q3",
          question: "L'app client utilise quelle stratégie data pour ne pas casser les RLS ?",
          answers: [
            "Elle fait des SELECT directs sur les tables Supabase",
            "Elle passe par l'edge function client-app-data avec service_role + token uuid",
            "Elle stocke tout en local sur l'appareil",
            "Elle copie les données depuis l'app coach",
          ],
          correctIndex: 1,
          wrongAnswerHints: {
            0: "Dangereux — c'est la frayeur RLS d'avril 2026 qu'on ne refait pas.",
            2: "Pas viable — les données changent côté coach et doivent remonter.",
            3: "Aucune copie — l'app client est autonome.",
          },
          explanation: "L'edge function client-app-data valide le token uuid (client_app_accounts.token), fait les SELECT en service_role (bypass RLS propre), et renvoie un payload normalisé. Aucun SELECT direct côté front client.",
        },
        {
          id: "q4",
          question: "Si l'edge function client-app-data plante, qu'est-ce qui se passe côté client ?",
          answers: [
            "L'app crash et affiche une erreur 500",
            "L'app fallback silencieusement sur les snapshots de client_app_accounts",
            "Le client est déconnecté",
            "Tous les coachs sont notifiés",
          ],
          correctIndex: 1,
          wrongAnswerHints: {
            0: "Pas de crash — Lor'Squad est résilient aux pannes back.",
            2: "L'auto-login fonctionne sur le token, pas sur l'edge — il reste connecté.",
            3: "Pas de notif systémique pour ce cas (overkill).",
          },
          explanation: "Fallback snapshot : si l'edge plante, l'app affiche les snapshots figés de client_app_accounts (program_title, next_follow_up). Bandeau orange en haut pour signaler le mode dégradé. UX préservée.",
        },
        {
          id: "q5",
          question: "Le bouton « Laisser un avis Google » côté client est placé à quel moment optimal ?",
          answers: [
            "Dès l'ouverture de l'app (avant qu'il voie son programme)",
            "Sur la page remerciement post-bilan ET menu profil — après qu'il ait vu sa progression",
            "Une fois par jour en pop-up",
            "Jamais, c'est tabou",
          ],
          correctIndex: 1,
          wrongAnswerHints: {
            0: "Trop tôt — il n'a rien vu, il ne peut pas avoir d'avis fondé.",
            2: "Trop intrusif — un pop-up quotidien fait fuir le client.",
            3: "Au contraire, c'est une stratégie de croissance organique majeure.",
          },
          explanation: "Timing optimal : page remerciement post-bilan (effet WAOUH) + menu profil après plusieurs semaines (transformation visible). Pas de pop-up intrusif. Plus tes clients progressent, plus tu collectes d'avis 5★ → meilleur référencement local.",
        },
      ],
    },
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
        body: "Le métier de distri Herbalife, ce n'est pas un sprint, c'est un rythme. Deux habitudes prises dès le départ font 80 % du résultat : 1) avoir Lor'Squad sous la main comme une app native (3 secondes pour répondre à un client), 2) regarder ton volume PV chaque matin pour piloter ton mois sans surprise. Ces 2 réflexes sont ce qui sépare un distri qui galère de celui qui monte les paliers tranquillement. Cette section te les installe.",
        placement: "center",
        illustrationKey: "sparkles",
      },
      {
        id: "pwa-install",
        target: '[data-tour-id="pwa-install"]',
        placement: "top",
        title: "Installe l'app native (PWA)",
        body: "Le bouton « Installer Lor'Squad » dans la sidebar ajoute l'icône à ton écran d'accueil — l'app s'ouvre alors en plein écran sans barre navigateur, avec notifs push activées. Chrome / Edge : 1 clic. iPhone Safari : Partage → Sur l'écran d'accueil. Une fois installé, tu lances Lor'Squad comme WhatsApp ou Instagram. Pourquoi c'est important : un client qui t'envoie un message attend une réponse en quelques minutes, pas en quelques heures. Avec la PWA + push notif, tu vois la notif sur ton home screen et tu réponds en 1 tap. C'est ça qui fait la différence entre « il m'a calculé » et « je sens qu'il est dispo pour moi ».",
        manualAdvance: true,
      },
      {
        id: "pv-gauge",
        target: '[data-tour-id="pv-gauge"]',
        placement: "top",
        route: "/co-pilote",
        title: "La jauge PV mensuelle — ton tableau de bord",
        body: "Sur ton Co-pilote, le bloc PV affiche ta jauge circulaire avec couleur graduée : rouge (< 40 % du seuil), ambre (40-60 %), vert (≥ 60 %). Seuil par défaut 2 500 PV (palier Success Builder qualifiant) — éditable dans Paramètres > Profil > Objectif PV mensuel quand tu veux passer à 4 000 (Supervisor) puis plus haut. La jauge se met à jour en temps réel à chaque commande client validée. Ouvre-la le matin avec ton café : 5 secondes pour savoir où tu en es. Si tu es en rouge le 20 du mois, tu sais que tu dois pousser sur 2-3 relances clients dans la semaine. Si tu es en vert le 10, tu sais que tu peux investir ton temps sur la prospection plutôt que la pression PV.",
        manualAdvance: true,
      },
      {
        id: "mini-stats",
        target: '[data-tour-id="pv-mini-stats"]',
        placement: "top",
        route: "/co-pilote",
        title: "3 mini-stats — la santé de ton activité",
        body: "À côté de la jauge PV, 3 chiffres clés : Clients actifs (avec delta vs mois dernier en + ou −), RDV cette semaine (sur 7 jours glissants + nombre du jour), Conversion (% de prospects transformés en clients ce mois). Ces 3 chiffres te disent en 5 secondes si ton activité est en bonne santé ou si tu dois corriger : un PV qui monte mais avec 0 nouveau client, c'est un signal d'alerte (tu pompes ta base actuelle, pas durable). Une conversion qui chute, c'est souvent que tu prospectes trop large ou pas le bon profil. Lis ces stats comme un médecin lit une prise de sang — pas pour stresser, pour ajuster.",
        manualAdvance: true,
      },
      {
        id: "pv-detail",
        target: '[data-tour-id="nav-pv"]',
        placement: "bottom",
        title: "L'onglet Suivi PV — le détail produit par produit",
        body: "Pour creuser : historique mensuel, projection sur la fin du mois (en fonction du rythme actuel), liste des produits actifs par client (durée de stock restante, dates de relance auto). Si un client n'a pas reçu sa commande renouvelée à temps, il apparaît en alerte rouge — c'est ton signal pour le contacter AVANT qu'il décroche. C'est aussi cet onglet qui te dit quels produits tournent le mieux dans ta base : si tu vois 80 % de Formula 1 et 0 % de boosters sport, tu sais que tu rates un upsell évident sur tes clients sportifs. La régularité PV se construit ici, pas dans la prospection — fidéliser un client coûte 5× moins que d'en trouver un nouveau.",
        manualAdvance: true,
      },
      {
        id: "monthly-rhythm",
        title: "Le rythme mensuel = paliers Herbalife",
        body: "Vise ton seuil PV chaque mois sans exception. La régularité est ce qui fait monter ton rang Herbalife (Senior Consultant → Success Builder → Supervisor → World Team → GET → Millionaire). Ne te demande pas si tu peux faire un gros mois exceptionnel — demande-toi si tu peux faire 12 mois honnêtes d'affilée. C'est la combinaison qui débloque les niveaux. Ton coach référent voit aussi ta progression Academy + ton PV en temps réel sur sa fiche team — il peut te coacher au bon moment, pas juste en fin de mois quand c'est trop tard. Mets-toi un point toi-même chaque dimanche soir : 5 minutes pour regarder ta jauge, anticiper la semaine suivante, planifier 2-3 relances. Ce rituel hebdo de 5 min vaut plus que 3h de prospection le 28 du mois en panique.",
        placement: "center",
      },
      {
        id: "outro",
        title: "{firstName}, tu es prêt 🎉",
        body: "Bravo {firstName}, tu as terminé l'Academy Lor'Squad. Tu connais le bilan, le programme, l'agenda, la messagerie, l'app client et tes rituels PV. {coachName} verra ta complétion sur sa fiche team. Tu peux relancer n'importe quelle section via /academy. Maintenant : ton premier vrai bilan client.",
        placement: "center",
        illustrationKey: "trophy",
        isLast: true,
        nextLabel: "Terminer l'Academy",
      },
    ],
    quiz: {
      passThreshold: 0.8,
      questions: [
        {
          id: "q1",
          question: "Quel est le seuil PV mensuel par défaut dans Lor'Squad pour démarrer ?",
          answers: ["1 000 PV", "2 500 PV", "5 000 PV", "13 000 PV"],
          correctIndex: 1,
          wrongAnswerHints: {
            0: "Trop bas pour un objectif structurant — Lor'Squad démarre à 2 500.",
            2: "C'est l'étape d'après — vise d'abord 2 500 régulier avant d'augmenter.",
            3: "C'est un palier avancé — pas le seuil de démarrage par défaut.",
          },
          explanation: "Le seuil par défaut est 2 500 PV / mois — un palier réaliste pour démarrer et progresser sans pression. Modifiable dans Paramètres > Profil > Objectif PV mensuel quand tu veux viser plus haut.",
        },
        {
          id: "q1b",
          question:
            "Tu es à 1 200 PV le 18 du mois sur un objectif de 2 500. Quelle est la meilleure stratégie ?",
          answers: [
            "Attendre le 28 et lancer une promo flash dernière minute",
            "Identifier 2-3 clients actifs prêts à renouveler et les relancer cette semaine",
            "Démarrer une grosse campagne de prospection nouvelle pour rattraper",
            "Baisser ton objectif à 1 500 pour ce mois pour ne pas avoir la pression",
          ],
          correctIndex: 1,
          wrongAnswerHints: {
            0: "Trop tard et trop court — fin de mois en panique = bad mood et résultats moyens.",
            2: "La prospection a un cycle long (2-4 semaines avant 1er bilan) — ça ne ratrappe pas le mois en cours, mais c'est utile pour le suivant.",
            3: "Baisser l'objectif n'est pas une stratégie — la régularité fait le rang Herbalife.",
          },
          explanation:
            "À mi-mois, le levier le plus rapide est la base existante : qui consomme un produit avec une cure qui se termine dans 7-10 j ? Une relance bienveillante (« tu en es où sur ton F1 ? ») suffit souvent à déclencher un réassort. 2-3 relances = ~600-1200 PV récupérés en quelques jours. C'est la stratégie « chaque dimanche soir » : 5 min de regard sur la jauge + planifier la semaine.",
        },
        {
          id: "q2",
          question: "À quelle heure tombe le digest matin de tes suivis ?",
          answers: ["6h", "7h", "8h", "9h"],
          correctIndex: 1,
          wrongAnswerHints: {
            0: "Trop tôt — la majorité des coachs ne veulent pas être notifiés avant leur réveil.",
            2: "Trop tard — l'idée est d'arriver dans la fenêtre café-matin (7h-8h).",
            3: "Trop tard, la journée est déjà lancée.",
          },
          explanation: "Le cron morning-suivis-digest tourne à 7h00 chaque matin (Europe/Paris) et envoie une push notif avec les actions du jour : RDV imminent, follow-ups en retard.",
        },
        {
          id: "q3",
          question: "Tu installes l'app comme une PWA. Quel bénéfice opérationnel principal tu gagnes ?",
          answers: [
            "L'app prend moins de place sur ton téléphone",
            "Notifs push activées + lancement direct depuis l'écran d'accueil",
            "Les données sont stockées en clair sur ton appareil",
            "Tu n'as plus besoin d'internet",
          ],
          correctIndex: 1,
          wrongAnswerHints: {
            0: "Marginal. Le vrai gain n'est pas la place, c'est la réactivité.",
            2: "Faux et dangereux — Lor'Squad ne stocke rien en clair, tout passe par Supabase.",
            3: "Faux. Internet reste nécessaire pour la messagerie et les RDV — il y a juste un cache offline limité.",
          },
          explanation: "PWA = notifs push (tu vois la notif dès que ton client t'écrit) + accès 1 tap depuis le home screen. Tu réponds en 1 minute au lieu de 1 heure → c'est ça qui fait sentir ton client suivi.",
        },
        {
          id: "q4",
          question: "Sur la jauge PV, à quel pourcentage la couleur passe au vert ?",
          answers: ["≥ 40 %", "≥ 50 %", "≥ 60 %", "≥ 80 %"],
          correctIndex: 2,
          wrongAnswerHints: {
            0: "Trop tôt pour passer en vert — à 40 % tu es encore en zone ambre.",
            1: "Pas tout à fait. Le seuil est calé un cran au-dessus pour rester exigeant.",
            3: "Trop strict — la jauge serait toujours rouge/ambre, pas motivant.",
          },
          explanation: "Code couleur jauge PV : rouge < 40 %, ambre 40-60 %, vert ≥ 60 %. À 60 % du seuil, tu es sur une trajectoire saine pour finir le mois qualifié.",
        },
        {
          id: "q5",
          question: "Le rituel hebdo recommandé par Lor'Squad, c'est quoi ?",
          answers: [
            "Faire le bilan PV chaque dimanche soir (5 min)",
            "Appeler chaque client une fois par semaine",
            "Renvoyer un message à tous les prospects le lundi",
            "Mettre à jour son catalogue Herbalife",
          ],
          correctIndex: 0,
          wrongAnswerHints: {
            1: "Trop intrusif — un appel hebdo par client = tu tues la relation. Mieux vaut quand c'est utile.",
            2: "Spam — relance ciblée > relance massive. Lor'Squad propose les relances pertinentes.",
            3: "Pas un rituel hebdo — le catalogue ne bouge pas tous les 7 jours.",
          },
          explanation: "Le rituel-clé : 5 minutes le dimanche soir pour regarder ta jauge PV, anticiper la semaine, planifier 2-3 relances ciblées. Plus efficace que 3h de prospection en panique le 28 du mois.",
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
