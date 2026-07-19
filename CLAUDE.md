# Lor'Squad Wellness — Notes d'architecture

Ce fichier contient les règles et patterns clés à respecter pour ne pas
reproduire les régressions passées. Relire avant tout gros chantier.

---

## ✅ Roadmap à jour (2026-06-03)

> **Audit complet 2026-06-03** : roadmap re-synchronisée avec le code réel
> (le doc dérivait). Plusieurs items « à faire » étaient en fait livrés —
> voir sous-section « Confirmés livrés mais oubliés ».

### 🟢 Livrés en prod
- **Chantier Qualif — parcours post-paiement (prod 2026-07-16)** : route publique `/qualif/:token` (même token que `/resultat-bilan/:token`). Après paiement → identité+RGPD → **1re création de fiche client 100% self-serve** (edge `qualif-bootstrap`, idempotent) → saveurs F1/Thé/Aloé (multi-groupes, `src/data/flavorGroups.ts`, push coach) → scan appli (QR) → pesée (`ClientBaselineStep` réutilisé) → Telegram → « Ouvrir mon espace ». Edges `qualif-bootstrap`/`qualif-update`, table `client_qualif_onboarding`. + `InlinePaymentButton` (encaisser dès l'étape 11 du bilan) + bloc « Lien Résultat Bilan » sur fiche CRM détail (message prêt + lien seul). ⚠️ crée une vraie fiche à la fin — recette Thomas en cours. Reste optionnel : écran « récap avant paiement ».
- **Fix encaissement Square (prod 2026-07-16)** : `create-manual-payment-link` gérait uniquement Stripe → « pas activé » pour les coachs Square (Mon panier + fin bilan). Ajout bloc Square quick_pay. Config Square de Thomas dupliquée à Mélanie (2 admins, même compte). Voir table edge functions.
- **Chantier A — Jauge rentabilité** : `RentabilitePage` + composants + 7 migrations V1→V5
- **Chantier B — Relances clients dormants** : `DormantClientsWidget` + RPC `get_dormant_clients` + câblage Co-pilote V5 (PR #91)
- **Chantier #1 — Bilan Online + Leads** : pages publiques V2 + table `online_bilans` + edge `submit-online-bilan` + kanban Leads `/clients`
- **Chantier #2 — Check-list quotidienne V2** : page dédiée `/routine-du-jour` + chip topbar Co-pilote `☀️ X/5` + table `coach_daily_actions` + edge `daily-actions-notifier` cron 20h + fiche tuto + announcement (PR #91 V1, PR #92 V2 page dédiée — V1 popup auto retiré sur retour Thomas)
- **Chantier #3 — Prospection froide V5** : `/prospection` + 4 profils × 6 marchés × 10 sections + admin
- **Chantier #7 — Business V2** : `BusinessPage` SaaS emerald/cyan/violet
- **Chantier #10 — Badges coach** : 3 chips rang/bilans/ancienneté
- **Chantier #11 — Témoignages** : Form + carrousel + admin page
- **Onboarding client PWA (chantier C 2026-11-04)** : `ClientOnboardingTour` 4 slides + edge `client-app-mark-onboarded` + colonne `client_app_accounts.onboarded_at`. Tutorial 9 étapes désormais sur demande via FAQ chatbot (chantier C V2 2026-05-20)
- **D — Popup météo 5 jours (2026-05-05)** : `WeatherPopup` + `useWeatherForecast` (Open-Meteo no key, cache 30min, mapping WMO). Pill weather Co-pilote cliquable. CTA "Renseigne ta ville" si `users.city` absent.
- **Fix inbox messagerie** : limite globale 50 → 1000 (PR #91)
- **Fix messagerie `message_type` invisible (2026-06-08)** : l'edge `client-app-set-baseline` (onboarding mode `skip`) écrivait `message_type='message'`, valeur hors union → message client invisible dans la Messagerie (badge "+1" mais introuvable). Fix : edge → `'general'` ; backfill prod des 3 messages perdus (Bazard/Romane/Gabriel) ; `MessagesPage` catch-all (type inconnu → onglet « Demandes clients ») ; `InboxWidget` aligné sur `unreadMessageCount` ; **CHECK constraint** sur `client_messages.message_type` (échec écriture > perte silencieuse). Cf. règle « tout insert client_messages doit utiliser un type de l'union `domain.ts` ».

#### ✅ Confirmés livrés mais oubliés de la roadmap (audit 2026-06-03)
- **Plan d'action PV matin** : RPC `get_pv_action_plan` + hook `usePvActionPlan`, consommé sur Co-pilote V5 (était listé « à faire » à tort)
- **Newsletter privée** (La Base 360 News) : pages admin (`AdminNewslettersPage`/`AdminNewsletterEditPage`/`AdminNewsletterStatsPage`) + edges `dispatch-newsletter`/`send-newsletter-email`/`track-newsletter-view` + Resend. Seul le **volet public lead-magnet** reste à faire (#8)
- **Export PDF Analytics + Rentabilité** : `AnalyticsPdfReport` + `RentabilityPdfReport` (était listé « polish à faire »)
- **Features non documentées présentes en prod** : VIP Program, gamification/leaderboards, système Rang + qualifications Herbalife auto, Client XP, Charte distri signable, Analytics admin, Team tree/arborescence, Manual PV entries, Share public, onboarding distri complet
- **Leads (chantier 2026-06-03)** : modale détail réponses funnel + pré-évaluation personnalisée fin de funnel + stats prospection cliquables + suppression admin des leads (policy `prospect_leads_admin_delete`)

#### ⚠️ Règle programmes / produits (audit 2026-07-16 — à lire avant toute modif PV)
- **Source de vérité programme = `PROGRAM_CHOICES`** (`src/data/programs.ts`), la SEULE liste qui contient « À l'unité » (`unit`). `PROGRAMS_LEGACY` **exclut `unit`** (ligne 198) : ne JAMAIS l'utiliser pour résoudre le programme retenu d'un bilan. C'était la cause d'un bug majeur (programme vide → 0 produit → fiche + Co-pilote + PV cassés).
- **`resolvePvProgram` ne doit JAMAIS replier sur un programme à routine non vide.** Le repli est `unit` (`includedProductIds: []`). Avant il repliait sur Starter → tout titre inconnu (« À l'unité », « Programme a confirmer », « », « Libre ») injectait 3 produits **fantômes** (aloe-vera + the-51g + formula-1) → PV et rentabilité faux sur des clients qui n'avaient rien pris.
- **Le catalogue PV est DUPLIQUÉ** : `src/data/pvCatalog.ts` (front) et `api/update-assessment.ts` (Vercel, ne peut pas importer le front). Toute modif de l'un doit être répercutée sur l'autre.
- `clients.pv_program_id` contient **2 espaces d'id mélangés** en base (PV `premium` ET legacy `p-premium`) → les alias `p-*` dans `pvProgramOptions` sont **obligatoires**, ne pas les retirer.
- **Règle métier (Thomas)** : produits retenus au ticket ⇒ le client démarre (statut `active`, produits créés), même sans « démarré » coché à l'étape 12.
- **Ne jamais purger `pv_client_products` sans pouvoir les reconstruire** (`api/update-assessment.ts`) — l'ancien code supprimait tout puis sautait le re-seed = perte de données silencieuse.

#### ⚠️ Règle métier critique
Voir **`docs/HERBALIFE_PALIERS_REGLES.md`** (paliers, fenêtres glissantes, qualifications) — à lire AVANT toute modif sur le calcul PV / rentabilité / FLEX margins. Récupéré en prod le 2026-06-03 (était piégé sur une branche morte).

### 🔴 À faire (court terme)

**Quick wins**
- Push notif 20h `daily-actions-notifier` : le toggle `users.notif_daily_actions` est **déjà livré** (UI `NotificationsTab.tsx` + edge le consomme). Reste juste la **décision** de Thomas s'il la trouve agressive — pas de dev. (clarifié audit 2026-06-08)

_(plus aucun chantier court terme validé — tout livré, voir section moyen/long terme pour les gros chantiers à venir)_

### 🟡 À faire (moyen / long terme)

- ~~**Chantier C — Paiement Square**~~ ✅ **LIVRÉ** (audit 2026-06-14) : edges `create-payment-link` + `square-payment-webhook`, migration `payment_settings_and_orders` (tables `coach_payment_settings` + `bilan_orders`), UI `PaymentSettingsCard` (ProfilTab) + CTA caisse sur `BilanResultatPremiumPage`. Socle Square fonctionnel (prospect paie son programme depuis la page Résultat Bilan). Reste optionnel : flow « clôture panier au comptoir POS » du mémo d'origine.
- ~~**Lor'Squad AI**~~ ✅ **LIVRÉ** sous le nom **Noaly** (audit 2026-06-14) : edge `noaly` 4 modes (crm_message / coach_chat / client_chat / bilan_analysis) + FAB `NoalyFab` (câblé `AppLayout`) + table `ai_usage_log` (cost tracking). L'ancien « PAS FAIT / aucun code amorcé » était faux.
- **#5 i18n 6 langues** (5-8j) : geolocation + sélecteur drapeau + conversion monnaie (renommage Phase 2 livré, plus de bloqueur). **Aucun code amorcé** (confirmé audit 2026-06-14 : pas de i18next, pas de locales).
- ~~**#8 Newsletter — volet PUBLIC lead-magnet**~~ ✅ **LIVRÉ EN PROD** (2026-06-02) : chantier #8 COMPLET (étapes 8.1→8.12). Route publique `/news/:slug` (`PublicNewsletterPage`) + popup capture lead + image OG dynamique (html2canvas + Supabase Storage) + tracking webhooks Resend + page stats + envoi batch Resend (fix faux bounces). Admin : `/admin/newsletters` + éditeur + `/admin/newsletters/:id/stats`. (Audit 2026-06-05 : la ligne « reste à faire » était périmée.)
- **#6 Vidéos pédagogiques** : 🟢 **Infra livrée sur dev/thomas-test (2026-06-09)** — composant réutilisable `TutorialLink` (`src/components/tutorial/`) + `TutorialVideoModal` + **registre central `src/data/tutorials.ts`** (Thomas n'édite que ce fichier : coller l'URL YouTube dans `youtubeUrl` de la clé voulue). État vide = chip « 🎬 bientôt » non cliquable. Exemple câblé : `FlexExpliquePage` hero (clé `flex`). **Reste (Thomas)** : remplir les URLs + placer `<TutorialLink tutorialKey="…" />` où il veut. (le `VideoModal` interne de `FormationCategoryPage` reste pour la Formation.)
- **#13 Fiche distri** (clarifié audit 2026-06-08) : ⚠️ « #13 » recouvre 2 choses.
  - **13-A Fiche distri INTERNE** (`/distributors/:id`, gestion équipe admin) : ✅ **LIVRÉ** (composants `distributor-blocks/` mai 2026 + page 5 onglets + bouton « ⚡ Aperçu rapide » 13A.5 + resurfaçage 13B partout : Équipe/PV team/FLEX team/Team/Users/fiche client + annonce `20260518160000`). L'ancien « aucun code amorcé » était périmé.
  - **13-B Fiche distri PUBLIQUE** (`/coach/:slug`, vitrine prospection, double CTA bilan + recrutement) : ✅ **LIVRÉ** (audit 2026-06-14 : la ligne « à faire » était périmée). `CoachPublicProfilePage` (route `/coach/:slug` hors AppLayout) = hero avatar/initiale + nom + `CoachCredibilityBadges` (RPC publique `get_coach_credibility_by_slug`, rang masqué) + preuve sociale club + bio + **double CTA** (bilan gratuit + rejoindre l'équipe) + « comment ça se passe » 3 étapes + `TestimonialsCarousel`. Partage : carte `PublicProfileShareCard` (Paramètres). **OG complet** : `api/coach-meta.ts` (meta Open Graph par coach) + `api/og/coach.ts` (bannière 1200×630 satori). Reste optionnel : itérations design.
- _(Paiement Square + Lor'Squad AI ci-dessus : aucun code amorcé non plus — confirmé audit 2026-06-03)_

### 🟢 Polish opportuniste

- ~~Export PDF rapport mensuel Analytics~~ ✅ LIVRÉ (`AnalyticsPdfReport`)
- ~~Drill-down produit Analytics~~ ✅ LIVRÉ (`ProductDrilldownModal` câblé dans `AnalyticsPage` : liste clients + tendance achats 6 mois ajoutée 2026-06-14)
- ~~Tri par PV mois sur `/clients`~~ ✅ déjà livré (C V3, option « PV ce mois ↓ »). Corrigé audit 2026-06-09.
- Hydratation `selectedProductQuantities` dans Edit/Follow-up
- ~~Messagerie `AppContext` `limit(50)` global~~ ✅ déjà à `limit(1000)` (`AppContext.tsx:319`, depuis 2026-05-20). Ligne périmée — corrigé audit 2026-06-08.
- ~~Google Reviews URL placeholder dans `ThankYouStep.tsx`~~ ✅ URL réelle déjà en prod (`ThankYouStep.tsx:22`, La Base Verdun). Plus un placeholder — corrigé audit 2026-06-08.
- **Refacto hotspots** (audit `docs/audits/AUDIT_PHASE_3.5_REFACTO_CODEBASE.md`) : NewAssessmentPage ~4340L (a encore grossi), AgendaPage ~2280L, supabaseService ~2500L. **Opportuniste only** — pas de chantier refacto dédié. (tailles re-mesurées audit 2026-06-08)
- ~~**Backlog santé edge functions**~~ ✅ **LIVRÉ prod 2026-06-09** (chantier B) : `AbortSignal.timeout(2500)` sur les 4 fetch send-push ; `console.warn` sur les catch silencieux (coach-tips ×4 + submit-testimonial) ; compteur newsletter **atomique** via RPC `increment_newsletter_counter` (resend-webhook) ; 6 edge fns redéployées (flags verify_jwt préservés). `client-anniversary-check` lifecycle déjà corrigé 2026-06-08.
- ~~**`TourRunner.tsx:137` `console.log()`**~~ ✅ retiré (chantier B, 2026-06-09).

### ❓ À décider

- ~~Bizworks : champ admin override PV mensuel~~ ✅ **LIVRÉ** (audit 2026-06-14) : migration `20261107080000_user_pv_override.sql` (`users.monthly_pv_override` + RPC `set_user_pv_override`) + UI `PvOverrideBlock` / `PvBizworksBlock`, consommé par la jauge Co-pilote.
- Push notif 20h check-list : garder, ou désactivable par default ?

---

## 🌦 Chantiers post-V5 Co-pilote (mémo 2026-05-05)

Validés Thomas pendant Phase F V5, à programmer après merge V5 prod :

### D — Popup météo 5 jours sur ville distri
Click sur la weather pill du Co-pilote V5 → ouvre popup avec :
- Météo aujourd'hui (déjà visible dans la pill)
- 4 jours suivants (J+1 à J+4)
- Géolocalisation : ville stockée sur `users.city` ou via API IP de fallback
- API gratuite : Open-Meteo (no key) ou OpenWeather (free tier)
- Effort : ~2-3h. Pas critique mais charme produit.

### ~~E — Sidebar emojis~~ ❌ RETIRÉ (2026-05-20)
**Décision Thomas** : sidebar SVG actuelle est propre et identitaire La
Base 360. Switch emojis = risque downgrade visuel (notamment problèmes
de rendu Windows déjà vécus avec les drapeaux). On garde les SVG.

### ~~F — Dark mode V5~~ ✅ LIVRÉ (2026-05-05)
Le dark mode adaptatif V5 a été livré dans `copilote-v5.css` ligne 19.
La V5 supporte light ET dark : le toggle ☀️/🌙 affecte aussi le
Co-pilote. Seul le hero éditorial reste dark dans les 2 modes
(signature). Validé visuellement par Thomas 2026-05-20.

---

## 🚀 Chantier Paiement — ✅ SQUARE + STRIPE LIVRÉS

> **Stripe distri (2026-06-15)** : chaque distri encaisse avec SON PROPRE compte
> Stripe. **Modèle (décision Thomas)** : le distri crée lui-même son compte,
> l'argent va 100 % chez lui, **jamais sur un compte plateforme**. Pas de Stripe
> Connect, pas de commission, pas d'intermédiaire. Onboarding = il colle sa clé
> secrète (`sk_live_…`) dans **Mon business → Encaissement** (`/encaissement`,
> `EncaissementPage` + `PaymentSettingsCard`). L'edge `create-payment-link` crée
> une Checkout Session **sur le compte du distri** ; au retour, l'edge
> `confirm-stripe-payment` revérifie le statut via la clé secrète du distri →
> `bilan_orders` paid + push (aucun webhook à configurer côté distri). Schéma
> inchangé (`coach_payment_settings.stripe_secret_key` existait déjà).
>
> **Socle Square (2026-06-14)** : edges `create-payment-link` +
> `square-payment-webhook`, tables `coach_payment_settings` + `bilan_orders`
> (migration `20261202080000`), caisse sur `BilanResultatPremiumPage`. Le
> prospect paie son programme depuis la page Résultat Bilan. **Reste optionnel** :
> le flow « clôture panier au comptoir POS » décrit ci-dessous (vision d'origine,
> non implémenté tel quel).

### Chantier C — Intégration paiement Square (vision d'origine)
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

> ### 📊 Consolidation mise à jour PV (2026-06-14)
> La mise à jour des PV était éclatée en 4 endroits (fiche distri, drill-down
> équipe, Paramètres > Équipe, saisie manuelle Rentabilité). Désormais **source
> unique = onglet « PV équipe » de `/rentabilite`** (`RentabilityPvTeamTab`) :
> override Bizworks par distri de l'app (`PvOverrideBlock`/`PvBizworksBlock`) +
> saisie distri hors-app avec remise (`ManualPvEntriesSection`). Deep-link
> `?tab=pv-equipe`. Les 3 autres endroits sont devenus des **raccourcis** vers
> cet onglet (zéro double-saisie, cf. règle B9). ⚠️ **Aucune logique de calcul
> PV / paliers / qualification touchée** (formules `herbalifeFormulas.ts` +
> `docs/HERBALIFE_PALIERS_REGLES.md` intactes, dont la règle 2500 PV superviseur
> 3 mois) — c'était purement de la réorganisation d'UI.

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

## ⚠️ Règle du build vérifié avant push prod (2026-05-27)

**Avant tout `git push origin claude/focused-pike`, lancer impérativement :**

```bash
npx tsc -b --noEmit
```

Si erreurs TS → fix avant push. Vercel build cassé = pas de deploy
(la prod reste sur l'ancienne version), mais le commit fautif est visible
dans l'historique et un commit hotfix est nécessaire en panique.

**Pourquoi** : incident 2026-05-27 — push `6d07ccf` (chantier onboarding
hub) en prod sans type-check local, build Vercel planté sur TS2339
(`useAcademyProgress()` retourne `{ view, ...actions }` et non
`AcademyProgressView` directement). Hotfix `5a92fbd` poussé dans la
foulée pour rétablir la chaîne de build.

**Pas applicable** sur `dev/thomas-test` ou branches `feat/*` : on
accepte des erreurs TS temporaires en dev. Mais `claude/focused-pike`
doit toujours builder.

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

> ### 🧭 Règle anti-dérive navigation (B9, 2026-06-13)
> À relire avant d'ajouter **toute** entrée de menu, onglet ou page :
> - **Une feature = un seul endroit.** Tout le reste n'est qu'un *raccourci*
>   (deep-link), jamais une 2e implémentation.
> - **Max 5 onglets par page.** Au-delà → regrouper (cf. fiche client B1 :
>   7→5 ; Paramètres B3 : 8→6 via un onglet « Admin » à sous-onglets).
> - **2 hubs, pas plus** : « Mon business » (faire / piloter : prospecter,
>   rentabilité, outils) et « Mon développement » (apprendre : Academy,
>   Formation, tutos). Ne pas mélanger « faire » et « apprendre ».
> - **Avant d'ajouter une entrée**, vérifier qu'elle n'existe pas déjà
>   ailleurs. Si oui → raccourci vers l'existant, pas de doublon.
> - **Deep-links robustes** : mapper les `?tab=<slug>` via une table
>   slug→index/clé (cf. `ClientDetailPage` `TAB_SLUG_TO_INDEX`,
>   `ParametresPage` `LEGACY_ADMIN_SLUGS`) pour qu'une re-indexation ne
>   casse pas les vieux liens (Co-pilote, Agenda, push notif).

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

## Theme system (note 2026-11-04, update 2026-05-18 pages publiques)

La Base 360 utilise **deux systèmes de tokens distincts** :

### 1. Theme app coach interne (`src/styles/globals.css`)

Pour Co-pilote, FLEX, Clients, Agenda, Messagerie, NewAssessment, etc.

- `:root` = thème **Dark Premium** (défaut) — gold #C9A84C / teal #2DD4BF
- `html.theme-light` = thème **Light Premium** — gold #B8922A / teal #0D9488

**Règle absolue** : tous les composants UI internes doivent utiliser
`var(--ls-*)` pour les couleurs. **Jamais** de `#HEXVALUE` hardcodé dans
un `.tsx` de l'app coach interne.

### 2. Theme pages publiques V2 (`src/styles/public-tokens.ts` + `public-shell.css`)

Ajouté 2026-05-18 dans le chantier de refonte pages publiques V2 dark.

Pour BilanOnlineWelcomePage / BilanOnlinePage / BilanOnlineMerciPage /
TestimonialFormPage (#11) / Newsletter publique (#8 à venir).

- Tokens TS : `PUBLIC_TOKENS` + `PUBLIC_FONTS` + `publicGradText`
- CSS variables : `--ink`, `--cream`, `--teal`, `--violet`, `--coral`, `--gold`, `--hair`, `--grad-headline`, `--grad-cta`, `--grad-progress`
- Theme toggle utilisateur dark/light avec persistance localStorage clé `ls-public-theme`
- Wrapper `<PublicShell defaultTheme="dark">` qui applique `data-public-theme` + bg-mesh G3 (radials teal/violet/coral)
- Fonts : **Sora** display + **Inter** body + **Syne** italic pour signatures
- Identité brand : gradient teal→violet→coral sur headlines italiques + gradient teal→violet sur CTAs

**Indépendant** du theme app coach. Le toggle dark/light public ne touche
pas `html.theme-light`. Les deux systèmes coexistent sans interférence.

### Cas BusinessPage (`/business`)

Livrée le 2026-05-17 (chantier #7 V2). Utilise son propre namespace
`--biz-*` avec palette **SaaS premium emerald/cyan/violet** (Notion/Linear
style), distincte de la palette pages bilan V2 (teal/violet/coral).

**Volontaire** : BusinessPage est plus business/conversion-driven, les
pages bilan/témoignage sont plus warm/brand-care. Si Thomas veut tout
unifier sur la palette V2, c'est une 2e itération séparée.

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

**Reste à faire (V3 si besoin)** : ✅ **tout livré** (vérifié audit 2026-06-09) —
les 3 items ci-dessous étaient déjà faits dans le chantier C V3 (2026-04-28) :
- ~~Tri par PV mois~~ ✅ SortKey `pv-month-desc` + map `pvByClientThisMonth` + option UI « PV ce mois ↓ » (`ClientsPage.tsx`)
- ~~Sélection persistée entre navigations (localStorage)~~ ✅ `selectedIds` lu/écrit en localStorage
- ~~Filtre par owner via query param (`?owner=<userId>`)~~ ✅ `ClientsPage` lit `searchParams.get("owner")` et pré-filtre (drill-down Analytics)

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

### ✅ A. Onboarding CLIENT (PWA) — LIVRÉ (audit 2026-06-14 : ligne « PAS FAIT » périmée, contradisait la section « Livrés en prod »)
> Livré : `ClientOnboardingTour` (consommé par `ClientAppPage`) + edge
> `client-app-mark-onboarded` + colonne `client_app_accounts.onboarded_at`.
> Le descriptif d'origine est conservé ci-dessous pour mémoire.

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

### ✅ B. Lor'Squad AI (Assistant IA intégré) — LIVRÉ sous le nom « Noaly » (audit 2026-06-14)
> Livré : edge `noaly` (4 modes crm_message / coach_chat / client_chat /
> bilan_analysis) + FAB `NoalyFab` (câblé `AppLayout`) + table `ai_usage_log`
> (cost tracking, migrations `20261202030000`/`040000`). La vision ci-dessous
> est la spec d'origine, désormais réalisée.

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

> ✅ **MISE À JOUR audit 2026-06-03** : le cœur est LIVRÉ. RPC
> `get_pv_action_plan(p_user_id)` + hook `usePvActionPlan` existent et
> alimentent Co-pilote V5 (target_pv, prorata, dormants, restock, etc.).
> Ce mémo reste pour le contexte / enrichissements futurs éventuels.

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

## Edge Functions actives (27 au 2026-05-20)

| Function | Déclenchement | Rôle |
|---|---|---|
| `client-app-data` | fetch front (app client) | Migration RLS → service_role |
| `client-app-confirm-calendar` | fetch front (app client) | Confirmation RDV client |
| `client-app-mark-onboarded` | fetch front (app client) | Marque PWA onboardé |
| `client-anniversary-check` | cron 0 7 * * * | Notifs anniv client / programme |
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
| `submit-online-bilan` | fetch front (form bilan online) | Création Lead chantier #1 |
| `submit-testimonial` | fetch front (form public) | Création témoignage modéré |
| `request-testimonial` | fetch front (coach) | Demande témoignage client |
| `get-testimonial-context` | fetch front (form public) | Pré-remplit contexte témoignage |
| `send-push` | fetch front + Edge interne | Envoi Web Push |
| `morning-suivis-digest` | cron 0 7 * * * | Digest matin suivis |
| `rdv-imminent-notifier` | cron */5 * * * * | Notif RDV imminent |
| `new-message-notifier` | trigger Postgres | Notif nouveau message client |
| `new-coach-message-notifier` | trigger Postgres | Notif coach → client |
| `coach-tips-dispatcher` | cron quotidien | Tips contextuels coach |
| `flex-notifier` | cron evening / late / weekly | Push FLEX (chantier 2026-11-05) |
| `formation-validation-notifier` | trigger / fetch | Notif validation module |
| `formation-relay-to-admin` | fetch front (coach) | Escalade question admin |
| `daily-actions-notifier` | cron 18h + 19h UTC | Push 20h Paris check-list (#2) |
| `client-app-set-baseline` | fetch front (app client) | Point de départ poids/mensurations à l'onboarding (chantier poids couche 2) |
| `noaly` | fetch front (coach + client + bilan) | IA Noaly multi-modes (crm_message / coach_chat / client_chat / bilan_analysis) |
| `get-online-bilan-results` | fetch front (page publique) | Données page premium /resultat-bilan/:token (no-verify-jwt) |
| `create-payment-link` | fetch front (page publique) | Caisse directe : Square quick_pay OU Stripe Checkout Session (compte du distri), prix serveur (no-verify-jwt) |
| `square-payment-webhook` | webhook Square | payment.updated → bilan_orders paid + push coach (auth = signature HMAC) |
| `confirm-stripe-payment` | fetch front (page publique, retour caisse) | Vérifie la Checkout Session via la clé secrète DU distri → bilan_orders paid + push coach. Pas de webhook à configurer côté distri (no-verify-jwt) |
| `create-manual-payment-link` | fetch front (coach authentifié) | Lien « montant libre » hors bilan (Mon panier + fin bilan physique ThankYouStep + ticket programme étape 11 via `InlinePaymentButton`). **Square OU Stripe** selon config du distri (fix 2026-07-16 : était Stripe-only → « pas activé » pour les coachs Square). Auth = JWT distri (verify_jwt par défaut), credentials côté serveur |
| `qualif-bootstrap` | fetch front (page publique /qualif/:token) | Chantier Qualif : mode "status" (lecture, vérifie `bilan_orders` payé côté serveur) / "register" (crée fiche self-serve = clients + assessment + client_app_accounts + auth.users + client_qualif_onboarding + client_consents, IDEMPOTENT via `online_bilans.converted_to_client_id`). (no-verify-jwt) |
| `qualif-update` | fetch front (page publique /qualif/:token) | Chantier Qualif : avance le parcours (modes flavor/skip_flavor/app_opened/telegram/complete). Écrit `client_qualif_onboarding` (dont `flavor_choices` jsonb F1+Thé+Aloé). Mode flavor → push coach « 🥤 X a choisi ses saveurs ». (no-verify-jwt) |
| `client-rdv-reminder` | cron */30 | Rappel RDV AU CLIENT : veille 18h Paris + 2h avant (sendPushToClient, anti-doublon client_rdv_reminders_sent) |
| `book-rdv` | fetch front (page publique /rdv) | Réservation RDV funnel : résout coach par slug, re-check anti-doublon, insert `rdv_bookings`, notif push coach (no-verify-jwt) |
| `send-password-reset` | fetch front (/forgot-password) | Mot de passe oublié via Resend : `admin.generateLink(recovery)` + envoi Resend (contourne le mailer Supabase bridé « limite atteinte »). Anti-énumération + throttle IP/email. Template `_shared/email.ts`. (no-verify-jwt) |
| `auth-email-hook` | Supabase Send Email Hook | Route TOUS les mails auth (signup/invite/magiclink/recovery/email_change/reauthentication) vers Resend + template `_shared/email.ts`. Signature standardwebhooks (`SEND_EMAIL_HOOK_SECRET`). À activer côté dashboard (Auth → Hooks). (no-verify-jwt) |

Toute nouvelle edge function = ajouter ici.

> **MAJ audit 2026-07-03 — 48 edge functions réelles** (la table ci-dessus en
> documentait ~30). Fonctions actives qui manquaient (livrées en prod sans passer
> par la doc) :
> - `crm-relance-notifier` — notif relance CRM
> - `notify-referral-converted` — notif quand un parrainage se convertit
> - `pv-month-end-reminder` — rappel PV fin de mois
> - `rank-threshold-notifier` — notif seuil de rang approché/atteint
> - `submit-prospect-lead` — création lead prospect (funnel `/rejoindre` + form Welcome). Partagée, ne PAS supprimer.
> - `submit-testimonial` · `request-testimonial` · `get-testimonial-context` — chaîne témoignages (#11)
> - `submit-online-bilan` · `get-online-bilan-results` — bilan online (#1)
> - `dispatch-newsletter` · `send-newsletter-email` · `track-newsletter-view` · `resend-webhook` · `upload-newsletter-image` · `upload-newsletter-og` — chaîne newsletter (#8)
> - `create-public-share-token` · `resolve-public-share` — partage anonymisé
>
> Chantiers non documentés révélés par l'audit : **parrainage**, **seuils de rang**,
> **rappel PV fin de mois**, funnel **`/rejoindre` gated**.

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
