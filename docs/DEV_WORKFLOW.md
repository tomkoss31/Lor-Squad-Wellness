# Workflow Dev / Prod — Lor'Squad Wellness

Document créé le **27/04/2026** lors du setup initial du workflow dev/prod,
après plusieurs régressions ayant bloqué Mélanie (admin n°2) sur ses
suivis quotidiens. Objectif : séparer les expérimentations de Thomas de
l'environnement de production utilisé par l'équipe coach.

---

## Vue d'ensemble

Lor'Squad Wellness utilise **2 environnements de déploiement** basés sur
2 branches Git :

| Environnement | Branche | URL | Utilisateurs |
|---|---|---|---|
| **Production** | `claude/focused-pike` | `app.lorsquad.com` | Mélanie, équipe coach, clients via lien magic |
| **Dev / Test** | `dev/thomas-test` | URL Vercel auto (`lor-squad-wellness-git-dev-thomas-test-tomkoss31.vercel.app`) ou domaine custom à définir | Thomas uniquement |

### ⚠️ Base Supabase partagée

**Les 2 environnements parlent à la même base Supabase**
(`gqxnndwrdbghxflwmfxy`). Conséquence :

- Les migrations DB impactent **les 2 environnements** simultanément
- Les RLS policies, Edge Functions, triggers Postgres sont partagés
- Les données (clients, bilans, RDV, messages) sont les mêmes

Pour 90% des features front-only (UI, composants, logique React), la
séparation est totale. Pour les migrations DB, coordination obligatoire.

### Preview deployments Vercel

Vercel surveille automatiquement toutes les branches pushées sur GitHub
et crée un preview deployment par branche. Pas de configuration
supplémentaire requise dans `vercel.json` — le comportement par défaut
convient.

URL pattern auto :
```
https://lor-squad-wellness-git-<branch-slug>-tomkoss31.vercel.app
```

Pour `dev/thomas-test` :
```
https://lor-squad-wellness-git-dev-thomas-test-tomkoss31.vercel.app
```

Vérification en live : https://vercel.com/tomkoss31/lor-squad-wellness/deployments
(filtrer par branche `dev/thomas-test`).

---

## Workflows de développement

### A. Nouvelle feature (usage quotidien)

```bash
# 1. Partir toujours de dev/thomas-test (pas de claude/focused-pike)
git checkout dev/thomas-test
git pull origin dev/thomas-test

# 2. Créer la feature branch
git checkout -b feat/ma-nouvelle-feature

# 3. Développer, commiter
git add <fichiers>
git commit -m "feat: ..."

# 4. Push + merger dans dev/thomas-test
git push -u origin feat/ma-nouvelle-feature
git checkout dev/thomas-test
git merge feat/ma-nouvelle-feature
git push origin dev/thomas-test

# 5. Vercel déploie sur l'URL dev en 1-2 min
# 6. Thomas teste sur l'URL dev
```

**Quand la feature est validée en dev**, merger vers la prod :

```bash
git checkout claude/focused-pike
git pull origin claude/focused-pike
git merge dev/thomas-test  # ou cherry-pick des commits spécifiques
git push origin claude/focused-pike
# Vercel déploie sur app.lorsquad.com en 1-2 min
```

### B. Fix urgent (régression bloquante en prod)

Pas le temps de passer par dev. Fix direct en prod, puis sync vers dev :

```bash
# 1. Partir de claude/focused-pike (prod)
git checkout claude/focused-pike
git pull origin claude/focused-pike

# 2. Créer la fix branch
git checkout -b fix/blocage-melanie-xyz

# 3. Fixer + tester localement
git add <fichiers>
git commit -m "fix: ..."

# 4. Merger en prod direct
git checkout claude/focused-pike
git merge fix/blocage-melanie-xyz
git push origin claude/focused-pike

# 5. Sync dev avec prod pour rester aligné
git checkout dev/thomas-test
git merge claude/focused-pike
git push origin dev/thomas-test
```

### C. Sync hebdomadaire dev avec prod (recommandé)

Pour éviter que `dev/thomas-test` divergent trop loin de prod après
plusieurs semaines de travail, faire chaque vendredi ou lundi :

```bash
git checkout dev/thomas-test
git pull origin dev/thomas-test
git merge claude/focused-pike
git push origin dev/thomas-test
```

