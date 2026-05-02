# Tests manuels chantier `formation-pyramide`

> Procédures à exécuter dans **Supabase Studio → SQL Editor** pour valider
> que les phases A → F-UI fonctionnent bout-à-bout.

Date du chantier : 2026-04-30 → 2026-05-03 (Phases A à F-UI).
Tout sur `dev/thomas-test`. **0 push prod sur `claude/focused-pike`** tant
que le chantier n'est pas validé.

---

## ✅ Test 1 — Validation auto à 100% (Phase B + F-UI)

**But** : valider que le distri qui fait 5/5 QCM est auto-validated avec
confettis + thread automatique pour le sponsor.

### Procédure (côté front)

1. Connecte-toi avec un distri ayant un sponsor (ex : Mandy).
2. Va sur `/formation/parcours/demarrer/comprendre-opportunite`.
3. Clique « Faire le quiz ».
4. Réponds **correctement** aux 3 QCM :
   - Q1 : « 50 % » (index 2)
   - Q2 : « 1,50 € » (index 1)
   - Q3 : « 8-4-1 » (index 1)
5. Réponds 80+ caractères dans la free_text « Ton pourquoi ».
6. Clique « ✅ Soumettre le quiz ».

### Résultat attendu

- ✅ Confettis fullscreen (gold + teal + purple).
- ✅ Écran « 🎉 Module validé à 100% ! » avec CTA retour parcours.
- ✅ Toast « Quiz parfait — +60 XP. Bravo. ».

### Vérification DB

```sql
select status, validation_path, quiz_score, reviewed_by, reviewed_at
from public.formation_user_progress
where user_id = '<UUID_DU_DISTRI>'
  and module_id = 'M1.1';
```

→ doit retourner :
- `status` = `validated`
- `validation_path` = `auto`
- `quiz_score` = `100`
- `reviewed_by` = même UUID que `user_id` (auto = self-review)

```sql
select kind, content
from public.formation_review_threads
where progress_id = (
  select id from public.formation_user_progress
  where user_id = '<UUID>' and module_id = 'M1.1'
)
order by created_at;
```

→ doit retourner ~2 rows :
- 1 row `kind=answer`, content = « Quiz QCM validé à 100 % — module auto-validé 🎉 »
- 1 row `kind=answer`, content = la réponse free_text avec markdown bold.

---

## ✅ Test 2 — Soumission < 100% → file sponsor (Phase B + C)

**But** : valider que < 100% bascule en `pending_review_sponsor` et apparaît
dans la file de validation du sponsor.

### Procédure

1. Refais le test 1 mais réponds **mal** à 1 QCM (ex : Q1 réponse « 25 % »).
2. Submit.

### Résultat attendu

- Écran « 📬 Soumis pour validation » avec score 67%.
- Redirect vers `/formation/parcours/demarrer` après 1.5s.

### Vérification DB

```sql
select status, quiz_score, submitted_at
from public.formation_user_progress
where user_id = '<UUID_DU_DISTRI>' and module_id = 'M1.1';
```

→ `status` = `pending_review_sponsor`, `quiz_score` < 100, `submitted_at` ≈ now.

### Côté sponsor (Mandy → log in en Mandy)

1. Va sur `/messages` → onglet « 🎓 Formation lignée ».
2. La card « 🟡 [Distri] — Module M1.1 » doit apparaître.
3. Clique « Voir & valider » → modale s'ouvre avec historique.
4. Choisis « ✅ Valider » → toast success, la card disparaît.

### Vérification post-validation

```sql
select status, validation_path, reviewed_by, reviewed_at
from public.formation_user_progress
where user_id = '<UUID_DU_DISTRI>' and module_id = 'M1.1';
```

→ `status` = `validated`, `validation_path` = `sponsor`, `reviewed_by` = UUID Mandy.

---

## ✅ Test 3 — Edge function relay 48h (Phase E)

**But** : valider que le cron horaire escalade correctement les modules
en attente sponsor depuis > 48h.

### Procédure simulation

1. Insert un fake module pending depuis 50h (Studio SQL Editor) :

```sql
-- Recupere un user_id de distri qui a un sponsor (lignée descendante de
-- Thomas/Mél)
insert into public.formation_user_progress
  (user_id, module_id, status, quiz_score, submitted_at)
values
  (
    '<UUID_DISTRI_DE_LA_LIGNEE>',  -- ex: Lionel sous Mandy sous Thomas
    'M-test-relay',
    'pending_review_sponsor',
    75,
    now() - interval '50 hours'
  );
```

