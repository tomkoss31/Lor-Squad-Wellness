-- =============================================================================
-- Chantier #3 — Polish V2 (2026-05-17 soir, après feedback Thomas "bâclé").
--
-- Compléments par rapport au mockup `prospection-internationale.html` :
--   1. Colonne `prospection_scripts.kind` : type de script
--      (first_contact / j3_followup / referral / direct / pitch).
--   2. Colonne `prospection_scripts.label` : label détaillé style
--      "Instagram DM · Premier contact" (UI plus claire qu'un simple
--      "Instagram").
--   3. Colonne `prospection_scripts.language_label` : libellé langue
--      (ex: "🇫🇷 Français", "🇮🇳 Hinglish (Hindi en Latin)").
--   4. Nouvelle table `prospection_market_tips` : timing + tip culturel
--      par marché, affichée en tête de l'étape 4 (le coach voit immédiatement
--      les créneaux optimaux et les codes culturels avant de copier-coller).
--   5. UPDATE des scripts existants pour poser kind/label/language_label
--      (les scripts position=2 deviennent automatiquement kind=j3_followup).
-- =============================================================================

begin;

-- ─── 1. Nouvelles colonnes scripts ──────────────────────────────────────────
alter table public.prospection_scripts
  add column if not exists kind text not null default 'first_contact'
    check (kind in ('first_contact', 'j3_followup', 'referral', 'direct', 'pitch')),
  add column if not exists label text,
  add column if not exists language_label text;

comment on column public.prospection_scripts.kind is
  'Chantier #3 V2 — Type de script. first_contact = premier message à froid. j3_followup = relance soft à J+3. referral = message après recommandation. direct = contact direct (WhatsApp tiède). pitch = pitch business plus complet.';

comment on column public.prospection_scripts.label is
  'Chantier #3 V2 — Label détaillé affiché sur la card (ex: "Instagram DM · Premier contact" vs juste "Instagram"). Permet de distinguer plusieurs scripts pour la même (marché × profil × plateforme).';

comment on column public.prospection_scripts.language_label is
  'Chantier #3 V2 — Libellé langue avec drapeau pour l''UI (ex: "🇫🇷 Français", "🇮🇳 Hinglish (Hindi en Latin)").';

-- ─── 2. Update kind = j3_followup pour scripts en position 2 ────────────────
update public.prospection_scripts set kind = 'j3_followup' where position = 2;

-- Scripts whatsapp avec mention referral/lead chaud (extrait du mockup)
update public.prospection_scripts set kind = 'referral'
  where platform = 'whatsapp' and position = 1
    and (
      (market_code = 'en' and profile_slug = 'weight')   -- "Mutual contact told me about you"
      or (market_code = 'es' and profile_slug = 'business')
      or (market_code = 'pt' and profile_slug = 'business')
    );

-- LinkedIn business = pitch corporate
update public.prospection_scripts set kind = 'pitch' where platform = 'linkedin';

-- ─── 3. Population des labels FR ────────────────────────────────────────────
-- Format : "<Plateforme> <variante> · <Contexte>"
update public.prospection_scripts set
  label = case
    when platform = 'insta'    and kind = 'first_contact' then 'Instagram DM · Premier contact'
    when platform = 'insta'    and kind = 'j3_followup'   then 'Instagram DM · Relance J+3'
    when platform = 'fb'       and kind = 'first_contact' then 'Facebook Messenger · Premier contact'
    when platform = 'fb'       and kind = 'j3_followup'   then 'Facebook Messenger · Relance J+3'
    when platform = 'whatsapp' and kind = 'referral'      then 'WhatsApp · Après recommandation'
    when platform = 'whatsapp' and kind = 'first_contact' then 'WhatsApp · Contact direct'
    when platform = 'whatsapp' and kind = 'j3_followup'   then 'WhatsApp · Relance J+3'
    when platform = 'telegram' and kind = 'first_contact' then 'Telegram · Premier contact'
    when platform = 'linkedin' and kind = 'pitch'         then 'LinkedIn · Pitch business'
    when platform = 'linkedin' and kind = 'first_contact' then 'LinkedIn · Premier contact'
    when platform = 'sms'      and kind = 'first_contact' then 'SMS · Court & posé'
    else null
  end
where label is null;

