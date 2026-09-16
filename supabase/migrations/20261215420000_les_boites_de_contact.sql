-- =============================================================================
-- Les boites de contact chez les commercants (chantier BBC, 16/09/2026).
--
-- LE METIER. Des boites NUMEROTEES sont deposees chez des commercants. Les gens
-- y glissent un coupon papier « votre evaluation bien-etre offerte » (nom,
-- prenom, ville, telephone). Le coach releve la boite et saisit les coupons :
-- chaque coupon devient un LEAD du CRM, et le poseur gagne un COEUR quand la
-- personne demarre.
--
-- CE QU'ON NE CREE PAS, ET POURQUOI.
--   · Aucun nouveau systeme d'attribution : `prospect_leads` porte deja
--     `provenance_canal` / `provenance_user_id` / `provenance_libre` depuis le
--     chantier flyer du 16/08. C'est exactement « RAPPORTE PAR » — le credit
--     sans la propriete. Attribuer un lead de club a un distributeur eteint le
--     dedoublonnage et le sort de la vue par defaut des admins : on ne le fait
--     pas.
--   · Aucune touche a `client_referrals`. Sa seule policy d'insertion est
--     `client_app_account_is_valid(from_client_id, coach_id)` : elle n'accepte
--     que ce qui vient d'un jeton d'app MEMBRE. Un coach ne peut donc pas y
--     ecrire depuis son ecran, et lui ouvrir une porte pour ca reviendrait a
--     elargir une table sensible pour un besoin d'affichage. Le coeur du poseur
--     se compte donc sur les coupons dont l'issue est `demarre` — meme chiffre,
--     zero risque. Faire remonter ces coeurs dans la PWA du membre est un
--     chantier a part, a decider avec Thomas.
--
-- LE POSEUR PEUT ETRE DEUX CHOSES, et c'est la seule subtilite du schema : un
-- coach (`users.id`) ou un membre du club (`clients.id`). Deux colonnes
-- nullables plutot qu'un couple (type, id) : les cles etrangeres restent
-- verifiees par Postgres, et une contrainte impose qu'il y en ait exactement
-- une. Un poseur membre recoit un coeur ; un poseur coach recoit le credit du
-- lead et sa place au classement.
--
-- LA RELEVE NE SE SAISIT PAS. `last_collected_at` se met a jour toute seule a la
-- premiere saisie de coupon du jour. Une date de retrait prevue a l'avance
-- serait fausse des le deuxieme jour, et le bandeau « a relever » mentirait.
--
-- BASE PARTAGEE dev/prod : cette migration n'AJOUTE que des objets neufs. Elle
-- ne touche aucune table, aucune policy et aucune fonction existante.
-- =============================================================================

-- ── La boite ────────────────────────────────────────────────────────────────
create table if not exists public.contact_boxes (
  id                  uuid primary key default gen_random_uuid(),
  club_id             uuid not null references public.clubs (id) on delete cascade,
  number              smallint not null,
  merchant_name       text not null,
  place_detail        text,
  merchant_contact    text,
  city                text,
  -- Exactement l'un des deux (voir la contrainte plus bas).
  placed_by_user_id   uuid references public.users (id) on delete set null,
  placed_by_client_id uuid references public.clients (id) on delete set null,
  -- Fige le nom affiche : un poseur peut quitter l'equipe, le classement du
  -- mois passe ne doit pas se vider pour autant.
  placed_by_name      text not null,
  placed_at           timestamptz not null default now(),
  last_collected_at   timestamptz,
  removed_at          timestamptz,
  created_by          uuid not null references public.users (id) on delete cascade,
  created_at          timestamptz not null default now(),
  constraint contact_boxes_number_positif check (number > 0),
  constraint contact_boxes_un_seul_poseur check (
    (placed_by_user_id is not null)::int + (placed_by_client_id is not null)::int = 1
  )
);

comment on table public.contact_boxes is
  'Boites de contact numerotees deposees chez des commercants. Le poseur est soit un coach (placed_by_user_id) soit un membre du club (placed_by_client_id), jamais les deux.';

