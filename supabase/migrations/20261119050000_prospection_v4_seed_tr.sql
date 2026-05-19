-- =============================================================================
-- Chantier #3 V4 — Seed TR (2026-05-19)
--
-- Marché TR = Turquie + diaspora turque en Allemagne (5M). Ton respectueux
-- mais direct. "Ciddi" (sérieux) rassure beaucoup. WhatsApp dominant. LinkedIn
-- moins utilisé qu'en EN. Hashtags : passable mélange turc / anglais sur Insta.
-- =============================================================================

begin;

-- 1. MINDSET ─────────────────────────────────────────────────────────────────
do $$ begin if (select count(*) from public.prospection_mindset_blocks where market_code='tr') = 0 then
  insert into public.prospection_mindset_blocks (market_code, kind, title, body, position) values
    ('tr','truth','Bu kör hacim oyunu değil, eleme oyunu.',
     E'Senin işin ikna etmek değil. Senin işin doğru kişileri doğru zamanda bulmak. 100 kişiyi ikna etmek için 100 mesaj atarsan, bir hafta içinde motivasyonun biter. Hazır olan 5 kişiyi tespit etmek için 100 mesaj atarsan, sürdürülebilir bir iş kurarsın.', 1),
    ('tr','truth','Ne kadar rahatsan, o kadar çekersin.',
     E'Bir prospect "seni mutlaka kaydetmem lazım" havasını anında hisseder. Kopukluk çeker. Baskı iter. Bu satışa kirayı ödemek için ihtiyacın varsa, mesajlarında belli olur.', 2),
    ('tr','truth','Sessizlik kişisel red değil.',
     E'Mesajlarının %80''ine cevap gelmeyecek. Bu kötü olduğun anlamına gelmez. İnsanlar meşgul, zamanı uygun değil, ya da doğru hedef değiller demek. Devam et.', 3),
    ('tr','error','İlk mesajda pitch atmak.',
     E'İlk cümlede prospectlerin %90''ını kaybedersin. İlk mesajın tek hedefi var: cevap almak. Satmak değil.', 1),
    ('tr','error','Aynı mesajı 50 kişiye yollamak.',
     E'Copy-paste kilometrelerce uzaktan hissedilir. En azından [profilden detay] kısmını kişiselleştir. Belirli bir detay bulamıyorsan iyi bir prospect değil — bir sonrakine geç.', 2),
    ('tr','error','D+1, D+2, D+3 ısrar etmek.',
     E'48 saatte koçtan tacizciye dönüşürsün. Tek bir takip mesajı, D+3''te, asla daha fazla.', 3),
    ('tr','error','"Hayır"lar üzerinde tartışmak.',
     E'Düzgün kapatılan bir "hayır" bazen 6 ay sonra geri döner. Kötü yönetilen bir "hayır" asla geri dönmez.', 4),
    ('tr','error','İş modeli hakkında yalan söylemek.',
     E'"MLM mi?" diye sorulursa, dürüst cevap evettir. Yalan söylemek itibarını sonsuza kadar yok eder.', 5);
end if; end$$;

-- 2. METRICS ─────────────────────────────────────────────────────────────────
do $$ begin if (select count(*) from public.prospection_metrics where market_code='tr') = 0 then
  insert into public.prospection_metrics (market_code, kind, label, value_min, value_max, value_unit, hint, position) values
    ('tr','funnel_step','Gönderilen M1 mesajları', 100, 100, 'mesaj',   'Başlangıç tabanı', 1),
    ('tr','funnel_step','Alınan cevaplar',          15,  25, 'cevap',   'Kişiselleştirilmişse %15-25', 2),
    ('tr','funnel_step','Nitelikli sohbetler',       5,  10, 'sohbet',  '5-10 gerçek diyalog', 3),
    ('tr','funnel_step','Alınan görüşmeler',         1,   3, 'görüşme', 'Keşif görüşmesi', 4),
    ('tr','funnel_step','Yeni müşteriler',           0,   1, 'müşteri', 'İlk müşteri: 100-200 M1', 5),
    ('tr','pipeline_target','Cevap bekleyen M1',     50, 100, 'mesaj',   'Stoğu sabit tut', 1),
    ('tr','pipeline_target','Aktif sohbetler',       10,  20, 'sohbet',  'Jonglörlük yaptığın', 2),
    ('tr','pipeline_target','Önümüzdeki 7 gün görüşme', 2, 5, 'görüşme', 'Daha az ise M1 hacmini artır', 3),
    ('tr','pipeline_target','Kapanış aşamasında müşteri', 1, 3, 'lead', 'Finalistlerin', 4),
    ('tr','weekly_kpi','Gönderilen M1 sayısı',     null, null, 'count', 'Çabanı ölçer. Hafta 50''nin altı = az.', 1),
    ('tr','weekly_kpi','Cevap oranı',              null, null, 'pct',   '%15 altı = M1 kalitesini gözden geçir.', 2),
    ('tr','weekly_kpi','Görüşme→müşteri dönüşümü', null, null, 'pct',   '%20 altı = kapanışını gözden geçir.', 3);
end if; end$$;

