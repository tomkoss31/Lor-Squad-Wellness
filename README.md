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

Le projet est pret pour un deploiement front-only sur Vercel.

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

## Note technique

L'app reste pour l'instant en mode prototype avance :

- auth mock
- roles prepares
- aucune vraie base backend branchee

Le backend et la vraie securite viendront apres la stabilisation produit.