Si conflits → les résoudre en gardant la version qui fait sens
(généralement le dev a la version la plus à jour).

---

## Règles importantes

### ❌ À NE JAMAIS FAIRE

- `git push --force` sur `claude/focused-pike` (prod) — risque de perdre
  des commits de Mélanie ou de l'équipe
- Supprimer `dev/thomas-test` ou `claude/focused-pike`
- Merger une feature branch directement dans `claude/focused-pike` sans
  passer par `dev/thomas-test` (sauf cas fix urgent)
- Appliquer une migration DB sans prévenir (impact les 2 environnements)

### ✅ À TOUJOURS FAIRE

- Créer une `feat/X` depuis `dev/thomas-test` pour une nouvelle feature
- Créer une `fix/X` depuis `claude/focused-pike` pour un fix urgent
- Tester sur l'URL dev avant de merger en prod
- Sync hebdomadaire dev avec prod
- Documenter les migrations DB dans `CLAUDE.md` et coordonner

### Migrations DB : protocole prudent

1. Écrire la migration dans `supabase/migrations/`
2. Tester en local si possible (via `supabase db push --dry-run`)
3. L'appliquer via `supabase db push --linked --include-all`
4. Vérifier que **les 2 environnements marchent** (prod + dev)
5. Si régression détectée → rollback migration via SQL Editor Supabase
6. **Jamais** de migration le vendredi soir ou avant un créneau RDV
   de l'équipe

---

## Domaine custom dev (optionnel)

Pour avoir une URL plus jolie type `dev-thomas.lorsquad.com` au lieu de
l'URL Vercel auto-générée :

1. Aller sur Vercel → Settings → Domains :
   https://vercel.com/tomkoss31/lor-squad-wellness/settings/domains
2. Cliquer **Add Domain** → entrer `dev-thomas.lorsquad.com`
3. Vercel demande de choisir la branche associée → sélectionner
   `dev/thomas-test`
4. Vercel fournit 1 enregistrement DNS (CNAME) à ajouter chez OVH
   (ou registrar du domaine `lorsquad.com`)
5. Se connecter à OVH → zone DNS du domaine `lorsquad.com`
6. Ajouter l'enregistrement CNAME `dev-thomas` → `cname.vercel-dns.com`
7. Attendre propagation DNS (~5-10 min)
8. Vérifier sur `https://dev-thomas.lorsquad.com`

---

## URL de référence

| Service | URL |
|---|---|
| Repo GitHub | https://github.com/tomkoss31/Lor-Squad-Wellness |
| Production | https://app.lorsquad.com |
| Dev preview auto | https://lor-squad-wellness-git-dev-thomas-test-tomkoss31.vercel.app |
| Dev custom (à setup) | https://dev-thomas.lorsquad.com |
| Vercel Dashboard | https://vercel.com/tomkoss31/lor-squad-wellness |
| Supabase Dashboard | https://supabase.com/dashboard/project/gqxnndwrdbghxflwmfxy |

---

## FAQ rapide

**Q : Si je merge dev → prod et ça casse, comment revert ?**
R : `git revert <commit-sha>` sur `claude/focused-pike` + push. Vercel
redéploie la version précédente en 1-2 min.

**Q : Est-ce que Mélanie voit les expérimentations de Thomas ?**
R : Non, elle est exclusivement sur `app.lorsquad.com` qui pointe sur
`claude/focused-pike`. Elle ne voit rien de `dev/thomas-test` tant que
Thomas n'a pas mergé explicitement.

**Q : Si je fais une feature qui modifie la DB, comment tester en dev
sans impacter prod ?**
R : Pas possible aujourd'hui — les 2 envs partagent la même DB.
Prévoir plus tard 2 projets Supabase séparés (dev + prod) si le besoin
émerge. Pour l'instant, tester les migrations en heures creuses et
coordonner avec Thomas.

**Q : Est-ce que les branches `feat/*` existantes sont impactées ?**
R : Non, elles sont indépendantes. Elles continuent leur vie.
L'important : désormais les créer depuis `dev/thomas-test`
(pas de `claude/focused-pike`) pour ne pas embarquer de commits prod
non testés dans la branche feature.

---

Document à mettre à jour dès que le workflow évolue.
