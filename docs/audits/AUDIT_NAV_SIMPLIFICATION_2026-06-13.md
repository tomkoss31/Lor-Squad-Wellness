# Audit navigation & simplification — 2026-06-13

> Contexte : Thomas signale qu'on « s'y perd », trop de menus / icônes / sous-onglets.
> Ce doc cartographie la complexité réelle et propose une simplification **à valider
> ensemble avant tout code nav**. Les 3 quick wins liés (sélecteur de mois PV,
> Rentabilité dans Outils, Rentabilité équipe sous Mon équipe, sections repliables
> sur /rentabilite) sont **déjà livrés** sur `claude/volume-menu-simplification-jdr0xl`.

---

## 1. Constat : la sidebar n'est PAS le vrai problème

La sidebar a déjà été dégraissée (2026-06-13) et tient en **9 items max** :

```
Co-pilote · Dossiers clients · CRM · Agenda · Messagerie
Outils (accordéon: Mes liens / Panier / Rentabilité / FLEX / Suivi PV / Devis)
Mon équipe (admin) · Mon développement · Paramètres
```

C'est sain. **Le vrai « on s'y perd » vient d'ailleurs** ↓

## 2. Le vrai problème : la profondeur interne

| Surface | Complexité actuelle | Ressenti |
|---|---|---|
| **Pages à onglets** | ClientDetailPage = **7 onglets**, ParametresPage = **8 onglets**, TeamPage = **6 onglets**, app client = 5 onglets | « des menus partout » |
| **Hubs qui se chevauchent** | `Mon développement` (12 cards) + `Outils` (cards) + `Formation` (landing) + `Boîte à outils` (grille) | « je sais plus où trouver » |
| **Routes** | **70+** routes distinctes | dispersion |
| **Doublons d'accès** | Boîte à outils, Outil de prospection, Cahier de bord… apparaissent à 2-3 endroits | « c'est où déjà ? » |

## 3. Recommandations (par priorité / risque)

### 🟢 Lot A — Quick wins faibles risques (≈ 0,5 j)
- **A1.** Réduire ClientDetailPage de 7 → **5 onglets** : fusionner `Body Scan` + `Mensurations` → un seul onglet **« Mesures »** ; fusionner `Historique` dans `Vue`. *(le plus gros gain ressenti, c'est la page la plus consultée)*
- **A2.** Un seul hub d'entrée « apprendre/outils » : faire pointer les doublons (Boîte à outils, Cahier de bord, Prospection) vers **une** source, retirer les cards dupliquées du hub Développement.
- **A3.** Uniformiser le pattern d'onglets (pills) sur Client / Team / Paramètres pour cohérence visuelle.

### 🟡 Lot B — Consolidation hubs (≈ 1 j, à cadrer)
- **B1.** Fusionner `Mon développement` et la partie « apprendre » d'`Outils` : 1 hub « Apprendre & outils » avec sections claires (Quotidien / Apprendre / Prospecter / Admin), 0 doublon.
- **B2.** ParametresPage 8 → **5 onglets** : regrouper `Stats`/`Transferts`/`Debug` sous un onglet **« Admin »** déroulant.

### 🔴 Lot C — Refonte structurelle (à discuter, ne pas lancer seul)
- **C1.** Décider d'une règle ferme : **max 5 onglets par page**, **1 seule façon d'atteindre chaque feature**.
- **C2.** Carte mentale unique « où vit quoi » documentée dans CLAUDE.md (anti-dérive future).

## 4. Principe directeur proposé

> **Une feature = un seul endroit.** Si elle apparaît ailleurs, c'est un *raccourci* (lien),
> pas une 2ᵉ implémentation. Max 5 onglets par page. La sidebar reste le quotidien ;
> tout le reste vit dans **2 hubs** : `Outils` (faire) et `Mon développement` (apprendre).

## 5. Ce qui est déjà fait (chantier volume-menu-simplification)
- ✅ Sélecteur de mois sur la saisie PV manuelle (corriger un mois passé)
- ✅ Rentabilité accessible depuis Outils (avant : Co-pilote only)
- ✅ Onglet Rentabilité d'équipe sous Mon équipe (top-5 simple)
- ✅ Page /rentabilite : sections repliables (anti « plein de chiffres »)

## 6. Prochaine décision attendue de Thomas
Choisir le(s) lot(s) à lancer : **A** (sûr, gros gain ressenti) recommandé en premier ;
**B** ensuite ; **C** à décider en visio.
