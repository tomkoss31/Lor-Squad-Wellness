# Lor'Squad Wellness — Notes d'architecture

Ce fichier contient les règles et patterns clés à respecter pour ne pas
reproduire les régressions passées. Relire avant tout gros chantier.

---

## Architecture data app client (2026-04-26)

### Principe

L'app client (`ClientAppPage` + `ClientHomeTab` + `ClientProductsTab`) ne
fait **JAMAIS** de SELECT direct sur Supabase pour les tables sensibles
(`clients`, `follow_ups`, `pv_client_products`). Elle passe par l'Edge
Function **`client-app-data`** qui :

1. Valide le token client contre `client_app_accounts.token` (uuid unique)
2. Fait les SELECT en `service_role` → bypass RLS propre et auditable
3. Renvoie un payload normalisé (ISO 8601 pour les dates)

### Flow

```
[ Navigateur client ]
    ↓ GET /functions/v1/client-app-data?token=<uuid>
    ↓ Authorization: Bearer <anon_key>
[ Edge Function ]
    ↓ SELECT client_id FROM client_app_accounts WHERE token = ?
    ↓ parallel SELECT:
    ↓   - clients (current_program, notes)
    ↓   - follow_ups (due_date, status, type)
    ↓   - pv_client_products (active=true)
    ↓ JSON response, Cache-Control: 30s
[ Hook useClientLiveData ]
    ↓ fetch initial au mount
    ↓ refetch on window focus (debounce 5s anti-spam Safari ↔ PWA)
[ ClientAppPage merge ]
    ↓ liveData > snapshot (priorité live sur figé)
    ↓ setData avec overrides program_title + next_follow_up
[ Components ]
    ↓ ClientHomeTab (data.program_title, data.next_follow_up)
    ↓ ClientProductsTab (liveProducts prop)
```

### Fallback snapshot

Si l'edge function plante ou timeout, le front fallback silencieusement
sur les snapshots `client_app_accounts.*` (program_title, next_follow_up).
L'expérience reste fluide même en cas de panne réseau.

Pour `pv_client_products`, le fallback affiche un empty state (pas de
snapshot de produits disponible dans `client_app_accounts`).

### Règle RLS (leçon du 25/04/2026)

❌ **NE JAMAIS créer de policy RLS permissive** sur `clients`,
`follow_ups`, `pv_client_products` pour permettre au client app de lire
ses données directement. Raison : `client_app_accounts.client_id` est
`text` alors que `clients.id` est `uuid`. Un cast `::uuid` dans une
policy permissive plante à l'évaluation si une seule row de
`client_app_accounts` contient un `client_id` non-UUID valide → **toute
la table clients devient illisible**, même pour les coachs admin.

Toute évolution data côté client app passe par l'edge function.

### Comment ajouter une nouvelle donnée visible par le client

1. Ajouter le SELECT dans `supabase/functions/client-app-data/index.ts`
2. Étendre le type `ClientLiveData` dans `src/hooks/useClientLiveData.ts`
3. Lire la nouvelle donnée dans le composant qui en a besoin (via
   `liveData.*` ou via le merge si on veut aussi un fallback snapshot)
4. Ajouter un fallback snapshot si la donnée est critique (sinon empty
   state acceptable)
5. **NE JAMAIS créer de SELECT direct** dans ClientAppPage /
   ClientHomeTab / ClientProductsTab

### Déploiement

```bash
supabase functions deploy client-app-data --no-verify-jwt
```

`--no-verify-jwt` parce que le client app n'a pas de JWT Supabase
(auto-login custom via token UUID). L'auth se fait DANS la function
par le lookup `client_app_accounts.token`.

---

## Règles RLS — cast cross-type

**Jamais `::uuid`** dans une policy permissive. Si besoin de comparer
`client_app_accounts.client_id` (text) avec `clients.id` (uuid) :

```sql
-- ✅ OK : cast sécurisé
WHERE clients.id::text = caa.client_id

-- ❌ DANGER : cast qui peut throw sur une row foireuse
WHERE caa.client_id::uuid = clients.id
```

