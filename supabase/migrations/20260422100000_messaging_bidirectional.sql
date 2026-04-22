-- =============================================================================
-- Chantier Messagerie bidirectionnelle (2026-04-22)
--
-- Aujourd'hui : client → coach fonctionne (push notif via trigger sur
-- client_messages). Coach → client : rien. Ce script :
--
--   1. Étend client_messages pour distinguer sender 'client' | 'coach'
--   2. Ajoute read_at pour le tracking fin (en plus du bool `read`)
--   3. Crée client_push_subscriptions (pour les push côté client, séparée
--      de push_subscriptions réservée aux coachs — pas de risque de
--      collision sur user_id unique)
--   4. Split le trigger existant en 2 : client → notifie coach,
--      coach → notifie client
--   5. Expose 2 RPC SECURITY DEFINER pour que l'app client (anon) puisse
--      lire ses messages + s'abonner aux push via le token magic-link
--      (client_app_accounts.token)
--
-- À EXÉCUTER DANS SUPABASE STUDIO → SQL EDITOR.
-- =============================================================================

begin;

-- ─── 1. client_messages : colonnes sender/sender_id/read_at ─────────────────

alter table public.client_messages
  add column if not exists sender text not null default 'client'
    check (sender in ('client', 'coach'));

alter table public.client_messages
  add column if not exists sender_id uuid;

alter table public.client_messages
  add column if not exists read_at timestamptz;

-- Tous les messages existants viennent du client (historique).
update public.client_messages set sender = 'client' where sender is null;

create index if not exists idx_client_messages_client_created
  on public.client_messages(client_id, created_at desc);

create index if not exists idx_client_messages_sender
  on public.client_messages(sender);

comment on column public.client_messages.sender is
  'Chantier messagerie bidirectionnelle (2026-04-22) : origine du message. '
  'client = envoyé depuis l''app client (rapport/recap/ClientAppPage). '
  'coach = réponse du coach depuis la messagerie.';

-- ─── 2. RLS : permettre au coach d'insérer sender=coach ────────────────────
-- msg_public_insert existante autorise tous les inserts (historique public).
-- On laisse telle quelle : la valeur de sender est contrôlée côté app
-- (front coach force sender='coach', front client force sender='client').
-- Pour verrouiller plus tard, on pourra ajouter un check côté Edge Function.

-- ─── 3. client_push_subscriptions : push pour les clients ───────────────────
-- Séparée de push_subscriptions (coach) pour isoler les flux et éviter
-- toute interférence avec l'unique index sur push_subscriptions.user_id.

create table if not exists public.client_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists client_push_subscriptions_client_key
  on public.client_push_subscriptions(client_id);

alter table public.client_push_subscriptions enable row level security;

-- Pas de policy publique directe : les clients passent par la RPC
-- upsert_client_push_subscription_by_token() (security definer).
-- Le service role bypass RLS pour les Edge Functions.

-- ─── 4. Triggers : split client vs coach ───────────────────────────────────

-- 4a. Trigger client → coach (reuse new-message-notifier)
create or replace function public.notify_new_client_message()
returns trigger
language plpgsql
security definer
as $$
declare
  target_url text;
begin
  if NEW.sender <> 'client' then
    return NEW;
  end if;
  target_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/new-message-notifier';
  perform net.http_post(
    url := target_url,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'message_id', NEW.id,
      'client_id', NEW.client_id,
      'distributor_id', NEW.distributor_id
    ),
    timeout_milliseconds := 5000
  );
  return NEW;
exception when others then
  raise notice 'notify_new_client_message: %', SQLERRM;
  return NEW;
end;
$$;

-- 4b. Nouveau trigger coach → client
create or replace function public.notify_new_coach_message()
returns trigger
language plpgsql
security definer
as $$
declare
  target_url text;
begin
  if NEW.sender <> 'coach' then
    return NEW;
  end if;
  target_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/new-coach-message-notifier';
  perform net.http_post(
    url := target_url,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'message_id', NEW.id,
      'client_id', NEW.client_id,
      'distributor_id', NEW.distributor_id
    ),
    timeout_milliseconds := 5000
  );
  return NEW;
