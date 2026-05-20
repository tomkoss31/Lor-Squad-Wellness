/* ────────────────────────────────────────────────────────────
   LA BASE 360 · Prospection — Données prototype
   ──────────────────────────────────────────────────────────── */

window.MARKETS = [
  { code:'FR', flag:'🇫🇷', name:'France', sub:'fr-FR', lang:'FR',
    hashtags:{
      mainstream:['#pertedepoids','#remiseenforme','#maman2026'],
      niche:['#routinematin','#superfood','#petitdejsain'],
      cross:['#mealprep','#yogamatinal','#vidasaine']
    },
    sources:{
      fb:'Groupes <em>« Mamans débordées Paris »</em>, <em>« Reprise sport 40+ »</em>. Commentaires &gt; DM.',
      irl:'Cours collectifs en salle, marchés bio le samedi, sorties d\'école 16h&nbsp;30.',
      reco:'Anciennes clientes à 3 mois&nbsp;: «&nbsp;qui d\'autre devrait essayer ça&nbsp;?&nbsp;»'
    },
    flagsGreen:['Story sport régulière (3+ / sem.)','Bio « maman 2 enfants »','Avant/après visible','Compte actif (3+ posts/sem.)','Hashtags famille + forme'],
    flagsRed:['Compte privé, 0 interaction','Bio « ne vend rien »','Posts politiques uniquement','Créé il y a < 1 mois','> 50k followers (saturé)']
  },
  { code:'INTL', flag:'🇬🇧', name:'International', sub:'en', lang:'EN',
    hashtags:{
      mainstream:['#weightloss','#fitmom','#transformation2026'],
      niche:['#morningroutine','#proteinbreakfast','#busymom'],
      cross:['#strengthtraining','#mealprep','#cleaneating']
    },
    sources:{
      fb:'Groups <em>« Fit moms over 40 »</em>, <em>« Marathon training UK »</em>. Comments &gt; DMs.',
      irl:'Gym group classes, weekend farmer markets, school pickup 3-4pm.',
      reco:'3-month clients: «&nbsp;who else should try this?&nbsp;»'
    },
    flagsGreen:['Posts sport réguliers','Bio « mom of 2 » / « entrepreneur »','Before/after visible','Active account (3+ posts/wk)','Hashtags forme + famille'],
    flagsRed:['Private account, 0 interaction','Bio « doesn\'t sell »','Politics-only feed','Account < 1 month old','> 50k followers (saturated)']
  },
  { code:'LATAM', flag:'🇲🇽', name:'LatAm + Espagne', sub:'es', lang:'ES',
    hashtags:{
      mainstream:['#perderpeso','#mamáfit','#bajardepeso2026'],
      niche:['#rutinamañana','#desayunosaludable','#mamáocupada'],
      cross:['#yogamatutino','#mealprep','#vidasana']
    },
    sources:{
      fb:'Grupos <em>« Mamás emprendedoras CDMX »</em>, <em>« Reto 21 días »</em>. Comentarios &gt; DM.',
      irl:'Clases colectivas, mercados bio el sábado, salida del cole 14-16h.',
      reco:'Clientas a 3 meses: «&nbsp;¿quién más debería probar esto?&nbsp;»'
    },
    flagsGreen:['Stories deportivas 3+/sem.','Bio « mamá » / « emprendedora »','Antes/después visible','Cuenta activa (3+ posts/sem.)','Hashtags familia + forma'],
    flagsRed:['Cuenta privada, 0 interacción','Bio « no vendo nada »','Solo política','Creada hace < 1 mes','> 50k followers (saturado)']
  },
  { code:'BR', flag:'🇧🇷', name:'Brésil + Portugal', sub:'pt-BR', lang:'PT',
    hashtags:{
      mainstream:['#emagrecer','#mamãefit','#projetoverão'],
      niche:['#rotinamatinal','#caféproteico','#mãeempresária'],
      cross:['#yogamatinal','#mealprep','#vidasaudável']
    },
    sources:{
      fb:'Grupos <em>« Mães empresárias SP »</em>, <em>« Reto 21 dias »</em>. Comentários &gt; DM.',
      irl:'Aulas coletivas, feiras orgânicas sábado, saída de escola 16h30.',
      reco:'Clientes 3 meses: «&nbsp;quem mais deveria experimentar isso?&nbsp;»'
    },
    flagsGreen:['Stories esportivos regulares','Bio « mãe » / « empresária »','Antes/depois visível','Conta ativa (3+ posts/sem.)','Hashtags família + forma'],
    flagsRed:['Conta privada, 0 interação','Bio « não vendo nada »','Só política','Conta < 1 mês','> 50k followers (saturado)']
  },
  { code:'TR', flag:'🇹🇷', name:'Turquie + Allemagne', sub:'tr / de', lang:'TR',
    hashtags:{
      mainstream:['#kiloverme','#fitanne','#yazprojesi'],
      niche:['#sabahrutini','#proteinkahvalti','#meşgulanne'],
      cross:['#yoga','#mealprep','#sağlıklıyaşam']
    },
    sources:{
      fb:'Gruplar <em>« İstanbul fit anneler »</em>, <em>« 21 gün challenge »</em>. Yorumlar &gt; DM.',
      irl:'Grup dersleri, organik pazar cumartesi, okul çıkışı 15-17h.',
      reco:'3 aylık müşteriler: «&nbsp;başka kim denemeli?&nbsp;»'
    },
    flagsGreen:['Düzenli spor story','Bio « anne » / « girişimci »','Öncesi/sonrası görünür','Aktif hesap (3+ post/hafta)','Aile + spor etiketleri'],
    flagsRed:['Gizli hesap, 0 etkileşim','Bio « satış yapmıyorum »','Sadece siyaset','Hesap < 1 ay','> 50k takipçi (doymuş)']
  },
  { code:'IN', flag:'🇮🇳', name:'Inde', sub:'hi / en', lang:'HI',
    hashtags:{
      mainstream:['#weightlossindia','#fitmomindia','#summerproject'],
      niche:['#morningroutine','#proteinbreakfast','#workingmom'],
      cross:['#yoga','#cleaneating','#healthyliving']
    },
    sources:{
      fb:'Groups <em>« Indian working moms »</em>, <em>« 21-day reset »</em>. Comments &gt; DMs.',
      irl:'Yoga classes, weekend organic markets, school pickup 3-4pm.',
      reco:'3-month clients: «&nbsp;कौन और कोशिश करना चाहिए?&nbsp;» / «&nbsp;who else should try?&nbsp;»'
    },
    flagsGreen:['Regular fitness stories','Bio « mom » / « entrepreneur »','Before/after visible','Active account (3+ posts/wk)','Family + fitness tags'],
    flagsRed:['Private account, 0 interaction','Bio « doesn\'t sell »','Politics-only','Account < 1 month','> 50k followers']
  }
];

