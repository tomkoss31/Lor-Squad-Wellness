-- =============================================================================
-- Chantier #3 V4 — Seed HI (2026-05-19)
--
-- Marché HI = Inde (1.4 Md, classe moyenne aisée). Langue : Hinglish (Hindi en
-- alphabet latin, mélangé avec anglais — c'est la langue RÉELLE des DM Insta/
-- WhatsApp en Inde). Pas Devanagari (script Hindi pur) sauf si profil le
-- justifie. WhatsApp = canal #1 (700M users). Sport et business souvent
-- en anglais pur (corporate / athletes desi).
-- =============================================================================

begin;

-- 1. MINDSET ─────────────────────────────────────────────────────────────────
do $$ begin if (select count(*) from public.prospection_mindset_blocks where market_code='hi') = 0 then
  insert into public.prospection_mindset_blocks (market_code, kind, title, body, position) values
    ('hi','truth','Yeh blind volume game nahi, sorting game hai.',
     E'Tera kaam convince karna nahi hai. Tera kaam sahi log sahi time pe dhundhna hai. 100 logo ko convince karne ke liye 100 messages bhejega toh ek hafte mein motivation khatam ho jayegi. 100 messages bhej ke 5 jo ready hai unko identify karega toh sustainable business banayega.', 1),
    ('hi','truth','Jitna relaxed hoga, utna attract karega.',
     E'Prospect turant feel kar leta hai agar tu desperate hai "recruit" karne ke liye. Detachment attracts. Pressure repels. Agar tujhe yeh sale rent ke liye chahiye, tere messages mein dikhta hai.', 2),
    ('hi','truth','Silence personal rejection nahi hai.',
     E'80% messages ka reply nahi aayega. Iska matlab tu bekaar nahi hai. Matlab log busy hai, sahi time nahi hai, ya sahi audience nahi hai. Continue kar.', 3),
    ('hi','error','Pehle message mein pitch karna.',
     E'Ek line mein 90% prospects kho deta hai. Pehle message ka ek hi goal hai: reply paana. Sell nahi.', 1),
    ('hi','error','Same message 50 logo ko bhejna.',
     E'Copy-paste door se feel hota hai. Kam se kam [profile ka detail] personalize kar. Agar precise detail nahi mil raha, woh accha prospect nahi hai — next pe ja.', 2),
    ('hi','error','Din 1, din 2, din 3 follow-up karna.',
     E'48 ghante mein coach se harasser ban jata hai. Sirf ek follow-up, din 3 pe, bas itna hi.', 3),
    ('hi','error','"Na"s pe argue karna.',
     E'Saaf "na" kabhi kabhi 6 mahine baad wapas aata hai. Galat handle kiya "na" kabhi wapas nahi aata.', 4),
    ('hi','error','Business model ke baare mein jhooth bolna.',
     E'Agar pucha jaye "MLM hai?", honest jawab haan hai. Jhooth bolne se teri credibility hamesha ke liye khatam ho jati hai.', 5);
end if; end$$;

-- 2. METRICS ─────────────────────────────────────────────────────────────────
do $$ begin if (select count(*) from public.prospection_metrics where market_code='hi') = 0 then
  insert into public.prospection_metrics (market_code, kind, label, value_min, value_max, value_unit, hint, position) values
    ('hi','funnel_step','M1 messages sent',         100, 100, 'msgs',    'Beginner baseline', 1),
    ('hi','funnel_step','Replies received',          15,  25, 'replies', 'Personalized M1 par 15-25%', 2),
    ('hi','funnel_step','Qualified conversations',    5,  10, 'convs',   '5-10 engaged dialogues', 3),
    ('hi','funnel_step','Calls booked',               1,   3, 'calls',   'Discovery call', 4),
    ('hi','funnel_step','New clients',                0,   1, 'clients', '1st client: budget 100-200 M1', 5),
    ('hi','pipeline_target','M1 sent awaiting reply', 50, 100, 'msgs',   'Stock steady rakh', 1),
    ('hi','pipeline_target','Active conversations',   10,  20, 'convs',  'Yeh juggle karega', 2),
    ('hi','pipeline_target','Calls booked next 7 days', 2, 5, 'calls',   'Kam ho toh M1 volume badha', 3),
    ('hi','pipeline_target','Clients in closing',      1,  3, 'leads',   'Tere finalists', 4),
    ('hi','weekly_kpi','M1 messages count',         null, null, 'count', 'Effort measure. Hafte mein 50 se kam = kam.', 1),
    ('hi','weekly_kpi','Reply rate',                null, null, 'pct',   '15% se kam = M1 quality revise kar.', 2),
    ('hi','weekly_kpi','Call→client conversion',    null, null, 'pct',   '20% se kam = closing revise kar.', 3);
end if; end$$;

