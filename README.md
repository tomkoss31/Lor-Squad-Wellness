# Lor'Squad Wellness

Application web Lor'Squad Wellness pour les rendez-vous client, les bilans, le suivi terrain et la pedagogie nutrition.

## Stack

- React
- Vite
- Tailwind CSS
- React Router

## Scripts

```bash
npm install
npm run dev
npm run build
npm run typecheck
```

## Deploiement Vercel

Le projet est pret pour un deploiement Vercel en 2 modes :

- beta locale simple
- version backend avec Supabase

### Pourquoi ca fonctionne

- application React/Vite statique
- `vercel.json` gere la redirection SPA vers `index.html`
- `build` genere le dossier `dist`

### Etapes conseillees

1. Initialiser Git si besoin.
2. Pousser le projet sur GitHub.
3. Importer le repo dans Vercel.
4. Laisser Vercel detecter Vite.
5. Verifier que la commande de build est `npm run build`.
6. Verifier que le dossier de sortie est `dist`.
7. Publier la version beta.

## Beta test

Avant d'ouvrir la beta, verifier surtout :

- connexion / deconnexion
- navigation dashboard / clients / fiche client
- nouveau bilan complet
- nouveau suivi
- affichage tablette
- rechargement direct sur une route interne (`/clients/...`, `/assessments/new`)

## Backend Supabase

Le projet contient deja la structure pour passer a une vraie base distante :

- client Supabase navigateur
- service de donnees distant
- creation d'utilisateurs via API Vercel
- schema SQL et policies

Voir :

- [docs/SUPABASE_SETUP.md](C:\Users\tomko\Documents\Lor'Squad Wellness\docs\SUPABASE_SETUP.md)
- [supabase/schema.sql](C:\Users\tomko\Documents\Lor'Squad Wellness\supabase\schema.sql)
- [supabase/bootstrap-first-admin.sql](C:\Users\tomko\Documents\Lor'Squad Wellness\supabase\bootstrap-first-admin.sql)

## Note technique

L'app reste pour l'instant en mode prototype avance :

- frontend stable
- auth et roles prepares
- mode local pour la beta
- mode Supabase deja prepare des que les cles sont ajoutees

La vraie base partagée est donc prete a etre branchee sans refaire le produit.