Raison : Postgres évalue TOUS les policies permissifs en OR. Si UNE
seule ligne de `client_app_accounts` contient un `client_id` pas
UUID-valide, le cast plante et le SELECT entier remonte l'erreur.

---

## Garde-fou front — fetch silent fail

Le hook `lastFetchError` dans `AppContext` (côté coach, pas client) est
un garde-fou installé le 25/04/2026 après la frayeur RLS. Si un fetch
principal plante silencieusement, un bandeau rouge apparaît en haut de
l'app coach avec le message Supabase exact. **NE PAS retirer.**

---

## Branches & déploiement

- `main` : backup upstream (pas touché par moi)
- `claude/focused-pike` : branche de déploiement Vercel (production)
- `feat/*` : chantiers en cours, mergés vers `claude/focused-pike`

Vercel auto-deploy sur push vers `claude/focused-pike`.

Supabase : projet unique lié via `supabase link`, migrations poussées
avec `supabase db push --linked --include-all`, Edge Functions déployées
avec `supabase functions deploy <name>`.

---

## Edge Functions actives (15 au 2026-04-26)

| Function | Déclenchement | Rôle |
|---|---|---|
| `client-app-data` | fetch front (app client) | Migration RLS → service_role |
| `create-public-share-token` | fetch front (coach) | Gen token /partage |
| `resolve-public-share` | fetch front (anon) | Résolution token anonymisé |
| `generate-auto-login-token` | fetch front (coach) | Lien magique app client |
| `consume-auto-login-token` | fetch front (app client) | Auto-login PWA |
| `generate-distributor-invite-token` | fetch front (coach) | Invite distri |
| `consume-distributor-invite-token` | fetch front (onboarding distri) | Signup distri |
| `validate-distributor-invite-token` | fetch front (onboarding distri) | Check validité |
| `validate-invitation-token` | fetch front (onboarding client) | Check validité |
| `consume-invitation-token` | fetch front (onboarding client) | Signup client |
| `submit-prospect-lead` | fetch front (form Welcome) | Création lead anon |
| `send-push` | fetch front + Edge interne | Envoi Web Push |
| `morning-suivis-digest` | cron 0 7 * * * | Digest matin |
| `rdv-imminent-notifier` | cron */5 * * * * | Notif RDV imminent |
| `new-message-notifier` | trigger Postgres | Notif nouveau message |

Toute nouvelle edge function = ajouter ici.

---

## Chantier Prise de masse (2026-04-24)

Logique "prise de masse / sport" de bout en bout dans le bilan.

### Étapes de bilan dynamiques
`src/pages/NewAssessmentPage.tsx` : `ALL_STEPS: StepDef[]` avec
`visible(form)` par étape. 2 étapes sport-only : `sport-profile` (parle-moi
de ton sport) et `current-intake` (tes apports actuels). Masquées si
`form.objective !== 'sport'`. Chaque JSX render bloc est adressé par
`currentStepId` (type `StepId`, jamais par index).

### Types et modèle
`src/types/domain.ts` : widening `Objective` avec 6 sous-objectifs sport
(mass-gain / strength / cutting / endurance / fitness / competition).
Nouveaux types : `SportFrequency`, `SportType`, `SportSubObjective`,
`IntakeMoment`, `IntakeValue`, `CurrentIntake`, `SportProfile`. Champs
optionnels `sportProfile` et `currentIntake` sur `AssessmentRecord`.

### Calculs
`src/lib/calculations.ts` :
- `computeProteinTargetSport(weightKg, subObjective)` → {min, max, target}
- `computeWaterTargetSport(weightKg, frequency)` → mL/jour clampé 2000-5000
- `estimateCurrentProteinIntake(currentIntake)` → g/jour

### Recommandation de boosters
`src/lib/assessmentRecommendations.ts::recommendBoosters(profile, age)`.
6 règles métier déterministes (collations, liftoff, cr7, hydrate,
créatine, collagène). Marqués d'une étoile + fond teal dans le step
"Programme proposé" quand objective === 'sport'.

