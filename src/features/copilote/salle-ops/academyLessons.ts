// =============================================================================
// academyLessons — le contenu pédagogique du cockpit « La Base Académie ».
//
// Une leçon par ACTION-clé (porte d'activation), au format APPRENDRE → FAIRE →
// PREUVE. Contenu rédigé à partir du Notion La Base (Démarrage 30j, Scripts &
// HOM, Academy 6 Go Pro, Trainee Coach / cobaye, Breakfast Club). Langage
// débutant, tutoiement. Thomas n'édite QUE ce fichier pour ajuster les leçons.
//
// Réf Notion : voir mémoire reference_notion_hub_labase.
// =============================================================================

export interface AcademyLesson {
  /** Étape Go Pro (1 Trouver · 2 Inviter · 3 Présenter · 4 Relancer …). */
  goProStep: number;
  goProLabel: string;
  /** Titre court de la leçon (Anton, CAPS). */
  title: string;
  /** 1 · APPRENDRE — la leçon en 30 sec (le « pourquoi » + le « comment »). */
  apprendre: string;
  /** 2 · FAIRE — l'action concrète + un script prêt à copier si pertinent. */
  faire: {
    instruction: string;
    script?: string;
    ctaLabel: string;
    /** Lien outil ; absent = action auto-déclarée (coche l'étape). */
    linkPath?: string;
  };
  /** 3 · PREUVE — « c'est gagné quand… » (un acte réel, pas « j'ai lu »). */
  preuve: string;
  /** Réponses prêtes aux situations courantes (« si ça → alors ça »). */
  repondre?: { situation: string; reponse: string }[];
  /** Pré-prompt injecté quand on demande à Noaly sur cette étape. */
  noalyPrompt: string;
}

