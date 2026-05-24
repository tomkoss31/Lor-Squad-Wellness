-- =============================================================================
-- Chantier #8 étape 8.12 (2026-05-24) — Seed 1ère newsletter + announcement.
-- =============================================================================
--
-- Update du brouillon seed "Préparation été" avec le contenu complet du
-- mockup docs/mockups/newsletter-mai-juin.html (6 sections riches).
--
-- + Announcement in-app pour signaler la livraison du chantier aux distri
--   (cf. règle "livrable complet" CLAUDE.md).
--
-- Idempotent : ok à rejouer.
-- =============================================================================

-- ─── 1. Update brouillon Préparation été avec sections riches ────────────────
update public.newsletters
set
  title = 'L''été arrive. Prépare ton corps en douceur.',
  subtitle = 'Hydratation, repas légers, voyages, peau et mouvement — tout pour bien préparer ta saison sans te prendre la tête.',
  template_key = 'summer-prep',
  body_json = jsonb_build_object('sections', jsonb_build_array(
    jsonb_build_object(
      'id', 'sec-summer-1',
      'emoji', '💧',
      'tag_label', 'Conseil #1 · Hydratation',
      'title', 'L''eau, ton meilleur partenaire d''été',
      'body_md', E'Quand les températures grimpent, ton corps perd jusqu''à 1,5 L d''eau par heure rien qu''en transpirant. La déshydratation s''installe sans bruit : maux de tête, fatigue, baisse de concentration.\n\n- **1,5 à 2 L par jour minimum**, plus si tu bouges ou s''il fait très chaud\n- Bois **par petites gorgées régulières**, pas 1 L d''un coup\n- Évite les boissons trop sucrées : elles déshydratent au lieu d''hydrater\n- Ajoute citron, menthe, concombre pour le goût et les minéraux',
      'saviez_vous_md', 'Avoir soif = être déjà légèrement déshydraté. Anticipe en buvant régulièrement, même sans soif.',
      'saviez_vous_label', 'Le saviez-vous ?',
      'is_public', true,
      'show_cta_bilan', false,
      'paywall_mode', 'none',
      'position', 1
    ),
    jsonb_build_object(
      'id', 'sec-summer-2',
      'emoji', '🌿',
      'tag_label', 'Conseil #2 · Bien-être interne',
      'title', 'L''aloe vera, ton allié de l''été',
      'body_md', E'Plante connue depuis des millénaires, l''aloe vera est composée à **95 % d''eau** et concentre une richesse rare en vitamines (A, C, E, B12) et minéraux. C''est l''un des compagnons les plus malins quand il fait chaud.\n\n- **Hydratation profonde** qui vient en complément de l''eau pure\n- **Soutien digestion** grâce aux enzymes naturelles\n- **Effet apaisant** sur le système digestif (utile en voyage)\n- **Goût neutre** : se mélange à l''eau, dans une infusion ou un smoothie\n\nL''astuce : 30 ml de concentré d''aloe dilués dans 1 L d''eau, à boire tout au long de la journée.',
      'saviez_vous_md', 'Chez La Base 360, nous accompagnons nos clients avec les produits Herbalife Nutrition. Leur **Herbal Aloe Concentrate** fait partie de nos références préférées de l''été — simple à utiliser au quotidien.',
      'saviez_vous_label', 'Côté coach 👋',
      'is_public', true,
      'show_cta_bilan', false,
      'paywall_mode', 'none',
      'position', 2
    ),
    jsonb_build_object(
      'id', 'sec-summer-3',
      'emoji', '🥗',
      'tag_label', 'Conseil #3 · Alimentation',
      'title', '3 idées de repas légers en 10 minutes',
      'body_md', E'Les jours longs et la chaleur coupent l''appétit. Privilégie des plats **frais, riches en eau et faciles à digérer**.\n\n- **Bowl avocat-pois chiches** : avocat, pois chiches, tomates cerise, feta, basilic, citron, huile d''olive\n- **Tartare de courgette-saumon** : courgette crue en dés, saumon fumé, aneth, pignons grillés\n- **Salade de pastèque-feta-menthe** : pastèque, feta émiettée, menthe fraîche, pistaches, vinaigre balsamique\n\nLa règle : plus c''est coloré, plus c''est nourrissant.',
      'saviez_vous_md', '',
      'saviez_vous_label', '',
      'is_public', true,
      'show_cta_bilan', true,
      'paywall_mode', 'none',
      'position', 3
    ),
    jsonb_build_object(
      'id', 'sec-summer-4',
      'emoji', '✈️',
      'tag_label', 'Conseil #4 · Voyage',
      'title', 'Voyage à l''étranger : prépare ton intestin',
      'body_md', E'Changer de pays, c''est aussi changer la flore intestinale. Eau différente, épices nouvelles, hygiène variable : ton ventre peut faire la grève.\n\n- **Probiotiques** : commence 5 à 7 jours avant le départ et continue pendant le séjour\n- **Eau en bouteille** uniquement dans les pays à risque (et pour te brosser les dents)\n- **Lave les fruits** à l''eau bouillie ou pèle-les systématiquement\n- **Évite** glaçons, salades crues, aliments tièdes des buffets',
      'saviez_vous_md', 'Petit clin d''œil : c''est en Égypte que cette newsletter a été préparée. Et oui, ça marche 😉',
      'saviez_vous_label', 'Anecdote',
      'is_public', true,
      'show_cta_bilan', false,
      'paywall_mode', 'none',
      'position', 4
    ),
    jsonb_build_object(
      'id', 'sec-summer-5',
      'emoji', '☀️',
      'tag_label', 'Conseil #5 · Soin extérieur',
      'title', 'Prends soin de ta peau, dehors aussi',
      'body_md', E'L''été, ta peau encaisse : soleil, sel, chlore, climatisation. Sans soin, elle se déshydrate, marque, vieillit prématurément. Une bonne routine quotidienne change tout.\n\nUne routine en 3 gestes simples :\n\n- **Matin** : nettoie en douceur, hydrate, protège (SPF 30 min)\n- **Après plage / piscine** : rince à l''eau douce, applique une lotion apaisante\n- **Soir** : démaquille, hydrate avec une crème nourrissante\n\nLes ingrédients à privilégier : **aloe vera** (oui encore lui), beurre de karité, vitamine E, huile d''argan.',
      'saviez_vous_md', 'La gamme **Herbalife SKIN** que nous utilisons propose une lotion hydratante quotidienne (matin / soir) à base d''aloe et de vitamines — testée et approuvée par notre équipe pour l''été.',
      'saviez_vous_label', 'Côté coach 🤭',
      'is_public', true,
      'show_cta_bilan', false,
      'paywall_mode', 'none',
      'position', 5
    ),
    jsonb_build_object(
      'id', 'sec-summer-6',
      'emoji', '💪',
      'tag_label', 'Conseil #6 · Mouvement',
      'title', 'Bouger en vacances, sans s''épuiser',
      'body_md', E'Tu pars en vacances et tu veux maintenir ton énergie sans transformer ton séjour en stage commando ? Voici une routine simple, **15 minutes par jour**, qui s''adapte à n''importe quel hôtel, plage ou jardin…\n\n- Réveil articulaire (8 mouvements clés pour…)\n- Cardio doux (natation, marche rapide, vélo…)\n- […]',
      'saviez_vous_md', '',
      'saviez_vous_label', '',
      'is_public', false,
      'show_cta_bilan', false,
      'paywall_mode', 'teaser',
      'position', 6
    )
  ))
where slug = 'preparation-ete-2026' and status = 'draft';

-- ─── 2. Announcement pour les distri (règle livrable complet CLAUDE.md) ──────
insert into public.app_announcements
  (title, body, emoji, accent, link_path, link_label, audience, published_at)
values
  (
    'Newsletter "La Base 360 News" est live 📰',
    E'Nouveau chantier livré : la newsletter bi-mensuelle La Base 360 News.\n\n• Édite tes éditions depuis /admin/newsletters\n• Sections riches (emoji, tag, body, callout, CTA Bilan, paywall)\n• Distribution Resend aux clients + distri + page publique /news/:slug\n• Stats tracking (envois / opens / clicks)\n• OG image pour partage social (WhatsApp, FB, Insta)\n\nLa 1ère édition "Préparation été" est prête à éditer.',
    '📰',
    'gold',
    '/admin/newsletters',
    'Ouvrir l''admin',
    'all',
    now()
  )
on conflict do nothing;
