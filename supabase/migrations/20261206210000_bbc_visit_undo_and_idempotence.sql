-- =============================================================================
-- Corriger une visite : ne plus jamais compter deux fois, et pouvoir revenir
-- en arrière (audit BBC 2026-07-26).
--
-- Deux trous du même geste — le pointage du matin, fait vite, au comptoir :
--
--   1. DOUBLE COMPTAGE. Le coach pointe un membre à la main puis le rescanne
--      trente secondes plus tard ; ou le QR est scanné deux fois pendant que le
--      membre bouge son téléphone (l'anti-doublon du scanner ne couvre que 4 s).
--      Deux visites sont écrites pour un seul petit-déjeuner, et le membre voit
--      4/10 sur une carte qu'il a payée alors qu'il est venu trois fois.
--      → `bbc_add_visit` devient IDEMPOTENTE sur 10 minutes : un deuxième appel
--        rapproché ne crée rien mais renvoie l'état réel de la carte, donc
--        l'écran du coach reste juste et le membre n'est pas débité.
--        On ne passe PAS par un index unique sur (client, coach, jour) : il
--        ferait échouer une 2e visite légitime dans la même journée.
--
--   2. AUCUN RETOUR EN ARRIÈRE. Le coach tape « +1 » sur le mauvais membre. Il
--      n'existe nulle part un « −1 », ni un historique cliquable. Pire, si
--      c'était la dernière visite de la carte, celle-ci vient d'être FERMÉE :
--      corriger obligeait à réattribuer une carte, qui repart de 0.
--      → `bbc_remove_visit` retire la dernière visite du membre et ROUVRE sa
--        carte si c'est ce pointage qui l'avait close.
--
-- Les deux fonctions gardent le contrôle de propriété de `bbc_add_visit` :
-- seul le distributeur du client peut écrire, jamais un autre coach.
-- =============================================================================

-- ─── 1. Pointer une visite, une seule fois ──────────────────────────────────

create or replace function public.bbc_add_visit(p_client_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coach uuid := auth.uid();
  v_owner uuid;
  v_name text;
  v_card record;
  v_used integer := 0;
  v_total integer;
  v_recent boolean;
begin
  select distributor_id, first_name into v_owner, v_name from public.clients where id = p_client_id;
  if v_owner is distinct from v_coach then
    raise exception 'non autorise';
  end if;

  select * into v_card from public.member_cards
  where client_id = p_client_id and coach_user_id = v_coach and closed_at is null
    and (expires_at is null or expires_at > now())
  order by started_at desc limit 1;

  -- Un même membre pointé deux fois en dix minutes, c'est une erreur de saisie,
  -- pas deux petits-déjeuners. On ne réécrit rien, mais on renvoie l'état réel
  -- pour que l'écran affiche le bon solde plutôt qu'une erreur.
  select exists (
    select 1 from public.club_visits
    where client_id = p_client_id and coach_user_id = v_coach
      and visited_at > now() - interval '10 minutes'
  ) into v_recent;

  if not v_recent then
    insert into public.club_visits (client_id, coach_user_id, card_id)
    values (p_client_id, v_coach, v_card.id);

    if v_card.id is not null then
      select count(*) into v_used from public.club_visits where card_id = v_card.id;
      if v_used >= v_card.card_type then
        update public.member_cards set closed_at = now() where id = v_card.id;
      end if;
    end if;
  end if;

  if v_card.id is not null then
    select count(*) into v_used from public.club_visits where card_id = v_card.id;
  end if;

  select count(*) into v_total from public.club_visits
  where client_id = p_client_id and coach_user_id = v_coach;

  return json_build_object(
    'client_name', coalesce(v_name, 'membre'),
    'total_visits', v_total,
    'card_type', v_card.card_type,
    'card_used', v_used,
    'card_remaining', case when v_card.id is null then null else greatest(v_card.card_type - v_used, 0) end,
    'already_counted', v_recent
  );
end;
$$;

-- ─── 2. Retirer la dernière visite ──────────────────────────────────────────

create or replace function public.bbc_remove_visit(p_client_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coach uuid := auth.uid();
  v_owner uuid;
  v_name text;
  v_visit record;
  v_card record;
  v_used integer := 0;
  v_total integer;
begin
  select distributor_id, first_name into v_owner, v_name from public.clients where id = p_client_id;
  if v_owner is distinct from v_coach then
    raise exception 'non autorise';
  end if;

  select * into v_visit from public.club_visits
  where client_id = p_client_id and coach_user_id = v_coach
  order by visited_at desc limit 1;

  if v_visit.id is null then
    return json_build_object('removed', false, 'client_name', coalesce(v_name, 'membre'));
  end if;

  delete from public.club_visits where id = v_visit.id;

  -- Si c'est ce pointage qui avait rempli la carte, elle se rouvre : sinon le
  -- coach devrait en réattribuer une, et le membre repartirait de zéro.
  if v_visit.card_id is not null then
    update public.member_cards
    set closed_at = null
    where id = v_visit.card_id
      and closed_at is not null
      and (expires_at is null or expires_at > now());

    select * into v_card from public.member_cards where id = v_visit.card_id;
    select count(*) into v_used from public.club_visits where card_id = v_visit.card_id;
  end if;

  select count(*) into v_total from public.club_visits
  where client_id = p_client_id and coach_user_id = v_coach;

  return json_build_object(
    'removed', true,
    'client_name', coalesce(v_name, 'membre'),
    'total_visits', v_total,
    'card_type', v_card.card_type,
    'card_used', v_used,
    'card_remaining', case when v_card.id is null then null else greatest(v_card.card_type - v_used, 0) end
  );
end;
$$;

revoke all on function public.bbc_remove_visit(uuid) from public;
grant execute on function public.bbc_remove_visit(uuid) to authenticated;