// Clé = clé de porte/setup serveur. Cf. useSalleOps / mark_starter_task.
export const ACADEMY_LESSONS: Record<string, AcademyLesson> = {
  // ── Étape 0 · S'ÉQUIPER (setup) — la 1ʳᵉ commande perso, 250 PV ───────────
  commande_250pv: {
    goProStep: 0,
    goProLabel: "S'équiper",
    title: "Ta 1ʳᵉ commande (250 PV)",
    apprendre:
      "Avant de vendre quoi que ce soit, tu t'équipes. Ta 1ʳᵉ commande de 250 PV débloque ta marge à 35 % ET fait de toi le cobaye n°1 : tu testes les produits sur TOI pour parler de ton vécu, pas d'un script. Avec les seuils raccourcis, 250 PV suffit — c'est le seul geste qui ouvre tout le reste.",
    faire: {
      instruction: "Passe ta 1ʳᵉ commande de 250 PV (ton programme + des produits à tester sur toi).",
      ctaLabel: "Passer ma commande",
      linkPath: "/panier",
    },
    preuve: "C'est gagné quand ta commande 250 PV est passée — et tu démarres tes 21 jours cobaye sur toi.",
    noalyPrompt: "Qu'est-ce que je commande pour ma 1ʳᵉ commande 250 PV pour bien démarrer ?",
  },

  liste_50: {
    goProStep: 1,
    goProLabel: "Trouver",
    title: "Ta Liste 100",
    apprendre:
      "Le métier commence par une liste. 100 noms : famille, amis, collègues, gens du club. Pas de tri « il voudra jamais » — tu notes, tu trieras après. Repère tes profils rouges : les sportifs, les fonceurs, les énergiques. Sans liste, pas d'activité.",
    faire: {
      instruction: "Écris au moins 20 noms aujourd'hui (objectif 100), avec un moyen de les joindre.",
      ctaLabel: "Ouvrir ma Liste 100",
      linkPath: "/cahier-de-bord?tab=liste",
    },
    preuve: "C'est gagné quand tu as posé au moins 20 noms — et tu continues vers 100.",
    noalyPrompt: "Aide-moi à trouver des noms pour ma Liste 100, je sèche. Pose-moi des questions pour débloquer.",
  },

  premiere_story: {
    goProStep: 2,
    goProLabel: "Inviter",
    title: "Inviter en cobaye",
    apprendre:
      "Inviter, ce n'est PAS vendre — c'est faire voir une exposition. Deux gestes : (1) ta STORY pour annoncer ton démarrage — une photo « jour 1 » toute simple + une phrase (les gens suivent une personne, pas un produit) ; (2) le message COBAYE en privé. Zéro pression → les gens disent oui pour rendre service à quelqu'un qui se forme.",
    faire: {
      instruction: "Poste ta story (photo + phrase ci-dessous) ET envoie le message cobaye à 5-10 personnes de ta liste.",
      script:
        "Coucou [Prénom] ! Je me forme comme coach bien-être à La Base et je cherche quelques cobayes pour m'entraîner à faire des bilans (offert, 0 pression). Ça te dit de tester ? 🙌",
      ctaLabel: "C'est posté",
    },
    preuve: "C'est gagné quand ta story est en ligne ET tu as envoyé 5 messages cobaye.",
    repondre: [
      {
        situation: "« C'est quoi exactement ? »",
        reponse: "Tu ne vends pas, tu proposes : « Le plus simple c'est que je te fasse un petit bilan offert, tu verras par toi-même. Ça te dit ? »",
      },
      {
        situation: "« C'est un truc genre secte ? »",
        reponse: "Reste léger : « Haha non — je teste des produits qui me font du bien et je me forme à accompagner les gens. Zéro pression, je te montre juste si t'es curieux. »",
      },
      {
        situation: "« J'ai pas le temps »",
        reponse: "« Je comprends ! Pas de pression — je te garde dans un coin et je te recontacte dans 2-3 semaines, juste si tu veux tester 🙂 »",
      },
      {
        situation: "Pas de réponse",
        reponse: "Tu attends 48 h, tu relances UNE fois, léger : « Pas de pression, juste si t'es curieux 🙂 ». Toujours rien = tu passes au suivant.",
      },
    ],
    noalyPrompt: "Écris-moi un message d'invitation cobaye pour une personne précise. Voici le prénom et le contexte :",
  },

  premier_bilan: {
    goProStep: 3,
    goProLabel: "Présenter",
    title: "Ton 1er bilan",
    apprendre:
      "Le bilan, c'est le cœur du métier : tu fais vivre l'expérience. Comment tu l'expliques en 2 phrases : « Je regarde avec toi ton hydratation, ta masse musculaire, ton énergie — et je te donne un plan simple. C'est offert et sans engagement. » Au début tu le fais AVEC ton parrain — méthode Show → Try → Do : il fait, vous faites à deux, puis tu fais seul. Vise ton 1er client décroché ensemble sous 7 jours.",
    faire: {
      instruction: "Cale ton 1er bilan d'entraînement (club ou visio) avec un cobaye, et demande à ton parrain de le co-animer.",
      ctaLabel: "Démarrer un bilan",
      linkPath: "/clients",
    },
    preuve: "C'est gagné quand tu as RÉALISÉ ton 1er bilan (pas juste calé un RDV).",
    repondre: [
      {
        situation: "« Ça coûte combien ? »",
        reponse: "« Le bilan est offert. Si tu veux ensuite un programme, on en parle — mais aujourd'hui zéro engagement, on regarde juste où tu en es. »",
      },
      {
        situation: "« Je suis pas sûr·e que ça marche pour moi »",
        reponse: "« C'est justement le but du bilan : on regarde TA situation, pas une recette générale. Et tu décides après, tranquille. »",
      },
    ],
    noalyPrompt: "Donne-moi la trame simple d'un premier bilan bien-être, étape par étape.",
  },

  premier_hom: {
    goProStep: 3,
    goProLabel: "Présenter",
    title: "Ton 1er HOM",
    apprendre:
      "Le HOM (45 min), c'est le rendez-vous qui DUPLIQUE : tes invités voient l'opportunité, et toi tu apprends par mimétisme — tes recrues invitent, tu présentes. Règle d'or : amène TOUS tes contacts curieux au HOM, pas seulement « ceux qui sont chauds ».",
    faire: {
      instruction: "Amène au moins 1 invité au prochain HOM hebdo.",
      ctaLabel: "J'ai amené un invité",
    },
    preuve: "C'est gagné quand tu as amené au moins 1 invité à un HOM.",
    noalyPrompt: "Comment j'invite quelqu'un au HOM sans le faire fuir ? Donne-moi une phrase simple.",
  },

  premier_pv_pack: {
    goProStep: 3,
    goProLabel: "Présenter",
    title: "Ton 1er pack",
    apprendre:
      "Ta première vente : tes 1ers PV, ton déclic. Bonne nouvelle — avec les seuils raccourcis, 250 PV = 35 % de marge. Ta 1ʳᵉ marche est toute proche, et c'est le bon moment (fenêtre promo limitée). Tu ne forces rien : après un bon bilan, le pack est la suite logique.",
    faire: {
      instruction: "Signe ton 1er pack produits avec un client et enregistre la commande.",
      ctaLabel: "Ouvrir le panier",
      linkPath: "/panier",
    },
    preuve: "C'est gagné quand un 1er pack est signé et tes 1ers PV enregistrés.",
    noalyPrompt: "Comment je propose un pack produits à un client juste après son bilan, sans être lourd ?",
  },

  // Étape 4 — Relancer (pas de porte d'activation : compétence continue).
  relancer: {
    goProStep: 4,
    goProLabel: "Relancer",
    title: "Relancer",
    apprendre:
      "La fortune est dans le suivi. La plupart des « oui » arrivent à la 2ᵉ ou 3ᵉ relance, pas au 1er message. Tu relances léger, sans pression : « pas de pression, juste si t'es curieux 🙂 ». Pour tes clients, le rythme J1→J14 (shake ok ? · J4 le 1er changement · J14 retail + invitation HOM) garde le lien.",
    faire: {
      instruction: "Relance 3 personnes qui n'ont pas répondu — une seule fois, léger.",
      ctaLabel: "Voir mes relances",
      linkPath: "/crm",
    },
    preuve: "C'est gagné quand tu as relancé 3 contacts cette semaine.",
    noalyPrompt: "Écris-moi un message de relance léger pour quelqu'un qui n'a pas répondu, sans mettre la pression.",
  },
};
