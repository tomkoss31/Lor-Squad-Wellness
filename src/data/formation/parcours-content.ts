// =============================================================================
// FORMATION CONTENT — src/data/formation/parcours-content.ts
//
// Source de vérité du contenu pédagogique /formation Lor'Squad.
// Format conforme aux types définis par Claude Code (qcm + free_text discriminated union).
//
// CHOIX RÉDACTIONNELS :
//   - Tutoiement, ton direct, zéro jargon corporate.
//   - Chaque module : 3-5 leçons text + 3 QCM + 1 free_text.
//   - passingScore = nombre total de QCM (les free_text ne comptent pas).
//   - Les free_text passent automatiquement dans le thread sponsor en kind:'answer'
//     (logique côté service.ts.submitModule, déjà validée par Claude Code).
//   - Calibrage France : 1 VP = 1,50 € · marge Sup 50% · panier 75 VP · DMO 5-3-1.
//
// Livré par Claude (atelier Notion) le 02/05/2026.
//
// LEXIQUE Lor'Squad (validé Thomas, 2026-05-03) :
//   - EBE   = Évaluation Bien-Être : bilan client 1-1 ~60 min. L'app
//             pilote la trame. C'est la scène signature du distri.
//             ⚠️ Ne JAMAIS utiliser EBE pour parler d'un événement groupe.
//   - HOM   = House Opportunity Meeting : mini-soirée business chez
//             quelqu'un, 8-15 personnes, prospects tièdes, intime.
//   - Apéro Healthy = soirée business mensuelle 25-50 personnes,
//             prospects + équipe, focus opportunité business.
//   - Quick Start = pack démarrage / formation accélérée pour distri
//             débutants (1-2h).
//   - Fin de Challenge = clôture rituel groupe après un défi 21j/30j.
//   - Refonte 2026-05-03 : tous les "EBE-event" passés en "apéro healthy".
// =============================================================================

import type { FormationModule } from "./types";

// =============================================================================
// NIVEAU 1 — DÉMARRER (5 modules · 0 → 500 PV)
// =============================================================================

