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

## Sommaire des idées (dump #1 — 2026-05-09)

| # | Domaine | Titre | Effort | Statut |
|---|---|---|---|---|
| 1 | Funnel / Clients | **Bilan Online publique + Lead pipeline** (méga-chantier) | XL (5-8 jours) | 🌿 mûr |
| 2 | Co-pilote | Check-list quotidien actions distri (5 min/jour) | M (4-6h) | 🌿 mûr |
| 3 | Formation / Boîte à outils | Académie de prospection (flow messages copier-coller par profil) | XL (4-6 jours) | 🌱 brut |
| 4 | UX / Co-pilote | Lien rapide vers Cahier de bord depuis Co-pilote | XS (30 min) | 🌳 prêt à coder |
| 5 | Méta | Méthodologie d'exécution en 6 étapes pour le chantier #1 | — | 🌿 mûr |

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

### 3. Académie de prospection (flow messages copier-coller par profil)

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

### 2026-05-09 — Réponses Thomas dump #1 (chantier #1 Bilan Online)

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

### 2026-05-09 — Réponses Thomas dump #1 (chantier #2 Check-list quotidienne)

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

### 2026-05-09 — Réponses Thomas dump #1 (chantier #3 Académie prospection)

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

### 2026-05-09 — Réponses Thomas dump #1 (sous-domaine + Q8 finale)

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

## Questions en suspens — synthèse

À répondre par Thomas (par paquets, dans n'importe quel ordre) avant qu'on attaque l'exécution PC :

**Sur le chantier #1 (Bilan Online)** :
1. Modèle de données : nouvelle table `online_bilans` ou extension `prospects` ?
2. Identification coach dans l'URL : code, username, token ?
3. Sous-domaine `bonline.labase360.com` déjà acheté ?
4. Kanban : étendre `/clients` V2 ou page `/leads` séparée ?
5. Templates de réponse : inline pop-up ou via boîte à outils ?
6. Relance J+3 : agenda + notif, ou un seul des deux ?

**Sur le chantier #2 (Check-list quotidien)** :
7. Pop-up bloquante ou skippable ?
8. Quelles actions par défaut hors-Lead ?

**Sur le chantier #3 (Académie prospection)** :
9. On lance un audit de `/outils-prospection` existant avant ?
10. 3 profils figés ou tu en envisages d'autres à terme ?
11. Mockup d'inspiration Claude design ou je propose de zéro ?

---

## Au retour PC — checklist d'exécution

1. ☐ `git pull origin claude/fix-mobile-chat-history-d1jFW`
2. ☐ Relire snapshot architecture pour rafraîchir le contexte
3. ☐ Répondre aux 11 questions ouvertes ci-dessus
4. ☐ Tier les chantiers par ROI/effort en intégrant les réponses
5. ☐ Pour chaque chantier retenu : créer une branche `feat/X` depuis `dev/thomas-test`
6. ☐ Chantier #1 : commencer par l'audit `/clients` V2 (kanban) et `/outils-prospection` AVANT de coder
7. ☐ Mettre à jour CLAUDE.md (section roadmap) avec les chantiers actés
8. ☐ Ne PAS oublier la règle livrable complet : code prod + `app_announcements` + fiche `/developpement` si UX non-évidente
9. ☐ Archiver ce fichier en `docs/archive/BRAINSTORM_EGYPTE_2026-05.md` une fois traité

---

*Fichier vivant. Dernière maj : 2026-05-09 (dump #1 — 5 idées capturées).*