-- 3. PROFILE FLAGS ───────────────────────────────────────────────────────────
do $$ begin if (select count(*) from public.prospection_profile_flags where market_code='tr') = 0 then
  insert into public.prospection_profile_flags (market_code, profile_slug, flag_type, text, position) values
    ('tr','weight-women','green','Yakın zamanlı aktivite (post < 2 hafta)', 1),
    ('tr','weight-women','green','Engagement''lı kişisel postlar', 2),
    ('tr','weight-women','green','Net niyetli bio', 3),
    ('tr','weight-women','green','Aynı niche''te rakip koç yok', 4),
    ('tr','weight-women','red','Bağlamsız özel profil', 1),
    ('tr','weight-women','red','%100 business / shop / affiliate hesap', 2),
    ('tr','weight-women','red','6+ aydır post yok', 3),
    ('tr','weight-women','red','Binlerce takipçi düşük engagement (fake)', 4),
    ('tr','weight-men','green','Yakın zamanlı aktivite', 1),
    ('tr','weight-men','green','Spor, performans, enerji, yoğun iş yaşamı postları', 2),
    ('tr','weight-men','green','Bio net hedef belirtiyor (cutting, bulk, enerji)', 3),
    ('tr','weight-men','green','Rakip koç yok', 4),
    ('tr','weight-men','red','Bağlamsız özel profil', 1),
    ('tr','weight-men','red','Bio sadece görünüm (model, çekim)', 2),
    ('tr','weight-men','red','6+ aydır post yok', 3),
    ('tr','weight-men','red','Doymuş spor salonu influencer hesabı', 4),
    ('tr','sport','green','Pratiğinde aktif (yakın antrenman postu)', 1),
    ('tr','sport','green','Net hedefler (yarış, PR, sezon)', 2),
    ('tr','sport','green','Gerçek engagement', 3),
    ('tr','sport','green','Sponsorsuz / koçlu değil', 4),
    ('tr','sport','red','Profesyonel sporcu, sponsorlu', 1),
    ('tr','sport','red','6+ aydır post yok', 2),
    ('tr','sport','red','"Fitness alışveriş" profili, gerçek pratik yok', 3),
    ('tr','sport','red','Bio zaten "spor beslenmesi koçu" diyor', 4),
    ('tr','business','green','Yakın aktivite, kişisel postlar', 1),
    ('tr','business','green','Net bio (meslek veya girişimci statüsü)', 2),
    ('tr','business','green','Gerçek engagement (anlamlı yorumlar)', 3),
    ('tr','business','green','Rakip MLM top distri''si değil', 4),
    ('tr','business','red','Bio = sadece rakip MLM affiliate linki', 1),
    ('tr','business','red','Çok takipçi / sıfır engagement (fake)', 2),
    ('tr','business','red','Kişisel fotoğraf yok / kişisel post yok', 3),
    ('tr','business','red','Story''ler business pitchleriyle dolu', 4);
end if; end$$;

-- 4. SOURCES ─────────────────────────────────────────────────────────────────
do $$ begin if (select count(*) from public.prospection_sources where market_code='tr') = 0 then
  insert into public.prospection_sources (market_code, profile_slug, kind, label, detail, position) values
    ('tr', null, 'hashtag_advanced','İdeal Insta post oranı',
     E'%60 değer · %30 kişisel · %10 CTA. Klasik hata: sadece ürün/sonuç fotoğrafı. İnsanlar SENİ takip ediyor.', 1),
    ('tr', null, 'hashtag_advanced','30 saniye profil tarama yöntemi',
     E'M1 göndermeden önce 4 noktayı kontrol et: (1) yakın aktivite · (2) gerçek engagement · (3) net niyetli bio · (4) rakip koçu yok.', 2),
    ('tr','weight-women','fb_groups','Yerel wellness Facebook grupları',
     'Ara: "kilo verme [şehir]", "sağlıklı anne", "dengeli beslenme". DM''den önce değer kat.', 1),
    ('tr','weight-women','irl','Kreş / okul çıkışları',
     '30-45 yaş anneler, 8:30/16:30 saatleri, doğal ve sıcak ton. Direkt pitch yok, bağ kur.', 1),
    ('tr','weight-women','irl','Spor salonları (grup dersleri)',
     'Pilates, yoga, body pump. Ağır halter bölgesinden uzak dur.', 2),
    ('tr','weight-women','recommendations','Kişisel ağ + mevcut müşteriler',
     'En kaliteli prospect kaynağın. §8''e bak.', 1),
    ('tr','weight-women','inbound_content','Insta/TikTok kilo verme içeriği',
     'Müşteri yorumları, "keşke bilseydim", dengeli tarifler. Inbound lead''ler 3× daha sıcak.', 1),
    ('tr','weight-men','fb_groups','Yerel "forma girme erkek [şehir]" grupları',
     'Kas kazanımı, yağ yakımı, enerji postları. DM''den önce değer.', 1),
    ('tr','weight-men','irl','Spor salonları, CrossFit, takım sporları',
     'Futbol, basketbol, padel. 7-9 veya 19-21. Doğal direkt ton.', 1),
    ('tr','weight-men','recommendations','Profesyonel ağ + erkek müşteriler',
     'Tavsiye = bu hedefte #1 kanal.', 1),
    ('tr','weight-men','inbound_content','Performans / toparlanma / enerji içeriği',
     '"Hafif wellness" angle kaçın → kadın hedef. Performans, uyku, yağsız kas konuş.', 1),
    ('tr','sport','fb_groups','Yerel koşu / triatlon / CrossFit grupları',
     'Postlar "uzun antrenmanlarda beslenmeyi nasıl yönetiyorsunuz?". Değer kat.', 1),
    ('tr','sport','irl','Box CrossFit, koşu klüpleri, triatlon',
     'Fiziksel varlık = anında güvenilirlik. Antrenman sonrası iletişim.', 1),
    ('tr','sport','recommendations','Antrenörler, fizyoterapistler, spor doktorları',
     'Çapraz iş birliği. Win-win müşteri.', 1),
    ('tr','sport','inbound_content','Antrenman öncesi/sonrası beslenme, toparlanma',
     'Strava kulüpleri, antrenör hesapları. Amatör sporcular orada.', 1),
    ('tr','business','fb_groups','"Yan iş", "girişimci [şehir]" grupları',
     'Insta''dan daha hafif moderasyon. Pitch''ten önce business değeri.', 1),
    ('tr','business','irl','Coworking, girişimci buluşmaları',
     'Networking. MLM havası yok — eş ton.', 1),
    ('tr','business','recommendations','Mevcut profesyonel ağ, eski meslektaşlar',
     'Ağızdan ağıza hâlâ en güvenilir kanal.', 1),
    ('tr','business','inbound_content','Mindset, bağımsızlık, kişisel yolculuk içeriği',
     '"Zengin ol" angle kaçın, "işte benim yolculuğum" öncelik.', 1);