-- Le numero est ce qui est ECRIT sur le carton et PRE-IMPRIME sur ses bons :
-- deux boites vivantes ne peuvent pas le partager. Une boite retiree libere son
-- numero, d'ou l'index partiel.
create unique index if not exists contact_boxes_numero_vivant
  on public.contact_boxes (club_id, number)
  where removed_at is null;

create index if not exists contact_boxes_club
  on public.contact_boxes (club_id, removed_at);

-- ── Le coupon ───────────────────────────────────────────────────────────────
create table if not exists public.contact_box_coupons (
  id            uuid primary key default gen_random_uuid(),
  box_id        uuid not null references public.contact_boxes (id) on delete cascade,
  first_name    text not null,
  last_name     text,
  city          text,
  phone         text not null,
  -- Le lead du CRM : cree, ou RATTACHE a une fiche deja connue (meme telephone).
  -- Nullable parce que le coupon existe meme si l'ecriture du lead a echoue —
  -- on ne perd pas un papier deja dans la main du coach.
  lead_id       uuid references public.prospect_leads (id) on delete set null,
  called_at     timestamptz,
  outcome       text,
  created_by    uuid not null references public.users (id) on delete cascade,
  created_at    timestamptz not null default now(),
  constraint contact_box_coupons_outcome check (
    outcome is null or outcome in ('rdv', 'sans_reponse', 'pas_interesse', 'demarre')
  )
);

comment on table public.contact_box_coupons is
  'Un coupon papier releve dans une boite. Porte le lead CRM cree ou rattache, et le coeur du poseur quand celui-ci est un membre.';

create index if not exists contact_box_coupons_boite
  on public.contact_box_coupons (box_id, created_at desc);

-- Les coupons jamais appeles, c'est le bandeau de tete de l'ecran : une personne
-- a qui on a promis une evaluation PAR ECRIT et que personne ne rappelle est la
-- pire fuite du systeme.
create index if not exists contact_box_coupons_a_appeler
  on public.contact_box_coupons (created_at)
  where called_at is null;

-- ── Qui voit quoi ───────────────────────────────────────────────────────────
-- Meme regle que les faits du comptoir (migration du 08/09) : une boite
-- appartient au CLUB, pas a celui qui l'a posee. Quiconque travaille dans le
-- club la voit — sinon un coach ne pourrait pas saisir les coupons d'une boite
-- posee par un membre qu'il suit, ce qui est le cas le plus frequent.
-- `bbc_mon_club()` renvoie deja le club possede OU celui ou l'on travaille.
alter table public.contact_boxes enable row level security;
alter table public.contact_box_coupons enable row level security;

create policy contact_boxes_club on public.contact_boxes
  for all
  using (club_id is not null and club_id = public.bbc_mon_club())
  with check (club_id is not null and club_id = public.bbc_mon_club());

create policy contact_box_coupons_club on public.contact_box_coupons
  for all
  using (
    exists (
      select 1 from public.contact_boxes b
       where b.id = contact_box_coupons.box_id
         and b.club_id is not null
         and b.club_id = public.bbc_mon_club()
    )
  )
  with check (
    exists (
      select 1 from public.contact_boxes b
       where b.id = contact_box_coupons.box_id
         and b.club_id is not null
         and b.club_id = public.bbc_mon_club()
    )
  );

-- `anon` est en lecture seule sur tout le schema depuis l'audit du 29/07, mais
-- un REVOKE n'est PAS retroactif : une table creee apres nait avec le droit.
-- On le retire donc explicitement ici, TRUNCATE compris (il contourne le RLS).
revoke all on public.contact_boxes from anon;
revoke all on public.contact_box_coupons from anon;
revoke truncate, delete, update on public.contact_boxes from authenticated;
revoke truncate on public.contact_box_coupons from authenticated;
grant select, insert, update, delete on public.contact_boxes to authenticated;
grant select, insert, update, delete on public.contact_box_coupons to authenticated;
