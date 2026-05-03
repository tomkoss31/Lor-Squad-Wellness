// =============================================================================
// BOÎTE À OUTILS LOR'SQUAD — src/data/formation/boite-a-outils-content.ts
//
// La vraie boîte à outils du distri Lor'Squad : matière exécutable, scripts
// copier-coller, fiches premium. Différent du parcours guidé (modules N1/N2/N3)
// qui apprend la théorie. Ici on PASSE À L'ACTE.
//
// PRINCIPES :
//   - Tutoiement direct, ton Lor'Squad, zéro jargon corporate.
//   - Chaque outil cible un profil (nouveau / relance / sup_plus / tous).
//   - Format suggéré : popup pour scripts courts, page pour fiches premium.
//   - Scripts copier-coller dans le champ scripts[] (label + text + note).
//   - Calibrage France respecté : 1 VP = 1,50 € · marge Sup 50% · DMO 5-3-1.
//
// CONTENU :
//   - 🎯 Prospection & Recrutement : 4 outils
//   - 📊 Bilan & Body Scan : 3 outils (focus présentiel, l'app fait le reste)
//   - 💪 Suivi & Fidélisation : 4 outils
//   - 🚀 Business & 100 clubs : 5 outils (dont la pièce maîtresse : Visio à 3)
//
// Livré par Claude (atelier Notion) le 03/05/2026.
// =============================================================================

import type { FormationToolkitItem } from "./types";

// =============================================================================
// 🎯 PROSPECTION & RECRUTEMENT
// =============================================================================

