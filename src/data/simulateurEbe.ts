// =============================================================================
// Simulateur EBE — 2 scénarios, 6 étapes, choix scorés (2026-05-04)
//
// Permet à un distri débutant de s'entraîner à mener un EBE complet face à
// un prospect scripté. Chaque étape : message prospect → 3 choix de réponse
// (excellent 10pts / moyen 5pts / faux 0pt) avec feedback pédagogique.
//
// Score max : 60 pts (6 étapes × 10). Bandes :
//   ≥ 50 → Maître EBE 🏆
//   ≥ 35 → EBE solide ✅
//   ≥ 20 → À retravailler 📝
//   < 20 → Reprendre les bases 🔄
// =============================================================================

export type EbeChoiceQuality = "excellent" | "moyen" | "faux";

export interface EbeChoice {
  id: string;
  text: string;
  quality: EbeChoiceQuality;
  feedback: string;
}

export interface EbeStep {
  id: string;
  /** Numéro étape 1-6. */
  index: number;
  /** Phase EBE pour eyebrow. */
  phase: string;
  /** Titre court. */
  title: string;
  /** Le prospect parle (peut être plusieurs lignes \n). */
  prospectLine: string;
  /** Tip pédagogique discret avant les choix. */
  hint?: string;
  choices: EbeChoice[];
}

export interface EbeScenario {
  id: string;
  /** Nom + prénom du faux prospect. */
  name: string;
  /** Avatar emoji (pas de photo, on reste sobre). */
  avatar: string;
  /** Âge / situation rapide. */
  bio: string;
  /** Objectif principal du prospect (pour matcher le programme). */
  objective: string;
  /** Couleur d'accent (token --ls-*). */
  accent: string;
  /** Difficulté pour le distri. */
  difficulty: "facile" | "moyen" | "expert";
  steps: EbeStep[];
}

const SCORE_BY_QUALITY: Record<EbeChoiceQuality, number> = {
  excellent: 10,
  moyen: 5,
  faux: 0,
};

export function scoreFor(quality: EbeChoiceQuality): number {
  return SCORE_BY_QUALITY[quality];
}

export interface EbeScoreBand {
  label: string;
  emoji: string;
  color: string;
  message: string;
}

export function scoreBand(score: number): EbeScoreBand {
  if (score >= 50) {
    return {
      label: "Maître EBE",
      emoji: "🏆",
      color: "var(--ls-gold)",
      message: "Tu mènes un EBE qui inspire confiance. Tu peux closer en RDV réel sans hésiter.",
    };
  }
  if (score >= 35) {
    return {
      label: "EBE solide",
      emoji: "✅",
      color: "var(--ls-teal)",
      message: "Tu maîtrises la trame. Encore quelques détails à polir et tu seras au top.",
    };
  }
  if (score >= 20) {
    return {
      label: "À retravailler",
      emoji: "📝",
      color: "var(--ls-coral)",
      message: "Les bases sont là, mais certains réflexes manquent. Refais le scénario et relis le module M1.6 EBE.",
    };
  }
  return {
    label: "Reprendre les bases",
    emoji: "🔄",
    color: "var(--ls-coral)",
    message: "Pas de panique : reprends le module M1.6 + l'outil EBE pas-à-pas avant de retenter. Tu vas y arriver.",
  };
}