export const N1_MODULES: FormationModule[] = [
  // ───────────────────────────────────────────────────────────────────────────
  // M1.1 — Comprendre l'opportunité
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "M1.1",
    slug: "comprendre-opportunite",
    number: "1.1",
    title: "Comprendre l'opportunité",
    description: "Pourquoi Herbalife, pourquoi maintenant, pourquoi toi. La base pour ne plus jamais douter de ton choix.",
    durationMin: 8,
    icon: "🌱",
    ideeForce:
      "Herbalife n'est pas un job, c'est un véhicule. Ce que tu en fais dépend de comment tu le conduis. Avant de pitcher ou de recruter, comprends ce que tu offres : santé + complément de revenu + liberté de temps. Ces 3 leviers ensemble n'existent dans aucun autre métier accessible sans diplôme.",
    ancrage: "« Tu ne vends pas des produits. Tu vends une transformation. »",
    action:
      "Prends un papier et écris ton « pourquoi » personnel en 3 lignes. Affiche-le sur ton bureau ou en fond d'écran téléphone. Tu le verras tous les jours quand viendront les moments durs.",
    relatedToolkitSlugs: ["charte-distributeur", "feuille-reconnaissance", "calculateur-strategy-plan"],
    lessons: [
      {
        id: "M1.1-L1",
        slug: "trois-leviers",
        title: "Les 3 leviers d'Herbalife",
        kind: "text",
        durationMin: 2,
        contentMarkdown: `## Les 3 leviers d'Herbalife

Trois forces s'activent **ensemble**. Aucune ne suffit isolément.

**1. La qualité produits** — 40+ ans de R&D, leader mondial du shake protéiné, distribution dans 90+ pays.

**2. Le plan marketing** — 50% de marge perso dès Supervisor, 5% de royalties sur 3 niveaux, bonus de leadership en cascade.

**3. La communauté** — tu n'es jamais seul. Sponsor, équipe, événements, formation. C'est ce qui fait tenir quand vient la tempête.

> Sans la qualité produits, tu vends du vent.
> Sans le plan marketing, tu travailles pour rien.
> Sans la communauté, tu abandonnes au 3ᵉ mois.`
      },
      {
        id: "M1.1-L2",
        slug: "pourquoi-maintenant",
        title: "Pourquoi maintenant",
        kind: "text",
        durationMin: 2,
        contentMarkdown: `## Pourquoi maintenant

La méga-tendance santé et bien-être est le plus gros marché mondial en croissance.

**Post-COVID**, les gens ne veulent plus juste « perdre 5 kg ». Ils cherchent une transformation durable avec un coach humain. Ils ne font plus confiance aux pubs — ils font confiance à des personnes.

C'est exactement ce que tu offres : pas un produit, **un accompagnement**. Le timing n'a jamais été aussi bon.`
      },
      {
        id: "M1.1-L3",
        slug: "verite-metier",
        title: "Ce qu'on ne te dira pas ailleurs",
        kind: "text",
        durationMin: 2,
        contentMarkdown: `## Ce qu'on ne te dira pas ailleurs

C'est un **VRAI** métier. Pas magique, pas passif, pas d'argent facile.

- Si tu y mets **0h/semaine**, tu gagnes 0 €.
- Si tu y mets **10h/semaine** intelligemment, tu gagnes un complément confortable.
- Si tu y mets **30h+** avec méthode, tu peux changer de vie.

**Pas magie, méthode.** C'est ce qui le rend accessible et c'est ce qui le rend exigeant.`
      },
      {
        id: "M1.1-L4",
        slug: "ton-premier-objectif",
        title: "Ton 1er objectif : 5 cobayes proches",
        kind: "text",
        durationMin: 2,
        contentMarkdown: `## Pas de pression. Pas de calculs.

Pour tes 30 premiers jours, **on oublie les chiffres compliqués**. Ton seul objectif :

> 🎯 **Trouver 5 personnes proches de toi qui acceptent de tester un programme avec toi.**

Pas vendre. Pas convaincre. **Tester.**

**Pourquoi 5 ?**
- 5 témoignages réels qui valident ce que tu fais
- 5 retours qui te donnent confiance
- 5 personnes qui peuvent te recommander quelqu'un d'autre

Chacun de ces 5 cobayes peut devenir un client régulier ensuite. Et c'est ça qui crée ton premier vrai revenu — pas les calculs sophistiqués que tu verras plus tard quand tu seras Supervisor.

> 💡 **Calcul simple** : 5 cobayes × 1 programme = ton démarrage. Pas plus, pas moins.`
      }
    ],
    quiz: {
      id: "M1.1-quiz",
      passingScore: 3,
      questions: [
        {
          kind: "qcm",
          id: "Q1",
          question: "Combien de % de marge fait un Supervisor sur ses ventes perso ?",
          answers: ["25 %", "35 %", "50 %", "75 %"],
          correctIndex: 2,
          explanation:
            "Au rang Supervisor, tu touches 50 % de marge sur tes ventes perso. C'est la base du modèle Herbalife — atteindre Sup le plus vite possible débloque cette marge."
        },
        {
          kind: "qcm",
          id: "Q2",
          question: "Quel est ton 1er objectif sur tes 30 premiers jours ?",
          answers: [
            "Recruter 5 distributeurs",
            "Faire 1 000 PV en perso",
            "Trouver 5 cobayes proches qui testent un programme avec toi",
            "Comprendre tout le plan marketing par cœur",
          ],
          correctIndex: 2,
          explanation:
            "5 cobayes proches qui testent un programme. Pas vendre, pas convaincre, pas calculer ton CA — juste créer 5 transformations réelles autour de toi. C'est de là que tout part.",
        },
        {
          kind: "qcm",
          id: "Q3",
          question: "Combien d'heures/semaine il faut pour gagner « un complément confortable » ?",
          answers: ["2h", "5-10h", "20h", "30h+"],
          correctIndex: 1,
          explanation:
            "5 à 10h/semaine si tu travailles avec méthode (DMO 5-3-1, suivi régulier). En-dessous tu n'es pas dans l'action, au-dessus c'est devenu un vrai business à plein temps.",
        },
        {
          kind: "free_text",
          id: "Q4",
          question: "Ton « pourquoi » personnel",
          prompt:
            "Décris en 3 phrases ton « pourquoi » pour démarrer Herbalife. Pas de « je veux être libre » — quelque chose de **concret** et **tangible** (un projet, un montant, un délai, un proche à aider).",
          sponsorCheckHint:
            "Vérifier que la réponse contient un projet concret avec montant, délai ou bénéficiaire. Si trop vague (« je veux être libre », « gagner ma vie »), demander un complément avec un exemple précis.",
          minChars: 80
        }
      ]
    }
  },

  // ───────────────────────────────────────────────────────────────────────────
  // M1.A — Mes 21 jours cobaye (NEW 2026-05-04)
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "M1.A",
    slug: "vingt-et-un-jours-cobaye",
    number: "1.2",
    title: "Mes 21 jours cobaye",
    description: "Tu consommes avant de vendre. 21 jours pour ressentir, photographier, raconter. La règle d'or de Mark Hughes.",
    durationMin: 6,
    icon: "🥤",
    ideeForce:
      "Mark Hughes a posé la règle dès les années 80 : tu consommes les produits 21 jours avant d'oser en parler. Pourquoi ? Parce que ton meilleur argument de vente, ce ne sont pas les chiffres ni le packaging — c'est TON corps et TON expérience. Sans 21 jours cobaye, tu pitches du vent. Avec 21 jours derrière toi, tu racontes ta vie.",
    ancrage: "« Tu ne vends pas un produit. Tu partages une expérience que tu as vécue. »",
    action:
      "Si tu n'as pas encore ton pack starter (F1 + PDM + Aloe + Thé), commande-le aujourd'hui. Démarre demain matin avec ton 1er shake. Photographie-toi avant + chaque semaine + à J21. Tu auras ton 1er « avant/après » à raconter en cobaye crédible.",
    relatedToolkitSlugs: ["bases-presentiel"],
    lessons: [
      {
        id: "M1.A-L1",
        slug: "pourquoi-21-jours",
        title: "Pourquoi 21 jours, pas 7 ni 30",
        kind: "text",
        durationMin: 2,
        contentMarkdown: `## La règle posée par le fondateur

**Mark Hughes** (fondateur Herbalife, 1980) a posé une règle simple : *tu consommes 21 jours avant de parler des produits*.

**Pourquoi 21 ?**
- 7 jours = trop peu pour ressentir une vraie différence
- 21 jours = le temps qu'il faut au corps pour s'adapter, à la peau pour briller, à l'énergie pour s'installer
- 30+ jours = bien, mais on attend pas pour démarrer

**Pourquoi cobaye ?**
- Tu n'es pas un expert. Tu es un humain qui teste.
- Si ça marche pour toi, tu peux le partager.
- Si ça ne marche pas, tu ajustes ou tu changes — tu n'es pas obligé de pitcher.

> Tu ne vendrais jamais une voiture sans l'avoir conduite. Pareil pour Herbalife. Conduis-la 21 jours, ensuite tu en parles avec autorité.`,
      },
      {
        id: "M1.A-L2",
        slug: "ton-protocole-21j",
        title: "Ton protocole 21 jours",
        kind: "text",
        durationMin: 2,
        contentMarkdown: `## Le rituel quotidien (max simple)

**🌅 Matin** :
1. 1 verre d'**Aloe** + eau (5 min après le réveil)
2. 1 **shake F1** (250 ml lait/eau + 2 cuillères) en remplacement du petit-déj
3. (Sport) +1 dose **PDM** dans le shake

**☕ Toute la journée** :
4. 1 **Thé Thermojetics** chaud ou froid (à la place du café n°2 ou 3)
5. 1,5L à 2L d'eau

**🌙 Soir** :
6. Petit dîner normal (pas de shake — mange vrai)

**📸 Tracking** :
- Photo **avant** (J0) face + profil
- Photo **chaque dimanche** (J7, J14, J21)
- Note ton ressenti dans une note téléphone : énergie, humeur, sommeil, appétit

> Le tracking, c'est ton matériau de témoignage. Sans photo, pas de transformation visible. Sans note, pas de récit.`,
      },
      {
        id: "M1.A-L3",
        slug: "raconter-ton-experience",
        title: "Comment raconter ton avant/après",
        kind: "text",
        durationMin: 2,
        contentMarkdown: `## La structure du témoignage qui fonctionne

À J21, tu auras 1 ou 2 vraies choses à dire. Pas 10. **Pas de baratin.**

**Structure simple en 4 lignes** :
1. *« Avant, j'avais [X problème] »*
2. *« J'ai testé [F1 + Aloe + Thé] pendant 21 jours »*
3. *« Aujourd'hui, je [Y résultat concret] »*
4. *« Et ce qui m'a surpris, c'est [Z détail inattendu] »*

**Exemple Thomas** :
> *« Avant, j'avais des coups de barre tous les jours à 15h. J'ai testé le shake F1 le matin et le thé l'après-midi pendant 21 jours. Aujourd'hui, mes après-midi sont stables. Ce qui m'a surpris, c'est que ma peau est nette en plus. »*

**Ce qui fait que ça marche** :
- Tu parles de TOI, pas du produit
- Tu donnes 1 résultat concret, pas 5
- Tu termines par une surprise (humanisé, pas marketing)

> Garde cette histoire prête. Tu vas la raconter ~50 fois cette année. Apprends-la par cœur.`,
      },
    ],
    quiz: {
      id: "M1.A-quiz",
      passingScore: 2,
      questions: [
        {
          kind: "qcm",
          id: "Q1",
          question: "Pourquoi 21 jours et pas 7 ?",
          answers: [
            "C'est arbitraire, le marketing Herbalife",
            "Le temps pour le corps de s'adapter et l'expérience de devenir crédible",
            "C'est la durée du programme client",
            "C'est 3 semaines, plus court que 30 jours",
          ],
          correctIndex: 1,
          explanation:
            "21 jours = le minimum pour ressentir une vraie différence (énergie, peau, sommeil) et avoir un témoignage crédible. 7 jours = pas assez. C'est aussi le temps psychologique pour installer une nouvelle habitude.",
        },
        {
          kind: "qcm",
          id: "Q2",
          question: "Ton meilleur argument de vente, c'est :",
          answers: [
            "Les ingrédients du F1 par cœur",
            "Le prix compétitif vs autres marques",
            "Ton corps et ton expérience perso",
            "Les diplômes des labos Herbalife",
          ],
          correctIndex: 2,
          explanation:
            "Ton expérience perso. Les chiffres et les ingrédients personne ne s'en souvient. Une histoire vraie « avant/après toi » s'installe immédiatement dans la tête de la personne.",
        },
        {
          kind: "free_text",
          id: "Q3",
          question: "Ton avant à J0",
          prompt:
            "Décris en 3 lignes ton ressenti AUJOURD'HUI (J0 ou avant de démarrer) : énergie, sommeil, peau, humeur, appétit. Tu compareras à J21 — c'est ta base de référence.",
          sponsorCheckHint:
            "Vérifier que la réponse contient des observations concrètes (ex. « coup de barre à 15h », « j'ai du mal à m'endormir », « peau terne ») et pas des généralités. Si trop vague, demander de préciser 2-3 choses observables.",
          minChars: 100,
        },
      ],
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // M1.B — Connaître mes produits (NEW 2026-05-04)
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "M1.B",
    slug: "connaitre-mes-produits",
    number: "1.3",
    title: "Connaître mes produits",
    description: "5 produits stars Herbalife. Ce que chacun fait, pour qui, et comment en parler en 1 phrase claire.",
    durationMin: 6,
    icon: "🌿",
    ideeForce:
      "Tu n'as pas besoin de connaître les 200 références Herbalife. Tu as besoin de maîtriser 5 produits stars. Si tu sais répondre à « ça fait quoi ? » et « c'est pour qui ? » en 1 phrase pour chacun, tu es opérationnel. Le reste, tu apprendras avec l'expérience.",
    ancrage: "« Mes 5 produits, c'est ma boîte à outils de base. Je les connais comme mes 10 doigts. »",
    action:
      "Apprends par cœur la phrase clé de chaque produit (ci-dessous). Teste-toi : referme la page, dis-les à voix haute. Si tu hésites sur un, refais le module. À la fin, tu sais pitcher chacun en 5 secondes.",
    relatedToolkitSlugs: ["bases-presentiel", "presentation-programme-script"],
    lessons: [
      {
        id: "M1.B-L1",
        slug: "les-5-stars",
        title: "Les 5 produits que tu dois maîtriser",
        kind: "text",
        durationMin: 3,
        contentMarkdown: `## Les 5 stars Herbalife à connaître par cœur

Pour chaque produit : **ce que c'est** + **phrase clé** + **pour qui**.

---

### 🥤 1. Formula 1 (F1) — le shake repas

**Ce que c'est** : un repas équilibré en poudre. 220 cal, 25 % protéines, 25 vitamines & minéraux. Multiples saveurs (vanille, chocolat, fraise, cookies&cream…).

**Phrase clé** : *« Le repas malin du matin ou du midi quand t'as pas le temps. »*

**Pour qui** :
- Quelqu'un qui veut perdre du poids → remplace 1 ou 2 repas
- Quelqu'un qui saute son petit-déj → c'est le 1er pas
- Sportif qui veut un repas pratique avant/après séance

---

### 💪 2. Protein Drink Mix (PDM) — le boost protéines

**Ce que c'est** : 15 g de protéines végétales en poudre, ajoutables au shake F1 ou à part. Goût neutre, parfait à mixer.

**Phrase clé** : *« +15 g de protéines pour rester rassasié plus longtemps. »*

**Pour qui** :
- Personne qui a faim 2h après le shake → on ajoute du PDM dans le F1
- Sportif en sèche / prise de masse → augmente l'apport sans calories vides
- Senior → maintien de la masse musculaire

---

### 🌿 3. Aloe Vera Concentré — l'allié digestion

**Ce que c'est** : concentré d'aloe vera buvable, à diluer dans l'eau. 4 saveurs (mangue, original, fraise, citron-citron vert).

**Phrase clé** : *« Mon réveil-corps : 1 verre le matin, ça nettoie. »*

**Pour qui** :
- Tout le monde, surtout digestion lente / ballonnements
- Sportif → hydratation + apport
- Tu peux en mettre dans ton eau de la journée

---

### 🍵 4. Thé Thermojetics — l'énergie sans café

**Ce que c'est** : poudre de thé concentré (vert, hibiscus, citron…). Se prépare chaud ou froid. 6-10 cal/cup.

**Phrase clé** : *« Le coup de boost de l'aprèm sans le coup de barre du café. »*

**Pour qui** :
- Anti-fatigue 15h-18h
- Quelqu'un qui veut réduire son café
- Hydratation goutue (mieux qu'un soda)

---

### ✨ 5. Coffret HLSkin — la routine beauté complète

**Ce que c'est** : routine soin du visage Herbalife — nettoyage, hydratation, soin ciblé. Plusieurs gammes (Soothing Aloe, Radiant C, Anti-âge…).

**Phrase clé** : *« Une routine simple matin & soir. Tu testes 14 jours, ta peau parle. »*

**Pour qui** :
- Femme (ou homme) qui veut une routine claire au lieu de 12 produits
- Cliente après un programme F1 → on poursuit la transformation par la peau
- Cadeau parfait à offrir comme « bilan beauté »

---

### 💡 Le pack starter Lor'Squad

**F1 + PDM + Aloe + Thé** = **100 PV** = **234 € retail** (prix client).

C'est le pack que tu vas proposer à 80 % de tes prospects. **Apprends-le par cœur** : tu peux pitcher dans n'importe quelle conversation en 5 secondes.

> Le coffret HLSkin se rajoute en seconde commande quand le client est en confiance après les 21 premiers jours.`,
      },
      {
        id: "M1.B-L2",
        slug: "pas-confondre-marques",
        title: "Pourquoi tu ne dois PAS confondre avec d'autres marques",
        kind: "text",
        durationMin: 1,
        contentMarkdown: `## Tes prospects vont comparer

*« Mon ami fait du Plenny / du Feed / du Yfood, c'est pareil ? »*

**Réponse simple** :
- Plenny / Feed / Yfood = repas substitut **occasionnel**, on dépanne
- F1 = **programme structuré** avec accompagnement coach, ajustements personnalisés, suivi 30j

**La différence** : *toi*. Pas le produit, mais l'**accompagnement humain** que tu donnes.

> Tu ne vends pas un shake. Tu vends une transformation accompagnée pendant 30+ jours.`,
      },
      {
        id: "M1.B-L3",
        slug: "ne-pas-jouer-medecin",
        title: "Tu n'es pas médecin (rappel important)",
        kind: "text",
        durationMin: 1,
        contentMarkdown: `## Limites éthiques

⚠️ **Ne dis JAMAIS** :
- *« Ça soigne »*
- *« Ça guérit »*
- *« C'est meilleur qu'un médicament »*

Les produits Herbalife sont des **compléments alimentaires**, pas des médicaments. Le respect de cette ligne est obligatoire (pour toi, pour la marque, pour la santé du prospect).

**Les bonnes formulations** :
- *« Ça m'a aidé à… »* (témoignage perso)
- *« Tu pourrais ressentir… »* (suggestion)
- *« Demande l'avis de ton médecin si tu prends un traitement »* (responsable)

> Si un prospect a une condition médicale (diabète, grossesse, allergie sévère) → renvoie systématiquement vers son médecin avant de proposer un programme.`,
      },
    ],
    quiz: {
      id: "M1.B-quiz",
      passingScore: 2,
      questions: [
        {
          kind: "qcm",
          id: "Q1",
          question: "Le pack starter F1 + PDM + Aloe + Thé représente :",
          answers: ["50 PV / 117 €", "75 PV / 175 €", "100 PV / 234 €", "150 PV / 350 €"],
          correctIndex: 2,
          explanation:
            "100 PV = 234 € retail. C'est le pack que tu proposes à 80 % de tes prospects en démarrage. Apprends ce chiffre par cœur — tu vas le citer souvent.",
        },
        {
          kind: "qcm",
          id: "Q2",
          question: "La phrase clé du Thé Thermojetics est :",
          answers: [
            "Le shake repas malin",
            "Le coup de boost de l'aprèm sans le coup de barre du café",
            "+15 g de protéines pour rester rassasié",
            "1 verre le matin, ça nettoie",
          ],
          correctIndex: 1,
          explanation:
            "Le thé est l'anti-fatigue 15h-18h. Tu remplaces le 2e ou 3e café de la journée. Le client ressent l'énergie sans le pic-puis-chute du café.",
        },
        {
          kind: "free_text",
          id: "Q3",
          question: "Pitche-moi le F1",
          prompt:
            "Imagine que tu rencontres un copain qui te demande « c'est quoi ton truc Herbalife ? ». Pitche-lui le F1 en 3 phrases max, avec ton ton à toi.",
          sponsorCheckHint:
            "Vérifier que la réponse cite : (a) ce que c'est en simple (shake repas), (b) à qui c'est utile (perte poids / saute petit-déj / sportif), (c) sans jouer médecin. Si trop technique ou si évoque guérison/maladie, demander de simplifier.",
          minChars: 80,
        },
      ],
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // M1.2 — Ma liste de connaissances
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "M1.2",
    slug: "liste-connaissances",
    number: "1.4",
    title: "Ma liste de connaissances",
    description: "Ton stock de prospects est déjà dans ton téléphone. Encore faut-il oser y penser.",
    durationMin: 7,
    icon: "📒",
    ideeForce:
      "Tu as déjà ton stock de prospects. Il est dans ton téléphone. Le seul problème, c'est que tu refuses d'y penser. La liste de 100 n'est pas une corvée — c'est ton inventaire de richesse. Si tu sautes cette étape, tu fais de la prospection froide pendant 6 mois pour rien.",
    ancrage: "« Ta liste est un puits sans fond. Tant que tu en sors des seaux, l'eau remonte. »",
    action:
      "Ouvre ton téléphone MAINTENANT. Écris au moins 50 noms aujourd'hui. Cible 100 d'ici 7 jours. Garde la liste vivante — ajoute les nouveaux contacts au fil de l'eau, ne la « termine » jamais.",
    relatedToolkitSlugs: ["liste-100-methode-frank", "scripts-invitation"],
    lessons: [
      {
        id: "M1.2-L1",
        slug: "regle-100",
        title: "La règle des 100",
        kind: "text",
        durationMin: 2,
        contentMarkdown: `## Pourquoi 100 et pas 50 ?

Sur 100 personnes :
- ~30 ne répondront jamais
- ~30 diront non sec
- ~30 écouteront poliment
- ~10 deviendront clients ou intéressés

**Sur 50 noms**, tu n'as pas la masse statistique pour t'en sortir.
**Sur 100**, tu as toujours quelqu'un à contacter — même un mauvais jour.`
      },
      {
        id: "M1.2-L2",
        slug: "methode-frank",
        title: "La méthode FRANK",
        kind: "text",
        durationMin: 2,
        contentMarkdown: `## FRANK — l'acronyme qui structure ta liste

- **F (Family)** : tous tes liens de sang, par alliance, beaux-parents, cousins.
- **R (Relations)** : collègues actuels et anciens, voisins, contacts pro.
- **A (Amis)** : amis d'enfance, de fac, sportifs, de soirées.
- **N (Network)** : tous tes followers actifs, contacts LinkedIn, groupes WhatsApp.
- **K (Kids' parents)** : parents d'amis de tes enfants, profs, club, asso.

Passe chaque catégorie systématiquement. Tu vas être surpris du nombre de noms qui ressortent.`
      },
      {
        id: "M1.2-L3",
        slug: "aucun-jugement",
        title: "Aucun jugement à priori",
        kind: "text",
        durationMin: 2,
        contentMarkdown: `## Les pièges classiques

- « Lui, il a déjà son business »
- « Elle, elle est trop sportive, elle n'a pas besoin »
- « Il dirait jamais oui »

**STOP.** Tu n'es pas dans leur tête.

L'or se cache dans ta liste B — ceux que tu éliminerais d'office. Mets-les TOUS sur la liste, tu trieras après. Le pire scénario est qu'ils refusent. Le meilleur, c'est qu'ils deviennent ton meilleur partenaire.`
      },
      {
        id: "M1.2-L4",
        slug: "hierarchiser",
        title: "Hiérarchiser CHAUD / TIÈDE / FROID",
        kind: "text",
        durationMin: 1,
        contentMarkdown: `## La triade qui te fait gagner du temps

- **CHAUD** : ils te font confiance, te répondent en moins de 24h, tu peux les appeler ce soir sans prévenir.
- **TIÈDE** : tu les as croisés récemment, vous êtes en bons termes mais distants.
- **FROID** : vous ne vous êtes pas parlé depuis longtemps.

**Cible pour démarrer** : 60% chaud + 30% tiède + 10% froid.`
      }
    ],
    quiz: {
      id: "M1.2-quiz",
      passingScore: 3,
      questions: [
        {
          kind: "qcm",
          id: "Q1",
          question: "La règle des 100, c'est combien de personnes minimum dans ta liste ?",
          answers: ["50", "100", "200", "500"],
          correctIndex: 1,
          explanation:
            "100 noms minimum. C'est la masse statistique nécessaire pour avoir toujours quelqu'un à contacter, même un mauvais jour."
        },
        {
          kind: "qcm",
          id: "Q2",
          question: "Que signifie le F dans FRANK ?",
          answers: ["Friends", "Family", "Followers", "Famous"],
          correctIndex: 1,
          explanation:
            "F = Family. La famille est la base de la liste — les liens de sang, par alliance, beaux-parents, cousins."
        },
        {
          kind: "qcm",
          id: "Q3",
          question: "Tu dois juger qui mérite ton temps avant de l'inviter ?",
          answers: [
            "Oui, sinon tu perds du temps",
            "Non, c'est le piège n°1",
            "Seulement les contacts froids",
            "Seulement la famille"
          ],
          correctIndex: 1,
          explanation:
            "C'est le piège n°1. L'or se cache dans ta liste B — ceux que tu éliminerais d'office. Mets tous les noms, tu trieras après."
        },
        {
          kind: "free_text",
          id: "Q4",
          question: "Tes 5 noms cachés",
          prompt:
            "Cite 5 personnes de ta liste que tu n'aurais PAS pensé à mettre il y a 1 mois (ou que tu étais sur le point d'éliminer). Pourquoi tu te disais qu'elles « n'étaient pas pour toi » ?",
          sponsorCheckHint:
            "Vérifier que les 5 noms sont réellement différents et que le distri prend conscience de ses préjugés. Réponse trop courte ou générique → demander à ré-affiner.",
          minChars: 100
        }
      ]
    }
  },

  // ───────────────────────────────────────────────────────────────────────────
  // M1.C — Mon premier message (NEW 2026-05-04)
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "M1.C",
    slug: "mon-premier-message",
    number: "1.5",
    title: "Mon premier message",
    description: "Le 1er message à un proche : pas un pitch, une invitation. Scripts copier-coller dans la boîte à outils.",
    durationMin: 5,
    icon: "💬",
    ideeForce:
      "L'erreur n°1 d'un débutant : pitcher dans le 1er message. *« Salut machin, je vends un truc super, tu veux essayer ? »* → ignored. Ce qui marche : une question + une invitation. Pas de produit, pas de promesse. Tu invites quelqu'un à un café, pas à acheter.",
    ancrage: "« Tu n'envoies pas un pitch. Tu envoies une invitation à un café. »",
    action:
      "Choisis 5 personnes dans ta liste de connaissances. Ouvre la boîte à outils → Scripts d'invitation → adapte 1 message à ton ton. Envoie aujourd'hui à ces 5 personnes. Note les réponses dans ta liste.",
    relatedToolkitSlugs: ["scripts-invitation", "hooks-reseaux-sociaux"],
    lessons: [
      {
        id: "M1.C-L1",
        slug: "pas-de-pitch",
        title: "Pourquoi pas de pitch dans le 1er message",
        kind: "text",
        durationMin: 2,
        contentMarkdown: `## L'erreur qui ferme toutes les portes

❌ *« Salut Marie ! Je viens de découvrir un truc génial, des shakes qui font perdre du poids. Ça t'intéresse ? »*

→ Marie lit ça. Elle pense :
- *« Encore un MLM qui vend du vent »*
- *« Pourquoi Sophie m'envoie ça à moi »*
- *« Ça pue le pyramidal »*
- → ignore + bloque dans sa tête

**Pourquoi ça ferme** :
1. Tu pitches un PRODUIT (alors qu'elle ne t'a rien demandé)
2. Tu fais une PROMESSE (perdre du poids → tu sais pas si elle veut)
3. Tu termines par une QUESTION FERMÉE (oui/non = elle a envie de dire non par défaut)

**Le 1er message n'est PAS un pitch. C'est une invitation à parler.**`,
      },
      {
        id: "M1.C-L2",
        slug: "structure-3-lignes",
        title: "La structure en 3 lignes qui marche",
        kind: "text",
        durationMin: 2,
        contentMarkdown: `## La formule simple : Curiosité → Invitation → Question ouverte

**Ligne 1 — Reprise du lien** : *« Salut [prénom], j'espère que tu vas bien. »*

**Ligne 2 — Curiosité (pas de pitch)** : *« Je voulais te poser une question, je teste un truc qui m'aide en ce moment. »*

**Ligne 3 — Invitation à parler** : *« On peut se prendre un café 15 min cette semaine ? »*

**Pourquoi ça marche** :
- Pas de produit cité → pas de filtre "MLM"
- "Te poser une question" → flatterie subtile + curiosité
- "15 min" → engagement faible → oui plus facile
- "Café" → format humain → pas un Zoom commercial

**Ce qui ne marche PAS** :
- *« Quand t'as 5 min on peut s'appeler ? »* → trop vague
- *« Je vends du Herbalife, ça t'intéresse ? »* → tué d'emblée
- *« Je voudrais te montrer une opportunité business »* → ferme tout

> 📦 **Les 10 messages prêts à copier sont dans ta Boîte à outils** → outil "Scripts d'invitation". Choisis-en 1, adapte 2-3 mots à ton ton, envoie.`,
      },
      {
        id: "M1.C-L3",
        slug: "cafe-apero-bilan",
        title: "Café, apéro healthy ou bilan ? Choisir le bon format",
        kind: "text",
        durationMin: 1,
        contentMarkdown: `## 3 niveaux d'invitation selon la personne

**☕ Café (15-20 min)** — pour les TIÈDES
- Personnes que tu connais peu ou avec qui tu n'as plus parlé
- *« On se prend un café, je te raconte ce que je teste »*
- Format conversationnel, pas commercial

**🍷 Apéro Healthy (2h, soirée)** — pour les CURIEUX
- Personnes qui aiment les sorties + l'opportunité de connaître du monde
- *« Je participe à une soirée bien-être mardi soir, je t'en garde une place ? »*
- Preuve sociale (autres distri + témoignages)

**🥗 Bilan / EBE (60 min, sérieux)** — pour les MOTIVÉS
- Personnes qui ont déjà exprimé un objectif (perte poids, énergie, etc.)
- *« On fait un bilan ensemble pour comprendre ce qui te manque »*
- Format engagé, structuré

> **Règle** : commence toujours par un **café** pour les froids/tièdes. Ne propose un bilan QUE si la personne demande explicitement « comment je peux essayer tes trucs ».`,
      },
    ],
    quiz: {
      id: "M1.C-quiz",
      passingScore: 2,
      questions: [
        {
          kind: "qcm",
          id: "Q1",
          question: "Le 1er message à un proche doit contenir :",
          answers: [
            "Une description claire du produit",
            "Une promesse de résultats",
            "De la curiosité + une invitation à un café",
            "Le prix du programme",
          ],
          correctIndex: 2,
          explanation:
            "Curiosité + invitation. Pas de produit cité, pas de promesse. Tu invites quelqu'un à parler, pas à acheter. Le pitch viendra plus tard, en face à face.",
        },
        {
          kind: "qcm",
          id: "Q2",
          question: "Pour un contact tiède (que tu n'as plus parlé depuis longtemps), tu proposes :",
          answers: [
            "Un EBE direct (gain de temps)",
            "Un apéro healthy (preuve sociale)",
            "Un café 15 min (format humain)",
            "Un appel téléphonique commercial",
          ],
          correctIndex: 2,
          explanation:
            "Café 15 min. Format humain, engagement faible, conversationnel. L'EBE et l'apéro arrivent ensuite quand le contact est réchauffé.",
        },
        {
          kind: "free_text",
          id: "Q3",
          question: "Ton 1er message envoyé",
          prompt:
            "Choisis 1 personne dans ta liste, écris-lui le message en 3 lignes (Curiosité → Invitation café → Question ouverte). Copie-colle ton message ici (avec son prénom).",
          sponsorCheckHint:
            "Vérifier que le message ne pitche PAS le produit, contient une question ouverte (pas oui/non), propose un format léger (café 15 min). Si c'est un pitch direct, demander de re-écrire en suivant la structure 3 lignes.",
          minChars: 100,
        },
      ],
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // M1.3 — Faire un EBE qui te grandit
  // ⚠️ Refonte 2026-05-03 : ce module ne dédouble plus le pas-à-pas
  // technique du bilan (qui vit dans la Boîte à outils → tk-bilan-01).
  // Il se concentre sur le MINDSET, la posture, et les 4 micro-décisions
  // qui distinguent un bilan moyen d'un bilan signature.
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "M1.3",
    slug: "bilan-pro",
    number: "1.6",
    title: "Faire un EBE qui te grandit",
    description: "Le mindset et les micro-décisions qui distinguent un bilan moyen d'un bilan signature. (Le pas-à-pas technique vit dans la boîte à outils.)",
    durationMin: 8,
    icon: "📊",
    ideeForce:
      "L'app pilote la trame du bilan EBE. Toi, tu portes l'humain. La différence entre un distri médiocre et un distri signature ne tient pas à la maîtrise des 10 étapes (que l'app gère pour toi) — elle tient à 4 micro-décisions invisibles : ta posture avant, ton silence pendant, ta vérité au moment du body scan, et ta phrase de recos.",
    ancrage: "« L'app fait le bilan technique. Toi tu fais l'expérience humaine. »",
    action:
      "Fais ton 1ᵉʳ EBE AVEC ton sponsor cette semaine. Tu observes, tu prends des notes sur les 4 micro-décisions ci-dessous, tu poses des questions après. Le 2ᵉ EBE, tu l'animes toi-même, ton sponsor observe.",
    relatedToolkitSlugs: ["bases-presentiel", "phrases-cles-bilan", "phrase-magique-recos"],
    lessons: [
      {
        id: "M1.3-L1",
        slug: "app-vs-toi",
        title: "L'app pilote la trame, toi tu portes l'humain",
        kind: "text",
        durationMin: 2,
        contentMarkdown: `## La séparation des rôles qui change tout

**Ce que l'app fait** :
- Trame des 10 étapes
- Calculs body scan + cibles
- Recommandations produits
- Génération du récap client (PDF / lien)

**Ce que TU fais** (et que l'app ne fera jamais) :
- Lire le silence quand la personne hésite
- Reformuler son vrai pourquoi
- Choisir le tempo (ralentir au body scan, accélérer au closing)
- Demander les recos sans paraître quémandeur

> 90 % des distri pensent que le bilan c'est *« suivre la trame »*. Faux. La trame, l'app la fait. **Toi, ton vrai job c'est l'expérience.**

📦 **Le déroulé pas-à-pas des 10 étapes vit dans ta Boîte à outils** → outil "Le bilan EBE — 10 étapes pro". Cite-le quand tu te demandes "comment je fais quoi". Ce module-ci ne le redouble pas.`
      },
      {
        id: "M1.3-L2",
        slug: "posture-avant",
        title: "Micro-décision n°1 : ta posture avant l'arrivée",
        kind: "text",
        durationMin: 2,
        contentMarkdown: `## 5 min de prep mentale > 30 min de prep matérielle

La plupart des distri stressent sur le matériel : *« j'ai bien la balance ? le shake ? la fiche ? »*. L'app a déjà la fiche. Tu ne stresses pour rien.

**Ce qui fait vraiment la différence** : 5 min de respiration avant que la personne sonne.

- Posé, pas hyperventilé.
- Présent, pas dans tes 12 derniers messages WhatsApp.
- Disponible, pas en train de penser à ton CA du mois.

**Test simple** : si tu n'es pas capable de t'arrêter 5 min avant, c'est que tu n'es pas prêt à recevoir cette personne. Reporte plutôt que bâcler.`
      },
      {
        id: "M1.3-L3",
        slug: "silence-diagnostic",
        title: "Micro-décision n°2 : ton silence pendant le diagnostic",
        kind: "text",
        durationMin: 2,
        contentMarkdown: `## Le pouvoir du « ... » de 4 secondes

Quand tu poses : *« Qu'est-ce qui se passerait si dans 3 mois rien n'avait changé ? »* — la personne répond souvent un truc surface (« ben ce serait dommage »).

**90 % des distri enchaînent** sur la question suivante. Erreur.

**La bonne pratique** : tu te tais 4 secondes après sa réponse. Tu hoches la tête. Tu attends.

**Ce qui se passe** : 80 % du temps, la personne reprend la parole et dit la VRAIE chose qu'elle pensait pas oser dire. Le vrai pourquoi.

> Le silence est ton outil le plus puissant. L'app ne te le donnera jamais — c'est toi qui le poses.`
      },
      {
        id: "M1.3-L4",
        slug: "vérité-body-scan",
        title: "Micro-décision n°3 : ta vérité au body scan",
        kind: "text",
        durationMin: 1,
        contentMarkdown: `## Le moment WOW se joue à ton ton de voix

Le body scan révèle masse grasse, hydratation, âge métabolique. **L'app affiche les chiffres.** Toi, tu décides comment tu les commentes.

**❌ Le piège** : commenter avec drama (« 32 % de masse grasse ! aïe ! »). La personne se ferme.

**❌ L'autre piège** : commenter avec déni (« c'est pas grave, on va arranger ça »). La personne sent que tu mens.

**✅ La bonne pratique** : ton calme + 1 vraie information.

> *« Tu es à 32 % de masse grasse. La zone saine pour toi se situe entre 22 et 28. On a quelque chose à faire ensemble — pas dramatique, juste à faire. »*

C'est cette voix qui transforme une mesure en prise de conscience. Sans drame. Sans déni. Juste vraie.`
      },
      {
        id: "M1.3-L5",
        slug: "recos-sans-quemandage",
        title: "Micro-décision n°4 : tes recos sans paraître quémandeur",
        kind: "text",
        durationMin: 1,
        contentMarkdown: `## La phrase magique des recos

📦 **Le script complet est dans ta Boîte à outils** → outil "La phrase magique pour 3 recos". Ce module ne le re-cite pas.

**Ici on parle de la POSTURE** au moment où tu la dis :

- Pas en fin de bilan en mode "ah au fait..." (= quémandage)
- Mais juste après le body scan, quand la personne est en bascule émotionnelle
- Sans quitter ses yeux
- Et tu te TAIS après. Pas de "tu en as au moins 1 hein" qui annule la magie.

**Le piège n°1** : la pose. Si tu poses la question avec gêne, la personne sent ton inconfort et te donne 1 nom mou.

**Le piège n°2** : enchaîner. Si après les 3 noms tu dis "ah merci, du coup pour ton programme..." tu casses la séquence émotionnelle.

> Demande les recos pendant le moment de bascule, pas après. C'est une question de **timing**, pas de courage.`
      }
    ],
    quiz: {
      id: "M1.3-quiz",
      passingScore: 3,
      questions: [
        {
          kind: "qcm",
          id: "Q1",
          question: "Pendant l'EBE, qu'est-ce que l'app fait pour toi ?",
          answers: [
            "Rien, tu remplis tout à la main",
            "La trame des 10 étapes + body scan + recos produits",
            "Seulement le body scan",
            "Seulement le récap PDF"
          ],
          correctIndex: 1,
          explanation:
            "L'app pilote la trame complète, calcule le body scan et propose les recommandations produits. Ton job, c'est l'expérience humaine — pas la mécanique. Le pas-à-pas détaillé vit dans la Boîte à outils (tk-bilan-01)."
        },
        {
          kind: "qcm",
          id: "Q2",
          question: "Après une question diagnostique forte (ex : « si rien ne change dans 3 mois ? »), tu fais quoi ?",
          answers: [
            "Tu enchaînes sur la question suivante",
            "Tu te tais 4 secondes et tu attends",
            "Tu reformules pour qu'elle réponde mieux",
            "Tu commentes sa réponse avec empathie"
          ],
          correctIndex: 1,
          explanation:
            "Tu te tais. 80 % du temps, la personne reprend la parole et dit la VRAIE chose qu'elle pensait pas oser dire. Le silence est ton outil le plus puissant — l'app ne te le donnera jamais."
        },
        {
          kind: "qcm",
          id: "Q3",
          question: "Au moment du body scan, ton ton de voix idéal est :",
          answers: [
            "Dramatique pour marquer les esprits",
            "Calme + 1 vraie info, sans drame ni déni",
            "Empathique pour rassurer",
            "Neutre comme une lecture de chiffres"
          ],
          correctIndex: 1,
          explanation:
            "Calme + 1 vraie info. Le drame ferme la personne. Le déni la fait fuir. La vérité posée transforme une mesure en prise de conscience."
        },
        {
          kind: "free_text",
          id: "Q4",
          question: "Ton EBE shadow avec ton sponsor",
          prompt:
            "Tu vas observer ton sponsor faire un EBE cette semaine. Liste en 3 lignes les 3 choses précises que tu vas observer (au-delà de la trame technique) — celles qui font la différence entre un EBE moyen et un EBE signature.",
          sponsorCheckHint:
            "Vérifier que la réponse cible des comportements humains (silence, ton de voix, posture, transition entre étapes, gestion d'objection en live) et PAS la mécanique technique (qui est dans la boîte à outils). Si la réponse parle de trame ou de checklist, demander de re-cibler sur l'humain.",
          minChars: 100
        }
      ]
    }
  },

  // ───────────────────────────────────────────────────────────────────────────
  // M1.D — Présenter et closer mon 1er client (NEW 2026-05-04)
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "M1.D",
    slug: "presenter-closer-premier-client",
    number: "1.7",
    title: "Présenter et closer mon 1er client",
    description: "Le moment où tu transformes un EBE en programme signé. Script copier-coller + suivi J+1 obligatoire.",
    durationMin: 7,
    icon: "🤝",
    ideeForce:
      "À la fin de l'EBE, tu présentes le programme. Pas un catalogue, pas 5 options. Un programme structuré qui répond à CE que tu as entendu pendant le bilan. Le closing n'est pas une technique de vente — c'est une recommandation honnête : « voici ce que je ferais à ta place ». Ensuite, le suivi J+1 obligatoire fait la différence entre 50 % et 80 % de fidélisation.",
    ancrage: "« Tu ne fermes pas une vente. Tu ouvres une transformation. »",
    action:
      "Apprends par cœur la phrase de proposition (Leçon 2). Mets dans ton agenda un rappel J+1 systématique pour chaque bilan que tu fais. Le J+1, c'est l'arme secrète de fidélisation que 90 % des distri oublient.",
    relatedToolkitSlugs: [
      "presentation-programme-script",
      "templates-suivi-jours",
      "objections-reponses",
    ],
    lessons: [
      {
        id: "M1.D-L1",
        slug: "anatomie-presentation",
        title: "Anatomie d'une présentation programme qui marche",
        kind: "text",
        durationMin: 2,
        contentMarkdown: `## La structure en 4 temps (10 min max)

À la fin de l'EBE, tu enchaînes. Pas de transition gênante.

**1. Récap de ce que tu as entendu (1 min)**
- *« Donc si je résume bien : tu veux X, tu as essayé Y, ce qui te bloque c'est Z »*
- La personne acquiesce → tu valides ton diagnostic

**2. Ta recommandation (3 min)**
- *« Ce que je te propose, c'est de tester [pack F1 + PDM + Aloe + Thé] pendant 30 jours »*
- Tu décris simple : 1 shake matin, 1 verre d'aloe, 1 thé l'aprèm
- Tu donnes le **prix net** : *« 234 € pour le starter complet »*
- Pas de salade. Pas de promo. Pas de "spécial pour toi".

**3. Le silence stratégique (30 sec - 1 min)**
- Tu as posé ta proposition. **Tu te tais.**
- 90 % des distri parlent à ce moment-là par malaise → ils tuent leur vente
- Le silence laisse la personne réfléchir et formuler sa réponse

**4. La réponse (3 min)**
- Si oui → tu prends la commande
- Si "je vais réfléchir" → *« Pas de souci. Sur quoi tu veux réfléchir précisément ? »* (objection à creuser, pas à fuir)
- Si non → tu n'insistes pas, tu demandes les recos

> 📦 **Le script complet est dans la Boîte à outils** → outil "Script de présentation programme — version 4 semaines". Apprends-le, adapte ton ton, mais ne change pas la structure.`,
      },
      {
        id: "M1.D-L2",
        slug: "phrase-de-proposition",
        title: "La phrase qui change tout",
        kind: "text",
        durationMin: 2,
        contentMarkdown: `## La phrase de proposition à apprendre par cœur

Une seule phrase, **dite avec ton ton et ta vraie voix** :

> *« Mon rôle n'est pas de te vendre des produits. Mon rôle, c'est que dans 30 jours, tu sois fier·e de toi. Je te propose de tester avec moi pendant 30 jours, et au bout de ces 30 jours, on regarde ensemble. Ça te parle ? »*

**Pourquoi ça marche** :
- *« Mon rôle n'est pas de te vendre »* → casse l'objection préventive "tu veux me vendre"
- *« Que dans 30 jours tu sois fier·e »* → projection émotionnelle vers le résultat
- *« Tester avec moi »* → engagement faible (test, pas achat à vie)
- *« Au bout de 30 jours on regarde »* → pas piégé·e à long terme
- *« Ça te parle ? »* → question ouverte (pas oui/non sec)

**Apprends-la PAR CŒUR**. Tu vas la dire 100 fois cette année. Si tu hésites, tu perds. Si tu la dis avec naturel, tu closingnes 3 sur 5 EBE.`,
      },
      {
        id: "M1.D-L3",
        slug: "suivi-j1-obligatoire",
        title: "Le suivi J+1 obligatoire (l'arme secrète)",
        kind: "text",
        durationMin: 2,
        contentMarkdown: `## Pourquoi 90 % des distri perdent leur client en J+1

Tu as fait un super EBE, présenté le programme, la personne a dit oui, elle est partie avec son pack.

**Ce qui se passe à J+1 dans sa tête** :
- *« J'ai bien fait ? »*
- *« Mon mari va dire quoi ? »*
- *« Le shake a un drôle de goût »*
- *« 234 €, c'est cher quand même »*

→ Si tu ne l'appelles pas dans les **24h**, elle va remettre en question son achat. Au mieux : remboursement à J+3. Au pire : elle ne re-commande jamais.

**Ce que tu fais à J+1 (10 min max)** :
1. Appel ou message vocal *« Salut [prénom], comment tu te sens ce matin ? »*
2. Réponds aux 2-3 questions techniques (mélange, dosage, goût)
3. Rappelle le rendez-vous J+7 *« On se voit dimanche pour faire un point ? »*
4. **Termine par un encouragement** *« Tu vas voir, J+3 c'est un cap, après ça roule tout seul »*

**Résultats observés** :
- Sans J+1 : 50 % des clients abandonnent à J+7
- Avec J+1 : **80 %** des clients tiennent à J+30 et re-commandent

> 📦 **Les 5 templates J+1 / J+3 / J+7 / J+14 / J+30 sont dans ta Boîte à outils** → outil "Templates de suivi". Bloque-toi 10 min par jour pour les envoyer systématiquement.`,
      },
    ],
    quiz: {
      id: "M1.D-quiz",
      passingScore: 2,
      questions: [
        {
          kind: "qcm",
          id: "Q1",
          question: "Après ta proposition de programme, qu'est-ce que tu fais en premier ?",
          answers: [
            "Tu enchaînes sur les bénéfices",
            "Tu te tais et tu attends",
            "Tu donnes une promo si elle hésite",
            "Tu rappelles le prix",
          ],
          correctIndex: 1,
          explanation:
            "Le silence. Tu as posé. Tu attends. La personne a besoin de temps pour formuler sa réponse. Si tu parles, tu tues ton closing. Le silence stratégique = ton meilleur outil.",
        },
        {
          kind: "qcm",
          id: "Q2",
          question: "Pourquoi le suivi J+1 est-il obligatoire ?",
          answers: [
            "C'est la politique Herbalife",
            "Pour faire de l'upsell",
            "Parce que sans J+1, 50 % des clients abandonnent à J+7",
            "Pour faire de la pression à re-commander",
          ],
          correctIndex: 2,
          explanation:
            "50 % d'abandon en J+7 sans suivi vs 20 % avec J+1. La nuit qui suit l'achat, le client doute. Ton coup de fil rassure et installe le rendez-vous J+7. Sans ça, ton EBE = perdu.",
        },
        {
          kind: "free_text",
          id: "Q3",
          question: "Ta phrase de proposition adaptée à ton ton",
          prompt:
            "Réécris la phrase de proposition (« Mon rôle n'est pas de te vendre… ») dans TON ton, ta vraie voix. Ce que tu dirais réellement, pas un script robotique.",
          sponsorCheckHint:
            "Vérifier que la phrase contient les 4 ingrédients : (a) ce n'est pas vendre, (b) projection 30j positive, (c) tester avec toi (engagement faible), (d) question ouverte. Si trop commercial ou si manque l'engagement faible, demander à reformuler.",
          minChars: 100,
        },
      ],
    },
  },

];