-- 3. PROFILE FLAGS ───────────────────────────────────────────────────────────
do $$ begin if (select count(*) from public.prospection_profile_flags where market_code='hi') = 0 then
  insert into public.prospection_profile_flags (market_code, profile_slug, flag_type, text, position) values
    ('hi','weight-women','green','Recent activity (post < 2 weeks)', 1),
    ('hi','weight-women','green','Personal posts with engagement', 2),
    ('hi','weight-women','green','Clear bio with intent', 3),
    ('hi','weight-women','green','No competing coach in same niche', 4),
    ('hi','weight-women','red','Private profile no context', 1),
    ('hi','weight-women','red','100% business / shop / affiliate account', 2),
    ('hi','weight-women','red','No post in 6+ months', 3),
    ('hi','weight-women','red','Thousands of followers low engagement (fake)', 4),
    ('hi','weight-men','green','Recent activity', 1),
    ('hi','weight-men','green','Sport, performance, energy, intense work life posts', 2),
    ('hi','weight-men','green','Bio mentions clear goal (cutting, bulk, energy)', 3),
    ('hi','weight-men','green','No competing coach', 4),
    ('hi','weight-men','red','Private profile no context', 1),
    ('hi','weight-men','red','Bio pure looks (model, shoots)', 2),
    ('hi','weight-men','red','No post 6+ months', 3),
    ('hi','weight-men','red','Saturated gym influencer', 4),
    ('hi','sport','green','Active on practice (recent training post)', 1),
    ('hi','sport','green','Mentions precise goals (race, PR, season)', 2),
    ('hi','sport','green','Genuine engagement', 3),
    ('hi','sport','green','Not sponsored / not coached', 4),
    ('hi','sport','red','Pro athlete with sponsors', 1),
    ('hi','sport','red','No post 6+ months', 2),
    ('hi','sport','red','"Fitness shopping" profile no real practice', 3),
    ('hi','sport','red','Bio already "sports nutrition coach"', 4),
    ('hi','business','green','Recent activity, personal posts', 1),
    ('hi','business','green','Clear bio with profession or entrepreneur status', 2),
    ('hi','business','green','Real engagement (substantive comments)', 3),
    ('hi','business','green','Not top distri of competing MLM', 4),
    ('hi','business','red','Bio = only competing MLM affiliate link', 1),
    ('hi','business','red','High followers / zero engagement (fake)', 2),
    ('hi','business','red','No personal photo / no personal post', 3),
    ('hi','business','red','Stories saturated with business pitches', 4);
end if; end$$;

-- 4. SOURCES ─────────────────────────────────────────────────────────────────
do $$ begin if (select count(*) from public.prospection_sources where market_code='hi') = 0 then
  insert into public.prospection_sources (market_code, profile_slug, kind, label, detail, position) values
    ('hi', null, 'hashtag_advanced','Ideal Insta post ratio',
     E'60% value · 30% personal · 10% CTA. Classic mistake: sirf product/result photos. People follow YOU, not your products.', 1),
    ('hi', null, 'hashtag_advanced','30-second profile scan method',
     E'M1 bhejne se pehle 4 cheez check kar: (1) recent activity · (2) genuine engagement · (3) bio with clear intent · (4) no competing coach.', 2),
    ('hi','weight-women','fb_groups','Local wellness FB groups (India)',
     E'Search kar: "weight loss [city]", "healthy moms India", "mindful eating". DM se pehle value add kar.', 1),
    ('hi','weight-women','irl','School/playgroup pickups',
     'Moms 30-45, 8:30am/3:30pm slots, natural warm tone. Direct pitch nahi, rapport build kar.', 1),
    ('hi','weight-women','irl','Gyms (group classes)',
     'Pilates, yoga, Zumba. Heavy weights area se door (different target).', 2),
    ('hi','weight-women','recommendations','Personal network + current clients',
     'Best source of qualified leads. §8 dekh.', 1),
    ('hi','weight-women','inbound_content','Insta/TikTok weight loss content (desi context)',
     'Client testimonials, "what I wish I knew", Indian healthy recipes. Inbound leads 3× warmer.', 1),
    ('hi','weight-men','fb_groups','Local "men''s fitness India [city]" groups',
     'Bulk, cut, energy posts. Value add karke fir DM.', 1),
    ('hi','weight-men','irl','Gyms, CrossFit, team sports clubs',
     'Cricket, badminton, football. 6-8am or 7-9pm slots. Natural direct tone.', 1),
    ('hi','weight-men','recommendations','Professional network + male clients',
     'Referrals = #1 channel for this target (men''s circles tighter in India).', 1),
    ('hi','weight-men','inbound_content','Performance / recovery / work-energy content',
     '"Soft wellness" angle avoid kar → woman target. Performance, sleep, lean mass bol.', 1),
    ('hi','sport','fb_groups','Local running / CrossFit / cricket groups India',
     'Posts like "how do you handle nutrition on long training?". Value add.', 1),
    ('hi','sport','irl','CrossFit boxes, running clubs, gyms',
     'Physical presence = instant credibility. Session ke baad engage kar.', 1),
    ('hi','sport','recommendations','S&C coaches, physios, sports doctors',
     'Cross-referral partnerships. Win-win for athlete.', 1),
    ('hi','sport','inbound_content','Pre/peri/post-workout nutrition content',
     'Strava clubs, coach accounts. Amateur athletes wahaan hi hai.', 1),
    ('hi','business','fb_groups','"Side hustle India", "entrepreneur [city]" groups',
     'Lighter moderation than Insta. Business value before pitch.', 1),
    ('hi','business','irl','Coworking spaces, entrepreneur meetups (Bangalore, Mumbai, Delhi)',
     'Networking. MLM vibes nahi — peer tone.', 1),
    ('hi','business','recommendations','Existing pro network, ex-colleagues',
     'Word-of-mouth still most credible channel for business in India.', 1),
    ('hi','business','inbound_content','Mindset, independence, personal journey content',
     '"Get rich" angle avoid, "here''s my journey" priority. Storytelling §9.', 1);
