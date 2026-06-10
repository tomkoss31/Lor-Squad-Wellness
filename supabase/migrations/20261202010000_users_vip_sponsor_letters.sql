-- VIP-2/VIP-3 (2026-06-10) — colonne `vip_sponsor_letters` sur users.
--
-- Les 3 premières lettres du nom Herbalife du coach (ex : HOU pour Thomas),
-- demandées lors de l'inscription d'un Client Privilégié avec son ID sponsor.
-- Impossible à dériver du nom affiché (« Thomas » → THO ≠ HOU réel).
--
-- V1 : le front les stocke en localStorage (`ls-vip-sponsor-letters`).
-- Cette colonne permet la bascule serveur (wagon 2) : invitations correctes
-- depuis n'importe quel appareil + page publique /vip côté serveur.
--
-- Idempotent : ok à rejouer.

alter table public.users
  add column if not exists vip_sponsor_letters text null;

comment on column public.users.vip_sponsor_letters is
  '3 premières lettres du nom Herbalife (inscription Client Privilégié avec l''ID sponsor). Saisi dans Paramètres > Profil > Invitations Club VIP.';
