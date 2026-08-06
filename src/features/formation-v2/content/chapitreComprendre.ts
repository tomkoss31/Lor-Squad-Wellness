// =============================================================================
// Chapitre « Comprendre » — les fondations (2026-08-04).
//
// Le nouveau ne sait pas encore quel est son métier. Avant de prospecter, il
// comprend : (1) son vrai job n'est pas de vendre, (2) il teste sur lui d'abord,
// (3) il connaît ses 5 produits par cœur.
//
// Contenu PIOCHÉ, pas réécrit (consigne Thomas) :
//   • « c'est quoi Herbalife » (1980, 90+ pays, vente directe) → réponse à
//     l'objection « pyramidal » déjà validée (boite-a-outils-content.ts:1150-1155)
//   • « l'app fait le bilan, toi l'expérience » + phrase de fin → EBE 10 étapes
//     (boite-a-outils-content.ts:381-568)
//   • charte éthique (consomme ce que tu vends) → tk-business-03 (:1564-1570)
//   • 21 jours cobaye + témoignage 4 lignes → protocole cobaye (:735-798)
//   • règle « cobaye n°1 = toi » → cockpit Go Pro (academyLessons.ts commande_250pv)
//   • 5 produits phrase clé → mémo 5 produits (:816-887)
// =============================================================================

import type { Chapter } from "../types";