end if; end$$;

-- 5. HASHTAGS ────────────────────────────────────────────────────────────────
update public.prospection_hashtags set category = 'mainstream'
  where market_code = 'hi' and hashtag in (
    '#weightlossindia','#healthylifestyleindia','#indianfitness',
    '#fitnessindia','#gymindia','#runnersindia',
    '#entrepreneurindia','#financialfreedomindia','#workfromhomeindia'
  );

update public.prospection_hashtags set category = 'niche'
  where market_code = 'hi' and hashtag in (
    '#fitmomindia','#desifitness','#weightlossjourneyindia','#healthylifestyleindia2026','#indianwellness','#desimomwellness','#mindfulindia',
    '#bodybuildingindia','#crossfitindia','#indianathlete','#sportsnutritionindia','#fitindia2026','#recoveryindia',
    '#sidehustleindia','#womenentrepreneur','#indianentrepreneur2026','#sidehustleindia2026','#womenentrepreneurindia','#wellnessbusinessindia'
  );

update public.prospection_hashtags set
  category = 'cross',
  crossover_hint = '#fitmomindia ya #postpartumindia ke saath cross kar, moms niche ke liye.'
  where market_code = 'hi' and profile_slug = 'weight-women' and hashtag = '#weightlossindia';

update public.prospection_hashtags set
  category = 'cross',
  crossover_hint = 'City hashtag ke saath cross (#mumbai #bangalore #delhi) local target ke liye.'
  where market_code = 'hi' and profile_slug = 'sport' and hashtag = '#runnersindia';

insert into public.prospection_hashtags (market_code, profile_slug, hashtag, category, crossover_hint, position) values
  ('hi','weight-men','#dadbodindia','niche',null,1),
  ('hi','weight-men','#desifit','niche',null,2),
  ('hi','weight-men','#fitover40india','niche',null,3),
  ('hi','weight-men','#weightlossformenindia','mainstream',null,4),
  ('hi','weight-men','#bulkingindia','niche',null,5),
  ('hi','weight-men','#cuttingindia','niche',null,6),
  ('hi','weight-men','#mensfitnessindia','mainstream',null,7),
  ('hi','weight-men','#busydadindia','cross','Profession/age hashtag ke saath cross (#corporatedadindia, #entrepreneurdadindia) 30-50 working male target ke liye.',8)
on conflict (market_code, profile_slug, hashtag) do nothing;

-- 6. SCRIPTS M1 weight-men ───────────────────────────────────────────────────
do $$ begin if (select count(*) from public.prospection_scripts where market_code='hi' and profile_slug='weight-men') = 0 then
  insert into public.prospection_scripts (market_code, profile_slug, platform, body, body_fr, tip, position, kind, label, language_label) values
    ('hi','weight-men','insta',
     E'Hi [name],\n\nMaine [profile detail] pe tera post dekha. Main men ke saath nutrition aur back-in-shape ke upar kaam karta hu — mostly fat loss, energy aur recovery jab work intense ho aur training bhi.\n\nQuick question — tu zyada fat loss pe hai, lean bulk pe, ya sirf daily energy wapas paana chahta hai?',
     E'Vu ton post. Coaching nutrition hommes : cut, énergie, récup. Tu es plutôt cut, bulk propre, ou retrouver de l''énergie ?',
     'Hinglish naturel pour Inde DM. Anglais technique + hindi conversationnel mélangé.',
     1, 'first_contact', 'Instagram DM · First contact', '🇮🇳 Hinglish'),
    ('hi','weight-men','whatsapp',
     E'Hi [name]! Main [your name], hum [context] pe connect hue the. Tune mujhe [fat loss / energy / training] ke baare mein bola tha. Kaisa chal raha hai?',
     E'Salut, on s''est connectés via [contexte]. Tu m''avais parlé de [détail]. Tu en es où ?',
     'WhatsApp #1 channel Inde (700M users). Hinglish chaleureux.',
     1, 'first_contact', 'WhatsApp · Direct contact', '🇮🇳 Hinglish'),
    ('hi','weight-men','fb',
     E'Hi [name], [group name] mein tera post dekha [detail] ke baare mein. Main nutrition coach hu [city] mein, 30-50 men ke saath back-in-shape pe kaam karta hu — especially jo demanding job + training combine karte hai aur nahi chahte body crash ho.\n\nTu kahaan hai? Specific kuch dhundh raha hai ya experiment kar raha hai?',
     E'Coach nutrition, 30-50 hommes, remise en forme. Tu en es où ?',
     'FB Messenger Inde, ton plus posé. Groupes "men''s fitness India" mine d''or.',
     1, 'first_contact', 'Facebook Messenger · First contact', '🇮🇳 Hinglish'),
    ('hi','weight-men','sms',
     E'Hi [name], main [your name]. Hum [context] ke baare mein baat kiye the. Agar tu abhi bhi [goal] pe hai, bata, is hafte baat kar sakte hai.',
     E'Salut, c''est [ton prénom]. On avait parlé de [contexte]. Si tu es toujours sur [objectif], dis-moi.',
     'SMS Hinglish court, "real person" feel.',
     1, 'first_contact', 'SMS · Short & grounded', '🇮🇳 Hinglish');
end if; end$$;