// =============================================================================
// NIVEAU 2 — CONSTRUIRE (4 modules · 500 → 4 000 PV / Supervisor)
// =============================================================================

export const N2_MODULES: FormationModule[] = [
  // ───────────────────────────────────────────────────────────────────────────
  // M2.1 — Le tunnel marketing en 7 étapes
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "M2.1",
    slug: "tunnel-marketing-7-etapes",
    number: "2.1",
    title: "Le tunnel marketing en 7 étapes",
    description: "De la rencontre froide au client qui te recommande. Le rail mental qui structure ton activité.",
    durationMin: 9,
    icon: "🎯",
    ideeForce:
      "Trop de distri courent partout sans méthode. Le tunnel en 7 étapes te donne le rail. Chaque étape a un objectif unique, une règle d'or, et un critère de passage à la suivante. Une fois ce mental map intégré, tu sais TOUJOURS où tu en es avec un prospect ou un client.",
    ancrage: "« Pas d'étape, pas de business. Avec le tunnel, tu sais toujours où tu en es. »",
    action:
      "Imprime le schéma du tunnel et affiche-le dans ton espace de travail. Pour chaque prospect/client en cours, marque l'étape où il est aujourd'hui. Tu vas voir : tu pilotes mieux instantanément.",
    relatedToolkitSlugs: ["scripts-invitation", "hooks-reseaux-sociaux", "reveiller-contact-froid"],
    lessons: [
      {
        id: "M2.1-L1",
        slug: "etapes-1-2",
        title: "Étape 1-2 : Prospection + Qualification",
        kind: "text",
        durationMin: 2,
        contentMarkdown: `## Étape 1 — Prospection (ouvrir la porte)

**Objectif** : susciter de la curiosité, pas vendre.
**Règle d'or** : 1 contact = 1 ouverture, jamais un pitch.
**Critère de passage** : la personne dit « raconte-moi plus ».

## Étape 2 — Qualification (trouver le vrai besoin)

**Objectif** : comprendre si la personne a un besoin et un budget.
**Règle d'or** : poser des questions ouvertes, jamais de pitch.
**Critère de passage** : tu as identifié SON pourquoi (santé / forme / business).`
      },
      {
        id: "M2.1-L2",
        slug: "etapes-3-4",
        title: "Étape 3-4 : Bilan + Programme",
        kind: "text",
        durationMin: 2,
        contentMarkdown: `## Étape 3 — Bilan (la transformation commence)

**Objectif** : devenir crédible et engager émotionnellement.
**Règle d'or** : 60 min, body scan, posture pro.
**Critère de passage** : la personne te demande « du coup, qu'est-ce que je fais ? ».

## Étape 4 — Programme (la solution sur mesure)

**Objectif** : proposer une solution précise et limitée (3 produits max, 1 mois).
**Règle d'or** : tu vends UNE transformation, pas un catalogue.
**Critère de passage** : la personne signe le programme.`
      },
      {
        id: "M2.1-L3",
        slug: "etapes-5-6",
        title: "Étape 5-6 : Démarrage + Suivi",
        kind: "text",
        durationMin: 3,
        contentMarkdown: `## Étape 5 — Démarrage (les 7 premiers jours)

**Objectif** : maximiser les chances que la personne aille au bout.
**Règle d'or** : suivi J+1, J+3, J+7 systématique.
**Critère de passage** : la personne a tenu 7 jours et perdu un peu.

## Étape 6 — Suivi (le coaching qui fait la différence)

**Objectif** : amener la personne au résultat sur 30/60/90 jours.
**Règle d'or** : appels structurés, jamais « ça va ? ».
**Critère de passage** : le client a atteint son objectif.

> C'est l'étape la plus négligée par les débutants — et la plus rentable.`
      },
      {
        id: "M2.1-L4",
        slug: "etape-7",
        title: "Étape 7 : Fidélisation et recos",
        kind: "text",
        durationMin: 2,
        contentMarkdown: `## Étape 7 — Le moteur perpétuel

**Objectif** : transformer 1 client en 3-5 nouveaux contacts.

**Règle d'or** : demander systématiquement les recos dès J+14.

**Critère de passage** : 3 noms récupérés + 1 reco activée.

> Sans étape 7, ton activité s'épuise. Avec elle, elle se régénère toute seule.`
      }
    ],
    quiz: {
      id: "M2.1-quiz",
      passingScore: 3,
      questions: [
        {
          kind: "qcm",
          id: "Q1",
          question: "Combien d'étapes dans le tunnel marketing Lor'Squad ?",
          answers: ["5", "7", "10", "12"],
          correctIndex: 1,
          explanation:
            "7 étapes : Prospection, Qualification, Bilan, Programme, Démarrage, Suivi, Fidélisation. Chaque étape a un objectif unique et un critère de passage."
        },
        {
          kind: "qcm",
          id: "Q2",
          question: "Quelle étape est la plus négligée par les débutants et la plus rentable ?",
          answers: [
            "Prospection",
            "Bilan",
            "Suivi (étape 6)",
            "Closing"
          ],
          correctIndex: 2,
          explanation:
            "Le suivi (étape 6). Les débutants pensent que vendre = closer. En réalité, c'est le suivi qui crée le résultat client, donc les recos, donc le revenu durable."
        },
        {
          kind: "qcm",
          id: "Q3",
          question: "Le programme proposé contient combien de produits maximum ?",
          answers: ["1", "3", "5", "Variable selon le besoin"],
          correctIndex: 1,
          explanation:
            "3 produits maximum. Tu vends UNE transformation, pas un catalogue. Plus tu en proposes, moins le client en achète vraiment."
        },
        {
          kind: "free_text",
          id: "Q4",
          question: "Carto de tes 5 derniers prospects",
          prompt:
            "Cartographie tes 5 derniers prospects/clients sur ce tunnel. À quelle étape les as-tu « perdus » ? Identifie l'étape où tu casses le plus.",
          sponsorCheckHint:
            "Vérifier que la réponse identifie un pattern récurrent (ex. « je perds toujours à l'étape 5 démarrage »), pas une réponse vague. Si pas de pattern, pousser à mieux observer.",
          minChars: 100
        }
      ]
    }
  },

  // ───────────────────────────────────────────────────────────────────────────
  // M2.2 — Mon plan d'action quotidien (DMO 5-3-1)
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "M2.2",
    slug: "plan-action-quotidien-dmo",
    number: "2.2",
    title: "Mon plan d'action quotidien",
    description: "Le DMO 5-3-1 : ta formule mécanique pour progresser vers les rangs supérieurs.",
    durationMin: 8,
    icon: "📅",
    ideeForce:
      "Un distri qui n'a pas de DMO (Daily Method of Operation = méthode quotidienne d'opération) compte sur la chance et l'inspiration. Un distri qui en a un construit un système. La méthode 5-3-1 est ta formule chimique : suivie 12 mois, elle t'amène progressivement vers les rangs supérieurs.",
    ancrage: "« Pas de DMO = tu travailles dur. Avec un DMO = tu travailles juste. »",
    action:
      "Bloque DEMAIN MATIN ton premier créneau prime time IPA (même 30 min). Ouvre ton agenda. Mets un événement récurrent. Pas négociable. 5 jours sur 5, même quand tu n'en as pas envie.",
    relatedToolkitSlugs: ["dmo-checklist-quotidienne", "calculateur-strategy-plan"],
    lessons: [
      {
        id: "M2.2-L1",
        slug: "formule-531",
        title: "La formule 5-3-1 décodée",
        kind: "text",
        durationMin: 2,
        contentMarkdown: `## Le système chimique

**5 nouveaux clients** dans le mois
**+ 3 récurrents** (ils re-commandent)
**+ 1 nouveau coach** recruté

Répété **12 mois**.

**Résultat mathématique** :
- ~60 nouveaux clients/an
- Ton équipe de coachs grandit progressivement
- Tu deviens **Sup au mois 5-7**
- Tu vises **GET / Millionaire** sur ton 2ᵉ exercice

Pas magie, mathématique. Plus accessible que le 8-4-1, plus durable dans le temps.`
      },
      {
        id: "M2.2-L2",
        slug: "cinq-ipa",
        title: "Les 5 actions IPA quotidiennes",
        kind: "text",
        durationMin: 2,
        contentMarkdown: `## IPA = Income Producing Activities

Les **5 non-négociables** (cf module Pilotage P2) :

1. **5 invitations qualitatives**
2. **2 follow-ups**
3. **1 nouveau contact ajouté**
4. **1 vocal personnel équipe**
5. **1 contenu posté**

> Hors IPA = pas du business, c'est du décor.

Tu peux passer 8h sur ton ordi à « bosser » — si tu n'as pas fait tes 5 IPA, tu n'as rien fait.`
      },
      {
        id: "M2.2-L3",
        slug: "agenda-pro",
        title: "Bloquer son agenda comme un pro",
        kind: "text",
        durationMin: 2,
        contentMarkdown: `## Le DMO ne tient que si tu lui donnes des créneaux fixes

- **Prime time IPA** : 7h30-8h30 ou 19h-20h (les gens sont disponibles)
- **Bilans** : mardi/jeudi soir 18h-21h
- **1:1 équipe** : mercredi soir
- **Dimanche soir** : 30 min de planification semaine

Ces créneaux sont **dans ton agenda** avant le début de ta semaine. Pas négociable.`
      },
      {
        id: "M2.2-L4",
        slug: "mesurer",
        title: "Mesurer pour s'améliorer",
        kind: "text",
        durationMin: 2,
        contentMarkdown: `## Les 3 KPI hebdo à tracker

1. **Nombre d'invitations envoyées**
2. **Nombre de bilans réalisés**
3. **Nombre de closings**

Si ces chiffres ne montent pas, ton revenu ne monte pas.

**Tracking** : dans ton agenda + revue chaque dimanche soir.

> Ce qui n'est pas mesuré n'existe pas.`
      }
    ],
    quiz: {
      id: "M2.2-quiz",
      passingScore: 3,
      questions: [
        {
          kind: "qcm",
          id: "Q1",
          question: "Que signifie IPA dans le DMO ?",
          answers: [
            "International Professional Activity",
            "Income Producing Activities",
            "Internal Process Automation",
            "Indian Pale Ale"
          ],
          correctIndex: 1,
          explanation:
            "Income Producing Activities — les actions qui génèrent directement du revenu. Hors IPA, tu fais du décor, pas du business."
        },
        {
          kind: "qcm",
          id: "Q2",
          question: "Combien d'invitations qualitatives par jour minimum dans le DMO ?",
          answers: ["3", "5", "10", "Autant que possible"],
          correctIndex: 1,
          explanation:
            "5 invitations qualitatives par jour. C'est le seuil minimum pour générer assez de bilans, donc assez de clients, pour atteindre 5-3-1."
        },
        {
          kind: "qcm",
          id: "Q3",
          question: "La formule 5-3-1 répétée 12 mois t'amène en moyenne à :",
          answers: [
            "Senior Consultant",
            "Supervisor",
            "GET Team",
            "World Team"
          ],
          correctIndex: 2,
          explanation:
            "GET Team. C'est mathématique — ~60 nouveaux clients/an + 12 nouveaux coachs/an + duplication = palier GET vise sur 12-18 mois. Le 5-3-1 prend plus de temps que le 8-4-1 mais reste tenable."
        },
        {
          kind: "free_text",
          id: "Q4",
          question: "Ton créneau prime time",
          prompt:
            "Décris ton créneau prime time idéal (jour/heure) pour faire tes 5 invitations quotidiennes. Sois précis : à quelle heure tu commences, combien de temps, dans quelles conditions (silence, café, position) ?",
          sponsorCheckHint:
            "Vérifier que la réponse contient un créneau précis avec horaire, pas un « le matin tôt » vague. Le distri doit pouvoir BLOQUER ce créneau dès demain dans son agenda.",
          minChars: 80
        }
      ]
    }
  },

  // ───────────────────────────────────────────────────────────────────────────
  // M2.3 — Le réflexe SI / ALORS
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "M2.3",
    slug: "reflexe-si-alors",
    number: "2.3",
    title: "Le réflexe SI / ALORS",
    description: "Anticipe les objections — et tu ne les craindras plus jamais.",
    durationMin: 7,
    icon: "🛡️",
    ideeForce:
      "Le secret d'un closing efficace n'est pas le talent — c'est l'anticipation. Si tu sais à l'avance les objections que tu vas entendre, tu réponds en confiance. Le réflexe SI/ALORS = tes scripts mentaux pré-câblés. SI le prospect dit X, ALORS tu réponds Y.",
    ancrage: "« Une objection prévue n'est plus une objection. C'est juste une étape. »",
    action:
      "Écris TES 7 réponses-types aux 7 objections. Apprends-les par cœur cette semaine. Teste-les en role-play avec ton sponsor avant de les utiliser en réel. Range-les dans ton dossier « Scripts ».",
    relatedToolkitSlugs: ["objections-reponses"],
    lessons: [
      {
        id: "M2.3-L1",
        slug: "sept-objections",
        title: "Les 7 objections les plus fréquentes",
        kind: "text",
        durationMin: 2,
        contentMarkdown: `## Les 7 que tu vas entendre 1000 fois

1. **C'est cher.**
2. **J'ai pas le temps.**
3. **Je dois en parler à mon conjoint.**
4. **J'ai déjà essayé un truc comme ça.**
5. **C'est de la vente pyramidale ?**
6. **Je connais déjà quelqu'un qui en fait.**
7. **Je vais réfléchir.**

**Mémorise les 7.** Tu vas les entendre des centaines de fois dans ta carrière.`
      },
      {
        id: "M2.3-L2",
        slug: "ta-reponse",
        title: "Pour chaque objection, ta réponse en 1 phrase",
        kind: "text",
        durationMin: 2,
        contentMarkdown: `## Le ALORS — exemple concret

**Objection** : « C'est cher »

**ALORS** :
> *« Le prix divisé par 30 jours ça fait 5 €/jour — c'est moins qu'un café et une viennoiserie. La vraie question : est-ce que ta santé vaut un café par jour ? »*

**Méthode** :
1. Écris tes 7 ALORS
2. Apprends-les par cœur
3. Répète-les en role-play

> Sans préparation, tu improvises. Avec préparation, tu réponds en réflexe.`
      },
      {
        id: "M2.3-L3",
        slug: "sentir-senti-trouve",
        title: "La méthode « Sentir / Senti / Trouvé »",
        kind: "text",
        durationMin: 2,
        contentMarkdown: `## Un classique qui marche dans 80% des cas

**Phase 1 — Sentir (empathie)**
> *« Je SENS comment tu te SENS »*

**Phase 2 — Senti (normalisation)**
> *« D'autres ont SENTI la même chose au départ »*

**Phase 3 — Trouvé (preuve)**
> *« Et ils ont TROUVÉ que [bénéfice concret] »*

**Pourquoi ça marche** : tu désamorces sans te disputer. Tu valides l'émotion avant de proposer la solution.`
      },
      {
        id: "M2.3-L4",
        slug: "role-play",
        title: "Pratiquer en role-play avec ton sponsor",
        kind: "text",
        durationMin: 1,
        contentMarkdown: `## La différence entre savoir et faire

**Savoir** ≠ **Faire**.

Bloque **30 min/semaine** avec ton sponsor pour faire des role-plays d'objections. Lui te balance les objections, tu réponds à chaud.

**Au bout de 4 semaines**, tu réponds en réflexe. C'est ça l'objectif : pas réfléchir, **réagir juste**.`
      }
    ],
    quiz: {
      id: "M2.3-quiz",
      passingScore: 3,
      questions: [
        {
          kind: "qcm",
          id: "Q1",
          question: "Ton meilleur outil contre les objections, c'est :",
          answers: [
            "Improvisation et tchatche",
            "Préparation anticipée",
            "Charme naturel",
            "Baisser le prix"
          ],
          correctIndex: 1,
          explanation:
            "La préparation anticipée. Le talent compte 20%, la méthode 80%. Avec 7 réponses pré-câblées, tu réponds en confiance."
        },
        {
          kind: "qcm",
          id: "Q2",
          question: "Combien d'objections types dois-tu absolument maîtriser ?",
          answers: ["3", "7", "20", "Toutes celles que tu peux imaginer"],
          correctIndex: 1,
          explanation:
            "7 — celles qui couvrent 95% des cas. Au-delà tu te perds. Maîtrise les 7, le reste se gère par variation des mêmes principes."
        },
        {
          kind: "qcm",
          id: "Q3",
          question: "La méthode « Sentir / Senti / Trouvé » sert à :",
          answers: [
            "Vendre plus vite",
            "Empathiser puis convaincre sans confrontation",
            "Pousser la personne à acheter",
            "Rappeler les caractéristiques produit"
          ],
          correctIndex: 1,
          explanation:
            "Empathiser puis convaincre sans confrontation. Tu valides l'émotion (Sentir), tu normalises (Senti), tu prouves (Trouvé). Pas de bagarre."
        },
        {
          kind: "free_text",
          id: "Q4",
          question: "Ta réponse à « Mon mari va dire non »",
          prompt:
            "Le prospect te dit « Mon mari va dire non ». Écris ta réponse complète avec la méthode SI/ALORS (3-4 lignes max).",
          sponsorCheckHint:
            "Vérifier que la réponse ne dévalorise pas le mari, ne saute pas l'étape empathie, et propose une option concrète (inclure le mari dans le bilan, faire un essai 14 jours, montrer témoignage couple). Si la réponse est dismissive ou agressive, demander à reformuler.",
          minChars: 100
        }
      ]
    }
  },

  // ───────────────────────────────────────────────────────────────────────────
  // M2.4 — Inviter à l'Apéro Healthy et au Quick Start
  // ⚠️ Refonte 2026-05-03 : EBE n'est plus utilisé pour un événement
  //    groupe (cf. lexique en haut du fichier). Le "EBE" historique
  //    est devenu "Apéro Healthy".
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "M2.4",
    slug: "inviter-ebe-quickstart",
    number: "2.4",
    title: "Inviter à l'Apéro Healthy et au Quick Start",
    description: "Tes événements sont tes amplificateurs — sache les utiliser.",
    durationMin: 8,
    icon: "📣",
    ideeForce:
      "Tes événements (Apéro Healthy, HOM, Quick Start) sont tes amplificateurs. Un prospect en présence d'autres distri qui réussissent, c'est 10x plus efficace que ton meilleur pitch en bilan EBE solo. La preuve sociale fait le boulot que ton talk ne peut pas faire seul.",
    ancrage: "« Tu ne vends pas l'apéro. Tu vends l'expérience d'y être. »",
    action:
      "Invite 3 personnes au prochain apéro healthy de l'équipe cette semaine. Confirme-les la veille. Note le taux de présence réel. Compare à ce que tu pensais.",
    relatedToolkitSlugs: ["scripts-invitation"],
    lessons: [
      {
        id: "M2.4-L1",
        slug: "ebe-vs-qs-vs-hom",
        title: "Apéro Healthy vs HOM vs Quick Start",
        kind: "text",
        durationMin: 2,
        contentMarkdown: `## 3 events, 3 publics, 3 objectifs

⚠️ **À ne pas confondre avec l'EBE** (Évaluation Bien-Être = ton bilan client 1-1 ~60 min, piloté par l'app). Ici on parle d'événements de **groupe**.

**Apéro Healthy** (soirée business mensuelle)
- Public : **PROSPECTS business + équipe**
- Format : soirée ~25-50 personnes
- Objectif : présenter l'opportunité économique en preuve sociale

**HOM (House Opportunity Meeting)**
- Public : **PROSPECTS tièdes**
- Format : mini-soirée chez quelqu'un, 8-15 personnes
- Objectif : intime, conversion personnelle

**Quick Start**
- Public : **DISTRI débutants**
- Format : formation 1h-2h
- Objectif : transmettre les compétences de démarrage

> Ne les confonds pas. Chaque event a son rôle. Et **aucun** d'eux n'est un EBE — l'EBE c'est ton bilan client 1-1.`
      },
      {
        id: "M2.4-L2",
        slug: "regle-or",
        title: "La règle d'or : inviter sans pré-pitcher",
        kind: "text",
        durationMin: 2,
        contentMarkdown: `## L'erreur débutante n°1

Raconter le programme avant l'invit'.

**Résultat** : la personne se forge une opinion AVANT et soit refuse, soit vient avec des idées préconçues.

**La bonne approche** :
1. Créer la curiosité (« j'ai découvert un truc qui pourrait t'intéresser »)
2. Inviter (« on en parle ce mardi soir avec des gens cool »)
3. **Point.**

Ils découvrent **en live**. C'est la magie de l'event.`
      },
      {
        id: "M2.4-L3",
        slug: "trois-phrases",
        title: "Les 3 phrases d'invitation qui marchent",
        kind: "text",
        durationMin: 2,
        contentMarkdown: `## Choisis la tienne et apprends-la par cœur

**1. La directe**
> *« J'ai un truc à te montrer, c'est mardi soir à 19h, t'es libre ? »*

**2. La privilège**
> *« Je participe à un event business mardi, j'ai 2 invits, je t'en réserve une ? »*

**3. La consultation** (la plus puissante)
> *« Je voudrais ton avis sur quelque chose, t'as 1h mardi soir ? »*

**Le mot magique : « ton avis ».** Personne ne refuse de donner son avis.`
      },
      {
        id: "M2.4-L4",
        slug: "confirmer-veille",
        title: "Confirmer la veille (sinon 50% no-show)",
        kind: "text",
        durationMin: 2,
        contentMarkdown: `## La règle qui change tout

Même quand la personne dit oui, **elle oublie**.

**La veille à 18h**, message simple :
> *« Hey, juste pour confirmer demain 19h, je compte sur toi. Je t'envoie le pin localisation. »*

**Si tu sautes ça** : taux de présence ~50%.
**Avec confirmation** : ~85%.

> 30 secondes le soir = 35% de taux de présence en plus. Le ROI le plus simple de ta carrière.`
      }
    ],
    quiz: {
      id: "M2.4-quiz",
      passingScore: 3,
      questions: [
        {
          kind: "qcm",
          id: "Q1",
          question: "EBE signifie (lexique Lor'Squad) :",
          answers: [
            "Évaluation Bien-Être (bilan client 1-1)",
            "Extra Business Event (soirée business)",
            "Express Bilan Express",
            "Energy Boost Event"
          ],
          correctIndex: 0,
          explanation:
            "Évaluation Bien-Être : ton bilan client 1-1 ~60 min piloté par l'app. C'est la scène signature du distri. Pour les soirées business groupe, on parle d'**Apéro Healthy** (25-50 pers) ou de **HOM** (8-15 pers chez quelqu'un)."
        },
        {
          kind: "qcm",
          id: "Q2",
          question: "Faut-il pré-pitcher avant d'inviter à un apéro healthy ?",
          answers: [
            "Oui, pour préparer le terrain",
            "Non, juste créer la curiosité",
            "Seulement les bénéfices produit",
            "Seulement le côté financier"
          ],
          correctIndex: 1,
          explanation:
            "Non, jamais pré-pitcher. Crée la curiosité, point. La personne découvre en live — c'est la magie de l'event qui fait le boulot."
        },
        {
          kind: "qcm",
          id: "Q3",
          question: "Le no-show diminue de combien si tu confirmes la veille ?",
          answers: [
            "10%",
            "25%",
            "≈35% (passer de ~50% no-show à ~15%)",
            "90%"
          ],
          correctIndex: 2,
          explanation:
            "≈35% de taux de présence en plus. 30 secondes de message la veille = le ROI le plus simple de ta carrière. Ne saute jamais cette étape."
        },
        {
          kind: "free_text",
          id: "Q4",
          question: "Ta phrase d'invitation EXACTE",
          prompt:
            "Écris ta phrase d'invitation EXACTE pour un prospect tiède (quelqu'un que tu connais peu mais avec qui tu es en bons termes). Pas une copie des phrases du module — ta version à toi.",
          sponsorCheckHint:
            "Vérifier que la phrase contient (a) une accroche curiosité sans pitch, (b) un cadre temps précis (jour + heure), (c) une option « ferme » (mardi OU jeudi). Si elle pitche le produit, demander de retirer.",
          minChars: 60
        }
      ]
    }
  }
];

