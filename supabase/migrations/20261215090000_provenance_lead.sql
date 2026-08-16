-- =============================================================================
-- « Comment tu as connu le club ? » — savoir d'où viennent les gens.
--
-- Le problème (Thomas, 16/08) : le QR du flyer est UNIQUE et déjà imprimé. Tous
-- les flyers portent la même adresse, donc le serveur reçoit exactement la même
-- chose que pour un lien Instagram. Aucune technique ne peut deviner que c'est
-- Mandy qui a distribué — il n'y a qu'une façon de le savoir : demander.
--
-- La question est posée APRÈS la réservation. Le rendez-vous est déjà pris à ce
-- moment-là : si la personne ne répond pas, on ne perd rien. Une question de
-- plus AVANT le créneau, c'est une occasion d'abandonner.
--
-- ⚠️ C'est une MENTION, pas une attribution. Décision Thomas : « simplement
-- rapporté par Mandy ». Le lead reste au club. Changer son propriétaire aurait
-- cassé trois choses (mesuré le 16/08) : le repérage des doublons s'éteint
-- (la RLS sépare les leads par propriétaire, et ce tunnel produit déjà des
-- fiches en triple), le lead sort de la vue par défaut des deux admins, et
-- Mandy n'a de toute façon aucune notification active.
-- =============================================================================

-- ── 1. Où on range la réponse ───────────────────────────────────────────────
-- Deux colonnes plutôt que du jsonb : c'est lu à chaque ligne de la liste CRM,
-- et `metadata` porte déjà six clés du tunnel club.
alter table public.prospect_leads
  add column if not exists provenance_canal   text,
  add column if not exists provenance_user_id uuid references public.users(id) on delete set null,
  add column if not exists provenance_at      timestamptz;

comment on column public.prospect_leads.provenance_canal is
  'Réponse à « comment tu as connu le club ? » : flyer | parle | reseaux | autre. NULL = pas répondu.';
comment on column public.prospect_leads.provenance_user_id is
  'Qui a rapporté cette personne. MENTION seulement — ne donne aucun droit et ne change pas le propriétaire du lead.';

-- Un seul index, sur ce qu'on va vraiment compter : « combien Mandy a-t-elle
-- rapporté ce mois-ci ». Partiel, parce que la colonne est vide la plupart du temps.
create index if not exists prospect_leads_provenance_idx
  on public.prospect_leads (provenance_user_id, provenance_at)
  where provenance_user_id is not null;

-- ── 2. La liste des prénoms proposée au public ──────────────────────────────
-- Prénom seul, comptes actifs seulement. Ces prénoms sont déjà publics : chaque
-- coach a sa page /coach/:slug. On n'expose ni email, ni téléphone, ni rôle.
create or replace function public.get_equipe_publique()
returns table (id uuid, prenom text)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select u.id,
         split_part(btrim(u.name), ' ', 1) as prenom
    from public.users u
   where u.active
     and u.role in ('distributor', 'admin', 'referent')
     and btrim(coalesce(u.name, '')) <> ''
   order by 2;
$$;

grant execute on function public.get_equipe_publique() to anon, authenticated;

-- ── 3. Poser la réponse sur le lead ─────────────────────────────────────────
create or replace function public.noter_provenance_lead(
  p_lead_id uuid,
  p_canal   text,
  p_qui     uuid default null
)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_cree_le timestamptz;
  v_deja    text;
begin
  -- Vocabulaire fermé : une valeur inventée ne doit pas entrer en base, sinon
  -- les compteurs racontent n'importe quoi (leçon `message_type`, 08/06).
  if p_canal is null or p_canal not in ('flyer', 'parle', 'reseaux', 'autre') then
    return 'canal_invalide';
  end if;

  select created_at, provenance_canal into v_cree_le, v_deja
    from public.prospect_leads
   where id = p_lead_id;

  if not found then return 'introuvable'; end if;

  -- Une seule réponse par lead : la fonction est publique (le tunnel n'a pas de
  -- session), donc elle ne doit pas pouvoir réécrire indéfiniment une fiche.
  if v_deja is not null then return 'deja_repondu'; end if;

  -- Et seulement dans la foulée de la réservation. Passé un jour, plus personne
  -- n'est légitimement sur l'écran de confirmation.
  if v_cree_le < now() - interval '1 day' then return 'trop_tard'; end if;

  update public.prospect_leads
     set provenance_canal   = p_canal,
         -- « Qui » n'a de sens que pour un flyer ou du bouche-à-oreille :
         -- personne ne distribue Instagram.
         provenance_user_id = case when p_canal in ('flyer', 'parle') then p_qui else null end,
         provenance_at      = now()
   where id = p_lead_id;

  return 'ok';
end $$;

grant execute on function public.noter_provenance_lead(uuid, text, uuid) to anon, authenticated;