export const CHAPITRE_COMPRENDRE: Chapter = {
  slug: "comprendre",
  number: 1,
  theme: "Comprendre",
  title: "Ton métier, en vrai",
  recap: "Comprendre ton métier & Herbalife",
  badge: "🧭",
  lessons: [
    {
      slug: "cest-quoi-herbalife",
      icon: "🌍",
      title: "C'est quoi Herbalife ?",
      pathLabel: "C'est quoi Herbalife ?",
      minutes: 2,
      accent: "teal",
      ideeForce: "Une vraie entreprise, de vrais produits, depuis 1980.",
      source: "boite-a-outils-content.ts:1150-1155 (objection « pyramidal »)",
      blocks: [
        { kind: "text", text: "Avant de te lancer, tu dois pouvoir répondre à LA question que tout le monde va te poser : **« C'est quoi Herbalife, c'est sérieux ? »** Voilà les faits, à connaître par cœur." },
        { kind: "bullet", text: "**Depuis 1980** — fondée par Mark Hughes autour d'une idée simple : rendre une bonne nutrition accessible à tous." },
        { kind: "bullet", text: "**Plus de 90 pays** — une entreprise mondiale de nutrition, avec des produits réels (nutrition, contrôle du poids, énergie)." },
        { kind: "bullet", text: "**Tu les consommes toi-même** — c'est ton 21 jours cobaye. Tu ne vends que ce que tu as testé." },
        { kind: "text", text: "**« C'est pas pyramidal ? »** Non. C'est de la **vente directe** : tu vends de vrais produits à de vrais clients. Et on peut profiter des produits comme simple client·e, sans jamais faire de business." },
        { kind: "text", text: "Tu ne rejoins pas un « plan ». Tu rejoins une entreprise qui existe depuis plus de 40 ans — et une équipe, **La Base 360**, qui t'accompagne pas à pas." },
      ],
      check: {
        question: "« C'est pas une pyramide ton truc ? » — ta réponse ?",
        options: [
          { label: "« Euh… je sais pas trop en fait. »", correct: false },
          { label: "« Non, c'est de la vente directe : de vrais produits, de vrais clients. »", correct: true },
          { label: "« Un peu, mais c'est légal donc c'est bon. »", correct: false },
        ],
        successNote: "Exact. Vente directe depuis 1980, dans 90+ pays. Tu poses le fait calmement — la transparence désamorce le doute.",
        retryNote: "La bonne réponse est simple et assumée : vente directe, de vrais produits, de vrais clients. Depuis 1980, dans 90+ pays.",
      },
    },
    {
      slug: "ton-vrai-metier",
      icon: "🎯",
      title: "Ton vrai métier",
      pathLabel: "Ton vrai métier",
      minutes: 2,
      accent: "teal",
      ideeForce: "Ton job : qu'en 30 jours, la personne soit fière d'elle.",
      source: "boite-a-outils-content.ts:381-568 (EBE) + charte:1564",
      blocks: [
        { kind: "text", text: "90 % des distri croient que le bilan, c'est **suivre les étapes une par une**. Faux : les étapes, l'app s'en charge. Toi, ton vrai job, c'est de faire vivre une **expérience** qui transforme quelqu'un en 60 minutes." },
        { kind: "text", text: "Tu ne vends pas des produits. Tu vends une **transformation**. Et tu ne recommandes que ce que tu **consommes toi-même** — sinon tu racontes du vent." },
        { kind: "example", label: "La phrase qui scelle tout (à garder pour la fin)", text: "Mon rôle n'est pas de te vendre des produits. Mon rôle, c'est que dans 30 jours, tu sois fier·e de toi." },
        { kind: "text", text: "Tu la dis en regardant la personne dans les yeux — **et tu te tais**." },
      ],
      check: {
        question: "Pendant un bilan, c'est quoi ton vrai job ?",
        options: [
          { label: "Suivre les étapes de l'app une par une", correct: false },
          { label: "Faire vivre une expérience qui transforme", correct: true },
          { label: "Présenter le plus de produits possible", correct: false },
        ],
        successNote: "Exact. L'app pilote la technique. Toi tu portes l'humain — c'est ça qui transforme une transaction en engagement.",
        retryNote: "Les étapes, l'app les gère toute seule. Ton job à toi, c'est l'expérience humaine : c'est elle qui fait dire oui.",
      },
    },
    {
      slug: "cobaye-numero-1",
      icon: "🥤",
      title: "Le cobaye n°1, c'est toi",
      pathLabel: "Le cobaye, c'est toi",
      minutes: 3,
      accent: "lime",
      ideeForce: "Tu consommes avant de vendre. Sinon tu racontes du vent.",
      source: "boite-a-outils-content.ts:735-798 (protocole 21j cobaye)",
      blocks: [
        { kind: "text", text: "La règle Mark Hughes, le fondateur : **tu testes sur toi avant de proposer aux autres**. 21 jours, c'est le minimum pour ressentir une vraie différence — énergie, peau, sommeil — et avoir un témoignage crédible." },
        { kind: "bullet", text: "**Photos J0 / J7 / J14 / J21** — face + profil. Tu t'en serviras toute ta carrière." },
        { kind: "bullet", text: "**Journal du soir** — 2 lignes par jour : énergie, poids, ce qui change." },
        { kind: "text", text: "À J21, tu as 1 ou 2 vraies choses à dire. Pas 10, pas de baratin :" },
        { kind: "example", label: "Ton témoignage en 4 lignes", text: "Avant, j'avais [X]. J'ai testé F1 + Aloé + Thé 21 jours. Aujourd'hui, je [Y]. Et ce qui m'a surpris, c'est [Z]." },
        { kind: "text", text: "Tu vas raconter cette histoire ~50 fois cette année. Ton meilleur argument de vente, ce n'est pas le packaging ni les chiffres — c'est **ton corps**." },
      ],
      check: {
        question: "Pourquoi faire tes 21 jours cobaye avant de vendre ?",
        options: [
          { label: "Parce que c'est une obligation Herbalife", correct: false },
          { label: "Pour avoir un vrai vécu et un témoignage crédible", correct: true },
          { label: "Pour écouler ton stock rapidement", correct: false },
        ],
        successNote: "Voilà. Ton témoignage vécu vaut plus que n'importe quel argumentaire. On te croit parce que tu l'as fait.",
        retryNote: "Ce n'est pas une contrainte : c'est ton arme. Sans vécu, tu récites un script. Avec, tu racontes ton histoire.",
      },
    },
    {
      slug: "cinq-produits",
      icon: "🌿",
      title: "Tes 5 produits en 5 secondes",
      pathLabel: "Tes 5 produits",
      minutes: 3,
      accent: "violet",
      ideeForce: "Un produit = une phrase clé. Tu dois la sortir sans hésiter.",
      source: "boite-a-outils-content.ts:816-887 (mémo 5 produits)",
      blocks: [
        { kind: "text", text: "Si tu hésites au moment du bilan, tu perds en crédibilité. Apprends **une phrase par produit** — tu dois pouvoir en présenter n'importe lequel en 5 secondes." },
        { kind: "bullet", text: "**🥤 Formula 1** — « Le repas malin du matin : 25 g de protéines, 25 vitamines, moins de 200 kcal. »" },
        { kind: "bullet", text: "**💪 PDM (Protein Drink Mix)** — « +15 g de protéines pour tenir rassasié plus longtemps. »" },
        { kind: "bullet", text: "**🌿 Aloé Concentré** — « Mon réveil-corps : 1 verre le matin, ça nettoie. »" },
        { kind: "bullet", text: "**🍵 Thé Thermojetics** — « Le boost de l'aprèm sans le coup de barre du café. »" },
        { kind: "bullet", text: "**✨ HLSkin** — « Une routine simple matin & soir. Tu testes 14 jours, ta peau parle. »" },
        { kind: "text", text: "Le pack de départ = **F1 + PDM + Aloé + Thé**. C'est ce que tu proposes à 80 % de tes prospects. Le HLSkin se rajoute en 2ᵉ commande." },
      ],
      check: {
        question: "Le Formula 1, c'est quoi en une phrase ?",
        options: [
          { label: "Un complément réservé aux sportifs", correct: false },
          { label: "Un repas malin : 25 g de protéines, < 200 kcal", correct: true },
          { label: "Un brûleur de graisse", correct: false },
        ],
        successNote: "Oui. F1 = un repas équilibré et pratique. C'est la base du programme, pour presque tout le monde.",
        retryNote: "F1 n'est ni un brûleur ni un truc de sportif : c'est un repas complet et malin. 25 g de protéines, moins de 200 kcal.",
      },
    },
    {
      slug: "signe-ta-charte",
      icon: "📜",
      title: "Signe ta charte",
      pathLabel: "Signe ta charte",
      minutes: 2,
      accent: "lime",
      ideeForce: "Une charte signée te tient quand vient la tempête.",
      source: "boite-a-outils-content.ts:1548-1627 (charte du distributeur)",
      blocks: [
        { kind: "text", text: "Une charte **non signée** n'engage personne. Signée, elle devient une chaîne positive qui te tient les jours où tu doutes. On la signe **dans les 24 h après avoir démarré**." },
        { kind: "bullet", text: "**Mon éthique** — l'humain avant le business, ne recommander que ce que je consomme, aucune pression." },
        { kind: "bullet", text: "**Mon engagement** — mes 5 actions par jour, honorer ma parole (si je dis « je rappelle vendredi », je rappelle vendredi)." },
        { kind: "bullet", text: "**Mon pourquoi** — concret, chiffré, daté (« Emmener mes parents en voyage en 2027 »)." },
        { kind: "text", text: "Tu l'imprimes, tu l'**affiches** là où tu la vois chaque jour. Ce n'est pas de la déco : c'est ton point d'ancrage quand la motivation flanche." },
      ],
      check: {
        question: "Pourquoi SIGNER ta charte (pas juste la lire) ?",
        options: [
          { label: "Pour faire plaisir à ton sponsor", correct: false },
          { label: "Pour t'engager : elle te tient dans les coups durs", correct: true },
          { label: "C'est purement symbolique, ça ne change rien", correct: false },
        ],
        successNote: "Exact. L'engagement écrit et affiché crée une cohérence : les jours sans envie, c'est elle qui te fait avancer quand même.",
        retryNote: "Signer + afficher, ce n'est pas symbolique : c'est ce qui te tient quand la motivation retombe. Une charte lue puis oubliée n'engage à rien.",
      },
    },
  ],
};
