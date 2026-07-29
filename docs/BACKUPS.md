# Sauvegardes Supabase

## ⚠️ Ce qui a changé le 2026-07-29 (après le gel de la base)

Un audit déclenché par l'incident a montré que la sauvegarde était **partielle
et silencieusement cassée** :

| | Avant | Après |
|---|---|---|
| Ensembles sauvegardés | 14 (liste écrite à la main) | **117** (découverte automatique) |
| Enregistrements | 2 718 | **7 909** |
| Comptes de connexion (`auth.users`) | ❌ absents | ✅ 70 |
| Inventaire du stockage | ❌ absent | ✅ 34 fichiers référencés |
| Pagination | ❌ aucune (troncature muette au-delà de la limite API) | ✅ par pages de 500 |
| Table en erreur | annoncée « ✅ OK » | **échec en code 1 + issue d'alerte** |

Manquaient notamment : `prospects` (RDV de l'agenda), `client_consents` (RGPD),
`bilan_orders` (paiements), `online_bilans` (leads), `coach_payment_settings`.
La liste citait `activity_logs`, **table supprimée depuis**, qui échouait à
chaque exécution derrière un récap « OK ».

**Règle à retenir : ne jamais réintroduire de liste de tables écrite à la main.**
Le script appelle `public.backup_table_list()`
(migration `20261206290000_backup_table_list.sql`) — toute table créée demain
est sauvegardée sans rien changer.

### Limites connues, assumées

- **Les fichiers du stockage ne sont pas téléchargés**, seulement inventoriés
  (chemin, taille, date). En cas de perte, on saurait ce qui manque, pas le
  restaurer. À traiter le jour où des fichiers deviennent critiques.
- **Le schéma n'est pas sauvegardé** — il vit dans `supabase/migrations/`.
  Une restauration complète = rejouer les migrations, puis `npm run restore`.
- **L'ordre de restauration n'est pas géré** : `restore` parcourt le manifeste
  sans tenir compte des clés étrangères, et fait un `upsert` sur `id`. Les
  tables à clé composite (ex. `shop_visit_daily`) échoueront. À reprendre le
  jour où une vraie restauration devient nécessaire.
- Les tables de journal sont volontairement exclues (`push_notifications_sent`,
  `client_rdv_reminders_sent`, `club_call_reminders_sent`) : volumineuses et
  sans valeur en restauration.

## Où sont les backups ?

Depuis le **2026-06-08**, les sauvegardes ne sont **plus committées dans git**
(elles avaient atteint ~109 MO / 1300+ fichiers et polluaient l'historique +
faisaient diverger les branches).

Elles sont désormais archivées en **artefact GitHub Actions** :

- Workflow : `.github/workflows/backup.yml` (cron quotidien 04:00 UTC).
- Script : `npm run backup` → `scripts/backup-supabase.ts` (dump dans `backups/`).
- Stockage : artefact `supabase-backup-<run_id>`, **rétention 90 jours**.
- Accès : onglet **Actions** du repo → run « Sauvegarde Supabase » → section
  *Artifacts* → télécharger le `.zip`.

Un récap est posté en **issue GitHub** chaque dimanche (succès + compte par table).

## Restaurer une sauvegarde

1. Télécharger l'artefact voulu depuis l'onglet Actions.
2. Décompresser son contenu dans le dossier `backups/` à la racine du projet.
3. Lancer :
   ```bash
   npm run restore
   ```
   (`scripts/restore-supabase.ts` lit `backups/` en local.)

## Pourquoi ce changement ?

Stocker des dumps de base de données dans git est un anti-pattern : le repo
grossit indéfiniment, chaque commit quotidien bruite l'historique, et les
branches (`main` / `claude/focused-pike` / `dev/thomas-test`) divergent de
centaines de commits alors que le **code est identique**. Les artefacts gardent
le filet de sécurité sans toucher au repo.

> Rétention 90 j seulement : si tu veux des sauvegardes long terme, l'étape
> suivante serait d'uploader le dump vers un bucket **Supabase Storage** (ou S3)
> depuis `scripts/backup-supabase.ts`. Pas encore fait.

## Anciennes sauvegardes (avant 2026-06-08)

Elles restent récupérables dans l'**historique git** (non réécrit) :
```bash
git log --all --oneline -- backups/      # retrouver un commit backup:
git show <commit>:backups/<date>/<table>.json
```
