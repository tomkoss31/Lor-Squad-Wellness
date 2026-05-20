/* ────────────────────────────────────────────────────────────
   LA BASE 360 · Prospection — Prototype interactif
   ──────────────────────────────────────────────────────────── */
(function(){
  const $ = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => Array.from(el.querySelectorAll(s));
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const state = {
    market: 0,
    profile: 0,
    module: 0,
    platform: 0,
    lang: {},          // per-script lang: { 'insta':'native'|'fr', ... }
    sent: 12,
    rdv: 3,
    sentMap: {},       // which scripts were marked sent in this session
    checks: {},        // routine checkbox state
    caseTab: 'ghost',
    sheet: null,       // 'market' | 'profile' | 'stat' | null
  };

  /* ── FIT phone to viewport ─────────────────────────── */
  function fit(){
    const isDesktop = document.documentElement.classList.contains('view-desktop');
    const targetH = isDesktop ? 880 : 870;
    const targetW = isDesktop ? 780 : 440;
    const h = window.innerHeight - 36;
    const w = window.innerWidth - 36;
    const s = Math.min(1, h/targetH, w/targetW);
    document.documentElement.style.setProperty('--phone-scale', s);
  }
  window.addEventListener('resize', fit);
  fit();

  /* ── Toast ─────────────────────────────────────────── */
  let toastT;
  function toast(text='Copié !'){
    const t = $('#toast');
    $('#toast-text').innerHTML = text;
    t.classList.remove('hide');
    t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(()=>{
      t.classList.remove('show');
      t.classList.add('hide');
    }, 1500);
  }

  /* ── Sheet ─────────────────────────────────────────── */
  function openSheet(kind){
    state.sheet = kind;
    const sheet = $('#sheet');
    const back = $('#backdrop');
    const body = $('#sheet-body');
    const title = $('#sheet-title');
    const kicker = $('#sheet-kicker');
    sheet.classList.remove('stat-sheet');

    if (kind === 'market'){
      kicker.textContent = 'Choisir un marché';
      title.textContent = 'Marché cible.';
      body.innerHTML = `
        <div class="opts cols-2">
          ${MARKETS.map((m,i)=>`
            <button class="opt ${i===state.market?'on':''}" data-i="${i}">
              <span class="flag">${m.flag}</span>
              <span class="info"><b>${m.name}</b><small>${m.sub} · ${m.lang}</small></span>
              <span class="check"></span>
            </button>
          `).join('')}
        </div>
        <div style="font-family:var(--f-mono);font-size:10.5px;color:var(--ls-muted);line-height:1.6;margin-top:14px;padding:10px 12px;background:var(--ls-surface2);border-radius:10px">
          Les scripts <b style="color:var(--ls-charcoal)">M1</b>, les <b style="color:var(--ls-charcoal)">hashtags</b> et les <b style="color:var(--ls-charcoal)">sources</b> se localisent automatiquement.
        </div>`;
      body.querySelectorAll('.opt').forEach(btn=>{
        btn.addEventListener('click', ()=>{
          state.market = parseInt(btn.dataset.i,10);
          closeSheet();
          renderAll();
          flash($('#market-picker'));
        });
      });
    }

    if (kind === 'profile'){
      kicker.textContent = 'Choisir un profil';
      title.textContent = 'Profil cible.';
      body.innerHTML = `
        <div class="opts">
          ${PROFILES.map((p,i)=>`
            <button class="opt ${i===state.profile?'on':''}" data-i="${i}">
              <span class="glyph">${p.glyph}</span>
              <span class="info"><b>${p.name}</b><small>${p.persona}</small></span>
              <span class="check"></span>
            </button>
          `).join('')}
        </div>`;
      body.querySelectorAll('.opt').forEach(btn=>{
        btn.addEventListener('click', ()=>{
          state.profile = parseInt(btn.dataset.i,10);
          closeSheet();
          renderAll();
          flash($('#profile-picker'));
        });
      });
    }

    if (kind === 'stat'){
      sheet.classList.add('stat-sheet');
      kicker.textContent = '7 derniers jours';
      title.textContent = 'Activité.';
      const sent = state.sent;
      const rdv  = state.rdv;
      const reps = Math.round(sent * 0.42);
      const clos = Math.max(1, Math.round(rdv * 0.4));
      const pct = (v, max=sent) => Math.min(100, Math.round(v/max*100));
      body.innerHTML = `
        <div class="big">
          <div class="stat"><div class="v">${sent}<small>↑</small></div><div class="k">M1 envoyés</div></div>
          <div class="stat"><div class="v">${reps}<small>↑</small></div><div class="k">Réponses</div></div>
          <div class="stat"><div class="v">${rdv}</div><div class="k">RDV pris</div></div>
          <div class="stat"><div class="v">${clos}</div><div class="k">Closing</div></div>
        </div>
        <div class="funnel">
          <div class="fn-row"><span class="lab">M1</span><div class="fn-bar"><div class="fn-fill" style="width:${pct(sent)}%"></div></div><span class="v">${sent}</span></div>
          <div class="fn-row"><span class="lab">Réponses</span><div class="fn-bar"><div class="fn-fill" style="width:${pct(reps)}%"></div></div><span class="v">${reps}</span></div>
          <div class="fn-row"><span class="lab">RDV</span><div class="fn-bar"><div class="fn-fill" style="width:${pct(rdv)}%"></div></div><span class="v">${rdv}</span></div>
          <div class="fn-row"><span class="lab">Closing</span><div class="fn-bar"><div class="fn-fill" style="width:${pct(clos)}%"></div></div><span class="v">${clos}</span></div>
        </div>
        <p style="font-family:var(--f-mono);font-size:10.5px;color:var(--ls-muted);line-height:1.6;margin:14px 0 0">
          Chaque <b>« J'ai envoyé »</b> incrémente. Les RDV s'incrémentent quand un script <b>WhatsApp</b> est envoyé (proxy démo).
        </p>`;
    }

    back.classList.add('open');
    sheet.classList.add('open');
  }
  function closeSheet(){
    state.sheet = null;
    $('#sheet').classList.remove('open');
    $('#backdrop').classList.remove('open');
  }
  function flash(el){
    el.classList.add('opening');
    setTimeout(()=>el.classList.remove('opening'), 280);
  }

  /* ── Render header (picker labels, stat chip, index, dots) ── */
  function renderHeader(){
    const m = MARKETS[state.market], p = PROFILES[state.profile], md = MODULES[state.module];
    $('#market-flag').textContent = m.flag;
    $('#market-val').innerHTML = m.name;
    $('#profile-glyph').textContent = p.glyph;
    $('#profile-val').innerHTML = p.name;
    $('#stat-sent').textContent = state.sent;
    $('#stat-rdv').textContent = state.rdv;
    $('#aside-sent') && ($('#aside-sent').textContent = state.sent);
    $('#aside-rdv')  && ($('#aside-rdv').textContent  = state.rdv);
    $('#live-market') && ($('#live-market').textContent = `${m.flag} ${m.name}`);
    $('#live-profile') && ($('#live-profile').textContent = `${p.glyph} ${p.name}`);
    $('#live-module')  && ($('#live-module').textContent  = `${String(state.module+1).padStart(2,'0')} · ${md.name}`);

    /* index rail */
    const rail = $('#index');
    rail.innerHTML = MODULES.map((mod, i)=>{
      const cls = i===state.module ? 'active' : (i<state.module ? 'done':'');
      return `<button class="step ${cls}" data-i="${i}" type="button" aria-label="${mod.name}">
        <span class="n">${String(i+1).padStart(2,'0')}</span>
        <span class="ic">${mod.ic}</span>
        <span class="name">${mod.name}</span>
      </button>`;
    }).join('');
    rail.querySelectorAll('.step').forEach(s=>{
      s.addEventListener('click', ()=> goModule(parseInt(s.dataset.i,10)));
    });
    /* center active */
    requestAnimationFrame(()=>{
      const active = rail.querySelector('.step.active');
      if (active){
        const railRect = rail.getBoundingClientRect();
        const aRect = active.getBoundingClientRect();
        const delta = (aRect.left + aRect.width/2) - (railRect.left + railRect.width/2);
        rail.scrollBy({left:delta, behavior:'smooth'});
      }
    });

    /* dots */
    $('#dots').innerHTML = MODULES.map((_,i)=>{
      const cls = i===state.module ? 'on' : (i<state.module ? 'done' : '');
      return `<span class="d ${cls}"></span>`;
    }).join('');

    /* section meta + heading */
    $('#step-of').textContent = String(state.module+1).padStart(2,'0');
    $('#section-meta-r').innerHTML = md.meta;
    $('#section-kicker').innerHTML = md.kicker;
    $('#section-h2').innerHTML = `${md.h2[0]}<span class="em">${md.h2[1]}</span>${md.h2[2]||''}`;
    $('#section-lede').innerHTML = md.lede;

    /* prev/next */
    const prev = state.module - 1;
    const next = state.module + 1;
    const prevBtn = $('#prev'), nextBtn = $('#next');
    if (prev < 0){
      prevBtn.disabled = true;
      $('#prev-small').textContent = 'Début';
      $('#prev-name').textContent  = 'Index';
    } else {
      prevBtn.disabled = false;
      $('#prev-small').textContent = `Précédent · ${String(prev+1).padStart(2,'0')}`;
      $('#prev-name').textContent  = MODULES[prev].name;
    }
    if (next > 9){
      nextBtn.disabled = true;
      $('#next-small').textContent = 'Fin';
      $('#next-name').textContent  = '—';
    } else {
      nextBtn.disabled = false;
      $('#next-small').textContent = `Suivant · ${String(next+1).padStart(2,'0')}`;
      $('#next-name').textContent  = MODULES[next].name;
    }
  }

  /* ── Render body (per module) ──────────────────────── */
  function renderBody(){
    const inner = $('#body-inner');
    const html = MODULE_RENDERERS[state.module]();
    inner.innerHTML = html;
    /* scroll to top of module */
    $('#body').scrollTop = 0;
    /* wire up per-module interactions */
    wireBody(inner);
  }

  function renderAll(animated=true){
    renderHeader();
    if (animated && !REDUCED){
      const inner = $('#body-inner');
      inner.classList.add('swapping');
      setTimeout(()=>{
        renderBody();
        requestAnimationFrame(()=> inner.classList.remove('swapping'));
      }, 120);
    } else {
      renderBody();
    }
  }

  /* ── Navigation ────────────────────────────────────── */
  function goModule(i){
    if (i<0 || i>9 || i===state.module) return;
    state.module = i;
    renderAll(true);
  }

  $('#prev').addEventListener('click', ()=> goModule(state.module-1));
  $('#next').addEventListener('click', ()=> goModule(state.module+1));
  $('#market-picker').addEventListener('click', ()=> { flash($('#market-picker')); openSheet('market'); });
  $('#profile-picker').addEventListener('click', ()=> { flash($('#profile-picker')); openSheet('profile'); });
  $('#statChip').addEventListener('click', ()=> openSheet('stat'));
  $('#backdrop').addEventListener('click', closeSheet);

  /* keyboard */
  window.addEventListener('keydown', (e)=>{
    if (e.key === 'Escape'){ closeSheet(); return; }
    if (state.sheet) return;
    if (e.key === 'ArrowRight'){ goModule(state.module+1); }
    if (e.key === 'ArrowLeft') { goModule(state.module-1); }
    if (/^[1-9]$/.test(e.key))  goModule(parseInt(e.key,10)-1);
    if (e.key === '0')          goModule(9);
    if (e.key === 'm' || e.key === 'M') openSheet('market');
    if (e.key === 'p' || e.key === 'P') openSheet('profile');
    if (e.key === 'c' || e.key === 'C'){
      const focus = document.activeElement;
      const btn = focus && focus.classList && focus.classList.contains('btn') && focus.classList.contains('copy') ? focus : null;
      if (btn){ btn.click(); }
      else { const first = $('.btn.copy'); if (first) first.click(); }
    }
  });

  /* ────────────────────────────────────────────────────
     MODULE RENDERERS
     ──────────────────────────────────────────────────── */
  const MODULE_RENDERERS = [
    renderMindset,
    renderTrouver,
    renderMessages,
    renderTrees,
    renderObjections,
    renderPostcall,
    renderClosing,
    renderSpecial,
    renderStory,
    renderRoutine,
  ];

  function localeTag(extra=''){
    const m = MARKETS[state.market], p = PROFILES[state.profile];
    return `<span class="locale-tag">Localisé pour <b>${m.flag}&nbsp;${m.name}</b>&nbsp;·&nbsp;<b>${p.glyph}&nbsp;${p.short}</b>${extra?` · ${extra}`:''}</span>`;
  }

  function renderMindset(){
    return `
      <article class="truth">
        <div class="truth-row">
          <div class="num">01</div>
          <div>
            <div class="kicker">Vérité n°1 · posture</div>
            <p class="quote">Tu ne <em>vends</em> pas. Tu invites quelqu'un à se transformer.</p>
            <p class="by">— extrait <em>Méthode 360</em></p>
          </div>
        </div>
      </article>

      <article class="truth-lite">
        <div class="ctx">Vérité n°2 · refus</div>
        <p>Le <em>«&nbsp;non&nbsp;»</em> n'existe pas. Seulement <em>pas encore</em>, <em>pas comme ça</em>, <em>pas avec toi</em>.</p>
      </article>

      <article class="truth-lite">
        <div class="ctx">Vérité n°3 · énergie</div>
        <p>Ton <em>énergie</em> compte plus que ton script.</p>
      </article>

      <div class="errors-head">
        <span class="label">5 erreurs à éviter</span>
        <span style="font-family:var(--f-mono);font-size:10px;color:var(--ls-muted);letter-spacing:.1em">↓</span>
      </div>
      ${[
        'Parler produit avant d\'avoir écouté le besoin.',
        'Suivre tout le monde au lieu de cibler des profils qualifiés.',
        'Disparaître après le M1 sans relance structurée.',
        'Sortir le prix trop tôt dans la conversation.',
        'Copier-coller sans personnaliser le prénom.'
      ].map((t,i)=>`
        <div class="err">
          <span class="n">0${i+1}</span>
          <div class="txt"><span class="strike">${t.split(' ').slice(0,3).join(' ')}</span> ${t.split(' ').slice(3).join(' ')}</div>
        </div>`).join('')}

      <div style="height:14px"></div>
      ${localeTag(`vue 2× cette sem.`)}
    `;
  }

  function renderTrouver(){
    const m = MARKETS[state.market];
    return `
      <div class="scan-timer"><span class="pulse"></span>Scan en 30&nbsp;s · les 4 premières secondes</div>

      <div class="flags">
        <div class="flag-col green">
          <h5><span class="dot"></span>Drapeaux verts</h5>
          <ul>${m.flagsGreen.map(f=>`<li>${f}</li>`).join('')}</ul>
        </div>
        <div class="flag-col red">
          <h5><span class="dot"></span>Drapeaux rouges</h5>
          <ul>${m.flagsRed.map(f=>`<li>${f}</li>`).join('')}</ul>
        </div>
      </div>

      <article class="hashtag-card">
        <div class="htag-head">
          <span>Hashtags · <b>${m.flag}&nbsp;${m.name}</b></span>
          <span style="font-family:var(--f-mono);font-size:9.5px">3 catégories</span>
        </div>
        <div class="htag-row">
          <span class="cat">Mainstream</span>
          ${m.hashtags.mainstream.map(h=>`<button class="htag" type="button" data-copy="${h}">${h}</button>`).join('')}
        </div>
        <div class="htag-row">
          <span class="cat">Niche</span>
          ${m.hashtags.niche.map(h=>`<button class="htag gold" type="button" data-copy="${h}">${h}</button>`).join('')}
        </div>
        <div class="htag-row">
          <span class="cat">Cross</span>
          ${m.hashtags.cross.map((h,i)=>`<button class="htag ${i<2?'teal':'purple'}" type="button" data-copy="${h}">${h}</button>`).join('')}
        </div>
      </article>

      <article class="src-card">
        <div class="kk">3 sources hors-feed</div>
        <h4>Là où les autres ne cherchent pas.</h4>
        <div class="src-row"><div class="src-lab">FB</div><div class="src-body">${m.sources.fb}</div></div>
        <div class="src-row"><div class="src-lab">IRL</div><div class="src-body">${m.sources.irl}</div></div>
        <div class="src-row"><div class="src-lab">Reco</div><div class="src-body">${m.sources.reco}</div></div>
      </article>

      <div style="height:8px"></div>
      ${localeTag()}
    `;
  }

  function renderMessages(){
    const market = MARKETS[state.market];
    const scripts = M1_SCRIPTS[market.code] || M1_SCRIPTS.INTL;
    const current = PLATFORMS[state.platform];
    const data = scripts[current.code];
    const langKey = `${market.code}-${current.code}`;
    const lang = state.lang[langKey] || (market.code === 'FR' ? 'native' : 'native'); // default to native
    const sent = !!state.sentMap[`m1-${langKey}`];

    return `
      <div class="platform-tabs" role="tablist">
        ${PLATFORMS.map((pl,i)=>`
          <button class="tab ${i===state.platform?'on':''}" data-i="${i}" type="button">
            <span class="ic">${pl.ic}</span>${pl.name}
          </button>`).join('')}
      </div>

      <article class="script ${sent?'sent':''}" data-key="${langKey}">
        <div class="head">
          <span class="glyph" style="${current.glyphStyle}">${current.ic}</span>
          <div>
            <h4>${current.name} · ${current.sub.split('·')[0].trim()}</h4>
            <span class="sub">${current.sub.includes('·')? current.sub.split('·').slice(1).join('·').trim() : ''}</span>
          </div>
          ${market.code === 'FR' ? '' : `
            <div class="lang-switch" data-key="${langKey}">
              <button data-l="native" class="${lang==='native'?'on':''}">${market.lang}</button>
              <button data-l="fr" class="${lang==='fr'?'on':''}">FR</button>
            </div>`}
        </div>
        <div class="ctx">Contexte · ${data.ctx}</div>
        <div class="msg-body">${lang==='fr' && data.trad ? `<p>${data.trad}</p>` : data.script}</div>
        ${market.code !== 'FR' && lang === 'native' && data.trad ? `<div class="trad-line">${data.trad}</div>` : ''}
        <div class="script-actions">
          <button class="btn copy" type="button" data-msg="m1-${langKey}"><span class="ic">⌘C</span>Copier</button>
          <button class="btn send ${sent?'done':''}" type="button" data-send="m1-${langKey}" data-platform="${current.code}">
            <span class="ic">${sent?'✓':'↗'}</span>${sent?'Envoyé':'J\'ai envoyé'}
          </button>
          <div class="spacer"></div>
          <span class="stat-mini">Taux réponse&nbsp; <b>${data.stat}</b>&nbsp; · &nbsp;n=<b>${data.n}</b></span>
        </div>
      </article>

      <div style="height:6px"></div>
      ${localeTag(`taux moyens des autres distri·s`)}
    `;
  }

  function renderTrees(){
    return `
      ${TREES.map(t=>`
        <article class="tree-branch">
          <div class="reaction"><b>Réaction&nbsp;:</b><span class="pill ${t.reaction}">${t.emoji}&nbsp;${t.label}</span></div>
          <q>${t.they}</q>
          <div class="reply">${t.you}</div>
          <div class="actions">
            <button class="btn copy" type="button" data-msg="tree-${t.reaction}"><span class="ic">⌘C</span>Copier la réponse</button>
            <button class="btn ghost" type="button">Variantes · ${t.variants}</button>
          </div>
        </article>`).join('')}
      <div style="height:6px"></div>
      ${localeTag()}
    `;
  }

  function renderObjections(){
    return `
      ${OBJECTIONS.map((o,i)=>`
        <article class="obj">
          <div class="quote">
            <div class="n">${String(i+1).padStart(2,'0')}<small>·&nbsp;${o.tag}</small></div>
            <q>${o.quote}</q>
          </div>
          <div class="obj-row bad">
            <span class="badge">✕</span>
            <div><span class="lbl">À ne pas dire</span><p>${o.bad}</p></div>
          </div>
          <div class="obj-row good">
            <span class="badge">✓</span>
            <div><span class="lbl">Ce qui ouvre</span><p>${o.good}</p></div>
          </div>
          <div class="obj-actions">
            <button class="btn copy" type="button" data-msg="obj-${i}"><span class="ic">⌘C</span>Copier la réponse</button>
            <button class="btn ghost" type="button">Variantes · ${o.variants}</button>
          </div>
        </article>`).join('')}
      <div style="height:6px"></div>
      ${localeTag(`8 objections en France · variantes/marché`)}
    `;
  }

  function renderPostcall(){
    return `
      <div class="timeline">
        ${POSTCALL.map((s,i)=>`
          <div class="t-step ${s.state||''}">
            <div class="when">${s.when}</div>
            <h4>${s.title}</h4>
            <div class="msg">${s.msg}</div>
            <div class="actions">
              <button class="btn copy" type="button" data-msg="pc-${i}"><span class="ic">⌘C</span>Copier</button>
              ${s.state!=='future' ? `<button class="btn send" type="button" data-send="pc-${i}"><span class="ic">↗</span>Programmé</button>` : ''}
            </div>
          </div>`).join('')}
      </div>
      <div class="card" style="background:linear-gradient(180deg,var(--ls-surface2),transparent),#fff">
        <div style="font-family:var(--f-mono);font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--ls-muted);margin-bottom:4px">Règle</div>
        <p style="margin:0;font-family:var(--f-display);font-weight:600;font-size:17px;line-height:1.2;letter-spacing:-.01em">
          Quatre touches <em style="color:var(--ls-gold-dark);font-style:italic;font-weight:500">maximum</em>. Pas une de plus.
        </p>
      </div>
      ${localeTag()}
    `;
  }

  function renderClosing(){
    return `
      <article class="signal-card">
        <h5>Les 5 signaux qui montrent que c'est mûr</h5>
        <div class="signal-list">
          ${CLOSING.signals.map(s=>`<div class="row">${s}</div>`).join('')}
        </div>
      </article>
      ${CLOSING.scripts.map((s,i)=>`
        <article class="close-script">
          <h4>${s.name}</h4>
          <div class="ctx">${s.ctx}</div>
          <p>${s.body}</p>
          <div class="script-actions" style="margin-top:10px;padding-top:8px">
            <button class="btn copy" type="button" data-msg="close-${i}"><span class="ic">⌘C</span>Copier</button>
            <button class="btn ghost" type="button">Variante</button>
          </div>
        </article>`).join('')}
      ${localeTag()}
    `;
  }

  function renderSpecial(){
    const cases = [
      {k:'ghost', label:'Ghost'},
      {k:'reactivation', label:'Réactivation'},
      {k:'reco', label:'Recommandation'}
    ];
    const active = state.caseTab;
    const data = SPECIAL[active];
    return `
      <div class="case-tabs">
        ${cases.map(c=>`<button class="${c.k===active?'on':''}" data-case="${c.k}" type="button">${c.label}</button>`).join('')}
      </div>
      <article class="card">
        <h3 style="font-family:var(--f-display);font-weight:700;font-size:18px;letter-spacing:-.015em">${data.title}</h3>
        <div style="font-size:13.5px;line-height:1.5;color:var(--ls-charcoal);margin:8px 0 10px;padding:12px 14px;background:var(--ls-surface2);border-radius:10px">
          ${data.body}
        </div>
        <div style="font-family:var(--f-mono);font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--ls-gold-dark);margin-bottom:6px">Règles</div>
        <ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:6px">
          ${data.tips.map(t=>`<li style="display:flex;gap:8px;font-size:13px;line-height:1.4"><span style="color:var(--ls-gold);font-weight:700">·</span>${t}</li>`).join('')}
        </ul>
        <div class="script-actions" style="margin-top:12px">
          <button class="btn copy" type="button" data-msg="case-${active}"><span class="ic">⌘C</span>Copier</button>
          <button class="btn ghost" type="button">Variante</button>
        </div>
      </article>
      ${localeTag()}
    `;
  }

  function renderStory(){
    return `
      <div class="story-struct">
        ${STORY.acts.map(a=>`
          <div class="seg ${a.gold?'gold':''}">
            <div class="step">${a.step}</div>
            <h6>${a.title}</h6>
            <p>${a.body}</p>
          </div>`).join('')}
      </div>
      ${STORY.examples.map((ex,i)=>`
        <article class="story-example">
          <div class="by">${ex.by}</div>
          ${ex.body}
          <div class="script-actions" style="margin-top:10px;padding-top:8px">
            <button class="btn copy" type="button" data-msg="story-${i}"><span class="ic">⌘C</span>Copier l'exemple</button>
          </div>
        </article>`).join('')}
      ${localeTag()}
    `;
  }

  function renderRoutine(){
    const done = Object.values(state.checks).filter(Boolean).length;
    const total = ROUTINE.length;
    return `
      <article class="routine-summary">
        <div class="big">${done}<span>/${total}</span><small>aujourd'hui</small></div>
        <p>30 minutes par jour, <em style="color:var(--ls-gold-light);font-style:italic;font-weight:500">tous les jours</em>. Pas de routine = pas de pipeline.</p>
      </article>
      <article class="checklist">
        ${ROUTINE.map((r,i)=>`
          <div class="check-item ${state.checks[i]?'done':''}" data-i="${i}">
            <div class="box"></div>
            <div class="txt">${r.txt}</div>
            <div class="mins">${r.mins}</div>
          </div>`).join('')}
      </article>
      ${localeTag()}
    `;
  }

  /* ── Wire body interactions ────────────────────────── */
  function wireBody(root){
    /* COPY buttons */
    root.querySelectorAll('.btn.copy').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const text = btn.closest('article, .t-step, .check-item, .obj')?.innerText?.trim() || '';
        try { navigator.clipboard?.writeText(text); } catch(e){}
        toast('Copié ! <span style="color:rgba(255,255,255,.55);font-family:var(--f-mono);font-size:11px;margin-left:4px">— pense au prénom</span>');
      });
    });
    /* J'ai envoyé */
    root.querySelectorAll('.btn.send').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const key = btn.dataset.send;
        if (!key || state.sentMap[key]) return;
        state.sentMap[key] = true;
        state.sent += 1;
        const platform = btn.dataset.platform;
        if (platform === 'wa') state.rdv += 1; // proxy for warm contact converting
        $('#stat-sent').textContent = state.sent;
        $('#stat-sent').classList.add('bumped');
        $('#stat-rdv').textContent = state.rdv;
        if (platform === 'wa') $('#stat-rdv').classList.add('bumped');
        setTimeout(()=>{
          $('#stat-sent').classList.remove('bumped');
          $('#stat-rdv').classList.remove('bumped');
        }, 1200);
        $('#aside-sent') && ($('#aside-sent').textContent = state.sent);
        $('#aside-rdv')  && ($('#aside-rdv').textContent  = state.rdv);
        btn.classList.add('done');
        btn.innerHTML = `<span class="ic">✓</span>Envoyé`;
        const card = btn.closest('.script');
        if (card) card.classList.add('sent');
        toast(`Envoyé&nbsp;! <span style="color:rgba(255,255,255,.55);font-family:var(--f-mono);font-size:11px;margin-left:4px">+1 cette sem.</span>`);
      });
    });
    /* Hashtag copy */
    root.querySelectorAll('.htag[data-copy]').forEach(h=>{
      h.addEventListener('click', ()=>{
        try { navigator.clipboard?.writeText(h.dataset.copy); } catch(e){}
        toast(`Copié&nbsp;: ${h.textContent}`);
      });
    });
    /* Lang switch */
    root.querySelectorAll('.lang-switch').forEach(ls=>{
      ls.querySelectorAll('button').forEach(b=>{
        b.addEventListener('click', ()=>{
          const key = ls.dataset.key;
          state.lang[key] = b.dataset.l;
          renderBody();
        });
      });
    });
    /* Platform tabs */
    root.querySelectorAll('.platform-tabs .tab').forEach(t=>{
      t.addEventListener('click', ()=>{
        state.platform = parseInt(t.dataset.i,10);
        renderBody();
      });
    });
    /* Special case tabs */
    root.querySelectorAll('.case-tabs button').forEach(b=>{
      b.addEventListener('click', ()=>{
        state.caseTab = b.dataset.case;
        renderBody();
      });
    });
    /* Routine checks */
    root.querySelectorAll('.check-item').forEach(it=>{
      it.addEventListener('click', ()=>{
        const i = parseInt(it.dataset.i,10);
        state.checks[i] = !state.checks[i];
        renderBody();
      });
    });
  }

  /* INIT */
  renderAll(false);

})();
