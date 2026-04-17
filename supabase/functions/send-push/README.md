# send-push — Supabase Edge Function

Envoie une notification push via Web Push Protocol aux utilisateurs abonnés.

## Déploiement

```bash
# 1. CLI Supabase (si pas installé)
npm install -g supabase

# 2. Login
supabase login

# 3. Lier le projet (une seule fois)
supabase link --project-ref <votre-project-ref>

# 4. Ajouter les secrets VAPID dans le Dashboard Supabase
#    Settings → Edge Functions → Secrets :
#    - VAPID_PUBLIC_KEY
#    - VAPID_PRIVATE_KEY
#    - VAPID_EMAIL (format: mailto:your@email.com)

# 5. Déployer
supabase functions deploy send-push
```

## Utilisation

Appel depuis le client :

```typescript
await supabase.functions.invoke('send-push', {
  body: {
    user_id: 'uuid-user',
    title: 'RDV dans 1h',
    body: 'Marie Dupont',
    url: '/clients/uuid-client',
    type: 'urgent', // 'urgent' | 'relance' | 'pv' | 'info'
  }
})
```

## Table requise

```sql
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_name TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Générer les clés VAPID

```bash
npx web-push generate-vapid-keys
```