end if; end$$;

-- 5. HASHTAGS ────────────────────────────────────────────────────────────────
update public.prospection_hashtags set category = 'mainstream'
  where market_code = 'tr' and hashtag in (
    '#kiloverme','#sağlıklıyaşam','#beslenme','#diyet',
    '#fitnessturkiye','#sporturkiye','#kosu',
    '#girisimciturkiye','#evdenis','#finansalozgurluk'
  );

update public.prospection_hashtags set category = 'niche'
  where market_code = 'tr' and hashtag in (
    '#fitanne','#sporyaşam','#saglikliyasam2026','#dengelibeslenme','#kadinsagligi','#saglikliKilo',
    '#crossfitturkiye','#sporbeslenmesi','#kasGelisimi','#toparlanma','#amatorsporcu',
    '#kadingirisimci','#dijitalGirisimci','#evdenisTR','#wellnessGirisim'
  );

update public.prospection_hashtags set
  category = 'cross',
  crossover_hint = '#fitanne veya #doğumsonrası ile çapraz kullan anneler için.'
  where market_code = 'tr' and profile_slug = 'weight-women' and hashtag = '#kiloverme';

update public.prospection_hashtags set
  category = 'cross',
  crossover_hint = 'Şehir hashtag''i (#istanbul #ankara #izmir) ile çapraz, lokal hedef için.'
  where market_code = 'tr' and profile_slug = 'sport' and hashtag = '#kosu';

insert into public.prospection_hashtags (market_code, profile_slug, hashtag, category, crossover_hint, position) values
  ('tr','weight-men','#formaGel','mainstream',null,1),
  ('tr','weight-men','#kasKazanma','mainstream',null,2),
  ('tr','weight-men','#yagYakma','mainstream',null,3),
  ('tr','weight-men','#dadbodtr','niche',null,4),
  ('tr','weight-men','#babafit','niche',null,5),
  ('tr','weight-men','#fitness40erkek','niche',null,6),
  ('tr','weight-men','#vucutRekompozisyonu','niche',null,7),
  ('tr','weight-men','#yoğunIsErkek','cross','Meslek/yaş hashtag''i ile çapraz (#babagirisimci, #ceoturkiye) 30-50 aktif hedef.',8)
on conflict (market_code, profile_slug, hashtag) do nothing;

-- 6. SCRIPTS M1 weight-men ───────────────────────────────────────────────────
do $$ begin if (select count(*) from public.prospection_scripts where market_code='tr' and profile_slug='weight-men') = 0 then
  insert into public.prospection_scripts (market_code, profile_slug, platform, body, body_fr, tip, position, kind, label, language_label) values
    ('tr','weight-men','insta',
     E'Selam [isim],\n\n[Profilde detay] hakkındaki paylaşımını gördüm. Erkeklerle beslenme ve forma girme üzerine çalışıyorum — özellikle yoğun iş ve spor birleştiğinde yağ yakımı, enerji ve toparlanma.\n\nKısa soru: daha çok yağ yakımı, temiz kas kazanımı, yoksa günlük enerjini geri kazanma hedefi mi?',
     E'Vu ton post. Coaching nutrition hommes : cut, énergie, récup. Tu es plutôt cut, bulk propre, ou retrouver de l''énergie ?',
     'TR ton direct mais respectueux. "Wellness" terimini koru ama "yumuşak" tonu evite.',
     1, 'first_contact', 'Instagram DM · İlk iletişim', '🇹🇷 Türkçe'),
    ('tr','weight-men','whatsapp',
     E'Selam [isim]! Ben [adın], [bağlam] üzerinden tanışmıştık. Bana [yağ yakımı / enerji / spor] hakkında konuşmuştun. Nasıl gidiyor?',
     E'Salut, on s''est connectés via [contexte]. Tu m''avais parlé de [détail]. Tu en es où ?',
     'TR WhatsApp dominant après contact initial. Ton direct.',
     1, 'first_contact', 'WhatsApp · Doğrudan iletişim', '🇹🇷 Türkçe'),
    ('tr','weight-men','fb',
     E'Merhaba [isim], [grup adı] grubundaki [detay] paylaşımını gördüm. [Şehir]''de beslenme koçuyum, 30-50 yaş erkeklerle forma girme üzerine çalışıyorum — özellikle yoğun bir iş tempolu ve vücudunun pes etmesini istemeyenlerle.\n\nSen nerede duruyorsun? Belirli bir şey mi arıyorsun yoksa rastgele mi deniyorsun?',
     E'Coach nutrition, 30-50 hommes, remise en forme. Tu en es où ?',
     'TR FB Messenger plus posé. "Forma girme erkek" grupları mine d''or.',
     1, 'first_contact', 'Facebook Messenger · İlk iletişim', '🇹🇷 Türkçe'),
    ('tr','weight-men','sms',
     E'Selam [isim], ben [adın]. [Bağlam] üzerinde konuşmuştuk. [Hedef] fikrinde hâlâ varsan, söyle, bu hafta konuşabiliriz.',
     E'Salut, c''est [ton prénom]. On avait parlé de [contexte]. Si tu es toujours sur [objectif], dis-moi.',
     'TR SMS kısa, emoji yok. "Gerçek bir kişi" hissi.',
     1, 'first_contact', 'SMS · Kısa ve sakin', '🇹🇷 Türkçe');
end if; end$$;

