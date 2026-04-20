// Chantier Protocole de suivi (2026-04-20)
// Source de vérité unique des 5 étapes J+1, J+3, J+7, J+10, J+14. Les textes
// sont volontairement hors DB : Thomas + Mélanie les modifieront ici au fil
// du temps, c'est le paramétrage éditorial de l'app. Le tracking "envoyé"
// vit en DB (follow_up_protocol_log), seul le contenu est constant.

export type FollowUpStepId = "j1" | "j3" | "j7" | "j10" | "j14";

export interface FollowUpStep {
  id: FollowUpStepId;
  /** Jours après le bilan initial. Utilisé pour calculer l'état upcoming/active/past. */
  dayOffset: number;
  title: string;
  shortTitle: string;
  iconEmoji: string;
  /** Message à copier-coller pour le client. `[Prénom]` remplacé dynamiquement. */
  clientMessage: string;
  /** Variante SMS plus courte. Fallback sur clientMessage si vide. */
  smsMessage: string;
  /** Contenu éducatif destiné au distributeur (page Guide suivi client). */
  coachGuide: {
    objective: string;
    keyActions: string[];
    adjustments: string[];
    productsFocus: string[];
    /** Optionnel : script de partage naturel / présentation VIP. */
    sharingScript?: string;
    distributorNotes: string[];
  };
}

