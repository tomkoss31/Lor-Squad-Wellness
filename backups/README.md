# 📦 Sauvegardes Lor'Squad Wellness

Ce dossier contient les sauvegardes automatiques de la base Supabase.
**Il est mis à jour chaque jour à 4h du matin** par GitHub Actions.

---

## 📂 Structure des fichiers

```
backups/
├── 2026-04-17/                        ← un dossier par jour
│   ├── manifest.json                  ← résumé : nombre d'enregistrements par table
│   ├── clients.json     + .csv         ← fiches clients
│   ├── assessments.json + .csv         ← TOUS les bilans et valeurs body scan
│   ├── follow_ups.json  + .csv         ← RDV et suivis
│   ├── client_recaps.json + .csv       ← récaps partagés aux clients
│   ├── client_evolution_reports...     ← rapports d'évolution
│   ├── client_messages...              ← messages reçus
│   ├── client_app_accounts...          ← accès app clients (PWA)
│   ├── client_referrals...             ← leads recommandés
│   ├── rdv_change_requests...          ← demandes modif RDV
│   ├── pv_transactions...              ← volumes PV
│   ├── pv_client_products...           ← produits suivis par client
│   ├── users...                        ← équipe distributeurs
│   └── push_subscriptions...           ← abonnements notifs
```

- **`.json`** → format technique, utilisé pour restaurer dans Supabase
- **`.csv`** → format Excel, ouvre avec double-clic pour lire/imprimer

---

## 🆘 CAS 1 — Je veux juste consulter un bilan d'un client

Pas besoin de restaurer quoi que ce soit.

1. Va dans le dossier `backups/YYYY-MM-DD/` le plus récent
2. Ouvre `assessments.csv` avec Excel ou Google Sheets
3. Filtre la colonne `client_id` ou cherche le nom du client

---

## 🆘 CAS 2 — Supabase a crashé, une table a été supprimée ou corrompue

### Étape 1 : Préparer l'environnement local

Sur ton ordinateur, ouvre un terminal dans le dossier du projet :

```bash
cd "C:/Users/tomko/Documents/Lor'Squad Wellness"
npm install
```

Crée un fichier `.env` (s'il n'existe pas déjà) avec :

```
VITE_SUPABASE_URL=https://<ton-projet>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<ta-clé-service-role-secrète>
```

> 🔑 La clé service_role se trouve dans **Supabase Dashboard → Project Settings → API → service_role**.

### Étape 2 : Simuler d'abord (dry-run, n'écrit rien)

```bash
npm run restore -- 2026-04-17 --dry-run
```

Tu verras combien d'enregistrements seraient restaurés par table. Vérifie que les chiffres te paraissent cohérents.

### Étape 3 : Restaurer pour de vrai

**Toutes les tables d'un coup :**

```bash
npm run restore -- 2026-04-17
```

**Une seule table** (ex : juste les bilans) :

```bash
npm run restore -- 2026-04-17 assessments
```

---

## 🆘 CAS 3 — Le projet Supabase entier a disparu

1. Crée un nouveau projet Supabase vide
2. Exécute toutes les migrations SQL dans l'ordre (voir `supabase/migrations/` ou re-exécute les SQL fournis dans l'historique des messages)
3. Mets à jour `.env` avec la nouvelle URL et la nouvelle clé service_role
4. Lance `npm run restore -- YYYY-MM-DD`

---

## ⚠️ Points importants sur la restauration

| Point | Détail |
|---|---|
| **Upsert par id** | Si un enregistrement existe avec le même id, il est écrasé par la version du backup |
| **Pas de suppression** | Les enregistrements créés APRÈS le backup ne sont PAS supprimés |
| **Ordre d'import** | Les tables sont restaurées dans l'ordre du manifest. Les FK doivent exister (clients avant assessments) |
| **Photos** | Les fichiers du bucket storage ne sont PAS dans ce backup |

---

## 🔧 Backup manuel à tout moment

Si tu veux déclencher un backup immédiat (au lieu d'attendre 4h du matin) :

### Option A — Depuis GitHub
1. Va sur https://github.com/tomkoss31/Lor-Squad-Wellness/actions
2. Clique sur **"Sauvegarde Supabase"** dans la liste de gauche
3. Clique **"Run workflow"** → **"Run workflow"**
4. Attends ~1 min, un nouveau commit apparaît dans `backups/`

### Option B — Depuis ton ordinateur
```bash
npm run backup
```
Le dossier `backups/YYYY-MM-DD/` se crée en local.

---

## 📅 Récap hebdo

Chaque **dimanche**, une issue GitHub est créée automatiquement avec le nombre d'enregistrements dans chaque table. Tu la reçois par email si tu "watches" le repo.

---

## 🆘 Besoin d'aide ?

Si tu bloques sur une restauration, ne fais RIEN et demande à Claude ou à un développeur de t'accompagner — une mauvaise restauration peut écraser ce qui reste.
