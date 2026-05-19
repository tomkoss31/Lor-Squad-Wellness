# Audit Phase 3.1 — `/clients` V2 kanban

**Date** : 2026-05-19 (mardi, retour PC)
**Cible** : `src/pages/ClientsPage.tsx` (1425 L) + `src/components/clients/` + `src/components/leads/`
**Source** : audit lecture-seule, zéro modif code.

---

## 1. État livré V2 + V3 partiel

`/clients` est désormais une **page à 3 onglets** (`?tab=clients|leads|temoignages`) :

| Onglet | Source | Rôle |
|---|---|---|
| **Clients** (défaut) | `ClientsPage` body | Vue principale (kanban DnD + filtres) |
| **Leads** | `<LeadsKanban />` | Chantier #1 étape 1.6 — pipeline bilan online |
| **Témoignages** (admin only) | `<AdminTestimonialsPage />` | Chantier #11 — modération avis |

### Fonctionnalités V2 livrées (cf. CLAUDE.md "Refonte page /clients V2 livrée")

| Feature | Statut | Source code |
|---|---|---|
| Chips filtres rapides | ✅ | `QuickFiltersBar` + `clientQuickFilters.ts` |
| Vue Kanban DnD | ✅ | `ClientsKanban` |
| Lifecycle badges (active/paused/stopped/lost/not_started) | ✅ | `LIFECYCLE_LABELS` + `LIFECYCLE_TONES` |
| Sélection multiple | ✅ | local state ClientsPage |
| Bulk lifecycle change | ✅ | mutation `setClientLifecycleStatus` |
| Bulk message multi-canal | ✅ | `<BulkMessageModal />` |
| Tri intelligent / nom / dernier bilan | ✅ | `sortKey` state |
| **Tri par PV mois** (V3 backlog brainstorm) | ✅ **DÉJÀ FAIT** | ligne 293 : `sortKey === "pv-month-desc"` + `pvByClientThisMonth` |
| Owner pre-select via `?owner=<id>` | ✅ | ligne 60-70 (lecture URL + sync) |
| Export CSV de la sélection | ✅ | ligne 1422 `clients-export-${datestamp}.csv` |
| Onglet Leads filtré (chantier #1) | ✅ | merge PR #41 |

### V3 backlog brainstorm — encore ouvert

| Feature | Statut | Effort estimé |
|---|---|---|
| **Sélection persistée entre navigations** (localStorage) | ❌ pas implémenté | XS (30 min) |
| ~~Tri par PV mois~~ | ✅ déjà fait | — |
| ~~Filtre owner via query param~~ | ✅ déjà fait | — |

---

## 2. Doublons / risques

| Sujet | Détail | Reco |
|---|---|---|
| `LeadsKanban` vs `ClientsKanban` | 2 kanbans distincts car colonnes différentes (lifecycle vs lead pipeline). **Pas un doublon code** — DnD probablement dupliqué inline. | Audit follow-up ciblé si besoin de mutualiser la couche DnD (low priority). |
| `AdminTestimonialsPage` rendu inline | La page existe aussi en route propre. Ici elle est rendue comme onglet enfant. Pas problématique. | OK. |
| Taille fichier 1425 L | Au-dessus du seuil ⚠️ 800 L. Hot zone refacto possible : extraction du body "Clients" (lignes 404→1286) en sous-composant `<ClientsListView />`. | 🟡 mid-priority (cf. Audit 3.5). |

---

## 3. Conclusion

**`/clients` V2 est largement au-delà du périmètre V2 initial** — la majorité du backlog V3 (tri PV, owner query param) a été absorbée pendant les chantiers #1 / #11. Reste 1 seul item V3 marginal : **sélection persistée localStorage** (~30 min, non bloquant).

**Pas de chantier dédié à lancer**. Le seul vrai gain serait d'extraire `<ClientsListView />` pour passer ClientsPage sous 800 L → à traiter dans la phase refacto codebase (3.5), pas en chantier autonome.
