# Mode BBC — état des lieux

> Branche `feat/bbc`. Mis à jour 2026-07-24. Tout ce qui est « réel » est
> branché en base + build vert. Données de démo seedées sur la fiche test
> **Thomas Houbert** (client `97c88603`, token `961a1c58-0454-484d-8dd1-398d0ff4d971`).

---

## ✅ FAIT (branché en vrai, vérifié)

### Socle / infra
- Bascule **`users.club_model`** (`classic` | `bbc`) + aperçu admin (localStorage).
- Bascule **par client `clients.ebe_bbc`** = « Passer en membre BBC » sur la fiche (onglet Actions).
- Tables : `clubs`, `outreach_templates`, `outreach_messages`, `club_visits`.
- RPC : `set_club_model`, `bbc_visit_counts`, `bbc_scan_visit`.
- Edge `client-app-data` expose `ebe_bbc`, `visits_count`, `hearts_count`.
- Design tokens isolés `--ls-bbc-*` (dark + light), fidèles au design validé.

### Environnement COACH (plein écran, sidebar dédiée, 8 vues)
- **Cockpit** — compteur **cobayes du jour réel** + flow « envoyer un cobaye » (script verrouillé + prénom injecté + WhatsApp → persisté dans `outreach_messages`) + **les 3 blocs réels** : « le club ce matin » (membres + pointés du jour + alerte bilan des 10), « à un cœur du palier » (membres réellement à 1 cœur + recos à valider), « prochain appel » (rituel calculé depuis `clubs.settings`). Lignes cliquables.
- **Le club** — pointage réel (**+1 visite**), alerte **7-9 orange / 10+ rouge**, **scanner caméra QR**, **cartes 10/30** (attribuer/renouveler, solde, expiration) et **bilan des 10** (checklist 9 étapes). Toute visite passe par la RPC `bbc_add_visit` (chemin unique) qui la rattache à la carte active.
- **Cœurs** — mur des cœurs réel + **recos à valider** (le coach confirme « a démarré » = 1 cœur), paliers 2/3/5.
- **Cobayes & membres** — liste réelle des membres BBC + **récap complet cliquable** (contact, objectif, programme, statut, RDV, visites, cœurs).
- **Formation** — échelle des rôles + **9 modules 00→08 cliquables avec contenu** (résumé + points clés, depuis le Notion) + glossaire.
- **Messages (coach)** — fils = membres BBC (dernier message + badge non lus), conversation et envoi réels via `client_messages` (même table que la messagerie classique → conversation continue entre les deux modes).
- **Appels** — inscriptions aux rituels (occurrences depuis la config), présence pointée après l'appel, **suivi « patate chaude »** (10 min), bloc « à traiter ». Le membre voit son prochain appel.
- **Rappels automatiques** — edge `bbc-call-reminder` + cron `*/10` : midi le jour J, −30 min, −15 min (push **membre**) et +30 min après (push **coach**, patate chaude, seulement si le suivi n'est pas fait). Anti-doublon en base.
- **Mes clubs** — création de club réelle (`createMyClub` + `set_club_model`).
- **Scripts & liens** — les 12 scripts verbatim (prénom injecté + copier) **et** les 6 **liens rapides** 1-tap avec message pré-rédigé (bilan online, réserver un créneau, page coach, Zoom Appel/Atelier, avis Google) → copier / lien seul / WhatsApp.
- **Club 100 & rentabilité** — repères **sourcés** (Notion 00 : 100 membres · 3 sup actifs · 9 stagiaires · ~13 sup · 20 000 PV · 40 % de fréquentation ; échelle 1/2/3 clubs = 20k/35k/50k PV) + jauge membres réelle + **calculateur** (prix des cartes 80 €/185 € validés ; coût portion et charges **saisis** ; CA, marge, résultat et point mort **calculés**, formule affichée).
- **Navigation** — sidebar groupée en 4 sections ; mobile = 4 onglets + tiroir « Plus » donnant accès à **toutes** les vues.
- **Pré-lancement** — le parcours guidé des **6 semaines avant l'ouverture** (18 tâches du Playbook, chacune avec son « pourquoi »), **4 non-négociables** (liste de 200 · 200 cobayes · 20 évaluations d'entraînement · 30 membres) et un bandeau « prêt à ouvrir ? ». Table dédiée, le « Démarrage 30 jours » classique n'est pas touché.
- **Réglages** — créneau d'ouverture · rituels (jours + heure) · barème des cœurs · cartes (prix + durée) · **liens du club** (Zoom, avis Google). Écrit `clubs.settings` ; le Cockpit, les Cœurs, les cartes et les liens lisent cette config. **Aucune valeur métier en dur.**
- **La carte du club** (`La carte`, groupe « Mon club ») — le tarif Herbalife
  donne le prix d'un **contenant**, le club vend des **doses**. L'écran fait le
  pont : par produit, le coach saisit le nombre de doses tirées d'un contenant
  et le prix de la dose au comptoir ; **coût et marge sont calculés** (prix
  public du catalogue × palier de remise ÷ doses, formule affichée). Persisté
  dans `clubs.settings.carte`. Les valeurs relevées sur le **tarif annoté du
  25/06/2026** sont affichées comme **propositions** tant que la ligne n'est pas
  validée — et Noaly ne cite que les lignes validées.
