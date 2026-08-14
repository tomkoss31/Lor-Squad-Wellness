# Pourquoi l'app met un temps fou à démarrer — mesures du 11/08/2026

> Tout ce qui suit est **mesuré**, sur la prod, avec une session réelle.
> Aucune estimation. Les commandes sont données pour pouvoir refaire l'audit.

---

## Le chiffre

**Ouverture du Co-pilote : 47 requêtes REST, page prête en 14 secondes.**

Le détail explique tout :

| Départ | Requêtes | Durée de chacune |
|---|---|---|
| ~900 – 1 260 ms | 7 (le chargement central) | 0,2 → 3,5 s |
| **~6 990 – 7 060 ms** | **26, toutes en même temps** | **8 → 9,5 s** |
| ~11 900 ms | 1 | 4,1 s |
| ~15 500 – 16 600 ms | 6 | 0,3 → 0,8 s |

**Les requêtes ne sont pas lentes. Elles s'étranglent mutuellement.**

Preuve : au repos, sur la même base,

```sql
explain (analyze) select public.get_today_celebrations();
-- Execution Time: 28.482 ms     ← contre 1 038 ms de moyenne sur 13 jours
```

```sql
-- la grosse requête « clients + bilans »
-- Execution Time: 167.964 ms    ← contre 984 ms de moyenne
-- Plan correct : Bitmap Index Scan on idx_assessments_client_id,
--                tout en `shared hit` (aucune lecture disque)
```

Facteur **6 à 37** entre le repos et la moyenne réelle. Le SQL est bon,
les index sont là. Ce qui manque, c'est de l'air.

---

## Ce qui a été corrigé le 11/08 (commit `perf(démarrage)`)

Uniquement des **doublons** et du **code mort** — rien qui change un
comportement.

### 1. Deux requêtes vers des tables qui n'existent plus

```sql
select to_regclass('public.activity_logs');            -- null
select to_regclass('public.follow_up_protocol_logs');  -- null
```

L'app les interrogeait **à chaque ouverture**. PostgREST répondait « table
inconnue », un `catch` renvoyait `[]`, et personne ne voyait rien.

- `activityLogs` : lu **nulle part** ailleurs dans le code.
- `followUpProtocolLogs` : alimente `FollowUpsDueWidget` et
  `FollowUpProtocolCard`, qui recevaient **déjà** `[]`.

Effet de bord probable : chaque requête sur une table inconnue peut pousser
PostgREST à recharger son cache de schéma — ce qui explique les **513 appels à
`pg_timezone_names` à 868 ms de moyenne** vus dans `pg_stat_statements`.

### 2. `useAnnouncements` monté 3 fois → 6 requêtes pour la même liste

Cloche (`AnnouncementBell`) + popup (`AnnouncementSpotlight`) + page
Nouveautés. **6 appels → 2.**

### 3. `useCrmBadge` monté 2 fois → 8 COUNT au lieu de 4

Barre latérale (`AppLayout`) + nav du bas (`BottomNav`). Sur desktop la nav du
bas n'existe pas : **c'est un doublon mobile**, là où le réseau est le plus
fragile. **8 COUNT → 4.**

**La mécanique**, identique pour 2 et 3 : cache de 60 s au niveau du module,
requête en vol partagée (deux montages simultanés attendent la même promesse),
diffusion à tous les abonnés quand elle revient. **L'API des hooks ne change
pas** — aucun appelant à modifier, et un futur écran en profite sans rien faire.

---

## Mesuré après les correctifs (12/08, même page, même session)

| | Avant (11/08) | Après (12/08) |
|---|---|---|
| Requêtes REST au démarrage | **47** | **26** |
| Page prête | **14,1 s** | **11,5 s** |
| Pire requête | **9,5 s** | **6,7 s** |
| Dernière requête lancée | ~16,6 s | **5,0 s** |
| Médiane | — | 618 ms |

**La vague de 26 requêtes simultanées à la seconde 7 a disparu** : plus rien ne
part après 5 s. C'était l'objet du « chantier 4 » (étaler les départs) — il n'a
plus lieu d'être, le chantier sur le poids l'a réglé en amont.

⚠️ *Un point de mesure, pas une moyenne.* La machine est partagée et sa charge
varie ; refaire la mesure plusieurs fois avant d'en tirer une tendance.