window.PROFILES = [
  { code:'WF', glyph:'⚖️', name:'Perte de poids · F', short:'PdP F', accent:'gold',
    persona:'Maman 32-45 ans, énergie en baisse, veut reprendre le contrôle.' },
  { code:'WM', glyph:'💪', name:'Perte de poids · H', short:'PdP H', accent:'gold',
    persona:'Homme 35-50 ans, ventre tenace, peu de temps pour cuisiner.' },
  { code:'SP', glyph:'🏃', name:'Sportif', short:'Sport', accent:'teal',
    persona:'Pratique régulière, cherche performance / récupération / clean nutrition.' },
  { code:'BZ', glyph:'💼', name:'Business', short:'Biz', accent:'purple',
    persona:'Entrepreneur·e, veut compléter ses revenus via la distribution.' }
];

window.MODULES = [
  { ic:'🧠', name:'Mindset', sub:'& posture',
    kicker:'Module · Mindset & posture',
    h2:['D\'abord, ','le ton','.'],
    lede:'Trois vérités à intégrer avant le premier message. Cinq erreurs qui sabotent 80% des conversations.',
    meta:'≈&nbsp;4&nbsp;min · lu <b style="color:var(--ls-charcoal)">2×</b> cette&nbsp;sem.' },

  { ic:'🔍', name:'Trouver', sub:'les prospects',
    kicker:'Module · Trouver des prospects',
    h2:['Le scan ','30 secondes','.'],
    lede:'Tu ouvres un profil&nbsp;: en 30&nbsp;s tu sais si tu lui écris. Drapeaux, hashtags, sources hors-feed.',
    meta:'Scan&nbsp;<b style="color:var(--ls-charcoal)">30&nbsp;s</b>&nbsp;·&nbsp;3 sources alt.' },

  { ic:'📨', name:'Messages M1', sub:'premier contact',
    kicker:'Module · Premier contact',
    h2:['Messages ','M1','.'],
    lede:'Sélectionne ta plateforme. Personnalise les variables en gold avant de copier.',
    meta:'<b style="color:var(--ls-charcoal)">4</b> plateformes · trad.&nbsp;FR&nbsp;dispo.' },

  { ic:'🌳', name:'Arbres M2/M3', sub:'réponses selon réaction',
    kicker:'Module · Arbres M2/M3',
    h2:['Que répondre, ','selon ce qu\'il dit','.'],
    lede:'3 branches&nbsp;: tiède, froid, indécis. Une réponse par branche, prête à copier.',
    meta:'<b style="color:var(--ls-charcoal)">3</b> branches · <b style="color:var(--ls-charcoal)">9</b> réponses' },

  { ic:'🛡️', name:'Objections', sub:'les 8 non',
    kicker:'Module · Réponses aux refus',
    h2:['Les huit ','non','.'],
    lede:'Pour chaque objection&nbsp;: ce qu\'il ne faut pas dire, ce qui ouvre la porte.',
    meta:'<b style="color:var(--ls-charcoal)">8</b> objections types' },

  { ic:'📞', name:'Post-appel', sub:'séquence de relance',
    kicker:'Module · Séquence post-appel',
    h2:['Après l\'appel, ','quatre touches','.'],
    lede:'J0&nbsp;– J+2 – J+5 – J+30. Une touche par jour, jamais une de plus.',
    meta:'<b style="color:var(--ls-charcoal)">4</b> touches · <b style="color:var(--ls-charcoal)">30</b> jours' },

  { ic:'🎯', name:'Closing', sub:'signaux + scripts',
    kicker:'Module · Closing',
    h2:['Quand fermer, ','et comment','.'],
    lede:'5 signaux qui montrent que c\'est mûr, 3 scripts pour passer à l\'acte.',
    meta:'<b style="color:var(--ls-charcoal)">5</b> signaux · <b style="color:var(--ls-charcoal)">3</b> scripts' },

  { ic:'🔁', name:'Cas spéciaux', sub:'ghost · réactivation · reco',
    kicker:'Module · Cas spéciaux',
    h2:['Quand ça ','sort des rails','.'],
    lede:'Ghosting, réactivation après mois, demande de recommandation. Trois playbooks distincts.',
    meta:'<b style="color:var(--ls-charcoal)">3</b> playbooks' },

  { ic:'📖', name:'Storytelling', sub:'structure + exemples',
    kicker:'Module · Storytelling',
    h2:['Raconte ton ','avant','.'],
    lede:'La structure en 3 actes qui marche à tous les coups. Deux exemples vivants.',
    meta:'<b style="color:var(--ls-charcoal)">3</b> actes · <b style="color:var(--ls-charcoal)">2</b> exemples' },

  { ic:'⏰', name:'Routine', sub:'30 min / jour',
    kicker:'Module · Routine quotidienne',
    h2:['Trente minutes, ','tous les jours','.'],
    lede:'7 actions à cocher chaque matin. Sans elles, le reste s\'effondre.',
    meta:'<b style="color:var(--ls-charcoal)">30&nbsp;min</b> · <b style="color:var(--ls-charcoal)">7</b> actions' }
];

