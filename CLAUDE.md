# Lor'Squad Wellness — Notes d'architecture

Ce fichier contient les règles et patterns clés à respecter pour ne pas
reproduire les régressions passées. Relire avant tout gros chantier.

---

## 🚀 3 Chantiers en attente (mémo Thomas 2026-05-05)

Décidés ensemble, ordre validé par Thomas, à attaquer dans cet ordre :

### Chantier A — Jauge rentabilité (€ net mois)
**Pour qui** : admin + référent + distri (chacun voit la sienne).
**Idée** : sur le dashboard distri, une jauge ronde animée affiche en
euros la rentabilité nette du mois. Rouge (< 200€) → Orange (200-500€)
→ Vert (> 500€). Click = popup détail (nombre programmes vendus,
CA brut, marge, projection fin de mois, vs mois précédent).

**Calcul** :
- Revenus = somme(prix × qty) des `pv_client_products` actifs du mois
- Marge selon rang : 25 % distri / 35 % SC / 42 % SB / 50 % Sup
- Marge brute (€) = revenus × marge_pct

**Tables à créer** :
- `herbalife_margins (rank, margin_pct, valid_from, valid_to)` — config
  des marges par palier (peut évoluer Herbalife)

**Composants à créer** :
- `<RentabilityGauge />` SVG arc animé (rouge→vert)
- `<RentabilityDetailModal />` popup breakdown
- RPC SQL `get_rentability(user_id, month)` qui retourne le calcul agrégé
- Widget Co-pilote en haut + page `/rentabilite` complète

**Effort** : ~5h. Impact distri énorme (motivation = voir leur fric).

### Chantier B — Relances clients dormants V2
**Pour qui** : distri (chacun ses clients).
**Idée** : le matin sur Co-pilote, un spotlight type *« 3 clients dormants
= ~600 PV à reconquérir »* avec liste cliquable + bouton "Lancer la
relance" qui ouvre le template message multi-canal.

**Logique détection** :
- Client actif (lifecycle = active ou pause)
- Pas de `pv_client_products` actif OU
- Dernière commande > 60 jours (paramétrable)

**Effort** : ~3h. Cohérent avec A (booste les revenus visibles).

### Chantier C — Intégration paiement Square
**Pour qui** : tous les distri (Mandy → client direct).
**Idée** : Mandy clôture panier programme → bouton "Demander paiement"
→ Lor'Squad génère un Square Payment Link via API + envoie SMS au
client → client paie en CB → webhook Square notifie l'app → tablette
POS Square (au comptoir du club) reçoit l'info → produits prêts.

**Évite** : chèques, virements, double-saisie au comptoir.

**Stack proposée** :
- Square Web Payments API (compte déjà ouvert avec Mel)
- SMS via fonction native Square ou Twilio (à arbitrer)
- Edge Function `create-payment-link` côté Lor'Squad
- Webhook `square-payment-status` → update `pv_client_products.paid_at`

**Risques** :
- Tarification SMS Twilio si on passe par eux (~0.05€/SMS)
- Gestion remboursements
- Anti-double-paiement (idempotency keys)
- Sandbox Square testing

**Effort** : 2-3 jours minimum. Dépendance externe forte (API Square +
webhooks Vercel + numéro SMS).

---

## 🧠 Mémo PV / Bizworks (2026-05-05)

**Bizworks** = l'app officielle Herbalife qui détaille les commandes
(perso, club, clients VIP, distri downline). Source de vérité PV
chez Herbalife.

**Lor'Squad** ne tracke que les commandes passées via fiche client
dans l'app (`pv_client_products`). Donc l'app sous-estime
systématiquement les PV réels (manque : conso perso, conso club sur
place, ventes hors-fiche, commandes downline).

**Décision Thomas (2026-05-05)** : ne PAS dupliquer Bizworks. L'app
ne doit pas devenir un comptable de PV détaillés, c'est l'usine à
gaz. Si un jour on veut afficher des PV justes :

→ **Solution mini** : 1 champ admin "PV total Bizworks ce mois" qui
override la jauge mensuelle Co-pilote. 30 sec/mois, 1h de dev.
Pas plus loin.

**Notif Plan d'action PV** (mémo précédent) : reste un chantier futur,
dépend qu'on ait des chiffres justes — donc dépend de cette décision.

---

## ⚠️ Règle du livrable complet (2026-05-04)

**Une feature N'EST PAS livrée tant que :**

1. ✅ Le code est déployé en prod
2. ✅ Une entrée `app_announcements` est créée pour annoncer la nouveauté
   aux distri (titre + body + emoji + accent + link_path vers la feature)