2. Lance manuellement l'edge function :

```sql
select net.http_post(
  url := current_setting('app.settings.supabase_url', true) || '/functions/v1/formation-relay-to-admin',
  headers := jsonb_build_object(
    'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
    'Content-Type', 'application/json'
  ),
  body := '{}'::jsonb,
  timeout_milliseconds := 60000
);
```

3. Attendre 5-10 sec puis vérifier :

```sql
select status, submitted_at
from public.formation_user_progress
where module_id = 'M-test-relay';
```

→ `status` doit être passé à `pending_review_admin`.

### Vérification UI admin

- Connecte-toi en Thomas → `/formation/admin`.
- La card admin_relay doit afficher le module M-test-relay.
- KPI « Admin relay » doit afficher au moins 1.

### Cleanup post-test

```sql
delete from public.formation_user_progress where module_id = 'M-test-relay';
```

---

## ✅ Test 4 — Re-soumission après rejet (Phase B + F-UI)

**But** : valider qu'un module rejeté peut être refait et que le feedback
sponsor est bien visible sur la page module.

### Procédure

1. Sponsor rejette M1.1 d'un distri via `/messages > Formation > Voir & valider > 🚫 Rejeter` avec feedback « Ton pourquoi est trop vague, repenche-toi ».
2. Distri reload `/formation/parcours/demarrer/comprendre-opportunite`.

### Résultat attendu

- ✅ Banner coral en haut de la page : « 🔄 Feedback [Sponsor] — refais le module ».
- ✅ Citation italic du feedback sponsor visible.
- ✅ Note « 💡 Tu peux refaire le module avec ce feedback. Les modules sont refaisables à l'infini. ».
- ✅ Section `<details>` historique cliquable, qui montre le thread sponsor↔distri.

### Re-soumission

1. Distri refait le quiz avec une free_text plus précise.
2. Submit.

### Vérification DB

```sql
select status, validation_path, quiz_score, feedback, reviewed_at
from public.formation_user_progress
where user_id = '<UUID>' and module_id = 'M1.1';
```

→ Si nouveau score 100% : `status=validated, validation_path=auto`. Sinon `pending_review_sponsor` à nouveau.

---

## ✅ Test 5 — XP formation comptabilisé (Phase F-polish)

**But** : valider que les modules validés ajoutent du XP au total user.

### Procédure

```sql
-- Avant validation
select total_xp, formation_xp, level
from public.get_user_xp('<UUID_DISTRI>');
```

Note la valeur initiale.

Valide 1 module en auto (test 1).

```sql
-- Apres validation
select total_xp, formation_xp, level
from public.get_user_xp('<UUID_DISTRI>');
```

→ `formation_xp` doit avoir augmenté de **+60** (10 module + 50 bonus auto).
→ `total_xp` doit avoir augmenté de la même valeur.
→ `level` peut avoir progressé selon le seuil.

---

## ✅ Test 6 — Verrouillage strict N2 (Phase F-polish 2026-05-03)

**But** : valider que le distri ne peut pas accéder à N2 tant que N1 n'est
pas 100% validé.

### Procédure

1. Connecte-toi en distri qui n'a validé aucun module N1.
2. Va sur `/formation`.

### Résultat attendu

- Card Niveau 1 (gold) : accessible, état « À démarrer ».
- Card Niveau 2 (teal) : **🔒 Verrouillé** + label « Termine N1 d'abord ».
- Card Niveau 3 (purple) : **🔒 Verrouillé** + label « Termine N2 d'abord ».

### Test post-validation

Valide les 5 modules N1 (M1.1 → M1.5). Reload `/formation`.

→ Card Niveau 2 doit passer en accessible.

---

## 🚀 Cron horaire en prod

Le cron `formation-relay-to-admin` tourne automatiquement toutes les heures
(`0 * * * *`). Pour vérifier :

```sql
select jobname, schedule, active
from cron.job
where jobname = 'formation-relay-to-admin';
```

→ doit retourner `active=true, schedule='0 * * * *'`.

Pour voir les dernières exécutions :

```sql
select jobname, status, return_message, start_time
from cron.job_run_details
where jobname = 'formation-relay-to-admin'
order by start_time desc
limit 10;
```
