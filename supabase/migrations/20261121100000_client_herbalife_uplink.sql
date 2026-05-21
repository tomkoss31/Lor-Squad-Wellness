-- =============================================================================
-- Distri uplink Herbalife sur clients (2026-05-21)
--
-- Contexte : un coach (Mélanie) peut suivre un client (Stéphanie) qui chez
-- Herbalife est sous un autre distri (Ophélie, ancienne distri inactive
-- au rang Success Builder 42%). Sans override, la RPC calcule la marge
-- avec le rang du coach (Mélanie 50%) au lieu du rang de l'uplink HL
-- réel (Ophélie 42%) → surestimation du double.
--
-- Solution : 2 nouveaux champs sur clients :
--   - herbalife_uplink_user_id : référence vers un user de l'app
--     (ex: créer Ophélie comme user inactif avec son rang HL). Si
--     null → on retombe sur distributor_id (cas standard, coach = uplink).
--   - herbalife_uplink_label : texte libre pour info (nom de l'uplink
--     hors-app si pas créé comme user). Pas utilisé par la RPC.
--
-- Le calcul devient rétroactif : tous les pv_client_products du client
-- sont recalculés avec le rang de l'uplink dès la prochaine consultation.
-- =============================================================================

begin;

alter table public.clients
  add column if not exists herbalife_uplink_user_id uuid null references public.users(id) on delete set null,
  add column if not exists herbalife_uplink_label text null;

create index if not exists idx_clients_herbalife_uplink_user_id
  on public.clients(herbalife_uplink_user_id)
  where herbalife_uplink_user_id is not null;

comment on column public.clients.herbalife_uplink_user_id is
  'Chantier uplink HL (2026-05-21) : référence au user de l''app qui est le distri uplink Herbalife réel (paye le coût HL, touche la marge brute). NULL = coach app = uplink HL (cas standard). Utilisé par la RPC get_users_rentability pour calculer le distri_factor correct par client.';

comment on column public.clients.herbalife_uplink_label is
  'Chantier uplink HL (2026-05-21) : libellé libre de l''uplink HL hors-app (informatif, pas utilisé par les calculs).';

commit;