-- 7. REPLY TREE ──────────────────────────────────────────────────────────────
do $$ begin if (select count(*) from public.prospection_reply_tree where market_code='tr') = 0 then
  insert into public.prospection_reply_tree (market_code, profile_slug, level, branch, body, body_fr, tip, position) values
    ('tr','weight-women','M2','positive',
     E'Anlatman güzel, [isim] 🙏\n\nDaha iyi cevap vermek için — bu uzun zamandır olan bir hedef mi yoksa yakın zamanda mı çıktı? Ve daha önce işe yaramayan şeyler denedin mi?\n\nSoruyorum çünkü nerede olduğuna göre, ya somut şeyler paylaşırım ya da hiç. Tamamen sana bağlı.',
     E'Top. Objectif récent ou de longue date ?', 'Creuser.', 1),
    ('tr','weight-women','M2','vague',
     E'Anlıyorum [isim]. Sık böyle olur — bir şeyin değişmesi gerektiğini hissediyorsun ama tam olarak neyin değil.\n\nBaşka bir açı: bugün seni en çok ne rahatsız ediyor? Terazideki rakam, kıyafetlerinde nasıl hissettiğin, enerjin, yemekle ilişkin? Genellikle öne çıkan bir nokta olur.',
     E'Quel est LE point qui te dérange ?', 'Question fermée qui ouvre.', 1),
    ('tr','weight-women','M2','negative',
     E'Sorun değil [isim], cevap vermek için zaman ayırdığın için teşekkürler 🙏\n\nGüzel bir devam dilerim. Bir gün değişirse, çekinmeden ulaş.',
     E'Pas de souci.', 'Fermeture propre.', 1),
    ('tr','weight-women','M2','question',
     E'Güzel soru.\n\nÖzetle, beslenme konusunda eşlik ediyorum — kısıtlayıcı diyet yok. Dengeli beslenme, enerji ve sürdürülebilir alışkanlıklar üzerine çalışıyoruz. Gerektiğinde doğal ürünleri tamamlayıcı olarak kullanıyorum.\n\nAma daha fazlasını anlatmadan önce, sen nerede olduğunu söyle. Yardımcı olup olamayacağımı bu belirleyecek.',
     E'Coaching nutrition pas régime.', 'Réponse courte puis recentre.', 1),
    ('tr','weight-women','M3','hot',
     E'Bunları paylaştığın için teşekkürler [isim], değerli 🙏\n\nTanımladığını sık görüyorum. İyi haber: doğru yaklaşımla yönetilebilir.\n\nYazıyla her şeyi dökmeyi tercih etmem. Bu hafta 15-20 dk Zoom? Nasıl çalıştığımı somut olarak gösteririm, sen karar verirsin. Sıfır taahhüt.\n\n[gün 1] veya [gün 2]?',
     E'Visio 15-20 min, zéro engagement.', 'Choix de date.', 1),
    ('tr','weight-women','M3','lukewarm',
     E'Sorun değil [isim], zorlamak istemem.\n\nİletişim bilgilerimi bırakıyorum. Bir noktada sana uyduğunda yaz. Bu arada somut bir şey denemek istersen söyle, paylaşırım.',
     E'Je laisse mon contact.', 'Échantillon de valeur.', 1),
    ('tr','weight-men','M2','positive',
     E'Net olduğun için güzel, [isim] 💪\n\nDaha fazlasını anlat: haftada kaç antrenman, ve seni gerçekten ne tıkıyor? Toparlanma, gün sonu enerjisi, antrenman yapmasına rağmen yağ kazanımı, uyku?\n\nNerede tıkandığına göre aynı şeyi söylemem.',
     E'Top cash. Combien de séances, qu''est-ce qui bloque ?', 'Vocabulaire perf.', 1),
    ('tr','weight-men','M2','vague',
     E'OK [isim], anlıyorum.\n\nDaha direkt soru: enerji düşmesi olmadan haftaları üst üste yapabiliyor musun, yoksa ipi çektiğin anlar var mı?\n\nGördüğüm adamların çoğu "iyi" idare ediyor... duvara çarpana kadar. İlk kategorideysen, harika. Değilse, kazabiliriz.',
     E'Tu enchaînes ou tu tires sur la corde ?', 'Pique légère.', 1),
    ('tr','weight-men','M2','negative',
     E'Sorun değil [isim], soru sormak istedim, zorlamak değil 🙏\n\nAntrenmanlarında iyi şanslar.',
     E'Pas de souci.', 'Fermeture virile.', 1),
    ('tr','weight-men','M2','question',
     E'Güzel soru.\n\nSomut olarak, erkeklerle beslenme üzerine çalışıyorum — hedefe göre performans, toparlanma, temiz kas kazanımı veya yağ yakımı. Sağlam bir alımı tamamlayıcı olarak proteinler, hedefli takviyeler (kreatin, BCAA) kullanıyorum.\n\nDaha fazlasını anlatmadan — seni neyin tıkadığını veya neyi iyileştirmek istediğini söyle.',
     E'Coaching nutrition hommes.', 'Technique.', 1),
    ('tr','weight-men','M3','hot',
     E'Tanımladığın klasik [isim], ve açabilecek şeyler var.\n\nMetin duvarı yerine — 20 dk Zoom? Erkek spor beslenmesini nasıl analiz ettiğimi gösteririm. Sıfır taahhüt, sana otomatik bir şey satmam.\n\n[gün 1] veya [gün 2]?',
     E'Visio 20 min.', 'Format court.', 1),
    ('tr','weight-men','M3','lukewarm',
     E'Sorun değil [isim], acele yok.\n\n[tıkandığı nokta] hakkında 2-3 somut şey paylaşmamı istersen söyle, gönderirim. Yoksa, istediğin zaman tekrar buluşuruz.',
     E'2-3 tips concrets.', 'Tips concrets.', 1),
    ('tr','sport','M2','positive',
     E'Süper [isim] 💪\n\nDaha fazlasını anlat: haftalık hacmin nedir, ve seni en çok ne rahatsız ediyor? Seanslar arası toparlanma, uzun seansların sonunda enerji, yarışta sindirim sorunları, uyku?',
     E'Top. Volume hebdo, point bloquant ?', 'Sportif.', 1),
    ('tr','sport','M2','vague',
     E'Yürüyorsa harika, [isim].\n\nMerakla soruyorum: haftaları düşmeden üst üste yapabiliyor musun, yoksa ipi çektiğin anlar var mı? Çoğu sporcu "iyi" idare ediyor... duvara çarpana kadar.',
     E'Si ça roule top. Mais le mur arrive à tous.', 'Universal.', 1),
    ('tr','sport','M2','negative',
     E'Sorun değil [isim] 🙏 Antrenmanlarında iyi şanslar.',
     E'Pas de souci.', 'Propre.', 1),
    ('tr','sport','M2','question',
     E'Güzel soru. Sporcularla beslenme üzerine çalışıyorum: efor öncesi/sırası/sonrası, seanslar arası toparlanma, uzun mesafelerde enerji. Hedefli ürünler tamamlayıcı olarak. Seni neyin tıkadığını söyle.',
     E'Nutrition sport.', 'Technique.', 1),
    ('tr','sport','M3','hot',
     E'Klasik [isim], açabilecek çok şey var. 20 dk Zoom? Sıfır taahhüt. [gün 1] veya [gün 2]?',
     E'Visio 20 min.', 'Format court.', 1),
    ('tr','sport','M3','lukewarm',
     E'Sorun değil, acele yok. [tıkanma] hakkında 2-3 somut şey istersen söyle.',
     E'Tips.', 'Concrets.', 1),
    ('tr','business','M2','positive',
     E'Güzel [isim], açık olduğun için teşekkürler 🙏\n\nÖzetle: wellness alanında (beslenme, sağlık). Uluslararası bir ekiple çalışıyorum. Model, [senin aktivitenin] yanında bir gelir oluşturmama izin veriyor.\n\nDetaylara girmeden — şu an bunu keşfetmen için seni iten ne? Belirli bir hedef (ek gelir, bağımsızlık, kariyer değişikliği), yoksa merak mı?',
     E'Cadre + question qualifiante.', 'Mesure motivation.', 1),
    ('tr','business','M2','vague',
     E'Meşru bir soru [isim].\n\nDürüst olacağım: wellness ürünleri dağıtım faaliyeti geliştirdiğin bir model, seni eğiten bir ekiple. Başlangıç yatırımı var, ve verdiğin zamana göre büyür.\n\nResmi görüyor musun? Sana göre değilse, direkt söyle — net bir "hayır"ı sahte bir "evet"e tercih ederim.',
     E'Transparence radicale.', 'Crédibilité.', 1),
    ('tr','business','M2','negative',
     E'Sorun değil [isim], dürüst cevap için teşekkürler 🙏\n\nBelki sana uygun değildi diye işaretlemiştim, tamamen OK. Bir gün sohbet anlamlı olursa, doğal olarak olacak.',
     E'Fermeture chaleureuse mais nette.', 'Revient parfois.', 1),
    ('tr','business','M2','question',
     E'Doğrudan gitmeni seviyorum [isim].\n\n[şirket adı] ile beslenme/wellness tarafında çalışıyorum. Şirket [X yıl] var ve [Y ülke] mevcut.\n\nAma ürün konunun yalnızca yarısı. Diğer yarısı dağıtım modeli. Açıksan Zoom''da açıklamak daha kolay. Bu tür modeller hakkında zaten sabit fikrin varsa söyle — zaman kaybetmeyiz.',
     E'Transparence + filtre.', 'Direct.', 1),
    ('tr','business','M3','hot',
     E'Söylediğin tam olarak duymak istediğim şeydi [isim] — aradığın konuda net görünüyorsun.\n\nDaha ileri gitmek için, 30 dk Zoom? Modeli düzgün sunarım: şirket, ürünler, ücretlendirme, gereken zaman ve yatırım. Her şeyi sorarsın. Sonra birlikte değerlendiririz.\n\nSaklı pitch yok, sahte aciliyet yok. [gün 1] veya [gün 2]?',
     E'Visio 30 min, transparence.', 'Format sérieux.', 1),
    ('tr','business','M3','lukewarm',
     E'Doğru zamanlama olmadığını hissediyorum [isim], sorun değil.\n\nİletişim bilgilerimi bırakıyorum. Bir noktada "bu hikayeyi kazmaya gideyim" dersen, yaz.',
     E'Posé.', 'Revient.', 1);
