# Plan d'exécution — chantiers de simplification (B1 → B9)

> Compagnon de `docs/audit/architecture.html` (l'audit = le *quoi/pourquoi*, ce doc = le *comment*).
> Chaque chantier est prêt à dérouler. Dis « go B<n> » et je l'exécute (avec `npx tsc -b --noEmit`
> avant chaque commit). Les chantiers couplés sont signalés.

Légende effort : 🟢 < 1h · 🟡 ~0,5 j · 🔴 ~1 j+ · ⚠️ = décision Thomas requise avant de coder.

---

## B1 — Fiche client : 7 → 5 onglets ✅ LIVRÉ (2026-06-13)
**Implémentation retenue** (plus simple que le plan d'origine, zéro déplacement de
gros JSX) : les blocs `activeTab === N` étant déjà des frères au même niveau sous
le wrapper racine `space-y-6`, il a suffi de **rebasculer les gardes** au lieu de
déplacer le JSX. Résultat : **0** Vue (+ Historique rapatrié) · **1** Mesures
(Body Scan + Mensurations, 2 sous-titres déjà portés par chaque bloc) · **2**
Produits · **3** Actions · **4** Club VIP. Mapping query centralisé
`TAB_SLUG_TO_INDEX` (vue/mesures/produits/actions/vip) → deep-links `?tab=actions`
(Co-pilote `HeroActionCard`/`PendingFollowupsCard`, `FollowUpsDueWidget`,
`SuivisDuJourPage`) préservés. `setActiveTab` internes re-numérotés (5→3).
`npx tsc -b --noEmit` ✅.

<details><summary>Plan d'origine (archivé)</summary>
🟡
**Objectif** : fusionner *Body Scan* + *Mensurations* → **« Mesures »**, et remonter *Historique* dans *Vue*.
**Fichier** : `src/pages/ClientDetailPage.tsx` (un seul).
**État actuel** : onglets **par index** (0 Vue · 1 Body Scan · 2 Mensurations · 3 Historique · 4 Produits · 5 Actions · 6 Club VIP), rendus par `activeTab === N` (lignes 552→). Query : `?tab=actions` → index 5 (ligne 83).
**Étapes**
1. Réduire le tableau d'onglets (l.477-483) à 5 : Vue · **Mesures** (📐, count = body scans) · Produits · Actions · Club VIP.
2. Bloc `activeTab === 1` (Mesures) = contenu Body Scan (l.609-783) **puis** Mensurations (l.784-794) sous 2 sous-titres.
3. Déplacer Historique (l.795-855) en bas de **Vue** (`activeTab === 0`).
4. Re-numéroter : Produits 4→2, Actions 5→3, Club VIP 6→4.
5. Mettre à jour le mapping query (l.83) : `?tab=actions` → **3** ; ajouter `?tab=mesures` → 1.
**Risque** : moyen — re-indexation + **deep links** `?tab=actions` (utilisés par Agenda / Co-pilote / CLAUDE.md). Tester chaque lien.
</details>

---

## B2 — Renommer « Outils » → « Mon business 💼 » ✅ LIVRÉ (2026-06-13)
**Objectif** : lever la confusion avec la « Boîte à outils » pédagogique.
**Fichiers** : `AppLayout.tsx` (label nav + emoji 💼 + `pageTitle` de `/outils`), `OutilsPage.tsx` (eyebrow « Pilote ton activité » + titre « Mon business » + sous-titre). MobileDrawer suit via `navItems`.
**Décision Thomas** : nom retenu = **« Mon business »**. URL `/outils` inchangée.

---

## B3 — Paramètres : 8 → 6 onglets (regrouper sous « Admin ») 🟡
**Objectif** : regrouper *Transferts / Stats / Debug* sous un onglet **Admin**.
**Fichiers** : `src/pages/ParametresPage.tsx` (+ nouveau `src/components/settings/AdminTab.tsx`).
**État** : 8 onglets (profil, vip, notifs, legal, equipe, transferts, stats, debug).
**Étapes**
1. Créer `AdminTab` avec 3 sous-onglets internes (Transferts / Stats / Debug) — réutilise les composants existants tels quels.
2. Remplacer les 3 entrées par 1 entrée « Admin » (adminOnly).
3. Rétro-compat : `?tab=stats|transferts|debug` → ouvrir Admin + bon sous-onglet.
**Risque** : faible-moyen. Build TS + test des anciens liens.

---