### Alertes sport (Apple Health-style)
`src/components/assessment/SportAlertsDialog.tsx` :
`detectSportAlerts({ profile, intake, weightKg, ... })` → 6 alertes
(hydration-low, protein-low, sleep-low, muscle-low, no-snack,
frequency-mismatch). Popup bloque `handleSaveAssessment` tant que non
acquittée (acknowledged).

### Résumé sport sur fiche client
`src/components/client-detail/SportSummarySection.tsx` inséré dans
l'onglet Actions (tab 5). 3 cards : Besoins (4 stats), Plan journée
(toggle sport/repos), Programme + boosters + lien WhatsApp.

### Migrations Supabase
- `20260424120000_sport_fields.sql` : élargit CHECK `objective` sur
  `clients` + `assessments`, ajoute colonnes `sport_frequency`,
  `sport_types`, `sport_sub_objective`, `current_intake`.
- `20260424130000_seed_sport_products.sql` : seed 8 produits sport/
  accessoire dans `pv_products`.

## Chantier Conseils app client (2026-04-24)

Refonte de l'onglet « Coaching » → « Conseils » + enrichissement de
l'onglet Évolution + section « Recommandés pour ta progression » dans
l'onglet Produits.

### Onglet Accueil (ClientHomeTab)
- Suppression du HERO interne : la salutation est portée par le bandeau
  haut de `ClientAppPage` (avatar + nom + meta programme). La carte RDV
  gold suit directement l'en-tête.

### Onglet Évolution
- Nouveau composant `EnrichedAssessmentHistory` (`src/components/client-app/`)
  qui affiche :
  - Point de départ (oldest assessment) distinct visuellement (3px gold
    + badge 📍 + row dédiée).
  - Jusqu'à 5 derniers bilans en ordre descendant.
  - Colonne « Évolution » calculée vs Départ, couleur selon l'objectif
    (weight-loss / sport mass-gain / sport cutting / sport default).
  - Responsive : cards stackées <480 px, table ≥480 px.
  - S'il n'y a qu'un seul bilan → Départ seul, pas de « 5 derniers ».

### Onglet Produits — section « Recommandés non pris »
- Nouvelle section dans `ClientProductsTab` sous « Mon programme actuel ».
- Titre : « 💡 Recommandés pour ta progression ».
- Source prioritaire : `liveData.recommendations_not_taken` (server-side).
- Fallback client-side : `recommendedProducts` moins `currentProducts`
  (match productId/ref ET nom normalisé).
- Card : bg coral 8 %, border 0.5px coral 40 %, radius 12. Titre Syne
  15 bold, prix gold, reason DM Sans 13 teal, CTA WhatsApp avec message
  prérempli (utilise `coach_whatsapp`).

### Onglet Conseils (nouveau)
Fichier : `src/components/client-app/ClientConseilsTab.tsx` + `.css`.
Propulsé par `liveData` (edge function étendue).

4 sections :
1. **Tes points d'attention** — cards issues de `sport_alerts`
   (6 règles recalculées server-side). Placeholder neutre si vide ou
   hors-sport.
2. **Ton assiette idéale** — SVG circulaire à 3 secteurs + légende
   détaillée. Répartition :
   - sport → 33 / 33 / 33 (Protéines / Glucides complets / Légumes)
   - weight-loss → 25 / 25 / 50 (plus de légumes)
3. **Ta routine quotidienne** — toggle « Jour sport / Jour repos » pour
   les sportifs (7 items sport, 5 items repos). 4 items pour
   weight-loss. Chaque item : emoji + heure gold + titre + sub-label.
4. **Tes conseils perso du coach** — quote-style card ; contenu issu de
   `liveData.coach_advice` (champ `assessments.coach_notes_initial`).
   Footer « — Thomas · [date du dernier bilan] ». Placeholder neutre si
   vide.

