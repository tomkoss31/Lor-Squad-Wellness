-- =============================================================================
-- Le nom de famille — il était là depuis le début, personne ne l'affichait.
--
-- Demande de Mélanie (19/08) : « ajouter le nom de famille des personnes ».
-- On croyait qu'il fallait le demander, puis qu'il était jeté. Les deux étaient
-- faux :
--   • `ReserverClubPage.tsx:487` le demande, et il est OBLIGATOIRE ;
--   • `submit-prospect-lead` le range dans `metadata.nom` — vérifié en base :
--     Catalano, Ducastelle, PERRIN, Legrand, Adeline, Daumail… tout y est ;
--   • mais AUCUN écran ne le lit, et `rdv_bookings` ne l'a jamais reçu (la RPC
--     ne le prend pas en paramètre).
--
-- Mélanie voit donc « claire », « Manon », « Marie Rose » et rouvre son email
-- pour savoir de qui il s'agit — alors que la donnée dort à côté.
--
-- ── POURQUOI UNE COLONNE PLUTÔT QUE LIRE `metadata` ────────────────────────
-- Parce que la clé N'EST PAS LA MÊME selon le tunnel : le site du club écrit
-- `metadata.nom`, le tunnel recrutement (`book-rdv`) écrit `metadata.last_name`.
-- Lire l'un ou l'autre selon la provenance à chaque écran, c'est la garantie
-- qu'un troisième tunnel arrivera avec une troisième clé. Une colonne, un seul
-- endroit où regarder.
--
-- ⚠️ On ne touche PAS aux signatures de `book_club_discovery` / `book_coach_rdv` :
-- ce sont elles qui portent le verrou anti-doublon du créneau. Les edges
-- écrivent le nom par un UPDATE juste après l'insert (le motif existe déjà pour
-- `google_event_id`). Un nom perdu vaut mieux qu'une réservation perdue.
-- =============================================================================

alter table public.prospect_leads add column if not exists last_name text;
alter table public.rdv_bookings  add column if not exists last_name text;

comment on column public.prospect_leads.last_name is
  'Nom de famille tel que la personne l''a tapé. Affiché via nomPropre() côté front, jamais retouché en base.';
comment on column public.rdv_bookings.last_name is
  'Nom de famille tel que la personne l''a tapé. Rempli par un UPDATE post-insert dans les edges de réservation.';

-- ── Rattrapage : ce qui dormait dans metadata remonte dans la colonne ───────
-- Les deux clés historiques, et rien d'autre : on ne DEVINE aucun nom (le
-- déduire d'une adresse email serait une supposition, pas une donnée).
update public.prospect_leads
   set last_name = nullif(trim(coalesce(metadata->>'nom', metadata->>'last_name')), '')
 where last_name is null
   and nullif(trim(coalesce(metadata->>'nom', metadata->>'last_name')), '') is not null;

-- Les réservations récupèrent le nom du lead qui porte le même email. Le lien
-- se fait sur `contact` : c'est la seule clé commune (il n'y a pas de lead_id
-- sur rdv_bookings). `distinct on` + tri par date : si la personne a réservé
-- deux fois, on prend le lead le plus récent.
update public.rdv_bookings b
   set last_name = l.last_name
  from (
    select distinct on (lower(trim(email))) lower(trim(email)) as mail, last_name, created_at
      from public.prospect_leads
     where email is not null and last_name is not null
     order by lower(trim(email)), created_at desc
  ) l
 where b.last_name is null
   and b.contact is not null
   and lower(trim(b.contact)) = l.mail;
