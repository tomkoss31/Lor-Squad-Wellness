# Roadmap chantiers hors-Academy

Document de scoping pour les 5 chantiers validés par Thomas le 2026-04-29.
Ordre de priorité = ordre des sections ci-dessous (du plus simple/impactant
au plus complexe).

---

## 🎯 Synthèse — quel ordre attaquer

| # | Chantier | Impact | Effort | Reco ordre |
|---|---|---|---|---|
| C | Refonte page /clients (filtres + actions groupées) | Productivité ×3 | 2-3j | **1er** — gain immédiat |
| D | Reporting / Analytics admin | Pilotage business | 2j | **2e** — data déjà en base |
| E | Templates messages WhatsApp | Vélocité coach | 1.5j | **3e** — réutilise IA |
| B | Assistant IA intégré | Différenciation | 3j | **4e** — coût API à valider |
| A | Onboarding CLIENT (PWA) | Fidélisation | 2-3j | **5e** — moins urgent que coach |

**Total** : ~11-12 jours dev. Étalable sur 2 semaines en gardant la prod stable.

---

## 1. Chantier C — Refonte page /clients

### Problème actuel
La page `/clients` (`src/pages/ClientsPage.tsx`) est une grosse liste
plate. Quand tu as 50+ clients, c'est dur de filtrer (qui est en pause,
qui a fait 2 bilans, qui n'a plus eu de contact depuis 30j, etc.).

### Solution proposée

**1.1 Filtres rapides en haut de page**
- Bouton chips multi-select : `À relancer` / `Au cap` / `Inactifs >30j` /
  `Sans RDV planifié` / `Bilan incomplet` / `VIP (≥3 bilans)` /
  `Nouveaux (≤14j)` / `Anniversaire ce mois`
- Chaque chip recalcule un compteur ("À relancer · 12")
- État sauvegardé dans `localStorage` pour retrouver le filtre actif au refresh

**1.2 Vue Kanban (toggle list ↔ kanban)**
- Colonnes : `À contacter` / `RDV programmé` / `En suivi actif` /
  `Au cap (programme stable)` / `En pause`
- Drag-and-drop entre colonnes pour changer le `lifecycle_status`
- Limite 10 cards par colonne avec "+X autres" en bas

**1.3 Actions groupées**
- Checkbox sur chaque ligne → bouton "Actions sur N clients sélectionnés"
- Actions : envoyer message WhatsApp groupé (1 message commun, ouvre
  N onglets `wa.me/`), planifier RDV groupé (modal date/heure → applique
  à tous), exporter CSV des sélectionnés, marquer en pause groupé.

### Fichiers impactés
- `src/pages/ClientsPage.tsx` — réécriture significative
- `src/components/clients/ClientsFilterBar.tsx` (nouveau)
- `src/components/clients/ClientsKanban.tsx` (nouveau)
- `src/components/clients/BulkActionsBar.tsx` (nouveau)
- `src/hooks/useClientFilters.ts` (nouveau)

### Risques / dépendances
- Doit cohabiter avec le toggle `useGlobalView` (vue admin / vue distri)
- Drag-and-drop : utiliser `@dnd-kit/core` (déjà ?? à vérifier)
- Pas de migration SQL nécessaire — tout est calculé front depuis les
  données déjà chargées dans `AppContext`

### Critère de done
- Filtres marchent et persistent au refresh
- Toggle list/kanban switch sans perte de filtres
- Actions groupées : 1 test e2e qui sélectionne 3 clients, ouvre
  3 onglets WhatsApp simultanément

---

## 2. Chantier D — Reporting / Analytics admin

### Problème actuel
Toi et Mel pilotez à l'instinct. Aucune vue chiffrée des tendances,
conversions, top produits, performance équipe.

### Solution proposée

**2.1 Page `/analytics` (admin only)**

Sections :
- **KPI principaux (4 cards)** : nb bilans ce mois / conversion bilan→client /
  PV équipe vs target / clients actifs vs M-1
- **Funnel conversion** : bilans → clients (inscription) → actifs
  (≥30j) → renouvellement. Pourcentages à chaque étape.
- **Top produits** : top 5 produits vendus ce mois en quantité + en PV
- **Top distri** : top 3 distri par bilans / par PV ce mois
- **Tendance 12 mois** : graphe ligne nb bilans/mois sur 12 mois
- **Alertes** : "3 distri sans bilan depuis 14j", "5 clients en pause
  depuis ≥60j sans relance", etc.