end if; end$$;

-- 8. OBJECTIONS ──────────────────────────────────────────────────────────────
insert into public.prospection_objections (market_code, slug, title, meaning, bad_response, good_response, good_response_fr, warning, position) values
  ('tr','cest-cher','Pahalı',
   'Ya değeri göremiyor, ya da bu parayı buna koyamıyor/koymak istemiyor.',
   'Önemsizleştirmek ("bir kahve fiyatı"), ya da ilk itirazda indirim eklemek.',
   E'Anlıyorum [isim]. Neye göre pahalı? Ve senin gözünde değmesini ne sağlardı?\n\nSeni ikna etmek için sormuyorum — cevabına göre ya doğru zaman değil, ya da daha uygun bir formüle bakabiliriz.',
   E'Cher par rapport à quoi ?', null, 1),
  ('tr','pas-le-temps','Zamanım yok',
   'Ya öncelik değil, ya da olduğundan fazla zaman alacağından korkuyor.',
   E'"Ama hızlı!" — itirazı ele almayan tembel cevap.',
   E'Adil, ve sık zaman ayırmadığımız için işler ilerlemiyor.\n\n"3 ay bekleyip sonra konuşalım" desem, açık mı yoksa kesin hayır mı? Yanlış cevap yok.',
   E'On attend 3 mois et tu me redis : ouvert ou non ferme ?', null, 2),
  ('tr','herbalife-mlm','Herbalife / MLM / piramit mi?',
   'Aldatılma korkusu veya kötü deneyim (hayal kırıklığına uğramış yakın).',
   'İnkar etmek, "hayır farklı" demek, kaçınmak.',
   E'Evet [marka], ve evet çok seviyeli dağıtım. Yasadışı anlamda piramit değil — fark, son müşteriler tarafından tüketilen gerçek bir ürün olması.\n\nBu model hakkında doğru ve yanlış şeyler dolaşıyor. Seni tam olarak ne tıkıyor söyle, dürüst cevaplarım.',
   E'Oui c''est [marque], distribution multi-niveaux.',
   'Yalan söylemek itibarını sonsuza dek yok eder.', 3),
  ('tr','deja-essaye','X''i denedim ve çalışmadı',
   'Hayal kırıklığına uğradı, şüpheci, aynı şey olmayacağına dair güvence istiyor.',
   E'"Ama aynı değil!" — neden olmadığını açıklamadan.',
   E'Seni duyuyorum [isim]. Somut olarak ne oldu? Nerede tıkandığına göre — motivasyon, yöntem, eşlik, ürün — aynı tuzağa düşüp düşmeyeceğini söylerim. Sihirli vaat yok, sadece dürüstlük.',
   E'Qu''est-ce qui s''est passé concrètement ?', null, 4),
  ('tr','en-parler-conjoint','Eşimle konuşmam gerek',
   'Ya meşru çift kararı, ya da kibarca kaçmak için bahane.',
   E'"Ama bu senin kararın!" veya "Onun onayına ihtiyacın yok!"',
   E'Tabii ki, konuşmak sağlıklı. Ona göstermek için net bir özet hazırlayayım mı, yoksa kendin mi açıklamayı tercih edersin? Ve somut olarak, ne zaman tekrar konuşuyoruz?',
   E'Résumé clair, on se redit quoi quand ?',
   'Le "quand" oblige à fixer date.', 5),
  ('tr','je-reflechis','Düşüneceğim',
   '%90''ı = kibar "hayır". %10''u = gerçekten düşünmesi gerekiyor.',
   E'"Acele etme!" → kesin kaybedersin.',
   E'OK [isim] — bu daha çok "evet ama sindirmem lazım" mı, yoksa "hayır ama yüzüne söylemek istemem" mi?\n\nİkisi de OK, sadece bilmek istiyorum. Hayır ise, ikimizin zamanını korur.',
   E'"Oui mais je digère" ou "non mais je veux pas le dire" ?', null, 6),
  ('tr','trop-beau','Gerçek olamayacak kadar güzel',
   'Sağlıklı şüphe. Aslında iyi işaret.',
   'Güven vermek için vaatleri artırmak (ters etki).',
   E'Şüphe duymakta haklısın. Sihir değil. Arkasında iş var, herkes için işe yaramaz, sonuçlar sana bağlı.\n\nİstersen daha az parıltılı tarafları da anlatırım: ne gerektirir, insanlar nerede bırakır.',
   E'T''as raison de te méfier.', null, 7),
  ('tr','combien-tu-gagnes','Sen ne kadar kazanıyorsun?',
   'Somut kanıt istiyor, palavra değil.',
   'Devasa rakamlar atmak, ya da kaçınmak.',
   E'Dürüstçe söylüyorum: [Y ay/yıl] sonra [X ₺/ay] dayım. Şeffaf olmak için, ilk aylarım [Z ₺] idi. Aşamalı ve verdiğin zamana ve çevrendekilere bağlı.\n\nİstersen şirketin resmi rakamlarını gösteririm (ortalama distribütör gelirleri, halka açık ve zorunlu).',
   E'Je suis à [X/mois]. Earnings disclosure publique.',
   'ASLA rakam uydurma. Resmi disclosure zorunlu.', 8),
  ('tr','ton-interet','Ama ben kaydolursam sen kazanacaksın',
   'Onun iyiliği için mi yoksa sadece komisyon için mi konuştuğundan emin olmak istiyor.',
   'Çıkarını inkar etmek veya küçümsemek — sahtekar gibi algılanır.',
   E'Evet doğru, ve bu konuda net olalım. Sponsor olduğum biri üretirse ben kazanırım — yani üretmeyecek birini sponsor olmamda sıfır çıkarım var. Boşa fazla iş demek.\n\nÇıkarım hizalı insanlarla çalışmak. Sen değilsen, sorun değil, ikimizin zamanı boşa.',
   E'Oui c''est vrai. Je gagne quand quelqu''un que j''ai parrainé fait du chiffre.', null, 9)