- **Rattachement membre → club** : « Passer en membre BBC » écrit désormais
  `clients.club_id` (il restait NULL → carte et réglages illisibles côté membre).
- **Switch Classic/BBC** (admins) dans la sidebar.

> ⚠️ **La table `clubs` est vide** (aucun club créé à ce jour). Sans club, la
> carte, les réglages et les rituels tombent sur les valeurs par défaut et **rien
> ne s'enregistre**. L'écran « La carte » le dit maintenant franchement avec un
> raccourci « Créer mon club ». Premier geste de recette : créer le club.

### App MEMBRE (PWA, 5 onglets, données réelles)
- **Accueil** — carte de membre (visites + QR), transformation Δ poids, prochain RDV.
- **Évolution** — poids + courbe, 3 jauges (masse grasse/muscle/hydratation), mensurations.
- **Cœurs** — cœurs réels + paliers 2/3/5 + échelle remises PV 25/35/42/50 + **modales pédagogiques** + **recommander (insert réel `client_referrals`)**.
- **Conseils** — mot du coach réel + assiette idéale + routine.
- **Messages** — chat réel coach↔membre (polling 15s).
- QR plein écran + FAB Noaly.
- **Écran d'entrée** — landing + 4 slides d'intro + écran final, vu **une seule fois** (`bbc_entry_seen_at`), skippable.

---

## 🟡 FAÇADE / DONNÉES D'EXEMPLE (structure là, à brancher)

- ~~**Noaly membre**~~ ✅ **branchée** — le FAB de l'app membre ouvre un vrai chat
  (edge `noaly`, mode `client_chat`, auth par token). Le contexte BBC est
  construit **côté serveur** : carte de membre (visites utilisées / restantes /
  expirée), cœurs, prochain rituel, fourchette de prix du bar. Le front n'envoie
  que la question. ⚠️ **L'edge n'est pas encore redéployée** (`noaly` est une
  fonction partagée avec la PROD → déploiement à valider par Thomas). Tant
  qu'elle ne l'est pas, le chat répond mais sans le contexte BBC.
- **Noaly coach en mode BBC** — le FAB coach existe déjà (`NoalyFab`, mode
  `coach_chat`) mais son prompt décrit l'app CLASSIQUE (Co-pilote, FLEX, CRM…).
  En BBC il faudrait lui décrire le club (cobayes, cartes, cœurs, rituels).

---

## 🧭 Lire cette liste sans paniquer

Tout ce qui reste **n'a pas le même poids**. Trois paniers :