**2.2 Implémentation**

- Nouvelle RPC `get_admin_analytics()` qui agrège tout en 1 appel
  (économise les round-trips)
- Page `src/pages/AnalyticsPage.tsx` avec route `/analytics`
- Liens depuis l'onglet Équipe vers /analytics
- Charts : `recharts` (à ajouter en dep) pour la courbe + barres

### Fichiers
- `supabase/migrations/2026XXXX_admin_analytics_rpc.sql`
- `src/pages/AnalyticsPage.tsx` (nouveau)
- `src/hooks/useAdminAnalytics.ts` (nouveau)
- `src/components/analytics/*` (4-5 sub-components)
- `src/App.tsx` — route `/analytics`
- `package.json` — ajout `recharts`

### Critère de done
- Page charge en <1.5s
- Les 4 KPI matchent les chiffres calculés à la main sur 1 mois récent
- Refresh manuel + auto toutes les 5 min via `useEffect` setInterval

---

## 3. Chantier E — Templates messages WhatsApp avec IA

### Problème actuel
Quand le coach veut envoyer un message à un client, il rédige tout à
la main. Répétitif et chronophage.

### Solution proposée

**3.1 Bouton "💬 IA suggère un message"**

Sur `ClientDetailPage`, dans la section actions, ajouter un bouton qui :
- Lit le contexte client (nom, prochain RDV, dernier bilan, perte poids,
  produits actifs, dernière interaction)
- Appelle Claude API avec un system prompt "tu es coach Lor'Squad,
  ton bienveillant, max 200 caractères"
- Propose 3 messages alternatifs (différents tons : motivationnel /
  questionnant / informatif)
- Le coach clique celui qui colle → ouvre WhatsApp prérempli

**3.2 Templates "manuels" en complément**

Scénarios pré-câblés sans IA (réponse instantanée, 0 coût API) :
- Confirmation RDV demain
- Rappel produit à commander
- Anniversaire client
- Félicitation perte poids
- Relance client inactif >14j

### Fichiers
- `src/components/client-detail/AiMessageSuggester.tsx` (nouveau)
- `src/lib/messageTemplates.ts` (nouveau — les 5 templates manuels)
- `supabase/functions/suggest-coach-message/index.ts` (nouvelle edge function)
- Page settings : champ pour saisir clé API Anthropic (par admin)

### Risques / dépendances
- Coût API Claude : ~0.001€ par suggestion (avec Haiku) → max 100/mois
  pour 10€. Très raisonnable.
- Rate limit : ne pas spammer l'API → debounce 5s côté front
- Stockage clé API : pas dans le client. Edge function lit
  `Deno.env.get("ANTHROPIC_API_KEY")` configurée via Supabase secrets.

### Critère de done
- Bouton "IA suggère" génère 3 messages en <3s
- Les 5 templates manuels marchent en <100ms
- Clic sur un message ouvre WhatsApp avec le bon numéro et message prérempli

---

## 4. Chantier B — Assistant IA intégré

