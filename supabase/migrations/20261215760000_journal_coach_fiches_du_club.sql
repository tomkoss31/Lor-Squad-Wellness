-- =============================================================================
-- « Mon journal » d'une coach : sa fiche de membre du CLUB compte aussi (23/09/2026).
--
-- Vécu avec Maria, devant Thomas : coach ET membre, elle ouvre « Mon journal » et
-- lit « Pas encore de fiche à ton nom » — alors qu'elle a une fiche au club avec
-- 6 bilans. La fonction ne proposait que deux choses : une fiche au MÊME EMAIL que
-- son compte, ou une de SES PROPRES clientes à son prénom. Or au club, une coach
-- est presque toujours inscrite par une AUTRE (celle de Maria appartient à Mélanie)
-- et sa fiche n'a pas d'email. Résultat : rien, et un bouton « Faire mon
-- évaluation » qui lui aurait créé une DEUXIÈME fiche.
--
-- Deux changements :
--  1. une fiche est proposée si elle porte son prénom ET qu'elle est membre de SON
--     club (`est_coach_de_mon_club` sur la coach qui la suit), qui que soit cette
--     coach. Sans club, `est_coach_de_mon_club(soi)` est vrai : une coach seule
--     retrouve exactement ses propres clientes, comme avant.
--  1 bis. on compare le PREMIER prénom des deux côtés : la fiche de Maria s'appelle
--     « Maria Rosa » (prénom composé) et son compte « Maria catalano » — l'égalité
--     stricte échouait, même sur ses propres clientes.
--  2. une fiche à son nom DÉJÀ reliée à un autre compte n'est plus cachée : elle
--     revient avec `prise = true`. L'écran la montre, non cliquable, au lieu de
--     pousser vers un doublon. `journal_coach_relier` refuse ces fiches-là.
-- =============================================================================

drop function if exists public.journal_coach_mes_fiches();

create function public.journal_coach_mes_fiches()
returns table(
  client_id uuid,
  prenom    text,
  initiale  text,
  raison    text,   -- 'mail' · 'prenom' (une de ses clientes) · 'club' (membre de son club)
  relie     boolean,
  prise     boolean, -- déjà reliée au compte de quelqu'un d'autre
  poids     numeric
)
language sql
stable
security definer
set search_path to 'public', 'extensions'
as $function$
  with moi as (
    select u.id,
           lower(trim(coalesce((select au.email from auth.users au where au.id = u.id), ''))) as mail,
           lower(split_part(trim(coalesce(u.name, '')), ' ', 1)) as prenom
      from public.users u
     where u.id = auth.uid() and u.active
  ),
  candidates as (
    select c.id, c.first_name, c.last_name, c.email, c.distributor_id, c.created_at,
           moi.id as moi, moi.mail as mon_mail, moi.prenom as mon_prenom
      from public.clients c
      cross join moi
     where (moi.mail <> '' and lower(trim(c.email)) = moi.mail)
        or (moi.prenom <> '' and lower(split_part(trim(c.first_name), ' ', 1)) = moi.prenom
            and (c.distributor_id = moi.id
                 or (coalesce(c.ebe_bbc, false) and public.est_coach_de_mon_club(c.distributor_id))))
  )
  select k.id,
         k.first_name,
         upper(left(coalesce(k.last_name, ''), 1)),
         case when k.mon_mail <> '' and lower(trim(k.email)) = k.mon_mail then 'mail'
              when k.distributor_id = k.moi then 'prenom'
              else 'club' end,
         exists (select 1 from public.client_app_accounts a
                  where a.client_id = k.id::text and a.auth_user_id = k.moi),
         exists (select 1 from public.client_app_accounts a
                  where a.client_id = k.id::text and a.auth_user_id is not null and a.auth_user_id <> k.moi),
         public._journal_poids(k.id)
    from candidates k
   order by case when k.mon_mail <> '' and lower(trim(k.email)) = k.mon_mail then 1
                 when k.distributor_id = k.moi then 2
                 else 3 end,
            k.created_at;
$function$;

revoke all on function public.journal_coach_mes_fiches() from public, anon;
grant execute on function public.journal_coach_mes_fiches() to authenticated;

comment on function public.journal_coach_mes_fiches() is
  'Mon journal (coach) : les fiches qui peuvent être la sienne — même email, ses clientes, ou une membre de SON club à son prénom. `prise` = déjà reliée à un autre compte.';

-- Relier : jamais une fiche déjà reliée à quelqu'un d'autre.
create or replace function public.journal_coach_relier(p_client uuid)
returns text
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  v_moi uuid := auth.uid();
  v_token uuid;
  v_client record;
  v_coach uuid;
begin
  if v_moi is null or not exists (
       select 1 from public.journal_coach_mes_fiches() f
        where f.client_id = p_client and not f.prise) then
    raise exception 'non autorise';
  end if;
  select c.id, c.first_name, c.last_name, c.distributor_id into v_client from public.clients c where c.id = p_client;
  v_coach := coalesce(v_client.distributor_id, v_moi);

  -- Une seule fiche reliée par compte : les autres se détachent.
  update public.client_app_accounts set auth_user_id = null
   where auth_user_id = v_moi and client_id <> p_client::text;

  -- Son espace membre existe : on le relie (et on le réveille s'il avait expiré).
  update public.client_app_accounts
     set auth_user_id = v_moi,
         expires_at = case when expires_at is null or expires_at > now() then expires_at else now() + interval '1 year' end
   where client_id = p_client::text
  returning token into v_token;

  -- Pas encore d'espace membre : on le crée, comme « Envoyer l'accès ».
  if v_token is null then
    insert into public.client_app_accounts (token, client_id, coach_id, coach_name, client_first_name, client_last_name, expires_at, auth_user_id)
    values (gen_random_uuid(), p_client::text, v_coach::text,
            coalesce((select u.name from public.users u where u.id = v_coach), ''),
            v_client.first_name, v_client.last_name, now() + interval '1 year', v_moi)
    returning token into v_token;
  end if;

  return v_token::text;
end;
$function$;