### Edge function `supabase/functions/client-app-data/index.ts`
Clés ajoutées au payload JSON (sans retirer l'existant) :
- `assessment_history: Assessment[]` (limit 20, ordre asc par date).
- `recommendations_not_taken: { productId, name, price?, reason? }[]` —
  diff server-side entre `assessments.questionnaire.recommendations`
  (latest) et `pv_client_products` actifs.
- `sport_alerts: { id, icon, title, detail, advice }[]` — recompute
  inline des 6 règles (hydration-low / protein-low / sleep-low /
  muscle-low / no-snack / frequency-mismatch) à partir de `sport_profile`,
  `current_intake` et `body_scan`. Réécriture en Deno car impossible
  d'importer `detectSportAlerts` (pipeline front React).
- `sport_profile: { frequency, types, subObjective, otherTypeLabel? }`
  — depuis les colonnes `sport_*` de l'assessment le plus récent.
- `current_intake: CurrentIntake | null` — depuis l'assessment le plus récent.
- `coach_advice: string` — `assessments.coach_notes_initial` (notes
  figées à la validation du bilan, pas le draft auto-save, pour éviter
  de remonter un brouillon au client).
- `client.objective` ajouté au sous-objet `client` pour les règles de
  coloration Évolution / assiette.

## Étape Programme du bilan — Boosters cliquables + Quantités (D-urgent, 2026-04-24)

### Composant `SelectableProductCard`
Source : `src/components/assessment/SelectableProductCard.tsx`. Unifié
pour les 3 rendus produit de l'étape Programme (`NewAssessmentPage.tsx`) :
- besoins détectés (`NeedProductGroup`),
- upsells optionnels,
- boosters sport (désormais cliquables, plus seulement décoratifs).

Props clés :
- `selected` + `onToggle` — pattern « Retenu / Retenir » identique à
  l'ancien `SuggestedProductCard` inline (retiré).
- `highlight?: { reason?: string }` — ⭐ + bordure `var(--ls-teal)` +
  fond `color-mix(in srgb, var(--ls-teal) 8%, var(--ls-surface2))`.
  Visuel uniquement, le toggle reste manuel (pas d'auto-ajout au ticket).
- `quantity` + `onQuantityChange` — active le stepper (cf. ci-dessous)
  quand le produit est `selected`.

### Composant `QuantityStepper`
Source : `src/components/assessment/QuantityStepper.tsx`. Stepper
− / [value] / + minimaliste, bornes par défaut 1-10, touch target
≥ 44 × 44, a11y complète (`aria-label`, `role="spinbutton"`,
`aria-valuenow/min/max`). Tokens `var(--ls-*)` uniquement, Syne pour la
valeur, radius 10.

### Champ parallèle `selectedProductQuantities`
Ajouté à `AssessmentQuestionnaire` (`src/types/domain.ts`) comme
`QuantityMap = Record<string, number>` optionnel. Pattern **non-breaking** :
- `selectedProductIds` reste la source de vérité de la SÉLECTION,
- `selectedProductQuantities[id]` porte la quantité, défaut 1
  (`getQty(id) = map[id] ?? 1`).
- `setQty` borne 1-10, round entier.
- Persisté en jsonb dans `assessments.questionnaire` (pas de migration).
- Les 9 consumers de `selectedProductIds` restent inchangés.

### Ticket du jour — `ProgrammeTicket`
`TicketAddOn` gagne un champ `quantity: number`. Les totaux sont
`Σ price * quantity` et `Σ pv * quantity`. La ligne d'ajout affiche
`Nom × N` + le prix total `(price × quantity).toFixed(2)€` quand
`quantity > 1`, sinon le nom seul.

### Boosters sport — PV = 0
`BOOSTERS` (dans `src/data/programs.ts`) n'a pas encore de champ `pv` —
on force `pv: 0` côté mapping ticket. À enrichir si/quand le référentiel
gagne un vrai PV booster.

### Hydratation flow édition (out of scope)
Le flow d'édition (`EditInitialAssessmentPage`) et le flow suivi
(`NewFollowUpPage`) ne relisent pas encore `selectedProductQuantities`
depuis un bilan existant. Hydratation reportée au prompt E.