export const FOLLOW_UP_PROTOCOL: FollowUpStep[] = [
  {
    id: "j1",
    dayOffset: 1,
    title: "J+1 · Premier petit-déjeuner",
    shortTitle: "Premier petit-déj",
    iconEmoji: "☀️",
    clientMessage:
      "Salut [Prénom] ! ☀️ Comment s'est passé ton premier shake ce matin ? Hâte d'avoir ton retour 😊",
    smsMessage: "Salut [Prénom] ! Comment s'est passé ton premier shake ? 😊",
    coachGuide: {
      objective:
        "Ancrer la routine petit-déjeuner + hydratation dès le jour 1. Faire sentir un accompagnement proche et humain.",
      keyActions: [
        "Vérifier que le client a bien pris son shake",
        "Rappeler l'importance de l'hydratation (1L / 30kg de poids)",
        "Partager une astuce simple pour rester régulier",
      ],
      adjustments: [
        "Si shake trop épais → ajouter 50ml d'eau ou glaçons",
        "Si faim à 10h → proposer thé Herbalife",
        "Si digestion inconfortable → tester avec lait végétal",
      ],
      productsFocus: [
        "Formula 1 (F1) + Protein Drink Mix (PDM)",
        "Aloe Vera Herbalife (digestion)",
        "Extrait de thé Herbalife (énergie)",
      ],
      distributorNotes: [
        "Message doit être chaleureux, pas corporate",
        "Ne pas demander trop de détails le premier jour",
        "Ouvrir la porte au dialogue (question ouverte)",
      ],
    },
  },
  {
    id: "j3",
    dayOffset: 3,
    title: "J+3 · Premiers ressentis",
    shortTitle: "Premiers ressentis",
    iconEmoji: "⚡",
    clientMessage:
      "Coucou [Prénom] ⚡ 3 jours déjà ! Tu remarques des changements sur l'énergie ou les fringales ? Dis-moi comment tu te sens 💪",
    smsMessage: "Coucou [Prénom] ⚡ 3 jours, des changements sur énergie/fringales ? 💪",
    coachGuide: {
      objective:
        "Valider les premiers effets, ajuster hydratation et assiette, installer la collation et ouvrir la porte au partage naturel.",
      keyActions: [
        "Noter les ressentis du client (énergie, fringales, transit, sommeil)",
        "Proposer d'ajouter la collation 17h si pas encore en place",
        "Vérifier l'hydratation sur 24h",
        "Ouvrir le sujet du partage naturel sans forcer",
      ],
      adjustments: [
        "Assiette type : 1/2 légumes + 1/4 protéines + 1/4 féculents + 10g huile",
        "Collation 17h : shake F1+PDM OU Skyr + fruit OU 10-15 amandes + fruit",
        "Si fatigue : revoir l'hydratation (2 bouteilles 1L préparées le matin)",
      ],
      productsFocus: ["F1 + PDM (collation possible aussi)", "Skyr (protéines + calcium)"],
      sharingScript:
        "Si quelqu'un te demande ce que tu fais, tu peux dire : « J'ai commencé un challenge avec mon coach, un suivi simple pour l'alimentation et l'hydratation. Je sens déjà plus d'énergie en quelques jours. Si ça t'intéresse, je peux te mettre en contact avec lui. »",
      distributorNotes: [
        "Garder le message court et humain",
        "Proposer partage seulement si le client est enthousiaste",
        "Noter précisément les ressentis pour le RDV J+14",
      ],
    },
  },
  {
    id: "j7",
    dayOffset: 7,
    title: "J+7 · Bonjour le VIP",
    shortTitle: "Découvrir le VIP",
    iconEmoji: "👑",
    clientMessage:
      "Coucou [Prénom] ! 👋 Une semaine déjà, bravo pour ta régularité. Tu as peut-être vu sur le groupe qu'on parle du programme VIP ? Tu veux qu'on en parle 2 min ?",
    smsMessage: "[Prénom] 👑 1 semaine ! Tu veux qu'on parle du programme VIP (remises + suivi prio) ? 😊",
    coachGuide: {
      objective:
        "Féliciter la régularité de la semaine 1, présenter l'option VIP de manière simple, sécuriser la continuité du programme.",
      keyActions: [
        "Féliciter chaleureusement",
        "Inviter à une présentation courte (2 min en direct ou présentation hebdo)",
        "Préparer le lien d'inscription VIP avec son ID sponsor",
      ],
      adjustments: [
        "Si le client hésite : rappeler les bénéfices concrets (remises 15%+, livraison directe)",
        "Si le client est emballé : faire l'inscription ensemble par téléphone/visio",
      ],
      productsFocus: [
        "Programme actuel + anticipation du réassort",
        "Possibilité Night Mode à J+10",
      ],
      sharingScript:
        "Pour la présentation VIP : « C'est comme un abonnement avantageux : tu commandes directement chez Herbalife avec mon suivi, tu as 15% de remise dès le départ, et ça monte jusqu'à 35% selon ta consommation. »",
      distributorNotes: [
        "Vérifier que l'ID sponsor est bien celui du distri actuel",
        "Préparer le lien pas à pas (3 premières lettres du nom, pack Non)",
        "Proposer d'assister à la présentation hebdo du groupe",
        "Ne JAMAIS forcer l'inscription — laisser venir",
      ],
    },
  },
  {
    id: "j10",
    dayOffset: 10,
    title: "J+10 · Énergie & sommeil",
    shortTitle: "Énergie & sommeil",
    iconEmoji: "🌙",
    clientMessage:
      "Coucou [Prénom] 🌙 Comment tu te sens niveau énergie et sommeil ces derniers jours ? Dis-moi tout.",
    smsMessage: "[Prénom] 🌙 Comment va l'énergie et le sommeil ? Dis-moi.",
    coachGuide: {
      objective:
        "Améliorer la qualité du repos pour booster énergie, satiété et motivation. Si pertinent, introduire Night Mode (safran).",
      keyActions: [
        "Faire le point sur la qualité du sommeil",
        "Vérifier la consommation de stimulants après 15-16h",
        "Proposer un rituel du soir simple (10 min avant dodo)",
        "Introduire Night Mode si insomnies / réveils nocturnes",
      ],
      adjustments: [
        "Écrans off : +90 min avant dodo",
        "Dernier repas 2-3h avant, léger en sucres rapides",
        "Chambre fraîche, sombre, téléphone en mode avion",
        "Si faim tardive : Skyr + cannelle",
      ],
      productsFocus: [
        "Night Mode (extrait de safran) — boisson du soir 45-60 min avant coucher",
        "Rappel : shake F1+PDM au réveil",
      ],
      distributorNotes: [
        "Mentions conformité Night Mode : « Utiliser dans le cadre d'une alimentation variée et d'un mode de vie sain. »",
        "Adapter aux mentions locales et étiquetage officiel",
        "Rappeler que les effets varient selon les personnes",
        "Si réveils nocturnes : tester 5 respirations lentes + gorgées d'eau",
      ],
    },
  },
  {
    id: "j14",
    dayOffset: 14,
    title: "J+14 · RDV de suivi",
    shortTitle: "RDV présentiel",
    iconEmoji: "🎯",
    clientMessage:
      "Hello [Prénom] ! On fait le point ensemble ? Je te propose qu'on se voie cette semaine pour ton suivi des 2 semaines 💪 Quel jour t'arrange le mieux ?",
    smsMessage: "[Prénom] on fait le bilan des 2 semaines ? Quel jour cette semaine ? 💪",
    coachGuide: {
      objective:
        "Programmer le RDV de suivi présentiel, faire le bilan des 2 premières semaines, ajuster le programme pour la suite.",
      keyActions: [
        "Proposer 2-3 créneaux précis",
        "Préparer le body scan pour comparaison avec J+0",
        "Avoir les ressentis notés depuis J+1",
        "Anticiper le réassort",
      ],
      adjustments: [
        "Préparer les ajustements selon les résultats (volume, produits)",
        "Si objectif atteint : féliciter + programme maintien",
        "Si objectif partiel : encouragement + ajustement programme",
      ],
      productsFocus: [
        "Anticiper le réassort du programme actuel",
        "Éventuels nouveaux produits selon les besoins détectés",
      ],
      distributorNotes: [
        "Utiliser l'agenda Lor'Squad pour bloquer le RDV",
        "Préparer un récap visuel de l'évolution (poids, mesures)",
        "Valoriser les progrès même petits",
        "Ouvrir la porte à une prolongation du programme",
      ],
    },
  },
];

/** Remplace les variables dynamiques dans un message. Pour l'instant : [Prénom]. */
export function interpolateStepMessage(template: string, variables: { firstName?: string }): string {
  const firstName = variables.firstName?.trim() ?? "";
  return template.replace(/\[Prénom\]/g, firstName || "toi");
}