### Problème actuel
Les distri débutants posent les mêmes questions à Thomas/Mel via WhatsApp
("comment je gère un client qui veut arrêter ?", "quoi répondre à un
client qui dit que c'est trop cher ?"). Bouffe du temps coach.

### Solution proposée

**4.1 Bouton flottant "🤖 Lor'Squad IA"**

Présent en bas-droite de toutes les pages coach. Click ouvre un modal
chat avec :
- Historique conversation (sauvegardé Supabase, 1 thread par user)
- Input zone, envoi par Enter
- Streaming response (mots qui apparaissent au fur à mesure)

**4.2 System prompt enrichi avec contexte**

Le system prompt inclut :
- "Tu es l'assistant Lor'Squad, formé sur les méthodes Herbalife et le ton bienveillant"
- "Les distri qui te parlent sont les coachs de Thomas Houbert"
- "Tu peux référencer les sections Academy : section 1 = welcome, section 2 = first-bilan, etc."
- Si l'user est sur une page client → injecte un résumé du client courant
- Si l'user est sur l'agenda → injecte les RDV de la journée

**4.3 Cas d'usage cibles**

- "J'ai un client qui doute, comment je gère ?" → réponse coaching
- "Quel produit pour quelqu'un qui veut prendre du muscle ?" → réponse produit
- "Comment je gère un follow-up à J+7 ?" → réponse process

### Fichiers
- `src/features/ai-assistant/components/AssistantFloatingButton.tsx`
- `src/features/ai-assistant/components/AssistantChatModal.tsx`
- `src/features/ai-assistant/hooks/useAssistantThread.ts`
- `supabase/functions/ai-assistant/index.ts` (proxy vers Anthropic API
  avec streaming)
- Migration `2026XXXX_ai_assistant_threads.sql` (table threads + messages)

### Risques / dépendances
- Coût API : streaming Claude Sonnet ~0.01€ par échange → 100€/mois si
  10 distri échangent 30x/jour. À budgéter.
- Possibilité de switcher vers Haiku (×10 moins cher) pour les questions
  simples. Decision à faire après tests.
- Rate limit par user (max 50 messages/jour) pour éviter les abus.

### Critère de done
- Bouton flottant cliquable depuis toutes les pages
- Réponse en streaming en <2s pour les 3 premiers tokens
- Contexte client injecté correctement quand on est sur ClientDetailPage
- Historique persisté et restauré au prochain login

---

## 5. Chantier A — Onboarding CLIENT (PWA)

### Problème actuel
Le client reçoit un lien vers la PWA et débarque sans guide. Il ne sait
pas où regarder son évolution, comment lire un bilan, comment parler
au coach.

### Solution proposée

**5.1 Mini-tour 4 étapes au premier lancement**

Au premier mount de `ClientAppPage` (détecté via `client_app_accounts.first_seen_at`
null), un overlay de bienvenue propose :

- Étape 1 : "Bonjour [Prénom] ! Voici ton espace personnel"
  + spotlight sur le header (nom + photo coach)
- Étape 2 : "Ton onglet Évolution → suis tes progrès dans le temps"
  + spotlight sur tab Évolution
- Étape 3 : "Tes Conseils perso adaptés à ton profil"
  + spotlight sur tab Conseils
- Étape 4 : "Ton coach est à un message de toi"
  + spotlight sur le bouton WhatsApp coach

Peut être skippé. Au skip, marquer `first_seen_at` quand même.

**5.2 Onboarding de complétion progressive**

À chaque visite, si une donnée importante manque (ex: avatar pas uploadé,
pas de profil photo client), afficher un bandeau gold discret avec CTA
"Complète ton profil pour une meilleure expérience". Ferme par X.

### Fichiers
- `src/components/client-app/ClientWelcomeTour.tsx` (nouveau)
- `src/components/client-app/ClientCompletionBanner.tsx` (nouveau)
- `src/hooks/useClientOnboarding.ts` (nouveau — gère les flags)
- Migration `2026XXXX_client_app_onboarding.sql` (ajout colonnes
  `first_seen_at`, `tour_completed_at`, `tour_skipped_at` sur
  `client_app_accounts`)

### Risques / dépendances
- L'app client tourne sans React Router (page unique avec tabs internes)
  → le tour doit utiliser le SpotlightOverlay existant adapté
- Mobile-first : tester sur iOS Safari + Android Chrome avant de pusher
- Le flag `first_seen_at` doit être set côté serveur (edge function
  `client-app-data` étendue) pour éviter les double-affichages si le
  client clear son localStorage

### Critère de done
- Premier lancement : tour s'affiche, 4 étapes, skipable
- Lancements suivants : tour ne re-déclenche plus
- Bandeau de complétion s'affiche si avatar manquant, disparait après upload
- Test mobile iOS + Android validés

---

## 📅 Planning recommandé sur 2 semaines

### Semaine 1
- **J1-J3** : Chantier C (clients filtres + kanban + actions groupées)
- **J4-J5** : Chantier D (analytics admin)

### Semaine 2
- **J6-J7** : Chantier E (templates messages + IA suggérer)
- **J8-J10** : Chantier B (assistant IA intégré)

### Semaine 3 (optionnelle)
- **J11-J13** : Chantier A (onboarding client PWA)

---

## ⚠️ Conditions transverses à toutes les semaines

1. **Toujours créer une feat/X depuis dev/thomas-test**, jamais depuis prod.
2. **Tests E2E avant chaque merge prod** (la checklist du 2026-04-29 reste valable).
3. **Backup DB Supabase avant toute migration** (Dashboard → Database → Backups).
4. **CLAUDE.md mis à jour à la fin de chaque chantier** avec les notes
   d'archi importantes (pour la mémoire long-terme).
5. **Pas de big-bang merge** : chaque chantier mergé indépendamment, pour
   pouvoir rollback ciblé si un truc pète.