/* ────────────────────────────────────────────────────────────
   SCRIPTS M1 — par marché × plateforme
   Chaque entrée : { script: '...HTML...', trad: '...HTML FR...', stat:'42%', n:19 }
   Pour les marchés que je ne localise pas en détail je tombe sur EN.
   ──────────────────────────────────────────────────────────── */

const VAR = (s) => `<span class="var">${s}</span>`;
const VARt = (s) => `<span class="var teal">${s}</span>`;

window.M1_SCRIPTS = {
  FR: {
    insta: { ctx:'prospect a regardé ta story 2× cette semaine', stat:'48%', n:24,
      script:`<p>Hey ${VAR('[prénom]')} ! J'ai vu que tu suivais ${VARt('[compte fitness]')} — tu bosses sur quoi côté forme en ce moment ?</p>`,
      trad:`<i>(message déjà en français — pas de traduction nécessaire)</i>` },
    fb: { ctx:'au moins 1 ami commun', stat:'31%', n:13,
      script:`<p>Salut ${VAR('[prénom]')}, on a ${VARt('[ami commun]')} en commun. Je bosse avec des gens qui veulent retrouver de l'énergie le matin — ça te parle de là où tu en es ?</p>`,
      trad:`` },
    wa: { ctx:'contact tiède, > 6 mois sans nouvelles', stat:'62%', n:9,
      script:`<p>Coucou ${VAR('[prénom]')} ! Ça fait un bail. Je voulais te demander un truc rapide — t'es ouvert·e à découvrir ce qui m'a aidé à ${VARt('[résultat concret]')} sans frustration ?</p>`,
      trad:`` },
    sms: { ctx:'cold mais chaleureux, rencontré IRL', stat:'24%', n:8,
      script:`<p>Hey ${VAR('[prénom]')}, c'est ${VARt('[moi]')}. On s'était croisé·e·s à ${VARt('[contexte]')}. J'ai un petit truc à te partager si t'es chaud·e — tu me dis ?</p>`,
      trad:`` },
  },
  INTL: {
    insta: { ctx:'prospect viewed your story 2× this week', stat:'42%', n:19,
      script:`<p>Hey ${VAR('[first name]')}! Saw you've been following ${VARt('[fitness account]')} — what are you working on right now on the training side?</p>`,
      trad:`Hey ${VAR('[prénom]')} ! J'ai vu que tu suivais ${VARt('[compte fitness]')} — tu bosses sur quoi côté entraînement en ce moment ?` },
    fb: { ctx:'at least 1 mutual friend', stat:'28%', n:11,
      script:`<p>Hey ${VAR('[first name]')}, I noticed we both know ${VARt('[mutual friend]')}. I work with athletes who want consistent morning energy without crashing at 3pm — does that resonate?</p>`,
      trad:`Salut ${VAR('[prénom]')} ! J'ai vu qu'on avait ${VARt('[ami commun]')} en commun. Je bosse avec des sportifs qui veulent une énergie stable sans baisse à 15h — ça te parle ?` },
    wa: { ctx:'warm contact, > 6 months silent', stat:'55%', n:7,
      script:`<p>Hey ${VAR('[first name]')}! Long time. Quick question — would you be open to hearing what's helped me ${VARt('[concrete result]')} without burning out?</p>`,
      trad:`Hey ${VAR('[prénom]')} ! Ça fait un bail. Question rapide — t'es ouvert·e à entendre ce qui m'a aidé à ${VARt('[résultat]')} sans m'épuiser ?` },
    sms: { ctx:'cold but warm, met in person', stat:'19%', n:6,
      script:`<p>Hey ${VAR('[first name]')}, it's ${VARt('[me]')} — we met at ${VARt('[context]')}. Got something small to share if you're curious. Let me know?</p>`,
      trad:`Hey ${VAR('[prénom]')}, c'est ${VARt('[moi]')}. On s'est croisé·e·s à ${VARt('[contexte]')}. J'ai un truc à te partager si curieux·se. Tu me dis ?` },
  },
  LATAM: {
    insta: { ctx:'vio tu story 2× esta semana', stat:'46%', n:21,
      script:`<p>Hola ${VAR('[nombre]')}! Vi que sigues ${VARt('[cuenta fitness]')} — ¿en qué estás trabajando ahora del lado de tu forma física?</p>`,
      trad:`Salut ${VAR('[prénom]')} ! J'ai vu que tu suis ${VARt('[compte fitness]')} — sur quoi tu bosses côté forme en ce moment ?` },
    fb: { ctx:'al menos 1 amigo en común', stat:'33%', n:14,
      script:`<p>Hola ${VAR('[nombre]')}, vi que tenemos a ${VARt('[amigo común]')} en común. Trabajo con mamás que quieren energía constante en la mañana — ¿te resuena?</p>`,
      trad:`Salut ${VAR('[prénom]')}, on a ${VARt('[ami commun]')} en commun. Je bosse avec des mamans qui veulent une énergie stable le matin — ça te parle ?` },
    wa: { ctx:'contacto tibio, > 6 meses sin hablar', stat:'58%', n:8,
      script:`<p>¡Hola ${VAR('[nombre]')}! Mucho tiempo. Pregunta rápida — ¿estarías abierta a oír lo que me ayudó a ${VARt('[resultado concreto]')} sin sufrir?</p>`,
      trad:`Salut ${VAR('[prénom]')} ! Ça fait un bail. Question rapide — t'es ouverte à entendre ce qui m'a aidée à ${VARt('[résultat]')} sans souffrir ?` },
    sms: { ctx:'frío pero cálido, conocido IRL', stat:'21%', n:7,
      script:`<p>Hola ${VAR('[nombre]')}, soy ${VARt('[yo]')}. Nos vimos en ${VARt('[contexto]')}. Tengo algo chiquito que compartirte si te animas. ¿Me dices?</p>`,
      trad:`Hola ${VAR('[prénom]')}, c'est ${VARt('[moi]')}. On s'est vus à ${VARt('[contexte]')}. J'ai un petit truc à te partager si ça te tente. Tu me dis ?` },
  },
  BR: {
    insta: { ctx:'viu seu story 2× esta semana', stat:'44%', n:19,
      script:`<p>Oi ${VAR('[nome]')}! Vi que segue ${VARt('[conta fitness]')} — em que está focando agora no lado da forma física?</p>`,
      trad:`Salut ${VAR('[prénom]')} ! J'ai vu que tu suivais ${VARt('[compte fitness]')} — sur quoi tu te concentres côté forme ?` },
    fb: { ctx:'pelo menos 1 amigo em comum', stat:'30%', n:12,
      script:`<p>Oi ${VAR('[nome]')}, vi que temos ${VARt('[amigo comum]')} em comum. Trabalho com mães que querem energia estável de manhã — faz sentido pra você?</p>`,
      trad:`Salut ${VAR('[prénom]')}, on a ${VARt('[ami commun]')} en commun. Je bosse avec des mamans qui veulent une énergie stable le matin — ça te parle ?` },
    wa: { ctx:'contato morno, > 6 meses sem falar', stat:'56%', n:8,
      script:`<p>Oi ${VAR('[nome]')}! Faz tempo. Pergunta rápida — você toparia ouvir o que me ajudou a ${VARt('[resultado concreto]')} sem sofrer?</p>`,
      trad:`Salut ${VAR('[prénom]')} ! Ça fait un bail. Question rapide — t'es ouvert·e à entendre ce qui m'a aidé à ${VARt('[résultat]')} sans souffrir ?` },
    sms: { ctx:'frio mas caloroso, conhecido IRL', stat:'20%', n:6,
      script:`<p>Oi ${VAR('[nome]')}, é ${VARt('[eu]')}. A gente se viu em ${VARt('[contexto]')}. Tenho uma coisinha pra compartilhar se topar. Me diz?</p>`,
      trad:`Hey ${VAR('[prénom]')}, c'est ${VARt('[moi]')}. On s'est vu à ${VARt('[contexte]')}. J'ai un petit truc à partager si tu veux. Tu me dis ?` },
  },
  TR: {
    insta: { ctx:'story\'ni 2× izledi bu hafta', stat:'40%', n:16,
      script:`<p>Selam ${VAR('[isim]')}! ${VARt('[fitness hesabını]')} takip ettiğini gördüm — şu an formuna dair neye odaklanıyorsun?</p>`,
      trad:`Salut ${VAR('[prénom]')} ! J'ai vu que tu suivais ${VARt('[compte fitness]')} — sur quoi tu te concentres côté forme ?` },
    fb: { ctx:'en az 1 ortak arkadaş', stat:'27%', n:10,
      script:`<p>Merhaba ${VAR('[isim]')}, ${VARt('[ortak arkadaş]')}'la ortak olduğumuzu fark ettim. Sabah enerji isteyen annelerle çalışıyorum — sana hitap ediyor mu?</p>`,
      trad:`Salut ${VAR('[prénom]')}, on a ${VARt('[ami commun]')} en commun. Je bosse avec des mamans qui veulent de l'énergie le matin — ça te parle ?` },
    wa: { ctx:'ılık temas, 6 aydır sessiz', stat:'52%', n:7,
      script:`<p>Selam ${VAR('[isim]')}! Uzun zaman oldu. Hızlı bir soru — ${VARt('[somut sonuç]')} elde etmeme yardım eden şeyi duymaya açık mısın?</p>`,
      trad:`Salut ${VAR('[prénom]')} ! Ça fait un bail. Question rapide — t'es ouvert·e à entendre ce qui m'a aidé à ${VARt('[résultat]')} ?` },
    sms: { ctx:'soğuk ama samimi, IRL tanıştık', stat:'18%', n:5,
      script:`<p>Selam ${VAR('[isim]')}, ben ${VARt('[ben]')}. ${VARt('[bağlam]')}'da karşılaştık. Paylaşmak istediğim küçük bir şey var. Söyle?</p>`,
      trad:`Hey ${VAR('[prénom]')}, c'est ${VARt('[moi]')}. On s'est rencontrés à ${VARt('[contexte]')}. J'ai un petit truc à partager. Tu me dis ?` },
  },
  IN: {
    insta: { ctx:'viewed your story 2× this week', stat:'38%', n:14,
      script:`<p>Hi ${VAR('[first name]')}! Noticed you follow ${VARt('[fitness account]')} — what are you focusing on right now health-wise?</p>`,
      trad:`Salut ${VAR('[prénom]')} ! J'ai vu que tu suis ${VARt('[compte fitness]')} — sur quoi tu te concentres côté santé ?` },
    fb: { ctx:'at least 1 mutual friend', stat:'25%', n:9,
      script:`<p>Hi ${VAR('[first name]')}, I see we both know ${VARt('[mutual friend]')}. I work with working moms who want stable morning energy — does that resonate?</p>`,
      trad:`Salut ${VAR('[prénom]')}, on a ${VARt('[ami commun]')} en commun. Je bosse avec des mamans qui veulent une énergie stable le matin — ça te parle ?` },
    wa: { ctx:'warm contact, > 6 months silent', stat:'50%', n:6,
      script:`<p>Hi ${VAR('[first name]')}! Long time. Quick one — would you be open to hearing what helped me ${VARt('[concrete result]')} without burning out?</p>`,
      trad:`Salut ${VAR('[prénom]')} ! Ça fait un bail. Question rapide — t'es ouvert·e à entendre ce qui m'a aidé à ${VARt('[résultat]')} ?` },
    sms: { ctx:'cold but warm, met IRL', stat:'17%', n:4,
      script:`<p>Hi ${VAR('[first name]')}, ${VARt('[me]')} here — we met at ${VARt('[context]')}. Small thing to share if you're curious. Let me know?</p>`,
      trad:`Hey ${VAR('[prénom]')}, c'est ${VARt('[moi]')}. On s'est rencontrés à ${VARt('[contexte]')}. J'ai un petit truc à partager. Tu me dis ?` },
  }
};

