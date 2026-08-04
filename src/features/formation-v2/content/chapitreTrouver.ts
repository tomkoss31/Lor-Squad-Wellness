// =============================================================================
// Chapitre « Trouver » — premières micro-leçons (2026-08-04).
//
// Contenu PIOCHÉ dans l'existant, pas réécrit (consigne Thomas) :
//   • méthode FRANK + les 3 pièges → boite-a-outils-content.ts:149-207
//   • messages chaud / tiède / froid + leurs « note » → :50-133
//   • cadrage « trier, pas convaincre » → cockpit Go Pro academyLessons.ts
// Les « note » des scripts (« Avoir ton avis = mot magique ») font d'excellentes
// idées-force : c'est elles qu'on met en avant.
// =============================================================================

import type { Chapter } from "../types";

export const CHAPITRE_TROUVER: Chapter = {
  slug: "trouver",
  number: 2,
  theme: "Trouver",
  title: "Tes premiers contacts",
  lessons: [
    {
      slug: "liste-100-frank",
      icon: "📇",
      title: "Ta Liste 100",
      pathLabel: "Ta Liste 100 (FRANK)",
      minutes: 3,
      accent: "teal",
      ideeForce: "Ta liste est déjà dans ton téléphone.",
      source: "boite-a-outils-content.ts:149-207 (FRANK)",
      blocks: [
        { kind: "text", text: "Ta liste, c'est ton inventaire de richesse. Le seul problème : tu refuses d'y penser. **FRANK** t'aide à ne rien oublier." },
        { kind: "bullet", text: "**F · Family** — famille, alliance, cousins. 20-30 noms." },
        { kind: "bullet", text: "**R · Relations** — collègues, voisins, contacts pro. 20-30 noms." },
        { kind: "bullet", text: "**A · Amis** — enfance, fac, sport, soirées. 20-30 noms." },
        { kind: "bullet", text: "**N · Network** — followers actifs, LinkedIn, groupes. 15-20 noms." },
        { kind: "bullet", text: "**K · Kids' parents** — parents d'amis de tes enfants, école, club. 10-15 noms." },
        { kind: "text", text: "Le piège numéro 1 : **juger avant d'inscrire**. « Lui il a déjà son business »… STOP. Tu n'es pas dans leur tête. Mets-les TOUS, tu trieras après." },
      ],
      check: {
        question: "Pourquoi viser 100 noms, pas 30 ?",
        options: [
          { label: "Pour impressionner ton sponsor", correct: false },
          { label: "Pour avoir le volume : ~10 actifs sur 100", correct: true },
          { label: "Parce que c'est la règle Herbalife", correct: false },
        ],
        successNote: "Exact. Sur 100 : ~30 ne répondent pas, ~30 disent non, ~30 écoutent, ~10 deviennent actifs. Sous 100, pas assez de volume.",
        retryNote: "C'est une question de volume : il faut ~100 noms pour espérer ~10 actifs. En dessous, la statistique ne joue pas pour toi.",
      },
    },
    {
      slug: "premier-message",
      icon: "✉️",
      title: "Ton 1er message",
      pathLabel: "Ton 1er message",
      minutes: 2,
      accent: "lime",
      ideeForce: "On ne convainc pas. On trie.",
      source: "boite-a-outils-content.ts:50-133 (messages) + Go Pro",
      blocks: [
        { kind: "text", text: "Ton message ne sert pas à **vendre**. Il sert à savoir **qui est curieux**. Tu ne cours après personne — tu ouvres une porte, et tu vois qui entre." },
        { kind: "text", text: "Et tu adaptes selon la personne :" },
        { kind: "example", label: "🔥 Contact chaud", text: "Salut [Prénom] ! J'ai un truc à te montrer, ça pourrait t'intéresser. T'as 1h mardi ou jeudi soir ?" },
        { kind: "example", label: "🌤️ Contact tiède", text: "Salut [Prénom] ! Je voudrais avoir ton avis sur quelque chose. T'as 1h mardi ou jeudi soir pour qu'on en discute ?" },
        { kind: "text", text: "« **Avoir ton avis** » = le mot magique. Personne ne refuse de donner son avis. Sur un contact froid, tu renoues d'abord, tu proposes ensuite — jamais l'inverse." },
      ],
      check: {
        question: "Un contact tiède, quelle porte d'entrée ?",
        options: [
          { label: "« J'ai un business à te présenter »", correct: false },
          { label: "« Je voudrais avoir ton avis »", correct: true },
          { label: "« Tu veux gagner de l'argent ? »", correct: false },
        ],
        successNote: "Oui. « Ton avis » enlève toute pression et n'engage à rien — la personne dit oui facilement.",
        retryNote: "Sur un tiède, on ne vend pas d'emblée. « Je voudrais ton avis » ouvre la porte sans pression.",
      },
    },
    {
      slug: "objection-prix",
      icon: "🛡️",
      title: "« C'est cher »",
      pathLabel: "Gérer une objection",
      minutes: 2,
      accent: "coral",
      ideeForce: "Une objection, c'est un « oui, mais rassure-moi ».",
      source: "boite-a-outils-content.ts:1112-1178 (7 objections)",
      blocks: [
        { kind: "text", text: "« C'est cher » n'est presque jamais un non. C'est : « je veux, mais je me rassure sur la valeur ». Tu ne te justifies pas — tu ramènes au **coût par jour** et au **résultat**." },
        { kind: "example", label: "Ta réponse", text: "Je comprends. En fait ça revient à ~2-3 € par jour — moins qu'un café. Et la vraie question, c'est : combien ça te coûte, aujourd'hui, de ne rien changer ?" },
        { kind: "text", text: "Tu **valides** l'objection (« je comprends »), tu **recadres** (coût/jour), tu **renvoies** la décision à son objectif. Jamais de bataille de prix." },
      ],
      check: {
        question: "Face à « c'est cher », ton premier réflexe ?",
        options: [
          { label: "Baisser le prix ou faire une remise", correct: false },
          { label: "Valider, puis ramener au coût par jour", correct: true },
          { label: "Lister tous les ingrédients pour justifier", correct: false },
        ],
        successNote: "Voilà. « Je comprends » désamorce, le coût/jour recadre, et tu renvoies à son objectif. Pas de justification.",
        retryNote: "On ne se justifie pas et on ne brade pas. On valide l'objection, puis on ramène au coût par jour vs le résultat.",
      },
    },
  ],
};
