-- =============================================================================
-- push_subscriptions : unique constraint sur endpoint (2026-05-06)
--
-- Bug remonte Thomas : "test push ne fonctionne pas" + "Mel n'arrive pas
-- a se brancher". Audit DB :
--   - Thomas : 1 sub Apple
--   - Mel : 0 sub
--   - Total : 2 subs (1 Thomas + 1 autre)
--
-- Le hook usePushNotifications faisait `upsert(..., { onConflict: 'user_id' })`.
-- Probleme : pas de contrainte unique sur user_id (un user peut avoir
-- plusieurs devices). L'upsert ne peut pas matcher -> insertion qui
-- pouvait echouer silencieusement OU ecraser une sub existante.
--
-- Fix : ajouter contrainte unique sur endpoint (chaque endpoint = device
-- unique cote browser/Apple). Le hook upsert maintenant sur endpoint,
-- ce qui permet :
--   - 1 user N devices (mobile, desktop, tablet) -> N subs
--   - Re-subscribe d'un meme device -> update sans doublon
-- =============================================================================

begin;

-- Cleanup : supprimer doublons d'endpoint avant d'ajouter la contrainte.
-- Garde la row la plus recente par endpoint.
delete from public.push_subscriptions
where id in (
  select id from (
    select id,
           row_number() over (partition by endpoint order by updated_at desc nulls last) as rn
    from public.push_subscriptions
  ) sub
  where rn > 1
);

-- Add unique constraint
alter table public.push_subscriptions
  drop constraint if exists push_subscriptions_endpoint_key;

alter table public.push_subscriptions
  add constraint push_subscriptions_endpoint_key unique (endpoint);

-- Index pour les SELECT par user_id (l'edge function send-push fait
-- WHERE user_id = X ORDER BY updated_at DESC).
create index if not exists idx_push_subscriptions_user
  on public.push_subscriptions(user_id, updated_at desc);

comment on constraint push_subscriptions_endpoint_key on public.push_subscriptions is
  'Endpoint unique = 1 device unique (browser/OS). Permet upsert(onConflict=endpoint) pour 1 user N devices. Fix 2026-05-06.';

commit;