export const TOOLKIT_PROSPECTION: FormationToolkitItem[] = [
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "tk-prospection-01",
    slug: "scripts-invitation",
    category: "prospection",
    title: "10 messages d'invitation prêts à copier",
    description: "Pour chaud, tiède, froid et réveil. Adaptés à WhatsApp, SMS, Messenger.",
    kind: "phrase-pack",
    format: "popup",
    profile: "tous",
    icon: "💬",
    durationMin: 2,
    tag: "Scripts",
    contentMarkdown: `## 10 messages prêts à envoyer

**Règle d'or** : pas de pitch, juste de la curiosité + un cadre temps précis.

Adapte avec **le prénom**, **tes vraies dispos**, et **ton vocabulaire**. Si tu balances le texte mot pour mot sans rien changer, ça sonne robotique. Mets ta patte.`,
    scripts: [
      {
        label: "🔥 Contact CHAUD — direct",
        text: `Salut [Prénom] !

J'ai un truc à te montrer, ça pourrait t'intéresser. T'as 1h mardi soir ou jeudi soir ?

Bisous`,
        note: "Pour les gens qui te font déjà confiance — pas besoin d'enrobage."
      },
      {
        label: "🌤️ Contact TIÈDE — l'avis",
        text: `Salut [Prénom], j'espère que tu vas bien !

Je voudrais avoir ton avis sur quelque chose. T'as 1h mardi soir ou jeudi soir pour qu'on en discute ?

Bisous`,
        note: "« Avoir ton avis » = mot magique. Personne ne refuse de donner son avis."
      },
      {
        label: "❄️ Contact FROID — la reprise douce",
        text: `Hey [Prénom] ! Ça fait un bail, j'espère que tout va bien de ton côté.

J'aimerais qu'on prenne un café/un appel un de ces jours, j'ai un truc à te raconter qui me passionne en ce moment. T'es plutôt mardi ou jeudi ?

À très vite`,
        note: "Renoue d'abord, propose ensuite. Jamais l'inverse sur un froid."
      },
      {
        label: "🔄 Réveil — relancer un silencieux",
        text: `Coucou [Prénom] !

Je pensais à toi en faisant le tri, ça fait un moment qu'on n'a pas pris des nouvelles. Comment tu vas ? T'as 30 min cette semaine pour qu'on se cale un appel ?`,
        note: "Pas de pitch, juste de l'humain. La porte business s'ouvre après."
      },
      {
        label: "📨 Reco activée — message à 3 voix",
        text: `Salut [Prénom] !

[Reco] m'a parlé de toi, et il/elle pense que ce que je fais pourrait vraiment t'intéresser. J'aimerais qu'on prenne 30 min ensemble pour qu'on en parle. T'es plutôt mardi ou jeudi soir ?

Bisous`,
        note: "Le nom du référent en début = crédibilité instantanée. Demande à ton client de prévenir avant que tu envoies."
      },
      {
        label: "📲 Story — invitation EBE",
        text: `Salut !

Je participe à un event business mardi soir, j'ai 2 invits à offrir. T'es libre, ça te dit ?

Format : 2h, en ligne ou en présentiel selon l'envie. On y va ensemble, je te présente.`,
        note: "« 2 invits à offrir » crée la rareté. Tu donnes une place, pas tu vends une soirée."
      },
      {
        label: "💪 Sport-actif — angle forme",
        text: `Hey [Prénom] !

T'es toujours motivé.e côté sport ? J'ai découvert un truc qui change la vie côté nutrition + énergie pendant les séances. Ça te tente qu'on en parle 30 min mardi ou jeudi ?`,
        note: "Pour les profils sportifs — angle performance, pas perte de poids."
      },
      {
        label: "👨‍👩‍👧 Parents — angle famille",
        text: `Salut [Prénom] !

Comment vous gérez les repas en famille en ce moment ? J'ai trouvé un système qui m'a vachement simplifié la vie côté petit-déj' + récup' énergie. Ça t'intéresserait qu'on en parle ?`,
        note: "Marche très bien sur les parents qui galèrent à concilier boulot + enfants + alimentation."
      },
      {
        label: "💼 Business — angle revenu",
        text: `Hey [Prénom] !

Je me lance sur un projet business à côté de mon activité, et je cherche 2-3 personnes ambitieuses pour démarrer avec moi. Je pense à toi parce que [raison perso].

Ça te tente qu'on en parle 30 min ?`,
        note: "« 2-3 personnes ambitieuses » = sélectif. Tu ne supplies pas, tu sélectionnes."
      },
      {
        label: "🎯 Suite à un compliment — saisir l'occasion",
        text: `Merci pour ton message [Prénom] !

Du coup ça me fait penser : tu m'avais dit que tu voulais [objectif perso]. Si tu veux, on en discute 30 min cette semaine, je peux peut-être t'aider concrètement. T'es plutôt mardi ou jeudi soir ?`,
        note: "Quand quelqu'un te complimente sur ta forme, ton énergie, tes résultats : SAISIS. C'est le moment le plus chaud qui existe."
      }
    ]
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "tk-prospection-02",
    slug: "liste-100-methode-frank",
    category: "prospection",
    title: "Ma liste des 100 — méthode FRANK",
    description: "Le template imprimable + la méthode pour sortir 100 noms en 7 jours sans rien oublier.",
    kind: "page",
    format: "page",
    profile: "nouveau",
    icon: "📒",
    durationMin: 15,
    tag: "Démarrage",
    contentMarkdown: `## La méthode FRANK — 100 noms en 7 jours

> Ta liste est ton inventaire de richesse. Elle est déjà dans ton téléphone. Le seul problème : tu refuses d'y penser.

---

### 🔤 FRANK — l'acronyme qui débloque tout

**F · Family** — tous tes liens de sang, par alliance, beaux-parents, cousins éloignés. Vise 20-30 noms.

**R · Relations** — collègues actuels, anciens collègues (5 derniers boulots), voisins, contacts pro. Vise 20-30 noms.

**A · Amis** — amis d'enfance, de fac, sportifs, de soirées, parents d'amis. Vise 20-30 noms.

**N · Network** — followers actifs Instagram/Facebook, contacts LinkedIn, groupes WhatsApp. Vise 15-20 noms.

**K · Kids' parents** — parents d'amis de tes enfants, profs, club, asso, école. Vise 10-15 noms.

---

### ⚠️ Les 3 pièges classiques à éviter

**1. Juger avant d'inscrire.**
*« Lui il a déjà son business », « Elle est trop sportive »*… STOP. Tu n'es pas dans leur tête. Mets-les TOUS sur la liste, tu trieras après.

**2. Se limiter à 30-50 noms.**
La masse statistique nécessaire = 100 minimum. Sur 100 : ~30 ne répondront pas, ~30 diront non, ~30 écouteront, ~10 deviendront actifs. En-dessous de 100, tu n'as pas le volume.

**3. « Terminer » la liste.**
Ta liste est **vivante**. Chaque rencontre = +1 nom. Ne la fige jamais.

---

### 🗂️ Hiérarchiser ta liste

Pour chaque nom, mets une note :

- **🔥 CHAUD** : te fait confiance, te répond en moins de 24h, tu peux l'appeler ce soir sans prévenir.
- **🌤️ TIÈDE** : croisé récemment, en bons termes mais distants.
- **❄️ FROID** : pas parlé depuis longtemps.

**Ratio cible pour démarrer** : 60% chaud + 30% tiède + 10% froid.

---

### 📝 Template imprimable

Note : feuille A4, 4 colonnes — Prénom Nom · Téléphone · Catégorie FRANK · Score (chaud/tiède/froid) · Statut (à inviter / invité / RDV calé / client / pas concerné).

À imprimer ou ouvrir dans Notes/Excel. Reviens-y **chaque semaine** pour ajouter et ré-évaluer.

---

### 🎯 Ton défi cette semaine

- **Aujourd'hui** : 50 noms minimum.
- **D'ici 7 jours** : 100 noms.
- **Dans 30 jours** : 150+ noms (vivante, ajouts au fil de l'eau).`
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "tk-prospection-03",
    slug: "hooks-reseaux-sociaux",
    category: "prospection",
    title: "15 hooks réseaux sociaux pour stories",
    description: "Phrases d'accroche qui font swiper, sans pitcher. Pour Instagram, Facebook, TikTok.",
    kind: "phrase-pack",
    format: "popup",
    profile: "tous",
    icon: "📱",
    durationMin: 3,
    tag: "Stories",
    contentMarkdown: `## 15 hooks pour démarrer ta story

**Règle** : un hook = 1ère slide ou première phrase. Le but n'est PAS de vendre. Le but est de **faire rester**.

Un hook réussi déclenche un *« attends, raconte »* dans la tête du spectateur.`,
    scripts: [
      {
        label: "🌅 Routine matin",
        text: `Mon rituel matin qui a tout changé en 30 jours ⬇️`,
        note: "Suivi de 3-4 slides montrant ta routine concrète."
      },
      {
        label: "🤔 Question honnête",
        text: `J'ai longtemps cru que [croyance limitante]. Jusqu'à ce que…`,
        note: "Crée la curiosité par la vulnérabilité. Authentique > parfait."
      },
      {
        label: "💡 Découverte récente",
        text: `Ce truc, je l'ai découvert il y a 6 mois. Ça a changé ma vie.`,
        note: "Marche bien suivi d'un témoignage perso (avant / après)."
      },
      {
        label: "🚫 Anti-vente",
        text: `Ce post n'est PAS pour te vendre quelque chose. Lis quand même.`,
        note: "Désamorcer l'objection 'encore une vente' = baisser la garde."
      },
      {
        label: "📊 Chiffre choc",
        text: `73% des Français se sentent fatigués au réveil. T'es dans lesquels ?`,
        note: "Question rhétorique = engagement. Le chiffre rend crédible."
      },
      {
        label: "⏰ Avant / Après temps",
        text: `Il y a 1 an j'étais [X]. Aujourd'hui [Y]. Voilà comment.`,
        note: "Le format avant/après marche TOUJOURS. À condition d'être vrai."
      },
      {
        label: "❓ Question piège",
        text: `Pourquoi tu manges « sain » et tu n'as toujours pas de résultats ?`,
        note: "Touche un point sensible. Ne réponds pas tout de suite — fais languir."
      },
      {
        label: "🎯 Liste promise",
        text: `Les 3 erreurs que je faisais le matin et qui me plombaient ma journée.`,
        note: "Format liste = clarté = engagement. Annonce le contenu en titre."
      },
      {
        label: "👥 Témoignage indirect",
        text: `Ma cliente Sophie a perdu 8 kg sans régime. Voici ce qu'elle a fait.`,
        note: "Demande l'autorisation à Sophie avant. Photo floutée si pas OK pour l'image."
      },
      {
        label: "🤐 Confidence",
        text: `Ce que je n'ose dire à personne sur mon business…`,
        note: "Casse la 4ème muraille. À utiliser parcimonieusement, sinon ça perd l'effet."
      },
      {
        label: "🔄 Routine du soir",
        text: `Ma routine du soir pour mieux dormir et perdre du poids. (oui les 2)`,
        note: "Lie 2 bénéfices = double aimant."
      },
      {
        label: "💬 Conversation entendue",
        text: `Ce matin une cliente m'a dit : « j'aurais dû commencer plus tôt. » Pourquoi ?`,
        note: "Faux dialogue intriguant. Crée l'envie de connaître la suite."
      },
      {
        label: "🥤 Mythe à casser",
        text: `Faire un shake protéiné c'est pas pour les sportifs. Voici pour qui c'est.`,
        note: "Casser un préjugé = élargir ton public ciblé."
      },
      {
        label: "📅 Bilan mensuel",
        text: `Bilan du mois : 5 nouvelles personnes accompagnées. Voici leur point commun.`,
        note: "Mets-toi en autorité sans te vanter — tu présentes des résultats clients."
      },
      {
        label: "🎁 Promesse sans piège",
        text: `Si tu bois 1,5 L d'eau par jour pendant 7 jours, voilà ce qui se passe.`,
        note: "Conseil gratuit qui valorise + ouvre la porte à un échange privé."
      }
    ]
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "tk-prospection-04",
    slug: "reveiller-contact-froid",
    category: "prospection",
    title: "Réveiller un contact froid — la séquence en 3 messages",
    description: "Quelqu'un que tu n'as pas parlé depuis 6 mois ou plus. La méthode pour rouvrir sans gêner.",
    kind: "script",
    format: "popup",
    profile: "relance",
    icon: "🔥",
    durationMin: 3,
    tag: "Réactivation",
    contentMarkdown: `## La séquence en 3 messages — sur 7 jours

**Principe** : tu ne vends rien. Tu **renoues**. La porte business s'ouvre seule, après.

Espace les messages : J0, J3, J7. **Si pas de réponse à J7, tu lâches**. Ne harcèle jamais.`,
    scripts: [
      {
        label: "📨 J0 — Le retour humain",
        text: `Hey [Prénom] !

Ça fait un bail, j'espère que tout roule de ton côté. Je suis tombé.e sur [souvenir commun] et ça m'a rappelé plein de bons moments.

Comment tu vas, vraiment ?`,
        note: "PAS de pitch. Juste de l'humain. Le souvenir commun = preuve que tu n'envoies pas un copier-coller."
      },
      {
        label: "📨 J3 — La relance douce (si pas de réponse)",
        text: `Coucou [Prénom],

Je rebondis au cas où mon message t'avait échappé. Aucune urgence, j'avais juste envie de prendre des nouvelles.

À très vite si tu peux !`,
        note: "Tu lui donnes une porte de sortie (« aucune urgence »). Ça enlève la pression et augmente le taux de réponse."
      },
      {
        label: "📨 J7 — La porte ouverte (dernière relance)",
        text: `Hey [Prénom],

Pas de souci si t'as pas le temps en ce moment, je voulais juste te dire que je pense à toi. Si un jour tu veux qu'on cale un café ou un appel, ma porte est ouverte.

Bisous`,
        note: "Tu ferme la séquence avec élégance. Si elle revient dans 3 mois, ça sera naturel. Si jamais, tant pis."
      },
      {
        label: "✅ ELLE RÉPOND — Comment enchaîner",
        text: `Trop content.e d'avoir de tes nouvelles ! 🙌

Et toi du coup, qu'est-ce qui t'occupe en ce moment ?`,
        note: "Renvoie la balle. Laisse-la te raconter sa vie 5-10 minutes AVANT de placer ton sujet. Sinon tu casses tout."
      }
    ]
  }
];

// =============================================================================
// 📊 BILAN & BODY SCAN — focus PRÉSENTIEL (l'app fait le reste)
// =============================================================================