window.PLATFORMS = [
  { code:'insta', ic:'📷', name:'Instagram', sub:'DM après story',
    glyphStyle:'' },
  { code:'fb',    ic:'f',  name:'Facebook',  sub:'Messenger · via ami',
    glyphStyle:'background:#1877F210;border-color:#1877F230;color:#1877F2;font-weight:700' },
  { code:'wa',    ic:'💬', name:'WhatsApp',  sub:'contact tiède',
    glyphStyle:'background:#25D36610;border-color:#25D36630' },
  { code:'sms',   ic:'✉',  name:'SMS',       sub:'cold après IRL',
    glyphStyle:'' }
];

/* ────────────────────────────────────────────────────────────
   OBJECTIONS (8) — texte FR de base
   ──────────────────────────────────────────────────────────── */
window.OBJECTIONS = [
  { tag:'budget',  quote:"Je n'ai pas le budget pour ça.",
    bad:'« Mais c\'est pas cher du tout en fait ! »',
    good:`« Je comprends. C'est quoi le budget que tu te fixes pour ${VAR('[forme / objectif]')} chaque mois en ce moment ? »`,
    variants:3 },
  { tag:'échec passé', quote:"J'connais quelqu'un, ça n'a pas marché pour lui.",
    bad:'« Bah il s\'est mal pris alors. »',
    good:'« Intéressant. Tu sais ce qu\'il a fait exactement ? Souvent c\'est un petit détail qui change tout — je te raconte ? »',
    variants:2 },
  { tag:'secte', quote:"C'est une secte ton truc, non ?",
    bad:'« Mais pas du tout, comment tu peux dire ça ?! »',
    good:'« T\'inquiète, j\'étais sceptique aussi. C\'est juste un programme nutrition. Je t\'explique en 2 minutes ? »',
    variants:3 },
  { tag:'pas le temps', quote:"J'ai pas le temps pour ça.",
    bad:'« Si si t\'as le temps, tu vas voir. »',
    good:'« C\'est exactement pour ça que c\'est fait — 3 minutes le matin. T\'as 3 minutes maintenant pour que je te montre ? »',
    variants:2 },
  { tag:'mari · femme', quote:"Je veux en parler à mon mari d'abord.",
    bad:'« Tu vois ton mari quand ? »',
    good:`« Bien sûr. Tu veux que je te prépare les infos précises pour qu'il puisse juger en connaissance de cause ? ${VAR('[2-3 questions]')} et je te fais un récap'. »`,
    variants:2 },
  { tag:'envoie infos', quote:"Tu peux m'envoyer les infos par écrit ?",
    bad:'(envoyer un gros PDF directement)',
    good:'« Carrément. Avant que je t\'envoie ça — dis-moi en une phrase ton objectif principal, comme ça je t\'envoie pile ce qui t\'intéresse, pas un pavé. »',
    variants:2 },
  { tag:'préfère sport', quote:"Moi je préfère faire du sport.",
    bad:'« Le sport seul c\'est pas suffisant. »',
    good:'« Top, j\'adore. Le sport représente 30% du résultat, l\'assiette 70%. Tu veux que je te montre ce qu\'on fait sur les 70% ? »',
    variants:3 },
  { tag:'je réfléchis', quote:"Je vais y réfléchir.",
    bad:'« OK, tu me dis quand. »',
    good:'« Bien sûr. Tu réfléchis sur quoi exactement — le programme, le prix, le timing ? Je t\'aide à clarifier en 2 min. »',
    variants:2 }
];

