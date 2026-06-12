# Audit architecture & navigation — plan de travail (prêt, à lancer au « go »)

> Demande Thomas (2026-06-12) : l'app a **trop de menus/sous-menus**, des
> **doublons**, du **code mort** (vieilles features jamais revues), et une
> **taxonomie confuse** (formation mêlée à « Mon développement », business mêlé
> aux bilans, lien opportunité online rangé dans le développement…). Objectif :
> **simplifier les accès**, créer des **raccourcis**, rendre l'app lisible pour
> un nouveau. Livrable : **une page HTML imprimable** de l'architecture +
> reco de simplification. ⚠️ Audit **lecture seule, économe en tokens** (Explore
> + grep, pas de lecture exhaustive).

## Méthode en 3 phases (read-only, ~budget maîtrisé)

### Phase A — Cartographie (1 agent Explore, ciblé)
1. **Navigation réelle** : items sidebar (`AppLayout`) + hub `DeveloppementHubPage` (CARDS) + topbar/FAB → liste tous les points d'entrée et leur hiérarchie.
2. **Routes** : toutes les routes de `App.tsx` → lesquelles ont un lien dans la nav, lesquelles sont **orphelines** (atteignables uniquement à l'URL).
3. **Doublons & morts** : routes/pages jamais référencées, composants importés nulle part, concepts redondants (Academy vs Formation vs Développement, etc.).
4. **Taxonomie** : ranger chaque page par **intention utilisateur** (faire un bilan · prospecter · se former · piloter le business · gérer ses clients · réglages).

### Phase B — Restitution visuelle (page HTML imprimable)
Une page `docs/audit/architecture.html` avec :
- **L'arbo actuelle** (sidebar → sous-menus → pages), code couleur : 🟢 utilisé · 🟡 mal rangé · 🟠 doublon · 🔴 mort/inutile.
- **Carte des problèmes** : doublons, code mort, pages mal classées.
- **Proposition d'arbo simplifiée** (la cible) : moins de sous-menus, regroupements clairs.

### Phase C — Reco actionnables (priorisées)
- **Quick wins** : raccourcis, menu **« ⋮ / Liens »** (lien bilan, lien partage/opportunité, lien VIP…), regrouper formation+développement, sortir le business des bilans.
- **Nettoyage** : liste précise des pages/routes/composants à supprimer ou fusionner.
- **Gros chantiers (plus tard)** : refonte nav, **page Panier** (cf. ci-dessous).

## Idées Thomas à garder (chantiers identifiés, PAS dans l'audit)
- **Menu « ⋮ » / « Liens »** : un déroulant (ou une page) regroupant les liens du coach (bilan online, partage opportunité, page VIP, page Résultat…). Raccourci unique au lieu d'aller les chercher partout.
- **Page Panier** (chantier séparé, plus tard) : construire un panier produits avec **PV** + total, appliquer un **code remise** (5/10/15 %…) → calcul instantané du prix client, sans aller fouiller sur Bizworks/Herbalife.

## Garde-fous
- **Audit = lecture seule.** Aucune suppression/refacto sans validation Thomas.
- **Économe** : 1-2 agents Explore + grep ciblés, lecture complète seulement de `App.tsx` + `AppLayout` + `DeveloppementHubPage`. Pas de lecture exhaustive du repo.
- Le livrable HTML est posé dans le **dossier Téléchargements** (comme le script démo) pour être trouvable + imprimable directement.
