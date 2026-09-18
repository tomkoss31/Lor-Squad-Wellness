-- Lot 1 (18/09/2026) — sécurité + santé de la base. Aucun écran touché.
-- Source : l'audit du 17/09 (carte n° 2). Réversible point par point, voir en bas.

-- 1. Les leads ne s'écrivent plus depuis Internet sans identité.
--    `prospect_leads_public_insert` et `online_bilans_public_insert` acceptaient
--    n'importe quel INSERT (WITH CHECK true, rôle public = anon compris) alors que
--    toutes les portes d'entrée passent par des edge functions en service_role
--    (submit-prospect-lead, submit-online-bilan, make-lead-entrant, book-rdv…).
--    Seule écriture directe côté app : le coupon d'une boîte de contact
--    (useBbcBoites.ts), fait par une coach connectée → policy authenticated.
drop policy if exists prospect_leads_public_insert on public.prospect_leads;
drop policy if exists online_bilans_public_insert on public.online_bilans;
create policy prospect_leads_insert_coach on public.prospect_leads
  for insert to authenticated with check (public.is_active_user());

-- 2. Les consentements RGPD : visibles seulement si on voit la cliente.
--    `client_consents_select_authenticated` était USING (true) : toute coach
--    connectée lisait les 56 consentements (client, coach, ip_hash, user_agent).
--    La sous-requête sur `clients` applique le RLS de `clients` (pas de
--    security definer) : « je vois le consentement si je vois la fiche ».
drop policy if exists client_consents_select_authenticated on public.client_consents;
create policy client_consents_select_visible on public.client_consents
  for select to authenticated
  using (
    public.is_admin()
    or coach_id = (select auth.uid())
    or exists (select 1 from public.clients c where c.id = client_consents.client_id)
  );

-- 3. `anon` ne peut plus INSÉRER nulle part, sauf les 3 tables où l'app cliente
--    (jeton, pas de JWT) écrit en direct sous une policy à jeton :
--    client_messages (msg_public_insert), client_referrals
--    (referral_via_valid_app_account), rdv_change_requests
--    (rdv_request_via_valid_app_account). Partout ailleurs le RLS bloquait déjà :
--    on retire la situation où une policy était la SEULE barrière.
--    Cf. CLAUDE.md § Sécurité, règle 3.
revoke insert on all tables in schema public from anon;
grant insert on public.client_messages, public.client_referrals, public.rdv_change_requests to anon;

-- 4. Le journal des tâches planifiées (cron.job_run_details) n'était JAMAIS purgé :
--    17 016 lignes / 9,6 Mo, la plus grosse table de la base (20 %). On garde
--    14 jours (assez pour diagnostiquer un gel comme le 29/07), purge chaque nuit.
delete from cron.job_run_details where start_time < now() - interval '14 days';
select cron.schedule(
  'purge-journal-cron',
  '35 3 * * *',
  $$delete from cron.job_run_details where start_time < now() - interval '14 days'$$
);

-- 5. Trois tâches HORAIRES pour des fonctions à l'arrêt (72 réveils du Nano par
--    jour) passent au quotidien / toutes les 6 h. Pas coupées, juste calmées.
--    formation-relay-to-admin : 0 progression depuis le 28/07 → 1×/jour
--    shop-relance-notifier   : boutique, 0 commande depuis le 07/08 → 1×/jour
--    stripe-manual-reconcile : 0 paiement depuis le 13/08 → toutes les 6 h
select cron.alter_job(jobid, schedule := '40 7 * * *') from cron.job where jobname = 'formation-relay-to-admin';
select cron.alter_job(jobid, schedule := '40 9 * * *') from cron.job where jobname = 'shop-relance-notifier';
select cron.alter_job(jobid, schedule := '50 */6 * * *') from cron.job where jobname = 'stripe-manual-reconcile';

-- Retour arrière, si besoin :
--   create policy prospect_leads_public_insert on public.prospect_leads for insert to public with check (true);
--   create policy online_bilans_public_insert on public.online_bilans for insert to public with check (true);
--   create policy client_consents_select_authenticated on public.client_consents for select to authenticated using (true);
--   grant insert on all tables in schema public to anon;
--   select cron.unschedule('purge-journal-cron');
--   anciens horaires : formation-relay-to-admin '25 * * * *' · shop-relance-notifier '40 * * * *' · stripe-manual-reconcile '50 * * * *'