-- 7. REPLY TREE ──────────────────────────────────────────────────────────────
do $$ begin if (select count(*) from public.prospection_reply_tree where market_code='hi') = 0 then
  insert into public.prospection_reply_tree (market_code, profile_slug, level, branch, body, body_fr, tip, position) values
    ('hi','weight-women','M2','positive',
     E'Achha laga ki tune share kiya, [name] 🙏\n\nBetter reply dene ke liye — yeh goal long time se hai ya recently aaya? Aur kuch try kiya jo work nahi hua?\n\nIsliye puch raha hu kyuki tere position ke hisaab se, ya toh concrete cheez share karunga ya nahi karunga. Tujhe pe depend karta hai.',
     E'Top. Objectif récent ou de longue date ?', 'Creuser.', 1),
    ('hi','weight-women','M2','vague',
     E'Samjha [name]. Often aisa hi hota hai — feel hota hai kuch change karna hai bina exactly pata ke kya.\n\nDifferent angle: aaj tujhe sabse zyada kya bother karta hai? Scale number, kapde mein kaisa feel karti hai, energy, food relationship? Usually ek point stand out karta hai.',
     E'Quel est LE point qui te dérange ?', 'Question fermée.', 1),
    ('hi','weight-women','M2','negative',
     E'Koi baat nahi [name], reply karne ke liye time nikalne ke liye thanks 🙏\n\nAll the best. Agar kabhi change ho, bina hesitation reach out karna.',
     E'Pas de souci.', 'Fermeture propre.', 1),
    ('hi','weight-women','M2','question',
     E'Acchi question.\n\nShort mein, main nutrition pe coaching deta hu — koi restrictive diet nahi. Balanced eating, energy, aur lasting habits pe kaam karte hai. Natural products as complement use karta hu jab relevant ho.\n\nLekin aur batane se pehle, mujhe bata tu kahaan hai. Yahi decide karega ki main help kar sakta hu ya nahi.',
     E'Coaching nutrition pas régime.', 'Réponse courte puis recentre.', 1),
    ('hi','weight-women','M3','hot',
     E'Sab share karne ke liye thanks [name], yeh valuable hai 🙏\n\nJo tune describe kiya, main often dekhta hu. Good news: right approach se manageable hai.\n\nMujhe text mein sab dump karna nahi pasand. Is hafte 15-20 min Zoom karenge? Main concretely dikhata hu kaise kaam karta hu, tu decide karna fits ya nahi. Zero commitment.\n\n[day 1] ya [day 2]?',
     E'Visio 15-20 min, zéro engagement.', 'Choix de date.', 1),
    ('hi','weight-women','M3','lukewarm',
     E'Koi baat nahi [name], force nahi karna chahta.\n\nMera contact chhod raha hu. Jab bhi resonate kare, reach out kar. Aur agar koi concrete cheez try karne ke liye chahiye in the meantime, bata, share karta hu.',
     E'Je laisse mon contact.', 'Échantillon.', 1),
    ('hi','weight-men','M2','positive',
     E'Achha hai tu cut to the chase karta hai, [name] 💪\n\nAur bata: per week kitne sessions, aur kya actually block kar raha hai abhi? Recovery, end-of-day energy, training ke bawajood fat gain, sleep?\n\nKahaan stuck hai uske hisaab se different jawab.',
     E'Top cash. Combien de séances ?', 'Vocabulaire perf.', 1),
    ('hi','weight-men','M2','vague',
     E'OK [name], samjha.\n\nMore direct question: tu weeks stack kar pa raha hai bina energy crash ke, ya kabhi feel hota hai rope kheech raha hai?\n\nMost guys jo main milta hu "fine" manage karte hai... jab tak wall hit nahi karte (fatigue, fat gain, injury). Agar tu first camp mein hai, great. Nahi toh dig kar sakte hai.',
     E'Tu enchaînes ou tu tires sur la corde ?', 'Pique légère.', 1),
    ('hi','weight-men','M2','negative',
     E'Koi baat nahi [name], question puchhna chahta tha, force nahi 🙏\n\nTraining mein best.',
     E'Pas de souci.', 'Fermeture virile.', 1),
    ('hi','weight-men','M2','question',
     E'Acchi question.\n\nConcretely, main men ke saath nutrition pe kaam karta hu — goal ke hisaab se performance, recovery, lean bulk ya fat loss. Protein, targeted supplements (creatine, BCAAs) as complement use karta hu solid food intake ke saath.\n\nMujhe pehle bata kya tujhe block kar raha hai ya kya improve karna hai. Mera jawab guide karega.',
     E'Coaching nutrition hommes : perf, récup, bulk ou cut.', 'Technique.', 1),
    ('hi','weight-men','M3','hot',
     E'Jo tune describe kiya classic hai [name], aur unlock karne ka scope hai.\n\nWall of text ki jagah — 20 min Zoom? Main dikhata hu kaise men nutrition analyze karta hu, tu decide karna lands ya nahi. Zero commitment.\n\n[day 1] ya [day 2]?',
     E'Visio 20 min.', 'Format court.', 1),
    ('hi','weight-men','M3','lukewarm',
     E'Koi baat nahi [name], apna time le.\n\nAgar chahe [tera blocker] pe 2-3 concrete cheez share karu bina call ke, bata, bhej dunga. Nahi toh whenever reconnect karenge.',
     E'2-3 tips concrets.', 'Tips concrets.', 1),
    ('hi','sport','M2','positive',
     E'Awesome [name] 💪\n\nAur bata: weekly volume kya hai, aur kya cheez sabse zyada bug karti hai? Recovery between sessions, long sessions ke end mein energy, race ke time digestive issues, sleep?\n\nBekaar nahi puch raha — blocker ke hisaab se same nahi bolunga.',
     E'Top. Volume hebdo, point bloquant ?', 'Sportif.', 1),
    ('hi','sport','M2','vague',
     E'Cool agar roll kar raha hai, [name].\n\nJust curious: weeks stack karta hai bina dips ke, ya kabhi feel hota hai rope kheech raha hai? Most athletes "fine" manage karte hai... jab tak wall nahi hit karte.',
     E'Si ça roule top.', 'Universal.', 1),
    ('hi','sport','M2','negative',
     E'Koi baat nahi [name], puchhna chahta tha 🙏 Best in training.',
     E'Pas de souci.', 'Propre.', 1),
    ('hi','sport','M2','question',
     E'Acchi question. Athletes ke saath nutrition coach karta hu: pre/peri/post-effort, recovery between sessions, energy on long distances. Targeted products (protein, electrolytes, vitamins) as complement. Mujhe pehle bata kya block kar raha hai.',
     E'Nutrition sport.', 'Technique.', 1),
    ('hi','sport','M3','hot',
     E'Classic [name], unlock karne ka scope hai. 20 min Zoom? Zero commitment. [day 1] ya [day 2]?',
     E'Visio 20 min.', 'Format court.', 1),
    ('hi','sport','M3','lukewarm',
     E'Koi baat nahi. 2-3 concrete tips [blocker] pe bina call ke chahe toh bata.',
     E'Tips.', 'Concrets.', 1),
    ('hi','business','M2','positive',
     E'Cool [name], open hone ke liye thanks 🙏\n\nShort mein: wellness pe hai (nutrition, well-being). International team ke saath kaam karta hu. Model mujhe [tera activity] ke saath income build karne deta hai.\n\nDetails se pehle — abhi yeh explore karne ke liye tujhe kya push kar raha hai? Specific goal (extra income, independence, career change), ya curiosity?',
     E'Cadre + question qualifiante.', 'Mesure motivation.', 1),
    ('hi','business','M2','vague',
     E'Legit question [name].\n\nMain straight bolunga: yeh aisa model hai jisme tu wellness products distribution activity build karta hai, with a team jo train kare. Upfront investment hai, aur grow karta hai tere time put-in ke hisaab se.\n\nPicture aa raha hai? Agar tera scene nahi hai, straight bol — main clear "no" prefer karta hu fake "yes" ke instead.',
     E'Transparence radicale.', 'Crédibilité.', 1),
    ('hi','business','M2','negative',
     E'Koi baat nahi [name], straight reply ke liye thanks 🙏\n\nMaine tag kar liya tha shayad tera scene nahi hai. Agar kabhi conversation make sense kare, naturally hogi.',
     E'Fermeture chaleureuse mais nette.', 'Revient parfois.', 1),
    ('hi','business','M2','question',
     E'Tu straight point pe jata hai, mujhe pasand [name].\n\nMain [company name] ke saath nutrition/wellness side pe kaam karta hu. Company [X years] se hai aur [Y countries] mein hai.\n\nLekin product sirf half story hai. Other half distribution model hai. Easier Zoom pe explain karna, agar open hai. Agar already fixed opinion hai is type ke model pe, bata — time waste nahi karenge.',
     E'Transparence + filtre.', 'Direct.', 1),
    ('hi','business','M3','hot',
     E'Jo tu bol raha hai exactly woh hai jo main sunna chahta tha [name] — tu clear lagta hai tu kya dhundh raha hai.\n\nAur aage jaane ke liye, 30 min Zoom? Main model properly walk karunga: company, products, comp plan, time and investment required. Tu sab puchh. Phir saath dekhenge.\n\nHidden pitch nahi, fake urgency nahi. Pure info. [day 1] ya [day 2]?',
     E'Visio 30 min, transparence.', 'Format sérieux.', 1),
    ('hi','business','M3','lukewarm',
     E'Sense aata hai right timing nahi hai [name], koi baat nahi.\n\nMera contact chhod raha hu. Jab feel ho "let me dig into this story", reach out kar.',
     E'Posé.', 'Revient.', 1);