### Ce qui reste visible : `users`, 8 appels

Dont **5 partis entre 4 660 et 4 686 ms** — même motif, en plus petit — et le
dernier (le profil du coach lui-même) qui met **6 secondes**.

Ils viennent de hooks distincts qui lisent chacun une colonne différente de la
MÊME ligne : `useStreak`, `useBbcRole`, `useStarterPlan`,
`useTeamStarterProgress`, `OnboardingReturnPill`…

**Remède connu, déjà éprouvé deux fois** (`useCrmBadge`, `useAnnouncements`) :
un cache partagé au niveau du module + requête en vol partagée. Ici, charger la
ligne complète une seule fois (la table `users` fait 42 Ko pour 22 lignes — une
ligne ≈ 2 Ko, le surcoût est nul) et laisser chaque hook y piocher.

**Pas fait le 12/08** : cela touche cinq hooks du chemin de démarrage. Le gain
restant (~4 requêtes sur 26) ne justifiait pas de le faire sans pouvoir ouvrir
chaque écran.

## Ce qui reste, par ordre de gain

### A. Le poids du chargement central — 2,17 Mo de JSON

```
clients + bilans imbriqués   1 527 Ko   70,4 %   (151 clients, 781 bilans)
pv_client_products             321 Ko   14,8 %   (546 lignes)
pv_transactions                189 Ko    8,7 %   (414 lignes)
follow_ups                      58 Ko    2,7 %
users                           42 Ko    2,0 %
prospects                       32 Ko    1,5 %
────────────────────────────────────────────
TOTAL                        2 169 Ko
```

Dans les 1 527 Ko de clients+bilans, **la colonne `questionnaire` pèse 586 Ko
à elle seule** — 35 % du poids total des bilans, la suivante fait 55 Ko.

**✅ FAIT le 12/08 — chemin critique : 1 527 Ko → 989 Ko (−35,2 %).**

`questionnaire` est lu par 5 pages (fiche client, nouveau suivi, édition de
bilan, panier, portefeuille). Deux façons de le sortir du démarrage :

- **à la demande** dans chaque page → chacune gère son attente, et une page
  oubliée affiche un bilan VIDE sans prévenir. Sur le cœur métier, un écran
  qui ment en silence est pire qu'un écran lent. **Écarté.**
- **en seconde passe** → l'app démarre sans les 586 Ko, puis les reçoit ~1 s
  plus tard et complète l'état par id de bilan. **Aucune des 5 pages n'est
  modifiée.** C'est ce qui a été retenu.

Effet secondaire recherché : les 26 widgets du Co-pilote attendent la fin du
chargement central pour se monter. Il finit plus tôt, donc ils partent plus
tôt — c'est là que se joue le gain ressenti, pas seulement dans les kilo-octets.

⚠️ Les colonnes des bilans sont désormais listées explicitement dans
`COLONNES_BILAN_SANS_QUESTIONNAIRE` (supabaseService). **Une nouvelle colonne
sur `assessments` doit y être ajoutée**, sinon elle ne sera pas chargée au
démarrage. Sens volontairement le plus sûr : on oublie de charger, on ne
casse pas.

### B. Les doublons restants

