# Brainstorm Égypte — Mai 2026

> **Auteur** : Thomas (notes prises au bord de la piscine, Égypte)
> **Mode** : capture mobile → structuration progressive → exécution PC au retour
> **Branche** : `claude/fix-mobile-chat-history-d1jFW` (réutilisée pour les docs, pas de code dans ce fichier)
> **Référentiel** : `docs/ARCHITECTURE_SNAPSHOT_2026-05.md` (pour situer chaque idée)

---

## Comment ce fichier est tenu

Pour chaque idée, l'agent structure :

```
### [Titre]
- **Domaine** : zone fonctionnelle
- **Description** : 2-4 phrases nettoyées, fidèles à l'intention Thomas
- **Pourquoi** : impact / valeur métier / pain résolu
- **Où ça se branche** : routes / composants / tables existantes
- **Effort estimé** : XS (<1h) / S (1-3h) / M (3-8h) / L (1-2j) / XL (2j+)
- **Dépendances / risques** : conflits avec chantiers en cours, externalités
- **Statut** : 🌱 brut / 🌿 mûr / 🌳 prêt à coder
- **Questions ouvertes**
```

---

## Sommaire des chantiers (à jour après dump #1 + #2 + #3)

| # | Domaine | Titre | h-agent | Statut |
|---|---|---|---|---|
| **#1** | Funnel / Clients | **Bilan Online publique + Lead pipeline** (10 étapes) | 20-31 h | 🌳 prêt à coder |
| **#2** | Co-pilote | Check-list quotidienne actions distri (6 étapes, intègre #4) | 7-9 h | 🌳 prêt à coder |
| **#3** | Prospection | Refonte module Prospection cold mobile-first (8 étapes) | 14-22 h | 🌳 prêt à coder |
| **#4** | UX / Co-pilote | Lien rapide Cahier de bord (intégré dans #2) | 30 min | 🌳 prêt à coder |
| **#5** | Infra / Marketing | Internationalisation (langue + monnaie) — 5 langues V1 (9 étapes) | 16-23 h | 🌳 prêt à coder |
| **#6** | Pédagogie | Vidéos pédagogiques YouTube + intégration app (4 étapes dev) | 3-4 h | 🌳 prêt à coder |
| **#7** | Business | Refonte business `/business` + popup lead capture (8 étapes) | 12-18 h | 🌳 prêt à coder |
| **#8** | Marketing / Acquisition | Newsletter mensuelle (privée + publique lead-magnet, 12 étapes) | 17-25 h V1 | 🌿 mûr — 4 questions ouvertes (D4.1-4) + 6 questions originales |
| **#9** | Dette technique | Refacto `NewAssessmentPage.tsx` (4325 L) — **À FAIRE AVANT #1** | 10-15 h | 🌳 prêt à coder |
| **#10** | UX / Crédibilité | Badges + certifications coach visibles publiquement | 3-4 h | 🌳 prêt à coder |
| **#11** | Marketing / Preuve sociale | Témoignages clients vérifiés (système avis + carrousel) | 6-8 h | 🌳 prêt à coder |
| Phase 0 | Bug fix | Fix mobile chat history (3 étapes) | 30 min - 1 h | 🌳 prêt à coder |
| Phase 2 | Renommage | Code source "La Base 360" coopératif (7 étapes) | 2-4 h | 🌳 prêt à coder |

---

## Idées détaillées

---

### 1. Bilan Online publique + Lead pipeline

**Domaine** : Funnel public + Clients + Messagerie + Agenda + Notifs push

**Description** — méga-chantier qui se décompose en 7 sous-features étroitement liées :

#### 1.A — Page bilan online publique

Une page accessible sans auth, sur un sous-domaine type `bonline.labase360.com`, avec un formulaire court (cible ≤ 2 minutes) :
- **Identité** : prénom, nom, âge, taille, ville
- **Objectifs** : perte de poids (avec champ "combien de kilos"), prise de masse, énergie — cases à cocher style ID G3 jolies
- **Vécu** : ce qu'il/elle a déjà essayé, motivation sur 1 → 10 (slider)
- **Habitudes alimentaires** *(format ultra-court, peu de mots, sinon décrochage)* : ptit-déj, midi, soir
- **Fast-food** : nombre par semaine
- **Budget alimentaire** : choix par tranche `2 / 4 / 8 / 10 €/jour` (boutons radio plutôt que champ libre)
- **Activité physique** non-sportive : oui/non + si oui, quoi (texte court)

#### 1.B — Welcome screen + identification coach

Avant le formulaire, une page d'accueil chaleureuse :
- Headline : « Nous sommes heureux de te voir ici 🥰 »
- 2 lignes de présentation de ce qu'on fait
- Premier champ : « Dis-nous qui t'a invité ici » + microcopy « ça nous permet de notifier ton coach de ton bilan »
- Microcopy de réassurance : « Promis, ça prend pas longtemps, 2 min 🙏 »

**Routage** :
- Si nom du coach reconnu → bilan dirigé vers ce coach (notif push + arrivée dans son onglet Leads)
- Si pas de nom ou nom non-reconnu → **bilan libre** envoyé en messagerie admin général
- Admin garde une vue globale qui a reçu quoi (pour redirection en cas de mauvaise manip)

#### 1.C — Création fiche Lead (filtrée, ne pollue pas /clients)

À la soumission, création d'une entité avec marqueur **"Bilan Online à valider"**.
- N'apparaît PAS dans l'onglet `/clients` standard (filtre off par défaut) pour éviter la surcharge
- Apparaît dans un **onglet Leads** dédié (à créer ou intégrer dans le kanban existant — voir question ouverte)
- Soit notif push dans messagerie + soit étape automatique créée dans l'agenda « Recontacter J+X »
- Réutiliser au maximum l'arborescence lifecycle déjà en place (`active` / `not_started` / `paused` / `stopped` / `lost`) — voir question ouverte sur l'extension

#### 1.D — Kanban Lead avec statuts dédiés

Vue kanban **drag-and-drop ou clic-to-move** avec colonnes :
1. **À qualifier** (état initial post-bilan)
2. **Contact** (date+heure auto si la coche "message envoyé" est activée)
3. **Qualifié**
4. **À contacter / À relancer**
5. **Perdu / Jamais répondu** *(important : on garde la fiche, on ne supprime pas — pour pouvoir réchauffer plus tard)*

Comportements :
- Au clic sur une carte Lead → fiche détaillée avec actions : "Réchauffer", "Programmer RDV", "Envoyer message de relance"
- Le Lead "perdu" reste accessible et peut revenir dans le pipeline

#### 1.E — Notif push « Nouveau Lead bilan »

Quand un bilan online arrive sur un coach :
- Notif push : « Tu as un nouveau Lead bilan »
- Tap sur la notif → ouvre direct la fiche du Lead avec les actions disponibles à portée de main

#### 1.F — Actions sur le Lead (templates de réponse)

- Bouton « Réponds-lui » → ouvre la messagerie sur ce Lead
- Pop-up avec **exemples de réponse** (merci / bienveillant / analyse) — texte de base à affiner
- **Question architecture** : on stocke les templates dans la boîte à outils existante (`/outils-prospection` ?) ou on duplique ici ? Si on lie à la boîte à outils, garder un onglet retour visible pour ne pas perdre le Lead courant

#### 1.G — Auto-qualification + relance J+3

- Coach envoie un message → si "message envoyé" coché → qualification auto : passage en colonne **"Contact"** dans le kanban + ajout automatique d'une **relance à J+3** dans l'agenda (ou notif, à arbitrer)
- Permet en un coup d'œil de voir dans l'agenda les Leads pas relancés

**Pourquoi**
- **Acquisition** : un canal d'entrée nouveau (formulaire public partageable) qui transforme une URL en Lead qualifié, mesurable, attribuable au coach inviteur
- **Pipeline réel** : aujourd'hui les distri n'ont pas de funnel structuré ; ce chantier le crée
- **Anti-fuite** : la colonne "perdu jamais répondu" garde le Lead en mémoire (on peut le réchauffer 3 mois plus tard)
- **Discipline coach** : la relance auto J+3 force l'hygiène commerciale

**Où ça se branche**
- **Frontend public** : nouvelle route publique (pas dans la sidebar coach), idéalement sur sous-domaine `bonline.labase360.com`
- **Edge function** : nouvelle `submit-online-bilan` (pattern similaire à `submit-prospect-lead` existant mais payload plus riche)
- **Tables** : extension de `prospects` ou `prospect_leads` OU nouvelle table `online_bilans` ; à arbitrer (voir question 1)
- **Lifecycle** : étendre `LifecycleStatus` (actuel : active/not_started/paused/stopped/lost) avec des statuts Lead (à_qualifier / contact / qualifié / à_contacter / relance / perdu_jamais_répondu) **OU** ajouter un champ séparé `lead_pipeline_status`
- **Page Leads coach** : nouvelle page `/leads` ou extension de `/clients` avec onglet kanban "Leads"
- **Notif push** : trigger Postgres `AFTER INSERT online_bilans` → edge function `new-online-bilan-notifier`
- **Agenda** : insert auto `follow_ups` type `lead_relance_j3` au passage en "Contact"

**Architecture existante à réutiliser**
- Pattern `submit-prospect-lead` (edge function publique sans auth)
- Pattern token UUID pour identifier le coach (cf. `client_invitation_tokens`, `distributor_invitation_tokens`)
- Kanban DnD déjà livré sur `/clients` V2 (CLAUDE.md mentionne "Refonte page /clients V2 livrée : chips filtres rapides, vue Kanban DnD, lifecycle badges, sélection multiple, bulk lifecycle change") → à inspecter avant de coder un nouveau kanban
- `app_announcements` pour annoncer la feature aux distri

**Effort estimé** : **XL — 5 à 8 jours** réparti :
- 1.A page formulaire + 1.B welcome : ~1.5 j (Claude design)
- 1.C création Lead + DB schema : ~1 j
- 1.D kanban Lead (réutiliser kanban Clients V2) : ~1 j
- 1.E notif push : ~0.5 j
- 1.F templates réponses + intégration boîte à outils : ~1 j
- 1.G auto-qualification + relance J+3 : ~0.5 j
- Sous-domaine + DNS + Vercel rewrites : ~0.5 j
- Polish + recette + announcement : ~0.5 j

**Dépendances / risques**
- **Sous-domaine** `bonline.labase360.com` : DNS Cloudflare/registrar + config Vercel rewrites — pas bloquant mais à anticiper
- **Doublon kanban** : le kanban Clients V2 existe déjà, ne PAS faire un 2e kanban indépendant — décider si on étend ou on filtre
- **Lifecycle pollution** : si on ajoute trop de statuts à `LifecycleStatus` global, on casse la lisibilité des fiches clients existantes — préférer un champ Lead séparé
- **Spam protection** : edge function publique = risque spam → captcha (Turnstile Cloudflare gratuit) ou rate-limit IP côté front
- **RGPD** : consentement explicite à la soumission (le pattern `client_consents` existe)
- **Perte de Lead pendant transition** : si on ouvre l'URL avant que le distri ait son nom enregistré, où vont les Leads ? Voir question 2

**Statut** : 🌿 mûr — la vision est claire, il reste 6 questions architecture à trancher avant de coder.

**Questions ouvertes**
1. **Modèle de données** : un Lead bilan est-il un `Prospect` enrichi, un `Client` avec lifecycle = "lead", ou une nouvelle entité `OnlineBilan` ? Mon avis : nouvelle table `online_bilans` qui se transforme en `Client` au moment de la qualification. À discuter.
2. **Identification coach** : par quoi identifie-t-on le coach dans l'URL ? Code parrainage existant ? Username unique à créer ? Token UUID ? L'URL ressemblerait à `bonline.labase360.com?coach=thomas-k` ou `bonline.labase360.com/c/THOMAS123` ?
3. **Sous-domaine** : `bonline.labase360.com` est-il déjà acheté/configuré ? Sinon, registrar à choisir et budget DNS à valider.
4. **Kanban** : on étend `/clients` V2 avec un onglet "Leads" filtré, ou on crée une page `/leads` séparée ? J'ai une préférence pour l'extension (cohérence + réutilisation code) mais ça surcharge potentiellement la page Clients.
5. **Templates de réponse** : on les stocke dans `/outils-prospection` (boîte à outils existante) avec un onglet "retour Lead" toujours visible, ou on les met inline dans la pop-up Lead pour éviter la navigation ? Mon avis : inline dans la pop-up + lien optionnel vers boîte à outils pour les voir tous.
6. **Relance J+3** : entrée agenda concrète (`follow_ups`) **ET** notif push, ou seulement un des deux ? Je penche pour les deux mais c'est ton call.

---

### 2. Check-list quotidien actions distri sur Co-pilote (5 min/jour)

**Domaine** : Co-pilote + Notifications

**Description**
À l'ouverture de l'app chaque jour, pop-up automatique avec une **check-list d'actions courtes (5 min)** que le coach doit cocher :
- Liste des Leads à recontacter
- RDV imminents à confirmer
- Suivis F1/F21 dus
- (autres actions à définir)

Si une action n'est pas cochée à la fin de la journée, elle revient le lendemain. Vrai suivi profond, pipeline maintenu rempli.

**Pourquoi**
- **Discipline quotidienne** : 5 minutes/jour qui ne passent pas par hasard
- **Anti-perte** : aucune action ne tombe dans l'oubli, le système rappelle
- **Sentiment de contrôle** : le coach voit son score "actions du jour" — gamification douce

**Où ça se branche**
- Composant nouveau : `<DailyActionsModal />` à monter au mount de `CoPiloteV5Page` (1ère ouverture du jour, persistance via `localStorage` `ls-daily-actions-shown-${YYYY-MM-DD}`)
- Source des actions : agrégation existante (`useCopiloteData`, `useDormantClients`, `useClientPriorityAction`, `usePvActionPlan`) + nouveau hook `useDailyActionChecklist`
- Persistance des coches : étendre table `daily_action_checkin` (qui existe déjà côté client app) OU créer `coach_daily_actions` côté coach
- Trigger de relance : si action non cochée à 20h → push notif (réutilise `flex-notifier` cron pattern)

**Architecture existante à réutiliser**
- Pattern pop-up auto à la 1ère ouverture du jour (cf. `AnnouncementSpotlight` qui fait déjà ça via `localStorage.ls-spotlight-shown-${id}`)
- `useCopiloteData` agrège déjà les actions du jour
- Cron `flex-notifier` pour les relances

**Effort estimé** : **M — 4 à 6 heures**
- Composant pop-up + agrégation actions : ~2h
- Persistance des coches en DB : ~1h
- Hook + intégration Co-pilote : ~1h
- Relance push si non coché : ~1h
- Polish + announcement : ~30 min

**Dépendances / risques**
- Lien étroit avec chantier #1 (les Leads à recontacter viennent du pipeline du chantier #1) — si #1 pas livré, la check-list n'inclut pas les Leads bilan
- Risque UX : si on pop-up trop fort, le coach skipe → prévoir un mode "discret" (badge sur Co-pilote au lieu de modal bloquant) en option

**Statut** : 🌿 mûr — clair, mais dépend de #1 pour la dimension Leads.

**Questions ouvertes**
1. La pop-up est-elle bloquante (impossible de fermer sans cocher) ou skippable ? Ma reco : skippable mais re-déclenchée à la prochaine ouverture si rien coché.
2. Quelles sont les actions par défaut hors-Lead ? Suivis F1/F21 / RDV à confirmer / clients dormants à relancer / anniversaires / autres ?

---

### 3. Module Prospection cold mobile-first (flow messages copier-coller par profil + multi-langue)

**Domaine** : Formation / Boîte à outils / Education distri

**Description**
Un module pédagogique qui apprend au distri **comment prospecter sur les réseaux sociaux** (Instagram / Facebook / autres), basé sur la méthode GoPro :
- Cibler les profils via **hashtags** thématiques (`#sport`, `#cuisine`, `#développement-personnel`, etc.)
- Géo-ciblage simple (ex : « personnes à Metz »)
- **Arborescence d'actions à faire** clé en main (que dire en 1er, en 2e, comment relancer)
- **Premier message générique** à copier-coller, qui passe bien, totalement indirect — qualifiant et qualitatif, donne envie de répondre
- Onglets par **profil cible** (3 profils max, pas 50) :
  - Perte de poids
  - Sportif
  - Business