end if; end$$;

-- 8. OBJECTIONS ──────────────────────────────────────────────────────────────
insert into public.prospection_objections (market_code, slug, title, meaning, bad_response, good_response, good_response_fr, warning, position) values
  ('hi','cest-cher','Mehnga hai',
   'Ya toh value nahi dikh rahi, ya woh paisa is pe nahi laga sakti/lagana chahti.',
   'Downplay karna ("ek chai ki price"), ya pehli objection pe discount dena.',
   E'Samjha [name]. Kya ke comparison mein mehnga? Aur kya cheez ise tere eyes mein worth banayegi?\n\nConvince karne ke liye nahi puch raha — tere reply ke hisaab se, ya right time nahi hai, ya more suitable format dekhte hai.',
   E'Cher par rapport à quoi ?', null, 1),
  ('hi','pas-le-temps','Mere paas time nahi hai',
   'Ya priority nahi, ya darr hai zyada time legi.',
   E'"Lekin yeh fast hai!" — lazy answer jo objection address nahi karta.',
   E'Fair, aur often isiliye cheez move nahi karti kyuki hum time nahi nikalte.\n\nAgar main bolun "3 mahine baad ruk ke tu bata", yeh open hai ya firm no? No wrong answer.',
   E'On attend 3 mois et tu me redis ?', null, 2),
  ('hi','herbalife-mlm','Yeh Herbalife / MLM / pyramid scheme hai?',
   'Scam hone ka darr, ya bad experience (disappointed relative).',
   'Deny karna, "no it''s different" bolna, deflect karna.',
   E'Haan [brand] hai, aur haan multi-level distribution hai. Illegal sense mein pyramid nahi — difference yeh hai ki real product hai jo end clients consume karte hai.\n\nTrue aur false stuff circulate karta hai is model pe. Tu mujhe bata kya specifically tujhe block karta hai, main straight reply karunga.',
   E'Oui c''est [marque], distribution multi-niveaux.',
   'Jhooth bolne se credibility hamesha ke liye khatam.', 3),
  ('hi','deja-essaye','Maine X try kiya aur work nahi hua',
   'Disappointed, suspicious, reassurance chahti hai ki yeh same nahi hoga.',
   E'"Lekin yeh different hai!" — bina explain kiye kyu.',
   E'I hear you [name]. Actually kya hua? Kahaan break hua uske hisaab se — motivation, method, support, product — main bata sakta hu tu same trap mein fasega ya nahi. Koi magic promise nahi, sirf honesty.',
   E'Qu''est-ce qui s''est passé concrètement ?', null, 4),
  ('hi','en-parler-conjoint','Mujhe apne husband/wife se baat karni hai',
   'Ya legit couple decision, ya polite escape.',
   E'"Yeh teri decision hai!" (patronizing), ya "Tujhe unki approval nahi chahiye!"',
   E'Of course, healthy hai baat karna. Tu chahe main clear summary prep karu unke liye, ya khud explain karna chahegi? Aur concretely, hum kab wapas baat karenge?',
   E'Résumé clair, on se redit quoi quand ?',
   'Le "quand" oblige à fixer date.', 5),
  ('hi','je-reflechis','Main sochta/sochti hu',
   '90% = polite "no". 10% = actually think karne ki need.',
   E'"Apna time le!" → kesin lose kiya.',
   E'OK [name] — yeh "yes lekin digest karne ki need" hai, ya "no lekin face pe nahi bolna chahta"?\n\nDono OK hai, sirf janna chahta hu. No hai toh dono ka time bachta hai.',
   E'"Oui mais je digère" ou "non mais je veux pas le dire" ?', null, 6),
  ('hi','trop-beau','Sach hone ke liye too good lag raha',
   'Healthy suspicion. Actually good sign.',
   'Reassure karne ke liye promises double down karna (backfires).',
   E'Tu sahi hai suspicious hone mein. Magic nahi hai. Behind work hai, sab ke liye work nahi karta, results tujhe pe depend.\n\nAgar chahe main less glamorous sides bhi bataun: kya require karta hai, log kahaan quit karte hai, kyu kuch fail karte hai.',
   E'T''as raison de te méfier.', null, 7),
  ('hi','combien-tu-gagnes','Tu kitna kamata/kamati hai?',
   'Concrete proof chahti hai, BS nahi.',
   'Wild numbers throw karna, ya dodge karna.',
   E'Straight up: main [Y mahine/saal] ke baad [₹X/mahina] pe hu. Transparency ke liye, mere first months [₹Z] the. Progressive aur tujhe pe depend karta time aur kis se ghire ho.\n\nAgar chahe, company ke official numbers dikha sakta hu (average distributor income — public aur required).',
   E'Je suis à [X/mois]. Earnings disclosure publique.',
   'KABHI numbers invent nahi karna. Disclosure obligatory.', 8),
  ('hi','ton-interet','Lekin tu paisa kamayega agar main sign up karu',
   'Sure hona chahti hai ki tu uske bhale ke liye baat kar raha hai, sirf commission ke liye nahi.',
   'Apna interest deny ya minimize karna — dishonest perceive hota hai.',
   E'Haan true hai, aur let''s be clear. Main earn karta hu jab sponsor kiya hua koi produce kare — toh mera zero interest hai kisi ko sponsor karne mein jo nahi karega. Yeh just more work for nothing hai.\n\nMera interest aligned logo ke saath kaam karna hai. Agar tu woh nahi hai, no problem, dono ka time waste.',
   E'Oui c''est vrai.', null, 9)
