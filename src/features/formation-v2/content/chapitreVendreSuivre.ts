// =============================================================================
// Chapitre « Vendre & suivre » — après le oui (2026-08-04).
//
// Le débutant croit que le travail s'arrête au closing. Le vrai travail
// commence : (1) l'appel J+1 qui sauve 1 client sur 2, (2) répondre aux
// objections sans se justifier, (3) demander des recos — le carburant.
//
// Contenu PIOCHÉ, pas réécrit (consigne Thomas) :
//   • protocole J+1 (script + stat 50→80 %) → boite-a-outils-content.ts:1196-1277
//   • 7 objections pré-câblées → tk-suivi-04 (:1112-1178)
//   • Feel · Felt · Found → bbcScripts.ts (« Objections »)
//   • phrase magique + reco à 3 voix → tk-suivi-02 (:994-1032)
// =============================================================================

import type { Chapter } from "../types";

export const CHAPITRE_VENDRE_SUIVRE: Chapter = {
  slug: "vendre-suivre",
  number: 4,
  theme: "Vendre & suivre",
  title: "Après le oui, le vrai travail",
  recap: "Vendre & suivre après le oui",
  lessons: [
    {
      slug: "appel-j1",
      icon: "📞",
      title: "L'appel J+1 obligatoire",
      pathLabel: "L'appel J+1",
      minutes: 3,
      accent: "teal",
      ideeForce: "Sans appel J+1, 1 client sur 2 lâche à J+7.",
      source: "boite-a-outils-content.ts:1196-1277 (protocole J+1)",
      blocks: [
        { kind: "text", text: "La personne a dit oui, elle est repartie avec son pack. Le lendemain, dans sa tête : « J'ai bien fait ? », « Mon conjoint va dire quoi ? », « C'est cher quand même ». **Ton appel du lendemain répond à tout ça.**" },
        { kind: "text", text: "Le matin (9h-12h), **appel ou vocal — jamais un SMS**. La voix rassure, le texte fait commercial. Quatre temps, 5 minutes :" },
        { kind: "bullet", text: "**Salut chaleureux** — « Je voulais voir comment tu te sens ce matin. »" },
        { kind: "bullet", text: "**Écoute** — le goût du shake, ses premières impressions." },
        { kind: "bullet", text: "**Réponds** à 1-2 questions techniques (goût, faim, prix)." },
        { kind: "bullet", text: "**Ancre le J+7** — « On se voit dimanche pour un point ? »" },
        { kind: "text", text: "Le chiffre de l'équipe : **sans J+1, 50 % tiennent à 30 jours. Avec J+1, 80 %.** C'est l'investissement le plus rentable de ta journée." },
      ],
      check: {
        question: "Le lendemain d'un démarrage, tu fais quoi ?",
        options: [
          { label: "Tu attends qu'elle te recontacte si besoin", correct: false },
          { label: "Un appel/vocal le matin : rassurer + caler le J+7", correct: true },
          { label: "Un simple SMS « ça va ? »", correct: false },
        ],
        successNote: "Exact. L'appel J+1 casse les doutes de la nuit et installe le rendez-vous suivant. 50 % → 80 % de fidélité.",
        retryNote: "Attendre = la perdre. Un appel ou vocal le matin (pas un SMS) rassure et double presque ton taux de fidélisation.",
      },
    },
    {
      slug: "objections",
      icon: "🛡️",
      title: "L'objection = un « oui, mais rassure-moi »",
      pathLabel: "Les objections",
      minutes: 3,
      accent: "coral",
      ideeForce: "Une objection prévue n'est plus une objection.",
      source: "tk-suivi-04 (7 objections) + bbcScripts Feel·Felt·Found",
      blocks: [
        { kind: "text", text: "Une objection, ce n'est presque jamais un non. C'est un « je veux, mais rassure-moi ». Le réflexe universel s'appelle **Feel · Felt · Found** :" },
        { kind: "example", label: "Feel · Felt · Found", text: "Je comprends ce que tu ressens. D'autres ont ressenti exactement la même chose. Et ils ont trouvé que… (puis une solution concrète)." },
        { kind: "text", text: "**« J'ai pas le temps »** → retourne-la : « C'est justement pour les gens pressés. Le shake, c'est 90 secondes, plus rapide qu'acheter une viennoiserie. »" },
        { kind: "text", text: "**« Je vais réfléchir »** cache toujours une vraie objection. Ne la laisse pas filer — demande-la :" },
        { kind: "example", label: "Face à « je vais réfléchir »", text: "Bien sûr. Juste pour t'aider : qu'est-ce qui te fait douter — le prix, le timing, ou autre chose ?" },
        { kind: "text", text: "Tu ne te justifies jamais, tu ne braves pas. Tu **valides**, puis tu **creuses**. La vraie objection, c'est elle qui te la donne, pas toi qui la devines." },
      ],
      check: {
        question: "« Je vais réfléchir », ta réponse ?",
        options: [
          { label: "« Pas de souci, je te laisse. »", correct: false },
          { label: "« Qu'est-ce qui te fait douter : prix, timing, autre ? »", correct: true },
          { label: "Tu proposes une remise pour débloquer", correct: false },
        ],
        successNote: "Oui. « Je vais réfléchir » masque une vraie objection. Tu la fais sortir sans agressivité, et tu la traites.",
        retryNote: "Laisser filer = perdre la vente. Baisser le prix = brader. Demande la vraie raison du doute, puis réponds-y.",
      },
    },
    {
      slug: "demander-recos",
      icon: "🌟",
      title: "La reco vaut 10 prospects froids",
      pathLabel: "Demander des recos",
      minutes: 3,
      accent: "lime",
      ideeForce: "« Qui aurait besoin du même regard que je viens de te donner ? »",
      source: "tk-suivi-02 (:994-1032) + bbcScripts (recommandations)",
      blocks: [
        { kind: "text", text: "90 % des distri ne demandent jamais de recos — trop peur de déranger. Pourtant c'est là que ton activité décolle. Une reco chaude vaut **10 prospects froids**." },
        { kind: "text", text: "Le timing : **à chaud, après le 1er résultat visible** (J+7 à J+14). Pas avant (rien à dire), pas après (l'effet WOW est retombé). Tu cibles le **résultat**, pas le produit :" },
        { kind: "example", label: "La phrase magique", text: "Avant que tu partes : qui dans ton entourage aurait besoin du même regard que je viens de te donner ?" },
        { kind: "text", text: "(silence, attends 3 noms — le 2ᵉ est souvent le meilleur)" },
        { kind: "text", text: "Puis tu **actives** la reco à chaud plutôt que d'appeler froid : une reco activée devant le client = **80 % de RDV calés**, contre 20 % sinon." },
        { kind: "example", label: "Activer la reco à 3 voix", text: "Plutôt que je l'appelle froidement, tu peux lui passer un vocal devant moi ? « Hey, je te passe ma coach, elle veut juste te dire bonjour. » 30 secondes, ça change tout." },
      ],
      check: {
        question: "Une reco, tu la demandes quand ?",
        options: [
          { label: "Jamais, c'est trop gênant", correct: false },
          { label: "À chaud, après le 1er résultat visible (J+7-J+14)", correct: true },
          { label: "Avant même de commencer le bilan", correct: false },
        ],
        successNote: "Exact. À chaud, quand le résultat est frais. Et tu l'actives devant le client pour multiplier tes RDV.",
        retryNote: "Ni avant (rien à raconter) ni jamais (tu te prives de ton meilleur canal) : à chaud, après le 1er résultat visible.",
      },
    },
  ],
};