/* ARBRES M2/M3 */
window.TREES = [
  { reaction:'warm', label:'Tiède', emoji:'🔥',
    they:'Ouais carrément, raconte-moi !',
    you:`Cool. Quick context — je fais du coaching nutrition depuis ${VAR('[X mois/ans]')}. La meilleure manière de voir si ça matche c'est qu'on prenne 20 min pour creuser ton objectif. T'es dispo ${VAR('[jour]')} ou ${VAR('[jour]')} en visio ?`,
    variants:3 },
  { reaction:'cold', label:'Froid', emoji:'❄️',
    they:'Non merci, je gère, je vais pas être client·e.',
    you:`Pas de souci ${VAR('[prénom]')}, je comprends. Pour info je travaille aussi avec des gens qui veulent compléter leurs revenus en parallèle — c'est pas ton kif, ou je te fais signe si je vois un truc qui pourrait t'aider ?`,
    variants:2 },
  { reaction:'maybe', label:'Indécis', emoji:'🤔',
    they:'Hum, peut-être, je sais pas trop là.',
    you:`Ouais je sens que c'est pas évident. Dis-moi — c'est plus l'idée du programme qui te bloque, ou le moment où je t'écris est pas bon ? Je veux pas te forcer la main, juste comprendre.`,
    variants:3 }
];