on conflict (market_code, slug) do nothing;

-- 9. FOLLOWUPS ───────────────────────────────────────────────────────────────
do $$ begin if (select count(*) from public.prospection_followups where market_code='hi') = 0 then
  insert into public.prospection_followups (market_code, kind, day_offset, title, body, body_fr, warning, position) values
    ('hi','post_call', 0, 'D0 — Call ke turant baad',
     E'Thanks [name] chat ke liye! Jaise decide kiya, tujhe digest karne ke liye chhod raha hu.\n\nQuick recap:\n1. [key point 1]\n2. [key point 2]\n3. [key point 3]\n\nKal tak koi question ho, message kar. Good evening 🙏',
     E'Merci pour l''échange ! Récap.', null, 1),
    ('hi','post_call', 2, 'D+2 — First check',
     E'Hey [name], hope tu theek hai! Sochne ya questions raise karne ka time mila?\n\nBata kahaan hai, even agar no ho — silence se zyada useful.',
     E'T''as eu le temps ?', null, 2),
    ('hi','post_call', 5, 'D+5 — Last message',
     E'Hi [name], mera last message taaki main hound nahi karu 🙏\n\nAbhi bhi sure nahi hai, ya baad mein revisit karna chahta hai, bata. Nahi toh main let go karta hu.',
     E'Dernier message.', 'Si pas de réponse au J+5, ARRÊTE.', 3),
    ('hi','post_call', 30, 'D+30 — Reactivation',
     E'Hey [name], ek mahina ho gaya, bas check karne aaya 😊\n\n[tera goal] pe kahaan hai? Koi pitch nahi, sirf curious.',
     E'Ça fait un mois.', null, 4),
    ('hi','client_onboarding', 0, 'D0 — Purchase ka din',
     E'Hi [name]! Welcome aboard 💪 Start ke liye sab bhej raha hu. Ek call [day] ko schedule karte hai dekhne ke liye kaise products ke saath comfortable ho raha hai?',
     E'Bienvenue !', null, 1),
    ('hi','client_onboarding', 7, 'D+7 — Pehla hafta',
     E'Hey [name], pehla hafta done! Kaisa chal raha hai? [main habit] integrate kar pa raha hai? Bata kya work karta hai aur kya stuck hai.',
     E'Première semaine !', null, 2),
    ('hi','client_onboarding', 30, 'D+30 — Pehla mahina',
     E'Hey [name], already ek mahina 🎉 Review ka time? Saath dekhte hai kya shift hua aur kya adjust karna hai month 2 ke liye.',
     E'Déjà un mois !', null, 3),
    ('hi','reactivation_old', 90, 'D+90 — Purana prospect',
     E'Hey [name], bahut time ho gaya!\n\nTera profile dikha aur main soch raha tha [X mahine pehle ke tera goal] pe kahaan hai. Koi pitch nahi, sirf curious.',
     E'Je tombe sur ton profil.',
     'Sirf prospects ke saath jo initial interest dikhaya tha.', 1);
