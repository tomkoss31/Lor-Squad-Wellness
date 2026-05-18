-- =============================================================================
-- Chantier #11 — Quality fixes (2026-05-18)
-- =============================================================================
-- Suite à l'audit qualité demandé par Thomas, 4 fixes :
--   A. client_token devient nullable (vire le sentinel UUID 00000000-...)
--   B. anti-collision slug coach (trigger BEFORE INSERT/UPDATE users)
--   D. rate limit persistant en table (au lieu de Map RAM volatile)
--   E. restauration cron J+60 (digest admin, pas par client individuel)
-- =============================================================================

begin;

-- ─── Extension unaccent (requise par ls_normalize_slug) ──────────────────────
create extension if not exists unaccent;
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ─── A. client_token nullable + nettoyage sentinel ───────────────────────────
alter table public.client_testimonials
  alter column client_token drop not null;

update public.client_testimonials
   set client_token = null
 where client_token = '00000000-0000-0000-0000-000000000000';

comment on column public.client_testimonials.client_token is
  'Optionnel : token client_app_accounts si mode V1 per-client. NULL si mode
   V1.1 lien generique coach. Plus de sentinel UUID depuis migration quality
   fixes 2026-05-18.';

-- ─── Helper : normalisation slug (avec gestion accents via unaccent) ────────
create or replace function public.ls_normalize_slug(p_input text)
returns text
language sql
immutable
as $$
  select trim(regexp_replace(
    lower(unaccent(coalesce(p_input, ''))),
    '[^a-z0-9]', '', 'g'
  ));
$$;

comment on function public.ls_normalize_slug(text) is
  'Normalise un texte en slug stable (lowercase, sans accents, alphanum only).
   Utilise pour generer le slug coach a partir de users.name (prenom).';

-- ─── B. Trigger anti-collision slug coach ────────────────────────────────────
-- Quand un user devient actif distributor/admin/referent, on verifie qu'aucun
-- autre coach actif n'a deja le meme slug (prenom normalise). Si collision,
-- l'INSERT/UPDATE est bloque avec un message explicite.

create or replace function public._check_coach_slug_unique()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_slug text;
  v_count int;
  v_first_name text;
begin
  -- Skip si user pas concerne par les pages publiques
  if NEW.active is false then return NEW; end if;
  if NEW.role is null or NEW.role not in ('distributor', 'admin', 'referent') then
    return NEW;
  end if;

  v_first_name := split_part(coalesce(NEW.name, ''), ' ', 1);
  v_slug := public.ls_normalize_slug(v_first_name);
  if length(v_slug) < 2 then return NEW; end if;

  select count(*) into v_count
    from public.users
   where id <> NEW.id
     and active = true
     and role in ('distributor', 'admin', 'referent')
     and public.ls_normalize_slug(split_part(coalesce(name, ''), ' ', 1)) = v_slug;

  if v_count > 0 then
    raise exception 'Slug coach « % » deja utilise par un autre coach actif. Ajoute une initiale au prenom (ex « Marie L. ») ou choisis un prenom court different.', v_slug
      using errcode = 'unique_violation';
  end if;
  return NEW;
end;
$$;

drop trigger if exists tg_coach_slug_unique on public.users;
create trigger tg_coach_slug_unique
  before insert or update of name, role, active on public.users
  for each row
  execute function public._check_coach_slug_unique();

comment on function public._check_coach_slug_unique() is
  'Empeche 2 coaches actifs d''avoir le meme prenom normalise (= meme slug
   public). Evite la collision sur /temoignage/coach/:slug et /bilan-online/:slug.';

-- Log info sur les collisions existantes (NOTICE, ne bloque pas la migration)
do $$
declare
  r record;
begin
  for r in
    select public.ls_normalize_slug(split_part(name, ' ', 1)) as slug,
           array_agg(name) as names,
           count(*) as n
      from public.users
     where active = true
       and role in ('distributor', 'admin', 'referent')
       and length(coalesce(name, '')) >= 2
     group by 1
    having count(*) > 1
  loop
    raise notice 'Collision slug coach EXISTANTE : « % » utilise par %', r.slug, r.names;
  end loop;
end$$;

