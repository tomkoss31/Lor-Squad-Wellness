-- =============================================================================
-- Journal nutritionnel — lots 2 et 3 (21/09/2026), sans la photo (Thomas :
-- « photo on garde pour un prochain »).
--
-- LOT 2 · NOALY LIT UN REPAS ÉCRIT. « 150 g de poulet, des carottes et des
-- pâtes » → l'edge `journal-noaly` (Claude Sonnet 5) propose des lignes DU
-- CATALOGUE ; la membre les relit, en retire si besoin, puis
-- `journal_ajouter_lot` les écrit d'un coup (origine 'noaly'). Les protéines
-- sont RECALCULÉES ici depuis le catalogue, exactement comme `journal_ajouter` :
-- l'IA choisit l'aliment et la quantité, jamais le chiffre.
-- Le « mot de Noaly » des conseils est gardé sur la journée (conseil_noaly +
-- conseil_empreinte) : rouvrir la feuille sans rien changer ne rappelle pas
-- l'IA — c'est instantané et ça ne coûte rien.
--
-- LOT 3 · LE RAPPEL DE 20 H. L'edge `journal-rappel` envoie une notification à
-- celles qui se servent de leur journal (une ligne à elles dans les 7 jours
-- d'avant) et qui n'ont encore rien noté ce jour-là — le petit-déj pré-rempli
-- par le club ne compte pas. `journal_rappel_cibles()` fait le tri en une
-- requête (pas de liste à paginer côté robot) ; `journal_rappels_envoyes`
-- empêche le doublon. Le cron est posé À PART, une fois le texte validé.
-- =============================================================================

-- ─── Lot 2 : écrire plusieurs lignes d'un coup ───────────────────────────────
create or replace function public.journal_ajouter_lot(
  p_token text, p_jour date, p_creneau text, p_lignes jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_client uuid := public._journal_client(p_token);
  v_jour   date := public._journal_jour(p_jour);
  e        jsonb;
  a        public.journal_aliments%rowtype;
  v_q      int;
  v_g      numeric;
  v_prot   numeric;
  v_gains  jsonb;
begin
  if p_creneau is null or p_creneau not in ('pdj','enc1','dej','enc2','din','aut') then
    raise exception 'creneau inconnu'; end if;
  if p_lignes is null or jsonb_typeof(p_lignes) <> 'array'
     or jsonb_array_length(p_lignes) not between 1 and 12 then
    raise exception 'lignes invalides'; end if;
  -- Tout ou rien : une ligne fausse annule le lot entier (l'exception défait tout).
  for e in select * from jsonb_array_elements(p_lignes) loop
    select * into a from public.journal_aliments where cle = e->>'aliment' and actif;
    if not found then raise exception 'aliment inconnu'; end if;
    if a.prot_portion is not null then
      v_g := null;
      v_q := greatest(1, least(5, coalesce((e->>'quantite')::int, 1)));
      v_prot := a.prot_portion * v_q;
    else
      v_q := 1;
      v_g := round(coalesce((e->>'grammes')::numeric, 0), 1);
      if v_g < 1 or v_g > 2000 then raise exception 'quantite invalide'; end if;
      v_prot := round(a.prot_100g * v_g / 100, 1);
    end if;
    insert into public.journal_lignes (client_id, jour, creneau, aliment, libelle, grammes, quantite, prot_g, origine)
    values (v_client, v_jour, p_creneau, a.cle, a.nom, v_g, v_q, v_prot, 'noaly');
  end loop;
  v_gains := public._journal_defis(p_token, v_client);
  return public._journal_etat(v_client, v_jour) || jsonb_build_object('gains', v_gains);
end;
$$;
grant execute on function public.journal_ajouter_lot(text, date, text, jsonb) to anon, authenticated;

-- Le mot de Noaly du jour, et l'empreinte de la journée qu'il décrivait.
alter table public.journal_jours
  add column if not exists conseil_noaly     text,
  add column if not exists conseil_empreinte text;

-- ─── Lot 3 : le rappel de 20 h ───────────────────────────────────────────────
create table if not exists public.journal_rappels_envoyes (
  client_id uuid not null references public.clients(id) on delete cascade,
  jour      date not null,
  envoye_le timestamptz not null default now(),
  primary key (client_id, jour)
);
alter table public.journal_rappels_envoyes enable row level security;
revoke all on public.journal_rappels_envoyes from anon, authenticated;
-- Aucune policy : seul le robot (service_role) lit et écrit cette table.

-- Qui reçoit le rappel ce soir. Rend le JETON de l'espace membre (le lien de la
-- notification) : jamais exécutable par anon ni authenticated.
create or replace function public.journal_rappel_cibles()
returns table (client_id uuid, jeton uuid, prenom text)
language sql stable security definer set search_path = public, extensions as $$
  with auj as (select (now() at time zone 'Europe/Paris')::date as d)
  select c.id, acc.token, coalesce(nullif(btrim(c.first_name), ''), acc.client_first_name)
    from public.clients c
    cross join auj
    join lateral (
      select a.token, a.client_first_name
        from public.client_app_accounts a
       where a.client_id = c.id::text              -- text vs uuid : le cast sûr (CLAUDE.md)
         and (a.expires_at is null or a.expires_at > now())
       order by a.created_at desc
       limit 1) acc on true
   where exists (select 1 from public.client_push_subscriptions s where s.client_id = c.id)
     -- elle se sert de son journal : une ligne à elle dans les 7 jours d'avant
     and exists (select 1 from public.journal_lignes l
                  where l.client_id = c.id and l.jour between auj.d - 7 and auj.d - 1
                    and l.origine in ('membre', 'noaly'))
     -- et elle n'a encore rien noté aujourd'hui (le pré-rempli du club ne compte pas)
     and not exists (select 1 from public.journal_lignes l
                      where l.client_id = c.id and l.jour = auj.d and l.origine <> 'club')
     and not exists (select 1 from public.journal_jours j
                      where j.client_id = c.id and j.jour = auj.d
                        and (j.verres > 0 or j.activite is not null))
     and not exists (select 1 from public.journal_rappels_envoyes r
                      where r.client_id = c.id and r.jour = auj.d);
$$;
revoke all on function public.journal_rappel_cibles() from public, anon, authenticated;
grant execute on function public.journal_rappel_cibles() to service_role;
