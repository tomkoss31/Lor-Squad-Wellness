-- =============================================================================
-- daily_quotes — Phase A Co-pilote V5 Editoriale (2026-05-05)
--
-- Table de citations pour le widget Daily Boost du Co-pilote V5.
-- 5 catégories : lorsquad / mark-hughes / business / mindset / nutrition
-- Picking : hash(user_id + date) % weighted_array stable sur la journée.
--
-- Validations Thomas (2026-05-05) :
--   - Champ created_by uuid nullable (audit auteur)
--   - weight conservé pour random pondéré (1 = standard, 3 = priorité)
--   - active bool pour désactiver sans supprimer
-- =============================================================================

begin;

create table if not exists public.daily_quotes (
  id uuid primary key default gen_random_uuid(),
  quote text not null,
  author text,
  category text not null check (category in (
    'lorsquad', 'mark-hughes', 'business', 'mindset', 'nutrition'
  )),
  weight int not null default 1 check (weight >= 1 and weight <= 10),
  active boolean not null default true,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.daily_quotes is
  'Phase A Co-pilote V5 Editoriale (2026-05-05) : citations Daily Boost. '
  'Picking via hash(user_id + date) sur les rows actives, pondéré par weight.';

create index if not exists idx_daily_quotes_active_category
  on public.daily_quotes(active, category) where active = true;

-- ─── RLS ──────────────────────────────────────────────────────────────────
alter table public.daily_quotes enable row level security;

-- Lecture publique (tout user authentifié peut lire les quotes actives)
drop policy if exists "quotes_read_active" on public.daily_quotes;
create policy "quotes_read_active" on public.daily_quotes
  for select using (auth.uid() is not null and active = true);

-- Lecture admin (admin voit aussi les inactives pour modération)
drop policy if exists "quotes_admin_read_all" on public.daily_quotes;
create policy "quotes_admin_read_all" on public.daily_quotes
  for select using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

-- Write admin only (création/édition/suppression)
drop policy if exists "quotes_admin_write" on public.daily_quotes;
create policy "quotes_admin_write" on public.daily_quotes
  for all using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  ) with check (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

-- ─── Seed initial : 34 quotes ─────────────────────────────────────────────
-- Idempotent : insert seulement si la quote n'existe pas déjà (match sur quote text).
-- Permet de re-run la migration sans dupliquer.

insert into public.daily_quotes (quote, author, category, weight)
select * from (values
  -- lorsquad (8) — focus signature Lor'Squad, weight 2 sur les phares
  ('Ton corps est ton meilleur business card.', 'Lor''Squad', 'lorsquad', 2),
  ('Un distri qui consomme avant de vendre est un distri qui dure.', 'Lor''Squad', 'lorsquad', 2),
  ('Le bilan crée la confiance. Le suivi crée la fidélité.', 'Lor''Squad', 'lorsquad', 2),
  ('Sans Lor''Squad tu vends. Avec, tu construis.', 'Lor''Squad', 'lorsquad', 2),
  ('On ne sprint pas le 28 du mois — on construit chaque jour.', 'Lor''Squad', 'lorsquad', 1),
  ('Le distri qui fait son cobaye 21j ne ment plus jamais.', 'Lor''Squad', 'lorsquad', 1),
  ('Mon objectif n''est pas de te vendre. C''est de te projeter.', 'Lor''Squad', 'lorsquad', 1),
  ('Ta liste 100 vaut plus que tous les leads froids du monde.', 'Lor''Squad', 'lorsquad', 1),

  -- mark-hughes (5) — héritage, weight 1
  ('Le succès est le même pour tous chez Herbalife, indépendamment de la nationalité, de la religion ou des études.', 'Mark Hughes', 'mark-hughes', 1),
  ('Vous êtes des figures publiques, et Herbalife est l''image.', 'Mark Hughes', 'mark-hughes', 1),
  ('Use the products, wear the button, talk to people.', 'Mark Hughes', 'mark-hughes', 1),
  ('Si tu n''es pas ton propre meilleur résultat, qui l''est ?', 'Mark Hughes', 'mark-hughes', 1),
  ('Bien manger ne devrait pas être un luxe.', 'Mark Hughes', 'mark-hughes', 1),

  -- business (8)
  ('8 nouveaux + 4 récurrents + 1 coach par mois = President''s Team en 12 mois.', 'DMO 8-4-1', 'business', 2),
  ('3 invitations = 1 bilan. 2 bilans = 1 client. Le métier est simple, c''est la régularité qui est dure.', null, 'business', 2),
  ('1 client retenu vaut 7 nouveaux à acquérir.', null, 'business', 2),
  ('Reco systématique en fin d''EBE = 3× plus de RDV.', 'Lor''Squad', 'business', 1),
  ('Le haut volume PV n''est pas prospecter plus. C''est garder mieux et duppliquer.', null, 'business', 1),
  ('Tu ne perds pas un client, tu perds un système.', null, 'business', 1),
  ('Closer ce n''est pas convaincre, c''est révéler.', null, 'business', 1),
  ('Une vente sans suivi à J+1 = un client à 50 % de chance de rester.', null, 'business', 1),

  -- mindset (8)
  ('Ce que tu fais aujourd''hui peut améliorer tous tes lendemains.', 'Ralph Marston', 'mindset', 2),
  ('La discipline, c''est choisir aujourd''hui ce que tu veux demain.', null, 'mindset', 2),
  ('Tu deviens ce que tu fais tous les jours, pas ce que tu fais une fois.', null, 'mindset', 1),
  ('La régularité bat le talent quand le talent ne s''entraîne pas.', null, 'mindset', 1),
  ('Ton « pourquoi » doit être plus fort que ton « j''ai pas envie ».', null, 'mindset', 1),
  ('Le confort tue plus de rêves que l''échec.', null, 'mindset', 1),
  ('Le marathon se gagne au kilomètre 35, pas au kilomètre 1.', null, 'mindset', 1),
  ('La meilleure version de toi est en avance d''une habitude.', null, 'mindset', 1),

  -- nutrition (5)
  ('Ton corps répond toujours. La question c''est : tu lui parles avec quoi ?', null, 'nutrition', 2),
  ('Tu ne peux pas surmonter une mauvaise alimentation par 1h de sport.', null, 'nutrition', 1),
  ('Le petit-déj détermine 60 % de tes choix de la journée.', null, 'nutrition', 1),
  ('Hydratation = 35 mL × kg. Pas négociable.', null, 'nutrition', 1),
  ('Une cellule bien nourrie est une cellule qui dort bien.', null, 'nutrition', 1)
) as seed(quote, author, category, weight)
where not exists (
  select 1 from public.daily_quotes existing where existing.quote = seed.quote
);

commit;