exception when others then
  raise notice 'notify_new_coach_message: %', SQLERRM;
  return NEW;
end;
$$;

drop trigger if exists trg_notify_new_coach_message on public.client_messages;
create trigger trg_notify_new_coach_message
  after insert on public.client_messages
  for each row
  execute function public.notify_new_coach_message();

-- ─── 5. RPC : lecture messages par token (anon-safe) ────────────────────────
-- L'app client (/client/:token) est anon. RLS bloque le SELECT direct. On
-- passe par cette RPC SECURITY DEFINER qui résout le token → client_id,
-- puis retourne les messages pour ce client.

create or replace function public.get_client_messages_by_token(p_token uuid)
returns table (
  id uuid,
  client_id text,
  sender text,
  message_type text,
  product_name text,
  message text,
  read boolean,
  read_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
as $$
declare
  resolved_client_id text;
begin
  select caa.client_id::text into resolved_client_id
  from public.client_app_accounts caa
  where caa.token = p_token
    and (caa.expires_at is null or caa.expires_at > now())
  limit 1;

  if resolved_client_id is null then
    return;
  end if;

  return query
    select
      m.id,
      m.client_id,
      m.sender,
      m.message_type,
      m.product_name,
      m.message,
      m.read,
      m.read_at,
      m.created_at
    from public.client_messages m
    where m.client_id = resolved_client_id
    order by m.created_at asc;
end;
$$;

grant execute on function public.get_client_messages_by_token(uuid) to anon, authenticated;

-- ─── 6. RPC : upsert push subscription côté client ─────────────────────────
-- Permet à l'app client (anon, authentifiée par le token magic-link) de
-- créer/mettre à jour sa subscription push sans RLS permissive.

create or replace function public.upsert_client_push_subscription_by_token(
  p_token uuid,
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text default null
)
returns boolean
language plpgsql
security definer
as $$
declare
  resolved_client_id uuid;
begin
  select caa.client_id::uuid into resolved_client_id
  from public.client_app_accounts caa
  where caa.token = p_token
    and (caa.expires_at is null or caa.expires_at > now())
  limit 1;

  if resolved_client_id is null then
    return false;
  end if;

  insert into public.client_push_subscriptions
    (client_id, endpoint, p256dh, auth, user_agent, updated_at)
  values
    (resolved_client_id, p_endpoint, p_p256dh, p_auth, p_user_agent, now())
  on conflict (client_id) do update set
    endpoint = excluded.endpoint,
    p256dh = excluded.p256dh,
    auth = excluded.auth,
    user_agent = excluded.user_agent,
    updated_at = now();

  return true;
end;
$$;

grant execute on function public.upsert_client_push_subscription_by_token(uuid, text, text, text, text) to anon, authenticated;

-- ─── 7. RPC : insert message client par token (threading chat) ──────────────

create or replace function public.insert_client_message_by_token(
  p_token uuid,
  p_message text,
  p_message_type text default 'general'
)
returns uuid
language plpgsql
security definer
as $$
declare
  resolved record;
  new_id uuid;
begin
  select caa.client_id, caa.coach_id,
         coalesce(caa.client_first_name, '') || ' ' || coalesce(caa.client_last_name, '') as client_name
  into resolved
  from public.client_app_accounts caa
  where caa.token = p_token
    and (caa.expires_at is null or caa.expires_at > now())
  limit 1;

  if resolved.client_id is null then
    return null;
  end if;

  insert into public.client_messages
    (client_id, client_name, distributor_id, message_type, message, sender)
  values
    (resolved.client_id, trim(resolved.client_name), resolved.coach_id, p_message_type, p_message, 'client')
  returning id into new_id;

  return new_id;
end;
$$;

grant execute on function public.insert_client_message_by_token(uuid, text, text) to anon, authenticated;

commit;