3. ✅ Si la feature a une UX non-évidente : une fiche dans le hub
   `/developpement` (Academy onglet ou nouvelle page tuto type
   `/developpement/flex-explique`)

**Pourquoi** : sans annonce, les distri (et toi dans 3 mois) ignorent que
la feature existe. C'est le piège classique du "j'ai poussé, je verrai
plus tard pour le tuto". Résultat : feature morte.

### Comment ajouter un changelog distri

Soit via une migration SQL (pour seed initial / push contrôlé) :
```sql
insert into public.app_announcements
  (title, body, emoji, accent, link_path, link_label, audience, published_at)
values
  ('Titre court', 'Description claire 1-2 phrases.', '🎯', 'gold',
   '/ma-nouvelle-route', 'Découvrir', 'all', now())
on conflict do nothing;
```

Soit via un script admin (à venir, page `/admin/announcements`).

### Tables impliquées

- `app_announcements` : les annonces (title, body, emoji, accent, link)
- `user_announcement_reads` : tracking (user_id, announcement_id, read_at)
- RLS : lecture publique selon audience, write = admin only

### UI auto-câblée

- 🔔 Cloche dans header sidebar + mobile (compteur unread)
- ✨ Popup auto à la 1ère ouverture après publication (max 1×/jour/annonce
  via `localStorage.ls-spotlight-shown-<id>`)
- 📰 Page `/developpement/nouveautes` qui liste l'historique complet

Composants : `AnnouncementBell`, `AnnouncementSpotlight`, `NouveautesPage`.

---

## Hub développement (sidebar Option B, 2026-05-04)

La sidebar suit le pattern **Option B** : 1 entrée "Mon développement"
qui regroupe Academy / Formation / Boîte à outils / Cahier de bord /
Simulateur EBE / FLEX expliqué / Nouveautés. Toutes les routes existantes
restent intactes (`/academy`, `/formation`, `/cahier-de-bord`, etc.) — le
hub `/developpement` est juste un point d'entrée centralisé en cards.

**Quand on ajoute une nouvelle feature éducative ou perso distri** :
ajouter une card dans `src/pages/DeveloppementHubPage.tsx::CARDS[]`.
Ne PAS ajouter de nouvelle entrée sidebar (sinon on retombe dans le
problème "11 items illisibles").

**Sidebar finale** (7-9 items selon rôle) :
1. Co-pilote
2. FLEX
3. Agenda
4. Messagerie
5. Dossiers clients
6. Suivi PV
7. Mon équipe (admin only)
8. Mon développement
9. Paramètres

---

## Theme system (note 2026-11-04)

Lor'Squad utilise un système de tokens CSS dans `src/styles/globals.css` :

- `:root` = thème **Dark Premium** (défaut) — gold #C9A84C / teal #2DD4BF
- `html.theme-light` = thème **Light Premium** — gold #B8922A / teal #0D9488

**Règle absolue** : **tous les composants UI** doivent utiliser
`var(--ls-*)` pour les couleurs. **Jamais** de `#HEXVALUE` hardcodé dans
un `.tsx`. Si tu en vois un, c'est un bug pour le theme system.

### Préparer multi-thèmes (Ocean / Sunset / Forest)

3 templates commentés sont prêts en bas de `globals.css`. Pour activer :
1. Décommenter le bloc `html.theme-ocean { ... }` (ou autre)
2. Étendre `useTheme.ts` pour cycler entre 3+ thèmes au lieu de
   light/dark
3. Ajouter un selector de thème dans `/parametres`
4. Persister le choix en localStorage

### Audit theme-awareness (à faire si bug visuel signalé)

