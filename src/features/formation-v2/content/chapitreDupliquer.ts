// =============================================================================
// Chapitre « Dupliquer » — passer de vendeur à bâtisseur (2026-08-04).
//
// Le niveau au-dessus : construire une équipe. (1) La Visio à 3, l'arme #1 du
// closing et du bootcamp. (2) La DMO, la régularité qui fait tout. (3) Inviter
// un cobaye — le point d'entrée BBC, sans pression.
//
// Contenu PIOCHÉ, pas réécrit (consigne Thomas) :
//   • Visio à 3 (concept + pré-brief + « tais-toi ») → tk-business-01 (:1309-1476)
//   • DMO 5 IPA + formule 5-3-1 → tk-business-02 (:1492-1530)
//   • scripts cobaye BBC (chaud + pré-lancement + double RDV) → bbcScripts.ts
// =============================================================================

import type { Chapter } from "../types";

export const CHAPITRE_DUPLIQUER: Chapter = {
  slug: "dupliquer",
  number: 5,
  theme: "Dupliquer",
  title: "De vendeur à bâtisseur",
  recap: "Dupliquer : bâtir une équipe",
  badge: "👥",
  lessons: [
    {
      slug: "visio-a-3",
      icon: "👥",
      title: "La Visio à 3",
      pathLabel: "La Visio à 3",
      minutes: 4,
      accent: "violet",
      ideeForce: "Tu parles peu. Ton sponsor mène. Tu écoutes.",
      source: "boite-a-outils-content.ts:1309-1476 (Visio à 3)",
      blocks: [
        { kind: "text", text: "Une visio à 3 = ton prospect + toi + ton sponsor. **30 minutes maximum.** C'est l'arme n°1 du closing, elle est gratuite, et tu peux la faire dès demain matin." },
        { kind: "bullet", text: "**Crédibilité instantanée** — tu débutes ? Peu importe : l'autorité passe sur ton sponsor expérimenté, pas sur toi." },
        { kind: "bullet", text: "**Tu apprends en vivant** — 5 visios à 3 = 50 visios solo en apprentissage. C'est ton vrai bootcamp." },
        { kind: "text", text: "Le secret, c'est le **pré-brief** : 24h avant, tu envoies à ton sponsor le profil du prospect (objectif + blocage principal). Il arrive préparé, pas en impro." },
        { kind: "text", text: "Et pendant la visio, **la règle d'or** : tu présentes ton sponsor en 2 minutes, puis tu **te tais**. Tu hoches la tête, tu prends des notes. Tu ne sur-expliques pas, tu ne confirmes pas chaque phrase. Tu laisses l'expert mener." },
      ],
      check: {
        question: "Pendant la visio à 3, ton rôle ?",
        options: [
          { label: "Mener la conversation, c'est ton prospect", correct: false },
          { label: "Parler peu, laisser le sponsor mener, écouter", correct: true },
          { label: "Confirmer chaque phrase que dit le sponsor", correct: false },
        ],
        successNote: "Exact. Tu présentes, puis tu t'effaces. C'est l'expérience du sponsor qui close — et toi tu apprends en direct.",
        retryNote: "L'erreur n°1, c'est de parler pendant la visio. Tu présentes ton sponsor, puis tu te tais et tu observes.",
      },
    },
    {
      slug: "dmo-5-ipa",
      icon: "✅",
      title: "Tes 5 actions par jour",
      pathLabel: "Tes 5 actions du jour",
      minutes: 2,
      accent: "teal",
      ideeForce: "Hors IPA, c'est du décor — pas du business.",
      source: "boite-a-outils-content.ts:1492-1530 (DMO 5 IPA)",
      blocks: [
        { kind: "text", text: "**IPA = Income Producing Activities** : les actions qui produisent du revenu. Passer des heures sur l'app à ranger tes fiches, ce n'est pas du business — c'est du décor." },
        { kind: "text", text: "Tes 5 cases à cocher chaque jour :" },
        { kind: "bullet", text: "**5 invitations** qualitatives (vocal ou appel, pas un texte sec)." },
        { kind: "bullet", text: "**2 relances** sur des prospects en cours." },
        { kind: "bullet", text: "**1 nouveau contact** ajouté à ta liste." },
        { kind: "bullet", text: "**1 vocal perso** à un membre d'équipe ou un client actif." },
        { kind: "bullet", text: "**1 contenu publié** (story, reel — lifestyle, pas pitch)." },
        { kind: "text", text: "La formule **5-3-1** répétée 12 mois (5 clients/mois, 3 récurrents, 1 coach) = une équipe qui tient. Pas de magie : de la **régularité**." },
      ],
      check: {
        question: "C'est quoi une IPA ?",
        options: [
          { label: "Ranger et mettre à jour tes fiches clients", correct: false },
          { label: "Une action qui produit du revenu : inviter, relancer, recruter", correct: true },
          { label: "Lire la formation et regarder l'app", correct: false },
        ],
        successNote: "Voilà. Inviter, relancer, recruter, publier : ça avance ton business. Le reste, c'est de l'administratif.",
        retryNote: "Une IPA produit du revenu (inviter, relancer, recruter). Ranger ses fiches ou lire l'app, aussi utile soit-ce, n'en est pas une.",
      },
    },
    {
      slug: "inviter-cobaye",
      icon: "🧡",
      title: "Inviter un cobaye",
      pathLabel: "Inviter un cobaye",
      minutes: 2,
      accent: "lime",
      ideeForce: "Cobaye = sans engagement. Tu t'entraînes, tu ne vends pas.",
      source: "bbcScripts.ts (Inviter · cobaye chaud + pré-lancement + double RDV)",
      blocks: [
        { kind: "text", text: "Le message le plus facile à envoyer quand tu démarres : tu ne vends rien, tu demandes de **l'aide pour t'entraîner**. Personne ne refuse d'aider un ami qui débute." },
        { kind: "example", label: "🔥 Marché chaud", text: "Coucou [Prénom] 😊 J'ai démarré une nouvelle activité, je me forme pour devenir coach bien-être. Je cherche quelques personnes pour m'entraîner sur mes bilans gratuits. Tu accepterais d'être mon cobaye ? C'est sans engagement, juste pour m'aider à pratiquer." },
        { kind: "example", label: "🎁 Le double rendez-vous", text: "En fait c'est un rendez-vous double : tu pourrais venir avec un ami ou quelqu'un de ta famille ? Les deux bilans sont gratuits et valent 50 € chacun." },
        { kind: "text", text: "La force du script : « **valeur 50 €, mais gratuit pour m'entraîner** » enlève toute pression ET pose la valeur. Et le double RDV te donne **2 bilans pour 1 invitation**." },
      ],
      check: {
        question: "Pourquoi le message cobaye fonctionne si bien ?",
        options: [
          { label: "Parce qu'il promet de gagner de l'argent", correct: false },
          { label: "Il enlève la pression : tu demandes de l'aide pour t'entraîner", correct: true },
          { label: "Parce qu'il crée un sentiment d'urgence", correct: false },
        ],
        successNote: "Exact. « Aide-moi à m'entraîner » désarme tout le monde. Pas de vente, pas de pression — juste un service entre proches.",
        retryNote: "Ce n'est ni l'argent ni l'urgence : c'est que tu demandes de l'aide, sans rien vendre. C'est ça qui fait dire oui.",
      },
    },
  ],
};
