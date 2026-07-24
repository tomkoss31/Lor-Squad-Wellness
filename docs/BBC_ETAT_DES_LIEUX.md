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
- **Cockpit** — compteur **cobayes du jour réel** + flow « envoyer un cobaye » (script verrouillé + prénom injecté + WhatsApp → persisté dans `outreach_messages`).
- **Le club** — pointage réel (**+1 visite** → `club_visits`), alerte **7-9 orange / 10+ rouge (bilan)**, + **scanner caméra QR** (le membre montre son QR → +1 visite via `bbc_scan_visit`).
- **Cœurs** — mur des cœurs réel + **recos à valider** (le coach confirme « a démarré » = 1 cœur), paliers 2/3/5.
- **Cobayes & membres** — liste réelle des membres BBC + **récap complet cliquable** (contact, objectif, programme, statut, RDV, visites, cœurs).
- **Mes clubs** — création de club réelle (`createMyClub` + `set_club_model`).
- **Switch Classic/BBC** (admins) dans la sidebar.

### App MEMBRE (PWA, 5 onglets, données réelles)
- **Accueil** — carte de membre (visites + QR), transformation Δ poids, prochain RDV.
- **Évolution** — poids + courbe, 3 jauges (masse grasse/muscle/hydratation), mensurations.
- **Cœurs** — cœurs réels + paliers 2/3/5 + échelle remises PV 25/35/42/50 + **modales pédagogiques** + **recommander (insert réel `client_referrals`)**.
- **Conseils** — mot du coach réel + assiette idéale + routine.
- **Messages** — chat réel coach↔membre (polling 15s).
- QR plein écran + FAB Noaly.

---

## 🟡 FAÇADE / DONNÉES D'EXEMPLE (structure là, à brancher)

- **Cockpit** — blocs « ☕ le club ce matin », « ❤️ à un cœur du palier », « 📞 prochain appel » = **données d'exemple** (le compteur cobayes, lui, est réel).
- **Messages (coach)** dans l'environnement desktop = exemple (le membre a un chat réel).
- **Scripts** — contenu réel (verbatim Notion) mais statique ; le bouton « copier » fonctionne.
- **Formation** — **structure seulement** : échelle des rôles + liste des 9 modules (00→08) + glossaire. **Pas de contenu dans les modules.**
- **Noaly** (membre + coach) — coquille, pas branché à l'IA.

---

## 🔴 PAS FAIT DU TOUT

- **Écran d'entrée membre** (`BBC Entrée.dc.html`, designé, pas porté).
- **Contenu des modules Formation** (leçons 00→08). ⭐ *je sais quoi y mettre* (Notion Playbook + Formation 00→08).
- **Appels & rappels** — les rituels hebdo (Appel Ambassadeur lun/jeu, Atelier Cœurs mar/sam, Coach Academy mer) + inscriptions + séquence de rappels (J-jour midi / −30 / −15 / +30). Le membre a un bloc « appel du club » statique.
- **Bilan des 10** — la checklist 9 étapes déclenchée à 10 visites (l'alerte existe, la checklist non).
- **Cartes de membre 10/30** — type/prix/solde (aujourd'hui carte 10 en dur).
- **Onboarding BBC guidé** — `starterPlanBBC` (6 semaines de pré-lancement à portes serveur).
- **Dashboard admin « Club 100 »** — 100 membres / 3 sup / 9 stagiaires / 20 000 PV + classement cobayes équipe + alertes.
- **Liens rapides** — 7 liens 1-tap (bilan online, RDV, Zoom, visuel A/B/C/D, avis Google…).
- **Config par club** — éditer horaires appels + barème (le `clubs.settings` jsonb existe, pas d'UI).
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

1. **Contenu Formation** (je sais quoi y mettre — Notion) — remplit le plus gros « vide ».
2. **Blocs réels du Cockpit** (le club ce matin / à un cœur / prochain appel) branchés aux vraies données.
3. **Écran d'entrée membre** (porter le design).
4. **Bilan des 10** (checklist) + **cartes 10/30**.
5. **Appels & rappels** (rituels + séquence).
6. Recette Thomas → merge dev/prod (autorisation scoped).