Recherche `grep -r "#[0-9A-F]" src/` pour traquer les couleurs
hardcodées. Refonte 2026-11-04 a déjà fixé les inputs default
(`@layer base` n'utilisait pas les tokens → corrigé).

---

## Chantier visuel bilan (2026-11-04, 6 étapes)

Refonte profonde de `NewAssessmentPage` — la page coeur de l'app, vue
par les distri ET par les clients pendant les RDV.

| # | Livré | Commit |
|---|-------|--------|
| 1 | **Polish atomiques** Field + ChoiceGroup (delight + theme fix) | `084b239` |
| 2 | **Slide horizontal directionnel** entre étapes (forward/back) | `818b106` |
| 3 | **Body Scan** : `BodyMetricCard` avec progress bars relatives aux plages saines (sex-aware ranges Tanita) + dot zone status | `d1abd6f` |
| 4 | **Concept step** : framing premium (gradient + glow + badge "Signature Lor'Squad" + tagline gradient) | `9f7d51a` |
| 5 | **StepHero v2** : glow flottant + dot pulse + entrance staggered | `5d15f44` |
| 6 | **Theme system docs** + 3 templates futurs (ocean/sunset/forest) | en cours |

### Composants créés

- `src/components/assessment/BodyMetricCard.tsx` — wrap input body-scan
  avec progress bar 0→scaleMax + dot zone status (in / under / over)
- Hero avec animations CSS keyframes : `ls-hero-glow-float`,
  `ls-hero-dot-pulse`, `ls-hero-fade-up` (stagger 80ms)

### Patterns à reproduire (multi-thèmes safe)

- `color-mix(in srgb, var(--ls-gold) X%, transparent)` pour les
  backgrounds tintés
- Animations CSS pures (pas de framer-motion ajouté → pas de bundle
  bloat)
- `@media (prefers-reduced-motion: reduce)` pour désactiver
- Tous les emojis sont `aria-hidden="true"`

---

## Roadmap chantiers à venir (mémo 2026-04-28)

Status à date des 5 chantiers brainstormés (A → E) :

### 🟢 C. Refonte page /clients — V2 livrée
**Fait** : chips filtres rapides, vue Kanban DnD, lifecycle badges,
sélection multiple, bulk lifecycle change, **bulk message multi-canal**,
**tri par colonne** (intelligent / nom / dernier bilan), **export CSV**
de la sélection.

**Reste à faire (V3 si besoin)** :
- Tri par PV mois (nécessite agrégation côté front depuis pvTransactions)
- Sélection persistée entre navigations (localStorage)
- Filtre par owner via query param (`?owner=<userId>`) déjà passé depuis
  AnalyticsPage drill-down → ClientsPage doit le lire et pré-sélectionner

### 🟢 D. Analytics admin — V2 livrée
**Fait** : KPIs (bilans/clients/PV/conversion), funnel, top produits,
top distri, tendance 12 mois, alertes ops, **delta vs M-1** (bilans +
clients_actifs + PV), **drill-down distri** (modale détaillée avec PV
6 mois + lifecycle + top clients).

**Reste à faire** :
- **Export PDF** du rapport mensuel (réutilise pattern certificat /
  playbook : html2canvas + jsPDF). Cible : 1 page A4 résumé pour Mel.
- **Alertes signaux faibles** plus fines : "Distri X a chuté de 60 % en
  PV ce mois" (déjà compute en SQL via delta% per distri).
- **Drill-down produit** : cliquer sur un Top produit → modale avec liste
  clients qui l'ont commandé + tendance achats 6 mois.

### 🟢 E. Templates messages WhatsApp — V1 livrée (sans IA)
**Fait** : 5 templates avec `applicable()` + interpolation contextuelle,
modale popup multi-canal (WhatsApp/SMS/Telegram/Copier), aperçu éditable,
**bulk message multi-clients** (cf. C V2).

**Reste à faire (V2 avec IA)** :
- Bouton "✨ Suggérer par IA" qui appelle Claude API avec contexte client
  → réponse personnalisée non-templatée (rejoint chantier B).
- Templates personnalisables par coach (ajout / édition / favoris).
- Historique d'envois par client (table `client_message_log`).

### 🔴 A. Onboarding CLIENT (PWA) — PAS FAIT
3-4 sections courtes (~30 sec chacune) côté app client `/client/:token` :
1. "Bienvenue [Prénom]" — Hero + RDV + ce qu'on y fait
2. "Comment lire ton évolution" — graphique poids, points de départ
3. "Tes conseils du jour" — alertes sport, assiette idéale, routine
4. "Comment me parler" — onglet Coach Messagerie

**Implémentation** :
- Réutilise pattern TourRunner mais simplifié pour mobile / PWA
- Auto-démarrage 1ère visite, skippable, persisté via
  `client_app_accounts.onboarded_at`
- Migration SQL : ajouter colonne `onboarded_at timestamptz null`

**Effort** : 1.5-2 jours. ROI rétention élevé.

### 🔴 B. Lor'Squad AI (Assistant IA intégré) — PAS FAIT
**Vision** : FAB en bas à droite app coach → modale chat type ChatGPT
avec contexte automatique du client courant.

**Cas d'usage** :
- "Comment je gère un client qui veut arrêter ?"
- "Suggère un programme pour Marie objectif perte de poids + sport"
- "Rédige un message de relance douce client en pause depuis 20j"

**Architecture** :
- Edge function `lor-squad-ai` : reçoit `{ message, contextClient?,
  contextRoute }` → appelle Claude API (Anthropic) → renvoie réponse
  markdown.
- Anthropic API key dans secrets Supabase.
- Composant `AICoachAssistant` : FAB + modal chat + suggestions rapides.
- Système de prompts : prompt de base "Tu es Lor'Squad AI…" + injection
  du contexte client en JSON.
- Cost tracking : table `ai_usage_log` (user_id, tokens, cost_eur) +
  monthly cap par distri.
- V2 optional : RAG sur base de connaissance Herbalife (PDF programmes,
  scripts ventes…).

**Effort** : 3-4 jours. Différentiateur produit majeur. À planifier
quand prêt à signer compte Anthropic API + monitorer coûts récurrents.

---

## Chantier futur : Stratégie d'action PV (mémo 2026-04-29)

L'utilisateur a noté l'objectif PV mensuel comme un levier qu'on ne
travaille qu'à moitié. La colonne `users.monthly_pv_target` existe
maintenant (migration `20260429180000`) et l'éditeur est dans
**Paramètres > Profil**. La jauge Co-pilote la consomme déjà.

**À faire dans un futur chantier (pas encore prioritaire)** : à partir
de la cible PV + de l'historique 3 derniers mois, générer une
stratégie d'action concrète au matin :

- Si PV en retard vs prorata mois → suggérer X relances clients
  prioritaires (top consommateurs de la base, basés sur
  `pv_transactions` historique).
- Si PV en avance → suggérer prospection ou build (recruter / monter
  en grade).
- Afficher un widget "Plan du jour PV" sur Co-pilote qui chuchote :
  "Tu es à 4 200 / 13 000 PV au 15 du mois. Plan : 3 relances clients
  identifiés (Marie, Karim, Lila), gain attendu ~1 800 PV."

Mécanique probable : RPC `get_pv_action_plan(user_id)` qui regroupe
historique PV / clients dormants / projection. UI : nouvelle card sur
Co-pilote, sous la jauge, déclenchable manuellement (bouton "Plan
d'action").

Le quiz Academy `q1` ("Quel est le seuil PV mensuel par défaut ?")
reste valable mais peut être enrichi en V2 avec une question
contextuelle sur la stratégie.

---

## Règle datetime — `timestamptz` partout (depuis 29/04/2026)

**Toutes les colonnes datetime des tables métier sont en `timestamptz`.**
Migration de référence : `20260429160000_datetime_to_timestamptz.sql`
(convertit `clients.next_follow_up`, `assessments.next_follow_up`,
`follow_ups.due_date` en supposant que les valeurs existantes étaient
en heure Paris).

Front : toujours envoyer un ISO 8601 avec offset (`new Date(...).toISOString()`
produit du `Z`). La fonction utilitaire `serializeDateTimeForStorage`
dans `src/lib/calculations.ts` gère ça.

❌ **NE JAMAIS créer une nouvelle colonne datetime en `timestamp`** (sans
tz). Postgres l'interprète comme heure locale serveur, ce qui drift
selon le DST et le navigateur. `timestamptz` toujours.

---

## Workflow Dev/Prod (depuis 27/04/2026)

Lor'Squad utilise 2 branches actives :

- `claude/focused-pike` = **PRODUCTION** (Mélanie + équipe coach + clients)
- `dev/thomas-test` = **DEV/TEST** (Thomas uniquement, preview Vercel séparée)

**Pour toute nouvelle feature** :
- Créer `feat/X` depuis `dev/thomas-test` (PAS depuis `claude/focused-pike`)
- Tester sur l'URL dev Vercel, valider, puis merger en prod

**Pour tout fix urgent** (régression bloquante) :
- Créer `fix/X` depuis `claude/focused-pike`
- Merger direct en prod, puis sync vers `dev/thomas-test` pour rester aligné

**Base Supabase partagée** : les 2 environnements parlent à la même DB.
Les migrations impactent donc **les 2 environnements**. Coordonner avant
toute migration.

Workflow complet : `docs/DEV_WORKFLOW.md`

---

## Page remerciement post-bilan (2026-04-27)

### Route dédiée

`/clients/:clientId/bilan-termine?token=<recap_token>&firstName=<prénom>`

Page plein écran (`BilanTermineePage` → `ThankYouStep`) qui s'affiche
automatiquement après "Enregistrer et terminer le bilan". Remplace
l'ouverture de `ClientAccessModal` qui était utilisée pour ce flow.

### Contenu (6 sections)

1. **Header héro** — logo gold, titre Syne 32px "Félicitations, [Prénom] !"
2. **QR code** — `QRCodeSVG` (qrcode.react) 240×240 sur card blanche
   + bouton copie URL tronquée + toast "Lien copié"
3. **Partage multi-canal** — WhatsApp (`wa.me`) + SMS (protocole `sms:`) +
   Telegram (`t.me/share/url`)
4. **Parrainage** — card teal avec CTA gold "Recommander à un ami" →
   ouvre WhatsApp avec message de parrainage
5. **Avis Google** — bouton étoiles → lien Google Reviews (TODO Thomas :
   remplacer la constante `GOOGLE_REVIEW_URL` dans `ThankYouStep.tsx`)
6. **Retour discret** — lien "Retour à la fiche client"

### Règle visuelle : respect du thème actif

Toutes les couleurs passent par `var(--ls-*)` → la page suit le toggle
clair/sombre de l'app coach. Le QR code reste sur **fond blanc** dans les
2 modes (scannabilité obligatoire). En mode sombre, un **glow gold**
subtil entoure la card QR pour l'effet wow.

**Astuce coach** : pour un effet maximal en RDV, basculer l'app en mode
sombre juste avant de cliquer "Enregistrer et terminer le bilan". La page
remerciement s'affiche en dark premium, le QR ressort spectaculairement,
bascule retour en clair après le RDV.

### Modale `ClientAccessModal` (toujours utile)

La modale reste importée par `ActionsTab` et `ClientDetailPage` pour :
- Bouton "Envoyer l'accès" dans la fiche coach
- Usage hors-bilan (follow-up, régénération accès, etc.)

Elle n'est plus utilisée dans le flow post-save du bilan initial.

### Contrat query params

- `token` : `client_recaps.token` (uuid) — renvoyé par l'insert
  `client_recaps` dans `handleSaveAssessment`
- `firstName` : `form.firstName` (utilisé pour "Félicitations [Prénom]")
- Les 2 params sont URL-encodés via `encodeURIComponent`

Si absents (permalink, refresh) : fallback via `AppContext.getClientById`
pour récupérer le prénom, `window.location.origin` pour construire l'URL.

---

## Architecture data app client (2026-04-26)

### Principe

L'app client (`ClientAppPage` + `ClientHomeTab` + `ClientProductsTab`) ne
fait **JAMAIS** de SELECT direct sur Supabase pour les tables sensibles
(`clients`, `follow_ups`, `pv_client_products`). Elle passe par l'Edge
Function **`client-app-data`** qui :

1. Valide le token client contre `client_app_accounts.token` (uuid unique)
2. Fait les SELECT en `service_role` → bypass RLS propre et auditable
3. Renvoie un payload normalisé (ISO 8601 pour les dates)

### Flow

```
[ Navigateur client ]
    ↓ GET /functions/v1/client-app-data?token=<uuid>
    ↓ Authorization: Bearer <anon_key>
[ Edge Function ]
    ↓ SELECT client_id FROM client_app_accounts WHERE token = ?
    ↓ parallel SELECT:
    ↓   - clients (current_program, notes)
    ↓   - follow_ups (due_date, status, type)
    ↓   - pv_client_products (active=true)
    ↓ JSON response, Cache-Control: 30s
[ Hook useClientLiveData ]
    ↓ fetch initial au mount
    ↓ refetch on window focus (debounce 5s anti-spam Safari ↔ PWA)
[ ClientAppPage merge ]
    ↓ liveData > snapshot (priorité live sur figé)
    ↓ setData avec overrides program_title + next_follow_up
[ Components ]
    ↓ ClientHomeTab (data.program_title, data.next_follow_up)
    ↓ ClientProductsTab (liveProducts prop)
```

### Fallback snapshot

Si l'edge function plante ou timeout, le front fallback silencieusement
sur les snapshots `client_app_accounts.*` (program_title, next_follow_up).
L'expérience reste fluide même en cas de panne réseau.

Pour `pv_client_products`, le fallback affiche un empty state (pas de
snapshot de produits disponible dans `client_app_accounts`).

### Règle RLS (leçon du 25/04/2026)

❌ **NE JAMAIS créer de policy RLS permissive** sur `clients`,
`follow_ups`, `pv_client_products` pour permettre au client app de lire
ses données directement. Raison : `client_app_accounts.client_id` est
`text` alors que `clients.id` est `uuid`. Un cast `::uuid` dans une
policy permissive plante à l'évaluation si une seule row de
`client_app_accounts` contient un `client_id` non-UUID valide → **toute
la table clients devient illisible**, même pour les coachs admin.

Toute évolution data côté client app passe par l'edge function.

### Comment ajouter une nouvelle donnée visible par le client

1. Ajouter le SELECT dans `supabase/functions/client-app-data/index.ts`
2. Étendre le type `ClientLiveData` dans `src/hooks/useClientLiveData.ts`
3. Lire la nouvelle donnée dans le composant qui en a besoin (via
   `liveData.*` ou via le merge si on veut aussi un fallback snapshot)
4. Ajouter un fallback snapshot si la donnée est critique (sinon empty
   state acceptable)
5. **NE JAMAIS créer de SELECT direct** dans ClientAppPage /
   ClientHomeTab / ClientProductsTab

### Déploiement

```bash
supabase functions deploy client-app-data --no-verify-jwt
```

`--no-verify-jwt` parce que le client app n'a pas de JWT Supabase
(auto-login custom via token UUID). L'auth se fait DANS la function
par le lookup `client_app_accounts.token`.

---

## Règles RLS — cast cross-type

**Jamais `::uuid`** dans une policy permissive. Si besoin de comparer
`client_app_accounts.client_id` (text) avec `clients.id` (uuid) :

```sql
-- ✅ OK : cast sécurisé
WHERE clients.id::text = caa.client_id

-- ❌ DANGER : cast qui peut throw sur une row foireuse
WHERE caa.client_id::uuid = clients.id
```

Raison : Postgres évalue TOUS les policies permissifs en OR. Si UNE
seule ligne de `client_app_accounts` contient un `client_id` pas
UUID-valide, le cast plante et le SELECT entier remonte l'erreur.

---

## Garde-fou front — fetch silent fail

Le hook `lastFetchError` dans `AppContext` (côté coach, pas client) est
un garde-fou installé le 25/04/2026 après la frayeur RLS. Si un fetch
principal plante silencieusement, un bandeau rouge apparaît en haut de
l'app coach avec le message Supabase exact. **NE PAS retirer.**

---

## Branches & déploiement

- `main` : backup upstream (pas touché par moi)
- `claude/focused-pike` : branche de déploiement Vercel (production)
- `feat/*` : chantiers en cours, mergés vers `claude/focused-pike`

Vercel auto-deploy sur push vers `claude/focused-pike`.

Supabase : projet unique lié via `supabase link`, migrations poussées
avec `supabase db push --linked --include-all`, Edge Functions déployées
avec `supabase functions deploy <name>`.

---

## Edge Functions actives (15 au 2026-04-26)

| Function | Déclenchement | Rôle |
|---|---|---|
| `client-app-data` | fetch front (app client) | Migration RLS → service_role |
| `create-public-share-token` | fetch front (coach) | Gen token /partage |
| `resolve-public-share` | fetch front (anon) | Résolution token anonymisé |
| `generate-auto-login-token` | fetch front (coach) | Lien magique app client |
| `consume-auto-login-token` | fetch front (app client) | Auto-login PWA |
| `generate-distributor-invite-token` | fetch front (coach) | Invite distri |
| `consume-distributor-invite-token` | fetch front (onboarding distri) | Signup distri |
| `validate-distributor-invite-token` | fetch front (onboarding distri) | Check validité |
| `validate-invitation-token` | fetch front (onboarding client) | Check validité |
| `consume-invitation-token` | fetch front (onboarding client) | Signup client |
| `submit-prospect-lead` | fetch front (form Welcome) | Création lead anon |
| `send-push` | fetch front + Edge interne | Envoi Web Push |
| `morning-suivis-digest` | cron 0 7 * * * | Digest matin |
| `rdv-imminent-notifier` | cron */5 * * * * | Notif RDV imminent |
| `new-message-notifier` | trigger Postgres | Notif nouveau message |

Toute nouvelle edge function = ajouter ici.

---

## Chantier Prise de masse (2026-04-24)

Logique "prise de masse / sport" de bout en bout dans le bilan.

### Étapes de bilan dynamiques
`src/pages/NewAssessmentPage.tsx` : `ALL_STEPS: StepDef[]` avec
`visible(form)` par étape. 2 étapes sport-only : `sport-profile` (parle-moi
de ton sport) et `current-intake` (tes apports actuels). Masquées si
`form.objective !== 'sport'`. Chaque JSX render bloc est adressé par
`currentStepId` (type `StepId`, jamais par index).

### Types et modèle
`src/types/domain.ts` : widening `Objective` avec 6 sous-objectifs sport
(mass-gain / strength / cutting / endurance / fitness / competition).
Nouveaux types : `SportFrequency`, `SportType`, `SportSubObjective`,
`IntakeMoment`, `IntakeValue`, `CurrentIntake`, `SportProfile`. Champs
optionnels `sportProfile` et `currentIntake` sur `AssessmentRecord`.

### Calculs
`src/lib/calculations.ts` :
- `computeProteinTargetSport(weightKg, subObjective)` → {min, max, target}
- `computeWaterTargetSport(weightKg, frequency)` → mL/jour clampé 2000-5000
- `estimateCurrentProteinIntake(currentIntake)` → g/jour

### Recommandation de boosters
`src/lib/assessmentRecommendations.ts::recommendBoosters(profile, age)`.
6 règles métier déterministes (collations, liftoff, cr7, hydrate,
créatine, collagène). Marqués d'une étoile + fond teal dans le step
"Programme proposé" quand objective === 'sport'.

### Alertes sport (Apple Health-style)
`src/components/assessment/SportAlertsDialog.tsx` :
`detectSportAlerts({ profile, intake, weightKg, ... })` → 6 alertes
(hydration-low, protein-low, sleep-low, muscle-low, no-snack,
frequency-mismatch). Popup bloque `handleSaveAssessment` tant que non
acquittée (acknowledged).

### Résumé sport sur fiche client
`src/components/client-detail/SportSummarySection.tsx` inséré dans
l'onglet Actions (tab 5). 3 cards : Besoins (4 stats), Plan journée
(toggle sport/repos), Programme + boosters + lien WhatsApp.

### Migrations Supabase
- `20260424120000_sport_fields.sql` : élargit CHECK `objective` sur
  `clients` + `assessments`, ajoute colonnes `sport_frequency`,
  `sport_types`, `sport_sub_objective`, `current_intake`.
- `20260424130000_seed_sport_products.sql` : seed 8 produits sport/
  accessoire dans `pv_products`.

## Chantier Conseils app client (2026-04-24)

Refonte de l'onglet « Coaching » → « Conseils » + enrichissement de
l'onglet Évolution + section « Recommandés pour ta progression » dans
l'onglet Produits.

### Onglet Accueil (ClientHomeTab)
- Suppression du HERO interne : la salutation est portée par le bandeau
  haut de `ClientAppPage` (avatar + nom + meta programme). La carte RDV
  gold suit directement l'en-tête.

### Onglet Évolution
- Nouveau composant `EnrichedAssessmentHistory` (`src/components/client-app/`)
  qui affiche :
  - Point de départ (oldest assessment) distinct visuellement (3px gold
    + badge 📍 + row dédiée).
  - Jusqu'à 5 derniers bilans en ordre descendant.
  - Colonne « Évolution » calculée vs Départ, couleur selon l'objectif
    (weight-loss / sport mass-gain / sport cutting / sport default).
  - Responsive : cards stackées <480 px, table ≥480 px.
  - S'il n'y a qu'un seul bilan → Départ seul, pas de « 5 derniers ».

### Onglet Produits — section « Recommandés non pris »
- Nouvelle section dans `ClientProductsTab` sous « Mon programme actuel ».
- Titre : « 💡 Recommandés pour ta progression ».
- Source prioritaire : `liveData.recommendations_not_taken` (server-side).
- Fallback client-side : `recommendedProducts` moins `currentProducts`
  (match productId/ref ET nom normalisé).
- Card : bg coral 8 %, border 0.5px coral 40 %, radius 12. Titre Syne
  15 bold, prix gold, reason DM Sans 13 teal, CTA WhatsApp avec message
  prérempli (utilise `coach_whatsapp`).

### Onglet Conseils (nouveau)
Fichier : `src/components/client-app/ClientConseilsTab.tsx` + `.css`.
Propulsé par `liveData` (edge function étendue).

4 sections :
1. **Tes points d'attention** — cards issues de `sport_alerts`
   (6 règles recalculées server-side). Placeholder neutre si vide ou
   hors-sport.
2. **Ton assiette idéale** — SVG circulaire à 3 secteurs + légende
   détaillée. Répartition :
   - sport → 33 / 33 / 33 (Protéines / Glucides complets / Légumes)
   - weight-loss → 25 / 25 / 50 (plus de légumes)
3. **Ta routine quotidienne** — toggle « Jour sport / Jour repos » pour
   les sportifs (7 items sport, 5 items repos). 4 items pour
   weight-loss. Chaque item : emoji + heure gold + titre + sub-label.
4. **Tes conseils perso du coach** — quote-style card ; contenu issu de
   `liveData.coach_advice` (champ `assessments.coach_notes_initial`).
   Footer « — Thomas · [date du dernier bilan] ». Placeholder neutre si
   vide.

### Edge function `supabase/functions/client-app-data/index.ts`
Clés ajoutées au payload JSON (sans retirer l'existant) :
- `assessment_history: Assessment[]` (limit 20, ordre asc par date).
- `recommendations_not_taken: { productId, name, price?, reason? }[]` —
  diff server-side entre `assessments.questionnaire.recommendations`
  (latest) et `pv_client_products` actifs.
- `sport_alerts: { id, icon, title, detail, advice }[]` — recompute
  inline des 6 règles (hydration-low / protein-low / sleep-low /
  muscle-low / no-snack / frequency-mismatch) à partir de `sport_profile`,
  `current_intake` et `body_scan`. Réécriture en Deno car impossible
  d'importer `detectSportAlerts` (pipeline front React).
- `sport_profile: { frequency, types, subObjective, otherTypeLabel? }`
  — depuis les colonnes `sport_*` de l'assessment le plus récent.
- `current_intake: CurrentIntake | null` — depuis l'assessment le plus récent.
- `coach_advice: string` — `assessments.coach_notes_initial` (notes
  figées à la validation du bilan, pas le draft auto-save, pour éviter
  de remonter un brouillon au client).
- `client.objective` ajouté au sous-objet `client` pour les règles de
  coloration Évolution / assiette.

## Étape Programme du bilan — Boosters cliquables + Quantités (D-urgent, 2026-04-24)

### Composant `SelectableProductCard`
Source : `src/components/assessment/SelectableProductCard.tsx`. Unifié
pour les 3 rendus produit de l'étape Programme (`NewAssessmentPage.tsx`) :
- besoins détectés (`NeedProductGroup`),
- upsells optionnels,
- boosters sport (désormais cliquables, plus seulement décoratifs).

Props clés :
- `selected` + `onToggle` — pattern « Retenu / Retenir » identique à
  l'ancien `SuggestedProductCard` inline (retiré).
- `highlight?: { reason?: string }` — ⭐ + bordure `var(--ls-teal)` +
  fond `color-mix(in srgb, var(--ls-teal) 8%, var(--ls-surface2))`.
  Visuel uniquement, le toggle reste manuel (pas d'auto-ajout au ticket).
- `quantity` + `onQuantityChange` — active le stepper (cf. ci-dessous)
  quand le produit est `selected`.

### Composant `QuantityStepper`
Source : `src/components/assessment/QuantityStepper.tsx`. Stepper
− / [value] / + minimaliste, bornes par défaut 1-10, touch target
≥ 44 × 44, a11y complète (`aria-label`, `role="spinbutton"`,
`aria-valuenow/min/max`). Tokens `var(--ls-*)` uniquement, Syne pour la
valeur, radius 10.

### Champ parallèle `selectedProductQuantities`
Ajouté à `AssessmentQuestionnaire` (`src/types/domain.ts`) comme
`QuantityMap = Record<string, number>` optionnel. Pattern **non-breaking** :
- `selectedProductIds` reste la source de vérité de la SÉLECTION,
- `selectedProductQuantities[id]` porte la quantité, défaut 1
  (`getQty(id) = map[id] ?? 1`).
- `setQty` borne 1-10, round entier.
- Persisté en jsonb dans `assessments.questionnaire` (pas de migration).
- Les 9 consumers de `selectedProductIds` restent inchangés.

### Ticket du jour — `ProgrammeTicket`
`TicketAddOn` gagne un champ `quantity: number`. Les totaux sont
`Σ price * quantity` et `Σ pv * quantity`. La ligne d'ajout affiche
`Nom × N` + le prix total `(price × quantity).toFixed(2)€` quand
`quantity > 1`, sinon le nom seul.

### Boosters sport — PV = 0
`BOOSTERS` (dans `src/data/programs.ts`) n'a pas encore de champ `pv` —
on force `pv: 0` côté mapping ticket. À enrichir si/quand le référentiel
gagne un vrai PV booster.

### Hydratation flow édition (out of scope)
Le flow d'édition (`EditInitialAssessmentPage`) et le flow suivi
(`NewFollowUpPage`) ne relisent pas encore `selectedProductQuantities`
depuis un bilan existant. Hydratation reportée au prompt E.
