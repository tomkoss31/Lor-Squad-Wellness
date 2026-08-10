# Les 13 fonctions Vercel — audit du 10/08/2026

**Pourquoi cet audit.** Le déploiement de la PR #122 a échoué sur
`exceeded_serverless_functions_per_deployment` : le plan **Hobby** refuse une
fonction de plus. On était bloqué pour ajouter les balises de partage du club.
Contourné avec un fichier statique — mais il fallait comprendre la contrainte
avant de la revivre.

> ⚠️ **Le `npm run build` local ne peut PAS attraper ça.** La limite est
> appliquée par la plateforme **après** le build, à l'étape de déploiement.
> Un build vert ne garantit donc pas un déploiement vert.

---

## Ce qu'on héberge

| Fonction | Lignes | À quoi ça sert |
|---|---:|---|
| `update-assessment` | 610 | Enregistre un bilan (⚠️ contient le catalogue PV dupliqué du front) |
| `admin-create-external-distributor` | 385 | Crée un distributeur hors app |
| `admin-repair-user` | 375 | Répare / promeut un compte — **routeur `action:lookup\|promote`** |
| `og/coach` | 197 | Bannière de partage 1200×630 générée à la volée |
| `admin-create-user` | 160 | Crée un compte coach |
| `admin-update-user` | 158 | Modifie un compte |
| `reassign-client-owner` | 150 | Change le propriétaire d'un client |
| `update-client-schedule` | 141 | Modifie le planning d'un client |
| `boutique-meta` | 123 | Open Graph de la boutique HL SKIN |
| `coach-meta` | 123 | Open Graph de la fiche coach publique |
| `admin-update-user-password` | 84 | Change un mot de passe |
| `admin-delete-client` | 78 | Supprime un client |
| `runtime-config` | 14 | Sert l'URL + la clé anon Supabase au navigateur |

**Les 13 sont appelées.** Aucune fonction morte : rien à gagner par suppression.

---

## Deux fausses bonnes idées, écartées

**Supprimer `runtime-config` (14 lignes).** C'est la plus petite, donc tentante.
Mais elle sert les identifiants Supabase au navigateur quand les variables de
build sont absentes : c'est la **ligne de vie de l'app**. La retirer pour gagner
un emplacement serait un très mauvais échange.

**Fusionner les fonctions de partage** (`coach-meta`, `boutique-meta`,
`og/coach`). Elles se ressemblent, mais chacune a sa règle de réécriture dans
`vercel.json` et sa source de données. Gain : 2 emplacements pour un risque sur
des pages publiques indexées. Mauvais rapport.

---

## La vraie marge : les 6 fonctions `admin-*`

**1 240 lignes**, toutes appelées depuis **un seul fichier**
(`src/services/supabaseService.ts`) — les appelants sont donc centralisés, ce
qui rend le regroupement bien moins risqué qu'il n'y paraît.

**Le motif existe déjà dans le projet** : `admin-repair-user` route déjà deux
opérations via `action:lookup|promote`, et `api/admin-promote-member` a été
absorbé de cette façon (le nom survit dans un commentaire de
`PromoteMemberPanel.tsx`, plus dans les fichiers). Ce n'est donc pas une
invention, c'est la reprise d'une décision déjà prise ici.

### Le plan

1. Déplacer la logique des 6 fonctions vers `api/_lib/admin/*.ts`.
   **Le préfixe `_` est ce qui compte** : Vercel ne compte pas ces fichiers
   comme des fonctions.
2. Un seul point d'entrée `api/admin.ts` qui dispatche sur `action`.
3. Supprimer les 6 anciens fichiers.
4. Adapter les appels dans `supabaseService.ts` (un seul fichier).

**Résultat : 13 → 8 fonctions.** Cinq emplacements libérés.

### Pourquoi ce n'est pas fait dans cet audit

Ces endpoints créent des comptes, changent des mots de passe et suppriment des
clients. Un refactor de 1 240 lignes sur ce périmètre mérite sa propre recette,
pas d'être glissé en fin de journée. **Et rien n'est bloqué aujourd'hui** : les
balises du club sont servies par un fichier statique, ce qui est de toute façon
la meilleure solution pour du contenu qui ne change pas.

À faire le jour où une fonction réellement dynamique devient nécessaire.

---

## La règle à retenir

**Après avoir ajouté un fichier dans `api/`, aller regarder le déploiement.**
Et non pas compter avant — le nombre de fichiers n'explique pas le refus.

| branche | fichiers dans `api/` | déploiement |
|---|---:|---|
| `main` | 13 | ✅ passe |
| `dev/thomas-test` | 15 | ✅ passe |
| une branche partie de `main` + 1 fichier | 14 | ❌ refusé |

Le message annonce 12, la prod en fait tourner 13, dev 15 — et c'est un 14ᵉ qui
a été refusé. Je n'ai pas su reproduire la règle exacte de Vercel, et une règle
fausse serait pire que pas de règle du tout. Ce qui reste vrai : **le refus
tombe à l'étape de déploiement, après un build vert.** Trois issues :

1. **Le contenu est statique ?** → un fichier dans `public/`. Zéro fonction,
   zéro démarrage à froid, servi par le CDN. C'est ce qu'on a fait pour
   `club-meta.html`.
2. **Il faut du dynamique ?** → regrouper les `admin-*` d'abord (plan ci-dessus).
3. **Sinon** → passer au plan Pro.
