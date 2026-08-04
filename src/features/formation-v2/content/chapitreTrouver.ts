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
  recap: "Trouver tes premiers contacts",
  badge: "📇",
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
      slug: "stories-hooks",
      icon: "📱",
      title: "Tes stories qui accrochent",
      pathLabel: "Tes stories qui accrochent",
      minutes: 2,
      accent: "violet",
      ideeForce: "Un bon hook fait RESTER, pas vendre.",
      source: "boite-a-outils-content.ts:222-303 (15 hooks stories)",
      blocks: [
        { kind: "text", text: "Sur les réseaux, ta 1ʳᵉ slide (le « hook ») n'a qu'un seul but : **faire rester**. Pas vendre. Un bon hook déclenche un *« attends, raconte »* dans la tête." },
        { kind: "example", label: "🌅 Routine", text: "Mon rituel matin qui a tout changé en 30 jours ⬇️" },
        { kind: "example", label: "🚫 Anti-vente", text: "Ce post n'est PAS pour te vendre quelque chose. Lis quand même." },
        { kind: "example", label: "⏰ Avant / après", text: "Il y a 1 an j'étais [X]. Aujourd'hui [Y]. Voilà comment." },
        { kind: "text", text: "La règle : **authentique > parfait**. Tu montres du vrai (ton vécu, tes ratés), pas une pub léchée. Et tu ne pitches jamais dans le hook — la porte s'ouvre en message privé, après." },
      ],
      check: {
        question: "Le but d'un hook de story, c'est quoi ?",
        options: [
          { label: "Vendre le produit tout de suite", correct: false },
          { label: "Faire rester le spectateur (créer la curiosité)", correct: true },
          { label: "Afficher les prix et les promos", correct: false },
        ],
        successNote: "Oui. Le hook capte l'attention, il ne vend pas. La conversation (et le business) vient ensuite, en privé.",
        retryNote: "Un hook qui vend fait fuir. Son seul job : accrocher assez pour qu'on reste. La vente, c'est plus tard, en message privé.",
      },
    },
    {
      slug: "reveiller-froid",
      icon: "🔥",
      title: "Réveiller un contact froid",
      pathLabel: "Réveiller un contact froid",
      minutes: 3,
      accent: "coral",
      ideeForce: "Tu renoues d'abord. Le business vient après.",
      source: "boite-a-outils-content.ts:319-360 (séquence 3 messages)",
      blocks: [
        { kind: "text", text: "Un contact que tu n'as pas parlé depuis 6 mois : tu ne vends **rien**. Tu **renoues**. La porte business s'ouvre seule, après. Une séquence douce sur 7 jours : J0, J3, J7." },
        { kind: "example", label: "J0 · le retour humain", text: "Hey [Prénom] ! Ça fait un bail, j'espère que tout roule. Je suis tombé·e sur [souvenir commun], ça m'a rappelé plein de bons moments. Comment tu vas, vraiment ?" },
        { kind: "text", text: "**Pas de pitch.** Le souvenir commun prouve que ce n'est pas un copier-coller. Si pas de réponse à J7, **tu lâches** — jamais de harcèlement." },
        { kind: "text", text: "Et quand elle répond : laisse-la te raconter sa vie **5-10 minutes AVANT** de placer ton sujet. Sinon tu casses tout." },
      ],
      check: {
        question: "Ton contact froid n'a pas répondu après ta 3ᵉ relance (J7) ?",
        options: [
          { label: "Tu relances une 4ᵉ, une 5ᵉ fois", correct: false },
          { label: "Tu lâches, en laissant la porte ouverte", correct: true },
          { label: "Tu l'appelles directement", correct: false },
        ],
        successNote: "Exact. Après J7 sans réponse, tu fermes la séquence avec élégance. Si elle revient dans 3 mois, ce sera naturel.",
        retryNote: "Insister = griller le contact. Après 3 messages sans réponse, tu lâches et tu laisses la porte ouverte. Le respect paie plus tard.",
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
