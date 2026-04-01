# Supabase Setup

Ce projet peut maintenant fonctionner en 2 modes :

- `local` : beta actuelle, stockage dans le navigateur
- `supabase` : vraie base distante partagee

Le passage en mode `supabase` se fait automatiquement des que les variables d'environnement sont renseignees.

## 1. Creer le projet Supabase

1. Creer un nouveau projet sur Supabase.
2. Recuperer :
   - `Project URL`
   - `anon public key`
   - `service role key`

## 2. Creer les tables et les policies

Dans l'editeur SQL Supabase, executer :

- [supabase/schema.sql](C:\Users\tomko\Documents\Lor'Squad Wellness\supabase\schema.sql)

Cela cree :

- `users`
- `clients`
- `assessments`
- `follow_ups`

avec les regles d'acces admin / distributeur.

## 3. Creer le premier admin

Comme il n'y a pas encore d'admin dans l'app au premier demarrage, il faut faire un bootstrap une seule fois.

### Etape A

Dans `Authentication > Users`, creer manuellement le premier utilisateur avec :

- email
- mot de passe
- email confirme

### Etape B

Dans l'editeur SQL, ouvrir :

- [supabase/bootstrap-first-admin.sql](C:\Users\tomko\Documents\Lor'Squad Wellness\supabase\bootstrap-first-admin.sql)

Puis remplacer :

- `admin@lorsquadwellness.app`
- `Admin principal`
- `Lor'Squad Wellness`

par les bonnes valeurs.

Executer ensuite ce SQL.

Cela cree le profil `public.users` associe au compte auth.

## 4. Configurer l'application en local

Creer un fichier `.env.local` a partir de :

- [.env.example](C:\Users\tomko\Documents\Lor'Squad Wellness\.env.example)

Renseigner :

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## 5. Configurer Vercel

Dans Vercel > Project > Settings > Environment Variables, ajouter :

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Puis redeployer.

## 6. Ce qui se passe ensuite

Quand les variables sont presentes :

- la connexion utilise Supabase Auth
- les utilisateurs viennent de la vraie table `users`
- les clients, bilans et suivis viennent de la base distante
- les admins voient tout
- les distributeurs ne voient que leurs clients

## 7. Creation des comptes ensuite

Une fois le premier admin cree et connecte :

- la page `Utilisateurs` peut creer les autres acces
- un admin peut activer / desactiver les comptes
- la creation passe par l'API Vercel :
  - [api/admin-create-user.ts](C:\Users\tomko\Documents\Lor'Squad Wellness\api\admin-create-user.ts)

## 8. Limite actuelle

La creation d'acces fonctionne deja en structure finale, mais :

- l'envoi d'email d'activation n'est pas encore branche
- le mot de passe est encore saisi par l'admin a la creation

La prochaine evolution logique sera :

- envoi d'un lien d'activation
- choix du mot de passe par le distributeur
- mot de passe jamais visible par l'admin