export const TOOLKIT_BILAN: FormationToolkitItem[] = [
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "tk-bilan-01",
    slug: "bases-presentiel",
    category: "bilan",
    title: "Le bilan EBE — les 10 étapes pro",
    description: "Le déroulé complet d'une Étude Bien-Être réussie en 60 min. L'app pilote la trame, toi tu pilotes l'expérience humaine.",
    kind: "page",
    format: "page",
    profile: "tous",
    icon: "🏠",
    durationMin: 12,
    tag: "Présentiel",
    contentMarkdown: `## L'app fait le bilan. Toi tu fais l'EXPÉRIENCE.

> 90% des distri pensent que le bilan c'est *« suivre la trame »*. Faux. La trame, l'app la fait.
> **Toi, ton vrai job** : faire vivre une expérience qui transforme une personne en 60 minutes.

🎯 **Objectif** : que **n'importe quel distri** puisse suivre ces 10 étapes et faire une EBE pro, simple et agréable. L'app pilote le bilan technique — toi, tu portes l'humain.

---

### 1. 🧰 Préparation avant l'arrivée

- Sois **à l'heure** (même en avance).
- Sois **propre**, souriant·e, présentable.
- Le club / ton espace est **rangé**, propre, accueillant.
- **Tablette ou téléphone chargés à 100%** — l'app Lor'Squad sera ton coéquipier pendant le bilan.
- Balance (Tanita allumée + pile vérifiée la veille), mètre ruban, stylo prêts.
- Bouteille d'eau fermée + 2 verres + shaker + Formula 1 + lait/lait végétal sortis.

> Quand la personne arrive, elle doit sentir qu'on l'attendait **pour elle**, pas qu'elle dérange.

---

### 2. 😊 Accueil sourire (et prénom)

- Accueille **avec le sourire** et utilise le **prénom**.
- Phrase de bienvenue type :

> *« Bienvenue {Prénom}, installe-toi, tu vas voir, on va passer un bon moment 😊 »*

- Ambiance voulue : **cool + pro**. Tu n'es pas chez le médecin, mais tu n'es pas chez le copain non plus.
- Évite à tout prix : *« Bonjour, asseyez-vous, on commence ! »*

---

### 3. 🥤 Proposer une boisson d'accueil

- Demande d'abord : *« Tu préfères une boisson chaude ou froide ? »*
- Propose de l'**eau pétillante au citron** (la base safe) ou ton best-seller du moment.
- Verre propre, jamais un gobelet plastique pourri. **Belle présentation**, pas radin·e.
- **Prends aussi ta boisson** → moment partagé, pas démarchage.

> ⚠️ Si tu reçois chez toi : range ce qui doit être rangé. La cuisine sale derrière toi en visio, c'est mort.

---

### 4. 📱 Lance l'app pendant la préparation

Pendant que tu prépares la boisson :

- **Sors ta tablette** ou ton téléphone, ouvre l'app Lor'Squad.
- Crée le nouveau bilan, mets le prénom du client.
- L'app va te guider sur les 13 étapes — tu n'as plus à improviser.

> Aujourd'hui, l'app **remplace la fiche papier**. Tu gardes une fiche papier en backup au cas où ça rame, mais c'est l'app qui pilote.

**Avantages** : gain de temps, structure pro, le client voit que c'est sérieux et organisé.

---

### 5. 🫶 Pause « boisson & discussion »

- Assieds-toi avec elle, laisse **goûter tranquillement**.
- Observe la réaction.
- **Ne plonge pas direct dans l'app**. Donne 2-3 minutes d'humain avant.

Phrase d'ouverture :

> *« Comment tu t'es senti·e en venant aujourd'hui ? »*

(silence, écoute, sourire — 60-90 secondes minimum sans parler business)

---

### 6. 👂 Écoute active & empathie

Tu passes en mode **coach humain**, pas vendeur. Questions ouvertes :

- *« Qu'est-ce qui t'a donné envie de venir ? »*
- *« Tu aimerais changer quoi aujourd'hui ? »*
- *« Qu'est-ce qui est le plus difficile en ce moment ? »*
- *« Qu'est-ce qui se passerait si dans 3 mois rien n'avait changé ? »*

**Écoute sans juger** et **reformule**.

> Tu cherches le **VRAI pourquoi** (santé / image / énergie / business), pas le *« je veux perdre 3 kg »* de surface.

C'est aussi le moment où l'app te demande de remplir l'**étape 1** (informations client). Saisis pendant qu'elle parle.

---

### 7. ⚖️ Body scan + bilan via l'app — sans jugement

Avance dans l'app jusqu'à l'étape **Body Scan**. Phrase de cadrage :

> *« Maintenant on va faire un body scan complet — pas juste le poids, mais ta masse musculaire, ton hydratation, ta graisse viscérale, ton âge métabolique. Tu vas voir des chiffres que tu n'as jamais vus. Pas pour te juger — pour comprendre. »*

**Pendant le scan** :

- L'app calcule tout. Tu commentes calmement, factuellement.
- Pas de drama, pas de *« oh là là c'est grave »*.
- Exemples :
  > *« Ton hydratation est à 47%, idéal c'est 55-60%. Ça explique probablement ta fatigue / tes fringales. »*
  > *« Ta masse musculaire est correcte, on la garde. C'est ton vrai capital. »*

> *« Ce qui compte, ce n'est pas où tu es aujourd'hui, c'est ce qu'on va construire dans les prochaines semaines. »*

---

### 8. 🥛 Le shake F1 — le moment WOW

C'est l'étape la plus puissante de tout le bilan. **Ne la zappe jamais**.

- Présente **Formula 1** comme base de repas équilibré (25g de protéines, 21 vitamines, < 200 kcal).
- Mixe le shake **devant elle** (pas pré-fait dans la cuisine).
- Belle texture, beau verre, parfum au choix (vanille = safe par défaut).
- Goûte avec elle.

Phrases qui scellent :

> Si elle adore : *« Imagine ça chaque matin, tu t'y vois ? »*
> Si mitigée : *« Y'a 12 parfums, on trouvera le tien. »*

**Objectif** : qu'elle se dise *« je pourrais manger ça tous les jours »*.

---

### 9. 🧩 Programme & closing — guidé par l'app

L'app a déjà préparé l'étape **Programme proposé** avec les produits adaptés à son profil. Toi, tu portes la voix :

1. **Reformule** l'objectif : *« Si je résume, tu veux X, Y, Z ? »*
2. **Présente max 3 produits** (pas un catalogue) :
   - Formula 1 (matin) → bénéfice X
   - Aloe Concentrate (eau) → bénéfice Y
   - 3ème produit ciblé selon son besoin
3. **Closing à choix limité** :

> *« Tu préfères qu'on attaque par 4 semaines ou 1 mois complet ? »*

(silence — tu te TAIS, même si ça dure 30 secondes)

> JAMAIS *« tu veux démarrer ? »* (oui/non).
> Toujours un choix entre 2 options qui mènent au OUI.

---

### 10. 🎁 Recommandations — la reco fun

À la fin du bilan, l'app te propose une **étape Recommandations**. Saisis-la avec elle, en direct.

Phrase magique :

> *« Avant que tu partes : qui dans ton entourage aurait besoin du même regard que je viens de te donner ? »*

(silence, attendre **3 noms minimum**)

> *« Et qui d'autre tu vois ? »*

**Système de paliers** (visible dans l'app) :
- 🎁 **5 noms** → premier cadeau débloqué
- 🌟 **10 noms** → cadeau premium
- *Bonus fun en équipe* : à 50 recos cumulées sur l'année → tour en Ferrari avec Thomas 😄

But : rendre la reco **normale**, partager l'expérience, préparer le **Pack Ambassadeur**.

---

### ✅ Ta checklist 30 min avant chaque bilan

- [ ] Pièce propre + rangée + lumière douce (pas néon hôpital)
- [ ] Boisson + verres prêts
- [ ] Shaker + Formula 1 + ingrédients prêts
- [ ] Balance + mètre prêts
- [ ] **Tablette / téléphone chargés à 100% + app Lor'Squad lancée**
- [ ] Téléphone perso en silencieux, animaux/enfants gérés
- [ ] 5 minutes respiration faites — *« je suis là pour cette personne, pas pour mes objectifs »*

> Tu coches les 7 cases avant chaque bilan. C'est ton rituel pro.

---

### 💡 La phrase qui scelle tout

À la fin du bilan, en regardant la personne dans les yeux :

> *« Mon rôle n'est pas de te vendre des produits. Mon rôle, c'est que dans 30 jours, tu sois fier·e de toi. »*

— et tu te tais.`
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "tk-bilan-02",
    slug: "phrases-cles-bilan",
    category: "bilan",
    title: "Phrases-clés du bilan — par moment",
    description: "Les bonnes phrases au bon moment : accueil, diagnostic, body scan, programme, closing.",
    kind: "phrase-pack",
    format: "popup",
    profile: "tous",
    icon: "🎙️",
    durationMin: 4,
    tag: "Phrases-clés",
    contentMarkdown: `## Les phrases qui font la différence

Tu ne vas pas réciter, mais **les avoir en mémoire** te donne le confort de bien réagir au bon moment.`,
    scripts: [
      {
        label: "👋 Accueil — les 90 premières secondes",
        text: `« Bienvenue ! Comment tu t'es senti·e en venant aujourd'hui ? »

(silence, écoute, sourire)

« Installe-toi, tiens je t'ai préparé une boisson. »`,
        note: "Question ouverte + boisson = bascule en 2 minutes. Pas de business."
      },
      {
        label: "🔍 Diagnostic — questions ouvertes",
        text: `« Qu'est-ce qui t'amène ici aujourd'hui ? »

« Depuis combien de temps tu y penses ? »

« Qu'est-ce qui se passerait si dans 3 mois rien n'avait changé ? »`,
        note: "Tu cherches le VRAI pourquoi (santé / image / énergie / business), pas le 'je veux perdre 3 kg' de surface."
      },
      {
        label: "📊 Avant le body scan — préparer le moment WOW",
        text: `« Maintenant on va faire un body scan complet — pas juste le poids, mais ta masse musculaire, ton hydratation, ta graisse viscérale, ton âge métabolique.

Tu vas voir des chiffres que tu n'as jamais vus. Pas pour te juger — pour comprendre. »`,
        note: "Tu poses le cadre. La personne sait qu'elle va découvrir des choses, et que c'est OK."
      },
      {
        label: "📊 Pendant le body scan — commenter sans drama",
        text: `« Bon, ton hydratation est à 47%, idéal c'est 55-60%. Ça explique probablement [fatigue / mauvaise récup / fringales]. »

« Ta masse musculaire est correcte, on la garde. C'est ton vrai capital. »

« Ta graisse viscérale est à [X], objectif on descend à [Y] sur 90 jours. Faisable. »`,
        note: "Tu commentes calmement, factuellement. Pas de drama. Pas de 'oh là là c'est grave'."
      },
      {
        label: "💊 Présentation programme — l'angle solution",
        text: `« Voilà ce que je te propose pour ce que tu m'as raconté et ce que je vois.

3 produits. 1 mois. Pas plus.

[Produit 1] pour [bénéfice]. [Produit 2] pour [bénéfice]. [Produit 3] pour [bénéfice].

Tu pars avec ça, on se voit chaque semaine, et au bout de 30 jours on refait un body scan complet. »`,
        note: "Tu vends UNE transformation, pas un catalogue. Maximum 3 produits. Plus tu en proposes, moins elle achète vraiment."
      },
      {
        label: "🤝 Closing — choix limité",
        text: `« Tu préfères qu'on attaque par 4 semaines ou 1 mois complet ? »

(silence — tu te TAIS, même si ça dure 30 secondes)`,
        note: "JAMAIS 'tu veux démarrer ?' (oui/non). Toujours un choix entre 2 options qui mènent au OUI."
      },
      {
        label: "🌟 Phrase de fin — l'engagement coach",
        text: `« Mon rôle n'est pas de te vendre des produits.

Mon rôle, c'est que dans 30 jours, tu sois fier·e de toi. »

(silence, regard, sourire)`,
        note: "À garder POUR LA FIN, jamais au début. C'est ce qui transforme la transaction en engagement."
      },
      {
        label: "🌱 Demande de recos — la phrase magique",
        text: `« Avant que tu partes : qui dans ton entourage aurait besoin du même regard que je viens de te donner ? »

(silence, attendre 3 noms minimum)

« Et qui d'autre tu vois ? »`,
        note: "Demande à la fin du bilan, pas avant. 3 noms minimum. Le 2ème est souvent le meilleur."
      }
    ]
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "tk-bilan-03",
    slug: "presentation-programme-script",
    category: "bilan",
    title: "Script de présentation programme — version 4 semaines",
    description: "Le script copier-coller pour présenter un programme 4 semaines de manière claire et engageante.",
    kind: "script",
    format: "popup",
    profile: "tous",
    icon: "📋",
    durationMin: 3,
    tag: "Programme",
    contentMarkdown: `## Présenter un programme — 90 secondes max

**Principe** : tu ne vends pas des produits, tu vends une **transformation sur 4 semaines**. Maximum 3 produits. Tu finis par un choix limité, et tu te TAIS.`,
    scripts: [
      {
        label: "📋 Trame complète à adapter",
        text: `« Bon [Prénom], voilà ce que je te propose.

D'après ce qu'on a vu ensemble — [reprendre 1-2 points du diagnostic] — je te recommande un programme de 4 semaines avec 3 produits.

**1.** Le Formula 1 chaque matin en remplacement du petit-déj' classique. Ça te donne 25g de protéines, 21 vitamines + minéraux, en moins de 200 kcal. Ça cale, et ça lance la journée du bon pied.

**2.** Le Concentré d'Aloe dans ton verre d'eau du matin. Ça soulage la digestion et améliore l'absorption des nutriments.

**3.** [3ème produit ciblé : tisane / collagène / pdm selon le besoin].

Le tout sur 4 semaines. On fait un point chaque semaine ensemble en visio ou message — je te suis pas à pas.

Au bout des 30 jours, on refait un body scan complet, et on voit où on en est.

Tu préfères qu'on attaque par 4 semaines ou 1 mois complet ? »

(silence — tu attends qu'elle parle en premier)`,
        note: "Adapte les produits à SON besoin (pas un copier-coller). Le silence à la fin est non-négociable."
      },
      {
        label: "💰 Si la personne demande le prix",
        text: `« Le pack 4 semaines complet est à [montant]. 

Si on le ramène au quotidien, ça fait [montant divisé par 30] € par jour — c'est moins qu'un café et une viennoiserie.

La vraie question c'est : est-ce que ta santé vaut un café par jour pendant 4 semaines ? »`,
        note: "Mensualise toujours. Compare à un truc concret du quotidien. Et reformule en valeur, pas en coût."
      },
      {
        label: "⏸️ Si elle dit 'je vais réfléchir'",
        text: `« OK je comprends. 

Juste pour t'aider à réfléchir : qu'est-ce qui te fait douter ? Le prix, le timing, ou autre chose ? »

(silence, écouter la VRAIE objection)`,
        note: "« Je vais réfléchir » cache toujours une vraie objection. Demande-la directement, sans agressivité."
      }
    ]
  }
];