on conflict (market_code, slug) do nothing;

-- 9. FOLLOWUPS ───────────────────────────────────────────────────────────────
do $$ begin if (select count(*) from public.prospection_followups where market_code='tr') = 0 then
  insert into public.prospection_followups (market_code, kind, day_offset, title, body, body_fr, warning, position) values
    ('tr','post_call', 0, 'G0 — Görüşmeden hemen sonra',
     E'[İsim], sohbet için teşekkürler! Anlaştığımız gibi, sindirmen için bırakıyorum.\n\nKısa özet:\n1. [anahtar nokta 1]\n2. [anahtar nokta 2]\n3. [anahtar nokta 3]\n\nYarına kadar sorun olursa yaz. İyi akşamlar 🙏',
     E'Merci pour l''échange ! Récap.', null, 1),
    ('tr','post_call', 2, 'G+2 — İlk check',
     E'Selam [isim], iyisindir umarım! Düşünecek veya sorularını sormak için zaman bulabildin mi?\n\nNerede olduğunu söyle, hayır olsa bile — sessizlikten daha faydalı.',
     E'T''as eu le temps de réfléchir ?', null, 2),
    ('tr','post_call', 5, 'G+5 — Son mesaj',
     E'Selam [isim], peşinden gitmemek için son mesajım 🙏\n\nHâlâ emin değilsen, ya da daha sonra konuşmayı tercih edersen, söyle. Yoksa bırakıyorum.',
     E'Dernier message.', 'Si pas de réponse au J+5, ARRÊTE.', 3),
    ('tr','post_call', 30, 'G+30 — Yeniden aktivasyon',
     E'Selam [isim], bir ay oldu, sadece nasıl olduğunu sormak istedim 😊\n\n[hedefin] hakkında nerede duruyorsun? Pitch yok, sadece meraktan.',
     E'Ça fait un mois.', null, 4),
    ('tr','client_onboarding', 0, 'G0 — Satın alma günü',
     E'Selam [isim]! Maceraya hoş geldin 💪 Başlangıç için her şeyi gönderiyorum. [gün] için bir görüşme ayarlayalım mı, ürünlere nasıl alıştığını görelim?',
     E'Bienvenue !', null, 1),
    ('tr','client_onboarding', 7, 'G+7 — İlk hafta',
     E'Selam [isim], ilk hafta bitti! Nasıl gidiyor? [ana alışkanlık] entegre edebildin mi? Neyin çalıştığını ve neyin tıkandığını söyle.',
     E'Première semaine !', null, 2),
    ('tr','client_onboarding', 30, 'G+30 — İlk ay',
     E'Selam [isim], zaten bir ay 🎉 Bilanço alalım mı? Neyin değiştiğini ve 2. ay için neyi ayarladığımızı birlikte görelim.',
     E'Déjà un mois !', null, 3),
    ('tr','reactivation_old', 90, 'G+90 — Eski prospect',
     E'Selam [isim], uzun zaman oldu!\n\nProfiline rastladım ve [X ay önceki hedefin] hakkında nerede olduğunu merak ettim. Pitch yok, sadece meraktan.',
     E'Je tombe sur ton profil.',
     'Sadece başlangıçta ilgi göstermiş prospectlerle.', 1);
