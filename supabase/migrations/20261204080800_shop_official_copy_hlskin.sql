-- =============================================================================
-- Boutique HL SKIN — copy officielle + corrections gamme (2026-07-11)
-- =============================================================================
--
-- Applique les textes officiels des fiches produits Herbalife sur les 6 produits
-- (taglines / descriptions / bénéfices / ingrédient héros / mode d'emploi / FAQ),
-- réaligne `concern` sur les 3 catégories officielles (eclat / hydratation / age)
-- et CORRIGE le Collagen : Verisol® P d'origine PORCINE (et non « marin »).
--
-- Aussi : autorise video/mp4 dans le bucket product-images (hero vidéo boutique)
-- + branche les packshots (frames « sans texte ») sur 3 produits.
-- Idempotent (UPDATE par slug). Cf. reference_hlskin_produits + CLAUDE.md.
-- =============================================================================

begin;

-- ── Éclat & Luminosité ──────────────────────────────────────────────────────
update public.shop_products set
  concern='eclat', badge='best-seller',
  tagline=$$Renforce la barrière cutanée et sublime l'éclat, pour un teint frais et lumineux.$$,
  description=$$Sérum à base d'eau inspiré de l'expertise coréenne. 10 % de niacinamide + vitamine B5 + glycérine pour uniformiser le teint, renforcer la barrière cutanée et retenir l'hydratation. Texture légère qui agit toute la journée. Testé dermatologiquement et ophtalmologiquement.$$,
  ingredient_hero=$$Niacinamide 10 % — uniformise le teint, renforce la barrière cutanée et assure l'hydratation. Complétée de vitamine B5 et de glycérine.$$,
  how_to=$$Quelques gouttes sur peau propre et sèche (visage + cou), une fois par jour, jusqu'à absorption. Toujours une protection solaire (SPF) le matin.$$,
  benefits=$$["Illumine et unifie le teint","Réduit l'apparence des imperfections","Renforce la barrière cutanée · jusqu'à 8 h d'hydratation","Aide à lutter contre les signes de l'âge"]$$::jsonb,
  faq=$$[{"q":"Ça picote ?","a":"Non — 10 % est le juste équilibre efficacité / tolérance. Convient à divers types de peau et sous le maquillage."},{"q":"Résultats en combien de temps ?","a":"Dès 30 jours : 91 % ressentent une peau mieux hydratée et 88 % un teint plus lumineux (test consommateur sur 36 femmes)."}]$$::jsonb,
  images=$$[{"url":"https://gqxnndwrdbghxflwmfxy.supabase.co/storage/v1/object/public/product-images/hlskin/serum-niacinamide/card-serum.webp","kind":"packshot"},{"url":"https://gqxnndwrdbghxflwmfxy.supabase.co/storage/v1/object/public/product-images/hlskin/serum-niacinamide/life-serum.webp","kind":"lifestyle"}]$$::jsonb,
  updated_at=now()
where slug='serum-niacinamide';

update public.shop_products set
  concern='eclat', badge=null,
  tagline=$$Un gel moussant qui nettoie en douceur sans assécher la peau.$$,
  description=$$Gel moussant issu de l'expertise coréenne : élimine maquillage, impuretés et excès de sébum tout en préservant l'équilibre naturel de la peau. Sans parabènes ni sulfates ajoutés. La peau est propre, douce et rafraîchie.$$,
  ingredient_hero=$$Formule douce à la glycérine qui nettoie et lisse la peau sans la dessécher — sans parabènes ni sulfates ajoutés.$$,
  how_to=$$Sur mains humides, faire mousser, masser le visage et le cou en mouvements circulaires, rincer à l'eau tiède. Matin et soir.$$,
  benefits=$$["Élimine maquillage, impuretés et excès de sébum","Nettoie sans assécher, réduit la brillance","Sans parabènes ni sulfates ajoutés","Convient à divers types de peau"]$$::jsonb,
  faq=$$[{"q":"Ça mousse ?","a":"Une mousse fine et douce. 93 % trouvent la peau plus douce dès la première utilisation."},{"q":"Peaux sensibles ?","a":"Oui — testé dermatologiquement et ophtalmologiquement, convient à divers types de peau."}]$$::jsonb,
  images=$$[{"url":"https://gqxnndwrdbghxflwmfxy.supabase.co/storage/v1/object/public/product-images/hlskin/gel-nettoyant/card-gel.webp","kind":"packshot"}]$$::jsonb,
  updated_at=now()
where slug='gel-nettoyant';

-- ── Hydratation ─────────────────────────────────────────────────────────────
update public.shop_products set
  concern='hydratation', badge=null,
  tagline=$$Lotion légère et nourrissante — douceur et hydratation longue durée.$$,
  description=$$Lotion légère (recherche coréenne) à 6 % de squalane : hydrate pendant 24 h et accroît l'hydratation de 37 % après 24 h. Texture soyeuse non grasse qui pénètre vite et laisse la peau douce comme du velours. Sans parabènes ajoutés.$$,
  ingredient_hero=$$6 % de squalane + glycérine — attirent et retiennent l'humidité pour une hydratation longue durée.$$,
  how_to=$$Quotidiennement selon les besoins, sur peau propre et sèche, jusqu'à absorption.$$,
  benefits=$$["Hydrate 24 h · +37 % d'hydratation après 24 h","Nourrit en profondeur dès la 1re application","Texture non grasse, absorption rapide","Peau lisse et veloutée"]$$::jsonb,
  faq=$$[{"q":"C'est gras ?","a":"Non — 96 % ne ressentent aucune sensation grasse et 93 % une absorption rapide."},{"q":"Sur le visage ?","a":"Formulée pour les mains et le corps ; pour le visage, préfère les soins visage dédiés."}]$$::jsonb,
  images=$$[{"url":"https://gqxnndwrdbghxflwmfxy.supabase.co/storage/v1/object/public/product-images/hlskin/lotion-mains-corps/life-lotion.webp","kind":"packshot"},{"url":"https://gqxnndwrdbghxflwmfxy.supabase.co/storage/v1/object/public/product-images/hlskin/lotion-mains-corps/card-lotion.webp","kind":"packshot"}]$$::jsonb,
  updated_at=now()
where slug='lotion-mains-corps';

-- ── Beauté à tout âge (anti-âge) ────────────────────────────────────────────
update public.shop_products set
  concern='age', badge=null,
  tagline=$$Crème riche et veloutée qui cible les rides et renforce l'élasticité.$$,
  description=$$Crème hydratante riche et veloutée, développée grâce à la recherche coréenne avancée : adénosine + niacinamide + vitamine B5 pour cibler les rides, améliorer l'élasticité et offrir une hydratation durable. Teint plus ferme, plus lisse et plus éclatant. S'applique sous le maquillage.$$,
  ingredient_hero=$$Adénosine + niacinamide (ciblent les rides et soutiennent l'hydratation) et vitamine B5 (retient l'humidité et préserve la barrière cutanée).$$,
  how_to=$$Chaque matin sur peau propre et sèche, masser le visage et le cou de bas en haut. Toujours une protection solaire (SPF) en journée.$$,
  benefits=$$["Réduit l'apparence des rides","Renforce l'élasticité de la peau","Illumine le teint et ravive l'éclat","Texture riche et veloutée, sous le maquillage"]$$::jsonb,
  faq=$$[{"q":"Matin ou soir ?","a":"Le matin sur peau propre, en massage de bas en haut. Pense au SPF en journée."},{"q":"Sous le maquillage ?","a":"Oui, sa texture riche et veloutée le permet."}]$$::jsonb,
  images=$$[{"url":"https://gqxnndwrdbghxflwmfxy.supabase.co/storage/v1/object/public/product-images/hlskin/creme-tension/card-tension.webp","kind":"packshot"},{"url":"https://gqxnndwrdbghxflwmfxy.supabase.co/storage/v1/object/public/product-images/hlskin/creme-tension/life-tension.webp","kind":"packshot"}]$$::jsonb,
  updated_at=now()
where slug='creme-tension';

update public.shop_products set
  concern='age', badge=null,
  tagline=$$Crème légère et non grasse pour la zone délicate du contour des yeux.$$,
  description=$$Formule légère à absorption rapide (expertise coréenne) : adénosine, niacinamide, squalane, huile de macadamia et beurre de karité. Cible rides, ridules et sécheresse, hydrate et rend le regard visiblement plus doux, lumineux et éclatant. S'applique sous le maquillage.$$,
  ingredient_hero=$$Squalane + huile de macadamia + beurre de karité (hydratation durable) et adénosine + niacinamide (ciblent rides et ridules).$$,
  how_to=$$Matin et soir, tapoter une petite quantité autour de l'œil et masser délicatement.$$,
  benefits=$$["Cible les rides et ridules du contour","Hydratation rafraîchissante longue tenue","Regard plus doux, lumineux et éclatant","Texture non grasse, sous le maquillage"]$$::jsonb,
  faq=$$[{"q":"Sous le maquillage ?","a":"Oui, sa texture non grasse à absorption rapide le permet."},{"q":"Quand l'appliquer ?","a":"Matin et soir, en tapotant délicatement autour de l'œil."}]$$::jsonb,
  images=$$[{"url":"https://gqxnndwrdbghxflwmfxy.supabase.co/storage/v1/object/public/product-images/hlskin/contour-yeux/card-contour.webp","kind":"packshot"}]$$::jsonb,
  updated_at=now()
where slug='contour-yeux';

-- ── Collagen Skin Booster — CORRECTION porcin (Verisol® P), pas marin ────────
update public.shop_products set
  concern='age', badge='new',
  tagline=$$La beauté qui se boit — collagène bioactif Verisol® P.$$,
  description=$$Complément alimentaire au collagène Verisol® P (2,5 g/jour), enrichi en vitamines et minéraux clés. Collagène d'origine porcine, choisi pour la fiabilité de sa recherche et sa biodisponibilité. Aide à réduire les rides des yeux et à améliorer l'élasticité de la peau en 4 semaines. Saveur fraise-citron.$$,
  ingredient_hero=$$Verisol® P — peptides de collagène bioactifs d'origine porcine, scientifiquement étudiés à 2,5 g/jour. Enrichi en zinc et biotine (peau, cheveux, ongles).$$,
  how_to=$$1 dose (2,5 g minimum) par jour, dissoute dans l'eau, en cure. Premiers résultats dès 4 semaines.$$,
  benefits=$$["Réduit les rides des yeux en 4 semaines","Améliore l'élasticité de la peau en 4 semaines","Riche en vitamines et minéraux (peau, cheveux, ongles)","Complément alimentaire · saveur fraise-citron · 171 g"]$$::jsonb,
  faq=$$[{"q":"C'est quel collagène ?","a":"Verisol® P, un collagène bioactif d'origine porcine, choisi pour la fiabilité de sa recherche et sa biodisponibilité."},{"q":"En combien de temps ?","a":"Premiers résultats (rides des yeux, élasticité) dès 4 semaines ; signes de cellulite réduits dès 3 mois (min. 2,5 g/jour)."}]$$::jsonb,
  volume_label=$$cure · 171 g$$,
  images=$$[{"url":"https://gqxnndwrdbghxflwmfxy.supabase.co/storage/v1/object/public/product-images/hlskin/collagen-booster/card-collagen.webp","kind":"packshot"},{"url":"https://gqxnndwrdbghxflwmfxy.supabase.co/storage/v1/object/public/product-images/hlskin/collagen-booster/life-collagen.webp","kind":"avantages"}]$$::jsonb,
  updated_at=now()
where slug='collagen-booster';

-- ── Bucket product-images : autoriser la vidéo hero (mp4) ────────────────────
update storage.buckets
set allowed_mime_types = array['image/png','image/jpeg','image/webp','image/avif','video/mp4']
where id='product-images'
  and not ('video/mp4' = any(coalesce(allowed_mime_types, array[]::text[])));

commit;
