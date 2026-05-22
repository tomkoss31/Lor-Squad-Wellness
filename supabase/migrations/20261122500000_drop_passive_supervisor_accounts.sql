-- =============================================================================
-- Drop passive_supervisor_accounts table (chantier Passive Light V2 2026-05-22)
--
-- L'approche magic link était trop limitée (UX bancale, pas de password reset).
-- Pivot vers Option B : un Supervisor passif = vrai compte distri avec email +
-- password classiques + interface simplifiée (sidebar light, pas de fiches
-- clients). Le flag users.is_passive_supervisor reste — c'est lui qui pilote
-- l'UI passive.
--
-- Cleanup :
--   - Drop table passive_supervisor_accounts (tokens magic link obsolètes)
--   - Les auth.users synthétiques (email *@passive.labase360.local) sont
--     supprimés via un DELETE manuel (impossible en migration car auth.users
--     n'est pas public). À faire avant de pousser cette migration en prod
--     si pas déjà fait via SQL direct.
-- =============================================================================

drop table if exists public.passive_supervisor_accounts cascade;