| Panier | Contenu | Pourquoi |
|---|---|---|
| **🔥 Bloquant pour ouvrir un club** | ~~Bilan des 10~~ ✅ · ~~cartes 10/30~~ ✅ · ~~config club~~ ✅ | **Plus rien ne bloque l'ouverture d'un club.** |
| **🙂 Confort (après l'ouverture)** | ~~Écran d'entrée~~ ✅ · ~~appels + rappels~~ ✅ · ~~liens rapides~~ ✅ · ~~Messages coach~~ ✅ | **Vide.** |
| **🌱 Plus tard (quand ça grandit)** | ~~Parcours 6 semaines~~ ✅ · ~~Club 100~~ ✅ · Noaly IA · vues cobayes avancées | N'a de sens qu'avec plusieurs clubs / une équipe |

> **En clair : 3 chantiers séparent l'app d'un club qui tourne.** Le reste, c'est de l'amélioration continue.

---

## 🔴 PAS FAIT DU TOUT

- **Vidéos des modules Formation** (optionnel) — le texte des 9 modules est fait ; reste à coller des vidéos via `TutorialLink` + `src/data/tutorials.ts` si tu veux.
- **Dashboard admin « Club 100 »** — 100 membres / 3 sup / 9 stagiaires / 20 000 PV + classement cobayes équipe + alertes.
- **Cobayes — vues avancées** — taux de réponse, série de jours, total semaine, liste de contacts depuis le CRM.

---

## 🔍 Revue adversariale (2026-07-25) — 16 défauts confirmés, 10 corrigés

**Corrigés** (commit `57a6901`) : compteur de visites basé sur la carte et non
le cumul à vie (l'alerte « bilan » ne s'éteignait jamais, « /10 » ignorait les
cartes de 30, 3 écrans affichaient 3 chiffres différents) · app membre « 23/10 »
quand la carte se ferme · **RLS durcie** (un coach pouvait forger une ligne sur
le client d'un autre) · toggle BBC visible chez les coachs classiques ·
messages/recos perdus silencieusement · bilan des 10 dupliqué en concurrence ·
scan affichant « ? visite » · caméra relancée à chaque render.

**Les 5 derniers** (commit `2d93463`) — **16/16 traités** :
- **Cœurs vs CRM** : `client_referrals.status` portait deux vocabulaires (BBC `started`, CRM `converted`) → une reco convertie ne donnait aucun cœur. On lit les deux (`isHeart`) et on écrit `converted`.
- **Cockpit vs onglet Cœurs** : même source désormais (`useBbcHearts`), fin des compteurs divergents.
- **Carte expirée** : elle reste visible avec un drapeau `expired` ; coach et membre affichent « carte expirée · à renouveler ».
- **Edge cron** : `bbc-call-reminder` vérifie le rôle du jeton (clé anon → 401, cron → 200). ⚠️ Une 1re version comparait à `SUPABASE_SERVICE_ROLE_KEY` et cassait le cron — la clé du Vault diffère.
- **Bundle** : `BbcApp` en `lazy()` → chunk de 118 kB non téléchargé par un coach classique.

---

## 🔬 Audit « impasses » (2026-07-26) — 20 confirmées après réfutation

Audit adversarial en 4 angles (créer sans pouvoir modifier · RLS · réglages
jamais relus · parcours membre), chaque trouvaille soumise à un réfutateur.
**7 bloquantes, 13 gênantes.**

### ✅ Corrigé dans la foulée
- **Double comptage d'une visite** → `bbc_add_visit` idempotente sur 10 min
  (pointage manuel + rescan, double scan, relance auto du scanner à 4 s).
- **Aucun retour arrière sur un pointage** → RPC `bbc_remove_visit` + bouton
  « −1 », qui **rouvre la carte** si c'est ce pointage qui l'avait fermée.
- **Désinscription d'un rituel impossible** → `unregister` (les 3 push
  s'éteignent, le suivi fantôme disparaît).
- **Durée de validité de carte jamais appliquée** (trouvée avant l'audit).
- **Renommer un club** (impossible auparavant).

### ✅ Corrigé aussi — les 13 gênants (2026-07-26)
- **Rappels de rituel** → mènent à la PWA du membre, et le rappel « connecte-toi »
  (−15 min) ouvre **le lien Zoom réglé par le coach**, qui n'était transmis nulle part.
- **Notif « ton coach t'a répondu »** → ouvre l'onglet Messages (`?tab=` était ignoré).
  Badge non-lus retiré : jamais rendu, et un vrai compteur suppose un `read_at`
  côté membre — mieux vaut rien qu'une promesse morte.
- **Enregistrement perdu en silence** (Réglages + La carte) → message d'échec.
- **Réglages non pris en compte sans F5** → `BbcApp` garde les valeurs fraîches.
- **Présence « absent » par erreur** → bouton « corriger », fenêtre de 24 h.
- **Horaire de rituel déplacé** → les inscrits ne disparaissent plus (tolérance au jour).
- **2ᵉ bilan des 10** → ne recharge plus le bilan clôturé.
- **Club 100** → prix de carte et coût de visite seedés depuis les réglages et
  « La carte », toujours éditables.

*(Deux trouvailles de l'audit faisaient doublon avec les correctifs du même jour.)*

### ✅ Ex-bloquants — edge `client-app-data` déployée (v21, `verify_jwt:false` préservé)
Ces quatre-là se corrigent dans la même edge, donc en un seul déploiement :
1. **Les cœurs du membre restent à zéro** : le coach écrit `converted`, l'edge
   ne compte que `started`. Coach : 2 cœurs. Membre : « invite ton premier
   proche ». Noaly : 2 cœurs. Trois écrans, trois vérités. *(one-liner — c'est
   exactement le piège déjà corrigé côté coach en juin)*
2. **À la 10ᵉ visite**, l'app annonce au membre « pas de carte active » au lieu
   de fêter sa carte pleine — le filtre `closed_at is null` masque la carte au
   moment précis de la récompense.
3. **Les réglages du club n'atteignent jamais le membre** : barème des cœurs et
   horaires sont recopiés en dur dans l'app membre. Le coach change « 10 visites
   offertes » → le membre lit toujours l'ancienne promesse.
4. **`open_hours` n'a aucun lecteur** : « 7h–11h » est en dur dans la sidebar et
   dans l'écran d'entrée du membre.

### 🟠 Gênant — à traiter avant l'ouverture
- Notifs de rituel → renvoient à la racine du site, pas à la PWA membre ; et le
  **lien Zoom réglé par le coach n'est jamais transmis**.
- Présence pointée « absent » par erreur → irrattrapable.
- Changer l'horaire d'un rituel → orpheline les inscriptions déjà prises.
- 2ᵉ bilan des 10 → écrase le premier.
- Réglages : aucun message quand l'enregistrement échoue (l'écran affiche quand
  même les nouvelles valeurs).
- Réglages non rafraîchis sans rechargement complet de la page.
- Club 100 ignore les prix de carte réglés **et** le coût de visite calculé dans
  « La carte » — le coach ressaisit ce que l'app connaît déjà.
- Notif « ton coach t'a répondu » → ouvre l'Accueil, pas Messages ; badge promis
  mais jamais affiché.

---

## 💡 IDÉES D'OPTIMISATION

- **Formation** : remplir chaque module (résumé + points clés + scripts liés) depuis le Notion ; réutiliser le composant `TutorialLink` + registre `src/data/tutorials.ts` pour coller les vidéos YouTube.
- **Bilan des 10 / EBE BBC** : réutiliser `NewAssessmentPage` via un drapeau `flow=ebe-bbc` (le moteur d'étapes conditionnelles existe déjà) plutôt que réécrire.
- **Config club** : une page réglages qui édite `clubs.settings` (horaires **non tranchés** 20h/20h30 → décision toi/Mélanie, jamais en dur).
- **Cobayes** : brancher la liste de contacts sur les clients/CRM pour un vrai flow 3-taps.
- **Scanner** : ajouter un fallback `jsQR` (lib) pour iOS Safari si un device iPhone doit scanner.
- **Démo** : garder un jeu de données de démo (fiche Thomas Houbert) OU un flag démo, à nettoyer avant prod.
- **Nettoyage prod** : avant merge, décider quoi faire des données seedées.

---

## 🎯 Prochaines étapes proposées (ordre)

1. ~~Contenu Formation~~ ✅ fait (9 modules cliquables).
2. ~~Blocs réels du Cockpit~~ ✅ fait.
3. ~~Bilan des 10~~ ✅ · ~~Cartes 10/30~~ ✅ · ~~Config club~~ ✅
4. ~~Écran d'entrée membre~~ ✅
5. ~~Appels : inscriptions + présence + suivi + rappels automatiques~~ ✅
6. ~~Liens rapides~~ ✅ · ~~Messages coach~~ ✅ — **plus rien en « bloquant » ni en « confort »**.
7. **Recette Thomas de bout en bout** → puis merge dev/prod (autorisation scoped).

> ⚙️ **Décision métier en attente** (toi + Mélanie) : l'heure des rituels
> (20h ou 20h30). L'app ne tranche pas — ça se règle dans **Réglages**.

---

## 🥤 La carte — ce qui manque pour qu'elle soit juste (2026-07-25)

Le tarif Herbalife photographié (25/06/2026) donne le prix des **contenants** ;
il est déjà en base (`src/data/herbalifeCatalog.ts`, mêmes réfs, mêmes prix —
vérifié). Les **annotations manuscrites** sont les prix de vente **à l'unité**
au bar. Deux données manquent encore, et **aucune ne peut être devinée** :

**1. Le nombre de doses par contenant.** Le tarif ne le donne que pour les
formats comptés (10 sachets, 6 barres, 14 barres, 21 sachets). Pour les poudres
et les liquides, ça dépend de la dose servie au club :

| Produit | Contenant | Doses ? |
|---|---|---|
| Formula 1 | 550 g / 780 g | ✅ **21 / 30** (26 g par shake) |
| PDM | 580 g | ✅ **38** (15 g par shake) |
| Thé instantané | 51 g / 102 g | ✅ **30 / 60** (1,7 g par verre) |
| Aloé Vera | 473 ml / 1,892 L | ✅ **47 / 189** (10 ml par verre) |
| Rebuild Strength, CR7 Drive, Fibre Concentrate | pot | ❓ |
| Créatine+ 228 g | — | ✅ **60** (noté sur ta feuille) |
| H24 Hydrate · Microbiotic Max | — | ✅ **20 sticks** (noté) |

**Recettes du club** (Thomas, 25/07/2026) : shake de 400 ml = 26 g F1 + 15 g PDM ·
boisson de 400 ml = 1,7 g thé + 10 ml aloé. L'app calcule donc le coût d'un
**shake complet** (F1 + PDM), pas celui du F1 seul.

### Le chiffre du modèle (palier 50 %, calculé, formules affichées)
| | |
|---|---|
| un shake | **2,50 €** |
| une boisson | **1,26 €** |
| **une visite te coûte** | **3,76 €** (3,46 € en grands formats) |
| carte 10 → 8,00 €/visite | marge **4,24 €** · 53 % |
| carte 30 → 6,17 €/visite | marge **2,40 €** · 39 % |

Sur un Club 100 (1 040 visites/mois) en cartes 30 ⇒ ~**2 500 €/mois de marge
produit**, avant loyer et charges fixes.

⚠️ **À trancher** : le **2,80 €** relevé sur le F1. Si c'est le prix du shake
COMPLET, la marge tombe à **0,30 €** — quasiment à perte. Si c'est le F1 seul
(PDM facturé à part), la marge est de 1,29 €.

**2. La relecture de tes annotations.** Certaines sont nettes, d'autres pas —
l'écran « La carte » affiche chaque prix comme **proposition** avec la mention
« lecture à confirmer » tant que tu n'as pas validé la ligne. Rien n'est
appliqué sans ton clic.

Une fois les deux renseignés, l'app calcule seule : coût de la dose, marge €,
marge %, et la marge moyenne par visite alimente le calculateur Club 100.
