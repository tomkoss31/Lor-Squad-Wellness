-- =============================================================================
-- Le journal du coach-membre (22/09/2026). Maquette GpUrQc511q3sewMXJw96BY, écran 1
-- validé par Thomas : « L'écran 1 oui c'est bien, j'ai hâte de voir et pouvoir noter ».
--
-- Une coach est aussi une membre : elle note SON journal dans l'app coach, avec le
-- MÊME journal que ses membres, ouvert avec le jeton de SA fiche membre
-- (`get_my_client_app_token`, qui lit `client_app_accounts.auth_user_id`). Rien ne
-- change à sa connexion : le login teste le profil coach AVANT le jeton client.
--
-- La première fois, elle relie sa fiche :
--   • journal_coach_mes_fiches() : les fiches qui peuvent être les siennes —
--       - même adresse que son compte de CONNEXION (auth.users.email : on ne la change
--         qu'en confirmant depuis la boîte mail). Jamais `public.users.email` : chaque
--         coach peut réécrire sa propre ligne (policy users_update_self), elle pourrait
--         y mettre l'adresse d'une cliente et récupérer son espace ;
--       - ou une de SES membres à son prénom (la fiche « Thomas H. » de Thomas est à
--         une autre adresse que son compte) ;
--     jamais une fiche déjà reliée au compte de quelqu'un d'autre.
--   • journal_coach_relier(p_client) : relie la fiche choisie (une seule par compte)
--     et lui crée son espace membre s'il n'en a pas ; rend le jeton.
--   • journal_coach_delier() : « ce n'est pas ma fiche », on recommence.
-- Sans fiche : sa « Nouvelle évaluation » sur elle-même — le journal a besoin du poids
-- d'un vrai bilan pesé (`_journal_poids`), pas d'un faux bilan.
-- =============================================================================

create or replace function public.journal_coach_mes_fiches()
returns table (client_id uuid, prenom text, initiale text, raison text, relie boolean, poids numeric)
language sql stable security definer set search_path = public, extensions as $$
  with moi as (
    select u.id,
           lower(trim(coalesce((select au.email from auth.users au where au.id = u.id), ''))) as mail,
           lower(split_part(trim(coalesce(u.name, '')), ' ', 1)) as prenom
      from public.users u
     where u.id = auth.uid() and u.active
  )
  select c.id,
         c.first_name,
         upper(left(coalesce(c.last_name, ''), 1)),
         case when moi.mail <> '' and lower(trim(c.email)) = moi.mail then 'mail' else 'prenom' end,
         exists (select 1 from public.client_app_accounts a where a.client_id = c.id::text and a.auth_user_id = moi.id),
         public._journal_poids(c.id)
    from public.clients c
    cross join moi
   where ((moi.mail <> '' and lower(trim(c.email)) = moi.mail)
          or (moi.prenom <> '' and c.distributor_id = moi.id and lower(trim(c.first_name)) = moi.prenom))
     and not exists (
       select 1 from public.client_app_accounts a
        where a.client_id = c.id::text and a.auth_user_id is not null and a.auth_user_id <> moi.id)
   order by 4, c.created_at;
$$;

create or replace function public.journal_coach_relier(p_client uuid)
returns text
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_moi uuid := auth.uid();
  v_token uuid;
  v_client record;
  v_coach uuid;
begin
  if v_moi is null or not exists (select 1 from public.journal_coach_mes_fiches() f where f.client_id = p_client) then
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
$$;

create or replace function public.journal_coach_delier()
returns void
language sql security definer set search_path = public, extensions as $$
  update public.client_app_accounts set auth_user_id = null where auth_user_id = auth.uid();
$$;

revoke all on function public.journal_coach_mes_fiches() from public, anon;
revoke all on function public.journal_coach_relier(uuid) from public, anon;
revoke all on function public.journal_coach_delier() from public, anon;
grant execute on function public.journal_coach_mes_fiches() to authenticated;
grant execute on function public.journal_coach_relier(uuid) to authenticated;
grant execute on function public.journal_coach_delier() to authenticated;
