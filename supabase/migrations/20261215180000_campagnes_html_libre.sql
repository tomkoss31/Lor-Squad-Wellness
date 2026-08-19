-- =============================================================================
-- Campagnes — 3e type de contenu : « html » (gabarit libre).
--
-- POURQUOI : le compilateur maison (campaign-html.ts) impose l'identité
-- La Base 360 (header sombre #0B0D11, dégradé teal→violet) et ÉCHAPPE tout le
-- contenu (esc()). Impossible d'envoyer un email à l'identité Breakfast Club
-- (crème #FCF8F1 + orange→rouge), ni aucun gabarit conçu ailleurs.
--
-- Décision Thomas 2026-08-19, campagne d'ouverture BBC du 7 septembre : plutôt
-- que renoncer au design validé ou envoyer hors de l'app (ce qui perdrait le
-- tracking ET l'exclusion des désabonnés = manquement RGPD), on ouvre un mode
-- « HTML libre » qui CONSERVE tous les garde-fous de campaign-send :
--   - exclusion email_suppressions au moment de l'envoi ;
--   - lien de désabonnement injecté de force (voir campaign-html.ts) ;
--   - en-têtes List-Unsubscribe / One-Click ;
--   - envoi par lot résumable + tracking par destinataire.
--
-- SÉCURITÉ : le HTML est saisi par un ADMIN uniquement (RLS admin-only sur
-- campaigns + double contrôle role='admin' dans l'edge). Aucune surface
-- publique n'affiche ce HTML : il part par email, il n'est jamais rendu dans
-- l'app. Le risque XSS se limite donc à un admin contre lui-même.
-- =============================================================================

-- ─── 1. La colonne du gabarit libre ─────────────────────────────────────────
alter table public.campaigns
  add column if not exists body_html text not null default '';

comment on column public.campaigns.body_html is
  'type=''html'' : gabarit email complet fourni par l''admin. Le lien de désabonnement y est injecté à l''envoi (token {lien_desabonnement}, sinon ajout automatique d''un pied de page). Jamais rendu dans l''app, uniquement envoyé par email.';

-- ─── 2. Élargir le CHECK type ───────────────────────────────────────────────
-- Le nom de contrainte est généré par Postgres (campaigns_type_check) ; on le
-- retrouve dynamiquement pour ne pas dépendre d'un nom en dur.
do $$
declare
  v_constraint text;
begin
  select con.conname into v_constraint
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'campaigns'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%type%'
    and pg_get_constraintdef(con.oid) ilike '%rich%'
  limit 1;

  if v_constraint is not null then
    execute format('alter table public.campaigns drop constraint %I', v_constraint);
  end if;

  alter table public.campaigns
    add constraint campaigns_type_check
    check (type in ('rich', 'plain', 'html'));
end $$;