// =============================================================================
// NIVEAU 3 — DUPLIQUER (4 modules · Leader & royalties)
// =============================================================================

export const N3_MODULES: FormationModule[] = [
  // ───────────────────────────────────────────────────────────────────────────
  // M3.1 — Mon rôle de leader
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "M3.1",
    slug: "role-leader",
    number: "3.1",
    title: "Mon rôle de leader",
    description: "Le passage du faiseur au bâtisseur — ce qui change vraiment quand tu deviens Sup.",
    durationMin: 9,
    icon: "👑",
    ideeForce:
      "Tu es passé Supervisor : félicitations. Maintenant tout change. Tu n'es plus payé pour faire — tu es payé pour FAIRE FAIRE. 90% des Sup restent bloqués à ce niveau parce qu'ils continuent à courir partout en mode distri. Le leader bascule sa journée : moins de bilans, plus de coaching ; moins de « je », plus de « nous ».",
    ancrage: "« Un Sup épuisé est juste un distri qui en fait trop. Un Leader reposé est un Sup qui a appris à déléguer. »",
    action:
      "Ce dimanche soir, écris dans ton agenda les 7 prochains jours en mode Leader : 30% temps client perso bloqué, 70% temps coaching/event/recrutement. Si tu n'as PAS encore d'équipe, bloque les créneaux quand même — ça te force à recruter pour les remplir.",
    relatedToolkitSlugs: ["templates-suivi-jours", "reveiller-client-pause", "visio-a-3-protocole"],
    lessons: [
      {
        id: "M3.1-L1",
        slug: "glissement-mental",
        title: "Le glissement mental Sup → Leader",
        kind: "text",
        durationMin: 2,
        contentMarkdown: `## Le KPI qui change tout

**Distri** : tu produis du chiffre.
**Leader** : tu produis des distri qui produisent du chiffre.

| Avant | Après |
|---|---|
| « Combien j'ai vendu ce mois » | « Combien j'ai dupliqué » |
| 100% production directe | 30% production / 70% construction d'équipe |

Tu ne peux pas être leader si tu refuses de lâcher la production directe. **Garde 30% de ton temps en client perso** (sinon tu perds le terrain), **70% en construction d'équipe**.`
      },
      {
        id: "M3.1-L2",
        slug: "quatre-casquettes",
        title: "Les 4 casquettes du leader",
        kind: "text",
        durationMin: 2,
        contentMarkdown: `## 4 rôles à porter en parallèle

**1. Recruteur** — tu identifies et invites les bons profils (méthode P5 Pilotage).

**2. Coach** — tu accompagnes tes distri à 1:1 hebdo (jamais sauter).

**3. Animateur** — tu crées la dynamique d'équipe (events, calls, célébrations).

**4. Modèle** — ton équipe te regarde. Si tu pleures, ils pleurent. Si tu carbures, ils carburent.

> Tu n'as plus le droit d'être en mode bof. Ton énergie est contagieuse — dans les deux sens.`
      },
      {
        id: "M3.1-L3",
        slug: "piege-meme",
        title: "Le piège du « je le ferai mieux moi-même »",
        kind: "text",
        durationMin: 2,
        contentMarkdown: `## La phrase qui plafonne tous les Sup

> *« Si je veux que ce soit bien fait, je dois le faire moi-même. »*

**C'est faux.**

Une équipe à **80% qui tourne** vaut 1000x plus qu'un leader à **100% qui s'épuise**.

Accepte que tes distri fassent moins bien que toi au début. **C'est leur droit.**

Ton rôle : les amener à 80% en 90 jours, pas exiger 100% au jour 1.`
      },
      {
        id: "M3.1-L4",
        slug: "rythme-leader",
        title: "Le rythme du leader",
        kind: "text",
        durationMin: 2,
        contentMarkdown: `## La semaine type

| Jour | Activité |
|---|---|
| **Lundi** | Revue chiffres équipe |
| **Mardi** | 1:1 distri prioritaires |
| **Mercredi** | Apéro Healthy / HOM |
| **Jeudi** | 1:1 distri suite |
| **Vendredi** | Prospection perso |
| **Samedi** | Coaching collectif équipe |
| **Dimanche** | Planification semaine |

> Le leader a un agenda en béton — c'est ce qui rassure son équipe et fait tourner la machine.`
      },
      {
        id: "M3.1-L5",
        slug: "phrase-leader",
        title: "La phrase qui sépare un Sup d'un Leader",
        kind: "text",
        durationMin: 1,
        contentMarkdown: `## La question dominicale

**Le Sup** se demande : *« Comment je fais plus ? »*

**Le Leader** se demande : *« Qui je dois faire grandir cette semaine ? »*

Pose-toi cette question chaque dimanche soir. Identifie 1 personne. Donne-lui 80% de ton attention coaching cette semaine. La semaine suivante, pareil avec une autre.

> C'est comme ça qu'on fait éclore des Supervisors.`
      }
    ],
    quiz: {
      id: "M3.1-quiz",
      passingScore: 3,
      questions: [
        {
          kind: "qcm",
          id: "Q1",
          question: "Le KPI principal du Leader (vs Distri) c'est :",
          answers: [
            "Le chiffre d'affaires perso",
            "Le nombre de distri qu'il a fait grandir",
            "Le nombre de bilans réalisés",
            "Le nombre d'apéros healthy animés"
          ],
          correctIndex: 1,
          explanation:
            "Le nombre de distri qu'il a fait grandir. Tu n'es pas un super-vendeur, tu es un constructeur d'humains. C'est ça qui crée les royalties durables."
        },
        {
          kind: "qcm",
          id: "Q2",
          question: "Combien de % de ton temps doit rester en client perso quand tu deviens Leader ?",
          answers: ["0%", "~30%", "50%", "80%"],
          correctIndex: 1,
          explanation:
            "~30%. Si tu lâches complètement le terrain, tu perds le contact avec la réalité produit + tu donnes un mauvais exemple. 70% construction d'équipe / 30% production."
        },
        {
          kind: "qcm",
          id: "Q3",
          question: "Quelles sont les 4 casquettes du leader ?",
          answers: [
            "Vendeur, Recruteur, Formateur, Comptable",
            "Recruteur, Coach, Animateur, Modèle",
            "Producteur, Manager, Vendeur, Modèle",
            "Sponsor, Coach, Vendeur, Recruteur"
          ],
          correctIndex: 1,
          explanation:
            "Recruteur, Coach, Animateur, Modèle. Les 4 rôles à porter en parallèle pour faire grandir une équipe Lor'Squad."
        },
        {
          kind: "free_text",
          id: "Q4",
          question: "La personne à faire grandir",
          prompt:
            "Identifie 1 personne dans ton équipe (ou dans ta liste de prospects business) que tu vas faire grandir en priorité ces 30 prochains jours. Pourquoi elle ? Qu'est-ce qu'elle a besoin de toi concrètement ?",
          sponsorCheckHint:
            "Vérifier que la personne est nommée précisément, que le « pourquoi elle » est argumenté (pas juste « elle est sympa »), et que les besoins identifiés sont actionnables (mentorat, formation, présence event...).",
          minChars: 100
        }
      ]
    }
  },

  // ───────────────────────────────────────────────────────────────────────────
  // M3.2 — Coacher mes distri
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "M3.2",
    slug: "coacher-mes-distri",
    number: "3.2",
    title: "Coacher mes distri",
    description: "Le 1:1 hebdo qui transforme un débutant en Sup en 6 mois.",
    durationMin: 9,
    icon: "🎙️",
    ideeForce:
      "80% des distri abandonnent dans les 90 premiers jours. La cause n°1 n'est pas l'argent ni la difficulté — c'est le manque de connexion humaine avec leur sponsor. Le 1:1 hebdo est ton arme principale anti-abandon. C'est aussi l'arme qui fait grimper tes plus motivés.",
    ancrage: "« Un distri qui se sent vu ne lâche pas. Un distri qui se sent géré, oui. »",
    action:
      "Cette semaine, ajoute dans tous tes 1:1 distri une question du « réservoir » (Leçon 3). Observe ce que ça change. Tu vas voir : la conversation prend une autre profondeur, et la confiance grimpe d'un cran.",
    relatedToolkitSlugs: ["dmo-checklist-quotidienne", "visio-a-3-protocole"],
    lessons: [
      {
        id: "M3.2-L1",
        slug: "format-intangible",
        title: "Le format intangible du 1:1",
        kind: "text",
        durationMin: 2,
        contentMarkdown: `## Le rituel sacré

- **30 minutes max**
- **Même jour, même heure**, chaque semaine
- **En vidéo** si possible
- Dans l'**agenda Lor'Squad** du distri ET du sponsor
- **Jamais annulé**

> Si tu ne peux pas, tu reportes — tu n'annules pas.

Ce rituel est sacré : c'est lui qui dit *« tu comptes pour moi »* sans avoir à le dire.`
      },
      {
        id: "M3.2-L2",
        slug: "structure-5105",
        title: "La structure 5/10/10/5",
        kind: "text",
        durationMin: 2,
        contentMarkdown: `## 30 min, 4 phases

**5 min** — Connexion humaine
> *« Comment tu vas, vraiment ? »*

**10 min** — Revue semaine passée
- Chiffres
- Victoires
- Blocages

**10 min** — Projection semaine à venir
- Cible
- Priorités
- Où il a besoin de toi

**5 min** — Ancrage
- De quoi il est fier
- Ce qu'il a appris

Cette structure t'évite le bavardage et la séance de plaintes.`
      },
      {
        id: "M3.2-L3",
        slug: "questions-puissantes",
        title: "Les questions puissantes à avoir en réserve",
        kind: "text",
        durationMin: 2,
        contentMarkdown: `## Le tiroir secret

À sortir quand le 1:1 reste en surface :

- *« Qu'est-ce que tu n'oses pas me dire ? »*
- *« Si tu devais arrêter Herbalife demain, qu'est-ce qui te ferait revenir ? »*
- *« Quel a été ton meilleur moment cette semaine ? »*
- *« Qui dans ton entourage te freine sans que tu t'en rendes compte ? »*
- *« De quoi tu as honte ? »*

Ces questions cassent la surface et amènent les **vraies** conversations.`
      },
      {
        id: "M3.2-L4",
        slug: "trois-erreurs",
        title: "Les 3 erreurs du coach débutant",
        kind: "text",
        durationMin: 2,
        contentMarkdown: `## Les pièges classiques

**1. Trop parler**
Si tu parles plus de **30% du temps**, tu coaches mal. Tu fais un cours, pas un coaching.

**2. Donner les solutions**
Ton job n'est pas de résoudre, c'est de **poser les bonnes questions** pour qu'IL trouve.

**3. Sauter le 1:1 quand tout va bien**
Le 1:1 n'est pas un service après-vente. C'est une **routine de croissance**. Même si la personne carbure, tu maintiens.`
      },
      {
        id: "M3.2-L5",
        slug: "distri-lache",
        title: "Quand un distri lâche",
        kind: "text",
        durationMin: 1,
        contentMarkdown: `## Les 3 signaux d'alarme

1. **Il rate son 1:1 sans prévenir**
2. **Ses chiffres descendent** 2 semaines de suite
3. **Il devient silencieux** dans le canal équipe

**Action** : appel direct (**pas message**).

**Question** : *« Qu'est-ce qui se passe vraiment ? »*

Pas de jugement. Pas de pression chiffres. Juste de l'humain.

> 60% des distri « perdus » reviennent si tu fais ça dans les 7 jours.`
      }
    ],
    quiz: {
      id: "M3.2-quiz",
      passingScore: 3,
      questions: [
        {
          kind: "qcm",
          id: "Q1",
          question: "Durée idéale d'un 1:1 hebdo distri ?",
          answers: ["15 min", "30 min", "60 min", "Variable selon l'humeur"],
          correctIndex: 1,
          explanation:
            "30 min, c'est l'équilibre parfait. Au-delà tu perds en intensité, en-dessous tu bâcles. Et c'est tenable dans le temps même avec 10 distri à coacher."
        },
        {
          kind: "qcm",
          id: "Q2",
          question: "Dans la structure 5/10/10/5, les 5 dernières minutes servent à :",
          answers: [
            "Régler les détails admin",
            "Ancrer (fierté + apprentissage)",
            "Refaire les chiffres",
            "Se quitter rapidement"
          ],
          correctIndex: 1,
          explanation:
            "Ancrer. Le distri repart avec une fierté + un apprentissage = il revient avec plus d'envie la semaine d'après. C'est la phase la plus négligée et la plus puissante."
        },
        {
          kind: "qcm",
          id: "Q3",
          question: "Combien de % du temps maximum doit parler le coach pendant un 1:1 ?",
          answers: ["50%", "30%", "70%", "90%"],
          correctIndex: 1,
          explanation:
            "30% maximum. Si tu parles plus, tu fais un cours, pas un coaching. Le distri doit s'entendre lui-même réfléchir à voix haute — c'est là qu'il trouve ses propres solutions."
        },
        {
          kind: "free_text",
          id: "Q4",
          question: "Distri qui rate son 1:1",
          prompt:
            "Un de tes distri rate son 1:1 hebdo cette semaine sans prévenir. Tu fais quoi concrètement dans les 24h qui suivent ? Décris ton premier message ou appel.",
          sponsorCheckHint:
            "Vérifier que la réponse contient (a) un appel ou vocal personnel (pas un texte sec), (b) absence de jugement ou de reproche, (c) une vraie question d'humain (pas « tu peux me dire pourquoi tu n'es pas venu ? »). Si la réponse est passive-agressive ou cherche à « recadrer », demander de reformuler.",
          minChars: 100
        }
      ]
    }
  },

  // ───────────────────────────────────────────────────────────────────────────
  // M3.3 — Animer les événements
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "M3.3",
    slug: "animer-evenements",
    number: "3.3",
    title: "Animer les événements groupe",
    description: "Apéro Healthy, HOM, fin de challenge, calls équipe — la mécanique qui démultiplie ton activité (à ne pas confondre avec ton bilan EBE 1-1).",
    durationMin: 9,
    icon: "🎤",
    ideeForce:
      "Un leader sans événements groupe est un leader plafonné. Les events sont ton démultiplicateur : 1 apéro healthy bien fait = 5 nouveaux distri prospects + 3 distri qui se réveillent + 2 closings que tu n'aurais pas eu en bilan EBE solo. Animer un event ce n'est pas savoir parler en public — c'est savoir scénariser une expérience qui transforme les gens entre 19h et 21h.",
    ancrage: "« Un événement bien fait fait en 2h ce qu'1 mois de bilans EBE solo ne fera jamais. »",
    action:
      "Programme TON premier apéro healthy (ou rejoins celui de ton équipe en mode « shadow » = tu observes pour apprendre). Date dans l'agenda dans les 30 prochains jours. Sans date posée, ça n'arrivera jamais.",
    relatedToolkitSlugs: ["scripts-invitation"],
    lessons: [
      {
        id: "M3.3-L1",
        slug: "trois-events",
        title: "Les 3 events à animer (rythme mensuel)",
        kind: "text",
        durationMin: 2,
        contentMarkdown: `## Ta machine à 3 rituels groupe

⚠️ Rien à voir avec ton **bilan EBE** (1-1 client). Ici on parle d'événements **collectifs** qui amplifient ce que tu fais en bilan.

**1. Apéro Healthy mensuel** (1ère semaine du mois)
- 25-50 personnes
- Prospects + équipe
- Focus opportunité business + témoignages clients transformés

**2. HOM hebdo** (chaque mardi)
- 8-15 personnes chez quelqu'un
- Intime, prospects principalement

**3. Call équipe hebdo** (vendredi soir)
- 100% équipe
- Apprentissage + célébrations

**Bonus rituel** : **Fin de Challenge** (clôture défi 21j/30j) — célébration des transformations, super moment pour proposer la suite.

> Ces 3 rituels (+1) font ta machine. Aucun n'est optionnel.`
      },
      {
        id: "M3.3-L2",
        slug: "anatomie-ebe",
        title: "Anatomie d'un apéro healthy qui marche",
        kind: "text",
        durationMin: 3,
        contentMarkdown: `## Le timing minute par minute

| Heure | Activité | Durée |
|---|---|---|
| 19h00 | Accueil + boissons | 15 min |
| 19h15 | Ouverture par toi (énergie haute) | 5 min |
| 19h20 | Témoignage 1 — client transformé | 10 min |
| 19h30 | Témoignage 2 — distri qui a réussi | 10 min |
| 19h40 | Présentation opportunité (sans diapos lourdes) | 15 min |
| 19h55 | Q&R | 15 min |
| 20h10 | Clôture + appel à l'action | 5 min |
| 20h15 | Networking + closings privés | 45 min |

**Total : 2h.** Au-delà, tu perds l'audience.`
      },
      {
        id: "M3.3-L3",
        slug: "regle-8020",
        title: "La règle du 80/20 sur les témoignages",
        kind: "text",
        durationMin: 2,
        contentMarkdown: `## Tes témoignages = 80% du temps utile

**Pourquoi** : les gens se connectent à des **histoires**, pas à des arguments.

**Choisis 2 témoignages contrastés** :
- Ex : une mère au foyer + un cadre quitté
- Brief 7j avant
- 3 min chacun max
- Structure : **problème → bascule → résultat**

**Évite les freestyles** — ça finit toujours en monologue de 12 minutes qui plombe l'énergie.`
      },
      {
        id: "M3.3-L4",
        slug: "cta-fin",
        title: "Le call to action de fin (CTA)",
        kind: "text",
        durationMin: 1,
        contentMarkdown: `## Ne finis JAMAIS un apéro healthy par « voilà, à bientôt »

**Termine TOUJOURS par 2 propositions concrètes** :

1. *« Pour ceux qui veulent essayer le programme client → on prend RDV pour un EBE (bilan ~60 min) tout de suite »*
2. *« Pour ceux qui veulent en savoir plus sur le business → on cale un café cette semaine »*

**Sans CTA chiffré** : l'event ne convertit pas.
**Avec CTA** : 5-10 EBE calés + 2-3 cafés business par apéro.`
      },
      {
        id: "M3.3-L5",
        slug: "debrief",
        title: "Le débrief équipe post-event",
        kind: "text",
        durationMin: 1,
        contentMarkdown: `## Le lendemain matin

Call équipe **30 min** :
- Qui a fait combien de RDV calé ?
- Qui a closé ?
- Qu'est-ce qui a marché ?
- Qu'est-ce qu'on change la prochaine fois ?

**Sans ce débrief**, l'event devient anecdotique.
**Avec**, il devient système.

> Et c'est ce système qui te fait passer GET → Millionaire → President's.`
      }
    ],
    quiz: {
      id: "M3.3-quiz",
      passingScore: 3,
      questions: [
        {
          kind: "qcm",
          id: "Q1",
          question: "Durée idéale d'un apéro healthy ?",
          answers: ["1h", "2h", "3h", "4h"],
          correctIndex: 1,
          explanation:
            "2h. Au-delà tu perds l'audience, en-dessous tu n'as pas le temps de faire vivre les 8 phases (accueil, témoignages, présentation, Q&R, CTA, networking)."
        },
        {
          kind: "qcm",
          id: "Q2",
          question: "Dans un apéro healthy, les témoignages doivent occuper environ :",
          answers: [
            "20% du temps utile",
            "50%",
            "80%",
            "100%"
          ],
          correctIndex: 2,
          explanation:
            "80% du temps utile. Les gens se connectent à des histoires, pas à des arguments. Tes diapos = 20% max, tes témoignages = 80% min."
        },
        {
          kind: "qcm",
          id: "Q3",
          question: "Le rituel le plus négligé par les leaders débutants est :",
          answers: [
            "L'apéro healthy mensuel",
            "Le débrief post-event",
            "Le HOM hebdo",
            "Le call équipe"
          ],
          correctIndex: 1,
          explanation:
            "Le débrief post-event. Sans lui, l'event reste anecdotique. Avec lui, il devient système — et c'est le système qui te fait monter en rang."
        },
        {
          kind: "free_text",
          id: "Q4",
          question: "Plan Apéro Healthy J-21",
          prompt:
            "Imagine que tu animes ton premier apéro healthy dans 3 semaines. Décris en 5 lignes ton plan d'action des 21 prochains jours pour t'assurer d'avoir 25-50 participants ET 2 témoignages briefés.",
          sponsorCheckHint:
            "Vérifier que la réponse comprend (a) un planning précis d'invitations (qui invite qui, combien, quand), (b) une logique de confirmation (la veille minimum), (c) un brief des 2 intervenants au moins 7j avant. Si la réponse est vague (« je vais inviter du monde »), demander un plan jour par jour.",
          minChars: 150
        }
      ]
    }
  },

  // ───────────────────────────────────────────────────────────────────────────
  // M3.4 — Vers les royalties
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "M3.4",
    slug: "vers-royalties",
    number: "3.4",
    title: "Vers les royalties",
    description: "Le mécanisme qui transforme ton business en revenu passif — comment l'enclencher pour de vrai.",
    durationMin: 9,
    icon: "💎",
    ideeForce:
      "Les royalties sont la VRAIE promesse d'Herbalife. C'est le moment où ton business devient un actif qui te paie même quand tu dors. Mais elles ne tombent pas du ciel : elles s'enclenchent quand tu as 3 lignes Sup actives sous toi qui produisent. Tout le N3 te conduit ici.",
    ancrage: "« Les royalties ne sont pas un cadeau. C'est le retour sur investissement de 12-24 mois de duplication systématique. »",
    action:
      "Écris ta projection 12 mois sur une feuille : palier visé + 3 personnes cibles à amener Sup + revenu mensuel cible. Affiche-la avec ta vision board (M1.1 / Feuille de Reconnaissance). Tu la verras chaque jour. C'est ton GPS sur 12 mois.",
    relatedToolkitSlugs: ["calculateur-strategy-plan", "feuille-reconnaissance"],
    lessons: [
      {
        id: "M3.4-L1",
        slug: "comment-fonctionnent",
        title: "Comment fonctionnent les royalties",
        kind: "text",
        durationMin: 2,
        contentMarkdown: `## Le mécanisme

Dès que tu es Supervisor, Herbalife te paie **5%** sur le volume des Sup que tu as toi-même qualifiés (TAB Team) sur **3 niveaux** de profondeur.

**Exemple chiffré** :

> Mandy a fait Sup grâce à toi. Son équipe produit 10 000 PV/mois.
> Tu touches : **5% × 10 000 × 1,50 € = 750 €** de royalties sur SA ligne.

Si tu as **3 lignes** comme ça, tu enchaînes **2 250 €/mois** en royalties pures, sans rien faire de plus.`
      },
      {
        id: "M3.4-L2",
        slug: "regle-3-lignes",
        title: "La règle des 3 lignes",
        kind: "text",
        durationMin: 2,
        contentMarkdown: `## Pourquoi 3 et pas 1

Tu n'es pas « vraiment » leader avec **1 seule ligne** Sup sous toi.

Une ligne peut s'écrouler :
- Le Sup arrête
- Il déménage
- Il divorce
- Il part dans une autre boîte

**3 lignes = stabilité.** C'est pour ça que tous les coachs Herbalife te diront : *« Vise 3 distri à amener Sup dans tes 12 premiers mois, pas 1 ».*

Le 4ème, le 5ème, le 6ème viennent ensuite naturellement parce que tu as appris la duplication.`
      },
      {
        id: "M3.4-L3",
        slug: "cinq-paliers",
        title: "Les 5 paliers royalties",
        kind: "text",
        durationMin: 2,
        contentMarkdown: `## La pyramide en 5 marches

| Palier | Condition | Royalties indicatives |
|---|---|---|
| **TAB Team Producer** | 1 Sup en aval | ~150-300 €/mois |
| **World Team** | Org. 2 500 PV | ~500-800 €/mois |
| **GET Team** | 3 lignes solides | ~1 500-3 000 €/mois |
| **Millionaire Team** | 10 lignes royalties | ~5 000-10 000 €/mois |
| **President's Team** | Top 1% mondial | 20 000 €+ /mois + bonus + voyages |

> Ce n'est pas linéaire — chaque palier double presque le précédent.`
      },
      {
        id: "M3.4-L4",
        slug: "timing-realiste",
        title: "Le timing réaliste",
        kind: "text",
        durationMin: 2,
        contentMarkdown: `## Pas de promesse magique

**Avec la formule 5-3-1 (M2.2) tenue 12 mois** : tu vises GET Team à M+12.

**Avec un rythme plus intense (8-4-1 sur 12 mois, plus dur à tenir)** : tu vises President's Team à M+12.

> Personne n'arrive à President's en 6 mois sauf cas exceptionnels avec gros réseau initial.

**L'erreur** : se comparer à des cas extrêmes Instagram.

**La règle** : tenir 12-24 mois en mode systématique → tu gagnes mathématiquement.`
      },
      {
        id: "M3.4-L5",
        slug: "ce-qui-change",
        title: "Ce qui change quand les royalties tombent",
        kind: "text",
        durationMin: 1,
        contentMarkdown: `## La trajectoire vécue

- **Mois 1 royalties** : tu n'oses pas y croire, tu vérifies 3 fois.
- **Mois 6** : tu commences à compter dessus pour le loyer.
- **Mois 12** : c'est devenu ton revenu principal.
- **Mois 24** : tu peux quitter ton job principal.
- **Mois 36-60** : tu deviens libre financièrement.

**Mais** : les royalties n'enlèvent pas le travail — elles le **transforment**. À ce stade, tu ne vends plus de produits ni ne fais plus de bilans. **Tu animes tes leaders.** C'est un autre métier.`
      }
    ],
    quiz: {
      id: "M3.4-quiz",
      passingScore: 3,
      questions: [
        {
          kind: "qcm",
          id: "Q1",
          question: "Combien de % de royalties sur le volume de tes Sup en aval ?",
          answers: ["2 %", "5 %", "10 %", "25 %"],
          correctIndex: 1,
          explanation:
            "5 % sur le volume des Sup qualifiés en aval, sur 3 niveaux de profondeur. C'est le mécanisme central du plan marketing Herbalife."
        },
        {
          kind: "qcm",
          id: "Q2",
          question: "Sur combien de niveaux de profondeur les royalties sont versées ?",
          answers: ["1", "2", "3", "Illimité"],
          correctIndex: 2,
          explanation:
            "3 niveaux. Au-delà, tu touches les bonus de leadership (en cascade) mais pas les royalties stricto sensu."
        },
        {
          kind: "qcm",
          id: "Q3",
          question: "Combien de lignes Sup en aval pour être « vraiment » stable en royalties ?",
          answers: ["1", "2", "3 minimum", "10"],
          correctIndex: 2,
          explanation:
            "3 minimum. Une seule ligne peut s'écrouler. 3 lignes diversifient le risque — c'est ta diversification, comme un portefeuille d'actions."
        },
        {
          kind: "free_text",
          id: "Q4",
          question: "Ta projection 12 mois",
          prompt:
            "Quel palier royalties tu vises à M+12 (dans 1 an exactement) ? Liste les 3 personnes que tu dois amener Sup pour y arriver. Si tu n'en connais pas encore : qui dans ta liste de connaissances actuelle aurait le profil ?",
          sponsorCheckHint:
            "Vérifier que la réponse contient (a) un palier nommé clairement (TAB Team / World Team / GET / Millionaire / President), (b) 3 personnes nommées, (c) au moins une justification de profil (« elle est commerciale », « il a un réseau de fitness »). Si la réponse est trop floue, demander à préciser les 3 noms.",
          minChars: 120
        }
      ]
    }
  }
];

