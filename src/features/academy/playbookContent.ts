// =============================================================================
// Contenu du Playbook personnalise (Tier B #7 — 2026-04-28)
// =============================================================================
//
// Apres completion de l Academy, le user peut telecharger un PDF nominatif
// "Le playbook de [Prenom]" qui resume les concepts cles de chaque section.
// 1 page A4 par section + 1 page de couverture personnalisee = 9 pages.
//
// Structure : pour chaque section Academy, 4-5 takeaways concrets, une
// punchline metier, et 1-2 chiffres a retenir.
// =============================================================================

export interface PlaybookTakeaway {
  emoji: string;
  title: string;
  detail: string;
}

export interface PlaybookSection {
  sectionId: string;
  /** Titre de la page (1-2 mots accrocheurs). */
  pageTitle: string;
  /** Sous-titre (10-15 mots). */
  subtitle: string;
  /** Emoji visuel principal de la page. */
  icon: string;
  /** 4-5 takeaways concrets a afficher comme cards. */
  takeaways: PlaybookTakeaway[];
  /** Punchline a la fin de la page (1 phrase impactante). */
  punchline: string;
  /** Chiffre cle a mettre en avant (optionnel). */
  keyNumber?: { value: string; label: string };
}

export const PLAYBOOK_SECTIONS: PlaybookSection[] = [
  {
    sectionId: "welcome",
    pageTitle: "Profil distri",
    subtitle:
      "Ton compte Lor'Squad relie ton lignage Herbalife et ton coach interne. Deux liens distincts, ne pas confondre.",
    icon: "👤",
    takeaways: [
      {
        emoji: "🔗",
        title: "Sponsor vs coach référent",
        detail:
          "Le sponsor c'est l'arbre Herbalife (commissions). Le coach référent c'est qui te suit dans Lor'Squad. Souvent identiques, parfois différents.",
      },
      {
        emoji: "🆔",
        title: "ID Herbalife = 10 caractères",
        detail:
          "Format strict : 2 chiffres + 1 lettre majuscule + 7 chiffres (ex : 21Y0103610). Tu le trouves sur MyHerbalife → Mon profil.",
      },
      {
        emoji: "👁️",
        title: "Visibilité scope team",
        detail:
          "Ton statut Academy + ton ID sont visibles par admin du club + ton coach + ton sponsor (s'il est inscrit). Pas par les autres distri.",
      },
      {
        emoji: "💼",
        title: "Pas de coach = pas de filet",
        detail:
          "Sans coach référent, tu fonctionnes mais personne n'est alerté si tu décroches. C'est le maillon humain qui te garde dans la dynamique.",
      },
    ],
    punchline:
      "Ton profil bien rempli, c'est 5 minutes une fois pour gagner des heures de support futur.",
  },
  {
    sectionId: "app-tour",
    pageTitle: "L'app en 60 secondes",
    subtitle:
      "Co-pilote, Agenda, Messagerie, Clients, Suivi PV : 5 onglets qui couvrent 80 % de ton activité quotidienne.",
    icon: "🧭",
    takeaways: [
      {
        emoji: "🧭",
        title: "Co-pilote = ton dashboard matin",
        detail:
          "Jauge PV mensuelle + 3 mini-stats (clients actifs, RDV semaine, conversion). 5 secondes pour piloter ta journée.",
      },
      {
        emoji: "📅",
        title: "Agenda centralise tous tes RDV",
        detail:
          "Vue jour/semaine/mois + filtres + push notif via cron rdv-imminent (toutes les 5 min).",
      },
      {
        emoji: "💬",
        title: "Messagerie : 3 sous-onglets",
        detail:
          "Inbox (tout) / À traiter (où le client attend ta réponse) / Archive. Badge de non-lues sur l'onglet.",
      },
      {
        emoji: "✨",
        title: "+ Nouveau bilan = ton geste central",
        detail:
          "Wizard guidé qui crée client + bilan + programme + lien d'app perso en un seul flow. C'est le sujet de la section suivante.",
      },
    ],
    punchline:
      "Connaître l'app c'est servir tes clients en 1 tap au lieu de 5 minutes.",
  },
  {
    sectionId: "first-bilan",
    pageTitle: "Le bilan, ton rituel central",
    subtitle:
      "13 étapes dynamiques en 8 à 12 minutes. Lor'Squad fait l'admin, toi tu écoutes le client.",
    icon: "📋",
    takeaways: [
      {
        emoji: "🔢",
        title: "11 étapes par défaut, 13 en sport",
        detail:
          "Le wizard ajoute 2 étapes pour les sportifs (profil sport + apports actuels) qui alimentent les calculs et les alertes.",
      },
      {
        emoji: "📞",
        title: "Téléphone obligatoire",
        detail:
          "Pour envoyer le récap WhatsApp en 1 clic depuis la page remerciement. Sans tél = friction post-bilan.",
      },
      {
        emoji: "📏",
        title: "Body scan minimum : poids + taille + âge",
        detail:
          "Suffit pour calculer IMC, eau cible, protéines. Tour de taille / photo / impédance = bonus.",
      },
      {
        emoji: "🎉",
        title: "Page remerciement post-validation",
        detail:
          "Plein écran avec QR code 240×240 + boutons WhatsApp / SMS / Telegram + lien parrainage. C'est ton moment WAOUH en RDV.",
      },
    ],
    punchline: "Un bilan pro fait 30 % du closing avant même que tu parles produits.",
    keyNumber: { value: "8-12", label: "minutes en RDV réel" },
  },
  {
    sectionId: "program",
    pageTitle: "Le Programme",
    subtitle:
      "Recommandations ⭐ pertinentes selon le profil + ticket prix/PV temps réel + 6 alertes sport.",
    icon: "🎯",
    takeaways: [
      {
        emoji: "⭐",
        title: "Boosters ⭐ = produits recommandés",
        detail:
          "Étoile + fond teal sur les boosters proposés par les règles métier (sport, hydratation…). Tu les expliques au client : « voilà pourquoi ».",
      },
      {
        emoji: "🛒",
        title: "Ticket live : prix + PV",
        detail:
          "Le ticket à droite affiche prix total ET PV total qui s'actualisent à chaque ajout. Indispensable pour suivre ton volume mensuel en RDV.",
      },
      {
        emoji: "⚠️",
        title: "6 alertes sport bloquantes",
        detail:
          "Hydratation, protéines, sommeil, masse musculaire, snack, fréquence sport. Acquittement obligatoire avant validation du bilan.",
      },
      {
        emoji: "🔢",
        title: "Stepper quantité 1-10",
        detail:
          "Sur chaque produit retenu, ajuste la quantité avec − / +. Le ticket et le PV recalculent automatiquement.",
      },
    ],
    punchline: "Le programme bien construit fidélise. Le programme à l'arrache se renouvelle 2 fois max.",
  },
  {
    sectionId: "agenda",
    pageTitle: "Agenda & follow-ups",
    subtitle:
      "Protocole automatique 14 jours + digest matin 7h + période de grâce 15 min : pilotage chirurgical du suivi.",
    icon: "📅",
    takeaways: [
      {
        emoji: "🗓️",
        title: "4 checkpoints J+1 / J+3 / J+7 / J+10",
        detail:
          "Lor'Squad note ces 4 contacts sur ton dashboard. Bienvenue, premiers ressentis, VIP, check énergie. Calibrés rétention sans spam.",
      },
      {
        emoji: "⏰",
        title: "Digest matin à 7h",
        detail:
          "Le cron morning-suivis-digest envoie une push notif chaque matin avec les actions du jour : RDV imminents + follow-ups en retard.",
      },
      {
        emoji: "🛡️",
        title: "Période de grâce 15 min",
        detail:
          "Un RDV reste « actif » 15 min après l'heure prévue. Au-delà → marqué manqué. Évite de paniquer si client en retard.",
      },
      {
        emoji: "🚫",
        title: "« Pas démarré » = exclu du protocole",
        detail:
          "Un client qui n'a pas commencé son programme est automatiquement exclu des relances « Comment ça se passe ? ». Pas de spam.",
      },
    ],
    punchline: "Le rythme bien géré transforme un coach occupé en un coach pro.",
    keyNumber: { value: "7h", label: "digest matin (Europe/Paris)" },
  },
  {
    sectionId: "messages-and-clients",
    pageTitle: "Messages & dossiers clients",
    subtitle:
      "Messagerie interne (app) + canaux externes (WhatsApp/SMS/Telegram) + lifecycle : tu jongles propre.",
    icon: "💬",
    takeaways: [
      {
        emoji: "📱",
        title: "5 templates intelligents multi-canal",
        detail:
          "Confirmation RDV, félicitation perte poids, relance douce ≥14j, rappel commande, anniversaire programme. Badge PERTINENT contextuel.",
      },
      {
        emoji: "🎯",
        title: "4 canaux d'envoi",
        detail:
          "WhatsApp (par défaut, numéro pré-rempli), SMS (fallback), Telegram (clients sensibles privacy), Copier (canal libre).",
      },
      {
        emoji: "🗂️",
        title: "Archivage soft via lifecycle",
        detail:
          "Pas de bouton supprimer. Tu passes le client en Arrêté ou Perdu → il sort des digests + dashboard, mais reste en base. Réactivable à tout moment.",
      },
      {
        emoji: "⏱️",
        title: "30 sec au lieu de 5 min",
        detail:
          "Templates pré-personnalisés (prénom, chiffres, signature) + canaux à 1 tap. Tu envoies 10 messages en 5 min au lieu de 1.",
      },
    ],
    punchline: "Le bon message au bon moment = la rétention que tes concurrents distri n'ont pas.",
  },
  {
    sectionId: "client-app",
    pageTitle: "L'app client (la vitrine)",
    subtitle:
      "QR code en RDV + 4 onglets côté client + edge function service_role + avis Google : ton multiplicateur.",
    icon: "📱",
    takeaways: [
      {
        emoji: "📲",
        title: "QR code = effet WAOUH RDV",
        detail:
          "180×180 dans la modale Accès. Le client scanne avec son téléphone, son app s'ouvre instantanément sur son espace perso.",
      },
      {
        emoji: "🏠",
        title: "Hero perso + card RDV 4 actions",
        detail:
          "« Bonjour Sarah » + card RDV gold avec Google Calendar / .ics / Maps / Modifier. Le RDV devient vivant pour le client.",
      },
      {
        emoji: "🔒",
        title: "client-app-data en service_role",
        detail:
          "Aucun SELECT direct côté front client. L'edge function valide le token uuid, fait les SELECT bypass RLS, renvoie un payload normalisé.",
      },
      {
        emoji: "⭐",
        title: "Avis Google au bon timing",
        detail:
          "Bouton sur la page remerciement post-bilan + menu profil après plusieurs semaines. Tes clients qui progressent → tes étoiles 5★.",
      },
    ],
    punchline: "Plus le client utilise son app, plus il progresse. Plus il progresse, plus il en parle.",
  },
  {
    sectionId: "rituals",
    pageTitle: "Tes rituels distri",
    subtitle:
      "PWA + jauge PV matin + rituel hebdo dimanche soir : 80 % du résultat vient de ces 3 habitudes.",
    icon: "🎯",
    takeaways: [
      {
        emoji: "📲",
        title: "Installer l'app en PWA",
        detail:
          "Sidebar → bouton « Installer Lor'Squad ». Notifs push activées + lancement direct depuis home screen. Tu réponds en 1 min au lieu de 1 heure.",
      },
      {
        emoji: "🎯",
        title: "Jauge PV : couleur graduée",
        detail:
          "Rouge < 40 % du seuil, ambre 40-60 %, vert ≥ 60 %. Ouvre-la le matin avec ton café : 5 sec pour savoir où tu en es.",
      },
      {
        emoji: "📊",
        title: "3 mini-stats = prise de sang",
        detail:
          "Clients actifs (delta vs mois dernier), RDV semaine, conversion (% prospects → clients). Lis-les pour ajuster, pas pour stresser.",
      },
      {
        emoji: "📅",
        title: "Rituel hebdo 5 min dimanche soir",
        detail:
          "Regarde ta jauge, anticipe la semaine, planifie 2-3 relances ciblées. Vaut 3h de prospection en panique le 28 du mois.",
      },
    ],
    punchline: "La régularité fait monter ton rang Herbalife. 12 mois honnêtes > 1 mois exceptionnel.",
    keyNumber: { value: "2 500", label: "PV qualifiants Success Builder" },
  },
];
