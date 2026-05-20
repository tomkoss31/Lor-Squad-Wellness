-- =============================================================================
-- Chantier #3 V5 — Post-appel + Closing + Cas spéciaux CLEAN (2026-05-20)
--
-- Suite logique des seeds v5 (M1 + M2/M3 + objections déjà clean).
--
-- 3 chantiers :
--   1. POST-APPEL    : 4 touches J0/J+2/J+5/J+30 × 6 langues = 24
--   2. CLOSING       : 5 signaux + 3 scripts × 6 langues     = 48
--   3. CAS SPÉCIAUX  : 3 playbooks × 6 langues               = 18
--
-- Total : 90 entrées.
--
-- Principes v5 appliqués partout :
--   - Pas de "sans pression / no commitment"
--   - Porte de sortie systématique (un "non" clair est plus utile qu'un silence)
--   - Honnêteté radicale (jamais d'insistance, jamais de manipulation)
--   - Sur final_no : laisser la porte ouverte propre, ne pas relancer
--
-- ES + PT marqués needs_native_review = true.
-- =============================================================================

begin;

-- ─── Schema : colonnes needs_native_review + contraintes unique ───────────

alter table public.prospection_followups
  add column if not exists needs_native_review boolean not null default false;
alter table public.prospection_closing
  add column if not exists needs_native_review boolean not null default false;
alter table public.prospection_special_cases
  add column if not exists needs_native_review boolean not null default false;

-- Contraintes unique pour idempotence
alter table public.prospection_followups
  drop constraint if exists prospection_followups_unique_combo;
alter table public.prospection_followups
  add constraint prospection_followups_unique_combo
  unique (market_code, kind, day_offset);

alter table public.prospection_closing
  drop constraint if exists prospection_closing_unique_combo;
alter table public.prospection_closing
  add constraint prospection_closing_unique_combo
  unique (market_code, kind, position);

alter table public.prospection_special_cases
  drop constraint if exists prospection_special_cases_unique_combo;
alter table public.prospection_special_cases
  add constraint prospection_special_cases_unique_combo
  unique (market_code, kind);

-- Wipe existant
delete from public.prospection_followups;
delete from public.prospection_closing;
delete from public.prospection_special_cases;

-- ============================================================================
-- 1. POST-APPEL — 4 touches J0/J+2/J+5/J+30 × 6 langues = 24 entrées
-- ============================================================================

insert into public.prospection_followups
  (market_code, kind, day_offset, title, body, body_fr, warning, position, needs_native_review) values

-- FR
('fr','post_call', 0, 'J0 · juste après l''appel',
 E'Merci pour notre échange [prénom] 🙏 Petit récap : on a vu [point 1], [point 2], [point 3]. Je te laisse digérer — si tu veux qu''on creuse, dis-moi avant [date].',
 null, null, 1, false),
('fr','post_call', 2, 'J+2 · check léger',
 E'Hey [prénom], j''espère que tu vas bien. Tu as eu le temps de regarder ce qu''on s''était dit ? Pas de pression — si tu as une question précise ou un blocage, dis-moi.',
 null, null, 2, false),
('fr','post_call', 5, 'J+5 · dernier message',
 E'[prénom] dernier message de ma part — tu en es où dans ta réflexion ? Si c''est non c''est OK, dis-le moi clairement, je préfère un non franc qu''un silence. Et si c''est oui, on cale.',
 null,
 E'Si pas de réponse au J+5, tu ARRÊTES. Pas de J+6, J+10. Un non non-dit est un non.',
 3, false),
('fr','post_call', 30, 'J+30 · check sympa',
 E'Hey [prénom], ça fait un mois — comment ça avance pour toi sur [objectif] ? Pas de pitch derrière, juste curieux de tes nouvelles.',
 null, null, 4, false),

-- EN
('en','post_call', 0, 'D0 · right after the call',
 E'Thanks for our chat [name] 🙏 Quick recap: we covered [point 1], [point 2], [point 3]. I''ll let you digest — if you want to dig deeper, let me know before [date].',
 E'Merci pour notre échange [prénom] 🙏 Petit récap : on a vu [point 1], [point 2], [point 3]. Je te laisse digérer — si tu veux qu''on creuse, dis-moi avant [date].',
 null, 1, false),
('en','post_call', 2, 'D+2 · light check',
 E'Hey [name], hope you''re well. Did you get a chance to look at what we discussed? No pressure — if you have a specific question or a sticking point, let me know.',
 E'Hey [prénom], j''espère que tu vas bien. Tu as eu le temps de regarder ce qu''on s''était dit ? Pas de pression — si tu as une question précise ou un blocage, dis-moi.',
 null, 2, false),
('en','post_call', 5, 'D+5 · last message',
 E'[name] last message from me — where are you with your thinking? If it''s no that''s OK, just tell me clearly, I''d rather a clear no than silence. And if it''s yes, let''s lock it in.',
 E'[prénom] dernier message de ma part — tu en es où dans ta réflexion ? Si c''est non c''est OK, dis-le moi clairement, je préfère un non franc qu''un silence. Et si c''est oui, on cale.',
 E'No reply at D+5, you STOP. No D+6, D+10. An unspoken no is a no.',
 3, false),
('en','post_call', 30, 'D+30 · friendly check',
 E'Hey [name], it''s been a month — how''s it going for you on [goal]? No pitch behind this, just genuinely curious about your news.',
 E'Hey [prénom], ça fait un mois — comment ça avance pour toi sur [objectif] ? Pas de pitch derrière, juste curieux de tes nouvelles.',
 null, 4, false),

-- ES (needs_native_review)
('es','post_call', 0, 'D0 · justo después de la llamada',
 E'Gracias por nuestra charla [nombre] 🙏 Resumen rápido: vimos [punto 1], [punto 2], [punto 3]. Te dejo digerirlo — si quieres profundizar, dime antes de [fecha].',
 E'Merci pour notre échange [prénom] 🙏 Petit récap : on a vu [point 1], [point 2], [point 3]. Je te laisse digérer — si tu veux qu''on creuse, dis-moi avant [date].',
 null, 1, true),
('es','post_call', 2, 'D+2 · check ligero',
 E'Hey [nombre], espero que estés bien. ¿Tuviste tiempo de mirar lo que hablamos? Sin presión — si tienes una pregunta concreta o un atasco, dime.',
 E'Hey [prénom], j''espère que tu vas bien. Tu as eu le temps de regarder ce qu''on s''était dit ? Pas de pression — si tu as une question précise ou un blocage, dis-moi.',
 null, 2, true),
('es','post_call', 5, 'D+5 · último mensaje',
 E'[nombre] último mensaje de mi parte — ¿dónde estás con tu reflexión? Si es no está OK, dímelo claramente, prefiero un no franco que un silencio. Y si es sí, lo cerramos.',
 E'[prénom] dernier message de ma part — tu en es où dans ta réflexion ? Si c''est non c''est OK, dis-le moi clairement, je préfère un non franc qu''un silence. Et si c''est oui, on cale.',
 E'Si no hay respuesta en D+5, PARAS. No D+6, D+10. Un no no dicho es un no.',
 3, true),
('es','post_call', 30, 'D+30 · check amistoso',
 E'Hey [nombre], pasó un mes — ¿cómo va para ti con [objetivo]? Sin pitch detrás, solo curioso de saber cómo estás.',
 E'Hey [prénom], ça fait un mois — comment ça avance pour toi sur [objectif] ? Pas de pitch derrière, juste curieux de tes nouvelles.',
 null, 4, true),

-- PT (needs_native_review)
('pt','post_call', 0, 'D0 · logo após a call',
 E'Obrigado pela nossa conversa [nome] 🙏 Resumo rápido: vimos [ponto 1], [ponto 2], [ponto 3]. Te deixo digerir — se quiser aprofundar, me fala antes de [data].',
 E'Merci pour notre échange [prénom] 🙏 Petit récap : on a vu [point 1], [point 2], [point 3]. Je te laisse digérer — si tu veux qu''on creuse, dis-moi avant [date].',
 null, 1, true),
('pt','post_call', 2, 'D+2 · check leve',
 E'Ei [nome], espero que esteja bem. Você teve tempo de olhar o que falamos? Sem pressão — se tiver uma pergunta específica ou um travamento, me fala.',
 E'Hey [prénom], j''espère que tu vas bien. Tu as eu le temps de regarder ce qu''on s''était dit ? Pas de pression — si tu as une question précise ou un blocage, dis-moi.',
 null, 2, true),
('pt','post_call', 5, 'D+5 · última mensagem',
 E'[nome] última mensagem da minha parte — onde você está na sua reflexão? Se for não tudo bem, me fala claramente, prefiro um não franco do que silêncio. E se for sim, a gente fecha.',
 E'[prénom] dernier message de ma part — tu en es où dans ta réflexion ? Si c''est non c''est OK, dis-le moi clairement, je préfère un non franc qu''un silence. Et si c''est oui, on cale.',
 E'Sem resposta no D+5, você PARA. Sem D+6, D+10. Um não não-dito é um não.',
 3, true),
('pt','post_call', 30, 'D+30 · check amigável',
 E'Ei [nome], faz um mês — como vai pra você no [objetivo]? Sem pitch atrás disso, só curioso pra saber das suas novidades.',
 E'Hey [prénom], ça fait un mois — comment ça avance pour toi sur [objectif] ? Pas de pitch derrière, juste curieux de tes nouvelles.',
 null, 4, true),

-- TR
('tr','post_call', 0, 'G0 · görüşmeden hemen sonra',
 E'Sohbetimiz için teşekkürler [isim] 🙏 Hızlı özet: [nokta 1], [nokta 2], [nokta 3] üzerinde durduk. Sindirmen için zaman bırakıyorum — derinleştirmek istersen, [tarih] öncesinde bana yaz.',
 E'Merci pour notre échange [prénom] 🙏 Petit récap : on a vu [point 1], [point 2], [point 3]. Je te laisse digérer — si tu veux qu''on creuse, dis-moi avant [date].',
 null, 1, false),
('tr','post_call', 2, 'G+2 · hafif check',
 E'Selam [isim], iyisindir umarım. Konuştuğumuz şeylere bakacak zaman buldun mu? Baskı yok — somut bir sorun ya da takıldığın bir yer varsa söyle.',
 E'Hey [prénom], j''espère que tu vas bien. Tu as eu le temps de regarder ce qu''on s''était dit ? Pas de pression — si tu as une question précise ou un blocage, dis-moi.',
 null, 2, false),
('tr','post_call', 5, 'G+5 · son mesaj',
 E'[isim] benden son mesaj — düşüncende nerede duruyorsun? Hayırsa da tamam, açıkça söyle, sessizliktense net bir hayırı tercih ederim. Ve evetse, sabitleyelim.',
 E'[prénom] dernier message de ma part — tu en es où dans ta réflexion ? Si c''est non c''est OK, dis-le moi clairement, je préfère un non franc qu''un silence. Et si c''est oui, on cale.',
 E'G+5''te cevap yoksa DURURSUN. G+6, G+10 yok. Söylenmemiş bir hayır da bir hayırdır.',
 3, false),
('tr','post_call', 30, 'G+30 · samimi check',
 E'Selam [isim], bir ay oldu — [hedef] üzerinde nasıl gidiyor? Arkasında pitch yok, sadece haberini merak ettim.',
 E'Hey [prénom], ça fait un mois — comment ça avance pour toi sur [objectif] ? Pas de pitch derrière, juste curieux de tes nouvelles.',
 null, 4, false),

-- HI
('hi','post_call', 0, 'D0 · call ke turant baad',
 E'Hamare baat-cheet ke liye shukriya [name] 🙏 Quick recap: humne [point 1], [point 2], [point 3] cover kiya. Digest karne ka time deta hu — dig karna ho to [date] se pehle bata.',
 E'Merci pour notre échange [prénom] 🙏 Petit récap : on a vu [point 1], [point 2], [point 3]. Je te laisse digérer — si tu veux qu''on creuse, dis-moi avant [date].',
 null, 1, false),
('hi','post_call', 2, 'D+2 · halka check',
 E'Hey [name], hope sab theek hai. Jo humne discuss kiya us pe nazar daalne ka time mila? Koi pressure nahi — agar specific sawaal hai ya kahin atak gaya hai, bata.',
 E'Hey [prénom], j''espère que tu vas bien. Tu as eu le temps de regarder ce qu''on s''était dit ? Pas de pression — si tu as une question précise ou un blocage, dis-moi.',
 null, 2, false),
('hi','post_call', 5, 'D+5 · aakhri message',
 E'[name] meri taraf se aakhri message — tu apni thinking mein kahaan hai? Agar no hai to OK, clearly bol de, silence se acha clear no hai. Aur agar yes hai to lock kar dete hai.',
 E'[prénom] dernier message de ma part — tu en es où dans ta réflexion ? Si c''est non c''est OK, dis-le moi clairement, je préfère un non franc qu''un silence. Et si c''est oui, on cale.',
 E'D+5 pe reply nahi to RUK JA. Koi D+6, D+10 nahi. Bina bola hua no bhi no hai.',
 3, false),
('hi','post_call', 30, 'D+30 · friendly check',
 E'Hey [name], ek mahina ho gaya — [goal] pe kaisa chal raha hai tere liye? Iske peeche koi pitch nahi, sirf curious hu teri news ke baare mein.',
 E'Hey [prénom], ça fait un mois — comment ça avance pour toi sur [objectif] ? Pas de pitch derrière, juste curieux de tes nouvelles.',
 null, 4, false);

-- ============================================================================
-- 2. CLOSING — 5 signaux + 3 scripts × 6 langues = 48 entrées
-- ============================================================================

insert into public.prospection_closing
  (market_code, kind, title, body, body_fr, position, needs_native_review) values

-- ─── FR : 5 signaux + 3 scripts ───────────────────────────────────────────
('fr','signal','Il pose des questions précises',
 E'Il/elle te demande le prix, le démarrage, le délai, ce qui se passe en pratique. Quand on demande "comment", c''est qu''on a déjà dit oui mentalement.',
 null, 1, false),
('fr','signal','Il parle au futur',
 E'"Quand je vais commencer", "ça va me prendre combien de temps", "je vais essayer". Le futur grammatical signale l''engagement intérieur.',
 null, 2, false),
('fr','signal','Il demande la durée / résultats attendus',
 E'"En combien de temps on voit des résultats ?" Question de quelqu''un qui se projette déjà.',
 null, 3, false),
('fr','signal','Il compare avec un essai passé',
 E'"J''avais essayé X et ça n''avait pas marché." Il cherche une raison de croire que cette fois c''est différent.',
 null, 4, false),
('fr','signal','Il pense aux autres',
 E'"Tu pourrais aider ma sœur / mon collègue ?" Quand il pense à recommander avant même de signer, c''est mûr.',
 null, 5, false),

('fr','propose','Proposer le démarrage',
 E'OK [prénom] — de ce que je vois on est aligné. Si tu te sens prêt(e), on démarre cette semaine. Tu choisis : pack [A] ou pack [B] ? Si tu hésites encore, dis-le moi franchement, je préfère.',
 null, 1, false),
('fr','hesitation','Quand il/elle hésite',
 E'Je sens que tu hésites [prénom]. C''est plutôt le prix, le timing, ou le doute sur le résultat ? Dis-moi exactement ce qui te freine — je t''aiderai à voir clair, ou à dire non si c''est ça.',
 null, 1, false),
('fr','final_no','Encaisser un non',
 E'Pas de souci [prénom], merci d''avoir pris le temps de réfléchir 🙏 Je laisse la porte ouverte — si dans 3 ou 6 mois ça change, écris-moi sans hésiter. Belle continuation !',
 null, 1, false),

-- ─── EN ───────────────────────────────────────────────────────────────────
('en','signal','They ask specific questions',
 E'They ask the price, the start, the timeline, what happens in practice. Asking "how" means they''ve mentally said yes already.',
 E'Il/elle te demande le prix, le démarrage, le délai, ce qui se passe en pratique. Quand on demande "comment", c''est qu''on a déjà dit oui mentalement.',
 1, false),
('en','signal','They speak in future tense',
 E'"When I start", "how long will it take me", "I''ll try". Grammatical future signals inner commitment.',
 E'"Quand je vais commencer", "ça va me prendre combien de temps", "je vais essayer". Le futur grammatical signale l''engagement intérieur.',
 2, false),
('en','signal','They ask about duration / expected results',
 E'"How long before I see results?" Question of someone already projecting themselves into it.',
 E'"En combien de temps on voit des résultats ?" Question de quelqu''un qui se projette déjà.',
 3, false),
('en','signal','They compare with past attempts',
 E'"I tried X and it didn''t work." They''re looking for a reason to believe this time is different.',
 E'"J''avais essayé X et ça n''avait pas marché." Il cherche une raison de croire que cette fois c''est différent.',
 4, false),
('en','signal','They think of others',
 E'"Could you help my sister / colleague?" Thinking about referring before even signing themselves = ripe.',
 E'"Tu pourrais aider ma sœur / mon collègue ?" Quand il pense à recommander avant même de signer, c''est mûr.',
 5, false),

('en','propose','Propose the start',
 E'OK [name] — from what I see we''re aligned. If you feel ready, let''s start this week. You pick: pack [A] or pack [B]? If you''re still hesitating, tell me frankly, I''d prefer that.',
 E'OK [prénom] — de ce que je vois on est aligné. Si tu te sens prêt(e), on démarre cette semaine. Tu choisis : pack [A] ou pack [B] ? Si tu hésites encore, dis-le moi franchement, je préfère.',
 1, false),
('en','hesitation','When they hesitate',
 E'I sense you''re hesitating [name]. Is it the price, the timing, or doubt about the result? Tell me exactly what''s holding you back — I''ll help you see clearly, or say no if that''s it.',
 E'Je sens que tu hésites [prénom]. C''est plutôt le prix, le timing, ou le doute sur le résultat ? Dis-moi exactement ce qui te freine — je t''aiderai à voir clair, ou à dire non si c''est ça.',
 1, false),
('en','final_no','Take a no gracefully',
 E'No worries [name], thanks for taking the time to think it through 🙏 I leave the door open — if in 3 or 6 months it changes, write me without hesitation. All the best!',
 E'Pas de souci [prénom], merci d''avoir pris le temps de réfléchir 🙏 Je laisse la porte ouverte — si dans 3 ou 6 mois ça change, écris-moi sans hésiter. Belle continuation !',
 1, false),

-- ─── ES (needs_native_review) ─────────────────────────────────────────────
('es','signal','Hace preguntas específicas',
 E'Te pregunta el precio, el inicio, el plazo, qué pasa en la práctica. Cuando alguien pregunta "cómo", ya dijo sí mentalmente.',
 E'Il/elle te demande le prix, le démarrage, le délai, ce qui se passe en pratique. Quand on demande "comment", c''est qu''on a déjà dit oui mentalement.',
 1, true),
('es','signal','Habla en futuro',
 E'"Cuando empiece", "cuánto me va a tomar", "voy a probar". El futuro gramatical señala compromiso interior.',
 E'"Quand je vais commencer", "ça va me prendre combien de temps", "je vais essayer". Le futur grammatical signale l''engagement intérieur.',
 2, true),
('es','signal','Pregunta por duración / resultados esperados',
 E'"¿En cuánto tiempo se ven resultados?" Pregunta de alguien que ya se proyecta dentro.',
 E'"En combien de temps on voit des résultats ?" Question de quelqu''un qui se projette déjà.',
 3, true),
('es','signal','Compara con un intento pasado',
 E'"Probé X y no funcionó." Busca una razón para creer que esta vez es diferente.',
 E'"J''avais essayé X et ça n''avait pas marché." Il cherche une raison de croire que cette fois c''est différent.',
 4, true),
('es','signal','Piensa en otros',
 E'"¿Podrías ayudar a mi hermana / colega?" Cuando piensa en recomendar antes de firmar = maduro.',
 E'"Tu pourrais aider ma sœur / mon collègue ?" Quand il pense à recommander avant même de signer, c''est mûr.',
 5, true),

('es','propose','Proponer el arranque',
 E'OK [nombre] — por lo que veo estamos alineados. Si te sientes listo(a), arrancamos esta semana. Tú eliges: pack [A] o pack [B]? Si todavía dudas, dímelo con franqueza, lo prefiero.',
 E'OK [prénom] — de ce que je vois on est aligné. Si tu te sens prêt(e), on démarre cette semaine. Tu choisis : pack [A] ou pack [B] ? Si tu hésites encore, dis-le moi franchement, je préfère.',
 1, true),
('es','hesitation','Cuando duda',
 E'Siento que dudas [nombre]. ¿Es más el precio, el timing, o la duda sobre el resultado? Dime exactamente qué te frena — te ayudo a ver claro, o a decir no si es eso.',
 E'Je sens que tu hésites [prénom]. C''est plutôt le prix, le timing, ou le doute sur le résultat ? Dis-moi exactement ce qui te freine — je t''aiderai à voir clair, ou à dire non si c''est ça.',
 1, true),
('es','final_no','Encajar un no con elegancia',
 E'Sin problema [nombre], gracias por tomarte el tiempo de pensarlo 🙏 Dejo la puerta abierta — si en 3 o 6 meses cambia, escríbeme sin dudar. ¡Que te vaya muy bien!',
 E'Pas de souci [prénom], merci d''avoir pris le temps de réfléchir 🙏 Je laisse la porte ouverte — si dans 3 ou 6 mois ça change, écris-moi sans hésiter. Belle continuation !',
 1, true),

-- ─── PT (needs_native_review) ─────────────────────────────────────────────
('pt','signal','Faz perguntas específicas',
 E'Te pergunta o preço, o início, o prazo, o que acontece na prática. Quando alguém pergunta "como", já disse sim mentalmente.',
 E'Il/elle te demande le prix, le démarrage, le délai, ce qui se passe en pratique. Quand on demande "comment", c''est qu''on a déjà dit oui mentalement.',
 1, true),
('pt','signal','Fala no futuro',
 E'"Quando eu começar", "quanto vai me levar", "vou tentar". O futuro gramatical sinaliza o compromisso interior.',
 E'"Quand je vais commencer", "ça va me prendre combien de temps", "je vais essayer". Le futur grammatical signale l''engagement intérieur.',
 2, true),
('pt','signal','Pergunta sobre duração / resultados',
 E'"Em quanto tempo dá pra ver resultados?" Pergunta de alguém que já se projeta dentro.',
 E'"En combien de temps on voit des résultats ?" Question de quelqu''un qui se projette déjà.',
 3, true),
('pt','signal','Compara com tentativa passada',
 E'"Tentei X e não deu certo." Procura uma razão pra acreditar que dessa vez é diferente.',
 E'"J''avais essayé X et ça n''avait pas marché." Il cherche une raison de croire que cette fois c''est différent.',
 4, true),
('pt','signal','Pensa em outros',
 E'"Você poderia ajudar minha irmã / colega?" Quando pensa em indicar antes de assinar = maduro.',
 E'"Tu pourrais aider ma sœur / mon collègue ?" Quand il pense à recommander avant même de signer, c''est mûr.',
 5, true),

('pt','propose','Propor o arranque',
 E'OK [nome] — pelo que vejo estamos alinhados. Se você se sente pronto(a), começamos essa semana. Você escolhe: pack [A] ou pack [B]? Se ainda hesita, fala com franqueza, prefiro.',
 E'OK [prénom] — de ce que je vois on est aligné. Si tu te sens prêt(e), on démarre cette semaine. Tu choisis : pack [A] ou pack [B] ? Si tu hésites encore, dis-le moi franchement, je préfère.',
 1, true),
('pt','hesitation','Quando hesita',
 E'Sinto que você tá hesitando [nome]. É mais o preço, o timing, ou a dúvida sobre o resultado? Me diz exatamente o que te trava — te ajudo a ver claro, ou a dizer não se for isso.',
 E'Je sens que tu hésites [prénom]. C''est plutôt le prix, le timing, ou le doute sur le résultat ? Dis-moi exactement ce qui te freine — je t''aiderai à voir clair, ou à dire non si c''est ça.',
 1, true),
('pt','final_no','Aceitar um não com elegância',
 E'Sem problema [nome], obrigado por reservar tempo pra refletir 🙏 Deixo a porta aberta — se em 3 ou 6 meses mudar, me escreve sem hesitar. Tudo de bom!',
 E'Pas de souci [prénom], merci d''avoir pris le temps de réfléchir 🙏 Je laisse la porte ouverte — si dans 3 ou 6 mois ça change, écris-moi sans hésiter. Belle continuation !',
 1, true),

-- ─── TR ───────────────────────────────────────────────────────────────────
('tr','signal','Spesifik sorular soruyor',
 E'Fiyatı, başlangıcı, süreyi, pratikte ne olduğunu soruyor. "Nasıl" sorduğunda zihninde zaten evet demiş demektir.',
 E'Il/elle te demande le prix, le démarrage, le délai, ce qui se passe en pratique. Quand on demande "comment", c''est qu''on a déjà dit oui mentalement.',
 1, false),
('tr','signal','Gelecek zamanda konuşuyor',
 E'"Başladığımda", "ne kadar sürer", "deneyeceğim". Dilbilgisel gelecek iç bağlılığı işaret eder.',
 E'"Quand je vais commencer", "ça va me prendre combien de temps", "je vais essayer". Le futur grammatical signale l''engagement intérieur.',
 2, false),
('tr','signal','Süre / beklenen sonuçları soruyor',
 E'"Ne kadar zamanda sonuç görüyoruz?" Kendini içine yansıtmış birinin sorusu.',
 E'"En combien de temps on voit des résultats ?" Question de quelqu''un qui se projette déjà.',
 3, false),
('tr','signal','Geçmiş bir denemeyle karşılaştırıyor',
 E'"X''i denedim, işe yaramadı." Bu seferin farklı olduğuna inanmak için bir sebep arıyor.',
 E'"J''avais essayé X et ça n''avait pas marché." Il cherche une raison de croire que cette fois c''est différent.',
 4, false),
('tr','signal','Başkalarını düşünüyor',
 E'"Kardeşime / meslektaşıma yardım edebilir misin?" İmzalamadan tavsiye etmeyi düşünmek = olgun.',
 E'"Tu pourrais aider ma sœur / mon collègue ?" Quand il pense à recommander avant même de signer, c''est mûr.',
 5, false),

('tr','propose','Başlamayı önermek',
 E'Tamam [isim] — gördüğüm kadarıyla uyumluyuz. Kendini hazır hissediyorsan bu hafta başlayalım. Sen seç: pack [A] mı pack [B] mi? Hâlâ tereddüt ediyorsan açıkça söyle, onu tercih ederim.',
 E'OK [prénom] — de ce que je vois on est aligné. Si tu te sens prêt(e), on démarre cette semaine. Tu choisis : pack [A] ou pack [B] ? Si tu hésites encore, dis-le moi franchement, je préfère.',
 1, false),
('tr','hesitation','Tereddüt ederken',
 E'Tereddüt ettiğini hissediyorum [isim]. Fiyat mı, zamanlama mı, yoksa sonuç hakkında şüphe mi? Tam olarak neyin seni durdurduğunu söyle — net görmene yardım edeceğim, ya da gerekirse hayır demene.',
 E'Je sens que tu hésites [prénom]. C''est plutôt le prix, le timing, ou le doute sur le résultat ? Dis-moi exactement ce qui te freine — je t''aiderai à voir clair, ou à dire non si c''est ça.',
 1, false),
('tr','final_no','Bir hayırı zarafetle karşılamak',
 E'Sorun değil [isim], düşünmek için zaman ayırdığın için teşekkürler 🙏 Kapıyı açık bırakıyorum — 3 ya da 6 ay sonra değişirse, tereddüt etmeden yaz. Yolun açık olsun!',
 E'Pas de souci [prénom], merci d''avoir pris le temps de réfléchir 🙏 Je laisse la porte ouverte — si dans 3 ou 6 mois ça change, écris-moi sans hésiter. Belle continuation !',
 1, false),

-- ─── HI ───────────────────────────────────────────────────────────────────
('hi','signal','Specific sawaal poochta hai',
 E'Price, start, timeline, practically kya hota hai poochta hai. Jab "kaise" puchhe to mentally already yes bola hua hai.',
 E'Il/elle te demande le prix, le démarrage, le délai, ce qui se passe en pratique. Quand on demande "comment", c''est qu''on a déjà dit oui mentalement.',
 1, false),
('hi','signal','Future tense mein baat karta hai',
 E'"Jab main start karunga", "kitna time lagega mujhe", "try karunga". Grammatical future inner commitment dikhata hai.',
 E'"Quand je vais commencer", "ça va me prendre combien de temps", "je vais essayer". Le futur grammatical signale l''engagement intérieur.',
 2, false),
('hi','signal','Duration / expected results poochta hai',
 E'"Kitne time mein results dikhte hai?" Sawaal us insaan ka jo already khud ko isme project kar raha hai.',
 E'"En combien de temps on voit des résultats ?" Question de quelqu''un qui se projette déjà.',
 3, false),
('hi','signal','Past attempt se compare karta hai',
 E'"Maine X try kiya tha aur kaam nahi aaya tha." Wo reason dhundh raha hai believe karne ka ki is baar alag hai.',
 E'"J''avais essayé X et ça n''avait pas marché." Il cherche une raison de croire que cette fois c''est différent.',
 4, false),
('hi','signal','Doosron ke baare mein sochta hai',
 E'"Kya tu meri behan / colleague ki help kar sakta hai?" Sign karne se pehle recommendation soche to = mature.',
 E'"Tu pourrais aider ma sœur / mon collègue ?" Quand il pense à recommander avant même de signer, c''est mûr.',
 5, false),

('hi','propose','Start propose karna',
 E'OK [name] — jo main dekh raha hu hum aligned hai. Agar ready feel kar raha hai to is hafte start karte hai. Tu choose kar: pack [A] ya pack [B]? Agar ab bhi hesitate kar raha hai to honestly bata, main wo prefer karunga.',
 E'OK [prénom] — de ce que je vois on est aligné. Si tu te sens prêt(e), on démarre cette semaine. Tu choisis : pack [A] ou pack [B] ? Si tu hésites encore, dis-le moi franchement, je préfère.',
 1, false),
('hi','hesitation','Jab hesitate kare',
 E'Lagta hai tu hesitate kar raha hai [name]. Ye price hai, timing hai, ya result ke baare mein doubt? Exactly bata kya rok raha hai — main clear karne mein help karunga, ya no bolne mein agar wo hai.',
 E'Je sens que tu hésites [prénom]. C''est plutôt le prix, le timing, ou le doute sur le résultat ? Dis-moi exactement ce qui te freine — je t''aiderai à voir clair, ou à dire non si c''est ça.',
 1, false),
('hi','final_no','No ko gracefully accept karna',
 E'Koi baat nahi [name], sochne ke liye time nikalne ka shukriya 🙏 Door open chhod raha hu — agar 3 ya 6 mahine mein change ho to bina hichkichaye likhna. All the best!',
 E'Pas de souci [prénom], merci d''avoir pris le temps de réfléchir 🙏 Je laisse la porte ouverte — si dans 3 ou 6 mois ça change, écris-moi sans hésiter. Belle continuation !',
 1, false);

-- ============================================================================
-- 3. CAS SPÉCIAUX — 3 playbooks × 6 langues = 18 entrées
-- ============================================================================

insert into public.prospection_special_cases
  (market_code, kind, title, body, body_fr, position, needs_native_review) values

-- FR
('fr','ghost_after_exchange','Ghosting après plusieurs échanges',
 E'[prénom], je voulais pas te lâcher comme ça — soit le timing est pas bon, soit le sujet t''intéresse pas, soit j''ai mal expliqué. Dis-moi juste lequel des trois et je m''adapte (ou je te laisse tranquille, promis).',
 null, 1, false),

('fr','reactivation_3_6m','Réactivation après 3-6 mois',
 E'Hey [prénom], ça fait un moment ! Je voulais juste prendre des nouvelles — comment ça avance pour toi sur [objectif] ? Pas de pitch derrière, juste curieux.',
 null, 1, false),

('fr','referral_request','Demande de recommandation',
 E'[prénom], depuis qu''on bosse ensemble t''as [résultat concret]. Qui dans ton entourage proche pourrait avoir besoin de ce qu''on a fait ensemble ? Je te demande pas de pitcher — juste 1 ou 2 prénoms et je m''en occupe à partir de là.',
 null, 1, false),

-- EN
('en','ghost_after_exchange','Ghosting after multiple exchanges',
 E'[name], I didn''t want to drop you like that — either the timing''s off, or the subject doesn''t interest you, or I explained badly. Just tell me which of the three and I''ll adjust (or leave you alone, promise).',
 E'[prénom], je voulais pas te lâcher comme ça — soit le timing est pas bon, soit le sujet t''intéresse pas, soit j''ai mal expliqué. Dis-moi juste lequel des trois et je m''adapte (ou je te laisse tranquille, promis).',
 1, false),

('en','reactivation_3_6m','Reactivation after 3-6 months',
 E'Hey [name], it''s been a while! Just wanted to check in — how''s it going for you on [goal]? No pitch behind this, just genuinely curious.',
 E'Hey [prénom], ça fait un moment ! Je voulais juste prendre des nouvelles — comment ça avance pour toi sur [objectif] ? Pas de pitch derrière, juste curieux.',
 1, false),

('en','referral_request','Asking for a referral',
 E'[name], since we''ve been working together you''ve got [concrete result]. Who in your close circle might need what we did together? Not asking you to pitch — just 1 or 2 names and I''ll handle it from there.',
 E'[prénom], depuis qu''on bosse ensemble t''as [résultat concret]. Qui dans ton entourage proche pourrait avoir besoin de ce qu''on a fait ensemble ? Je te demande pas de pitcher — juste 1 ou 2 prénoms et je m''en occupe à partir de là.',
 1, false),

-- ES (needs_native_review)
('es','ghost_after_exchange','Ghosting tras varios intercambios',
 E'[nombre], no quería dejarte así — o el momento no es bueno, o el tema no te interesa, o expliqué mal. Solo dime cuál de los tres y me ajusto (o te dejo tranquilo(a), prometido).',
 E'[prénom], je voulais pas te lâcher comme ça — soit le timing est pas bon, soit le sujet t''intéresse pas, soit j''ai mal expliqué. Dis-moi juste lequel des trois et je m''adapte (ou je te laisse tranquille, promis).',
 1, true),

('es','reactivation_3_6m','Reactivación tras 3-6 meses',
 E'Hey [nombre], ¡pasó un rato! Solo quería saber — ¿cómo va para ti con [objetivo]? Sin pitch detrás, solo curioso(a).',
 E'Hey [prénom], ça fait un moment ! Je voulais juste prendre des nouvelles — comment ça avance pour toi sur [objectif] ? Pas de pitch derrière, juste curieux.',
 1, true),

('es','referral_request','Pedir una recomendación',
 E'[nombre], desde que trabajamos juntos tienes [resultado concreto]. ¿Quién en tu círculo cercano podría necesitar lo que hicimos juntos? No te pido que vendas — solo 1 o 2 nombres y yo me encargo desde ahí.',
 E'[prénom], depuis qu''on bosse ensemble t''as [résultat concret]. Qui dans ton entourage proche pourrait avoir besoin de ce qu''on a fait ensemble ? Je te demande pas de pitcher — juste 1 ou 2 prénoms et je m''en occupe à partir de là.',
 1, true),

-- PT (needs_native_review)
('pt','ghost_after_exchange','Ghosting depois de várias trocas',
 E'[nome], não queria te largar assim — ou o timing tá ruim, ou o assunto não te interessa, ou expliquei mal. Só me diz qual dos três e eu me adapto (ou te deixo em paz, prometo).',
 E'[prénom], je voulais pas te lâcher comme ça — soit le timing est pas bon, soit le sujet t''intéresse pas, soit j''ai mal expliqué. Dis-moi juste lequel des trois et je m''adapte (ou je te laisse tranquille, promis).',
 1, true),

('pt','reactivation_3_6m','Reativação após 3-6 meses',
 E'Ei [nome], faz um tempo! Só queria saber — como vai pra você no [objetivo]? Sem pitch atrás, só curioso(a) mesmo.',
 E'Hey [prénom], ça fait un moment ! Je voulais juste prendre des nouvelles — comment ça avance pour toi sur [objectif] ? Pas de pitch derrière, juste curieux.',
 1, true),

('pt','referral_request','Pedir indicação',
 E'[nome], desde que trabalhamos juntos você tem [resultado concreto]. Quem no seu círculo próximo poderia precisar do que fizemos juntos? Não tô pedindo pra vender — só 1 ou 2 nomes e eu cuido a partir daí.',
 E'[prénom], depuis qu''on bosse ensemble t''as [résultat concret]. Qui dans ton entourage proche pourrait avoir besoin de ce qu''on a fait ensemble ? Je te demande pas de pitcher — juste 1 ou 2 prénoms et je m''en occupe à partir de là.',
 1, true),

-- TR
('tr','ghost_after_exchange','Birkaç görüşme sonrası ghost',
 E'[isim], seni öylece bırakmak istemedim — ya zamanlama yanlış, ya konu ilgini çekmiyor, ya da kötü anlattım. Üçünden hangisi söyle, ayarlarım (ya da seni rahat bırakırım, söz).',
 E'[prénom], je voulais pas te lâcher comme ça — soit le timing est pas bon, soit le sujet t''intéresse pas, soit j''ai mal expliqué. Dis-moi juste lequel des trois et je m''adapte (ou je te laisse tranquille, promis).',
 1, false),

('tr','reactivation_3_6m','3-6 ay sonra yeniden iletişim',
 E'Selam [isim], uzun zaman oldu! Sadece haberini almak istedim — [hedef] üzerinde nasıl gidiyor? Arkasında pitch yok, gerçekten meraktan.',
 E'Hey [prénom], ça fait un moment ! Je voulais juste prendre des nouvelles — comment ça avance pour toi sur [objectif] ? Pas de pitch derrière, juste curieux.',
 1, false),

('tr','referral_request','Tavsiye istemek',
 E'[isim], birlikte çalışmaya başladığımızdan beri [somut sonuç] elde ettin. Yakın çevrende birlikte yaptığımız şeye ihtiyacı olabilecek kim var? Senden satış yapmanı istemiyorum — sadece 1-2 isim, oradan ben hallederim.',
 E'[prénom], depuis qu''on bosse ensemble t''as [résultat concret]. Qui dans ton entourage proche pourrait avoir besoin de ce qu''on a fait ensemble ? Je te demande pas de pitcher — juste 1 ou 2 prénoms et je m''en occupe à partir de là.',
 1, false),

-- HI
('hi','ghost_after_exchange','Multiple exchanges ke baad ghost',
 E'[name], tujhe aise chhodna nahi chahta tha — ya timing galat hai, ya subject mein interest nahi, ya maine galat samjhaya. Bas teeno mein se ek bata aur main adjust kar lunga (ya tujhe shanti se chhod dunga, promise).',
 E'[prénom], je voulais pas te lâcher comme ça — soit le timing est pas bon, soit le sujet t''intéresse pas, soit j''ai mal expliqué. Dis-moi juste lequel des trois et je m''adapte (ou je te laisse tranquille, promis).',
 1, false),

('hi','reactivation_3_6m','3-6 mahine baad reactivation',
 E'Hey [name], bahut time ho gaya! Bas news lena chahta tha — [goal] pe kaisa chal raha hai tere liye? Iske peeche koi pitch nahi, sirf genuine curious hu.',
 E'Hey [prénom], ça fait un moment ! Je voulais juste prendre des nouvelles — comment ça avance pour toi sur [objectif] ? Pas de pitch derrière, juste curieux.',
 1, false),

('hi','referral_request','Recommendation maangna',
 E'[name], jab se hum saath kaam kar rahe hai tujhe [concrete result] mila hai. Tere close circle mein kaun ho sakta hai jisko hamare kaam ki zaroorat ho? Main tujhe sell karne ke liye nahi keh raha — bas 1-2 naam aur main wahaan se sambhal lunga.',
 E'[prénom], depuis qu''on bosse ensemble t''as [résultat concret]. Qui dans ton entourage proche pourrait avoir besoin de ce qu''on a fait ensemble ? Je te demande pas de pitcher — juste 1 ou 2 prénoms et je m''en occupe à partir de là.',
 1, false);

commit;

-- =============================================================================
-- VÉRIFICATION POST-SEED (à exécuter dans Supabase SQL Editor)
-- =============================================================================
-- SELECT 'followups' as t, market_code, COUNT(*) FROM prospection_followups
--   GROUP BY market_code
-- UNION ALL
-- SELECT 'closing', market_code, COUNT(*) FROM prospection_closing
--   GROUP BY market_code
-- UNION ALL
-- SELECT 'special_cases', market_code, COUNT(*) FROM prospection_special_cases
--   GROUP BY market_code
-- ORDER BY 1, 2;
--
-- Attendu :
--   - followups     : 4 par marché × 6 = 24
--   - closing       : 8 par marché × 6 = 48
--   - special_cases : 3 par marché × 6 = 18
--   - Total = 90 entrées.
