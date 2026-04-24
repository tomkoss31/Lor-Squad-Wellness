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