end if; end$$;

-- 10. CLOSING ────────────────────────────────────────────────────────────────
do $$ begin if (select count(*) from public.prospection_closing where market_code='hi') = 0 then
  insert into public.prospection_closing (market_code, kind, title, body, body_fr, position) values
    ('hi','signal','Price, start date, timeline ke baare mein precise questions','Mentally purchase mein project kar rahi hai.', E'Projection.', 1),
    ('hi','signal','Future tense mein baat kar rahi hai','"Jab main client banungi...", "September se start karu..." — mental projection.', E'Parle au futur.', 2),
    ('hi','signal','Aur logo ko mention karti hai','"Yeh meri behan ko bhi help karega" — itna validate kar rahi hai ki refer karne ka imagine kar rahi hai.', E'Mentionne d''autres.', 3),
    ('hi','signal','Tere diagnosis se agree karti hai','"Bilkul yahi mera problem hai" — maximum alignment.', E'D''accord.', 4),
    ('hi','signal','Repeat / clarify karne ke liye puchti hai','Sure hone ka sign commit karne se pehle.', E'Veut être sûre.', 5),
    ('hi','propose','Purchase propose karna',
     E'OK [name], hum ne sab cover kar liya. Jo main dekh raha hu, tu [need] pe aligned hai aur dekh rahi hai kaise yeh help kar sakta hai.\n\nIs hafte start karte hai? Main written recap bhejunga, kit / program order karna explain karunga, aur 10 days mein check ke liye time schedule karte hai.',
     E'On démarre cette semaine ?', 1),
    ('hi','hesitation','Agar closing pe hesitate kare',
     E'Sense aata hai tu hesitate kar rahi hai, [name]. Kis pe exactly? Price, timing, ya kuch aur?\n\nBata kya block kar raha hai, saath dekhte hai. Right time nahi hai toh koi baat nahi, wait karte hai.',
     E'Tu hésites — sur quoi ?', 1),
    ('hi','final_no','Final no accept karna',
     E'Samjha [name], clear bolne ke liye thanks. Agar kabhi change ho, bina hesitation reach out karna.\n\nProjects mein best 🙏',
     E'Merci de me le dire clairement.', 1);
end if; end$$;

-- 11. SPECIAL CASES ──────────────────────────────────────────────────────────
do $$ begin if (select count(*) from public.prospection_special_cases where market_code='hi') = 0 then
  insert into public.prospection_special_cases (market_code, kind, title, body, body_fr, position) values
    ('hi','reactivation_3_6m','Purana prospect reactivate karna (3-6 mahine baad)',
     E'Hey [name], bahut time ho gaya!\n\nTera profile dikha aur main soch raha tha [X mahine pehle ke tera goal] pe kahaan hai. Koi pitch nahi, sirf curious.',
     E'Je tombe sur ton profil.', 1),
    ('hi','ghost_after_exchange','Agar several exchanges ke baad ghost kare',
     E'[name], insist nahi karna chahta lekin samajhna chahta hu kahaan hai.\n\nNo hai toh no, aur OK. Simply bata, mujhe wonder karne se save karta hai, aur tu se aur message nahi aayega.',
     E'Si c''est non c''est non, dis-le simplement.', 1),
    ('hi','referral_request','Referral request (results ke baad)',
     E'Hey [name], hope [tera goal] pe results dekh rahi hai. Tujhe kuch puchna chahta tha.\n\nAgar tu 1-2 log jaante hai apne around jo same topic se struggle karte hai jaise tu pehle — kya tu OK hogi inhe introduce karne ke liye? Koi pressure nahi, sirf agar natural feel ho.',
     E'Si tu connais 1-2 personnes ?', 1);