// ─── Scénario 1 : Sophie, sceptique, perte de poids ──────────────────────
const sophie: EbeScenario = {
  id: "sophie",
  name: "Sophie · 32 ans",
  avatar: "🙋‍♀️",
  bio: "Prof de français, 2 enfants. Fatiguée le matin, grignotage le soir. Veut perdre 5 kg avant l'été mais a déjà essayé 3 régimes qui ont raté.",
  objective: "Perte de poids + énergie",
  accent: "var(--ls-coral)",
  difficulty: "moyen",
  steps: [
    {
      id: "accueil",
      index: 1,
      phase: "Étape 1 · Accueil",
      title: "Mise à l'aise",
      prospectLine:
        "Bonjour ! Bon, je suis venue parce que ma copine Marie m'a dit du bien… mais franchement j'ai pas trop de temps et j'ai déjà tout essayé. On peut commencer ?",
      hint: "Premier objectif : créer du rapport et désamorcer l'agacement. Pas vendre.",
      choices: [
        {
          id: "a",
          text: "Bonjour Sophie, super sympa de prendre 30 minutes pour toi aujourd'hui. Avant tout, tu veux un thé ou un verre d'eau ? Et raconte-moi : qu'est-ce que tu fais dans la vie ?",
          quality: "excellent",
          feedback:
            "✨ Parfait. Tu remercies, tu poses un petit geste d'accueil et tu lances une question ouverte. Tu fais baisser la garde sans parler produit.",
        },
        {
          id: "b",
          text: "T'inquiète, on va faire ça vite. Tu vas voir, mes produits ont déjà fait perdre 8 kg à plein de gens.",
          quality: "faux",
          feedback:
            "❌ Tu pitches direct un produit avant même de connaître la personne. C'est exactement ce que les sceptiques détestent.",
        },
        {
          id: "c",
          text: "OK, on attaque. Tes objectifs c'est quoi en gros ?",
          quality: "moyen",
          feedback:
            "⚠️ Tu sautes l'accueil, tu vas droit au but. Sur une sceptique, tu rates l'occasion de créer la confiance.",
        },
      ],
    },
    {
      id: "decouverte",
      index: 2,
      phase: "Étape 2 · Découverte",
      title: "Comprendre le vrai besoin",
      prospectLine:
        "Bah… je veux perdre 5 kg avant l'été. J'ai testé Weight Watchers, le jeûne, le keto. Ça marche 3 semaines puis je craque. Et j'en peux plus d'être crevée à 14h.",
      hint: "Deux infos précieuses : échec récurrent + fatigue. Creuse, ne saute pas dessus.",
      choices: [
        {
          id: "a",
          text: "Tu craques le soir ou plutôt en journée ? Et la fatigue à 14h, ça arrive même les jours où t'as bien dormi ?",
          quality: "excellent",
          feedback:
            "✨ Tu creuses sans juger. Tu vas comprendre si c'est nutrition, hydratation ou sommeil. Ça t'aidera à proposer LE bon programme.",
        },
        {
          id: "b",
          text: "Normal, ces régimes c'est de la merde. Avec Herbalife t'auras pas faim et tu seras au top.",
          quality: "faux",
          feedback:
            "❌ Tu critiques ses choix passés (elle se sent jugée) ET tu sur-promets. Crash de confiance assuré.",
        },
        {
          id: "c",
          text: "Ah oui je connais ces régimes. Bon on va te peser et faire les mesures, ça nous donnera une base.",
          quality: "moyen",
          feedback:
            "⚠️ Tu enchaînes sur le scan sans avoir compris pourquoi elle craque ni pourquoi elle est fatiguée. Tu rates le 'pourquoi'.",
        },
      ],
    },
    {
      id: "bodyscan",
      index: 3,
      phase: "Étape 3 · Body scan",
      title: "Présenter les mesures",
      prospectLine:
        "*regarde la balance Tanita* Hmm c'est précis ce truc ? J'ai pas trop envie de connaître mon vrai poids hein…",
      hint: "Elle est mal à l'aise. Pose un cadre rassurant avant d'appuyer sur Start.",
      choices: [
        {
          id: "a",
          text: "Je te comprends. On va le voir ensemble, juste toi et moi, et c'est totalement confidentiel. Le but c'est pas de te juger, c'est d'avoir un point de départ pour mesurer tes progrès dans 3 semaines.",
          quality: "excellent",
          feedback:
            "✨ Tu valides son émotion, tu cadres le pourquoi du scan (mesurer les progrès, pas juger). Tu transformes l'angoisse en projet.",
        },
        {
          id: "b",
          text: "Allez vas-y monte, c'est juste un chiffre.",
          quality: "faux",
          feedback:
            "❌ Tu balaies son ressenti. Elle va se braquer ou refuser de revenir.",
        },
        {
          id: "c",
          text: "T'inquiète c'est précis. Allez monte, on est pas là pour s'éterniser.",
          quality: "moyen",
          feedback:
            "⚠️ Tu réponds à la question technique mais pas à l'émotion. Tu rates l'occasion de la rassurer.",
        },
      ],
    },
    {
      id: "presentation",
      index: 4,
      phase: "Étape 4 · Solution",
      title: "Présenter le programme",
      prospectLine:
        "OK donc 28 % de masse grasse… c'est beaucoup ? Bon vas-y, présente-moi ton truc, j'écoute.",
      hint: "Ne pitche pas une liste de produits. Connecte chaque produit à un de SES problèmes.",
      choices: [
        {
          id: "a",
          text: "Sur la base de ce que tu m'as dit — fatigue, craquages le soir, échecs de régimes — je te propose un programme nutrition complet : un petit-déj qui te tient jusqu'à midi, une protéine qui coupe la faim du soir, et un thé qui booste ton énergie l'après-midi. Tu veux qu'on regarde ensemble ?",
          quality: "excellent",
          feedback:
            "✨ Tu fais le lien entre SES problèmes et la solution. Pas un catalogue : une réponse personnalisée.",
        },
        {
          id: "b",
          text: "Alors on a Formula 1 vanille fraise chocolat, PDM 25g protéines, Aloe digestion, Thé brûleur, Liftoff energy… tu prends quoi ?",
          quality: "faux",
          feedback:
            "❌ Catalogue de produits sans connexion à elle. Elle décroche en 10 secondes.",
        },
        {
          id: "c",
          text: "Je te propose le pack starter qui marche bien chez tout le monde, c'est 234 € pour 21 jours.",
          quality: "moyen",
          feedback:
            "⚠️ Tu balances un pack + un prix avant d'avoir construit la valeur. Elle va chercher l'objection prix direct.",
        },
      ],
    },
    {
      id: "closing",
      index: 5,
      phase: "Étape 5 · Closing",
      title: "Engagement et choix",
      prospectLine:
        "Bon ça a l'air bien… mais 234 €, c'est pas rien. Faut que j'en parle à mon mari et je te redis.",
      hint: "Objection prix classique + report. Ne capitule pas, ne pousse pas. Reformule la valeur.",
      choices: [
        {
          id: "a",
          text: "Je comprends totalement. Avant que tu en parles à ton mari, juste pour qu'il ait toutes les infos : 234 € pour 21 jours, ça fait 11 € par jour, le prix d'un sandwich + boisson midi. Sauf que là tu remplaces ce sandwich par un repas qui te fait perdre du poids ET te donne de l'énergie. Tu veux qu'on cale notre prochain RDV mardi ou jeudi ?",
          quality: "excellent",
          feedback:
            "✨ Tu valides l'objection, tu reformules la valeur en coût/jour comparable, tu proposes deux dates fermées. Closing maître.",
        },
        {
          id: "b",
          text: "OK pas de souci, t'as mon numéro, hésite pas à me rappeler quand tu veux.",
          quality: "faux",
          feedback:
            "❌ Tu lâches le lead. 90 % des prospects qui partent 'demander à leur conjoint' ne reviennent jamais. Il faut un rendez-vous fixé.",
        },
        {
          id: "c",
          text: "Si tu prends aujourd'hui je te fais une réduc de 20 €, c'est ma promo de la semaine.",
          quality: "moyen",
          feedback:
            "⚠️ Tu casses ta marge et tu dévalorises le programme. La perception devient 'c'est trop cher quand y'a pas de promo'.",
        },
      ],
    },
    {
      id: "recos",
      index: 6,
      phase: "Étape 6 · Recommandations",
      title: "Demander des recos",
      prospectLine:
        "OK très bien, on cale mardi 18h pour redémarrer. Merci pour ton temps !",
      hint: "Le moment OUBLIÉ par 90 % des distri. Maintenant qu'elle est satisfaite, c'est le bon moment.",
      choices: [
        {
          id: "a",
          text: "Avec plaisir Sophie ! Dis-moi, tu connais 2-3 personnes autour de toi qui aimeraient aussi retrouver leur énergie ou perdre quelques kilos avant l'été ? Pas besoin de leur vendre, juste leur prénom et je m'en occupe avec ton accord.",
          quality: "excellent",
          feedback:
            "✨ Tu demandes des recos qualifiées (pas 'qui pourrait être intéressé') au moment où elle est contente. Tu cadres ('juste leur prénom') pour réduire la friction.",
        },
        {
          id: "b",
          text: "Salut, à mardi !",
          quality: "faux",
          feedback:
            "❌ Tu rates la reco. Un EBE qui closing sans reco, c'est 50 % du potentiel perdu.",
        },
        {
          id: "c",
          text: "Au fait, si tu connais des gens qui veulent perdre du poids dis-le moi hein !",
          quality: "moyen",
          feedback:
            "⚠️ Trop vague, pas de cadre, pas de demande claire de prénoms. Elle va dire 'ouais ouais' et oublier.",
        },
      ],
    },
  ],
};