// =============================================================================
// BIBLIOTHÈQUE THÉMATIQUE — 4 catégories (placeholders légers)
// =============================================================================
//
// Note pour Claude Code : ces ressources sont des PLACEHOLDERS volontairement légers.
// L'objectif Phase F est d'afficher la biblio comme "habitée" (pas une coquille vide)
// en pointant vers les modules existants. Les vraies ressources externes (vidéos
// School, PDF, guides) seront enrichies par Tom dans une V2 quand il aura le contenu.
//
// Format : kind: "module-link" pointe vers un module existant (id du module).
// =============================================================================

import type { FormationCategory } from "./types";

export const BIBLIO_PROSPECTION: FormationCategory["resources"] = [
  {
    id: "biblio-prospection-01",
    title: "Constituer ma liste de connaissances",
    description: "La méthode FRANK pour 100 noms en 7 jours. Sans aucun jugement à priori.",
    kind: "module-link",
    moduleId: "M1.2",
    durationMin: 7,
    tag: "Fondamentaux"
  },
  {
    id: "biblio-prospection-02",
    title: "Le réflexe SI / ALORS",
    description: "Anticipe les 7 objections les plus fréquentes — tu ne les craindras plus.",
    kind: "module-link",
    moduleId: "M2.3",
    durationMin: 7,
    tag: "Objections"
  },
  {
    id: "biblio-prospection-03",
    title: "Inviter à l'Apéro Healthy et au Quick Start",
    description: "Tes événements groupe sont tes amplificateurs. Invitation sans pré-pitcher.",
    kind: "module-link",
    moduleId: "M2.4",
    durationMin: 8,
    tag: "Événements"
  }
];