end if; end$$;

-- 10. CLOSING ────────────────────────────────────────────────────────────────
do $$ begin if (select count(*) from public.prospection_closing where market_code='tr') = 0 then
  insert into public.prospection_closing (market_code, kind, title, body, body_fr, position) values
    ('tr','signal','Fiyat, başlangıç tarihi, zamanlama hakkında net sorular soruyor','Kendini zihinsel olarak satın almaya yansıtıyor.', E'Projection.', 1),
    ('tr','signal','Gelecek zamanda konuşuyor','"Müşteri olduğumda...", "Eylülde başlarsam..." — zihinsel yansıtma.', E'Parle au futur.', 2),
    ('tr','signal','Başkalarından bahsediyor','"Bu kız kardeşime de yardım edebilir" — o kadar onaylıyor ki yönlendirmeyi hayal ediyor.', E'Mentionne d''autres.', 3),
    ('tr','signal','Tanına katılıyor','"Tam olarak benim problemim" — maksimum hizalama.', E'D''accord avec diagnostic.', 4),
    ('tr','signal','Tekrarlamanı / netleştirmeni istiyor','Taahhüt etmeden önce emin olmak istediğinin işareti.', E'Veut être sûre.', 5),
    ('tr','propose','Satın almayı önerme',
     E'OK [isim], her şeyi gözden geçirdik. Gördüğüm kadarıyla, [ihtiyaç] üzerinde hizalısın ve bunun nasıl yardımcı olabileceğini görüyorsun.\n\nBu hafta başlamak ister misin? Yazılı özet gönderirim, kitin / programını sipariş etmeyi açıklarım, ve 10 gün sonra ilk değerlendirme için bir kontrol noktası belirleriz.',
     E'On démarre cette semaine ?', 1),
    ('tr','hesitation','Kapanışta tereddüt ederse',
     E'Tereddüt ettiğini hissediyorum, [isim]. Tam olarak ne hakkında? Fiyat, zamanlama, ya da başka bir şey?\n\nBeni neyin tıkadığını söyle, birlikte bakarız. Doğru zaman değilse, sorun değil, olana kadar bekleriz.',
     E'Tu hésites — sur quoi ?', 1),
    ('tr','final_no','Kesin hayırı kabullenmek',
     E'Anlıyorum [isim], net söylediğin için teşekkürler. Bir gün değişirse, çekinmeden ulaş.\n\nProjelerinde iyi şanslar 🙏',
     E'Merci de me le dire clairement.', 1);
end if; end$$;

-- 11. SPECIAL CASES ──────────────────────────────────────────────────────────
do $$ begin if (select count(*) from public.prospection_special_cases where market_code='tr') = 0 then
  insert into public.prospection_special_cases (market_code, kind, title, body, body_fr, position) values
    ('tr','reactivation_3_6m','Eski prospect''i yeniden aktive etmek (3-6 ay)',
     E'Selam [isim], uzun zaman oldu!\n\nProfiline rastladım ve [X ay önceki hedefin] hakkında nerede olduğunu merak ettim. Pitch yok, sadece meraktan.',
     E'Je tombe sur ton profil.', 1),
    ('tr','ghost_after_exchange','Birkaç alışverişten sonra seni ghost ederse',
     E'[isim], ısrar etmek istemedim ama nerede olduğunu anlamak isterim.\n\nHayır ise, hayır, ve bu OK. Basitçe söyle, sorgulamamı önler, ve artık mesaj almazsın.',
     E'Si c''est non c''est non, dis-le simplement.', 1),
    ('tr','referral_request','Tavsiye isteği (sonuçlardan sonra)',
     E'Selam [isim], [hedefin] hakkında sonuçlar görüyorsundur umarım. Sana bir şey sormak istedim.\n\nÇevrende eskiden senin aynı konuda zorlanan 1-2 kişi tanıyorsan — beni onlarla tanıştırmaya açık olur musun? Baskı yok, sadece doğal hissedersen.',
     E'Si tu connais 1-2 personnes ?', 1);