// ─── Scénario 2 : Karim, sportif, prise de masse ─────────────────────────
const karim: EbeScenario = {
  id: "karim",
  name: "Karim · 28 ans",
  avatar: "💪",
  bio: "Ouvrier BTP + muscu 4×/semaine. Veut prendre 4 kg de muscle. Mange beaucoup mais stagne. Sceptique sur les compléments mais ouvert.",
  objective: "Prise de masse + récupération",
  accent: "var(--ls-teal)",
  difficulty: "moyen",
  steps: [
    {
      id: "accueil",
      index: 1,
      phase: "Étape 1 · Accueil",
      title: "Mise à l'aise sportif",
      prospectLine:
        "Yo ! Bon je viens parce que mon collègue Mehdi prend tes trucs et il a pris 3 kg de muscle en 2 mois. Mais moi j'ai pas envie de me bourrer de protéines chimiques hein.",
      hint: "Il a déjà un a priori 'chimique'. Et il vient pour Mehdi, pas pour toi.",
      choices: [
        {
          id: "a",
          text: "Salut Karim ! Cool que tu sois venu. Mehdi m'a parlé de toi, t'as l'air sérieux à la salle. Avant qu'on parle produit, raconte-moi ton training et ce que tu manges en moyenne par jour ?",
          quality: "excellent",
          feedback:
            "✨ Tu valides Mehdi (preuve sociale), tu reconnais son engagement training, tu poses LA bonne question : son alimentation actuelle. Sans mention 'chimique' (tu réponds plus tard).",
        },
        {
          id: "b",
          text: "Oh non c'est pas chimique mes produits hein, c'est tout naturel à base de plantes !",
          quality: "faux",
          feedback:
            "❌ Tu te défends sur une attaque qu'il n'a même pas finie. Tu parais sur la défensive.",
        },
        {
          id: "c",
          text: "Tu veux prendre combien de kg ?",
          quality: "moyen",
          feedback:
            "⚠️ Tu sautes l'accueil et la découverte alimentaire. Sur un sportif qui mange déjà beaucoup, c'est SA conso actuelle qui est la clé.",
        },
      ],
    },
    {
      id: "decouverte",
      index: 2,
      phase: "Étape 2 · Découverte",
      title: "Comprendre la stagnation",
      prospectLine:
        "Je mange genre 6 fois par jour, riz, poulet, œufs… ouais beaucoup. Je m'entraîne dur. Mais ça stagne depuis 3 mois sur la barre et au miroir.",
      hint: "Pour un mec qui mange beaucoup mais stagne, le problème est rarement les calories. Pose la bonne question.",
      choices: [
        {
          id: "a",
          text: "OK et autour de l'entraînement, tu manges quoi ? Genre dans l'heure avant et dans l'heure après tu prends un truc spécifique ou tu attends le repas suivant ?",
          quality: "excellent",
          feedback:
            "✨ Bingo. Pour un sportif qui stagne, la fenêtre péri-training est souvent le trou. Tu vises juste.",
        },
        {
          id: "b",
          text: "Faut que tu manges plus, c'est tout. T'as pas assez de calories.",
          quality: "faux",
          feedback:
            "❌ Il vient de te dire qu'il mange beaucoup. Tu l'écoutes pas. Et c'est faux : la qualité bat la quantité ici.",
        },
        {
          id: "c",
          text: "Tu prends combien de protéines par jour en grammes ?",
          quality: "moyen",
          feedback:
            "⚠️ Question technique correcte mais froide. Il va dire 'je sais pas' et tu vas devoir tout reconstruire.",
        },
      ],
    },
    {
      id: "bodyscan",
      index: 3,
      phase: "Étape 3 · Body scan",
      title: "Mesurer le muscle",
      prospectLine:
        "*regarde la Tanita* Tiens elle mesure quoi exactement ta balance ? Le muscle aussi ?",
      hint: "Il est curieux et orienté chiffres. Pour un sportif, c'est un super moment pour expliquer les KPI utiles.",
      choices: [
        {
          id: "a",
          text: "Carrément. On va voir ton % muscle, ton % gras et ton % d'eau. Pour un objectif prise de masse comme le tien, ce qu'on veut surveiller c'est ton % muscle dans 3 semaines vs aujourd'hui — la balance classique te ment, elle te dit pas si tu prends du muscle ou du gras.",
          quality: "excellent",
          feedback:
            "✨ Tu connectes la techno à SON objectif. Tu lui apprends quelque chose qu'il va vouloir suivre.",
        },
        {
          id: "b",
          text: "Ouais ouais elle mesure tout. Allez monte.",
          quality: "faux",
          feedback:
            "❌ Tu rates l'occasion de l'éduquer. Il aime les chiffres, donne-lui de la viande.",
        },
        {
          id: "c",
          text: "Oui le muscle, le gras, l'eau, les os, et plein d'autres trucs. Allez vas-y monte.",
          quality: "moyen",
          feedback:
            "⚠️ Tu listes sans connecter à SON objectif prise de masse. C'est correct mais pas marquant.",
        },
      ],
    },
    {
      id: "presentation",
      index: 4,
      phase: "Étape 4 · Solution",
      title: "Programme sport",
      prospectLine:
        "OK donc je suis à 18 % de gras, 42 % de muscle. Bon vas-y c'est quoi le plan ?",
      hint: "Un sportif veut un PROTOCOLE clair, pas un argumentaire émotionnel.",
      choices: [
        {
          id: "a",
          text: "Pour un objectif prise de masse propre, je te propose un protocole en 3 temps : Formula 1 + Protein Drink Mix au petit-déj (40g protéines + 600 kcal qualité), Protein Drink Mix shaker post-training (24g protéines whey/soja + créatine), et Liftoff avant la séance pour booster l'intensité. Tu manges normal le reste.",
          quality: "excellent",
          feedback:
            "✨ Tu donnes un protocole précis, avec timing, dosages et raison de chaque produit. C'est exactement ce que veut un sportif.",
        },
        {
          id: "b",
          text: "T'inquiète j'ai un super pack pour la prise de masse, ça marche du tonnerre.",
          quality: "faux",
          feedback:
            "❌ Vague, zéro chiffre, zéro protocole. Sur un sportif tu décrédibilises tout.",
        },
        {
          id: "c",
          text: "Tu prends Formula 1 le matin, PDM après training, et créatine. Voilà.",
          quality: "moyen",
          feedback:
            "⚠️ Tu donnes les produits mais sans le 'pourquoi' ni les dosages. Il va chercher tout ça sur Google et trouver un concurrent moins cher.",
        },
      ],
    },
    {
      id: "closing",
      index: 5,
      phase: "Étape 5 · Closing",
      title: "Engagement",
      prospectLine:
        "Carré. Ça fait combien tout ça ? Et tu garantis quoi en termes de résultats ?",
      hint: "Sportif = direct, pragmatique. Donne le prix sans hésiter et engage-le sur un protocole testable.",
      choices: [
        {
          id: "a",
          text: "Le pack complet c'est 280 €. Sur la garantie : si tu suis le protocole exactement (entraînement + nutrition + produits) pendant 21 jours, on se revoit, on remesure ton % muscle. Si t'as pas pris au moins 0,5 kg de muscle en 21 jours je te rembourse les produits non utilisés. Deal ?",
          quality: "excellent",
          feedback:
            "✨ Tu donnes le prix franc, tu cadres une garantie testable et binaire, tu engages sur un protocole. Pour un sportif c'est béton.",
        },
        {
          id: "b",
          text: "280 €. Mais je peux te garantir que tu vas voir des résultats hein, t'inquiète.",
          quality: "faux",
          feedback:
            "❌ 'T'inquiète' à un sportif qui veut des chiffres = perte de crédibilité immédiate.",
        },
        {
          id: "c",
          text: "C'est 280 € le pack, et bon, les résultats ça dépend de toi aussi t'sais.",
          quality: "moyen",
          feedback:
            "⚠️ Tu te défausses sur lui pour la responsabilité résultats. Il va sentir que tu te protèges plus que tu te projettes.",
        },
      ],
    },
    {
      id: "recos",
      index: 6,
      phase: "Étape 6 · Recommandations",
      title: "Recos via la salle",
      prospectLine:
        "OK go, je prends. À dans 3 semaines pour le check.",
      hint: "Un sportif a un réseau salle = mine d'or de recos. Demande maintenant.",
      choices: [
        {
          id: "a",
          text: "Top Karim ! Question : à ta salle t'as combien de potes qui galèrent à prendre du muscle ou qui veulent sécher ? Si tu veux, prends 30 secondes pour me donner 2-3 prénoms, je leur propose le même check qu'on vient de faire — sans engagement et tu fais une bonne action.",
          quality: "excellent",
          feedback:
            "✨ Tu cibles le réseau précis (la salle), tu cadres la demande (2-3 prénoms), tu retournes la valeur (bonne action). Reco maître.",
        },
        {
          id: "b",
          text: "À dans 3 semaines !",
          quality: "faux",
          feedback:
            "❌ Tu rates la reco au moment où il vient de signer. C'est LE moment.",
        },
        {
          id: "c",
          text: "Si tu connais d'autres sportifs n'hésite pas à leur parler de moi.",
          quality: "moyen",
          feedback:
            "⚠️ Tu transfères le job de prospection à lui. Il oubliera. Tu dois repartir avec des prénoms toi-même.",
        },
      ],
    },
  ],
};

export const EBE_SCENARIOS: EbeScenario[] = [sophie, karim];

export function getScenarioById(id: string): EbeScenario | undefined {
  return EBE_SCENARIOS.find((s) => s.id === id);
}