## B4 — Prospection : une seule porte 🔴 ⚠️(structurel)
**Objectif** : fin de l'éclatement `/prospection` (froide) + `/outils-prospection/*` (admin) + Business.
**Fichiers** : `src/App.tsx` (routes), `src/pages/OutilsProspectionMerePage.tsx` (page mère), `src/pages/DeveloppementHubPage.tsx` (retirer la section « prospecter »).
**Étapes**
1. Choisir la **page d'atterrissage unique** (recommandé : `OutilsProspectionMerePage` devient le hub « Prospecter »).
2. Y lister : Prospection froide (`/prospection`) · Bilan online liens · International · **Business / Opportunité**.
3. Retirer ces accès de « Mon développement » (cohérent avec B5).
**Risque** : moyen. **Décision** : où vit l'entrée « Prospecter » → nouvelle entrée sidebar, ou sous « Business & outils », ou carte unique du hub ?
**Couplé à B5.**

---

## B5 — Hub « Apprendre » 100 % pédago 🟡 (couplé B4)
**Objectif** : ne garder dans `/developpement` que *se former*.
**Fichier** : `src/pages/DeveloppementHubPage.tsx` (SECTIONS l.35-39 + CARDS).
**Étapes**
1. Retirer la section **prospecter** (→ B4) et **admin** (Admin prospection → B4 ; Newsletters → Paramètres/Admin).
2. Trancher la section **quotidien** (Cahier de bord, Routine) : pédago perso ? → garder, sinon déplacer vers Co-pilote/Outils.
3. Résultat cible : Academy · Formation · Boîte à outils · Club VIP (mode d'emploi) · Nouveautés.
**Risque** : faible (déplacement de cartes).

---

## B6 — Clarifier FLEX vs Rentabilité ✅ LIVRÉ (2026-06-13)
**Objectif** : enlever l'ambiguïté « les deux montrent de la marge ».
**Livré** : sous-titre sous le hero de chaque page + **mini-lien croisé**.
- `FlexDashboardPage.tsx` : « FLEX = tes **paliers Herbalife** & la projection du mois » + lien « Voir ta marge réelle → » (/rentabilite).
- `RentabilitePage.tsx` : « Rentabilité = ta **marge réelle** : vente directe + overrides » + lien « Voir tes paliers FLEX → » (/flex).

---

## B7 — Devis 🟢/🔴 ⚠️(à décider)
**Fichiers** : `src/pages/OutilsPage.tsx` (carte « Bientôt »), `src/components/layout/AppLayout.tsx` (sous-item Outils).
**Options** : (a) **retirer** la carte · (b) **garder** « Bientôt » · (c) **construire** : nouvelle `DevisPage` qui réutilise la logique `PanierPage` + export PDF (jsPDF/html2canvas déjà dans le repo).
**Effort** : (a)(b) 🟢 · (c) 🔴 ~1 j.

---

## B8 — Purger les redirects de compat 🟡 ⚠️(APRÈS la V5 Co-pilote)
**Fichier** : `src/App.tsx` — `/opportunite` (l.650), `/simulateur` (l.651), `co-pilote-v5` (l.676), `co-pilote-legacy` (l.677), `dashboard` (l.678), `formation/charte` (l.690).
**Étapes** : retirer les routes obsolètes. ⚠️ **Effet de chaîne** : supprimer `co-pilote-legacy` rend `CoPilotePage.tsx` mort → et `RentabilityWidget` (utilisé **uniquement** par `CoPilotePage`) devient mort aussi → à supprimer dans la foulée.
**Garder probablement** `/dashboard` (vieux lien courant).
**Risque** : moyen (vieux liens partagés). **À planifier après ton chantier Co-pilote.**

---

## B9 — Règle anti-dérive dans CLAUDE.md 🟢
**Fichier** : `CLAUDE.md` (section « Hub développement »).
**Contenu** : encadré —
> *Une feature = un seul endroit (le reste = raccourci) · max 5 onglets par page ·
> 2 hubs : « Business & outils » (faire/piloter) et « Mon développement » (apprendre) ·
> avant d'ajouter une entrée de menu, vérifier qu'elle n'existe pas déjà ailleurs.*
**Risque** : 0.

---

### Ordre recommandé
1. **Sans risque d'abord** : B9 → B6 → B2 (textes/labels). 
2. **Quick wins structurants** : B3 → B1.
3. **Couplé, à cadrer** : B4 + B5 ensemble (1 décision « où vit Prospecter »).
4. **Décision** : B7.
5. **Après la V5** : B8.
