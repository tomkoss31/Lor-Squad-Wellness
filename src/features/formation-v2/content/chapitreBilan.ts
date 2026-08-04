// =============================================================================
// Chapitre « Le bilan » — l'Étude Bien-Être (EBE), 2026-08-04.
//
// Le cœur du métier : le RDV de 60 min. Trois leçons = l'ossature d'une EBE
// réussie : (1) l'humain avant l'app, (2) le moment WOW du shake, (3) le closing
// à choix limité.
//
// Contenu PIOCHÉ, pas réécrit (consigne Thomas) :
//   • déroulé EBE 10 étapes → boite-a-outils-content.ts:381-568
//   • phrases-clés par moment → tk-bilan-02 (:587-658)
//   • script programme + closing → tk-bilan-03 (:677-717)
// =============================================================================

import type { Chapter } from "../types";

export const CHAPITRE_BILAN: Chapter = {
  slug: "le-bilan",
  number: 3,
  theme: "Le bilan",
  title: "Faire vivre une EBE",
  recap: "Mener un bilan qui transforme",
  lessons: [
    {
      slug: "app-fait-le-bilan",
      icon: "🏠",
      title: "L'app fait le bilan, toi l'humain",
      pathLabel: "Piloter l'humain",
      minutes: 3,
      accent: "teal",
      ideeForce: "L'app gère la technique. Toi, tu portes l'humain.",
      source: "boite-a-outils-content.ts:381-467 (EBE étapes 1-6)",
      blocks: [
        { kind: "text", text: "Prêt·e avant l'arrivée : à l'heure, espace rangé, **tablette chargée à 100 %**, boisson d'accueil sortie. Quand la personne arrive, elle doit sentir qu'on l'attendait **pour elle**." },
        { kind: "text", text: "Erreur du débutant : plonger direct dans l'app. **Donne 2-3 minutes d'humain avant.** Assieds-toi, laisse goûter la boisson, ouvre avec une question simple :" },
        { kind: "example", label: "Ta question d'ouverture", text: "Comment tu t'es senti·e en venant aujourd'hui ?" },
        { kind: "text", text: "(silence, écoute, sourire — 60 à 90 secondes sans parler business)" },
        { kind: "text", text: "Puis tu passes en mode **coach**, pas vendeur : des questions ouvertes pour trouver le **vrai pourquoi** (santé, image, énergie), pas le « je veux perdre 3 kg » de surface. Tu remplis l'app pendant qu'elle parle." },
      ],
      check: {
        question: "La personne vient de s'asseoir. Tu fais quoi en premier ?",
        options: [
          { label: "Tu lances l'app et l'étape 1 tout de suite", correct: false },
          { label: "2-3 min d'humain avant de plonger dans l'app", correct: true },
          { label: "Tu présentes directement les produits", correct: false },
        ],
        successNote: "Exact. L'humain d'abord. Sans ces 2 minutes de lien, tout le reste sonne commercial.",
        retryNote: "Trop tôt sur l'app = trop froid. Donne 2-3 min d'humain (boisson + une question ouverte) avant de démarrer les étapes du bilan.",
      },
    },
    {
      slug: "moment-wow-shake",
      icon: "🥛",
      title: "Le moment WOW : le shake",
      pathLabel: "Le moment WOW",
      minutes: 2,
      accent: "lime",
      ideeForce: "Mixe le shake devant elle. Jamais pré-fait à la cuisine.",
      source: "boite-a-outils-content.ts:489-503 (EBE étape 8)",
      blocks: [
        { kind: "text", text: "C'est **l'étape la plus puissante** de tout le bilan. Ne la zappe jamais. Tu présentes le Formula 1 comme un vrai repas équilibré : 25 g de protéines, 21 vitamines, moins de 200 kcal." },
        { kind: "bullet", text: "Mixe le shake **devant elle** — pas pré-fait à la cuisine." },
        { kind: "bullet", text: "Beau verre, belle texture, parfum au choix (vanille = valeur sûre)." },
        { kind: "bullet", text: "**Goûte avec elle.** C'est un moment partagé, pas une démonstration." },
        { kind: "example", label: "Si elle adore", text: "Imagine ça chaque matin, tu t'y vois ?" },
        { kind: "example", label: "Si elle est mitigée", text: "Y'a 12 parfums, on trouvera le tien." },
        { kind: "text", text: "L'objectif : qu'elle se dise **« je pourrais manger ça tous les jours »**." },
      ],
      check: {
        question: "Le shake F1 en bilan, tu le prépares comment ?",
        options: [
          { label: "Pré-fait à la cuisine pour gagner du temps", correct: false },
          { label: "Mixé devant elle, et tu goûtes avec elle", correct: true },
          { label: "Tu lui donnes la recette pour plus tard", correct: false },
        ],
        successNote: "Oui. Le mixer devant elle + goûter ensemble, c'est ça le moment WOW. Un shake pré-fait tue la magie.",
        retryNote: "Le pouvoir de cette étape, c'est de le faire EN DIRECT devant elle et de goûter avec elle. Jamais pré-fait.",
      },
    },
    {
      slug: "closer-sans-forcer",
      icon: "🤝",
      title: "Closer sans forcer",
      pathLabel: "Closer sans forcer",
      minutes: 2,
      accent: "coral",
      ideeForce: "Jamais « tu veux démarrer ? ». Toujours un choix entre 2 oui.",
      source: "boite-a-outils-content.ts:507-524 (EBE étape 9) + tk-bilan-03",
      blocks: [
        { kind: "text", text: "Tu ne présentes pas un catalogue. **Maximum 3 produits** — plus tu en proposes, moins elle achète vraiment. Tu reformules d'abord son objectif, puis tu proposes la transformation." },
        { kind: "example", label: "Reformuler avant de proposer", text: "Si je résume, tu veux [X], [Y], [Z] ? Voilà ce que je te propose : 3 produits, 1 mois, pas plus." },
        { kind: "text", text: "Puis le closing à **choix limité** — jamais une question fermée oui/non :" },
        { kind: "example", label: "Ton closing", text: "Tu préfères qu'on attaque par 4 semaines ou 1 mois complet ?" },
        { kind: "text", text: "Et là, **tu te tais**. Même si le silence dure 30 secondes. La première personne qui parle, ce n'est pas toi." },
      ],
      check: {
        question: "Ta phrase de closing, c'est laquelle ?",
        options: [
          { label: "« Alors, tu veux démarrer ? »", correct: false },
          { label: "« Tu préfères 4 semaines ou 1 mois complet ? »", correct: true },
          { label: "« Ça te tente ou pas ? »", correct: false },
        ],
        successNote: "Parfait. Un choix entre deux options qui mènent toutes les deux au oui. Puis silence.",
        retryNote: "Une question oui/non invite le non. Propose un choix entre 2 options (4 semaines / 1 mois), puis tais-toi.",
      },
    },
  ],
};