| Table | Appels au démarrage | D'où |
|---|---|---|
| `users` | **6 → 5** | `useStreak` lisait la même ligne DEUX fois (streak, puis `lifetime_login_count` juste avant l'écriture) — fusionné le 12/08, ce qui supprime aussi une course entre deux onglets. Restent : `supabaseService` ×4, `useBbcRole` ×3, `useStarterPlan`, `useTeamStarterProgress`, `OnboardingReturnPill`… — filtres différents, à traiter un par un |
| `online_bilans` | **4** | 2 du badge CRM (déjà mutualisées) + 2 ailleurs |
| `get_my_client_app_token` | **2** | appelée deux fois à la connexion |
| `consumption_orders`, `clubs`, `client_referrals`, `prospect_leads` | **2** chacune | |

### C. Le Realtime — 1 h 19 de calcul pour 3 messages

**Mesuré le 12/08**, sur la même fenêtre de 13,5 jours :

| | |
|---|---|
| Appels de la requête WAL | **704 166** — soit **36 par minute**, en continu |
| Temps CPU cumulé | **4 716 s = 1 h 19** |
| Part du temps total de la base | **36 %** |
| Messages réellement insérés | **3** |

Environ **26 minutes de CPU par message**. Le walrus de Supabase interroge le
WAL en permanence dès qu'un abonnement est ouvert — et il l'est en
permanence : `useRealtimeMessages` est monté dans `AppLayout`, donc pour
chaque coach connecté, toute la journée.

**Ce qu'il apporte réellement** : quand l'app est DÉJÀ OUVERTE, il ajoute le
message à l'état global (évite un rafraîchissement) et affiche un toast
« 💬 Nouveau message de X ».

**Ce qui existe déjà par ailleurs** : le trigger Postgres
`new-message-notifier` (migration `20260421082000`) envoie une **notification
push** à chaque message client. Le coach est donc **déjà prévenu**, app
ouverte ou fermée.

**Décision à prendre (Thomas)** — on paie 36 % de la base pour un toast que
la push double déjà. L'alternative coûte presque rien : rafraîchir la
messagerie au retour d'onglet, exactement ce que fait déjà `useCrmBadge`
(`visibilitychange` + débounce 60 s). On perdrait l'apparition
*instantanée* du message dans une app restée ouverte ; on garderait la push.

⚠️ Ce n'est pas une décision technique : ça change ce que vit un coach. Non
tranché seul.

### D. La machine

`pg_stat_statements` sur 13,5 jours, requête n°1 **à 35,9 % du temps total de
la base** : `SELECT wal->>… ` — le polling du WAL par Supabase Realtime.
686 178 appels, 4 600 s de CPU cumulées, pour **une seule table publiée**
(`client_messages`) et **un seul abonnement** dans le code
(`useRealtimeMessages`).

Et surtout : la base tourne sur une **t4g.nano — 0,5 Go de RAM**, CPU à
crédits. C'est la cause documentée du gel de 2 h 45 du 29/07 (cf. CLAUDE.md).
Postgres y réserve 224 Mo de `shared_buffers` + ~6 Mo par connexion : à ~30
connexions il ne reste rien, la machine bascule en swap, et **tout** ralentit
d'un facteur 10.

**Aucune optimisation de code ne remonte le plafond mémoire.** Le passage au
plan Micro (1 Go) est le seul levier — ~35 $/mois, facturé par organisation
(Shake Bar partage la même org, les deux projets passeraient en Micro).

---

## Refaire l'audit

**Côté base** — le vrai classement des requêtes (temps TOTAL, pas moyen) :

```sql
select round(total_exec_time::numeric) ms_total, calls,
       round(mean_exec_time::numeric,1) ms_moyen,
       left(regexp_replace(query,'\s+',' ','g'),120) requete
  from pg_stat_statements
 where query not ilike '%pg_stat_statements%'
 order by total_exec_time desc limit 15;

-- et TOUJOURS vérifier la fenêtre, sinon les chiffres ne veulent rien dire :
select stats_reset, now() - stats_reset from pg_stat_statements_info;
```

**Côté navigateur** — le seul qui dise ce que vit un coach. Ouvrir l'app
connecté, puis dans la console :

```js
performance.getEntriesByType('resource')
  .filter(r => r.name.includes('/rest/v1/'))
  .map(r => ({
    table: r.name.split('/rest/v1/')[1].split('?')[0],
    ms: Math.round(r.duration),
    debutMs: Math.round(r.startTime),
  }))
  .sort((a, b) => b.ms - a.ms);
```

**Le piège à éviter** : juger une requête sur son temps moyen. Une requête à
28 ms au repos affiche 1 038 ms de moyenne parce que la machine est saturée —
optimiser son SQL ne donnerait rien. Toujours croiser `explain (analyze)` à
froid avec la moyenne.

---

## Deux tables sans aucun lecteur (audit du 12/08)

`client_mood_log` et `client_xp_events` : **zéro référence**, ni dans `src/`,
ni dans `supabase/functions/`. RLS activé sans policy, donc inaccessibles
autrement qu'en `service_role` — et personne ne les appelle.

**Non supprimées** : effacer une table est irréversible, et le coût de les
laisser est nul (elles ne sont dans aucun chemin de démarrage). À trancher
avec Thomas, avec une sauvegarde préalable.
