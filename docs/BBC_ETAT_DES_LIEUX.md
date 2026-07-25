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
- **Appels** — inscriptions aux rituels (occurrences depuis la config), présence pointée après l'appel, **suivi « patate chaude »** (10 min), bloc « à traiter ». Le membre voit son prochain appel.
- **Rappels automatiques** — edge `bbc-call-reminder` + cron `*/10` : midi le jour J, −30 min, −15 min (push **membre**) et +30 min après (push **coach**, patate chaude, seulement si le suivi n'est pas fait). Anti-doublon en base.
- **Mes clubs** — création de club réelle (`createMyClub` + `set_club_model`).
- **Scripts & liens** — les 12 scripts verbatim (prénom injecté + copier) **et** les 6 **liens rapides** 1-tap avec message pré-rédigé (bilan online, réserver un créneau, page coach, Zoom Appel/Atelier, avis Google) → copier / lien seul / WhatsApp.
- **Réglages** — créneau d'ouverture · rituels (jours + heure) · barème des cœurs · cartes (prix + durée) · **liens du club** (Zoom, avis Google). Écrit `clubs.settings` ; le Cockpit, les Cœurs, les cartes et les liens lisent cette config. **Aucune valeur métier en dur.**
- **Switch Classic/BBC** (admins) dans la sidebar.

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

- **Messages (coach)** dans l'environnement desktop = exemple (le membre a un chat réel).
- **Noaly** (membre + coach) — coquille, pas branché à l'IA.

---

## 🧭 Lire cette liste sans paniquer

Tout ce qui reste **n'a pas le même poids**. Trois paniers :

| Panier | Contenu | Pourquoi |
|---|---|---|
| **🔥 Bloquant pour ouvrir un club** | ~~Bilan des 10~~ ✅ · ~~cartes 10/30~~ ✅ · ~~config club~~ ✅ | **Plus rien ne bloque l'ouverture d'un club.** |
| **🙂 Confort (après l'ouverture)** | ~~Écran d'entrée~~ ✅ · ~~appels + rappels auto~~ ✅ · ~~liens rapides~~ ✅ · **Messages coach** | Presque vide : il ne reste que la messagerie côté coach |
| **🌱 Plus tard (quand ça grandit)** | Onboarding guidé 6 semaines · dashboard Club 100 · Noaly IA · vues cobayes avancées | N'a de sens qu'avec plusieurs clubs / une équipe |

> **En clair : 3 chantiers séparent l'app d'un club qui tourne.** Le reste, c'est de l'amélioration continue.

---

## 🔴 PAS FAIT DU TOUT

- **Vidéos des modules Formation** (optionnel) — le texte des 9 modules est fait ; reste à coller des vidéos via `TutorialLink` + `src/data/tutorials.ts` si tu veux.
- **Onboarding BBC guidé** — `starterPlanBBC` (6 semaines de pré-lancement à portes serveur).
- **Dashboard admin « Club 100 »** — 100 membres / 3 sup / 9 stagiaires / 20 000 PV + classement cobayes équipe + alertes.
- **Cobayes — vues avancées** — taux de réponse, série de jours, total semaine, liste de contacts depuis le CRM.

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
6. ~~Liens rapides~~ ✅ — reste **Messages coach** réel (dernier item « confort »).
7. Recette Thomas → merge dev/prod (autorisation scoped).

> ⚙️ **Décision métier en attente** (toi + Mélanie) : l'heure des rituels
> (20h ou 20h30). L'app ne tranche pas — ça se règle dans **Réglages**.