export const BIBLIO_BILAN: FormationCategory["resources"] = [
  {
    id: "biblio-bilan-01",
    title: "Faire un bilan pro en 10 points",
    description: "De l'accueil au closing — la trame complète d'un bilan crédible.",
    kind: "module-link",
    moduleId: "M1.3",
    durationMin: 10,
    tag: "Méthode"
  },
  {
    id: "biblio-bilan-02",
    title: "Comprendre l'opportunité",
    description: "La base pour poser un cadre pro pendant le bilan : pourquoi Herbalife, pourquoi maintenant.",
    kind: "module-link",
    moduleId: "M1.1",
    durationMin: 8,
    tag: "Posture"
  },
  {
    id: "biblio-bilan-03",
    title: "Le tunnel marketing en 7 étapes",
    description: "Où se situe le bilan dans le tunnel global. Avant et après, qu'est-ce qui se passe ?",
    kind: "module-link",
    moduleId: "M2.1",
    durationMin: 9,
    tag: "Vue d'ensemble"
  }
];

export const BIBLIO_SUIVI: FormationCategory["resources"] = [
  {
    id: "biblio-suivi-01",
    title: "Mon premier closing",
    description: "Closer = aider à décider. La règle du silence + les 3 types de « non ».",
    kind: "module-link",
    moduleId: "M1.4",
    durationMin: 7,
    tag: "Closing"
  },
  {
    id: "biblio-suivi-02",
    title: "Demander mes premières recos",
    description: "Une reco vaut 10 prospects froids. Quand et comment la demander à chaud.",
    kind: "module-link",
    moduleId: "M1.5",
    durationMin: 6,
    tag: "Recos"
  },
  {
    id: "biblio-suivi-03",
    title: "Coacher mes distri",
    description: "Le 1:1 hebdo qui transforme un débutant en Sup en 6 mois. Format 5/10/10/5.",
    kind: "module-link",
    moduleId: "M3.2",
    durationMin: 9,
    tag: "Coaching"
  }
];