// =============================================================================
// 💪 SUIVI & FIDÉLISATION
// =============================================================================

export const TOOLKIT_SUIVI: FormationToolkitItem[] = [
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "tk-suivi-01",
    slug: "templates-suivi-jours",
    category: "suivi",
    title: "Templates de suivi J+1 / J+3 / J+7 / J+14 / J+30",
    description: "Les 5 messages systématiques qui font qu'un client tient les 30 jours et redemande.",
    kind: "phrase-pack",
    format: "popup",
    profile: "tous",
    icon: "📅",
    durationMin: 4,
    tag: "Suivi",
    contentMarkdown: `## Le rythme qui fait la différence

**80% des clients qui abandonnent** le font dans les 7 premiers jours, par manque de connexion. Le suivi, c'est pas optionnel — c'est ton job principal après le closing.

**Format** : vocal WhatsApp > message texte. Ta voix porte de l'humain.`,
    scripts: [
      {
        label: "📞 J+1 — Le check post-démarrage",
        text: `Salut [Prénom] !

Alors, comment ça s'est passé ce matin ? T'as réussi à faire ton premier shake ? Tu l'as senti comment au goût et au niveau ressenti ?

Raconte-moi tout, même les petits détails. C'est important que je voie comment tu vis ça les premiers jours.`,
        note: "Vocal idéal. Tu créés la routine d'échange dès le jour 1."
      },
      {
        label: "📞 J+3 — La première bascule",
        text: `Hey [Prénom] !

3 jours qu'on est partis ensemble — comment tu te sens ? Niveau énergie, sommeil, faim ?

Souvent c'est là que les premiers signes apparaissent. Raconte-moi ce que tu remarques, même petit.`,
        note: "À J+3 le corps réagit. Tu valides les premiers ressentis = elle se sent vue."
      },
      {
        label: "📞 J+7 — Le moment WOW (et la demande de recos)",
        text: `Coucou [Prénom] !

1 semaine déjà ! On fait le point ?

Comment tu te sens globalement ? Si tu devais résumer en 1 phrase ce que ça a changé pour toi cette semaine, ce serait quoi ?

PS : si tu te sens prête, dis-moi qui dans ton entourage aurait besoin du même regard que je t'ai donné. Pense à 3 personnes minimum.`,
        note: "C'est LE moment de demander les recos. Le client EST l'argument vivant à J+7."
      },
      {
        label: "📞 J+14 — Le re-engagement",
        text: `Hey [Prénom] !

2 semaines ! On est pile au milieu.

Souvent c'est ici que la motivation flanche un peu. Du coup, comment tu te sens niveau routine, plaisir, résultats ? T'as remarqué quoi de différent depuis le début ?

On fait un mini-bilan en visio cette semaine ?`,
        note: "Propose une visio = montre que tu es là. Souvent à J+14 ils ont besoin d'un boost."
      },
      {
        label: "📞 J+30 — Le bilan final + reconduction",
        text: `[Prénom], 30 jours qu'on bosse ensemble ! 🙌

On fait notre body scan complet quand cette semaine ? Mardi 18h ou jeudi 19h ?

J'ai hâte de voir tes chiffres. Et après on parle de la suite ensemble, parce que là c'est juste le début.`,
        note: "PROVOQUE le RDV physique. C'est là que tu reconduits + remontes en gamme + demandes de nouvelles recos."
      },
      {
        label: "🎁 Bonus : si elle a un super résultat à J+7",
        text: `[Prénom] je suis trop fier·e de toi !

Tu m'as autorisée à partager ton résultat ? J'aimerais que tu sois la prochaine inspiration de l'équipe. Bien sûr seulement si tu es à l'aise.`,
        note: "Demande TOUJOURS la permission avant de partager. Et propose-lui de devenir un témoignage = elle se sent reconnue."
      }
    ]
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "tk-suivi-02",
    slug: "phrase-magique-recos",
    category: "suivi",
    title: "La phrase magique pour demander des recos",
    description: "Comment formuler ta demande de recos à chaud sans avoir l'air mendiante. Timing + script + relance.",
    kind: "script",
    format: "popup",
    profile: "tous",
    icon: "🌟",
    durationMin: 3,
    tag: "Recos",
    contentMarkdown: `## La reco vaut 10 prospects froids

**90% des distri ne demandent jamais de recos.** Trop peur de déranger, ou ils oublient. Pourtant c'est là que ton activité décolle.

**Timing** : à chaud, après le 1er résultat visible (J+7 à J+14). Pas avant (rien à dire), pas après (effet WOW retombé).`,
    scripts: [
      {
        label: "✨ La phrase magique — version directe",
        text: `« Avant que tu partes / qu'on raccroche, j'ai une question :

Qui dans ton entourage aurait besoin du même résultat que tu vis là ? »

(silence — attend la réponse)`,
        note: "Cible le RÉSULTAT (qu'elle vit), pas le produit. Elle te recommande à ses proches qui ont le même problème qu'elle avait."
      },
      {
        label: "🔄 Si elle te donne 1 nom — relance pour le 2ème",
        text: `« Super, [Nom 1] ça me parle.

Et qui d'autre tu vois ? »

(silence)

« Allez, donne-moi 3 personnes, en 30 secondes, sans réfléchir. »`,
        note: "Le 2ème nom est souvent le meilleur. Le 1er est réflexe, le 2ème est réflexion."
      },
      {
        label: "🤝 Activer la reco à 3 voix — script à passer",
        text: `« Top ! Tu sais quoi, plutôt que je l'appelle moi froidement, est-ce que tu peux lui passer un coup de fil ou un vocal devant moi ?

Tu lui dis juste : 'Hey [Reco], je te passe ma coach [Toi], elle veut juste te dire bonjour.'

Et tu me passes le téléphone. Ça prend 30 secondes et ça change tout. »`,
        note: "Une reco activée à chaud = 80% de RDV calé. Une reco non activée = 20%. C'est la VRAIE technique qui fait grimper."
      },
      {
        label: "🎯 Si elle dit 'je sais pas, j'ai personne'",
        text: `« Pas de souci, je comprends.

Juste réfléchis-y dans la semaine — quand tu vas voir tes amis ou collègues, observe qui galère avec [problème qu'elle avait elle-même]. T'auras 2-3 noms qui te viennent.

On en reparle dimanche ? »`,
        note: "Ne force pas. Plante la graine. Re-pose la question 7 jours après — souvent elle aura des noms."
      }
    ]
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "tk-suivi-03",
    slug: "reveiller-client-pause",
    category: "suivi",
    title: "Réveiller un client en pause",
    description: "Le client qui ne re-commande pas depuis 30, 60 ou 90 jours. Comment le rouvrir sans pression.",
    kind: "phrase-pack",
    format: "popup",
    profile: "tous",
    icon: "⏰",
    durationMin: 3,
    tag: "Réactivation",
    contentMarkdown: `## Le silence n'est pas un non

**Un client en pause** n'a pas dit non. Il a juste lâché parce que la vie l'a happé. Ton job : lui rappeler doucement que tu existes, sans culpabilisation.`,
    scripts: [
      {
        label: "📨 J+30 sans recommande — le rappel doux",
        text: `Coucou [Prénom] !

Je faisais le tour de mes clients préférés, je voulais prendre des nouvelles. Comment tu vas ?

T'as pas re-commandé ce mois-ci, du coup je me dis : t'as fait une pause, t'as rejoint un autre rythme, ou t'as juste oublié dans le rush ?

Aucun jugement, je veux juste savoir comment tu vas vraiment.`,
        note: "Tu donnes 3 portes de sortie possibles → elle peut répondre franchement sans avoir honte."
      },
      {
        label: "📨 J+60 — la valeur ajoutée",
        text: `Salut [Prénom] !

Ça fait un moment qu'on s'est pas parlé. J'espère que tu vas bien.

J'ai pensé à toi parce que [bénéfice spécifique : nouveau produit / nouvelle promo / saison en cours]. Ça pourrait t'intéresser de [bénéfice concret] sans repartir sur un programme complet.

T'as 5 min pour qu'on en parle ?`,
        note: "Reviens avec une RAISON concrète, pas juste un 'tiens je pense à toi' vague. Une nouveauté, une promo saisonnière, un challenge équipe."
      },
      {
        label: "📨 J+90 — la dernière relance",
        text: `Hey [Prénom],

Je voulais juste te dire que ma porte est toujours ouverte. Pas de pression, vraiment.

Si tu veux qu'on se cale un café ou un appel un jour pour faire le point — sans engagement — dis-moi.

Bises et belle journée à toi.`,
        note: "Tu fermes en élégance. Si elle revient dans 6 mois, ça sera fluide. Si elle revient jamais, tant pis."
      },
      {
        label: "✅ Elle répond — comment relancer",
        text: `Trop content·e d'avoir de tes nouvelles !

Et toi sur le côté santé, comment tu te sens en ce moment ? Tu as gardé certaines de nos bonnes habitudes ou la vie a repris le dessus ?`,
        note: "Pose la VRAIE question (santé / habitudes), pas la question business directe. La porte business s'ouvre après."
      }
    ]
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "tk-suivi-04",
    slug: "objections-reponses",
    category: "suivi",
    title: "Les 7 objections + réponses pré-câblées",
    description: "C'est cher / Pas le temps / Mon conjoint / J'ai déjà essayé / C'est pyramidal / Je connais quelqu'un / Je vais réfléchir.",
    kind: "phrase-pack",
    format: "popup",
    profile: "tous",
    icon: "🛡️",
    durationMin: 5,
    tag: "Objections",
    contentMarkdown: `## Une objection prévue n'est plus une objection

**C'est juste une étape.** Mémorise ces 7 réponses, fais-les tourner en role-play avec ton sponsor. Au bout de 4 semaines, tu réponds en réflexe.`,
    scripts: [
      {
        label: "💰 « C'est cher »",
        text: `« Je comprends. Faisons le calcul ensemble : le programme c'est [X] €, divisé par 30 jours = [X/30] €/jour.

C'est moins qu'un café + une viennoiserie le matin.

La vraie question : est-ce que ta santé pendant 30 jours vaut un café par jour ? »`,
        note: "Mensualise + compare à un truc quotidien anodin. Reformule en valeur."
      },
      {
        label: "⏰ « J'ai pas le temps »",
        text: `« Justement, c'est pour les gens qui n'ont pas le temps que c'est fait.

Le shake du matin = 90 secondes à préparer. Plus rapide qu'aller acheter une viennoiserie en bas. Et tu manges DANS ta voiture / ton métro / ton bureau.

Tu vois le problème là — tu crois que tu n'as pas le temps de prendre soin de toi, mais c'est exactement ce qu'on règle. »`,
        note: "Retourne l'objection en bénéfice. C'est PARCE QUE elle n'a pas le temps que c'est pour elle."
      },
      {
        label: "💑 « Je dois en parler à mon conjoint »",
        text: `« Bien sûr, c'est normal d'en parler à deux.

Pour t'aider, qu'est-ce qui pourrait le/la rassurer le plus selon toi : le côté santé, le budget, ou la durée d'essai ?

Et au fait — il/elle pourrait nous rejoindre pour la prochaine séance ? Beaucoup de couples font le programme ensemble, c'est encore plus efficace. »`,
        note: "Ne dévalorise JAMAIS le conjoint. Au contraire, propose-lui de s'inviter dans le projet."
      },
      {
        label: "🔄 « J'ai déjà essayé un truc comme ça »",
        text: `« Ah ouais ? Raconte, qu'est-ce que t'avais essayé et qu'est-ce qui n'a pas marché selon toi ? »

(écoute attentivement)

« OK je comprends. Du coup ce qui change ici, c'est [point spécifique : suivi humain / qualité produits / méthode personnalisée]. C'est exactement le truc qui faisait défaut dans ce que t'as essayé. »`,
        note: "Écoute D'ABORD. Tu identifies le vrai blocage, puis tu différencies sur le point sensible."
      },
      {
        label: "⚠️ « C'est de la vente pyramidale ? »",
        text: `« Bonne question, je préfère qu'on la pose direct.

Herbalife c'est de la **vente directe** depuis 1980, dans 90+ pays, avec des produits réels, distribués en pharmacie aux US notamment.

La différence avec une pyramide illégale : ici tu peux totalement bénéficier des produits comme cliente sans jamais te lancer dans le business. Et si tu veux te lancer dans le business, tu vends de vrais produits à de vrais clients — pas à des gens qui en revendent à d'autres dans le vide. »`,
        note: "Pose le sujet calmement, factuellement. La transparence désamorce."
      },
      {
        label: "👤 « Je connais quelqu'un qui en fait »",
        text: `« Ah cool ! Et ça se passe comment pour cette personne ?

(écoute)

Ce qui est sympa avec moi, c'est qu'on bosse ensemble en proximité — tu me retrouves chaque semaine, je suis là pour te répondre. Si tu te sens plus à l'aise avec elle, fonce. Si tu veux essayer avec moi, je serais ravi·e de t'accompagner. À toi de voir. »`,
        note: "JAMAIS dénigrer un autre distri. Tu reste pro. Mets en avant TON service personnel."
      },
      {
        label: "🤔 « Je vais réfléchir »",
        text: `« Bien sûr, c'est important de prendre le temps.

Juste pour t'aider — qu'est-ce qui te fait douter exactement ? Le prix, le timing, ou autre chose ? »

(silence, écoute la VRAIE objection)

« On peut peut-être trouver une solution ensemble. »`,
        note: "« Je vais réfléchir » cache toujours une vraie objection. Demande-la directement. C'est ELLE qui te répond, pas toi qui devines."
      }
    ]
  }
];