end if; end$$;

-- 12. STORYTELLING ───────────────────────────────────────────────────────────
do $$ begin if (select count(*) from public.prospection_storytelling where market_code='hi') = 0 then
  insert into public.prospection_storytelling (market_code, profile_slug, kind, title, body, position) values
    ('hi', null, 'structure_step', 'Starting point',
     'Main kahaan thi — concrete problem, pain. Precise ban: "hamesha exhausted thi", "last pregnancy se +12 kg", "things were rough" nahi.', 1),
    ('hi', null, 'structure_step', 'Trigger',
     'Kya cheez ne mujhe move kiya — specific event, ideally date ke saath. "January 2023 mein, ek friend ne mujhe..."', 2),
    ('hi', null, 'structure_step', 'Change',
     'Kya hua — quantified transformation if possible. "6 mahine mein -12 kg" "main change ho gayi" se zyada credible.', 3),
    ('hi', null, 'structure_step', 'Abhi kyu',
     'Aaj main yeh kyu share kar rahi hu. Yeh sentence story ko mission mein convert karta hai.', 4),
    ('hi','weight-women','example', 'Example — Weight loss',
     E'5 saal tak main hamesha exhausted thi. Teen bachhe, demanding job, aur last pregnancy se 12 kg extra. Maine har diet try ki thi, kabhi 3 mahine se zyada nahi chala.\n\nJanuary 2023 mein, ek friend ne mujhe different approach ke baare mein bataya. Diet nahi — eating re-education with support aur products jo mujhe stick karne mein help kiye.\n\n6 mahine mein, 12 kg kam kiya, lekin sabse zyada energy wapas pai. Aur regain nahi kiya.\n\nAaj main yeh share karti hu kyuki main jaanti hu kya feel hota hai har jagah dhoondhne ka bina paye. Main prefer karti hu keys un logo ko dena jo abhi struggle kar rahe hai.', 1),
    ('hi','business','example', 'Example — Business',
     E'Main [X saal] se [profession] thi. Decent salary lekin zero freedom. Last 3 saal mein apne bachhon ko grow karte nahi dekha.\n\n[Month year] mein, kisi se cross hua jisne is activity ke baare mein bataya. Pehle bogus MLM samjha tha, na bola.\n\nChhe mahine baad, Sunday raat ko calendar dekhte hue, realize hua main hi miss kar raha tha. Person ko wapas call kiya.\n\nAaj, [X mahine baad], [concrete result] hai. Aur sabse zyada main apna time manage karta hu.', 1),
    ('hi', null, 'rule', 'Honest rah',
     'Agar tera journey shorter ya less glamorous hai, as-is bata. Authenticity perfection se win karta hai.', 1),
    ('hi', null, 'rule', 'Koi outrageous numbers nahi',
     E'"Maine first mahine mein 5 lakh kamaye" = koi believe nahi karega.', 2),
    ('hi', null, 'rule', 'Precise dates de',
     E'"March 2023 mein" "kuch time pehle" se hazaar guna zyada credible hai.', 3),
    ('hi', null, 'rule', 'Struggles own kar',
     E'"Pehle main struggle kiya, 3 mahine baad quit karna chahta tha" tere listener ko reassure karta hai.', 4);
end if; end$$;

-- 13. ROUTINES ───────────────────────────────────────────────────────────────
do $$ begin if (select count(*) from public.prospection_routines where market_code='hi') = 0 then
  insert into public.prospection_routines (market_code, kind, title, detail, duration_minutes, position) values
    ('hi','routine_30m','Profiles scan kar',
     '30-40 profiles scan, 15-20 qualified select kar (§2 flags dekh).', 10, 1),
    ('hi','routine_30m','M1 bhej',
     '15-20 personalized M1 bhej. Max 1 min per message — detail nahi mil raha toh skip.', 15, 2),
    ('hi','routine_30m','Conversations reply',
     'Ongoing conversations handle kar. Hot leads priority.', 5, 3),
    ('hi','routine_1h','M1 prospecting',
     '25-30 personalized messages. Wider targets, more template variations.', 15, 1),
    ('hi','routine_1h','Active conversations',
     'M2-M3 pe deep work + call bookings. Yahaan pipeline build hoti hai.', 30, 2),
    ('hi','routine_1h','Follow-up & content',
     'Client follow-ups, Insta post of the day, D+2/D+5 post-Zoom check-ins.', 15, 3),
    ('hi','pre_send_checklist','[Profile detail] kuch precise ke saath personalize kiya (generic nahi).', null, null, 1),
    ('hi','pre_send_checklist','Mera message kuch pitch nahi karta (M1 mein koi product nahi, koi Zoom nahi).', null, null, 2),
    ('hi','pre_send_checklist','Mera message open qualifying question ke saath end hota hai.', null, null, 3),
    ('hi','pre_send_checklist','3 se zyada emojis nahi.', null, null, 4),
    ('hi','pre_send_checklist','M1 mein koi link nahi (spam filter).', null, null, 5),
    ('hi','pre_send_checklist','Tone grounded hai, rushed nahi.', null, null, 6),
    ('hi','pre_send_checklist','Agar woh no bole, mera clean closing message ready hai.', null, null, 7);
end if; end$$;

commit;
