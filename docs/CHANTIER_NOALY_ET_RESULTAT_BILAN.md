# Chantier Noaly + Page « Résultat Bilan » — Brief maître

> Doc de compilation (2026-06-11). Regroupe **ce qui est fait**, **ce qui reste
> à faire**, et **les idées de Thomas** pour le gros dossier à venir : la page
> premium « Résultat bilan » envoyée manuellement par le coach.

---

## 1. Noaly — ce qui est FAIT (livré)

L'IA du club s'appelle **Noaly** (plus jamais « Lor'Squad AI »). Une seule edge
function `supabase/functions/noaly/index.ts`, multi-modes, loggée dans
`ai_usage_log` (tokens + coût €). **Tout fonctionne sans clé API** (503 « Noaly
arrive très bientôt » géré partout).

| Mode edge | Où | Rôle | État |
|---|---|---|---|
| `crm_message` | bouton ✨ sur cards CRM | message 1er contact / relance lead | ✅ prod |
| `coach_chat` | **NoalyFab** (bulle ✨ toutes pages coach) | chat + 3 outils front (chercher_client / clients_inactifs / ouvrir_page) | ✅ prod |
| `client_chat` | **ClientFaqChatbot** (PWA client, modale Aide) | Q/R nutrition + garde-fous santé + escalade coach | ✅ prod |
| `bilan_analysis` | **NoalyBilanPanel** (bilan physique, étape Programme) | synthèse + pitch coach + points + focus assiette | ✅ **dev/thomas-test** (reste recette + prod) |

**Bilans :**
- **ONLINE-A** ✅ prod : analyse Noaly à la fin du **bilan online** (nutrition,
  sans marque/produit, sans promesse chiffrée, oriente « ton coach te
  recontacte »). Stockée `online_bilans.ai_analysis`, affichée sur
  `BilanOnlineResultatsPage`.
- **ONLINE-B** ✅ prod : capture **Curieux** (a commencé l'étape 1 mais pas fini
  → `online_bilans.completed_at IS NULL`). Taux de complétion + relance dans le
  CRM (`useCuriousLeads` + panneau « 💭 Curieux »).
- **BILAN PHYSIQUE** ✅ dev (commit `ca6de25`, 2026-06-11) : Noaly à l'étape
  « Programme proposé » de `NewAssessmentPage`. Principe **assistant, pas pilote
  auto** — Noaly synthétise la logique déterministe (besoins/boosters/assiette/
  cibles) et **ne modifie jamais** le bilan ni la sélection produits.

### Réglages (secrets Supabase)
- `ANTHROPIC_API_KEY` — **à poser par Thomas** pour tout activer.
- `NOALY_MODEL` — défaut `claude-opus-4-8`. Option `claude-haiku-4-5` (≈ 5× moins
  cher) pour les usages volume (client_chat, crm_message). Le bilan/coach gagne
  à rester sur Opus (qualité du raisonnement).
- `NOALY_COACH_MONTHLY_TOKENS` (déf. 2 000 000) · `NOALY_CLIENT_DAILY_MSGS` (déf. 20).

---

## 2. Ce qui reste à FAIRE

### 🔴 Gros dossier — Page « Résultat Bilan » premium (LE chantier suivant)
Voir §3. C'est la priorité décidée par Thomas le 2026-06-11.

### 🟠 Chantier qualif — parcours d'onboarding post-lead (après la page Résultat)
Page dédiée enchaînée après la proposition :
« Noaly a analysé ✓ » → page programme (toutes infos) → connexion + **règlement /
RGPD** → « **choisis ta saveur** » → **scan l'app** + **1ʳᵉ pesée** +
**mensurations** + **rejoindre le canal Telegram**. Thomas : « très important très
même ». À designer ensemble.

### 🟡 Auto « n'a pas démarré »
Sur un lead/bilan qui ne convertit pas, Noaly prépare des questions/relances au
coach. Idée notée, pas commencée.

### 🟢 À part (nouvelle conversation) — Telegram + « cowork »
Moteur de contenu pro quotidien : visuels (Claude Design + connexion Canva) +
partage automatique sur le canal Telegram, en autonomie, en tirant les infos
programmes depuis l'app. **Conversation séparée.**

### ✅ Reste à Thomas (transverse)
1. `supabase secrets set ANTHROPIC_API_KEY=…` (+ éventuel `NOALY_MODEL`).
2. Recette du bilan physique Noaly sur dev → feu vert merge prod.
3. Remplir les liens YouTube des tutos (registre `src/data/tutorials.ts`).

---

## 3. Gros dossier — Page « Résultat Bilan » premium

### 3.1 Intention (mots de Thomas, 2026-06-11)
> Page d'après : **envoyée manuellement par le coach**, un lien type
> `labase360/Résultatbilan`. Page **premium** avec **résumé perso du bilan** et
> **la proposition**. Focus sur un **texte trouvé sur une vidéo** (les 5
> stratégies, cf. annexe). Puis créer la **page complète** (avec Claude Design si
> besoin) : **les programmes**, **ce que ça apporte**, **les bienfaits**, **le
> prix**, puis **l'intérêt de démarrer avec nous** — **groupes**, **« we do »**,
> **l'app de coaching sport**, etc.

### 3.2 Lecture / where it fits
C'est **le pont entre le bilan et l'engagement** : le client a fait son bilan
(online ou physique), le coach lui envoie un lien vers une page léchée qui
(1) lui renvoie une **analyse personnalisée** (effet « on a vraiment regardé TON
cas »), (2) l'**éduque** avec les 5 stratégies, (3) **propose le programme**
(valeur + bienfaits + prix), (4) donne **l'envie de démarrer ici** (communauté,
accompagnement, app sport). C'est l'amont visuel du **chantier qualif** (§2).

