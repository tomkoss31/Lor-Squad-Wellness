# Audit Phase 3.2 — `/outils-prospection`

**Date** : 2026-05-19 (mardi, retour PC)
**Cible** : `src/pages/OutilsProspectionPage.tsx` (863 L)
**Source** : audit lecture-seule, zéro modif code.

---

## 1. Crainte initiale brainstorm — résolue

Le brainstorm dump (chantier #3) mentionnait :

> **DOUBLON POTENTIEL** : la page `/outils-prospection` (`OutilsProspectionPage`, 863 L) existe déjà comme "boîte à outils prospection". Avant tout dev, **auditer ce qu'elle contient**.

→ Audit fait. **Pas de doublon avec le chantier #3.**

---

## 2. Rôle distinct de chaque page

| Page | Route | Rôle |
|---|---|---|
| `OutilsProspectionPage` | `/outils-prospection` (admin only) | **Boîte à liens marketing partageables** : Page éducative `/opportunite`, Simulateur `/simulateur`, 3 docs PDF imprimables (plan prospect / plan distri / cas concret). Copier ?ref=<user_id> auto, partage WhatsApp/SMS/Email avec message pré-rédigé. |
| `ProspectionPage` | `/prospection` (tous distri) | **Module Formation cold mobile-first** (chantier #3 V3 — 1571 L) : 6 étapes (Marché → Profil → Brief → Cibler → Premier contact → Suivi), tracking via `prospection_attempts`, stats RPC `get_prospection_stats`. |

**Conclusion** : ce sont 2 features radicalement différentes (outils marketing à partager VS module pédagogique pour apprendre à prospecter). **Aucune refonte / fusion à faire**.

---

## 3. Architecture `OutilsProspectionPage` actuelle (863 L)

- 1 array `TOOLS[]` de 5 entrées (`opportunite`, `simulateur`, `doc-prospect`, `doc-distri`, `doc-cas-concret`)
- Card grid responsive avec accent G3 (emerald / cyan / violet / gold)
- Mode contextuel `?client=<id>` : envoi ciblé à un client précis depuis `SendBusinessPlanButton`
- Liens auto-tagués `?ref=user_id` pour tracking attribution
- Bouton "Imprimer" pour les docs HTML standalone

### Hotspots refacto ?

| Bloc | Lignes | Reco |
|---|---|---|
| `TOOLS[]` data | ~60 L | OK inline (5 entrées, low churn). |
| Card grid | ~200 L | OK (style premium G3). |
| Composer message (WhatsApp/SMS/Email) | ~300 L | 🟡 Pourrait extraire en `<MessageComposerModal />` réutilisable. Pattern aligné `BulkMessageModal` + `MessageTemplatesModal` — opportunité de mutualisation cross-feature (out-of-scope ici). |
| Mode client contextuel | ~100 L | OK. |

**Taille 863 L** : juste au-dessus du seuil 800. **Pas d'urgence refacto** (un seul vrai bloc extractible : composer message → mutualisation cross-`/clients`/`/outils-prospection` à arbitrer plus tard).

---

## 4. Conclusion

- ✅ **Pas de chantier `/outils-prospection` à lancer**.
- 🟢 La page joue son rôle d'outils marketing partageables, distinct du module Formation `/prospection`.
- 🟡 Opportunité refacto **opportuniste** (pas urgente) : extraire le composer message en composant partagé avec `BulkMessageModal` + `MessageTemplatesModal`. À faire le jour où on touche au composer pour une autre raison.