/* POST-APPEL */
window.POSTCALL = [
  { when:'J0 · juste après appel', title:'Récap chaud',
    state:'now',
    msg:`Merci pour notre échange ${VAR('[prénom]')} ! Petit récap : on a vu ${VARt('[problème principal]')} et l'idée d'attaquer par ${VARt('[solution proposée]')}. Je te file les 2 docs promis ce soir. À très vite !` },
  { when:'J+2', title:'Question ouverte',
    msg:`Salut ${VAR('[prénom]')}, j'y repensais après notre call — t'as eu le temps de regarder ${VARt('[doc envoyé]')} ? Quelle question t'est venue en premier ?` },
  { when:'J+5', title:'Témoignage similaire',
    state:'future',
    msg:`${VAR('[prénom]')}, je te partage un témoignage rapide d'une cliente qui avait exactement ton profil ${VARt('[contexte]')} — résultat à 3 mois. Si tu veux qu'on se reparle, je t'envoie 2 créneaux ?` },
  { when:'J+30', title:'Pas de pression',
    state:'future',
    msg:`Hey ${VAR('[prénom]')} ! Je ferme la boucle de mon côté — pas de pression. Si jamais ${VARt('[objectif initial]')} revient sur ta liste, ma porte reste ouverte. Belle suite !` }
];