-- ─── 4. Population des language_label ───────────────────────────────────────
update public.prospection_scripts set
  language_label = case market_code
    when 'fr' then '🇫🇷 Français'
    when 'en' then '🇬🇧 English'
    when 'es' then '🇲🇽 Español'
    when 'pt' then '🇧🇷 Português (BR)'
    when 'tr' then '🇹🇷 Türkçe'
    when 'hi' then '🇮🇳 Hinglish / English'
    else market_code
  end
where language_label is null;

-- ─── 5. Table prospection_market_tips (timing + conseils culturels) ─────────
create table if not exists public.prospection_market_tips (
  market_code     text primary key references public.prospection_markets(code) on delete cascade,
  language_label  text not null,
  timing          text not null,
  cultural_tip    text not null,
  updated_at      timestamptz not null default now()
);

comment on table public.prospection_market_tips is
  'Chantier #3 V2 — Conseils culturels et créneaux horaires optimaux par marché. Affichés en tête de l''étape Messages.';

alter table public.prospection_market_tips enable row level security;

drop policy if exists "prospection_market_tips_select_public" on public.prospection_market_tips;
drop policy if exists "prospection_market_tips_admin_write" on public.prospection_market_tips;

create policy "prospection_market_tips_select_public"
  on public.prospection_market_tips for select to anon, authenticated using (true);

create policy "prospection_market_tips_admin_write"
  on public.prospection_market_tips for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ─── 6. Seed market_tips (depuis le mockup, données validées Thomas) ────────
insert into public.prospection_market_tips (market_code, language_label, timing, cultural_tip) values
  ('fr', 'Français',
   '⏰ Optimal : lundi-jeudi 12h-14h ou 19h-21h. Éviter dimanche.',
   '🇫🇷 Tutoiement OK Insta/FB, vouvoiement LinkedIn. Pas trop d''emojis pro.'),
  ('en', 'English',
   '⏰ Optimal : adapter au fuseau cible. US East 9h-11h ou 19h-21h EST.',
   '🌍 Plateforme : Insta + LinkedIn. EN passe-partout pour profils intl mal géolocalisés.'),
  ('es', 'Español (LatAm + Espagne)',
   '⏰ Optimal : Mexique 10h-12h ou 20h-22h CDT. Espagne idem CET +0.',
   '🇲🇽 WhatsApp DOMINANT en LatAm. Privilégier après 1er contact Insta.'),
  ('pt', 'Português (BR)',
   '⏰ Optimal : Brésil 11h-13h ou 19h-22h BRT. Vendredi soir = jackpot.',
   '🇧🇷 WhatsApp obligatoire après contact. Ton CHALEUREUX, pas formel.'),
  ('tr', 'Türkçe',
   '⏰ Optimal : 11h-14h ou 21h-23h TRT. Soirée = forte engagement.',
   '🇹🇷 Marché Herbalife très actif. Diaspora Allemagne 5M.'),
  ('hi', 'Hinglish / English',
   '⏰ Optimal : 9h-11h ou 21h-23h IST. Diwali / festivals = peak.',
   '🇮🇳 WhatsApp #1 (700M users). Hinglish (Hindi en Latin) sur Insta/WA.')
on conflict (market_code) do update set
  language_label = excluded.language_label,
  timing = excluded.timing,
  cultural_tip = excluded.cultural_tip,
  updated_at = now();

-- ─── 7. Astuce hashtags par profil (réutilise prospection_profiles) ─────────
alter table public.prospection_profiles
  add column if not exists hashtag_advice text;

update public.prospection_profiles set hashtag_advice = case slug
  when 'weight'   then 'Croise 2 hashtags (ex : #pertedepoidsfr + #mamanquisebouge). Plus précis = profil plus chaud. Évite les hashtags trop génériques comme #fit qui ratissent large.'
  when 'sport'   then 'Croise un hashtag sport + un hashtag discipline (ex : #crossfitfrance + #musculationfr). Cherche les comptes < 5k followers : plus engagés, moins sollicités.'
  when 'business' then 'Croise un hashtag entrepreneuriat + un hashtag lifestyle (ex : #sidehustle + #mompreneur). Privilégie LinkedIn pour les profils corporate.'
  else null
end
where hashtag_advice is null;

commit;