// =============================================================================
// 🚀 BUSINESS & 100 CLUBS — La pièce maîtresse : Visio à 3
// =============================================================================

export const TOOLKIT_BUSINESS: FormationToolkitItem[] = [
  // ───────────────────────────────────────────────────────────────────────────
  // ⭐ PIÈCE MAÎTRESSE : VISIO À 3
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "tk-business-01",
    slug: "visio-a-3-protocole",
    category: "business",
    title: "⭐ La Visio à 3 — le multiplicateur de force",
    description: "Le vrai secret des distri qui décollent vite. Le moment où ton sponsor t'aide à closer un prospect en visio à 3 voix. Protocole complet : pré-brief, déroulé, post-brief.",
    kind: "page",
    format: "page",
    profile: "tous",
    icon: "📞",
    durationMin: 15,
    tag: "Pièce maîtresse",
    contentMarkdown: `## Pourquoi la visio à 3 change TOUT

> *« J'ai vu des distri grimper de débutant à Sup en 6 mois grâce à ça.
> Et d'autres rester débutants 3 ans parce qu'ils n'osaient pas la demander. »*

---

### 🎯 Le concept

**Une visio à 3 = ton prospect + toi + ton sponsor (ou ton up-line ou Thomas/Mél).**

Pas un truc fancy. **30 minutes maximum**. Tu parles peu, ton expert parle, le prospect écoute.

C'est l'arme **#1 du closing en MLM**. Et c'est gratuit. Et tu peux la faire dès demain matin.

---

### 🪄 Pourquoi ça marche

**Effet 1 — Crédibilité instantanée.**
Tu es nouveau·elle dans le métier ? Pas grave. Ton sponsor a 3 ans d'expérience, des résultats, une équipe. **L'autorité passe sur lui/elle, pas sur toi.**

**Effet 2 — Preuve sociale.**
Quand le prospect voit qu'il y a TOI + un sponsor expert, il comprend qu'il y a un **système**, pas un démarchage solo. Ça rassure énormément.

**Effet 3 — Tu apprends EN VIVANT.**
Tu observes ton sponsor répondre aux objections, présenter, closer. **5 visios à 3 = 50 visios solo en apprentissage.** C'est ton vrai bootcamp.

**Effet 4 — Ton prospect te voit comme une équipe.**
Quand il signera, il ne signera pas avec une coach isolée — il signera avec **un collectif** qui va l'accompagner. Vendu.

---

### 🛠️ Le protocole — 3 phases

#### 📞 Phase 1 — LE PRÉ-BRIEF (10 min, AVANT la visio)

**Toi → Ton sponsor**

Tu envoies un message ou un vocal 24h avant :

> *« Salut [Sponsor] ! J'ai un prospect [Prénom] qui m'intéresse. Voici son profil :*
> - *Âge / situation : [résumé]*
> - *Ce qu'il/elle veut : [objectif]*
> - *Son blocage principal : [ex : prix / temps / conjoint]*
> - *Notre historique : [combien de fois échangé, où on en est]*
>
> *Je voudrais qu'on cale une visio à 3 mardi 19h. Tu confirmes ? »*

**Pourquoi c'est crucial** : ton sponsor arrive **préparé** sur la situation, pas en improvisation. Il sait quoi mettre en avant pour CETTE personne.

---

#### 🎙️ Phase 2 — LA VISIO (30 min, déroulé minute par minute)

**Minute 0-2 — Toi : présentation + transmission**

> *« Salut [Prospect] ! Merci d'être là. Je te présente [Sponsor], c'est mon mentor depuis [X mois/ans]. Je voulais qu'il/elle te rencontre parce qu'il/elle a une expérience que je n'ai pas encore, et je sais qu'il/elle pourra te répondre mieux que moi sur certaines choses.*
>
> *[Sponsor], je te laisse un peu te présenter ? »*

**Tu te tais. Tu laisses ton sponsor prendre la main.**

---

**Minute 2-7 — Ton sponsor se présente + crée du lien**

Ton sponsor va se présenter en 2-3 min (parcours, pourquoi Herbalife, résultats). Puis il/elle pose **2-3 questions** au prospect pour créer du lien et confirmer ce que tu as dit en pré-brief.

**Toi pendant ce temps** : tu hoches la tête, tu prends des notes (vraies), tu écoutes. **Tu ne parles pas.**

---

**Minute 7-20 — Le sponsor répond aux blocages**

Le sponsor enchaîne sur **LE blocage principal** identifié au pré-brief, et le traite avec son expérience.

> *« [Prospect], [Toi] m'a dit que ce qui te freinait c'était [blocage]. Je te comprends, c'est exactement ce que [moi/un autre client] a vécu au début. Voilà ce qu'on a fait… »*

Le sponsor raconte une **histoire personnelle ou client** qui désamorce le blocage. **Toujours une histoire, jamais des arguments théoriques.**

---

**Minute 20-25 — Le closing par le sponsor**

> *« Du coup [Prospect], qu'est-ce qui te ferait dire OUI là maintenant ? »*

Ton sponsor closer. Tu le laisses faire. **Tu n'interviens pas.**

Si le prospect dit oui : ton sponsor te re-passe la main pour les détails admin.

> *« Top, [Toi] va te recontacter dans la journée pour caler le démarrage et la commande. [Toi], tu prends le relais ? »*

---

**Minute 25-30 — Reprise par toi + clôture**

> *« Top [Prospect] ! Du coup je te recontacte en fin de journée pour qu'on cale la commande et qu'on prépare ton démarrage. Tu sais quoi, je suis super contente que tu sois là.*
>
> *[Sponsor], merci à toi, on se rappelle ! »*

Tu remercies, tu raccroches.

---

#### 📞 Phase 3 — LE POST-BRIEF (5 min, APRÈS)

**Toi → Ton sponsor**

Vocal ou message rapide :

> *« Merci ! Du coup [Prospect] dit OUI, je l'appelle dans 1h pour la commande. T'as remarqué quoi sur la conversation ? Qu'est-ce que j'aurais pu faire mieux ? »*

**Pourquoi c'est crucial** : tu progresses à chaque visio. Ton sponsor te coache sur ton attitude, ta posture, ce que t'as bien fait, ce que t'as raté. **5 post-briefs = un saut de niveau.**

---

### ⚠️ Les 5 erreurs à NE PAS faire

**1. Ne pas faire de pré-brief.**
Ton sponsor arrive sans contexte → il improvise → conversion divisée par 2.

**2. Parler pendant la visio.**
Tu interviens, tu sur-explique, tu confirmes ce que dit le sponsor. STOP. **Tais-toi.**

**3. Programmer une visio sans avoir un VRAI prospect.**
Pas un curieux. Pas un ami que tu veux convaincre. **Un prospect qualifié, prêt à closer**, avec un blocage identifié.

**4. Choisir le mauvais sponsor.**
Si ton sponsor direct est inactif, demande à Thomas/Mél ou à un Up Up. **L'expérience compte plus que la lignée stricte.**

**5. Ne pas faire de post-brief.**
Tu apprends rien. Tu refais les mêmes erreurs. Le post-brief c'est ton bootcamp.

---

### 📅 Combien en faire ?

**Au démarrage (J0 à J90)** : **2 visios à 3 par semaine**, avec ton sponsor. C'est ton bootcamp accéléré.

**Régime de croisière (Sup et +)** : 1 visio à 3 par semaine maximum. Le reste tu closes seul·e.

**Quand tu deviens leader** : tu passes de l'autre côté. **C'est toi qui es appelé·e** pour la visio à 3 par tes recrues. C'est là que tu sais que tu as basculé.

---

### 🎁 Bonus — Le format à 4 voix (ultime niveau)

**Toi + Ton sponsor + Ton sponsor de sponsor (Up Up) + Le prospect.**

Pour les **gros prospects business** (= candidats coach potentiels). C'est la cavalerie. 3 niveaux de hiérarchie qui parlent à 1 seul prospect = **conversion ~85%** dans les pratiques observées.

À utiliser parcimonieusement, sinon tu t'épuises tout le monde.

---

### ✅ Ta checklist — avant la 1ère visio à 3

- [ ] J'ai identifié 1 prospect précis (nom + situation + blocage)
- [ ] J'ai contacté mon sponsor avec le pré-brief 24h+ avant
- [ ] J'ai confirmé le créneau visio des 3 (Zoom / Google Meet / WhatsApp Visio)
- [ ] J'ai prévenu le prospect : *« Je serais avec mon mentor [Sponsor], qui a 3 ans d'expérience, il/elle pourra mieux te répondre que moi sur certaines choses. »*
- [ ] J'ai préparé un post-brief immédiat (5 min après la visio)
- [ ] Je me suis dit mentalement : **« Je parle peu. Je laisse mon sponsor mener. J'écoute. »**

---

> *« La visio à 3, c'est l'arme la plus puissante du MLM, gratuite et sous-utilisée. Si tu en fais 50 dans tes 6 premiers mois, tu deviens Sup. Garanti mathématiquement. »*`
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "tk-business-02",
    slug: "dmo-checklist-quotidienne",
    category: "business",
    title: "DMO — la checklist quotidienne (5 IPA)",
    description: "Tes 5 actions quotidiennes non-négociables pour atteindre Supervisor.",
    kind: "checklist",
    format: "popup",
    profile: "tous",
    icon: "✅",
    durationMin: 2,
    tag: "Pilotage",
    contentMarkdown: `## Les 5 IPA — chaque jour, sans exception

**IPA = Income Producing Activities.** Hors IPA = pas du business, c'est du décor.

Tu coches ces 5 cases chaque jour. Si tu n'en coches pas 5, **tu n'as pas travaillé aujourd'hui**, peu importe combien d'heures tu as passées sur l'app.

---

### ✅ Checklist du jour

- [ ] **5 invitations qualitatives** (vocal WhatsApp ou appel — pas de texte sec)
- [ ] **2 follow-ups** sur des prospects en cours (relance avec valeur)
- [ ] **1 nouveau contact ajouté** à ta liste (rencontre, réseaux, reco)
- [ ] **1 vocal personnel** à un membre de ton équipe (ou client actif)
- [ ] **1 contenu publié** (story, reel, post — lifestyle, pas pitch)

---

### ⏰ Le rituel matin (10 min)

1. Tu ouvres cette checklist
2. Tu notes ton **objectif principal du jour** : *« Aujourd'hui je veux… »*
3. Tu identifies **2 personnes prioritaires** à contacter
4. Tu visualises **1 bonne nouvelle** qui pourrait tomber aujourd'hui

### 🌙 Le rituel soir (5 min)

1. Tu coches les actions réalisées ✅
2. Tu notes **3 victoires du jour** (même petites)
3. Tu écris **1 chose à ajuster** demain
4. Tu prépares les 2 priorités du lendemain

---

### 🎯 Pourquoi ça marche

5 nouveaux clients/mois × 12 mois = ~60 nouveaux clients/an. + 3 récurrents. + 1 coach par mois. **Cette formule (5-3-1) répétée 12 mois = GET Team mathématiquement.**

Plus accessible que le 8-4-1 historique, plus tenable dans la durée. Pas magie, régularité.`
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "tk-business-03",
    slug: "charte-distributeur",
    category: "business",
    title: "Charte du Distributeur — à signer en J+1",
    description: "Le rituel d'engagement : signature distri + signature coach. PDF nominatif imprimable.",
    kind: "page",
    format: "page",
    profile: "nouveau",
    icon: "📜",
    durationMin: 10,
    tag: "Engagement",
    contentMarkdown: `## Pourquoi cette charte

> *Une charte non signée n'engage personne. Une charte signée devient une chaîne positive qui te tient quand vient la tempête.*

À signer **dans les 24h après ton inscription**. À imprimer. À afficher dans ton bureau.

---

### 📜 Ma charte de distributeur Lor'Squad

**Je, soussigné·e [Prénom NOM], membre de la team Lor'Squad,**

m'engage solennellement, à partir de ce jour le [date], à :

---

#### 🌱 Mon éthique

- Mettre **l'humain avant le business** dans chaque interaction
- Ne jamais promettre de résultats que je ne peux garantir
- Recommander uniquement des produits que **je consomme moi-même**
- Respecter le rythme de chacun — client comme partenaire
- Refuser toute manipulation, exagération ou pression commerciale

---

#### 💪 Mon engagement personnel

- **5 actions IPA quotidiennes** minimum (ma checklist DMO)
- **1:1 hebdo** avec mon coach (non-négociable)
- **1 événement majeur** par trimestre (BBS / LDW / Extravaganza)
- **15 min de développement personnel** chaque jour
- **Honorer mes paroles** : si je dis « je rappelle vendredi », je rappelle vendredi

---

#### 🤝 Mon engagement équipe

- Tirer mon équipe vers le **haut** par mon exemple
- Célébrer les victoires de mes coéquipiers, même quand les miennes tardent
- Ne pas critiquer mon up-line ni la company en public
- Apporter des **solutions**, pas des plaintes
- Faire grandir au moins **3 personnes** à mon niveau actuel ou au-dessus

---

#### 🎯 Mon « pourquoi »

*Un projet concret, tangible, avec montant, délai ou bénéficiaire.*

> *Ex : « Emmener mes parents en croisière aux Caraïbes en 2027 »*
> *Ex : « Financer les études de mes 2 enfants sans crédit »*
> *Ex : « Quitter mon CDI pour reprendre ma vie en main avant fin 2026 »*

**Mon pourquoi** : ____________________________________________

---

#### 📅 Mon objectif 12 mois

- **Rang visé** : ___ (Supervisor / World Team / GET / Millionaire / President's)
- **Revenu visé mensuel** : ___ €/mois
- **Équipe visée** : ___ partenaires actifs

---

**Signé le [date] à [ville].**

**Signature du distributeur** : _______________

**Signature du coach (Thomas / Mélanie)** : _______________

---

### 💎 Ce que tu fais avec une fois signée

1. **Imprimer** — A4, qualité.
2. **Afficher** — dans ton bureau, ton entrée, là où tu la verras chaque jour.
3. **Photographier** — la version signée, l'envoyer à ton sponsor + Thomas/Mél.
4. **Partager (optionnel)** — story Instagram avec tes engagements. Effet de cohérence sociale = +30% de tenue.`
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "tk-business-04",
    slug: "feuille-reconnaissance",
    category: "business",
    title: "Feuille de Reconnaissance — paliers + récompenses",
    description: "Pour chaque palier atteint, une récompense pré-définie. Le moteur intime qui te fait tenir 12 mois.",
    kind: "page",
    format: "page",
    profile: "tous",
    icon: "🏆",
    durationMin: 10,
    tag: "Engagement",
    contentMarkdown: `## Tu obtiens ce que tu traques

> *Tu ne te fatigues pas à atteindre des objectifs. Tu te fatigues à atteindre des objectifs **sans récompense prévue**.*

Pour chaque palier que tu atteins, tu **t'offres** une récompense que tu as choisie **à l'avance**. Pas après. **Avant.**

---

### 🎯 Mes paliers + mes récompenses

| Palier | Date cible | Date réelle | Ma récompense |
|---|---|---|---|
| 1ᵉʳ client | ___ | ___ | ___ |
| 500 PV cumulés (Senior Consultant) | ___ | ___ | ___ |
| 1ᵉʳ distri parrainé | ___ | ___ | ___ |
| 2 500 PV (QP) | ___ | ___ | ___ |
| **Supervisor (4 000 PV)** | ___ | ___ | ___ |
| 1ᵉʳ chèque royalties | ___ | ___ | ___ |
| World Team | ___ | ___ | ___ |
| 1ᵉʳ événement majeur | ___ | ___ | ___ |
| **GET Team** | ___ | ___ | ___ |
| **Millionaire Team** | ___ | ___ | ___ |
| **President's Team** | ___ | ___ | ___ |

---

### 💡 Comment choisir tes récompenses

- **Tangibles** : pas « plus de liberté », plutôt « un week-end à Lisbonne »
- **Significatives** : qui te font **vraiment** vibrer
- **Progressives** : du petit (un dej resto) au grand (une voiture, un voyage, une maison)
- **Visibles** : photo punaisée dans ton bureau ou fond d'écran téléphone

---

### 📸 Ta vision board

Une vision board avec **5 photos** représentant tes 5 plus grandes récompenses futures. À mettre :

- Sur ton fond d'écran téléphone
- Au-dessus de ton bureau
- En story Instagram quand tu as un coup de mou (ancrage public)

---

### 🚫 Les 3 erreurs classiques

**1. Récompenses trop tardives** → tu craques avant.

**2. Récompenses trop floues** → ton cerveau ne les voit pas.

**3. Ne pas se récompenser** → burn-out garanti dans 18 mois.

---

### 🛠️ Action cette semaine

- Complète au minimum les **3 premiers paliers**
- Choisis 1 récompense **achetable dès ton 1ᵉʳ client**
- Mets-la dans ton agenda : *« Je m'autorise à me l'offrir dès que coché »*`
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "tk-business-05",
    slug: "calculateur-strategy-plan",
    category: "business",
    title: "Calculateur Strategy Plan — projection 12 mois",
    description: "Combien d'invits / bilans / clients pour atteindre +300 €, +1000 €, ou +3000 €/mois ? Calcul direct.",
    kind: "page",
    format: "page",
    profile: "sup_plus",
    icon: "🧮",
    durationMin: 8,
    tag: "Calculateur",
    contentMarkdown: `## Ton GPS chiffré sur 12 mois

> Arrête de te demander *« combien d'invits par jour ? »*. Demande-toi d'abord *« je veux gagner combien ? »*. Le reste se calcule.

---

### 💰 Pose-toi la bonne question

De combien tu as **vraiment** besoin par mois ?

- **+100 €/mois** pour respirer
- **+300 €/mois** pour des projets
- **+1 000 €/mois** pour un vrai complément
- **+3 000 €/mois** pour changer de vie
- **+10 000 €/mois** pour devenir le coach principal de ta famille

---

### 🧮 Le calcul magique (calibrage France)

**Hypothèses** :
- 1 VP = 1,50 € retail
- Marge perso Supervisor = 50%
- Panier moyen client = 75 VP
- 1 RO (commission) = 1,50 €

| Revenu visé | Clients actifs | Bilans/mois | Invits/jour |
|---|---|---|---|
| +100 €/mois | 2-3 | 5-7 | 2-3 |
| +300 €/mois | 5-7 | 12-15 | 4-5 |
| +1 000 €/mois | 15-20 | 30+ | 8-10 |
| +3 000 €/mois | 15-20 + 1-2 coachs | 30+ | 10-12 |
| +10 000 €/mois | 20+ + 5-8 coachs actifs | 40+ | 12-15 + duplication |

---

### 🔑 La conversion qui compte

En moyenne :

- **3 invitations** = **1 bilan**
- **2 bilans** = **1 client**
- **10-15 clients** = **1 candidat coach**

Donc pour avoir **1 nouveau client par jour** : **6 invitations qualitatives quotidiennes**.

---

### 🛠️ Action cette semaine

1. Choisis ton chiffre cible (même approximatif).
2. Note tes invits / bilans / closings de la semaine passée.
3. Calcule l'**écart** entre ton activité actuelle et ton objectif.
4. Réajuste ton agenda en conséquence.

---

### ⚠️ Avertissement

> Ces chiffres sont des moyennes indicatives, pas des promesses. Tes résultats dépendent de ton marché, ton réseau, ta régularité.
>
> Voir [Herbalife.com/STE](https://herbalife.com/STE) pour les statistiques officielles.

---

### 💎 La règle non-négociable

> Tu ne deviendras pas riche en faisant 5 invits par jour.
>
> Tu deviendras riche en faisant **5 invits par jour, régulièrement, pendant 12-24 mois**.

C'est tout.`
  }
];

// =============================================================================
// AGGREGATE — toutes les categories merged + helper de lookup
// =============================================================================

export const FORMATION_TOOLKIT: FormationToolkitItem[] = [
  ...TOOLKIT_PROSPECTION,
  ...TOOLKIT_BILAN,
  ...TOOLKIT_SUIVI,
  ...TOOLKIT_BUSINESS,
];

export function getToolkitItemBySlug(slug: string): FormationToolkitItem | undefined {
  return FORMATION_TOOLKIT.find((item) => item.slug === slug);
}