export const BIBLIO_BUSINESS: FormationCategory["resources"] = [
  {
    id: "biblio-business-01",
    title: "Mon plan d'action quotidien (DMO 5-3-1)",
    description: "5 nouveaux + 3 récurrents + 1 coach par mois = progression vers GET Team en 12 mois.",
    kind: "module-link",
    moduleId: "M2.2",
    durationMin: 8,
    tag: "DMO"
  },
  {
    id: "biblio-business-02",
    title: "Mon rôle de leader",
    description: "Le glissement Sup → Leader. Les 4 casquettes, le rythme, la phrase qui change tout.",
    kind: "module-link",
    moduleId: "M3.1",
    durationMin: 9,
    tag: "Leadership"
  },
  {
    id: "biblio-business-03",
    title: "Animer les événements groupe",
    description: "Apéro Healthy, HOM, fin de challenge, calls équipe. Anatomie d'un apéro qui marche en 2h. (Pas le bilan EBE 1-1.)",
    kind: "module-link",
    moduleId: "M3.3",
    durationMin: 9,
    tag: "Événements"
  },
  {
    id: "biblio-business-04",
    title: "Vers les royalties",
    description: "Comprendre, construire, protéger ton revenu résiduel à vie. Les 5 paliers.",
    kind: "module-link",
    moduleId: "M3.4",
    durationMin: 9,
    tag: "Royalties"
  }
];
