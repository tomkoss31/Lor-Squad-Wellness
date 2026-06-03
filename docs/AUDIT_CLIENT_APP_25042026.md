# Audit App Client — 25/04/2026

## 1. Synthèse exécutive

**Cartographie** : 6 onglets fonctionnels (Accueil, Évolution, Produits, Conseils, Messages, Recommander). Accueil refondue 2026-04-24 avec RDV gold, mensurations, Telegram. Tous les onglets accèdent via `useClientLiveData` (edge function) + fallback snapshot figé.

**Bug clients vides hypothèse retenue** : **Hypothèse A — Snapshot figé** (probable). Les vrais clients sont invités via `consume-auto-login-token`, qui crée/utilise un `client_app_accounts` avec token UUID. Le fallback snapshot charge `client_recaps` → `client_evolution_reports` → `client_app_accounts`. Si l'edge function `client-app-data` plante silencieusement, le snapshot devient la source de vérité.

**Mensurations** : table `client_measurements` existe (migration 20260423110000), composant `ClientMeasurementsSection` actif dans Accueil. Calcul "Total CM perdu" fonctionnel.

**Menu RDV** : côté coach complet (Google Agenda, .ics, Modifier, WhatsApp). Côté client : existe déjà (textarea modifier + send).

**Chantier prioritaire** : Diagnostiquer le fallback snapshot — ajouter logs dans edge function.

---

## 2. Cartographie des 6 onglets

### 2.1 Accueil (home)
- **Composant** : `src/components/client-app/ClientHomeTab.tsx`
- **Sections** : RDV card gold, Départ (3 chiffres), Produits, Telegram, Mensurations, Actions, Footer
- **Sources** : snapshot + live edge function + measurements
- **État** : ✅ Fonctionnel, premium UI

### 2.2 Évolution (evolution)
- **Composant** : Inline `ClientAppPage.tsx:767`
- **Sections** : Chiffres clés grid, MiniLineChart SVG, Historique enrichi, Alertes sport
- **État** : ✅ Fonctionnel

### 2.3 Produits (products)
- **Composant** : `src/components/client-app/ClientProductsTab.tsx` (refonte 2026-04-25)
- **Sections** : Actifs, Recommandés non-pris, Catalogue
- **État** : ✅ Fonctionnel

### 2.4 Conseils (coaching)
- **Composant** : `src/components/client-app/ClientConseilsTab.tsx` (2026-04-24)
- **Sections** : Sport alerts, Assiette idéale, Routine, Mot du coach
- **État** : ✅ Fonctionnel, dépend edge function

### 2.5 Messages (messages)
- **Composant** : `src/components/client-app/ClientChatTab.tsx` (2026-04-22)
- **Sections** : Chat bubbles, input fixe, polling 15s
- **État** : ✅ Fonctionnel, pas WebSocket

### 2.6 Recommander (refer)
- **Composant** : Inline `ClientAppPage.tsx:925`
- **Sections** : Form Prénom + Contact
- **État** : ✅ Fonctionnel

---

## 3. Diagnostic "clients vides"

### Hypothèse A — Snapshot figé
**Probabilité** : PROBABLE

Root cause : App client charge snapshot (client_recaps → client_evolution_reports → client_app_accounts). Si edge function plante silencieusement, reste sur snapshot stale.

Fichiers :
- `src/hooks/useClientLiveData.ts:128` — console.warn uniquement
- `src/pages/ClientAppPage.tsx:209-224` — merge logic
- `src/pages/ClientAppPage.tsx:379-388` — snapshot fallback

Fix : ajouter logs edge function + bandeau UI

### Hypothèse B — Bilan weight=0/null filtré
**Probabilité** : IMPROBABLE

Code ne filtre pas sur weight=0/null.

### Hypothèse C — Token mismatch
**Probabilité** : À TESTER

3 sources token possibles. Si coach envoie token1 mais app cherche token2, snapshot vide.

**Conclusion** : A probable + C à valider.

---

## 4. État des mensurations

✅ Table : `client_measurements` (migration 20260423110000)
✅ Composant : `ClientMeasurementsSection.tsx` actif
✅ Silhouette interactive : `MeasurementsPanel.tsx` cliquable
✅ Calcul CM perdu : `calculateTotalCmLost()` existante
✅ Affichage motivation : badge motivationnel

État : Complet et fonctionnel.

---

## 5. Menu prestige RDV

### 5.1 Côté coach
`src/components/client-detail/ActionsRdvBlock.tsx:150-294`

4 actions :
1. Google Agenda → createGoogleCalendarLink()
2. .ics download → createIcsDataUri()
3. Modifier RDV → onClick parent
4. WhatsApp → buildWhatsAppHref()

État : ✅ Complet.

### 5.2 Côté client
`src/components/client-app/ClientHomeTab.tsx:234-396`

Actions :
- Google Agenda
- Maps itinéraire
- Modifier (textarea + send)
- .ics (download)

État : ✅ Quasi complet.

---

## 6. Sections accueil existantes (à conserver)

Toutes présentes :

✅ "Demander une recommandation" — modale
✅ "Laisser un avis Google" — lien (TODO Thomas: URL)
✅ "Partage ta transformation" — modale consent
✅ "Tu es plus fort que tes excuses" — MOTIVATION_QUOTES
✅ "Propulsé par Lor'Squad · La Base Verdun" — footer
✅ "Tes mensurations" — encart
✅ "Prochain RDV" — card gold
✅ "Ton point de départ" — 3 chiffres
✅ Telegram link — t.me/+ul1vgYs-uS0yNmFk

---

## 7. Bugs et incohérences identifiés

### Critique
1. Edge function plante silencieusement — Aucun UI warning
   Fichier : src/hooks/useClientLiveData.ts:128

2. Token mismatch possible — 3 sources sans validation
   Fichier : src/pages/ClientAppPage.tsx:142

### Important
1. GOOGLE_REVIEW_URL TODO — lien à remplacer
   Fichier : src/components/client-app/ClientHomeTab.tsx:859

2. Snapshot jamais rafraîchi côté client
   Fichier : src/pages/ClientAppPage.tsx:205

### Polish
1. Assessment validation loose
2. Measurement sexe fetch sans cache

---

## 8. Opportunités d'amélioration priorisées

Critique (2-3h) :
- Ajouter logs edge function + Sentry
- Bandeau erreur si edge down
- Token consistency audit

Important (4-6h) :
- Remplacer GOOGLE_REVIEW_URL
- WebSocket pour chat

Polish (3-4h) :
- Snapshot refresh button
- Dark mode test
- Accessibility audit

---

## 9. Plan de chantier recommandé

Phase 1 Diagnostic (2-3h) — Logs edge + Sentry + DB token audit
Phase 2 Fix (4-6h) — UI warning + token flow + e2e test
Phase 3 Polish (3-4h) — GOOGLE_REVIEW_URL + refresh + accessibility

Priorité 1 : Diagnostiquer edge function → ajouter logs immediately