/* CLOSING */
window.CLOSING = {
  signals:[
    'Pose des questions sur le prix ou les modalités',
    'Demande « ça commence quand ? »',
    'Évoque une date / un événement où il/elle veut être prêt·e',
    'Pose des questions sur les autres clients',
    'Répète tes mots en disant « ouais, c\'est ça que je veux »'
  ],
  scripts:[
    { name:'Le récap·décision', ctx:'fin d\'appel · prospect mûr',
      body:`«&nbsp;Alors ${VAR('[prénom]')}, on a vu que tu voulais ${VARt('[résultat]')} et que ce qui te bloque c'est ${VARt('[obstacle]')}. Ce programme adresse pile ça. Tu veux qu'on cale le démarrage la semaine prochaine ou tu préfères dans deux semaines ?&nbsp;»` },
    { name:'Le choix binaire', ctx:'évite le « oui/non »',
      body:`«&nbsp;Pour démarrer, tu préfères le pack ${VARt('[A]')} à ${VARt('[X€]')} ou le pack ${VARt('[B]')} à ${VARt('[Y€]')} ? Les deux fonctionnent pour ton objectif, c'est juste une question de rythme.&nbsp;»` },
    { name:'L\'assumed close', ctx:'prospect très chaud',
      body:`«&nbsp;Parfait. Je te crée ton compte ce soir, tu reçois tes accès demain matin ${VARt('[heure]')}, et on cale notre premier point ${VARt('[jour]')} ?&nbsp;»` }
  ]
};

