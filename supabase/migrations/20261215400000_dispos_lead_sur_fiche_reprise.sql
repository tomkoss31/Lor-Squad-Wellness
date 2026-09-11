-- =============================================================================
-- « trop_tard » sur une fiche qu'on vient de reprendre — le garde-fou de
-- noter_disponibilites_lead ne connaissait qu'un seul cas.
--
-- LE CONSTAT (10-11/09/2026, cas Justine Santos). `submit-prospect-lead`
-- reconnaît depuis le 24/08 une personne qui revient et REPREND sa fiche
-- existante au lieu d'en créer une deuxième (cf. migration doublons CRM).
-- Mais `noter_disponibilites_lead` juge encore la fraîcheur d'une saisie sur
-- le SEUL `created_at` de la fiche :
--
--   if v_cree_le < now() - interval '1 day' then return 'trop_tard'; end if;
--
-- Une personne qui revient trois semaines après sa première visite du site
-- reprend une fiche vieille de trois semaines. Le tunnel vient de lui dire
-- « on va vous rappeler », elle tape SES disponibilités — et la RPC les
-- refuse en silence : `trop_tard`, rien n'est écrit, elle voit une erreur
-- générique. Justine a été sauvée par un hasard : sa fiche de retour créait
-- encore un DOUBLON (le dédoublonnage n'était pas déployé en prod, cf.
-- reference_deploy_edge_function) donc sa fiche était neuve. Le jour où ce
-- doublon disparaît vraiment, ce filet disparaît avec lui.
--
-- ── LE FIX ───────────────────────────────────────────────────────────────
-- `submit-prospect-lead` pose TOUJOURS `relance_due_at = now()` au moment
-- même où il reprend une fiche (branche « reprise »). C'est une empreinte de
-- fraîcheur bien plus fiable que `created_at` : elle dit « quelqu'un vient
-- d'interagir avec CETTE fiche », que la fiche ait 2 minutes ou 2 mois.
--
-- La règle devient : la saisie est acceptée si la fiche est jeune (création
-- < 1 jour, cas normal du tunnel) OU si sa relance vient d'être posée dans
-- les 10 dernières minutes (cas d'une reprise fraîche). Le garde-fou garde
-- son rôle — empêcher qu'un id de fiche qui traîne serve à spammer `notes`
-- indéfiniment — sans plus jamais confondre l'âge de la PERSONNE dans le CRM
-- avec l'âge de SA DÉMARCHE du jour.
-- =============================================================================

create or replace function public.noter_disponibilites_lead(
  p_lead_id uuid,
  p_texte   text
)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_cree_le        timestamptz;
  v_relance_due_at timestamptz;
  v_notes          text;
  v_texte          text;
begin
  v_texte := regexp_replace(coalesce(p_texte, ''), '[[:cntrl:]]+', ' ', 'g');
  v_texte := btrim(regexp_replace(v_texte, '\s+', ' ', 'g'));
  v_texte := nullif(btrim(left(v_texte, 300)), '');
  if v_texte is null then return 'vide'; end if;

  select created_at, notes, relance_due_at
    into v_cree_le, v_notes, v_relance_due_at
    from public.prospect_leads where id = p_lead_id;
  if not found then return 'introuvable'; end if;

  -- Fenêtre élargie : fiche jeune (tunnel normal) OU relance posée à l'instant
  -- par submit-prospect-lead au moment de la reprise (personne qui revient).
  if v_cree_le < now() - interval '1 day'
     and (v_relance_due_at is null or v_relance_due_at < now() - interval '10 minutes')
  then
    return 'trop_tard';
  end if;

  update public.prospect_leads
     set notes = case
                   when coalesce(v_notes, '') = '' then '🕑 Dispos indiquées : ' || v_texte
                   else v_notes || ' · 🕑 Dispos indiquées : ' || v_texte
                 end,
         relance_due_at = least(coalesce(relance_due_at, now()), now())
   where id = p_lead_id;

  return 'ok';
end $$;

comment on function public.noter_disponibilites_lead is
  'Enregistre les disponibilites dictees par un prospect qui ne trouve aucun creneau. Ecrit dans prospect_leads.notes et rend la relance due immediatement. Accepte une fiche jeune (< 1 jour) OU fraichement reprise (relance_due_at posee par submit-prospect-lead il y a < 10 min) : une personne qui REVIENT ne doit pas etre bloquee par l''age de sa premiere visite. Publique (le tunnel n''a pas de session), bornee en interne.';
