# Sauvegardes Supabase

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