/* CAS SPÉCIAUX */
window.SPECIAL = {
  ghost:{
    title:'Ghosting · pas de réponse depuis 5+ jours',
    body:`Salut ${VAR('[prénom]')} ! Je voulais pas te lâcher comme ça — soit le timing est pas bon, soit le sujet t'intéresse pas, soit j'ai mal expliqué. Dis-moi juste lequel des trois et je m'adapte (ou je te laisse tranquille, promis 🙂).`,
    tips:['1 seule relance, pas 2','Donne 3 options claires (timing, sujet, explication)','Mets une porte de sortie polie']
  },
  reactivation:{
    title:'Réactivation · client·e parti·e il y a 6+ mois',
    body:`Hey ${VAR('[prénom]')} ! Ça fait un moment. Je ferai pas le coup du « ça serait bien de reprendre » — je voulais juste te demander : qu'est-ce qui t'a fait arrêter à l'époque ? J'ai changé pas mal de choses depuis, et je serais curieux·se d'entendre ton retour.`,
    tips:['Demande pourquoi avant de proposer','Montre ce qui a changé','Pas de promo immédiate']
  },
  reco:{
    title:'Demande de recommandation',
    body:`${VAR('[prénom]')}, je voulais te demander un petit truc — depuis qu'on bosse ensemble t'as ${VARt('[résultat concret]')}. Qui dans ton entourage proche pourrait avoir besoin de ce qu'on a fait ensemble ? Je te demande pas de pitcher, juste 1 ou 2 prénoms et je m'en occupe.`,
    tips:['Attendre un résultat concret','Demande 1-2 prénoms, pas une liste','Tu pitches pas, tu prends le relais']
  }
};

/* STORYTELLING */
window.STORY = {
  acts:[
    {step:'Acte I',title:'Avant',body:'Le problème vécu, le quotidien d\'avant.'},
    {step:'Acte II',title:'Le déclic',body:'L\'événement, la rencontre, le ras-le-bol.', gold:true},
    {step:'Acte III',title:'Après',body:'La transformation, en chiffres et en ressenti.'}
  ],
  examples:[
    { by:'Marie · maman 38 ans · Lyon',
      body:`<p><em>Avant&nbsp;:</em> je me levais à 6h en étant déjà fatiguée. Café sur café, et à 16h je m'écroulais. J'étais devenue irritable avec mes enfants — je m'en voulais.</p><p><em>Déclic&nbsp;:</em> ma sœur m'a montré ce qu'elle faisait depuis 3 mois. Pas un mot sur le « produit », elle m'a juste raconté sa routine du matin.</p><p><em>Après&nbsp;:</em> 8 mois plus tard, -9 kg, je dors comme un bébé, et je suis devenue celle qui partage. C'est elle qui m'avait sauvée.</p>` },
    { by:'Karim · entrepreneur · 42 ans',
      body:`<p><em>Avant&nbsp;:</em> 14h de boulot par jour, ventre tendu, je mangeais devant l'écran sans goûter.</p><p><em>Déclic&nbsp;:</em> un client a refusé un meeting parce que j'avais l'air « épuisé ». J'ai compris que ça impactait mon business.</p><p><em>Après&nbsp;:</em> 4 mois, -7 kg, et surtout 2h d'énergie en plus chaque jour. Mes deals se signent mieux.</p>` }
  ]
};

/* ROUTINE */
window.ROUTINE = [
  { mins:'5 min', txt:'Bilan rapide hier&nbsp;: combien de M1 envoyés ? Combien de réponses ?' },
  { mins:'5 min', txt:'Identifier <b>5 nouveaux prospects</b> (scan 30s par profil)' },
  { mins:'8 min', txt:'Envoyer les <b>5 messages M1</b> personnalisés avec [prénom]' },
  { mins:'5 min', txt:'Relancer <b>2-3 conversations</b> en cours · M2 / M3' },
  { mins:'3 min', txt:'Répondre aux objections du jour si arrivées' },
  { mins:'2 min', txt:'Logger ce qui a marché aujourd\'hui · 1 phrase' },
  { mins:'2 min', txt:'Poster <b>1 story</b> en lien avec ton avant→après' }
];
