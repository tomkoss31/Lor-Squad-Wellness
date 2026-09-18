-- Livraison B du « club en cinq onglets » (18/09/2026) — « Contacter aujourd'hui ».
--
-- 1. `bbc_contacts` : chaque « et alors ? » du coach (qui, pourquoi, quelle réponse,
--    quand). C'est le compteur « 20 par jour » et l'historique. Remplace l'usage
--    détourné de `outreach_messages` (ex-Cobayes du jour) fait par la livraison A.
-- 2. `bbc_dernieres_visites()` : la dernière visite de chaque membre — il manquait
--    à l'app pour la règle « absente depuis 6 jours » (les 6 règles validées par
--    Thomas : lead pas appelé, absente 6 j, 9e visite, contente 3 semaines, reco
--    jamais contactée, relance à date). Même périmètre que `bbc_visit_counts` :
--    mes pointages, ou ceux du club dont je suis coach.

create table if not exists public.bbc_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  -- La cible, stable : "lead:<clé CRM>" ou "membre:<uuid>". Sert à retrouver « déjà fait ».
  cible text not null,
  prenom text not null,
  -- La règle qui l'a mise dans la liste (lead_nouveau, relance_due, absente, …).
  raison text not null,
  -- La réponse à « et alors ? » (clé CRM pour un lead : pas_de_reponse, rappellera…, ou un libellé).
  reponse text not null,
  fait_at timestamptz not null default now(),
  constraint bbc_contacts_reponse_courte check (char_length(reponse) <= 60)
);
create index if not exists bbc_contacts_user_jour on public.bbc_contacts (user_id, fait_at desc);

alter table public.bbc_contacts enable row level security;
revoke all on public.bbc_contacts from anon, authenticated;
grant select, insert on public.bbc_contacts to authenticated;

-- Mes contacts, et ceux de mon club (le compteur est personnel, mais la liste « déjà
-- fait aujourd'hui » vaut pour le comptoir : si Mélanie a appelé Camille, Thomas ne
-- la rappelle pas).
drop policy if exists bbc_contacts_select on public.bbc_contacts;
create policy bbc_contacts_select on public.bbc_contacts
  for select to authenticated
  using (public.is_active_user() and (user_id = (select auth.uid()) or public.est_coach_de_mon_club(user_id)));
drop policy if exists bbc_contacts_insert on public.bbc_contacts;
create policy bbc_contacts_insert on public.bbc_contacts
  for insert to authenticated
  with check (public.is_active_user() and user_id = (select auth.uid()));

create or replace function public.bbc_dernieres_visites()
returns table (client_id uuid, derniere_visite timestamptz, visites_30j bigint)
language sql
security definer
set search_path = public, extensions
as $$
  select v.client_id,
         max(v.visited_at) as derniere_visite,
         count(*) filter (where v.visited_at > now() - interval '30 days') as visites_30j
    from public.club_visits v
   where v.coach_user_id = (select auth.uid())
      or exists (
        select 1 from public.clients cl
         where cl.id = v.client_id and cl.club_id is not null and cl.club_id = public.bbc_mon_club()
      )
   group by v.client_id;
$$;
revoke all on function public.bbc_dernieres_visites() from public;
grant execute on function public.bbc_dernieres_visites() to authenticated;