-- ─── D. Rate limit persistant en table ──────────────────────────────────────
create table if not exists public.testimonial_rate_log (
  id bigserial primary key,
  ip text not null,
  mode text not null check (mode in ('token', 'slug')),
  attempted_at timestamptz not null default now()
);
create index if not exists testimonial_rate_log_ip_idx
  on public.testimonial_rate_log (ip, mode, attempted_at desc);

alter table public.testimonial_rate_log enable row level security;
drop policy if exists testimonial_rate_log_no_direct on public.testimonial_rate_log;
create policy testimonial_rate_log_no_direct on public.testimonial_rate_log
  for all to authenticated using (false) with check (false);

create or replace function public.check_testimonial_rate(
  p_ip text,
  p_mode text,
  p_max int default 3,
  p_window_seconds int default 3600
)
returns table (allowed boolean, retry_after_seconds int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_oldest_in_window timestamptz;
begin
  if p_ip is null or p_ip = '' then
    allowed := true; retry_after_seconds := 0; return next; return;
  end if;

  -- GC opportuniste (> 1 jour)
  delete from public.testimonial_rate_log
   where attempted_at < now() - interval '1 day';

  select count(*), min(attempted_at) into v_count, v_oldest_in_window
    from public.testimonial_rate_log
   where ip = p_ip
     and mode = p_mode
     and attempted_at >= now() - (p_window_seconds || ' seconds')::interval;

  if v_count >= p_max then
    allowed := false;
    retry_after_seconds := greatest(
      1,
      extract(epoch from (v_oldest_in_window + (p_window_seconds || ' seconds')::interval - now()))::int
    );
    return next; return;
  end if;

  insert into public.testimonial_rate_log (ip, mode) values (p_ip, p_mode);
  allowed := true;
  retry_after_seconds := 0;
  return next;
end;
$$;

grant execute on function public.check_testimonial_rate(text, text, int, int)
  to authenticated, anon, service_role;

-- ─── E. Cron J+60 (digest admin, pas relance client individuel) ─────────────
-- Restaure la RPC supprimee en V1.1 + reschedule cron daily.
-- L'edge fn request-testimonial (deja deployee) consomme cette RPC.

create or replace function public.get_testimonial_request_candidates(
  p_start timestamptz,
  p_end timestamptz
)
returns table (
  client_id uuid,
  first_name text,
  coach_user_id uuid,
  coach_name text
)
language sql
security definer
set search_path = public
as $$
  -- Clients dont le client_app_accounts a entre 60 et 75 jours (fenetre lue
  -- par l'edge fn = [now-75d, now-60d[) et qui n'ont pas encore de temoignage
  -- pending/approved.
  select
    c.id as client_id,
    c.first_name,
    c.coach_user_id,
    u.name as coach_name
  from public.clients c
  join public.client_app_accounts caa on c.id::text = caa.client_id
  left join public.users u on u.id = c.coach_user_id
  where caa.created_at >= p_start
    and caa.created_at < p_end
    and not exists (
      select 1 from public.client_testimonials t
      where t.client_id = c.id
        and t.status in ('pending', 'approved')
    );
$$;

comment on function public.get_testimonial_request_candidates(timestamptz, timestamptz) is
  'Chantier #11 quality fix E (2026-05-18) : restaure la RPC supprimee en
   V1.1. Retourne les clients atteignant J+60 sans temoignage actif. Consommee
   par le cron daily request-testimonial qui notif les admins.';

-- Reschedule cron : 8h UTC = 9-10h Paris (digest matinal admin)
do $$
begin
  if exists (select 1 from cron.job where jobname = 'request-testimonial-daily') then
    perform cron.unschedule('request-testimonial-daily');
  end if;
end$$;

select cron.schedule(
  'request-testimonial-daily',
  '0 8 * * *',
  $cron$
  select net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/request-testimonial',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $cron$
);

-- ─── F. Bonus : INSERT admin (saisie manuelle "seed" des premiers avis) ─────
-- Sans policy INSERT publique, l'admin ne peut pas ajouter de témoignage à la
-- main depuis /admin/testimonials. On en ajoute une, scopée admin actif only,
-- pour seeder le carrousel avec les vrais retours clients que Thomas a déjà.
drop policy if exists "testimonials_admin_insert" on public.client_testimonials;
create policy "testimonials_admin_insert"
  on public.client_testimonials
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.active = true
        and u.role = 'admin'
    )
  );

commit;