end if; end$$;

-- 12. STORYTELLING ───────────────────────────────────────────────────────────
do $$ begin if (select count(*) from public.prospection_storytelling where market_code='tr') = 0 then
  insert into public.prospection_storytelling (market_code, profile_slug, kind, title, body, position) values
    ('tr', null, 'structure_step', 'Başlangıç noktası',
     'Neredeydim — somut sorun, acı. Kesin ol: "her zaman bitkindim", "son hamileliğimden beri +12 kg".', 1),
    ('tr', null, 'structure_step', 'Tetikleyici',
     'Beni harekete geçiren — kesin olay, ideal olarak tarihle. "Ocak 2023''te, bir arkadaşım..."', 2),
    ('tr', null, 'structure_step', 'Değişim',
     'Ne oldu — mümkünse sayısal dönüşüm. "6 ayda, -12 kg" "değiştim"den çok daha inandırıcı.', 3),
    ('tr', null, 'structure_step', 'Şimdi neden',
     'Neden bunu bugün paylaşıyorum. Hikayeyi misyona dönüştüren cümle.', 4),
    ('tr','weight-women','example', 'Örnek — Kilo verme',
     E'5 yıl boyunca her zaman bitkindim. Üç çocuk, yoğun bir iş, ve son hamileliğimden beri 12 kg fazla. Tüm diyetleri denemiştim, hiç 3 aydan fazla işe yaramadı.\n\nOcak 2023''te, bir arkadaşım bana farklı bir yaklaşımdan bahsetti. Diyet değil — sürdürmeme yardım eden eşlik ve ürünlerle bir beslenme yeniden eğitimi.\n\n6 ayda, 12 kg''mı verdim, ama özellikle enerjimi geri kazandım. Ve geri almadım.\n\nBugün bunu paylaşıyorum çünkü her yerde aramanın ne demek olduğunu biliyorum. Hâlâ zorlananlara anahtarları vermeyi tercih ederim.', 1),
    ('tr','business','example', 'Örnek — Business',
     E'[X yıl] boyunca [meslek] idim. İyi maaş ama sıfır özgürlük. Son 3 yılda çocuklarımın büyümesini göremedim.\n\n[Ay yıl]''da, bu aktiviteden bahseden biriyle karşılaştım. Başta sahte bir MLM sandım, hayır dedim.\n\nAltı ay sonra, bir Pazar akşamı ajandama bakarken, fırsat kaçıranın ben olduğumu anladım. Kişiyi geri aradım.\n\nBugün, [X ay sonra], [somut sonuç]''um var. Ve özellikle zamanımı yönetiyorum.', 1),
    ('tr', null, 'rule', 'Dürüst kal',
     'Yolculuğun daha kısa veya daha az glamurlu olsa, olduğu gibi anlat. Otantiklik mükemmeliği yener.', 1),
    ('tr', null, 'rule', 'Abartılı rakamlar yok',
     E'"İlk ay 10 000 € kazandım" = kimse inanmaz.', 2),
    ('tr', null, 'rule', 'Kesin tarihler ver',
     E'"Mart 2023''te" "bir süre önce"den bin kat daha inandırıcıdır.', 3),
    ('tr', null, 'rule', 'Zorlukları üstlen',
     E'"Başta zorlandım, 3 ay sonra bırakmak istedim" muhatabını rahatlatır.', 4);
end if; end$$;

-- 13. ROUTINES ───────────────────────────────────────────────────────────────
do $$ begin if (select count(*) from public.prospection_routines where market_code='tr') = 0 then
  insert into public.prospection_routines (market_code, kind, title, detail, duration_minutes, position) values
    ('tr','routine_30m','Profilleri tara',
     '30-40 profil tara, 15-20 nitelikli seç (§2 flag''lere bak).', 10, 1),
    ('tr','routine_30m','M1 gönder',
     '15-20 kişiselleştirilmiş M1 gönder. Mesaj başına max 1 dk — kesin detay bulamazsan, geç.', 15, 2),
    ('tr','routine_30m','Sohbetlere cevap ver',
     'Devam eden sohbetler. Sıcak lead''lere öncelik.', 5, 3),
    ('tr','routine_1h','M1 prospection',
     '25-30 kişiselleştirilmiş mesaj. Daha geniş hedefler.', 15, 1),
    ('tr','routine_1h','Aktif sohbetler',
     'M2-M3''te derin çalışma + görüşme ayarlama. Pipeline''ı burada inşa edersin.', 30, 2),
    ('tr','routine_1h','Takip ve içerik',
     'Müşteri takipleri, günün Insta postu, G+2/G+5 Zoom sonrası.', 15, 3),
    ('tr','pre_send_checklist','[Profilden detay]''ı kesin bir şeyle kişiselleştirdim (genel değil).', null, null, 1),
    ('tr','pre_send_checklist','Mesajım hiçbir şey pitch''lemez (ürün yok, M1''de Zoom yok).', null, null, 2),
    ('tr','pre_send_checklist','Mesajım açık nitelendirici soru ile biter.', null, null, 3),
    ('tr','pre_send_checklist','3''ten fazla emoji yok.', null, null, 4),
    ('tr','pre_send_checklist','M1''de link yok (spam filtresi).', null, null, 5),
    ('tr','pre_send_checklist','Ton sakin, aceleci değil.', null, null, 6),
    ('tr','pre_send_checklist','Kişi hayır derse, temiz kapanış mesajım hazır.', null, null, 7);
end if; end$$;

commit;
