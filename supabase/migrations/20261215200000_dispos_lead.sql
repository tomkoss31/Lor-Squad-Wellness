-- =============================================================================
-- « Aucun horaire ne me va » — recuperer la contrainte au lieu de perdre la
-- personne.
--
-- LE CONSTAT (mesure du 19/08). Le tunnel /reserver perd 37 personnes sur 51 a
-- l'ecran des coordonnees, et sur les 17 qui laissent leurs coordonnees, 7
-- seulement reservent. Les creneaux du RDV decouverte vont de 9h a 14h, du
-- lundi au samedi. Sur les 6 vrais rendez-vous pris, QUATRE sont a 9h ou 10h —
-- le premier creneau du jour — et aucun n'a jamais ete pris a 13h. Quand les
-- gens s'entassent sur le creneau le plus tot, c'est le plus souvent qu'ils en
-- voudraient un avant.
--
-- Thomas ne veut PAS ouvrir 7h-8h avant l'ouverture du club le 7 septembre.
-- On ne devine donc pas la bonne plage : on la DEMANDE. La personne dit quand
-- elle peut, le lead arrive dans le CRM avec sa contrainte ecrite, le coach
-- rappelle. Rien n'est perdu, et au bout de quelques semaines les reponses
-- diront d'elles-memes quels creneaux manquent.
--
-- ⚠️ On ecrit dans `notes` A DESSEIN. La colonne existe depuis toujours et
-- n'a JAMAIS ete remplie (0 sur 27 fiches au 19/08) : un champ libre facultatif
-- ne se remplit pas tout seul cote coach. Rempli par le tunnel, il devient
-- enfin ce qu'il aurait toujours du etre — ce que la personne a dit d'elle.
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
  v_cree_le timestamptz;
  v_notes   text;
  v_texte   text;
begin
  -- Saisie PUBLIQUE, non authentifiee : on borne avant d'ecrire, jamais apres.
  -- Les caracteres de controle deviennent des espaces (un saut de ligne
  -- casserait l'affichage de la note dans la liste CRM), les espaces multiples
  -- sont reduits, et on coupe a 300 caracteres — de quoi dire « je ne peux que
  -- le samedi matin ou apres 18h », pas de quoi ecrire un roman.
  v_texte := regexp_replace(coalesce(p_texte, ''), '[[:cntrl:]]+', ' ', 'g');
  v_texte := btrim(regexp_replace(v_texte, '\s+', ' ', 'g'));
  v_texte := nullif(btrim(left(v_texte, 300)), '');
  if v_texte is null then return 'vide'; end if;

  select created_at, notes into v_cree_le, v_notes
    from public.prospect_leads where id = p_lead_id;
  if not found then return 'introuvable'; end if;

  -- Meme fenetre que `noter_provenance_lead` : passe un jour, plus personne
  -- n'est legitimement dans le tunnel en train de reserver.
  if v_cree_le < now() - interval '1 day' then return 'trop_tard'; end if;

  -- On AJOUTE a la note existante au lieu de la remplacer : le coach a pu
  -- ecrire quelque chose entre-temps, et ecraser sa note serait pire que de
  -- ne rien enregistrer.
  update public.prospect_leads
     set notes = case
                   when coalesce(v_notes, '') = '' then '🕑 Dispos indiquées : ' || v_texte
                   else v_notes || ' · 🕑 Dispos indiquées : ' || v_texte
                 end,
         -- Fait sonner la cloche du CRM tout de suite : cette personne vient
         -- de demander qu'on la rappelle, elle n'attend pas 24 h.
         relance_due_at = least(coalesce(relance_due_at, now()), now())
   where id = p_lead_id;

  return 'ok';
end $$;

comment on function public.noter_disponibilites_lead is
  'Enregistre les disponibilites dictees par un prospect qui ne trouve aucun creneau. Ecrit dans prospect_leads.notes et rend la relance due immediatement. Publique (le tunnel n''a pas de session), bornee en interne.';

grant execute on function public.noter_disponibilites_lead(uuid, text) to anon, authenticated;