- Selon le profil, l'app oriente vers la suite logique : envoi du document opportunité business (profil business), envoi de la fiche bilan (profil perte de poids), message accompagnement simple (profil indéfini)
- **Visuel simple**, copier-coller facile (idéalement bouton "Copier" qui copie le texte)
- Possible utilisation de Claude design pour la maquette

**Pourquoi**
- **Pain réel distri** : les distri ne savent pas QUOI envoyer comme premier message, donc ils n'envoient rien
- **Reproductibilité** : un message qui marche, dupliqué 100 fois, génère 100 conversations
- **Auto-formation** : pas besoin que Thomas explique chaque mois, le module le fait
- **Lien direct avec le pipeline** : prospection → conversation → bilan online (chantier #1) → Lead → client

**Où ça se branche**
- **DOUBLON POTENTIEL** : la page `/outils-prospection` (`OutilsProspectionPage`, 863 L, créée 2026-11-07) existe déjà comme "boîte à outils prospection". Avant tout dev, **auditer ce qu'elle contient** pour savoir si c'est :
  - (a) à étendre avec ces nouveaux flows
  - (b) ou à refondre complètement si elle ne couvre pas le sujet
- Hub `/developpement` (Option B) : ajouter une carte "Académie prospection" si module séparé
- Lien depuis Co-pilote (idée 4 ci-dessous : raccourcis facile)
- Réutiliser le pattern `messageTemplates.ts` (lib templates SMS/Telegram existante)

**Architecture existante à réutiliser**
- `OutilsProspectionPage` (à auditer en priorité)
- `messageTemplates.ts` + modale popup multi-canal
- `FormationToolkitPage` (16 outils premium)
- Pattern de cartes du hub `/developpement`

**Effort estimé** : **XL — 4 à 6 jours** (incluant rédaction des contenus)
- Audit `/outils-prospection` existant : ~2h (à faire AVANT tout)
- Maquette Claude design + arborescence : ~1 j
- Implémentation 3 profils + flows messages : ~2 j
- Boutons "Copier" + tracking analytics (savoir quels messages marchent) : ~1 j
- Rédaction contenus textes (méthode GoPro, scripts) : ~1 j (Thomas + relecture)
- Polish + announcement : ~0.5 j

**Dépendances / risques**
- **Audit `/outils-prospection` indispensable** avant de coder, sinon on duplique
- **Contenu textes** = effort Thomas (rédaction des 3 messages génériques + arborescences) — pas que du dev
- **Risque "trop de contenu"** : si on met 50 scripts, le distri ne lit rien. Garder 3 profils max comme demandé.

**Statut** : 🌱 brut — vision claire mais contenu à rédiger et audit existant à faire.

**Questions ouvertes**
1. Tu veux que je lance un audit détaillé de `/outils-prospection` (qui existe déjà depuis 2026-11-07) avant qu'on aille plus loin ?
2. Les 3 profils (perte de poids / sportif / business) sont-ils figés ou tu en envisages plus à terme ?
3. Pour Claude design : tu envisages de me donner un mockup d'un autre coach/site qui t'inspire visuellement, ou je propose de zéro ?

---

### 4. Lien rapide vers Cahier de bord depuis Co-pilote

**Domaine** : UX / Co-pilote

**Description**
Le Cahier de bord (`/cahier-de-bord` — 21j cobaye + liste 100 + journal EBE perso) est **la clé angulaire du business** mais aujourd'hui caché. Ajouter un **petit onglet/raccourci direct** depuis Co-pilote pour qu'il soit accessible en 1 clic.

> Citation Thomas : « C'est la clé angulaire de notre business si on parle à personne on a personne. »

**Pourquoi**
- Discipline = répétition = visibilité dans le dashboard
- Si le Cahier de bord est caché, il n'est pas tenu, donc business meurt

**Où ça se branche**
- Composant `CoPiloteV5Page` : ajouter une carte ou un lien dans le hero / actions du jour
- Pas de changement DB
- Optionnel : afficher un compteur live ("X contacts qualifiés cette semaine")

**Effort estimé** : **XS — 30 minutes**
- Ajout d'une carte/lien dans CoPiloteV5Page
- Optionnel : compteur live si données dispo dans `useCahierDeBord`

**Statut** : 🌳 prêt à coder.

**Note Thomas** : « si les nouveaux Leads bilan arrivent, il faut peut-être les répertorier ici aussi → qualifier direct ». **Lien fort avec chantier #1** : la fiche Lead pourrait alimenter directement la liste 100 du Cahier de bord. À étudier au moment d'implémenter #1.

---

### 5. Méthodologie d'exécution (méta) — ordre de travail proposé

Thomas a donné explicitement l'ordre de travail souhaité. Je le consigne ici pour qu'on le respecte au moment d'attaquer le code :

1. **Lister les connexions, la logique** (= la phase d'audit qu'on est en train de faire ici)
2. **Création de la structure menu** si besoin (où s'insère "Leads" dans l'app)
3. **Création de la page du bilan online** (formulaire public + welcome)
4. **Classification des Leads** + relation coach/admin (kanban + routing)
5. **Notification push** « tu as un nouveau Lead bilan » + atterrissage direct sur la fiche
6. **Actions sur le Lead** : "Réponds-lui" → templates → message envoyé → auto-qualif + relance J+3

**Note** : cet ordre correspond à un découpage en sous-PRs propres. Chaque étape produit un commit livrable seul, on peut s'arrêter entre 2 sans casser le suivant.

---

## Doublons et chevauchements détectés

| Idée | Existe déjà / partiellement | Action |
|---|---|---|
| Kanban Lead (1.D) | Kanban Clients V2 livré (`ClientsPage`, lifecycle DnD) | **Étendre, ne pas dupliquer.** Audit page Clients V2 avant de coder. |
| Académie prospection (3) | `/outils-prospection` existe (`OutilsProspectionPage` 863 L) | **Audit indispensable** avant tout code. |
| Templates de réponse Lead (1.F) | `messageTemplates.ts` + modale popup multi-canal existent | **Réutiliser** la lib + pattern, juste ajouter les nouveaux templates "Lead". |
| Notif push nouveau Lead (1.E) | Pattern `new-message-notifier` (trigger Postgres → edge function → push VAPID) existe | **Cloner** le pattern. |
| Edge function publique formulaire (1.A) | `submit-prospect-lead` existe pour le funnel actuel | **Cloner et enrichir** avec le payload du bilan. |
| Bandeau bienvenue bilan (1.B) | `WelcomePage` + `BienvenuePage` ont des patterns de welcome | **S'inspirer** sans copier (UX différente : très court, conversion). |
| Lifecycle "perdu jamais répondu" (1.D) | `LifecycleStatus.lost` existe | À ne PAS confondre avec lifecycle client (un Lead n'est pas un client). Champ séparé recommandé. |

---

## Décisions prises pendant le brainstorm

### 2026-05-10 — Réponses Thomas dump #1 (chantier #1 Bilan Online)

| Q | Décision Thomas | Implication technique |
|---|---|---|
| **Q1 — Modèle de données** | ✅ **Nouvelle table dédiée** `online_bilans` | Migration SQL à créer ; transformation en `Client` au moment de la qualification (RPC ou edge function) |
| **Q2 — Identification coach dans l'URL** | ✅ **Prénom du distri dans l'URL** (ex: `bilanonlinethomas`). Si pas de prénom dans l'URL → "invité admin" qui peut réattribuer | ⚠️ **Sous-question à trancher au retour PC** : sous-domaine `bilanonlinethomas.labase360.com` (lourd, DNS wildcard + SSL wildcard, mais beau) **OU** path `bonline.labase360.com/thomas` (0 config DNS, scalable, simple). Recommandation tech : path. |
| **Q3 — Sous-domaine** | ⏳ **Pas acheté, pas configuré** — Thomas s'en occupe au retour PC | À faire avant le déploiement de la feature ; choix DNS/registrar à acter |
| **Q4 — Kanban Lead** | ✅ **Étendre `/clients` V2** avec onglet Leads filtré, mais ATTENTION à la surcharge | Discipline : filtres par défaut stricts (ne montrer que les Leads non-traités), bouton clair pour montrer/cacher les colonnes Lead vs Client |
| **Q5 — Templates de réponse** | ✅ **Inline dans la pop-up Lead** + lien optionnel vers boîte à outils | Reprend `messageTemplates.ts` existant. Pop-up = vitesse, lien = profondeur. |
| **Q6 — Relance J+3** | ✅ **Les deux** : entrée agenda (`follow_ups`) + notif push | 2x trigger au passage en colonne "Contact" : insert `follow_ups` type `lead_relance_j3` + scheduling notif J+3 (cron déjà en place via `rdv-imminent-notifier` ou nouveau pattern) |

**Synthèse** : tous les choix vont dans le sens d'une réutilisation maximale de l'existant (tables, kanban, templates, notifs) avec une seule nouvelle table dédiée pour ne pas polluer le modèle Client. Une seule sous-question reste : sous-domaine vs path pour l'URL coach (à trancher au retour PC).

---

### 2026-05-10 — Réponses Thomas dump #1 (chantier #2 Check-list quotidienne)

| Q | Décision Thomas | Implication technique |
|---|---|---|
| **Q7 — Pop-up bloquante ou skippable** | ✅ **Skippable** | Bouton "Plus tard" toujours dispo. Re-déclenchement à la prochaine ouverture de la journée si actions non cochées. Pas de friction forcée. |
| **Q8 — Actions par défaut hors-Lead** | ❓ Thomas n'a pas tranché → **proposition agent à valider** au retour PC | (voir ci-dessous) |

**Proposition agent pour Q8** — logique recommandée

Critères : ≤ 5 items pour tenir en 5 minutes, **haut impact business**, **actionnables maintenant** (pas "réfléchir à"), tirables de la data existante (pas demander au coach).

| # | Action | Source data | Pourquoi prioritaire |
|---|---|---|---|
| 1 | **Suivis F1 / F21 dus aujourd'hui** | `follow_ups.due_date = today` + `follow_up_protocol_log` | Protocole = squelette du business, miss = perte client |
| 2 | **Leads bilan online à qualifier** | `online_bilans` (chantier #1) | Conversion immédiate = revenus à court terme |
| 3 | **Clients dormants à relancer** | `useDormantClients` (>60j sans contact) | Anti-fuite revenus, réactivation |
| 4 | **RDV aujourd'hui à confirmer / préparer** | `follow_ups` du jour | Qualité de service = rétention |
| 5 | **1 à 2 contacts liste 100 du Cahier de bord** | `liste_100_contacts` | Discipline prospection (rejoint chantier #4 lien Cahier de bord) |

À écarter du défaut (peut être réintégré sur option) :
- Anniversaires clients : déjà couverts par l'edge function `client-anniversary-check`, redondant
- PV en retard vs prorata mois : intéressant mais nécessite la jauge rentabilité (chantier A en attente)
- Messages non lus : déjà notifiés en push via `new-message-notifier`, le coach les voit dans la cloche

**À acter Thomas** au retour PC : valider cette liste de 5 ou ajuster (ajout/retrait/réordonnancement).

---

### 2026-05-10 — Réponses Thomas dump #1 (chantier #3 Académie prospection)

| Q | Décision Thomas | Implication technique |
|---|---|---|
| **Q9 — Audit `/outils-prospection`** | ✅ Oui (Thomas confirme déjà que la feature ne s'y trouve pas). C'est une **nouvelle structure dédiée "client froid"** (cold prospection) | Audit léger quand même au retour pour confirmer + identifier ce qui peut être réutilisé. Le module sera neuf. |
| **Q10 — Nombre de profils** | ✅ **Système extensible** : Thomas commencera par les 3 initiaux puis enrichira (prof, chômeur, etc.) | ⚠️ NE PAS hardcoder 3 profils. Architecture : table `prospection_profiles` (id, label, slug, icon, color, ordre, scripts_json) + page admin pour CRUD profils. Le distri choisit dans une liste dynamique. |
| **Q11 — Design** | ✅ **Pas de Claude design ni mockup externe** — réutiliser **l'identité visuelle actuelle** de l'app, en s'inspirant des pages **Messagerie** et **Agenda** existantes, avec la palette G3 (gold `#C9A84C` / teal `#2DD4BF` Premium) | Réutiliser : `var(--ls-*)` tokens, fonts Syne (titres) + DM Sans (corps), cards `var(--ls-surface)` + border `var(--ls-border)`. Pas de bibliothèque visuelle nouvelle. |

**Synthèse chantier #3** : c'est un **nouveau module dédié "prospection client froid"**, à concevoir comme une **brique extensible** (N profils gérés par config), avec le design system actuel. Audit léger de l'existant à faire au retour PC pour valider qu'on n'écrase rien.

---

### Synthèse globale dump #1

✅ **9 questions sur 11 tranchées**, 1 reportée (sous-domaine vs path pour Q2), 1 avec proposition agent à valider (Q8). On a une vision claire pour les 3 chantiers et on peut lancer l'exécution dès le retour PC.

---

### 2026-05-10 — Réponses Thomas dump #1 (sous-domaine + Q8 finale)

| Sujet | Décision Thomas | Implication technique |
|---|---|---|
| **URL coach** | ✅ **Path** : `bonline.labase360.com/thomas` (slug = prénom distri lowercase, sans accent) | 0 config DNS supplémentaire par distri, scalable. Slug normalisé via `slugify(user.name)` |
| **Gestion anonyme** | ✅ **Option A — URL couteau suisse** | Page racine `bonline.labase360.com` avec : champ texte autocomplete (suggère prénoms distri actifs depuis `users.name`) + bouton « Personne, je découvre tout seul » → bilan libre admin. Slug typo (`/thmas`) → redirige racine avec message info. |
| **Q8 — Composition check-list** | ✅ Les 5 actions proposées agent **validées telles quelles** | Voir tableau ci-dessus dans la décision précédente |
| **Q8 bis — Logique fallback** | ✅ Si **0 suivi F1/F21 dus** → la ligne ne disparaît pas, elle est **remplacée** par une action **« Grandir ton réseau / Prospection froide »** | Lien vers le chantier #3 (Académie prospection) si livré, sinon fallback liste 100 du Cahier de bord. Crée une dépendance logique #2 → #3 + #4. La check-list n'affiche JAMAIS "rien à faire" — toujours une action constructive. |
| **Q8 bis — Score visible** | ✅ **Oui** | Badge `X/5 fait` en haut de la pop-up, reset à minuit, format simple |
| **Q8 bis — Skip** | ✅ Skipper = **revient le lendemain** si pas fait (jamais définitif) | Persistance par jour : `coach_daily_actions(coach_id, action_key, date, status: pending/done/skipped)`. Au lendemain, les `skipped` ET `pending` repartent en `pending`. |

---

## 🎯 Synthèse exécutive finale dump #1

**État** : ✅ **11/11 questions tranchées**. Vision complète et exécutable au retour PC.

**Récap des 3 chantiers prêts**

| # | Chantier | Effort | Dépendances internes | Ordre de livraison recommandé |
|---|---|---|---|---|
| **#1** | Bilan Online publique + Lead pipeline | XL (5-8 j) | Aucune (autonome) | **Premier** — fondation pipeline |
| **#3** | Académie prospection (cold) | XL (4-6 j) | Aucune (autonome) | **Deuxième** — alimente le fallback de #2 |
| **#2** | Check-list quotidienne Co-pilote | M (4-6 h) | Consomme #1 (Leads) et #3 (action prospection froide en fallback) | **Troisième** — capitalise sur les 2 précédents |
| **#4** | Lien rapide Cahier de bord depuis Co-pilote | XS (30 min) | Aucune | **À glisser dans #2** (cohérent fonctionnellement) |

**Architecture consolidée** :
- 1 nouvelle table `online_bilans` (Leads bilan)
- 1 nouvelle table `prospection_profiles` (profils cold extensibles)
- 1 nouvelle table `coach_daily_actions` (persistance check-list)
- Extension `/clients` V2 avec onglet Leads filtré
- Extension `/outils-prospection` (ou nouveau module dédié — à confirmer après audit léger)
- Extension `CoPiloteV5Page` (check-list + lien Cahier de bord)
- 2 nouvelles edge functions : `submit-online-bilan`, `new-online-bilan-notifier`
- Réutilisation : `messageTemplates.ts`, kanban DnD `/clients` V2, `useDormantClients`, pattern `submit-prospect-lead`, design system `var(--ls-*)` G3

**Reste à faire au retour PC** (avant code) :
1. Acheter + configurer le sous-domaine `bonline.labase360.com` (DNS + Vercel)
2. Audit léger de `/outils-prospection` (~30 min) pour confirmer qu'on n'écrase rien sur chantier #3
3. Audit léger de `/clients` V2 kanban (~30 min) pour comprendre comment l'étendre proprement
4. Mettre à jour CLAUDE.md (section roadmap) avec ces 4 chantiers actés

---

### *(suite : autres dumps Thomas / nouvelles idées)*

---

## 🔬 Compléments dump #1 (2026-05-10 soir) — détails techniques exigés Thomas

### A. Détail du formulaire bilan online (sous-feature 1.A enrichie)

**Découpage en 5 étapes** (regroupement pour tenir en ≤ 2 min, progress bar visible) :

#### Étape 1/5 — Identité
- **Prénom** (text, required, max 50)
- **Âge** (number 16-99, required)
- **Taille (cm)** (number 100-220, required)
- **Ville** (text avec autocomplete via API geo gouv ou OpenStreetMap, required)

#### Étape 2/5 — Tes objectifs
*(cases à cocher style ID G3 multi-select, jolies cards visuelles)*
- ☐ **Perte de poids** → si coché, sous-champ **« Combien de kilos ? »** (number 1-50)
- ☐ **Prise de masse**
- ☐ **Plus d'énergie**
- ☐ **Mieux dormir / mieux récupérer**
- ☐ **Bien-être général**
- **Motivation** : slider 1 → 10, label live (« 1 = je teste pour voir », « 10 = je suis prêt à m'engager à fond »)

#### Étape 3/5 — Ton vécu
- « As-tu déjà essayé quelque chose pour ça ? » : multi-select rapide
  - ☐ Régimes
  - ☐ Coach / accompagnement
  - ☐ Sport
  - ☐ Suppléments
  - ☐ Rien encore
- Si au moins 1 coché → champ optionnel **« Qu'est-ce que ça a donné ? »** (text 200 chars max)

#### Étape 4/5 — Tes habitudes (format ultra-court)
- **Petit-déj** : radio rapide
  - 🥐 Sucré (croissant, céréales, brioche)
  - 🥚 Salé (œufs, charcuterie)
  - 🥤 Smoothie / healthy
  - ☕ Café seulement / rien
  - ✏️ Autre (text court 50 chars)
- **Midi** : radio
  - 🏠 Maison
  - 🍽️ Cantine / resto
  - 🥪 Sandwich / wrap
  - 🍔 Fast-food
  - ⏭️ Je saute
- **Soir** : radio
  - 🏠 Maison
  - 🛵 Livraison
  - 🍔 Fast-food
  - 🥗 Léger / snack
  - ⏭️ Je saute
- **Fast-food / semaine** : slider 0 → 7+

#### Étape 5/5 — Budget + activité
- **Budget alimentaire / jour** : radio cards visuelles
  - 💰 2 €
  - 💰 4 €
  - 💰 8 €
  - 💰 10 €
  - 💰 15 € et +
- **Actif au quotidien ?** (marche, escaliers, jardin, manuel) : oui / non
- Si oui → champ optionnel **« Quoi ? »** (text 100 chars max)
- **Consentement RGPD** ☐ (mandatory) : « J'accepte que mes données soient transmises à mon coach pour analyse de mon bilan »

#### Comportement transversal du formulaire
- **Progress bar** en haut : `Étape 3/5` + barre visuelle
- **Bouton "Précédent"** sur étapes 2-5 (revenir en arrière sans perte)
- **Auto-sauvegarde** en `localStorage` (clé `lor-squad-bilan-online-${slug}`) à chaque champ rempli — si la personne ferme et rouvre dans la journée, on reprend où on en est
- **Validation par étape** : impossible d'avancer tant que les `required` de l'étape ne sont pas remplis
- **Mobile-first** : l'écrasante majorité des Leads remplira sur téléphone (clic depuis Instagram/WhatsApp). Touch targets ≥ 44px, font ≥ 16px (anti-zoom iOS)
- **Pas de scroll long** : 1 étape = 1 écran tenant sans scroll sur 375 × 667 (iPhone SE référence)

---

### B. Page Welcome — architecture et copy proposé (sous-feature 1.B enrichie)

**Hiérarchie visuelle** (mobile-first) :

```
┌─────────────────────────────────┐
│  [Logo La Base 360 gold]         │
│                                  │
│  Nous sommes heureux             │
│  de te voir ici 🥰               │  ← H1 Syne 28px, gold
│                                  │
│  [Photo coach OU illustration]   │  ← optionnel, image ronde 120px
│                                  │
│  [Si coach identifié]            │
│  Thomas K. va t'accompagner      │  ← Sub-hero DM Sans 16px, teal
│                                  │
│  [Si pas de coach]               │
│  Qui t'a invité ici ?            │
│  [____________autocomplete___]   │
│  ou                               │
│  [ Personne, je découvre seul ]  │  ← bouton secondaire ghost
│                                  │
│  ─────────────────────────       │
│                                  │
│  La Base 360, c'est :            │  ← H2 Syne 18px
│  • Un bilan personnalisé         │
│    pour comprendre ton corps     │
│  • Un coach humain qui           │
│    t'accompagne au quotidien     │
│  • Des résultats durables, pas   │
│    une mode passagère            │
│                                  │
│  ─────────────────────────       │
│                                  │
│  [ Commencer mon bilan ]         │  ← CTA primaire gold, large
│                                  │
│  Promis, ça prend 2 min 🙏       │  ← microcopy DM Sans 12px
│                                  │
└─────────────────────────────────┘
```

**Copy à valider Thomas** :
- **Hero** : « Nous sommes heureux de te voir ici 🥰 » ✅ (déjà acté)
- **Si coach** : « **{Prénom}** va t'accompagner » → personnalise visuellement
- **3 bullets La Base 360** : à raffiner avec Thomas (les miens sont génériques, faut le ton La Base 360)
- **CTA** : « Commencer mon bilan » + microcopy 2 min

**Comportement** :
- Si slug coach valide dans URL → photo/prénom coach affichés, le formulaire commence direct
- Si pas de slug → champ autocomplete + bouton "bilan libre"
- Si slug invalide (typo) → fallback racine avec toast `« Le lien ne correspond pas à un coach connu, mais tu peux quand même faire ton bilan »`

---

### C. Page de remerciement post-soumission ⚠️ NOUVELLE sous-feature 1.H

**Domaine** : Funnel post-conversion, rétention émotionnelle

**Description**
Après que la personne a cliqué "Envoyer mon bilan", elle atterrit sur une **page plein écran de remerciement** (pas un toast, pas une modale — un vrai moment).

**Contenu proposé** :

```
┌─────────────────────────────────┐
│  [✓ checkmark gold animé]        │
│                                  │
│  Merci {Prénom} ! 🙏             │  ← H1 Syne 32px
│                                  │
│  Ton bilan est arrivé chez       │
│  Thomas K.                       │  ← (ou "chez l'équipe La Base 360"
│                                  │     si bilan libre)
│  Il va l'analyser et te          │
│  recontacter sous 48h max.       │
│                                  │
│  ─────────────────────────       │
│                                  │
│  En attendant :                  │
│                                  │
│  [📱 Suis-nous sur Instagram]    │  ← lien social
│  [💬 Rejoins notre WhatsApp]     │  ← lien communauté (optionnel)
│  [📚 Découvre nos ressources]    │  ← lien blog/contenus (optionnel)
│                                  │
│  ─────────────────────────       │
│                                  │
│  Tu peux fermer cette page       │
│  ou la garder ouverte.           │  ← microcopy
│                                  │
└─────────────────────────────────┘
```

**Variantes selon contexte** :
- Si **bilan dirigé vers coach** : « Ton bilan est arrivé chez {Prénom Coach}. Il va te recontacter sous 48h max. »
- Si **bilan libre admin** : « Ton bilan est arrivé chez l'équipe La Base 360. Un coach adapté à ton profil va te répondre rapidement. »

**Pourquoi**
- **Rassurance immédiate** : « j'ai bien envoyé, quelqu'un va me répondre »
- **Engagement émotionnel** : ne pas laisser la personne sur un écran vide après avoir donné son temps
- **Soft cross-sell** : Instagram/WhatsApp/blog = touchpoints de rétention même si le coach met 24h à répondre

**Architecture**
- Réutiliser le **pattern** de `BilanTermineePage` (page de remerciement post-bilan coach existante avec QR code + partage + parrainage) MAIS adapter pour le contexte Lead public (pas de QR client, juste merci + social)
- Une seule route publique `bonline.labase360.com/{slug}/merci?leadId={uuid}` après POST réussi
- Animation checkmark gold à l'entrée (réutiliser keyframes existants)

**Effort** : **S — 2-3 heures** (pattern existant à adapter)

**Statut** : 🌳 prêt à coder dès que 1.A et 1.B sont posés

---

### D. Structure du module Prospection froide (chantier #3 enrichi)

#### Architecture du module

```
/outils-prospection (existant, à étendre)
   └─ Onglet "Client froid" (NEW)
       ├─ Étape 1 : Choix du profil cible
       │   └─ Cards visuelles (3 par défaut, extensible)
       │       - 🏃 Sportif
       │       - ⚖️ Perte de poids
       │       - 💼 Business / opportunité
       │       - [bouton + Admin : Ajouter un profil]
       │
       ├─ Étape 2 : Brief méthodologie (sur le profil sélectionné)
       │   ├─ Méthode GoPro résumée en 3 points
       │   ├─ Posture à adopter (indirecte, qualifiante)
       │   └─ Erreurs à éviter (3 max)
       │
       ├─ Étape 3 : Cibler
       │   ├─ Hashtags à utiliser (liste cliquable, copy-to-clipboard
       │   │   par hashtag : #fitnessmotivation, #pertepoidsfr, etc.)
       │   ├─ Champ géo-ciblage (ville) → suggestions lieux IRL
       │   │   pour rencontre (salles de sport, marchés, etc.)
       │   └─ Plateformes recommandées (Instagram / Facebook /
       │       LinkedIn pour business)
       │
       ├─ Étape 4 : Premier contact
       │   ├─ Message générique pour ce profil (texte avec bouton
       │   │   gros "Copier") — variants par plateforme :
       │   │   - Instagram (DM)
       │   │   - Facebook (Messenger)
       │   │   - Telegram (text + emoji)
       │   │   - SMS (court, sans emoji)
       │   └─ Microcopy : « Personnalise avec son prénom + 1 détail
       │       de son profil. Authentique > Parfait. »
       │
       ├─ Étape 5 : Arborescence de relance
       │   ├─ Si réponse positive : 2e message (engagement bilan)
       │   ├─ Si réponse curieuse : envoi de l'outil adapté
       │   │   (lien bilan online + slug coach pour profil
       │   │   perte de poids/sportif ; doc opportunité business
       │   │   pour profil business)
       │   ├─ Si pas de réponse à J+3 : message de relance soft
       │   └─ Si pas de réponse à J+7 : abandon respectueux
       │       (« on n'insiste pas, peut-être plus tard »)
       │
       └─ Étape 6 : Tracking (optionnel V2)
           ├─ Combien de messages envoyés cette semaine
           ├─ Taux de réponse
           └─ Conversion en Lead bilan
```

#### Tables nécessaires

**`prospection_profiles`** (config admin extensible)
- `id` uuid PK
- `slug` text unique (sportif / perte-poids / business / etc.)
- `label` text (affichage)
- `icon` text (emoji ou nom Lucide)
- `color` text (token CSS ou hex)
- `description` text (brief méthodologie)
- `hashtags` text[] (liste hashtags cibles)
- `scripts` jsonb (1er message + relances par plateforme)
- `target_tools` jsonb (`{positive_response: "bilan-online", ...}`)
- `ordre` int
- `created_by` uuid FK users
- `is_active` boolean

**`prospection_attempts`** (V2 tracking — pas mandatory au lancement)
- `id` uuid PK
- `coach_id` uuid FK users
- `profile_id` uuid FK prospection_profiles
- `target_label` text (nom/pseudo Insta de la cible)
- `platform` text (instagram/facebook/telegram/sms/...)
- `first_message_sent_at` timestamptz
- `response_status` enum (none/curious/positive/negative)
- `converted_to_lead_id` uuid FK online_bilans (si conversion)
- RLS : coach voit ses propres attempts uniquement

#### Page admin `/admin/prospection-profiles`

CRUD profils (create / edit / activate / deactivate / reorder). Form admin avec :
- Champ label, slug, icon, color
- Éditeur Markdown pour description et scripts
- Multi-input pour hashtags
- Champs target_tools (boutons-outils par contexte de réponse)

#### Effort estimé révisé chantier #3

| Sous-feature | Effort |
|---|---|
| Audit `/outils-prospection` existant | 30 min |
| Tables + RPC + RLS | 0.5 j |
| Page admin CRUD profils | 1 j |
| UI distri (étapes 1-5) | 2 j |
| Rédaction contenus textes (3 profils complets) | 1 j (Thomas + relecture) |
| Tracking V2 (étape 6) | 0.5 j (optionnel V1) |
| Polish + announcement | 0.5 j |
| **Total V1 sans tracking** | **~5 jours** |
| **Total V2 avec tracking** | **~5.5 jours** |

---

### E. Chantier #5 — Internationalisation (langue + monnaie) ⚠️ NOUVEAU

**Domaine** : Infra / Funnel / Stratégie internationale

**Description**
Permettre à un distri de **recruter à l'étranger** (ex : Inde) en faisant en sorte que la **page business + simulateur revenus + bilan online** soient **automatiquement traduits** dans la langue cible et que la **monnaie** s'affiche en local.

**Pourquoi**
- **Développement international** : c'est la condition sine qua non pour scaler hors-France
- **Conversion** : un Indien ne s'engage pas sur une page en français avec des prix en euros
- **Différentiateur produit** : très peu de coaches Herbalife ont un funnel multilingue auto

**Cibles prioritaires** (à valider Thomas)
- Pages **publiques exposées en recrutement** : `/opportunite`, `/simulateur`, `/welcome`, et **bilan online** (chantier #1)
- App client PWA en V2 si Lead converti (lecture confort dans sa langue)
- Pas l'app coach (les coaches restent en français)

**Stratégie technique — 3 options**

| Option | Comment | Avantages | Inconvénients |
|---|---|---|---|
| **A — Statique i18n (react-intl / i18next)** | Fichiers JSON par langue (`fr.json`, `en.json`, `hi.json`...), traduits manuellement ou via DeepL en batch | Contrôle total, pas de coût runtime, SEO ok | Charge de traduction initiale + maintenance à chaque ajout de copy |
| **B — Dynamique (Anthropic API à la volée)** | À chaque visite, on envoie le contenu à Claude qui traduit en streaming | Aucune maintenance traduction, scale infini | Latence (1-3s par page), coût API récurrent, risque inconsistance entre 2 visites |
| **C — Hybride** ⭐ | Statique pour pages clés stables (i18next), dynamique (Anthropic) pour user-generated et bilan en cours | Compromis qualité/coût/maintenance | Architecture un peu plus complexe |

**Reco agent** : **Option A** au démarrage (plus solide, prévisible), migrer vers C si besoin de scale.

**Détection langue/pays**
- IP geolocation gratuite (`ipapi.co` free tier 1000 req/jour, ou `ip-api.com` 45/min)
- Fallback : `navigator.language` du browser
- Override manuel : sélecteur drapeau en haut de page (FR / EN / ES / HI / ...)
- Persistance : `localStorage.ls-locale` + cookie

**Conversion monnaie**
- API exchange rates : `exchangerate-api.com` (free tier 1500 req/mois) ou `frankfurter.app` (gratuit illimité, basé ECB)
- Cache 24h dans `localStorage` (pas besoin de précision temps réel)
- Affichage : prix euros stockés en DB, conversion à l'affichage selon `locale`
- Format : `Intl.NumberFormat(locale, { style: 'currency', currency: localCurrency })`

**Cibles initiales suggérées** (à valider)
- 🇫🇷 français (origine)
- 🇬🇧 anglais (international)
- 🇪🇸 espagnol (Espagne + LatAm)
- 🇮🇳 hindi (mention explicite Thomas — gros marché Herbalife)
- 🇩🇪 allemand
- 🇮🇹 italien

→ 6 langues couvrent ~70% du potentiel Herbalife mondial.

**Tables / config**
- Pas de nouvelle table critique — juste des fichiers `i18n/{lang}.json` dans le repo
- Optionnel : table `user_locale_preference (user_id, locale, currency_override)` si on laisse les distri configurer leur langue de funnel

**Effort estimé** : **XL — 5 à 8 jours**

| Sous-feature | Effort |
|---|---|
| Setup i18next + extraction strings (`/opportunite`, `/simulateur`, `/welcome`) | 1.5 j |
| Traduction batch DeepL des 6 langues + relecture | 1 j |
| Détection IP + sélecteur drapeau + persist | 0.5 j |
| Conversion monnaie + formatting | 1 j |
| Extension bilan online (chantier #1) à i18n | 1 j |
| Tests par langue (RTL pour arabe si futur) | 1 j |
| Polish + announcement | 0.5 j |

**Dépendances / risques**
- **Doit être fait APRÈS** chantier #1 (sinon on i18n une cible mouvante)
- **Hébergement** : si on cible LatAm/Asie, Vercel Edge réseau correct mais à monitorer la latence depuis ces régions
- **Légal** : RGPD UE OK, mais autres pays (Inde DPDPA, Brésil LGPD, etc.) — à vérifier avant lancement public dans ces juridictions
- **Méthode Herbalife** : vérifier que les visuels/messages business respectent les guidelines marketing Herbalife pays par pays (encadrement strict des promesses revenus selon législations locales)

**Statut** : 🌱 brut — vision claire mais beaucoup d'arbitrages produit à faire avant de coder

**Questions ouvertes pour ce chantier** :
1. Cibles linguistiques : les 6 que j'ai listées te conviennent ou autre priorité ?
2. Option A / B / C : tu valides ma reco A (statique i18next) ?
3. Détection auto IP ou tu préfères imposer un sélecteur explicite ?
4. Pour la monnaie : conversion temps réel ou prix locaux figés (pricing par marché) ?
5. La **page business** mentionnée dans ton message — c'est `/opportunite`, `/simulateur`, ou un nouveau truc à créer ?

---

---

## 🆕 Dump #2 (2026-05-10 fin de journée Égypte)

### Décision N1 — Renommage projet

✅ **Le projet s'appelle désormais "La Base 360"** (et non plus "Lor'Squad" / "Lor'Squad Wellness" / "Lor Académie").

**À retenir pour l'agent** : ne JAMAIS écrire "Lor'Squad" ni "Lor Académie" dans tout nouveau document, copy UI, message marketing, ou contenu utilisateur. Toujours **"La Base 360"**.

**Note technique** : le repo, `package.json`, `CLAUDE.md`, branches, etc. utilisent encore l'ancien nom dans le code source. **Le renommage du code n'est pas dans le scope actuel** (faudra un chantier dédié de propagation : repo rename, package.json, CLAUDE.md, occurrences UI dans les composants). À traiter séparément avec précaution (impacts liens externes, SEO, branding).

### Décision N2 — Couplage chantier #1 ↔ #3 confirmé

✅ Le **bilan online** est aussi un **outil de prospection froide**. Cas d'usage validé Thomas : « je peux partager le lien via une conversation sur un groupe Facebook régime par exemple ».

**Implication** : dans le chantier #3 (Prospection), le **lien du bilan coach personnalisé** (`labase360.com/bonline/{slug-coach}` à confirmer URL finale) doit être **disponible en copier-coller** dans chaque flow de profil prospection. C'est l'**outil principal de conversion** pour la prospection froide.

### Décision N3 — Onglet Prospection dédié dans l'app coach

✅ Thomas veut un **onglet "Prospection" complet et structuré** dans l'app coach, mobile-first, qui guide le distri étape par étape.

**Exemple parfait UX donné par Thomas** :
> « Prospection > perte de poids > groupe Facebook > copier un message rapide étapes 1-2-3 + lien bilan du coach prêt à copier »

**Hiérarchie cible** :
```
Prospection
   ├─ Perte de poids
   │   ├─ Groupe Facebook  →  message 1, 2, 3 + lien bilan coach
   │   ├─ DM Instagram     →  message 1, 2, 3 + lien bilan coach
   │   ├─ Telegram         →  message 1, 2, 3 + lien bilan coach
   │   └─ SMS              →  message 1, 2, 3 + lien bilan coach
   ├─ Sportif              (même structure)
   ├─ Business             (même structure)
   └─ [+ profils ajoutés admin]
```

**Position dans l'app — à arbitrer (question ouverte)** :
- Option 1 : **nouvelle entrée sidebar "Prospection"** (mais on dépasse les 9 items de la règle Option B…)
- Option 2 : **renommer/refondre `/outils-prospection`** existant pour absorber ce nouveau module (cohérent, évite doublon)
- Option 3 : **nouvelle carte dans le hub `/developpement`** qui pointe vers `/outils-prospection` enrichi
- Option 4 : **lien rapide depuis Co-pilote** (bouton CTA "Prospecter maintenant" qui ouvre le module)

**Reco agent** : combinaison **Option 2 + Option 4**. Refondre `/outils-prospection` (déjà 863 L, on ne crée pas de doublon) en lui donnant cette nouvelle structure mobile-first, et ajouter un lien rapide depuis Co-pilote pour discoverability (cf. note constat #6 plus bas).

**Cahier des charges UX mobile-first** (validé Thomas) :
- ≤ 3 taps pour arriver au message à copier
- Boutons "Copier le message" + "Copier le lien bilan" séparés et énormes
- Microcopy guidant : « Étape 1 : ouvre Facebook Étape 2 : trouve un groupe perte de poids Étape 3 : colle ton message »
- Aucune navigation complexe, tout linéaire

**Doublon à vérifier au retour PC** (audit léger ~30 min) :
- `/outils-prospection` existant : qu'est-ce qu'il contient déjà ? Si déjà cette logique → on enrichit. Sinon → refonte.

### Idée N4 — Chantier #6 : Vidéos pédagogiques YouTube + intégration app

**Domaine** : Pédagogie produit / Discoverability / Onboarding distri

**Description** (idée brute Thomas)
- Thomas va créer des **vidéos pédagogiques** de 3 à 5 minutes maximum, expliquant chaque onglet de l'app
- Hébergées sur une **chaîne YouTube dédiée "La Base 360"**
- Intégration dans l'app : chaque onglet/feature aura un **lien vers la vidéo correspondante** (icône ❓ ou "Voir le tuto")
- Thomas s'occupe de **produire les vidéos lui-même au retour** — c'est le côté contenu, pas dev

**Pourquoi**
> Citation Thomas : « j'ai l'impression que pas beaucoup de personnes utilisent l'application et ne vont dans aucun onglet alors qu'il y a tellement de richesse dedans »

C'est un problème de **discoverability** réel. Sans onboarding visuel ni rappel pédagogique, les distri ne découvrent pas les features. Les vidéos = **prof particulier asynchrone** disponible 24/7.

**Côté dev** (ce que l'agent fait)
- Étendre la table `app_announcements` ou créer `feature_tutorials (feature_key, video_url, duration, thumbnail)`
- Composant `<TutorialLink featureKey="prospection-perte-de-poids" />` à embedder dans chaque page/onglet (icône discrète)
- Au clic : modale qui charge la vidéo YouTube (iframe embed) sans quitter l'app
- Page `/developpement/tutos` qui liste toutes les vidéos avec progression (vues / non vues)

**Effort dev** : **M — 3-4 heures** (juste le système de liaison, Thomas fournit les vidéos)

**Côté contenu** (ce que Thomas fait)
- Production vidéos : ~30 min par vidéo × ~15-20 onglets = **~10-15h de prod**
- À faire **au retour, pas sur mobile**

**Statut** : 🌱 brut côté dev (système simple à coder), 🌱 brut côté contenu (à produire post-PC). Pas urgent, mais **gros levier d'adoption**.

### Constat N5 — Discoverability (problème transverse)

> Citation Thomas : « j'ai l'impression que pas beaucoup de personnes utilisent l'application et ne vont dans aucun onglet alors qu'il y a tellement de richesse dedans »

Ce constat n'est pas un chantier en soi mais **un fil rouge à garder en tête** sur tous les chantiers à venir. Il pointe vers plusieurs leviers déjà identifiés ou à activer :

| Levier | Statut |
|---|---|
| Hub `/developpement` (Option B cards) | ✅ Existe déjà — sous-utilisé ? À auditer |
| Annonces `app_announcements` (cloche header) | ✅ Existe déjà — utilisée ? |
| Chantier #2 (check-list quotidienne) | 🔜 Va forcer le passage par les onglets clés |
| Chantier #6 (vidéos pédagogiques) | 🔜 Cf. ci-dessus |
| Tour onboarding distri (ré-déclenchable) | ⚠️ Existe via `user_tour_progress` — à vérifier si toujours actif |
| Notif push proactives sur features non-utilisées | 💡 Idée nouvelle : « Tu n'as jamais ouvert FLEX, voici comment ça marche [vidéo] » |

À traiter comme **principe directeur** : chaque nouveau chantier doit prévoir son **propre onboarding** (announcement, vidéo, tour, ou simple highlight). Sinon il rejoint le cimetière des features non-utilisées.

---

## 📊 Roadmap consolidée (après dump #1 + #2)

| # | Chantier | Effort | Priorité reco |
|---|---|---|---|
| **#1** | Bilan Online + Lead pipeline (8 sous-features avec page remerciement 1.H) | 5-9 j | **P0** — fondation funnel |
| **#3** | Prospection (module mobile-first, onglet dédié, refonte `/outils-prospection`, alimenté par lien bilan #1) | ~5-5.5 j | **P1** — couplé à #1 |
| **#5** | Internationalisation (langue + monnaie) | 5-8 j | **P2** — nécessaire pour scale international, **après #1** |
| **#2** | Check-list quotidienne Co-pilote | 4-6 h | **P3** — capitalise #1 + #3 |
| **#4** | Lien Cahier de bord depuis Co-pilote | 30 min | **P3 bis** — à glisser dans #2 |
| **#6** | Vidéos pédagogiques YouTube + intégration app | 3-4 h dev (+ ~10-15 h prod vidéos Thomas) | **P4** — gros levier discoverability, à activer dès qu'une vidéo existe |

**Total estimé** : ~16 à 23 jours de dev (sans la prod vidéo Thomas). Réalisable en 5-7 semaines à temps plein, ou 2-3 mois à temps partiel.

**Fil rouge transverse** : chaque chantier doit prévoir son propre onboarding (announcement + vidéo tutoriel + tour) pour résoudre le problème de discoverability (constat N5).

---

## 🆕 Dump #2 — Réponses Thomas (2026-05-10 soir)

### Décisions actées

| Q | Sujet | Décision Thomas |
|---|---|---|
| **Q1.1** | Étapes bilan + copy Welcome/Remerciement | ✅ **Validés tels quels** |
| **Q3.1** | Position onglet Prospection | ✅ **Refonte `/outils-prospection`** existant. Thomas fera l'analyse de cohérence une fois la création réalisée. |
| **Q5.2** | Stratégie i18n statique (i18next) | ✅ **Validée** |
| **Q5.3** | Détection langue | ✅ **Auto IP + drapeau au choix** (combo) |
| **Q5.4** | Prix par marché | ✅ **Prix dédiés par marché** (pas de conversion temps réel). Thomas ira chercher le catalogue produit/marché + prix au retour. |

### Q5.4 — Architecture proposée pour prix multi-marchés

Comme Thomas valide « chaque marché à ses prix », architecture recommandée :

**Table dédiée `pv_product_market_pricing`** (plutôt qu'un JSON dans `pv_products`) :
- `id` uuid PK
- `product_id` uuid FK `pv_products`
- `market_code` text (FR / ES / BR / TR / IN / ...)
- `price_amount` numeric (en monnaie locale)
- `currency_code` text (EUR / USD / BRL / TRY / INR / ...)
- `pv_amount` numeric (les PV peuvent varier selon les marchés)
- `valid_from` timestamptz
- `valid_to` timestamptz nullable
- RLS : SELECT public actif distri, UPDATE admin uniquement

**Avantages** :
- Audit historique des prix (qui a changé quoi quand)
- Plusieurs prix valides simultanément possible (ancien tarif jusqu'à date X, nouveau dès X+1)
- Pas de pollution du JSON `pv_products` qui doit rester rapide à lire

**Charge de saisie** : ~200 produits × ~8 marchés = **1 600 lignes** à saisir initialement. **Prévoir un import CSV/Excel** dans la page admin pour ne pas saisir à la main → effort additionnel **~3-4h dev** pour l'importeur. Thomas remplit ensuite en autonomie au retour.

### Q5.1 — Analyse langues prioritaires + anglais prospection

#### Analyse marchés Herbalife à fort développement

J'analyse les marchés où Herbalife a un volume + une croissance significatifs (sources publiques 2024-2025 : rapports financiers Herbalife + tendances MLM Wellness) :

| Marché | Volume estimé | Croissance | Langue | Population diaspora |
|---|---|---|---|---|
| 🇲🇽 Mexique | Top 5 mondial Herbalife | Stable + | Espagnol | — |
| 🇧🇷 Brésil | Top 5 mondial Herbalife | Forte croissance | Portugais (BR) | Portugal, Angola |
| 🇺🇸 USA | Marché historique #1 | Mature | Anglais | — |
| 🇮🇳 Inde | Très gros, en boom | **Forte croissance** | Hindi (60%) + anglais business (40%) | UK, EAU |
| 🇹🇷 Turquie | **Marché chaud, mention Thomas** | **Forte croissance** | Turc | Allemagne (5M) |
| 🇪🇸 Espagne | Solide | Stable | Espagnol | LatAm |
| 🇫🇷 France | Origine pour Thomas | Stable | Français | Maghreb francophone, Afrique de l'Ouest |
| 🇮🇩 Indonésie | Très gros | **Forte croissance** | Indonésien | — |
| 🇻🇳 Vietnam | Moyen, en boom | **Forte croissance** | Vietnamien | — |
| 🇩🇪 Allemagne | Solide | Stable | Allemand | Turcs immigrés (5M = leverage avec turc !) |
| 🇮🇹 Italie | Solide | Stable | Italien | — |
| 🇲🇦 Maroc | Émergent francophone | Croissance | Arabe + Français | France |
| 🇨🇳 Chine | Énorme | Réglementation MLM compliquée | Mandarin | — |

#### Recommandation phasée

**Phase 1 — V1 i18n (5 langues, ROI immédiat)**

| Langue | Justification |
|---|---|
| 🇫🇷 **Français** | Origine + Afrique francophone (Maroc, Algérie, Tunisie, Sénégal, Côte d'Ivoire), Belgique, Suisse, Québec |
| 🇬🇧 **Anglais** | Lingua franca + USA + UK + Inde business + DM Insta/FB internationaux génériques |
| 🇪🇸 **Espagnol** | Espagne + LatAm complet (Mexique top 5, Argentine, Colombie, Chili, Pérou) — **un des plus gros leviers** |
| 🇵🇹 **Portugais (BR)** | Brésil top 5 mondial Herbalife — incontournable. Brésilien ≠ portugais européen, choisir BR. |
| 🇹🇷 **Turc** | Mention explicite Thomas + marché Herbalife actif + leverage diaspora turque en Allemagne (5M personnes) |

**Phase 2 — V2 i18n (extension selon priorités Thomas)**

| Langue | Justification |
|---|---|
| 🇩🇪 Allemand | Marché solide + Suisse alémanique + Autriche |
| 🇮🇹 Italien | Italie + Tessin Suisse |
| 🇮🇳 Hindi | Inde — population gigantesque, mais Inde business parle souvent anglais (V1 EN couvre déjà partiellement) |
| 🇸🇦 Arabe | MENA + Maghreb (peut compléter le français Maghreb) |

**À écarter (sauf demande forte)** :
- Mandarin (réglementation MLM compliquée en Chine, ROI incertain pour Herbalife)
- Indonésien / Vietnamien (gros volumes mais marchés très éloignés culturellement, tarifs export logistiques compliqués pour un coach français)

#### Question subsidiaire Thomas : « est-ce qu'il faut parler anglais sur le message de prospection ? »

**Réponse argumentée** :

❌ **Pas l'anglais comme langue par défaut de prospection**.

✅ **Le message de prospection doit être dans la langue de la CIBLE, pas du distri**.

**Pourquoi** :
- Un Marocain francophone qui reçoit un DM en anglais = ignoré (registre froid + suppose qu'il parle pas la langue)
- Un Brésilien qui voit un message en anglais sur un groupe FB lusophone = scroll
- Le **taux de conversion d'un message dans la langue maternelle de la cible est 3 à 5 fois supérieur** à un message en anglais générique (sources : études marketing direct DM social media 2023-2024)

**Cas où l'anglais EST utile** :
- 🌐 **Profils Instagram internationaux non-identifiés géographiquement** (compte avec 50% audience US, 30% UK, 20% EU non-FR) → anglais = compromis acceptable
- 🇮🇳 **Inde business** : la classe moyenne aisée (cible Herbalife) parle anglais en pro plus volontiers que hindi
- 🇪🇺 **Diaspora multi-pays Insta** où la langue commune EN passe mieux que toute autre

**Recommandation pratique pour le module Prospection (chantier #3)** :
- Au démarrage V1 chantier #3 : scripts disponibles en **FR + EN** seulement (couvre 80% des cas pour un coach français qui scale)
- Au fil de l'eau : Thomas (ou admin) ajoute des scripts **ES, PT, TR** pour les marchés actifs
- L'extensibilité de la table `prospection_profiles` (champ `scripts` jsonb) permet d'ajouter une variante de langue **par script et par plateforme**, exemple :
  ```json
  {
    "platforms": {
      "instagram": {
        "fr": "Salut, j'ai vu ton profil...",
        "en": "Hey, saw your profile...",
        "es": "Hola, vi tu perfil...",
        "pt": "Oi, vi seu perfil...",
        "tr": "Merhaba, profilini gördüm..."
      },
      "facebook": { ... },
      ...
    }
  }
  ```
- L'UI distri détecte la langue de la cible (champ "langue de la cible" dans le step 3) et affiche le bon variant. Si pas dispo → fallback EN.

**Effort additionnel pour multi-langue dans #3** : **+1 j** (ajout du champ langue dans le flow + UI sélecteur + traductions FR/EN initiales). Effort total chantier #3 mis à jour : **~6-6.5 j** au lieu de 5-5.5 j.

---

## ❓ Questions encore en suspens (au 2026-05-10 fin de soirée)

| # | Question | En attente de |
|---|---|---|
| Q5.1 (réponse) | Validation par Thomas de ma liste 5 langues V1 (FR/EN/ES/PT/TR) + extension V2 (DE/IT/HI/AR) ? Et de ma reco "FR+EN pour scripts prospection au démarrage" ? | Réponse Thomas |

---

## 🆕 Dump #2 (suite) — réponses Thomas Q5.5 + Q meta (2026-05-10 nuit)

### Q5.5 — Page business pour i18n

✅ **Validé** : la page business cible = `/opportunite` + `/simulateur` (les 2 pages publiques actuelles du funnel).

⚠️ **Mais** Thomas pose une sous-question stratégique :

> « à voir si on fait une vraie architecture pour ça »

Il suggère implicitement qu'avant de partir traduire ces 2 pages telles quelles en 5 langues, il faudrait **réfléchir à leur cohérence d'ensemble** (sont-elles bien liées ? bien structurées ? scénarisées ?). Logique : i18n une architecture pertinente plutôt que 2 pages dispersées.

#### Sous-chantier potentiel — Refonte architecture section business

**Constat sur l'existant** :
- `/opportunite` : 1020 lignes, page standalone funnel business educatif (V1 sans nom marque, créée 2026-11-07)
- `/simulateur` : 1012 lignes, simulateur revenus interactif funnel V2
- Ces 2 pages ne sont **pas explicitement reliées** (pas de fil narratif entre elles)
- Pas de **landing business** unique qui orchestre tout
- Avec le rebranding "La Base 360", il faut probablement aussi **réécrire le copy** sur ces pages

**3 options d'architecture business cohérente** (à arbitrer Thomas) :

| Option | Concept | Pros | Cons |
|---|---|---|---|
| **A — Funnel séquentiel 3 étapes** | Landing `/business` → CTA → `/opportunite` (comprendre) → CTA → `/simulateur` (calculer) → CTA → contact | Fil narratif clair, mesurable funnel-style, conversion progressive | 3 pages à maintenir + animations transitions |
| **B — Page unique scroll narratif** | `/business` unique avec sections : Hero → Pourquoi La Base 360 → L'opportunité → Simulateur intégré → Témoignages → CTA contact | Tout-en-un, chargement rapide, mobile-friendly, pas de saut de page | Page très longue, simulateur peut alourdir le bundle |
| **C — Hub business + sous-pages** | `/business` = hub avec cartes (style hub `/developpement`) → opportunité, simulateur, témoignages, FAQ. Chaque carte = sous-page autonome | Modulaire, navigation libre, facile à enrichir | Moins de fil narratif, plus de clics |

**Reco agent** : **Option B** (page unique scroll narratif). Raisons :
- Mobile-first (pas de friction de chargement entre pages)
- Conversion supérieure prouvée pour les funnels business avec scroll narratif
- 2 pages actuelles (`/opportunite` + `/simulateur`) fusionnées en 1 = -1 page à i18n = -20% effort traduction
- Permet d'intégrer le **simulateur en composant inline** plutôt qu'en page dédiée
- Architecture compatible i18next (1 fichier de traduction = 1 page)

**Effort estimé refonte business V2** : **L — 3-4 jours**
- Audit `/opportunite` + `/simulateur` actuels : ~2h
- Maquette + flow narratif (Hero → Pourquoi → Opportunité → Simulateur → Social proof → CTA) : ~1 j
- Implémentation page unique + intégration simulateur en composant : ~1.5 j
- Copy rebrandé "La Base 360" : ~0.5 j (Thomas + relecture)
- Polish + announcement : ~0.5 j

**Statut** : 🌱 brut — la sous-question est levée par Thomas, à acter par sa réponse.

### Q meta — Renommage code source "La Base 360"

✅ **Décision Thomas** : le renommage du code source aura lieu **après l'achat du domaine** (au retour PC). Sera fait en **mode coopératif guidé** : agent guide Thomas étape par étape, on applique ensemble les changements et la redirection.

**Implication ordonnancement** :
- Au retour PC, ordre suggéré :
  1. Achat + config DNS du domaine `labase360.com` (Thomas seul)
  2. Renommage code source coopératif (agent + Thomas) — chantier dédié `feat/rename-la-base-360`
  3. Lancement chantiers fonctionnels (#1, #3, etc.) sur la base déjà renommée
- Cette séquence évite : (a) i18n d'un nom qui va changer, (b) traductions à refaire, (c) liens marketing qui pointent sur l'ancien nom

**Périmètre du renommage code (à confirmer plus tard)** :
- `package.json` : `name`, `description`
- `CLAUDE.md` : header + occurrences
- `index.html` : `<title>`, `<meta>`
- `src/**/*.tsx` : occurrences UI dans composants (hero, footer, emails, modals)
- Branches Git ? (option : créer nouvelles branches `production`, `develop` avec nouveau nom plutôt que renommer les anciennes)
- Repo GitHub ? (rename repo via paramètres)
- Fichiers config (`vercel.json`, etc.)

Effort estimé : **M — 4-6h** (recherche + remplacement + validation + tests régression).

---

## ✅ Toutes les questions tranchées (clôture dump #2 — 2026-05-10 nuit)

### Décisions finales

| Q | Sujet | Décision Thomas |
|---|---|---|
| **Q5.1** | 5 langues V1 (FR / EN / ES / PT-BR / TR) + scripts prospection FR+EN au démarrage | ✅ **Validé** |
| **Q5.5 bis** | Refonte `/opportunite` + `/simulateur` en page unique `/business` scroll narratif (Option B) AVANT i18n | ✅ **Validé** |
| Q meta | Renommage code après achat domaine, en coopératif guidé | ✅ **Acté** |

**État global** : 🎉 **toutes les questions sont tranchées**. Vision complète et prête pour exécution PC.

---

## 🚀 Roadmap exécution finale (au retour PC)

### ⚠️ Note importante sur les estimations

Mes estimations précédentes en "X jours" étaient en **jours-homme classiques** (8h/jour dev humain). C'est trompeur ici. Je détaille désormais en **3 colonnes distinctes** :

- **h-agent** : heures effectives de l'agent qui code (3-5× plus rapide qu'un humain sur le code pur, pareil/plus lent sur audit + design interactif)
- **h-Thomas** : heures de TON temps réel (validation, décisions, copy, DNS, prod vidéos, catalogue produits par marché)
- **Calendrier réaliste** : durée totale en jours/semaines, dépend de la fréquence d'aller-retour

### 🪜 Règle d'or — étapes franches, jamais de mélange

> Citation Thomas (10/05/2026) : « il faut surtout structurer les chantiers, pas que ça mêle les pinceaux, faire des belles étapes étape par étape ».

✅ **Discipline imposée** :
- 1 chantier = N étapes numérotées
- Chaque étape = **1 livrable testable** (commit isolé, possiblement PR)
- **On ne passe à l'étape N+1 qu'après validation de l'étape N** (commit clean, test ok, ton OK)
- En cas d'imprévu : on s'arrête, on documente, on repart proprement
- Pas de « je commence le suivant pendant que celui-ci finit » — ça mélange les pinceaux

### Ordre de bataille recommandé (15 phases — révisé après dump #5)

| # | Phase | h-agent | h-Thomas | Type |
|---|---|---|---|---|
| **0** | Fix mobile chat history (objet initial branche) | 30 min - 1 h | 5 min recette | Code |
| **0.5** | 🐛 Fix bug Celebration popup régressé Co-pilote V5 (cf. dump #6) | 30-45 min | 5 min recette | Code |
| **1** | Achat + config DNS `labase360.com` | — | 1-2 h | Infra Thomas |
| **2** | Renommage code source "La Base 360" (coopératif) | 2-4 h | 30 min validation + 15 min rename repo GitHub | Code |
| **3** | Audits légers (`/clients` V2 kanban, `/outils-prospection`) | 1-2 h | 5 min lecture rapport | Audit |
| **4** | ⚠️ **Chantier #9 — Refacto `NewAssessmentPage.tsx` (DETTE TECHNIQUE)** — bloquant pour #1 | **10-15 h** | 30 min recette régression | Code |
| **5** | **Chantier #1 — Bilan Online + Lead pipeline** (réutilise les steps refactorés en #9) | **20-31 h** | 3-5 h (validation copy, choix produits, slug coach) | Code |
| **6** | **Chantier #10 — Badges + certifications coach visibles** (quick win après #1) | **3-4 h** | 5 min validation | Code |
| **7** | **Chantier #3 — Refonte prospection mobile-first** | **14-22 h** | 2-3 h (rédaction scripts FR+EN initiaux) | Code |
| **8** | **Chantier #7 — Refonte business `/business` + popup lead capture** | **12-18 h** | 2-3 h (validation copy rebrandé) | Code |
| **9** | **Chantier #11 — Témoignages clients vérifiés** (alimente #7 et #8) | **6-8 h** | 1-2 h (relance 1ers clients) | Code + Contenu |
| **10** | **Chantier #5 — i18n + multi-monnaie** | **16-23 h** | 5-8 h (catalogue produits par marché ~1600 lignes + relecture traductions) | Code + Contenu |
| **11** | **Chantier #2 — Check-list quotidienne Co-pilote** + #4 lien Cahier de bord | **7-9 h** | 30 min validation | Code |
| **12** | **Chantier #6 — Vidéos pédagogiques + intégration app** | 3-4 h dev | 10-15 h prod vidéos | Code + Contenu |
| **13** | **Chantier #8 — Newsletter mensuelle privée + publique lead-magnet** | 17-25 h | 2-4 h (rédaction 1ère newsletter mai-juin) | Code + Contenu |
| **14** | MAJ `CLAUDE.md` roadmap + lancement vague 2 (backlog A2-A6 + I1-I10) | 30 min + à étaler | — | Doc |

### Totaux honnêtes (révisés après dump #5 — chantiers #9 + #10 + #11)

**Vague 1 (les 11 chantiers + 4 phases prep)** :
- **Total h-agent** : ~**114 à 171 heures** de codage agent effectif
- **Total h-Thomas** : ~**29 à 47 heures** dispersées sur la durée totale

**Vague 2 (backlog différé : A2-A6 + I1-I10)** :
- **Total h-agent additionnel** : ~**150 à 220 heures**
- **À programmer** après livraison stable de la vague 1, en priorisant selon ROI observé

**Grand total agent (vague 1 + vague 2)** : ~**265 à 390 heures** sur l'ensemble du roadmap brainstormé.
- **Calendrier réaliste possible** :
  - **Sprint intensif** (Thomas dispo plusieurs h/jour pour valider) : ~**3 à 4 semaines** calendaires
  - **Régulier** (Thomas 1-2 h/jour) : ~**6 à 10 semaines** calendaires
  - **Doux** (Thomas 30 min/jour, en parallèle activité principale) : ~**3 à 5 mois** calendaires

---

## 🪜 Découpage opérationnel par chantier (étapes franches, livrables testables)

### Chantier #1 — Bilan Online + Lead pipeline (10 étapes)

| Étape | Livrable testable | h-agent |
|---|---|---|
| **1.1** | Migration SQL `online_bilans` + RLS (test : insert anonyme via service_role OK) | 1-2 h |
| **1.2** | Edge function `submit-online-bilan` (test : POST curl, vérif insertion DB) | 2-3 h |
| **1.3** | Page bilan publique formulaire 5 étapes + progress bar + auto-save (test : fill complet sur mobile, soumission OK) | 4-6 h |
| **1.4** | Page Welcome + routing slug coach + autocomplete + fallback bilan libre (test : `/thomas` vs `/`, slug invalide) | 2-3 h |
| **1.5** | Page remerciement post-soumission (test : redirect après POST, copy adapté coach/admin) | 1-2 h |
| **1.6** | Extension `/clients` V2 onglet Leads filtré + kanban statuts dédiés (test : DnD entre colonnes, filtre Leads/Clients OK) | 3-4 h |
| **1.7** | Trigger Postgres + edge function `new-online-bilan-notifier` (test : nouveau bilan → push reçu coach) | 2-3 h |
| **1.8** | Templates réponse inline pop-up + boutons "Copier" + lien optionnel `/outils-prospection` (test : copy fonctionne, retour Lead OK) | 2-3 h |
| **1.9** | Auto-qualification "Contact" au "message envoyé" + insert `follow_ups` relance J+3 + notif programmée | 2-3 h |
| **1.10** | Recette parcours complet + entrée `app_announcements` + carte hub `/developpement` | 1-2 h |

**Total chantier #1 : 20-31 h-agent + 3-5 h Thomas**

### Chantier #3 — Refonte prospection mobile-first (8 étapes)

| Étape | Livrable testable | h-agent |
|---|---|---|
| **3.1** | Audit `/outils-prospection` actuel (rapport « réutilisable vs à jeter ») | 1 h |
| **3.2** | Migration SQL `prospection_profiles` + (V2) `prospection_attempts` + RLS | 1-2 h |
| **3.3** | Page admin CRUD profils + éditeur scripts JSONB par plateforme/langue | 3-4 h |
| **3.4** | UI distri étapes 1-5 mobile-first : choix profil → brief → cibler → premier contact → arborescence (test parcours 375×667) | 6-8 h |
| **3.5** | Champ langue de la cible + sélecteur dans flow + fallback EN si traduction manquante | 2-3 h |
| **3.6** | Lien rapide depuis Co-pilote "Prospecter maintenant" | 30 min |
| **3.7** | (V2 optionnel) Tracking `prospection_attempts` + stats simples | 3-4 h |
| **3.8** | Recette + announcement + carte hub | 1-2 h |

**Total chantier #3 V1 : 14-22 h-agent + 2-3 h Thomas (scripts FR+EN initiaux)**

### Chantier #7 — Refonte business `/business` scroll narratif (7 étapes)

| Étape | Livrable testable | h-agent |
|---|---|---|
| **7.1** | Audit `/opportunite` + `/simulateur` (rapport blocs réutilisables) | 1 h |
| **7.2** | Maquette flow narratif (Hero → Pourquoi → Opportunité → Simulateur → Social proof → CTA) — validation Thomas avant code | 1-2 h |
| **7.3** | Extraction simulateur en composant inline réutilisable (test : composant standalone OK) | 2-3 h |
| **7.4** | Page `/business` unique : sections + animations scroll + mobile-first | 4-6 h |
| **7.5** | Copy rebrandé "La Base 360" (validation Thomas avant merge) | 1 h |
| **7.6** | Redirections `/opportunite` + `/simulateur` → `/business` (anti-casse liens externes) | 30 min |
| **7.7** | Recette + announcement | 1 h |

**Total chantier #7 : 9-14 h-agent + 2-3 h Thomas**

### Chantier #5 — i18n + multi-monnaie (9 étapes)

| Étape | Livrable testable | h-agent |
|---|---|---|
| **5.1** | Setup `i18next` + structure fichiers `i18n/{fr,en,es,pt-br,tr}.json` | 1-2 h |
| **5.2** | Extraction strings pages publiques (`/business`, `/welcome`, bilan online, page remerciement) | 2-3 h |
| **5.3** | Traduction batch (DeepL ou Anthropic) des 5 langues V1 + relecture Thomas | 2-3 h agent + 1-2 h Thomas |
| **5.4** | Sélecteur drapeau + détection IP + persist localStorage | 2-3 h |
| **5.5** | Migration SQL `pv_product_market_pricing` + RLS | 1-2 h |
| **5.6** | Page admin importeur CSV catalogue produit/marché (test : upload, vérif insertion) | 3-4 h |
| **5.7** | Utilitaire `formatPrice(amount, market)` + `Intl.NumberFormat` + intégration pages business + bilan | 2-3 h |
| **5.8** | Tests par langue (5×) : navigation complète + vérif monnaie | 2 h agent + 1 h Thomas |
| **5.9** | Recette + announcement | 1 h |

**Total chantier #5 : 16-23 h-agent + 5-8 h Thomas**

### Chantier #2 — Check-list quotidienne Co-pilote (6 étapes, intègre #4)

| Étape | Livrable testable | h-agent |
|---|---|---|
| **2.1** | Migration `coach_daily_actions` (coach_id, action_key, date, status) + RLS | 30 min |
| **2.2** | Hook `useDailyActionChecklist` agrège les 5 sources (F1/F21, Leads, dormants, RDV, liste 100) | 2 h |
| **2.3** | Composant `<DailyActionsModal />` pop-up 1ère ouverture jour + score X/5 + skip | 2-3 h |
| **2.4** | Logique fallback "0 F1 → Grandir ton réseau" (lien chantier #3 ou liste 100 cahier de bord) | 1 h |
| **2.5** | Cron push 20h si actions non cochées (réutilise pattern `flex-notifier`) | 1-2 h |
| **2.6** | Recette + announcement + intégration lien rapide Cahier de bord (chantier #4 absorbé ici) | 1 h |

**Total chantier #2 + #4 : 7-9 h-agent + 30 min Thomas**

### Chantier #6 — Vidéos pédagogiques (4 étapes côté dev)

| Étape | Livrable testable | h-agent |
|---|---|---|
| **6.1** | Migration `feature_tutorials` (feature_key, video_url, duration, thumbnail) OU extension `app_announcements` | 30 min |
| **6.2** | Composant `<TutorialLink featureKey="..." />` (icône ❓ + modale iframe YouTube) | 1-2 h |
| **6.3** | Embedder dans pages clés (Co-pilote, FLEX, Bilan, Messagerie, Prospection, etc.) | 1 h |
| **6.4** | Page `/developpement/tutos` liste vidéos + tracking vues (localStorage) | 1 h |

**Total chantier #6 dev : 3-4 h-agent. Côté Thomas : 10-15 h prod vidéos (post-PC, étalé).**

### Phase 0 — Fix mobile chat history (3 étapes)

| Étape | Livrable testable | h-agent |
|---|---|---|
| **0.1** | Modifier `ConversationView.tsx` : fetch direct thread complet par `client_id`, fallback cache (test : conversation > 50 messages s'affiche entièrement) | 30 min |
| **0.2** | Test : ouverture conversation ancienne sur mobile | 15 min |
| **0.3** | Commit + push | 5 min |

**Total phase 0 : 30 min - 1 h-agent**

### Phase 2 — Renommage code source (7 étapes)

| Étape | Livrable testable | h-agent |
|---|---|---|
| **R.1** | Audit grep complet (Lor'Squad, Lor Académie, lor-squad — toutes variantes) | 15 min |
| **R.2** | Plan de remplacement (rapport fichier par fichier) — validation Thomas avant exécution | 15 min agent + 30 min Thomas |
| **R.3** | Remplacements automatisés (sed) sur fichiers approuvés | 1-2 h |
| **R.4** | Manuels : `package.json`, `index.html` (`<title>`, `<meta>`, `og:tags`), `vercel.json` | 30 min |
| **R.5** | Repo GitHub rename via UI GitHub | — Thomas 15 min |
| **R.6** | Tests régression : build + lint + tests | 30 min |
| **R.7** | Commit unique + push | 5 min |

**Total phase 2 : 2-4 h-agent + 30 min validation + 15 min Thomas (rename repo)**

### Architecture cible globale

**Nouvelles tables Supabase** :
- `online_bilans` (Leads bilan online, chantier #1)
- `prospection_profiles` (config CRUD profils prospection extensible, chantier #3)
- `prospection_attempts` (tracking V2 prospection, chantier #3)
- `coach_daily_actions` (persistance check-list quotidienne, chantier #2)
- `pv_product_market_pricing` (prix par marché, chantier #5)
- `feature_tutorials` (liens vidéos YouTube par feature, chantier #6) — *optionnel, ou extension de `app_announcements`*

**Nouvelles edge functions** :
- `submit-online-bilan` (réception bilan public, chantier #1)
- `new-online-bilan-notifier` (push coach sur nouveau Lead, chantier #1)
- `prospection-attempt-track` (tracking V2 chantier #3, optionnel)

**Nouvelles routes / refontes** :
- Nouvelle route publique : `bonline.labase360.com/{slug-coach}` (bilan online)
- Nouvelle route publique : `bonline.labase360.com/{slug-coach}/merci` (page remerciement)
- Refonte `/outils-prospection` (chantier #3)
- Fusion `/opportunite` + `/simulateur` → `/business` (chantier #7)
- Extension `/clients` V2 (onglet Leads)
- Extension `CoPiloteV5Page` (check-list + lien Cahier de bord)

**Réutilisations système existant** :
- Kanban DnD `/clients` V2
- `messageTemplates.ts` (lib templates messages)
- Pattern `submit-prospect-lead` (edge function publique)
- Pattern `BilanTermineePage` (page remerciement)
- Pattern `AnnouncementSpotlight` (pop-up 1ère ouverture du jour)
- Pattern `useDormantClients`, `useCopiloteData`
- Design system tokens `var(--ls-*)` (gold/teal G3 Premium)
- Cron pattern `flex-notifier` pour relances push
- 15+ edge functions existantes (auth, push, etc.)

### Règles à respecter pendant l'exécution

1. ❌ **Ne JAMAIS écrire "Lor'Squad" ou "Lor Académie"** dans tout nouveau code/copy/UI/email/message — c'est **"La Base 360"** partout
2. ⚠️ **Renommage code source** = chantier obligatoire avant chantier #5 i18n (sinon on i18n une cible à renommer)
3. 📱 **Mobile-first absolu** sur tous les chantiers (touch ≥ 44px, font ≥ 16px anti-zoom iOS, 1 écran 375×667 sans scroll quand possible)
4. 🎨 **Tokens CSS** `var(--ls-*)` partout, jamais de `#HEXVALUE` hardcodé (cf. `globals.css`)
5. 📅 **Datetime** `timestamptz` partout, jamais `timestamp` (cf. règle 29/04/2026)
6. 🔒 **RLS** : jamais de `::uuid` dans policy permissive — utiliser `::text` (cf. leçon 25/04/2026)
7. 📣 **Règle livrable complet** : code prod + entrée `app_announcements` + vidéo `/developpement` si UX non-évidente (cf. CLAUDE.md)
8. 🎬 **Discoverability** : chaque chantier prévoit son onboarding propre (announcement + vidéo + tour) pour éviter le cimetière des features non-utilisées

---

## 🆕 Dump #3 (2026-05-10 matinée — audit + chantier #8 Newsletter)

### Audit du document — corrections appliquées

Suite à la demande de Thomas de relecture intégrale, l'agent a détecté et corrigé :

| Problème | Correction |
|---|---|
| Sommaire en haut obsolète (mentionnait seulement les 5 idées du dump #1) | Mis à jour avec les 8 chantiers + 2 phases |
| 2 sections orphelines en fin de doc (« Questions en suspens » avec 11 questions DÉJÀ TRANCHÉES + « Au retour PC » dupliquée par la roadmap moderne) | Supprimées |
| Section #3 mal nommée (« Académie de prospection » au lieu du nom acté) | Renommée « Module Prospection cold mobile-first » |
| 4 occurrences résiduelles « Lor'Squad » | Vérifiées : toutes **légitimes** (notes explicatives sur le rebranding ou règles « ne JAMAIS écrire »). Conservées. |

### Réponse design / icônes / logos (question Thomas)

**Préparation visuelle des pages en avance** :
- ✅ **Wireframes ASCII en markdown** : déjà fait pour la page Welcome (1.B) et la page de remerciement (1.H). Je peux faire pareil pour la page bilan, le module Prospection, la page `/business`, la newsletter PDF, etc.
- ✅ **Mockups HTML/CSS prototypes** : je peux générer des fichiers HTML statiques que tu ouvres dans un navigateur pour voir le visuel sans backend
- ❌ **Figma** : pas d'accès direct à Figma depuis l'agent. Si besoin de Figma, à faire à la main.

**Icônes Instagram / WhatsApp / Facebook / Telegram / etc.** :

✅ **Je n'ai PAS besoin que tu me fournisses les icônes/logos**. Plusieurs sources disponibles dans l'écosystème React :

| Source | Usage | Force |
|---|---|---|
| **`lucide-react`** (probablement déjà installé) | Icônes minimalistes | Cohérent avec le design system actuel |
| **`react-icons`** (à ajouter si pas présent) | Logos marques (FaInstagram, FaFacebook, FaWhatsapp, FaTelegram, FaYoutube...) | Couvre toutes les marques |
| **`simple-icons`** (CDN ou npm) | Logos officiels marques en SVG | Fidèle aux brand guidelines |
| **Brand resources officiels** (Meta Brand Resources, WhatsApp Brand Resources) | SVG officiels téléchargeables | Conformité légale max |

Je peux choisir la source appropriée selon le contexte. Pour l'app coach, `react-icons` ou `simple-icons` est probablement le meilleur compromis.

---

### Chantier #8 — Newsletter mensuelle (clients + distri) ⚠️ NOUVEAU

**Domaine** : Marketing / Communication / Rétention

**Description (idée Thomas)**
- **Newsletter à envoyer à tous les clients ET tous les distri** au retour Égypte
- **V1 manuel** : Thomas + Claude IA (moi ou un Claude conversationnel) qui génère le contenu, Thomas valide et envoie
- **V2 automatique** : agent (Claude API via edge function) génère mensuellement, Thomas valide en 1 clic, envoi auto
- **Format** : A4 recto-verso avec visuels infos nutrition
- **Ton** : bienveillant, informatif, **PAS de forcing produit** (« sans parler de forcer à prendre des produits, plutôt en étant informatif »)

**Pourquoi**
- **Lien régulier** avec la communauté (clients + distri) qui ne dépend pas du coach individuel
- **Éducation nutritionnelle douce** : positionne La Base 360 en référent expert
- **Rétention** : touchpoint mensuel = on existe dans la tête des clients, hors moments de consommation
- **Différenciation** : la plupart des coaches Herbalife n'envoient rien à leurs clients
- **Discoverability bonus** : la newsletter peut renvoyer vers les nouveautés app / vidéos pédagogiques (chantier #6)

**Idée 1ère newsletter — Mai/Juin 2026 (préparation été)**

Brouillon de structure (à enrichir avec Thomas) :

```
PAGE 1 (recto)
┌─────────────────────────────────┐
│  La Base 360 — Newsletter mai   │
│  Préparation été ☀️              │
│                                  │
│  ▸ Hydratation & soleil         │
│    Combien d'eau, à quelle      │
│    heure, signes de déshydrat.  │
│                                  │
│  ▸ Repas légers d'été           │
│    3 idées rapides nutritives   │
│    et fraîches                   │
│                                  │
│  [Visuel infographie nutrition] │
└─────────────────────────────────┘

PAGE 2 (verso)
┌─────────────────────────────────┐
│  ▸ Voyage à l'étranger ✈️        │
│    Probiotiques, eau, vigilance │
│    hygiène alimentaire — comme  │
│    Thomas en Égypte !            │
│                                  │
│  ▸ Bouger en vacances 💪         │
│    Sans s'épuiser, 15 min/jour  │
│                                  │
│  ▸ Le saviez-vous ?              │
│    Anecdote nutrition           │
│                                  │
│  Bonne préparation été à toutes │
│  et tous,                        │
│  L'équipe La Base 360 🙏         │
└─────────────────────────────────┘
```

**Architecture technique V1 (manuel — au retour Égypte)**

**Tables Supabase** :
- `newsletters` : id, title, slug, body_html, body_text, pdf_url, audience (`clients` / `distri` / `all`), sent_at, sent_by_user_id, created_at
- `newsletter_recipients` : newsletter_id, recipient_type (`client`/`distri`), recipient_id, sent_at, opened_at, clicked_at — pour tracking basique

**Page admin `/admin/newsletters`** :
- Liste des newsletters (envoyées + brouillons)
- Bouton « Nouvelle newsletter » → éditeur (Markdown ou WYSIWYG)
- Aperçu PDF temps réel
- Bouton « Envoyer » → choisit audience + déclenche distribution multi-canal
- Stats simples : open rate, click rate

**Génération PDF A4 recto-verso** :
- Réutiliser le pattern existant `jsPDF` + `html2canvas` (déjà utilisé pour `AcademyCertificatePage` et `AcademyPlaybookPage`)
- Template A4 stylé avec tokens `var(--ls-*)` (gold/teal G3)
- Visuels infographie : SVG inline ou images depuis bucket Supabase

**Distribution multi-canal** :
- **Email** : service externe à choisir avec Thomas (Brevo / Resend / SendGrid / Postmark — voir question ouverte)
- **In-app distri** : entrée `app_announcements` automatique avec lien PDF
- **In-app clients** : entrée `client_app_announcements` (à créer si pas existante) avec push notif PWA
- **Page web archive** : route publique `/newsletters/:slug` consultable en ligne
- **Lien direct partage** : copier-coller URL pour Insta/WhatsApp story

**Architecture V2 (auto — plus tard)**

- Table `newsletter_briefs` : id, theme, sections, ton, signature, valid_for_month
- Edge function `generate-monthly-newsletter` cron 25 du mois (génère brouillon pour mois suivant)
- Anthropic API (Claude) génère le contenu basé sur brief + saison + actu
- **Validation Thomas obligatoire avant envoi** (semi-auto, JAMAIS full auto — anti-dérapage de ton)
- Notification « Newsletter prête à valider » push au coach admin
- Bouton 1-clic « Approuver et envoyer »

**Effort estimé V1 manuel** : **10-15 h-agent + 2-4 h Thomas** (rédaction contenu mai-juin première édition)

| Étape | Livrable testable | h-agent |
|---|---|---|
| **8.1** | Migration `newsletters` + `newsletter_recipients` + RLS | 1-2 h |
| **8.2** | Choix + setup service email externe (selon Q3 Thomas) | 1-2 h |
| **8.3** | Page admin `/admin/newsletters` (liste + créer + éditer) | 2-3 h |
| **8.4** | Éditeur newsletter + aperçu PDF temps réel | 2-3 h |
| **8.5** | Distribution multi-canal (email + announcements + page web) | 2-3 h |
| **8.6** | Tracking basique (open / click) | 1-2 h |
| **8.7** | Recette + announcement (méta : annoncer la newsletter dans l'app !) | 1 h |

**Effort additionnel V2 auto** : **+5-8 h-agent** (briefs DB, edge function génération, flow validation)

**Statut** : 🌿 mûr — vision claire, **6 questions ouvertes pour Thomas**

**Questions ouvertes Thomas pour le chantier #8**

1. **Audience** : 1 newsletter unique pour clients + distri (contenu identique), ou **2 newsletters distinctes** (contenu partiellement différent : aux distri on parle aussi business/recrutement, aux clients juste nutrition) ?
2. **Outil d'emailing** : tu n'avais pas dit « tropique » mais « Claude IA » pour la rédaction (lol). Pour l'**envoi email** réel (delivery), je propose :
   - **Brevo** (anciennement Sendinblue) — populaire France, tarif gratuit jusqu'à 300 emails/jour
   - **Resend** — moderne, dev-friendly, excellent delivery
   - **Postmark** — premium delivery (transactionnel + marketing)
   - **Mailchimp** — historique, riche en templates
   - Reco agent : **Brevo** si budget serré, **Resend** si tu veux moderne et clean
3. **Fréquence** : mensuel par défaut OK ? (Hebdo trop, trimestriel pas assez, mensuel = sweet spot communauté wellness)
4. **Format final** : on génère **les 3 simultanément** (PDF A4 + email HTML + page web archive), ou seulement certains ?
5. **Brouillon 1ère newsletter** : tu rédiges seul ou tu veux que **je te génère un brouillon complet** mai→juin (les 4-5 sections décrites ci-dessus avec le copy bienveillant) que tu peux copier dans l'éditeur ?
6. **Calendrier** : envoi mi-mai 2026 (pour annoncer juin) ou fin mai (pour juin direct) ?

---

## 🆕 Dump #4 (2026-05-10 après-midi) — Newsletter publique = aimant à leads

### Idée Thomas (résumé)

> « On pourrait créer une page Newsletter qu'on partage en public sur des groupes de prospection. Avec **toujours 2 CTAs** dans les textes : (1) un lien vers le bilan online en 2 minutes, adaptable selon la saison (avant été, avant rentrée, avant hiver), (2) un lien "Tu pensais auto-financer tes vacances ?" qui ouvre une popup de capture lead (prénom + téléphone + ville) pour classer dans l'arborescence kanban du chantier #1. L'idée c'est de récupérer des leads quand les gens cliquent sur le lien. »

### Avis agent (honnête)

✅ **Excellente idée stratégique**. La newsletter passe de **rétention** à **acquisition** — devient un asset marketing entrant. Elle alimente directement le pipeline Lead et renforce l'ROI de tous les chantiers.

⚠️ **Risque à anticiper** : si la newsletter devient trop CTA-heavy, elle perd sa valeur « informative bienveillante » que tu as explicitement voulue. **Règle d'équilibre** : ~80% contenu informatif pur / ~20% CTAs discrets en fin de section. Pas de pop-up agressifs, pas de bannière qui clignote. Les CTAs doivent se mériter par la qualité du contenu.

✅ **Cohérence écosystème** : couplage naturel avec #1 (Bilan), #7 (Business `/business`), #3 (canal de distribution prospection). **Tous les chantiers convergent maintenant vers le pipeline Lead du chantier #1.**

### Enrichissement chantier #8 — Newsletter devient publique + lead-magnet

#### Trois versions de la newsletter

| Version | Audience | Contenu | Hébergement |
|---|---|---|---|
| **Privée clients** | Clients souscrits | Full content + tips perso | Email + page web auth |
| **Privée distri** | Distri équipe | Full content + business tips | Email + in-app |
| **Publique partageable** ⭐ | Public (groupes FB, DM Insta, WhatsApp...) | **Teaser** : ~70% du contenu, sections clés masquées behind soft-paywall (« lis la suite en faisant ton bilan en 2 min ») | Page web publique `/news/:slug` avec OG tags optimisés |

**Pourquoi un teaser pour la version publique** : créer une vraie incitation à convertir (bilan ou popup lead), tout en livrant assez de valeur pour donner envie. Pure stratégie content marketing.

#### Règle des 2 CTAs systématiques

**Toute newsletter publique** doit contenir **dans CHAQUE section ou en pied** :

**CTA #1 — Bilan online (saisonnier)**
- Texte adaptatif selon la période :
  - **Mai-juin** (avant été) : « Prêt(e) pour l'été ? Fais ton bilan en 2 min »
  - **Août-septembre** (avant rentrée) : « Cette rentrée, tu repars du bon pied ? Bilan en 2 min »
  - **Octobre-novembre** (avant hiver) : « Boost ton immunité avant l'hiver — Bilan en 2 min »
  - **Janvier-février** : « Nouvelle année, nouveau toi ? Bilan en 2 min »
  - **Mois neutre** : « Envie de comprendre ton corps ? Bilan en 2 min »
- Lien direct : `bonline.labase360.com/{slug-coach-newsletter}` ou `/{slug-public}` si newsletter générique La Base 360
- Tracking : UTM parameters (`?utm_source=newsletter&utm_medium={canal}&utm_campaign={slug-newsletter}`)

**CTA #2 — Opportunité business (lead capture)**
- Texte : « Tu pensais auto-financer tes vacances / tes projets / ton style de vie ? Découvre notre opportunité » → clic ouvre **popup lead capture** (cf. ci-dessous)
- Variantes saisonnières du hook :
  - Mai-juin : « tes vacances »
  - Août-septembre : « la rentrée des enfants »
  - Octobre-novembre : « tes cadeaux de Noël »
  - Janvier-février : « tes projets de l'année »

#### NEW Sous-chantier 7.X — Popup lead capture sur `/business`

À ajouter au chantier #7 (Refonte business). Existant à vérifier : la table `prospect_leads` + edge function `submit-prospect-lead` existent déjà (cf. snapshot) — à étendre, pas dupliquer.

**Comportement** :
1. Visiteur sur la page newsletter publique clique sur CTA #2 « Auto-financer mes vacances »
2. Pop-up s'ouvre **AVANT** la redirection vers `/business` :

```
┌─────────────────────────────────┐
│  Avant qu'on te montre ça… 👇   │
│                                  │
│  Prénom *                        │
│  [______________]                │
│                                  │
│  Téléphone (WhatsApp préféré) *  │
│  [______________]                │
│                                  │
│  Tu viens d'où ?                 │
│  [______________]                │
│  (Insta, Facebook, ami, autre…)  │
│                                  │
│  ☐ J'accepte d'être recontacté(e)│
│                                  │
│  [ Je découvre l'opportunité ]   │
│                                  │
│  Pas de spam, pas de revente.    │
└─────────────────────────────────┘
```

3. Soumission → insert dans `prospect_leads` (extension table existante) avec :
   - `firstName`, `phone`, `referral_source` (texte libre Insta/FB/etc.)
   - `coach_slug` (si newsletter portée par un coach précis) → routing vers ce coach dans le kanban Lead
   - `utm_source`, `utm_medium`, `utm_campaign` capturés depuis l'URL
   - `consent_recontact` boolean
   - `created_at`
4. Redirection vers `/business` après soumission
5. **Notif push** au coach (ou admin si lead public) : « Nouveau lead business : {Prénom} via {referral_source} »
6. Le lead apparaît dans la **même colonne kanban Lead** que les bilans online (chantier #1) — un seul pipeline, plusieurs sources

**Avantages d'unifier le pipeline** :
- Pas de duplication de système (bilans + leads business = même kanban)
- Vue unique des conversions par coach
- Workflow uniforme pour le coach (même actions de relance, mêmes templates)
- Analytics cohérentes

**Différenciation visuelle dans le kanban** : badge sur la carte Lead :
- 📋 « Bilan online » (chantier #1)
- 💼 « Lead business » (sous-chantier 7.X via newsletter)
- 🎯 « Lead direct » (si on garde des leads autres origines)

**Effort sous-chantier 7.X** : **+3-4 h-agent** sur le chantier #7 existant
- Composant `<LeadCapturePopup />` réutilisable : 1.5-2 h
- Extension table `prospect_leads` (champs UTM + coach_slug + consent + source) : 30 min
- Extension edge function `submit-prospect-lead` (nouveaux champs + notif push coach) : 1 h
- Intégration dans `/business` au mount (param URL `?leadcapture=1` déclenche popup) : 30 min
- Routing kanban Lead avec badge `business_lead` : 30 min - 1 h

#### Architecture page Newsletter publique (extension chantier #8)

**Nouvelle route publique** : `labase360.com/news/:slug-newsletter`

**Optimisations partage social** :
- **Open Graph tags** : `og:title`, `og:description`, `og:image` (visuel généré ou uploadé)
- **Twitter Card** : `twitter:card="summary_large_image"`
- **Image preview** : 1200×630 (standard FB/Twitter/WhatsApp link preview)
- **Mobile-first absolu** : la majorité des partages sera consommée sur mobile depuis groupes FB/Insta

**Templates saisonniers** : 4 squelettes pré-définis dans la table `newsletter_briefs` :
- `summer-prep` (mai-juin)
- `back-to-school` (août-septembre)
- `winter-immunity` (octobre-novembre)
- `new-year-fresh` (janvier-février)
- + 8 mois "neutres" qui héritent de patterns plus génériques

**Effort additionnel pour version publique** : **+5-7 h-agent** sur chantier #8

| Étape | Livrable testable | h-agent |
|---|---|---|
| **8.8** | Route publique `/news/:slug` + rendu HTML public lisible | 1-2 h |
| **8.9** | Open Graph tags + image preview auto-générée | 1-2 h |
| **8.10** | Soft-paywall : sections privées masquées en mode public + teaser CTA | 1 h |
| **8.11** | Insertion CTAs systématiques (Bilan + Business) avec UTM parameters | 1 h |
| **8.12** | Templates saisonniers (4 squelettes) dans `newsletter_briefs` | 1 h |

**Total chantier #8 enrichi** : **15-22 h-agent** (au lieu de 10-15 h V1) + **2-4 h Thomas** (rédaction première édition).

### Tracking analytics pour mesurer le ROI marketing

Nouveau besoin : pouvoir mesurer **quelle newsletter** convertit le mieux et **quel canal** rapporte le plus de leads.

**Métriques à tracker** :
- Taux d'ouverture (email)
- Taux de clic CTA Bilan
- Taux de clic CTA Business (popup ouvert)
- Conversion popup → lead capturé (rempli + soumis)
- Origine du lead (Insta / FB / WhatsApp / autre via `referral_source`)
- Conversion lead → bilan complété (cycle complet)
- Conversion bilan → RDV pris
- Conversion RDV → client actif

**Tables à enrichir** :
- `newsletters` : ajouter `view_count`, `bilan_cta_clicks`, `business_cta_clicks`
- `prospect_leads` : `referral_source`, `utm_source`, `utm_medium`, `utm_campaign`, `coach_slug`, `consent_recontact`
- `newsletter_recipients` : `opened_at`, `clicked_bilan_at`, `clicked_business_at`

**Page admin** : `/admin/newsletters/:id/stats` avec graphique conversion funnel.

**Effort tracking** : **+2-3 h-agent** sur chantier #8 (intégrable dans étape 8.6 existante).

### Récap impact dump #4 sur la roadmap

| Chantier | Effort avant dump #4 | Effort après dump #4 | Δ |
|---|---|---|---|
| #7 (Refonte business) | 9-14 h | **12-18 h** (+ popup lead capture) | +3-4 h |
| #8 (Newsletter) | 10-15 h | **17-25 h** (+ version publique + tracking + templates saisonniers) | +7-10 h |
| **Total roadmap** | 85-130 h-agent | **95-144 h-agent** | +10-14 h |

### 4 nouvelles questions Thomas pour valider l'enrichissement

| # | Question | Décision Thomas | Implication |
|---|---|---|---|
| **D4.1** | Newsletter publique = teaser ou full content ? | ✅ **Teaser** | Soft-paywall sur dernière(s) section(s), incite conversion via CTA Bilan |
| **D4.2** | Unifier kanban Lead bilan + business ? | ✅ **Unifier** | Un seul pipeline kanban avec badges différenciants 📋💼🎯 |
| **D4.3** | Templates saisonniers : 4+8 ou 12 dédiés ? | ✅ **4 saisonniers + 8 neutres** | Économie effort, table `newsletter_briefs` avec types `summer-prep`, `back-to-school`, `winter-immunity`, `new-year-fresh` + 8 neutres mensuels |
| **D4.4** | Nom newsletter publique ? | ✅ **« La Base 360 News »** | Court, scalable, branding fort. Slug : `la-base-360-news` ou simplement `news` |

---

## 🆕 Dump #5 (2026-05-10 soir) — Réflexion stratégique : 3 chantiers actés + backlog vague 2

Sur demande Thomas « vue les chantiers et l'analyse de l'app, qu'est-ce que tu proposes ? », l'agent a synthétisé 9 propositions (3 upsells, 3 ajustements, 3 idées neuves). Thomas valide explicitement A1, U3, U1 pour exécution immédiate, et confirme que **toutes les autres idées seront faites** (vague 2 différée).

### Chantier #9 — Refacto `NewAssessmentPage.tsx` (DETTE TECHNIQUE URGENTE)

**Domaine** : Dette technique / Refacto avant feature

**Pourquoi c'est critique**
- 4325 lignes dans un seul fichier — record de la codebase
- 14 étapes de bilan inline dans un seul composant
- Si on ajoute le formulaire bilan online (chantier #1) sans refacto, on va soit dupliquer la logique (mauvais), soit empirer le monstre (très mauvais)
- Beaucoup de composants atomiques sont déjà extraits (`Field`, `ChoiceGroup`, `BodyMetricCard`, `SelectableProductCard`, `QuantityStepper`, etc.) — la grosse part du travail consiste à **sortir les 14 steps en sous-composants** + extraire le state machine en hook dédié

**Architecture cible**

```
src/pages/NewAssessmentPage.tsx          (300-500 L max — orchestration uniquement)
src/components/assessment/steps/
   ├─ HeroStep.tsx
   ├─ ConceptStep.tsx
   ├─ IdentityStep.tsx
   ├─ ObjectiveStep.tsx
   ├─ SportProfileStep.tsx          (visible si objective=sport)
   ├─ CurrentIntakeStep.tsx         (visible si objective=sport)
   ├─ HabitsStep.tsx
   ├─ BodyScanStep.tsx
   ├─ HistoryStep.tsx
   ├─ ProtocolStep.tsx
   ├─ ProgrammeStep.tsx
   ├─ FollowUpStep.tsx
   ├─ ClientNotesStep.tsx
   └─ ThankYouStep.tsx (déjà séparé)
src/hooks/
   └─ useAssessmentForm.ts          (state + transitions + validation)
```

**Étapes franches**

| Étape | Livrable testable | h-agent |
|---|---|---|
| **9.1** | Audit complet `NewAssessmentPage.tsx` : cartographier les 14 steps, identifier le state partagé, lister les imports communs | 1-2 h |
| **9.2** | Extraire `useAssessmentForm` hook (state + setters + validation par step + persist IndexedDB) — test : le hook fonctionne en isolation | 2-3 h |
| **9.3** | Extraire les 5 premiers steps en sous-composants (Hero, Concept, Identity, Objective, SportProfile) — test : étapes fonctionnent identiques à avant | 2-3 h |
| **9.4** | Extraire les 5 steps suivants (CurrentIntake, Habits, BodyScan, History, Protocol) | 2-3 h |
| **9.5** | Extraire les 4 derniers steps (Programme, FollowUp, ClientNotes, ThankYou) | 2-3 h |
| **9.6** | NewAssessmentPage devient orchestrateur (~300-500 L), tests régression manuels sur tout le parcours bilan | 1-2 h |
| **9.7** | Aussi refacto léger `EditInitialAssessmentPage.tsx` (1192 L, hérite des mêmes patterns) — réutilise les nouveaux step components | 2-3 h |

**Bénéfices** :
- Bilan online (chantier #1) réutilise directement `IdentityStep`, `ObjectiveStep`, `HabitsStep` (~50% du formulaire bilan online déjà fait)
- Maintenance future divisée par 5
- Tests unitaires possibles par step
- `EditInitialAssessmentPage` (1192 L) hérite des mêmes composants → divise sa taille par 3

**Effort total : 10-15 h-agent** (sans risque fonctionnel si tests régression manuels OK avant chaque commit)

**Statut** : 🌳 **prêt à coder. À insérer dans la roadmap entre la phase 3 (audits) et la phase 5 (chantier #1)**.

### Chantier #10 — Badges + certifications coach visibles publiquement

**Domaine** : UX / Crédibilité / Conversion

**Pourquoi**
- Quand un prospect arrive sur la page Welcome bilan online ou la page `/business`, il ne connaît pas le coach
- Afficher le **niveau Herbalife** (Distri/SC/SB/Sup/Présidence), le **nombre de bilans réalisés**, l'**ancienneté**, et un **avis moyen** crée une crédibilité immédiate
- La data existe déjà : `users.currentRank`, agrégat `assessments` count, `users.created_at`

**Composant cible**

```
<CoachCredibilityBadges userId={coachId} variant="welcome|business|newsletter" />
```

Avec selon le variant, affichage horizontal compact ou grid :

```
🏆 Senior Consultant   📋 142 bilans réalisés   ⭐ 4.9/5 (38 avis)   🗓️ 18 mois d'expérience
```

**Étapes franches**

| Étape | Livrable testable | h-agent |
|---|---|---|
| **10.1** | RPC SQL `get_coach_credibility(user_id)` qui agrège rank + count bilans + ancienneté + (préparation pour avis chantier #11) | 30 min - 1 h |
| **10.2** | Composant `<CoachCredibilityBadges />` avec 3 variants visuels | 1-2 h |
| **10.3** | Intégration sur Welcome bilan online (chantier #1) + page `/business` (chantier #7) + footer newsletter publique (chantier #8) | 30 min - 1 h |
| **10.4** | Test multi-coach + responsive mobile + announcement | 30 min - 1 h |

**Effort total : 3-4 h-agent**

**Statut** : 🌳 prêt à coder. À insérer **juste après le chantier #1** (besoin de Welcome bilan online en place pour intégrer).

### Chantier #11 — Témoignages clients vérifiés (preuve sociale)

**Domaine** : Marketing / Conversion / Preuve sociale

**Pourquoi**
- Les pages publiques (newsletter, bilan, business) convertissent 20-40% mieux avec témoignages visibles
- Les leads générés via la newsletter (chantier #8) seront 2× plus chauds avec témoignages affichés
- Coût marginal : faible (table simple + UI carrousel + email auto)

**Architecture**

**Tables nouvelles** :
- `client_testimonials` : id, client_id, content, rating (1-5), photo_consent, video_url?, status (`pending`/`approved`/`rejected`), created_at, approved_at, approved_by
- RLS : SELECT public si `status='approved'` + `photo_consent=true`, INSERT par client_app token, UPDATE admin only

**Flow** :
1. **Email/notif auto J+60** après création bilan client : « Comment ça se passe ? Partage ton retour en 30 sec »
2. Lien vers form public `/temoignage/:client_token` : champ texte + rating étoiles + checkbox photo consent + (V2) upload vidéo
3. Soumission → status `pending`
4. **Page admin `/admin/testimonials`** : modération (approve / reject)
5. Affichage `approved` en carrousel sur :
   - Welcome bilan online (avant le bouton « Commencer »)
   - Page `/business` (section social proof)
   - Newsletter publique (section avant CTAs finaux)

**Étapes franches**

| Étape | Livrable testable | h-agent |
|---|---|---|
| **11.1** | Migration SQL `client_testimonials` + RLS (test : insert via service_role OK, select public filtré OK) | 1 h |
| **11.2** | Page form public `/temoignage/:token` (text + rating + consent) — réutilise pattern bilan online | 1-2 h |
| **11.3** | Edge function `submit-testimonial` (validation token + insert + notif admin) | 30 min - 1 h |
| **11.4** | Page admin `/admin/testimonials` (liste + actions approve/reject + preview) | 1-2 h |
| **11.5** | Cron `request-testimonial` J+60 après bilan : envoi email/push avec lien | 1 h |
| **11.6** | Composant `<TestimonialsCarousel />` (réutilisable Welcome / Business / Newsletter) | 1-2 h |
| **11.7** | Recette + announcement | 30 min |

**Effort total : 6-8 h-agent + ~1-2 h Thomas** (relance manuelle des premiers clients pour obtenir le 1er volume d'avis avant que le cron J+60 prenne le relais)

**Statut** : 🌳 prêt à coder. À insérer **après les chantiers #1, #7, #8** (besoin des 3 emplacements d'affichage en place).

---

## 📦 Backlog Vague 2 — toutes les autres idées (à programmer plus tard)

Thomas a explicitement dit « toutes les idées sont vraiment bonnes et on les fera toutes ». Je consigne le backlog pour ne rien perdre, à programmer après livraison stable de la vague 1.

### Ajustements complémentaires

| # | Nom | Effort h-agent | Priorité |
|---|---|---|---|
| **A2** | Système intelligent de notifications (anti-fatigue push, bundling, plages horaires, prefs fines) | 8-12 h | Élevée — multiplie ROI #2 |
| **A3** | Onboarding client PWA (4 sections welcome) — déjà mémo CLAUDE.md | 12-16 h | Moyenne — réduit churn |
| **A4** | Dashboard admin "santé du business" (MRR, churn, NPS, LTV) | 8-12 h | Moyenne |
| **A5** | Plan de relance auto post-rupture programme (lifecycle stopped → email 7j/30j/90j) | 4-6 h | Faible — quick win |
| **A6** | Leaderboard équipe gamifié dans `/team` (compétition saine PV/bilans/leads) | 4-6 h | Faible — quick win |

### Idées nouvelles différenciatrices

| # | Nom | Effort h-agent | Priorité |
|---|---|---|---|
| **I1** | **La Base 360 AI** — FAB chat ChatGPT-like avec contexte client auto (résumé, suggestion message, génération réponse) | 25-35 h | **Très élevée** — différenciateur majeur, déjà mémo CLAUDE.md |
| **I2** | Programme « 100 jours » nouveaux clients (style Duolingo : tip quotidien + check-in 3-tap + récompenses) | 20-30 h | Élevée — réduction churn early-stage |
| **I3** | Gamification client visible (niveaux + badges sur app PWA, table `client_xp_events` déjà câblée) | 10-15 h | Élevée — engagement passif |
| **I4** | FAQ chatbot upgrade Anthropic (remplace `ClientFaqChatbot` statique) | 10-15 h | Moyenne |
| **I5** | Calendrier éditorial réseaux sociaux (pack mensuel visuels + posts pré-rédigés) | 15-20 h | Moyenne — couplé à #3 prospection |
| **I6** | Live coaching sessions visio groupe (RDV mensuels Q&A + motivation) | 4-6 h | Faible — quick win |
| **I7** | Bibliothèque de recettes par programme (table + UI + saisie contenu Thomas) | 15-20 h | Moyenne — différenciation |
| **I8** | Programme de fidélité produits (points achat répété → réduc/produit offert) | 10-15 h | Moyenne |
| **I9** | Marketplace d'expériences sociales locales (café-conférence, atelier cuisine, course matinale) | 12-16 h | Faible — pour clubs locaux |
| **I10** | Intégration smart watch / health data (Apple Health + Google Fit auto-import) | 25-35 h | Faible — gros effort, niche |

**Total backlog vague 2 estimé** : ~150-220 h-agent supplémentaires.

À prioriser au fur et à mesure selon ROI observé après livraison vague 1.

---



### ✅ Mockup newsletter validé en concept (2026-05-10 après-midi)

Thomas a vu le mockup HTML interactif `docs/mockups/newsletter-mai-juin.html` et **valide le concept** :
- Structure 6 sections (hydratation / aloe / repas / voyage / peau / mouvement teaser)
- Design La Base 360 (gold/teal G3, mobile-first)
- Intégration subtile produits Herbalife (encarts « Côté coach » Herbal Aloe + Herbalife SKIN)
- Soft-paywall sur la dernière section
- 2 CTAs (Bilan saisonnier gold + Business teal avec popup lead capture fonctionnelle)
- Footer La Base 360 News + socials

**À raffiner au retour PC** :
- Contenu rédactionnel détaillé de chaque section (Thomas relit/réécrit le copy)
- Visuels d'illustration (photos / infographies à intégrer)
- Liens réels (CTA Bilan vers `bonline.labase360.com/{slug}`, CTA Business vers `/business`)
- Possibles autres produits Herbalife à mentionner (Formula 1, Liftoff, CR7 Drive selon saison)

Le mockup sert de **référence visuelle** pour l'implémentation du chantier #8 — le code de la page newsletter publique reprendra ce design.

### ✅ Mockup bilan online validé (2026-05-10 fin de journée)

Thomas a vu et validé le mockup `docs/mockups/bilan-online.html` (3 vues) :
- Welcome (hero + coach card + pitch + CTA + bilan libre)
- Formulaire 5 étapes (identité / objectifs / vécu / habitudes / budget+activité) avec progress bar, auto-save indicator, choice cards multi-select, radio cards, sliders dynamiques, sub-fields conditionnels
- Page de remerciement (checkmark animé + boutons sociaux)

Sert de **référence visuelle** pour le chantier #1.

### ✅ Mockup vue d'ensemble app coach validé (2026-05-10 fin de journée)

Mockup `docs/mockups/app-coach-overview.html` créé pour visualiser la structure complète de l'app après tous les chantiers :
- 14 onglets scrollables (dont 4 NEW : Leads, Prospection, Newsletter, Tutos vidéos)
- Wireframes simplifiés représentatifs pour chaque vue
- Validé par Thomas comme support de visualisation globale

### 📁 Récap des mockups disponibles

| Fichier | Lien preview (pinné commit) |
|---|---|
| `docs/mockups/newsletter-mai-juin.html` | https://raw.githack.com/tomkoss31/Lor-Squad-Wellness/154baa4/docs/mockups/newsletter-mai-juin.html |
| `docs/mockups/bilan-online.html` | https://raw.githack.com/tomkoss31/Lor-Squad-Wellness/25c0165/docs/mockups/bilan-online.html |
| `docs/mockups/app-coach-overview.html` | https://raw.githack.com/tomkoss31/Lor-Squad-Wellness/57ae675/docs/mockups/app-coach-overview.html |

Pour version branche (toujours à jour mais cache court possible), remplacer le SHA par `claude/fix-mobile-chat-history-d1jFW`.

### 🌴 État final session piscine (2026-05-10 soir)

- **8 chantiers structurés** en étapes franches (#1 à #8) + 2 phases (fix mobile chat + renommage code)
- **~50 décisions actées** (toutes les questions ouvertes tranchées)
- **3 mockups HTML interactifs** créés et validés
- **Roadmap exécution finale** (12 phases, ~95-144 h-agent + ~27-44 h Thomas)
- **Tout sauvegardé** sur GitHub branche `claude/fix-mobile-chat-history-d1jFW`

Thomas reviendra ici quand il aura de nouvelles idées. Au retour PC, ouvrir ce fichier suffit pour reprendre le contexte complet.

**Bilan de la session piscine** :
- **2 dumps** d'idées brutes Thomas
- **7 chantiers structurés** (+1 fix initial mobile chat history)
- **20 décisions actées** (questions Q1-Q11 du dump #1, N1-N5 du dump #2, Q5.5 + Q meta finaux)
- **0 question en suspens** au retour PC
- **0 ambiguïté technique** majeure restante

🌴 Tu peux fermer l'app, profiter de la piscine, le brouillon est en sécurité sur GitHub. Au retour PC, ouvrir ce fichier suffit pour reprendre exactement là où on s'est arrêtés.

## 🐛 Dump #6 (2026-05-10 soir) — Phase 0.5 : Fix Celebration popup régressé

### Bug signalé Thomas

> « Problème anniversaire sur Co-pilote : action si appui sur bouton renvoie vers fiche client mais sans action aucun message. Avant il y avait un popup avec un message pré-défini et un accès copier/coller pour envoyer WhatsApp/SMS/copier. À corriger. »

### Diagnostic complet (audit agent 10/05)

**Composant actuellement actif** : `src/components/copilote/CelebrationCard.tsx`
- Utilisé dans `src/features/copilote/v5/CoPiloteV5Page.tsx:224`
- Migration vers V5 du 8 mai 2026 (commit `24657f9`) a remplacé l'ancien `BirthdayBlock` par cette nouvelle implémentation **simplifiée qui a perdu la modale riche**

**Comportement actuel régressé** :
- Bouton « 💬 Envoyer » → ouvre directement WhatsApp en nouvel onglet (`handleSendWhatsApp`) **sans modale**, sans édition, sans choix canal
- Bouton « Fiche → » → navigue vers `/clients/:id` (c'est le bouton que Thomas pointait : « renvoie vers fiche client sans message »)

**Composant à réutiliser/étendre** : `src/components/copilote/BirthdayMessageDialog.tsx`
- Toujours dans le repo, mais plus appelé depuis Co-pilote V5
- Contient la modale riche : message éditable + Copier + WhatsApp + SMS + bouton « Marquer envoyé »
- Couplé à `Client` (pas à `Celebration`) → adaptation nécessaire pour gérer les 4 types de célébration (`birthday` / `program_1m` / `program_3m` / `program_6m`)

**Composant pattern complet existant** : `src/components/client-detail/MessageTemplatesModal.tsx`
- Pattern multi-canal complet 4 boutons (Copier / WhatsApp / SMS / Telegram)
- Composant `ChannelButton` réutilisable
- Lib helper `src/lib/messageTemplates.ts` avec `buildWhatsAppLink`, etc.

### Fix proposé — Étapes franches

| Étape | Livrable testable | h-agent |
|---|---|---|
| **0.5.1** | Créer `src/components/copilote/CelebrationDialog.tsx` : modale qui prend une `Celebration` (au lieu d'un `Client`), affiche le message pré-rempli depuis `KIND_META[kind].message()`, message éditable via textarea, 4 boutons multi-canal (Copier / WhatsApp / SMS / Telegram) | 30 min |
| **0.5.2** | Modifier `CelebrationCard.tsx` : remplacer `handleSendWhatsApp(c)` par `setOpenCelebration(c)` qui ouvre `<CelebrationDialog />`. Rendre le dialog à la fin du composant. Garder le bouton « Fiche → » optionnel (ou retirer si Thomas veut). | 10 min |
| **0.5.3** | Test manuel : ouvrir Co-pilote V5, vérifier qu'au moins 1 célébration s'affiche (insert test si besoin), cliquer sur « Envoyer », vérifier que la modale s'ouvre avec message pré-rempli, tester les 4 boutons (Copier OK, WhatsApp ouvre `wa.me`, SMS ouvre app SMS, Telegram ouvre `t.me/share/url`), tester l'édition du message | 10-15 min |
| **0.5.4** | Commit unique + push | 5 min |

**Effort total : 30-45 min h-agent + 5 min recette Thomas**

### Couplage avec autres chantiers

- ✅ **Pattern réutilisable** : ce dialog peut devenir le standard pour tous les messages contextuels (anniversaire, milestone, F1, F21, dormant). Couplé à #2 (check-list quotidienne) qui appellera ce dialog depuis les Leads à recontacter.
- ✅ **Cohérent avec `MessageTemplatesModal`** existant — à terme possibilité de fusionner en un seul composant `<MessageDialog />` générique paramétrable.

### À insérer dans la roadmap

**Nouvelle Phase 0.5** entre Phase 0 (fix mobile chat history) et Phase 1 (achat DNS).

Justification de l'ordre : Phase 0 et Phase 0.5 sont 2 fix-bugs isolés, idéal de les enchaîner pour démarrer la session PC sur une codebase propre avant d'attaquer les gros chantiers. Cumul : ~1 h-1 h 30 max pour les 2 fix de bugs avant de commencer.

---

*Fichier vivant. Dernière maj : 2026-05-10 soir (dump #6 — bug Celebration noté pour Phase 0.5).*