### 3.3 Structure de page — ✅ maquette V2 validée visuellement (2026-06-11)
Maquette : `public/mockups/resultat-bilan-v1.html` (thème public dark, Sora/
Inter/Syne, gradients teal/violet/coral). Ouvrable sur l'URL dev → `/mockups/
resultat-bilan-v1.html`. **9 sections :**
1. **Hero perso** — « Salut [Prénom], voici ce que ton bilan révèle » + coach.
2. **Ton bilan en un coup d'œil** — données réelles (objectif, poids, profil,
   signal clé). Honnête, pas de chiffres promis.
3. **✨ L'analyse de Noaly** — synthèse perso (réutilise `ai_analysis` /
   `bilan_analysis`).
4. **Tes 5 stratégies** — petit-déj / collations (marquées « Ta priorité ») /
   assiette / hydratation / activité + défi 21 j.
5. **Les programmes** — vraie échelle alignée sur `src/data/programs.ts` :
   **Découverte 159 € (prix d'appel)** / **Premium 234 € (best-seller)** /
   **Booster dès 277 €**. ⚠️ **Règle durée** (Thomas) : ce sont des **packs
   produits à prix fixe**, PAS des abonnements mensuels — ne jamais afficher
   « /mois ». Durée d'un pack = ajustée au rythme du client, pas imposée.
   **Travail commercial des prix d'appel / packs encore à faire avec Thomas.**
6. **Pourquoi démarrer avec nous** — communauté / « We Do » / app sport / suivi.
7. **Témoignages** — placeholder ; **brancher la section dédiée de Thomas**
   (carrousel `TestimonialsCarousel` existant).
8. **FAQ** — 5 questions (produits / résultats / repas / saveur / suivi).
9. **CTA** — « Je démarre » + « Réserver un appel » (porte d'entrée chantier qualif).

> Validé Thomas : rendu « très bien », ton chaleureux OK. Restent : finaliser le
> commercial des programmes/prix, et brancher témoignages + données DB au build.

### 3.4 Décisions à trancher avant de coder
- **Source / lien** : la page est rattachée à QUEL bilan ? online (`online_bilans`)
  / physique (`client_recaps`) / un token unifié pour les deux ?
- **Design** : on étend le **thème public V2** existant (`PublicShell`,
  `public-tokens`, Sora/Inter/Syne, gradients teal/violet/coral — rapide et
  cohérent) OU **maquette premium sur-mesure d'abord** (Claude Design) ?
- **Données programmes** (programmes / bienfaits / prix) : **registre statique**
  que Thomas remplit (façon `tutorials.ts`) OU **dynamique** depuis la DB ?
- **Part Noaly vs fixe** : l'analyse perso est-elle générée par Noaly (vivante)
  ou un gabarit où le coach choisit les blocs ? (les 5 stratégies restent fixes).

### 3.5 Briques déjà dispo à réutiliser
`PublicShell` + `public-tokens.ts` + `public-shell.css` (thème public dark/light),
patterns OG SPA (api/coach-meta), `RankPinBadge` / `CoachCredibilityBadges`,
`online_bilans.ai_analysis` (analyse déjà générée), `client_recaps` (token bilan
physique + page `/clients/:id/bilan-termine`).

---

## Annexe A — Script vidéo « Analyse personnalisée du bilan » (matière Thomas)

> Source : vidéo repérée par Thomas. Sert de **contenu fixe** pour la section
> « 5 stratégies ». À adapter au ton La Base 360.

**🎬 Intro** — « Salut, c'est [Prénom du coach] ! Merci d'avoir pris le temps de
remplir ton bilan bien-être. Ça montre que tu veux prendre soin de toi… 🎯 »

**1️⃣ Le petit-déjeuner — activer le métabolisme.** Un petit-déj mal équilibré
(trop calorique, pauvre en protéines/vitamines/minéraux) ralentit le métabolisme
→ perte de masse musculaire → perte de graisse plus dure + reprise aux écarts.
💡 Solution : petit-déj sous forme de **boisson nutritionnelle** calibrée
(protéines optimales + vitamines/minéraux + apport calorique contrôlé).

**2️⃣ Les collations — réguler l'énergie.** Des collations mal adaptées →
creux/fringales. 💡 Idéal : **10 g de protéines + ~150 kcal + un fruit**, entre
petit-déj/déjeuner ou déjeuner/dîner.

**3️⃣ Les repas principaux — l'assiette équilibrée.**
🍽 Déjeuner : ¼ protéines (volaille, poisson, œufs, tofu) · ¼ glucides complexes
(riz basmati, quinoa, patates douces, légumineuses) · ½ légumes colorés riches en
fibres + filet d'huile d'olive/colza.
🌙 Dîner : prioriser protéines + légumes, réduire les glucides (besoins moindres
le soir), petite portion de légumineuses si besoin.

**4️⃣ L'hydratation.** Soutient digestion, élimination des toxines, gestion des
fringales. 💡 Objectif **≥ 2 L/jour** (eau plate/pétillante, infusions/thés non
sucrés, eau citronnée).

**5️⃣ L'activité physique — la régularité avant l'intensité.** 💡 Minimum **30 min
de marche/jour** (en une fois ou sessions de 10-15 min). 🏋️ Pour aller plus loin :
**défi 21 jours** avec séances vidéo de 20 min, tous niveaux.

**🚀 Prochaine étape** — « Maintenant que tu connais ces 5 stratégies, je
t'envoie une 2ᵉ vidéo qui détaille le **fonctionnement du programme** et
l'accompagnement. 👉 Clique sur le lien, active le son 🔊. »

> (Deux variantes du script fournies par Thomas — quasi identiques ; ci-dessus la
> synthèse. Conserver le ton « tu », chaleureux, emojis parcimonieux.)
