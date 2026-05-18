# Prompt redémarrage Claude Code — La Base 360 (18/05/2026)

> Copie-colle ce bloc complet dans ta nouvelle conversation Claude Code locale.

---

Tu es Claude Opus 4.7 (1M context) qui m'aide sur le projet **La Base 360** (anciennement « Lor'Squad Wellness » — le repo s'appelle encore `Lor-Squad-Wellness`). On reprend où on s'est arrêtés. Avant de répondre à quoi que ce soit, **lis dans cet ordre les 3 fichiers suivants** pour te remettre en contexte :

1. `docs/BRAINSTORM_EGYPTE_2026-05.md` — **brainstorm stratégique complet** (8 chantiers, ~50 décisions actées, roadmap, règles transverses). C'est la source de vérité produit.
2. `docs/ARCHITECTURE_SNAPSHOT_2026-05.md` — carte technique de l'app (routes, hooks, tables Supabase, edge functions).
3. `CLAUDE.md` à la racine — règles projet, conventions code, historique.

---

## 📊 État réel au 18/05/2026

### Chantiers DÉJÀ LIVRÉS et mergés sur `dev/thomas-test` (17/05)

- ✅ **Chantier #1 — Bilan Online + Lead pipeline** (PR #41, 10 étapes complètes)
- ✅ **Chantier #3 — Module Prospection cold mobile-first** (PR #45, #46, #47, #48 — V3 FULL avec brief méthodo + tracking + admin CRUD + widget Co-pilote)
- ✅ **Chantier #7 — Refonte business `/business` scroll narratif unifié** (PR #49, #50, #51 — popup lead capture + annonce distri)
- ✅ **Chantier #10 — Badges crédibilité coach** (PR #42, #43, #44 — V2 avec ville + coaching_since)

### Travail en attente — par ordre de priorité

1. **Refonte couleurs pages publiques V2** (lire `docs/PROMPT_REFONTE_PAGES_PUBLIQUES_V2.md`)
   → Migrer BilanOnlineWelcomePage / BilanOnlinePage / BilanOnlineThankYouPage du style cream+Syne+gold actuel vers le style dark premium V2 (Sora + gradients teal/violet/coral) — cohérent avec Co-pilote V5 et le logo La Base 360. **3-4 h-agent.** Branche cible : `feat/public-pages-v2-dark`.
   - Référence visuelle pixel-perfect : `docs/mockups/bilan-online-v2.html` (commit `8520a2c`) et `docs/mockups/temoignage-client-v2.html` (commit `e971ae8`).

2. **Chantier #11 — Témoignages clients vérifiés** (lire `docs/PROMPT_CHANTIER_11_TEMOIGNAGES.md`)
   → Sprint 1 prioritaire (~2.5-4 h-agent) : migration `client_testimonials` + edge function `submit-testimonial` + page form publique `/temoignage/:token` (et `/temoignage` non-nominatif pour partage groupe WhatsApp). Sprint 2 ensuite (~3-4 h) : admin modération + cron J+60 + carrousel réutilisable.
   - **Important** : ce chantier doit utiliser les **tokens V2** créés à l'étape 1. Ne lance le Sprint 1 que **après** que la refonte pages publiques V2 soit mergée.
   - Branche cible : `feat/testimonials`.

3. **Reste de la roadmap (à faire après)** :
   - Chantier #2 — Check-list quotidienne Co-pilote (7-9 h)
   - Chantier #13 — Fiche distri unifiée + resurfaçage flux (9-13 h)
   - Phase 0.8 — Enrichissement Liste 100 (2-2.5 h)
   - Phase 0.9 — Mini-fix UX Formation (1.5-2 h)
   - Chantier #5 — i18n + multi-monnaie (16-23 h)
   - Phase 2 — Renommage code « La Base 360 » (2-4 h)
   - Chantier #8 — Newsletter (17-25 h)
   - Chantier #6 — Vidéos pédagogiques (3-4 h)
   - Chantier #12 — Audit refacto progressif (2-3 h Phase A)
   - Phase 0 + Phase 0.5 — fix mobile chat + Celebration popup (~1 h cumulé)

---

## 🚨 Règles strictes à respecter (sinon tu fais n'importe quoi)

1. **Workflow mono-branche** (règle #11 du brainstorm) : un seul chantier de code en cours sur sa branche. Pas de parallélisation. Audits lecture-seule autorisés en parallèle.
2. **NE PAS toucher** `NewAssessmentPage.tsx` (4325 lignes — bilan en RDV). Outil business critique, intouchable sans demande explicite Thomas. Le chantier #1 Bilan Online était **totalement séparé** et c'est pour ça que ça a marché.
3. **NE PAS écrire « Lor'Squad »** dans du nouveau code/copy/UI. C'est **« La Base 360 »** partout. Le repo garde son ancien nom techniquement.
4. **Pages publiques** (bilan, témoignage, business, future newsletter) = identité visuelle V2 dark premium **séparée** du theme système app interne (Co-pilote, Clients, etc.) qui garde son toggle dark/light existant. **2 systèmes de design distincts cohérents.**
5. **Migrations Supabase** = la DB est UNIQUE (dev + prod partagés). 1 migration par chantier, sur sa table dédiée. Apply via `supabase db push --linked --include-all` puis edge functions via `supabase functions deploy <name> --no-verify-jwt`.
6. **Mockups Égypte validés** = source de vérité visuelle. Ne pas dévier sans validation explicite Thomas (cf. mémoire `feedback_mockups_valides.md` à respecter).
7. **Étapes franches** : 1 chantier = N étapes numérotées, 1 livrable testable par étape, validation Thomas avant d'enchaîner. Pas de mélange en parallèle.
8. **Philosophie « resurfaçage »** (règle #9) + **principe LEGO** (règle #10) : avant tout chantier, **inventorier les briques existantes** et **reconnecter / extraire en composants partagés** plutôt que reconstruire.
9. **NE PAS proposer de refacto** « par principe » sur du code qui marche (cf. retrait du chantier #9 NewAssessmentPage refacto, dump #7 du brainstorm).
10. **Mobile-first absolu** : touch targets ≥ 44px, font ≥ 16px (anti-zoom iOS), test sur 375×667.

---

## 🎯 Première action attendue de toi

Une fois les 3 fichiers ci-dessus lus :

1. **Confirme-moi en 5 lignes max** ce que tu as compris du contexte (chantiers livrés, prochaine action, règle clé que tu retiens).
2. **Attends ma directive** — je vais te dire quel chantier on lance en premier (probablement la refonte pages publiques V2 ou directement le Sprint 1 du chantier #11).
3. **NE LANCE AUCUN CODE** tant que je n'ai pas validé.

Si je te demande d'enchaîner sans confirmation, c'est OK — mais tu dois quand même avoir lu les 3 fichiers d'abord.

---

**Fin du prompt.**
