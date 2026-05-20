// =============================================================================
// BusinessPage.styles — CSS scoped .biz-page (chantier #7 V2)
// Port verbatim du mockup Claude Design business-v2.html (2026-05-17).
// =============================================================================

export const BIZ_STYLES = `
/* ============================================================
   .biz-page  —  La Base 360 / Opportunité 2026
   Single namespace, no external deps beyond Google Fonts.
   ============================================================ */
.biz-page {
  --biz-emerald: #10B981;
  --biz-emerald-deep: #047857;
  --biz-cyan:    #06B6D4;
  --biz-violet:  #8B5CF6;
  --biz-violet-soft: #A78BFA;
  --biz-gold:    #B8922A;
  --biz-gold-soft: #D4B254;
  --biz-ink:     #0F172A;
  --biz-ink-2:   #1E293B;
  --biz-ink-3:   #334155;
  --biz-mist:    #FAFAFC;
  --biz-fog:     #E2E8F0;
  --biz-graphite:#475569;
  --biz-graphite-soft:#64748B;

  --biz-display: "Sora", system-ui, sans-serif;
  --biz-body:    "Inter", system-ui, sans-serif;
  --biz-italic:  "Syne", "Sora", serif;

  --biz-radius:  16px;
  --biz-radius-sm: 10px;
  --biz-radius-pill: 999px;
  --biz-shadow-sm: 0 1px 2px rgba(15,23,42,.04), 0 1px 1px rgba(15,23,42,.03);
  --biz-shadow-md: 0 6px 24px -8px rgba(15,23,42,.12), 0 2px 6px rgba(15,23,42,.04);
  --biz-shadow-lg: 0 20px 50px -20px rgba(15,23,42,.25), 0 6px 16px rgba(15,23,42,.06);

  font-family: var(--biz-body);
  color: var(--biz-ink);
  background: var(--biz-mist);
  font-size: 16px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
.biz-page *,
.biz-page *::before,
.biz-page *::after { box-sizing: border-box; }
.biz-page h1, .biz-page h2, .biz-page h3, .biz-page h4 {
  font-family: var(--biz-display); font-weight: 600; letter-spacing: -0.02em; margin: 0;
}
.biz-page p { margin: 0; }
.biz-page button { font-family: inherit; cursor: pointer; }
.biz-page a { color: inherit; text-decoration: none; }
.biz-page input { font-family: inherit; }

.biz-container { width: 100%; max-width: 1120px; margin: 0 auto; padding: 0 20px; }
@media (min-width: 768px) { .biz-container { padding: 0 32px; } }

.biz-eyebrow { font-family: var(--biz-body); font-size: 12px; font-weight: 500; letter-spacing: 0.18em; text-transform: uppercase; color: var(--biz-graphite); }
.biz-eyebrow--on-dark { color: rgba(255,255,255,.55); }

/* HEADER */
.biz-header { position: sticky; top: 0; z-index: 50; background: rgba(250,250,252,0.82); backdrop-filter: saturate(140%) blur(14px); -webkit-backdrop-filter: saturate(140%) blur(14px); border-bottom: 1px solid rgba(226,232,240,0.6); }
.biz-header__inner { display: flex; align-items: center; justify-content: space-between; gap: 24px; height: 64px; }
.biz-brand { display: flex; align-items: center; gap: 10px; font-family: var(--biz-display); font-weight: 600; font-size: 15px; letter-spacing: -0.01em; color: var(--biz-ink); }
.biz-brand__mark { width: 22px; height: 22px; border-radius: 50%; background: conic-gradient(from 200deg at 50% 50%, var(--biz-emerald) 0deg, var(--biz-cyan) 110deg, var(--biz-violet) 220deg, var(--biz-gold) 320deg, var(--biz-emerald) 360deg); box-shadow: inset 0 0 0 2px rgba(255,255,255,.85), 0 1px 2px rgba(15,23,42,.18); }
.biz-brand__sub { font-family: var(--biz-body); font-weight: 400; color: var(--biz-graphite-soft); font-size: 12px; margin-left: 4px; }
.biz-nav { display: none; gap: 28px; }
.biz-nav a { font-size: 14px; font-weight: 500; color: var(--biz-graphite); transition: color .18s ease; }
.biz-nav a:hover { color: var(--biz-ink); }
.biz-print { display: none; align-items: center; gap: 8px; padding: 8px 14px; border-radius: var(--biz-radius-pill); border: 1px solid var(--biz-fog); background: white; color: var(--biz-ink); font-size: 13px; font-weight: 500; transition: border-color .18s, transform .18s; }
.biz-print:hover { border-color: var(--biz-ink); transform: translateY(-1px); }
.biz-print svg { width: 14px; height: 14px; }
@media (min-width: 900px) { .biz-nav { display: flex; } .biz-print { display: inline-flex; } }

/* HERO */
.biz-hero { position: relative; min-height: 90vh; display: flex; align-items: center; background: var(--biz-ink); color: white; overflow: hidden; padding: 96px 0 64px; }
@media (min-width: 768px) { .biz-hero { min-height: 100vh; padding: 120px 0 80px; } }
.biz-hero__bg { position: absolute; inset: -10%; z-index: 0; background: radial-gradient(ellipse 60% 50% at 18% 30%, rgba(16,185,129,.35), transparent 60%), radial-gradient(ellipse 50% 50% at 82% 60%, rgba(139,92,246,.32), transparent 60%), radial-gradient(ellipse 70% 50% at 50% 100%, rgba(6,182,212,.25), transparent 60%), conic-gradient(from 220deg at 60% 40%, rgba(184,146,42,.12), transparent 30%); filter: blur(60px) saturate(120%); opacity: .85; }
.biz-hero__grain { position: absolute; inset: 0; z-index: 0; background: linear-gradient(180deg, transparent 0%, rgba(15,23,42,.4) 100%); pointer-events: none; }
.biz-hero__inner { position: relative; z-index: 1; max-width: 880px; }
.biz-hero .biz-eyebrow { color: rgba(255,255,255,.55); display: inline-flex; align-items: center; gap: 10px; }
.biz-hero .biz-eyebrow::before { content: ""; width: 24px; height: 1px; background: var(--biz-gold-soft); }
.biz-hero h1 { font-size: clamp(40px, 7.5vw, 76px); line-height: 1.02; font-weight: 600; margin: 22px 0 24px; letter-spacing: -0.035em; }
.biz-hero h1 em { font-style: normal; background: linear-gradient(110deg, var(--biz-emerald) 0%, var(--biz-cyan) 50%, var(--biz-violet-soft) 100%); -webkit-background-clip: text; background-clip: text; color: transparent; }
.biz-hero__sub { font-size: 18px; line-height: 1.55; color: rgba(255,255,255,.72); max-width: 580px; }
@media (min-width: 768px) { .biz-hero__sub { font-size: 19px; } }
.biz-hero__ctas { display: flex; flex-direction: column; gap: 12px; margin-top: 36px; }
@media (min-width: 600px) { .biz-hero__ctas { flex-direction: row; } }
.biz-hero__ghost { display: inline-flex; align-items: center; gap: 8px; margin-top: 18px; padding: 8px 4px; background: transparent; border: none; color: rgba(255,255,255,.7); font-family: var(--biz-body); font-size: 14px; font-weight: 500; cursor: pointer; transition: color .15s ease; border-bottom: 1px solid transparent; }
.biz-hero__ghost:hover { color: white; border-bottom-color: rgba(255,255,255,.4); }
.biz-hero__ghost svg { width: 16px; height: 16px; opacity: .8; }

.biz-btn { display: inline-flex; align-items: center; justify-content: center; gap: 10px; padding: 16px 22px; border-radius: var(--biz-radius-pill); font-size: 15px; font-weight: 600; letter-spacing: -0.005em; border: 1px solid transparent; transition: transform .18s ease, box-shadow .18s ease, background .18s ease, border-color .18s ease; white-space: nowrap; }
.biz-btn--primary { background: var(--biz-emerald); color: white; box-shadow: 0 6px 18px -4px rgba(16,185,129,.55), inset 0 -1px 0 rgba(0,0,0,.12); }
.biz-btn--primary:hover { transform: translateY(-1px); box-shadow: 0 10px 28px -6px rgba(16,185,129,.65); }
.biz-btn--primary:disabled { opacity: .6; cursor: not-allowed; transform: none; }
.biz-btn--ghost { background: transparent; color: white; border-color: rgba(255,255,255,.28); }
.biz-btn--ghost:hover { border-color: rgba(255,255,255,.6); background: rgba(255,255,255,.05); }
.biz-btn--lg { padding: 18px 28px; font-size: 16px; }
.biz-btn--block { width: 100%; }
.biz-btn svg { width: 14px; height: 14px; }

.biz-meta-strip { display: flex; gap: 24px; margin-top: 56px; padding-top: 28px; border-top: 1px solid rgba(255,255,255,.1); overflow-x: auto; scrollbar-width: none; }
.biz-meta-strip::-webkit-scrollbar { display: none; }
.biz-meta-strip__item { display: flex; flex-direction: column; gap: 4px; min-width: max-content; }
.biz-meta-strip__num { font-family: var(--biz-display); font-size: 22px; font-weight: 600; color: white; letter-spacing: -0.02em; }
.biz-meta-strip__label { font-size: 12px; color: rgba(255,255,255,.55); letter-spacing: 0.04em; }

/* Section scaffolding */
.biz-section { padding: 80px 0; position: relative; }
@media (min-width: 768px) { .biz-section { padding: 120px 0; } }
.biz-section--ink { background: var(--biz-ink); color: white; }
.biz-section--ink .biz-h2, .biz-section--ink .biz-eyebrow { color: white; }
.biz-section--ink .biz-eyebrow { color: rgba(255,255,255,.5); }
.biz-h2 { font-size: clamp(34px, 5.5vw, 52px); line-height: 1.05; letter-spacing: -0.03em; font-weight: 600; max-width: 760px; }
.biz-h3 { font-size: clamp(26px, 3.5vw, 36px); line-height: 1.1; letter-spacing: -0.025em; font-weight: 600; }
.biz-h4 { font-size: 18px; letter-spacing: -0.01em; font-weight: 600; }
.biz-section__lead { margin-top: 18px; font-size: 17px; line-height: 1.55; color: var(--biz-graphite); max-width: 600px; }
.biz-section--ink .biz-section__lead { color: rgba(255,255,255,.65); }

/* §2 STATS + PILIERS */
.biz-stats { display: grid; gap: 16px; grid-template-columns: 1fr; margin-top: 56px; }
@media (min-width: 768px) { .biz-stats { grid-template-columns: 1fr 1fr; gap: 20px; } }
.biz-stat { background: white; border-radius: var(--biz-radius); border: 1px solid var(--biz-fog); padding: 36px; display: flex; flex-direction: column; gap: 14px; box-shadow: var(--biz-shadow-sm); position: relative; overflow: hidden; transition: transform .22s ease, box-shadow .22s ease; }
.biz-stat:hover { transform: translateY(-2px); box-shadow: var(--biz-shadow-md); }
.biz-stat__num { font-family: var(--biz-display); font-size: clamp(56px, 9vw, 84px); line-height: 0.95; font-weight: 700; letter-spacing: -0.04em; color: var(--biz-ink); display: flex; align-items: baseline; gap: 6px; }
.biz-stat__num span { font-size: 0.5em; color: var(--biz-graphite-soft); font-weight: 500; }
.biz-stat__label { font-size: 17px; color: var(--biz-graphite); line-height: 1.45; }
.biz-stat__src { font-size: 12px; color: var(--biz-graphite-soft); margin-top: auto; }
.biz-stat--em { background: linear-gradient(160deg, #FFFFFF 0%, #F0FDF4 100%); }
.biz-stat--em .biz-stat__num { color: var(--biz-emerald-deep); }
.biz-stat--cy { background: linear-gradient(160deg, #FFFFFF 0%, #ECFEFF 100%); }
.biz-stat--cy .biz-stat__num { color: #0E7490; }

.biz-pillars { display: grid; gap: 14px; margin-top: 28px; grid-template-columns: 1fr; }
@media (min-width: 640px) { .biz-pillars { grid-template-columns: 1fr 1fr; } }
@media (min-width: 1024px) { .biz-pillars { grid-template-columns: repeat(4, 1fr); } }
.biz-pillar { background: white; border-radius: var(--biz-radius); border: 1px solid var(--biz-fog); padding: 24px; box-shadow: var(--biz-shadow-sm); transition: transform .22s ease, box-shadow .22s ease; display: flex; flex-direction: column; gap: 12px; }
.biz-pillar:hover { transform: translateY(-2px); box-shadow: var(--biz-shadow-md); }
.biz-pillar__icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; background: var(--biz-mist); border: 1px solid var(--biz-fog); }
.biz-pillar h4 { font-size: 16px; font-weight: 600; }
.biz-pillar p { font-size: 14px; color: var(--biz-graphite); line-height: 1.5; }

/* §3a WAYS */
.biz-ways { display: grid; gap: 16px; margin-top: 48px; grid-template-columns: 1fr; }
@media (min-width: 900px) { .biz-ways { grid-template-columns: repeat(3, 1fr); } }
.biz-way { background: white; border-radius: var(--biz-radius); border: 1px solid var(--biz-fog); padding: 32px; box-shadow: var(--biz-shadow-sm); display: flex; flex-direction: column; gap: 18px; transition: transform .22s ease, box-shadow .22s ease; position: relative; overflow: hidden; }
.biz-way:hover { transform: translateY(-3px); box-shadow: var(--biz-shadow-md); }
.biz-way__head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.biz-way__icon { width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; color: white; }
.biz-way__icon svg { width: 24px; height: 24px; stroke-width: 1.8; }
.biz-way__step { font-size: 12px; letter-spacing: 0.12em; color: var(--biz-graphite-soft); text-transform: uppercase; }
.biz-way__title { font-family: var(--biz-display); font-size: 24px; font-weight: 600; letter-spacing: -0.02em; }
.biz-way__figure { font-family: var(--biz-display); font-size: 30px; font-weight: 600; letter-spacing: -0.02em; line-height: 1; }
.biz-way__desc { font-size: 15px; color: var(--biz-graphite); line-height: 1.55; }
.biz-way--em .biz-way__icon { background: var(--biz-emerald); }
.biz-way--em .biz-way__figure { color: var(--biz-emerald-deep); }
.biz-way--cy .biz-way__icon { background: var(--biz-cyan); }
.biz-way--cy .biz-way__figure { color: #0E7490; }
.biz-way--vi .biz-way__icon { background: var(--biz-violet); }
.biz-way--vi .biz-way__figure { color: #6D28D9; }

/* §3b TIERS */
.biz-tiers { margin-top: 56px; display: flex; flex-direction: column; gap: 18px; }
.biz-tier { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 16px 22px; padding: 22px 0; border-bottom: 1px solid rgba(255,255,255,.08); }
.biz-tier:last-child { border-bottom: none; }
.biz-tier__rank { font-family: var(--biz-display); font-size: 14px; font-weight: 500; color: rgba(255,255,255,.45); letter-spacing: 0.06em; min-width: 28px; }
.biz-tier__name { font-family: var(--biz-display); font-size: 19px; font-weight: 600; color: white; letter-spacing: -0.01em; }
.biz-tier__bar { grid-column: 1 / -1; height: 6px; background: rgba(255,255,255,.08); border-radius: 999px; overflow: hidden; position: relative; }
.biz-tier__bar::after { content: ""; position: absolute; inset: 0; width: var(--w, 0%); background: linear-gradient(90deg, var(--biz-emerald) 0%, var(--biz-cyan) 100%); border-radius: 999px; transform-origin: left; transform: scaleX(0); transition: transform 1.1s cubic-bezier(.22,.61,.36,1); }
.biz-tier.is-visible .biz-tier__bar::after { transform: scaleX(1); }
.biz-tier__pct { font-family: var(--biz-display); font-size: 22px; font-weight: 600; color: white; letter-spacing: -0.02em; text-align: right; }
.biz-tier__desc { grid-column: 1 / -1; font-size: 13px; color: rgba(255,255,255,.55); line-height: 1.5; }
@media (min-width: 768px) { .biz-tier { grid-template-columns: 28px 220px 1fr auto; padding: 28px 0; } .biz-tier__bar { grid-column: 3 / 4; height: 8px; } .biz-tier__desc { grid-column: 2 / 5; margin-top: 4px; } }
.biz-tier--star { position: relative; }
.biz-tier--star .biz-tier__name { color: var(--biz-gold-soft); }
.biz-tier__star { grid-column: 1 / -1; display: inline-flex; align-items: center; gap: 8px; margin-top: 4px; padding: 6px 12px; border-radius: 999px; background: rgba(184,146,42,.14); border: 1px solid rgba(184,146,42,.35); color: var(--biz-gold-soft); font-family: var(--biz-display); font-size: 12px; font-weight: 500; letter-spacing: 0.02em; width: max-content; max-width: 100%; }
.biz-tier__star::before { content: "★"; font-size: 11px; }
@media (min-width: 768px) { .biz-tier--star .biz-tier__star { grid-column: 2 / 5; } }

/* §3c PACK */
.biz-pack { margin-top: 48px; background: white; border-radius: 24px; border: 1px solid var(--biz-fog); box-shadow: var(--biz-shadow-md); padding: 40px; display: grid; gap: 32px; grid-template-columns: 1fr; align-items: center; max-width: 880px; margin-left: auto; margin-right: auto; position: relative; overflow: hidden; }
.biz-pack::before { content: ""; position: absolute; top: -120px; right: -120px; width: 280px; height: 280px; border-radius: 50%; background: radial-gradient(circle, rgba(184,146,42,.18), transparent 70%); pointer-events: none; }
@media (min-width: 768px) { .biz-pack { grid-template-columns: 280px 1fr; padding: 56px; gap: 48px; } }
.biz-pack__price { position: relative; text-align: left; display: flex; flex-direction: column; gap: 8px; }
.biz-pack__amount { font-family: var(--biz-display); font-size: clamp(72px, 14vw, 112px); font-weight: 700; color: var(--biz-gold); letter-spacing: -0.05em; line-height: 0.9; display: flex; align-items: flex-start; gap: 4px; }
.biz-pack__amount span { font-size: 0.45em; font-weight: 600; margin-top: 0.25em; }
.biz-pack__price-label { font-size: 13px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--biz-graphite); }
.biz-pack__title { font-family: var(--biz-display); font-size: 24px; font-weight: 600; letter-spacing: -0.02em; margin-bottom: 18px; }
.biz-pack__list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; }
.biz-pack__list li { display: flex; align-items: flex-start; gap: 12px; font-size: 15px; color: var(--biz-ink-3); }
.biz-pack__check { flex-shrink: 0; width: 22px; height: 22px; border-radius: 50%; background: var(--biz-emerald); color: white; display: inline-flex; align-items: center; justify-content: center; margin-top: 2px; }
.biz-pack__check svg { width: 12px; height: 12px; }
.biz-pack__note { margin-top: 22px; font-size: 12px; color: var(--biz-graphite-soft); }

/* §3d SUPPORT */
.biz-support { display: grid; gap: 14px; margin-top: 40px; grid-template-columns: 1fr; }
@media (min-width: 640px) { .biz-support { grid-template-columns: 1fr 1fr; } }
@media (min-width: 1024px) { .biz-support { grid-template-columns: repeat(4, 1fr); } }
.biz-support__card { background: white; border: 1px solid var(--biz-fog); border-radius: var(--biz-radius); padding: 24px; box-shadow: var(--biz-shadow-sm); display: flex; flex-direction: column; gap: 12px; transition: transform .2s, box-shadow .2s; }
.biz-support__card:hover { transform: translateY(-2px); box-shadow: var(--biz-shadow-md); }
.biz-support__icon { font-size: 24px; line-height: 1; }
.biz-support__card h4 { font-size: 16px; font-weight: 600; }
.biz-support__card p { font-size: 14px; color: var(--biz-graphite); line-height: 1.5; }

/* §4 SIMULATEUR */
.biz-sim { margin-top: 48px; display: flex; flex-direction: column; gap: 18px; }
.biz-sim-step { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: var(--biz-radius); padding: 28px; backdrop-filter: blur(4px); }
.biz-sim-step__label { font-family: var(--biz-display); font-size: 13px; font-weight: 500; letter-spacing: 0.08em; color: rgba(255,255,255,.55); text-transform: uppercase; margin-bottom: 18px; }
.biz-sim-step__label b { color: var(--biz-emerald); font-weight: 600; margin-right: 8px; }
.biz-pills { display: flex; flex-wrap: wrap; gap: 10px; }
.biz-pill { display: inline-flex; align-items: center; gap: 8px; padding: 12px 20px; border-radius: var(--biz-radius-pill); background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.12); color: rgba(255,255,255,.85); font-family: var(--biz-display); font-weight: 500; font-size: 15px; letter-spacing: -0.01em; transition: all .18s ease; position: relative; }
.biz-pill:hover { border-color: rgba(255,255,255,.3); color: white; }
.biz-pill.is-active { background: var(--biz-emerald); color: white; border-color: var(--biz-emerald); box-shadow: 0 4px 14px -3px rgba(16,185,129,.6); }
.biz-pill__star { font-size: 11px; color: var(--biz-gold-soft); }
.biz-pill.is-active .biz-pill__star { color: rgba(255,255,255,.85); }
.biz-pill--custom { flex: 1 1 220px; padding: 0; background: transparent; border-color: transparent; }
.biz-pill--custom input { width: 100%; padding: 12px 20px; border-radius: var(--biz-radius-pill); background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.12); color: white; font-family: var(--biz-display); font-weight: 500; font-size: 15px; outline: none; transition: border-color .18s; }
.biz-pill--custom input::placeholder { color: rgba(255,255,255,.4); }
.biz-pill--custom input:focus { border-color: var(--biz-emerald); }
.biz-sim__compute { display: flex; justify-content: center; margin: 8px 0 4px; }
.biz-sim__compute .biz-btn--primary { min-width: 260px; padding: 18px 28px; font-size: 16px; }

/* Résultats */
.biz-result { display: none; flex-direction: column; gap: 18px; margin-top: 12px; opacity: 0; transform: translateY(12px); transition: opacity .55s ease, transform .55s ease; }
.biz-result.is-shown { display: flex; }
.biz-result.is-shown.is-revealed { opacity: 1; transform: translateY(0); }
.biz-result__cards { display: grid; gap: 14px; grid-template-columns: 1fr; }
@media (min-width: 768px) { .biz-result__cards { grid-template-columns: repeat(3, 1fr); } }
.biz-result-card { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: var(--biz-radius); padding: 24px; display: flex; flex-direction: column; gap: 12px; position: relative; overflow: hidden; }
.biz-result-card::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: var(--c, var(--biz-emerald)); }
.biz-result-card__icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: color-mix(in oklab, var(--c, var(--biz-emerald)) 18%, transparent); color: var(--c, var(--biz-emerald)); }
.biz-result-card__icon svg { width: 20px; height: 20px; stroke-width: 1.8; }
.biz-result-card__num { font-family: var(--biz-display); font-size: clamp(40px, 6vw, 56px); font-weight: 700; color: white; letter-spacing: -0.035em; line-height: 1; }
.biz-result-card__label { font-size: 13px; color: rgba(255,255,255,.6); line-height: 1.4; }

.biz-result-summary { background: linear-gradient(135deg, rgba(16,185,129,.12), rgba(6,182,212,.08)); border: 1px solid rgba(16,185,129,.2); border-radius: var(--biz-radius); padding: 22px 24px; display: grid; gap: 14px; grid-template-columns: 1fr; }
@media (min-width: 768px) { .biz-result-summary { grid-template-columns: repeat(3, 1fr); } }
.biz-result-summary__item { display: flex; flex-direction: column; gap: 4px; }
.biz-result-summary__k { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255,255,255,.5); }
.biz-result-summary__v { font-family: var(--biz-display); font-size: 17px; font-weight: 600; color: white; letter-spacing: -0.01em; }

/* Progression track */
.biz-tier-track { border: 1px solid rgba(255,255,255,.08); border-radius: var(--biz-radius); padding: 28px 24px 32px; background: rgba(255,255,255,.02); }
.biz-tier-track__head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 28px; flex-wrap: wrap; }
.biz-tier-track__head h4 { font-family: var(--biz-display); font-size: 14px; font-weight: 500; color: rgba(255,255,255,.55); letter-spacing: 0.08em; text-transform: uppercase; }
.biz-tier-track__head em { font-style: normal; color: rgba(255,255,255,.55); font-family: var(--biz-display); font-size: 13px; }
.biz-tier-track__head em b { font-weight: 600; color: white; }
.biz-track__lane { position: relative; height: 14px; background: rgba(255,255,255,.06); border-radius: 999px; margin: 56px 8px 70px; }
.biz-track__fill { position: absolute; inset: 0; width: 0; background: linear-gradient(90deg, #6B6F2C 0%, var(--biz-emerald) 60%, var(--biz-cyan) 100%); border-radius: 999px; transition: width .9s cubic-bezier(.22,.61,.36,1); }
.biz-track__milestone { position: absolute; top: 50%; transform: translate(-50%, -50%); width: 22px; height: 22px; border-radius: 50%; background: var(--biz-ink); border: 2px solid rgba(255,255,255,.3); display: flex; align-items: center; justify-content: center; font-size: 13px; z-index: 2; transition: border-color .3s, transform .3s, box-shadow .3s; }
.biz-track__milestone[data-tier="sc"] { left: 17.5%; }
.biz-track__milestone[data-tier="sb"] { left: 42%; }
.biz-track__milestone[data-tier="sup"] { left: 100%; }
.biz-track__milestone.is-target { border-color: var(--biz-gold); transform: translate(-50%, -50%) scale(1.25); box-shadow: 0 0 0 6px rgba(184,146,42,.18); }
.biz-track__milestone-label { position: absolute; top: -44px; left: 50%; transform: translateX(-50%); white-space: nowrap; text-align: center; font-family: var(--biz-display); font-size: 12px; font-weight: 500; color: rgba(255,255,255,.7); line-height: 1.3; }
.biz-track__milestone-label b { display: block; color: white; font-weight: 600; font-size: 13px; margin-bottom: 2px; }
.biz-track__milestone.is-target .biz-track__milestone-label b { color: var(--biz-gold-soft); }
.biz-track__milestone-amt { position: absolute; bottom: -38px; left: 50%; transform: translateX(-50%); white-space: nowrap; font-family: var(--biz-display); font-size: 12px; color: rgba(255,255,255,.5); }
.biz-track__marker { position: absolute; top: 50%; width: 4px; height: 44px; background: var(--biz-emerald); border-radius: 2px; transform: translate(-50%, -50%); z-index: 3; transition: left .55s cubic-bezier(.22,.61,.36,1); box-shadow: 0 0 14px rgba(16,185,129,.6); }
.biz-track__marker::after { content: "Tu es ici"; position: absolute; top: -34px; left: 50%; transform: translateX(-50%); background: var(--biz-emerald); color: white; padding: 4px 10px; border-radius: 999px; font-family: var(--biz-display); font-size: 11px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; white-space: nowrap; box-shadow: 0 4px 12px rgba(16,185,129,.4); }
.biz-track__marker::before { content: ""; position: absolute; top: -10px; left: 50%; transform: translateX(-50%); border: 5px solid transparent; border-top-color: var(--biz-emerald); }
@media (max-width: 640px) { .biz-track__lane { margin: 48px 14px 62px; } .biz-track__milestone-label { font-size: 11px; top: -38px; } .biz-track__milestone-label b { font-size: 12px; } .biz-track__milestone-amt { font-size: 11px; bottom: -32px; } }

.biz-bonus { background: linear-gradient(135deg, rgba(139,92,246,.18), rgba(139,92,246,.04)); border: 1px solid rgba(139,92,246,.35); border-radius: var(--biz-radius); padding: 22px 24px; display: grid; grid-template-columns: auto 1fr; gap: 18px; align-items: center; }
.biz-bonus__icon { width: 48px; height: 48px; border-radius: 12px; background: var(--biz-violet); color: white; display: flex; align-items: center; justify-content: center; }
.biz-bonus__icon svg { width: 24px; height: 24px; }
.biz-bonus__title { font-family: var(--biz-display); font-size: 17px; font-weight: 600; color: white; letter-spacing: -0.01em; margin-bottom: 4px; }
.biz-bonus__title b { color: var(--biz-violet-soft); }
.biz-bonus__desc { font-size: 14px; color: rgba(255,255,255,.65); line-height: 1.5; }
.biz-footnote { font-size: 12px; font-style: italic; color: rgba(255,255,255,.45); line-height: 1.6; max-width: 720px; }
.biz-result__cta { display: flex; justify-content: center; margin-top: 8px; }

/* §5 STORIES */
.biz-stories { display: grid; gap: 18px; margin-top: 48px; grid-template-columns: 1fr; }
@media (min-width: 900px) { .biz-stories { grid-template-columns: 1fr 1fr; } }
.biz-story { background: white; border: 1px solid var(--biz-fog); border-radius: var(--biz-radius); padding: 32px; box-shadow: var(--biz-shadow-sm); display: flex; flex-direction: column; gap: 18px; transition: transform .22s, box-shadow .22s; }
.biz-story:hover { transform: translateY(-2px); box-shadow: var(--biz-shadow-md); }
.biz-story__head { display: flex; align-items: center; gap: 16px; }
.biz-story__photo { width: 64px; height: 64px; border-radius: 50%; background: repeating-linear-gradient(45deg, #E2E8F0 0 6px, #EEF1F6 6px 12px); border: 1px solid var(--biz-fog); flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: var(--biz-graphite-soft); font-family: var(--biz-body); font-size: 11px; }
.biz-story__name { font-family: var(--biz-display); font-size: 17px; font-weight: 600; letter-spacing: -0.01em; }
.biz-story__since { font-size: 13px; color: var(--biz-graphite-soft); margin-top: 2px; }
.biz-story__hook { font-family: var(--biz-display); font-size: 22px; font-weight: 600; letter-spacing: -0.02em; line-height: 1.2; }
.biz-story__body { font-size: 15px; color: var(--biz-graphite); line-height: 1.6; }
/* §5 — Bloc fondateurs riche (chapitres) */
.biz-story--founders { padding: 36px; gap: 12px; }
.biz-story__chapters { display: flex; flex-direction: column; gap: 14px; }
.biz-story__chapter-title { font-family: var(--biz-display); font-size: 18px; font-weight: 700; letter-spacing: -0.01em; color: var(--biz-ink); margin: 14px 0 4px 0; }
.biz-story__chapter-title:first-child { margin-top: 0; }
.biz-story__chapter-p { font-size: 15px; color: var(--biz-graphite); line-height: 1.65; margin: 0; }
.biz-story__chapter-list { margin: 0; padding-left: 22px; display: flex; flex-direction: column; gap: 8px; }
.biz-story__chapter-list li { font-size: 15px; color: var(--biz-graphite); line-height: 1.55; }
.biz-stories__signature { margin: 40px auto 0; text-align: center; max-width: 640px; }
.biz-stories__signature span { font-family: var(--biz-italic); font-style: italic; font-weight: 500; color: var(--biz-gold); font-size: clamp(22px, 3vw, 28px); letter-spacing: -0.005em; }
.biz-stories__signature::before, .biz-stories__signature::after { content: ""; display: block; width: 40px; height: 1px; background: var(--biz-gold-soft); margin: 18px auto; }

/* §5b FAQ */
.biz-faq { margin-top: 48px; display: flex; flex-direction: column; gap: 4px; max-width: 820px; }
.biz-faq__item { border-bottom: 1px solid var(--biz-fog); }
.biz-faq__item:first-child { border-top: 1px solid var(--biz-fog); }
.biz-faq__q { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 22px 4px; background: transparent; border: none; text-align: left; font-family: var(--biz-display); font-size: 17px; font-weight: 500; color: var(--biz-ink); letter-spacing: -0.01em; cursor: pointer; transition: color .18s; }
.biz-faq__q:hover { color: var(--biz-emerald-deep); }
.biz-faq__chevron { width: 22px; height: 22px; flex-shrink: 0; color: var(--biz-graphite-soft); transition: transform .25s ease; }
.biz-faq__item.is-open .biz-faq__chevron { transform: rotate(180deg); color: var(--biz-emerald); }
.biz-faq__a { max-height: 0; overflow: hidden; transition: max-height .35s ease; }
.biz-faq__a-inner { padding: 0 4px 22px; font-size: 15px; color: var(--biz-graphite); line-height: 1.65; max-width: 700px; }

/* §6 CTA */
.biz-cta { padding: 80px 0 96px; }
@media (min-width: 768px) { .biz-cta { padding: 120px 0 140px; } }
.biz-cta__inner { max-width: 640px; margin: 0 auto; text-align: center; }
.biz-cta__title { font-family: var(--biz-display); font-size: clamp(34px, 5vw, 44px); letter-spacing: -0.03em; font-weight: 600; color: white; }
.biz-cta__sub { margin-top: 12px; color: rgba(255,255,255,.6); font-size: 17px; }
.biz-form { margin: 40px auto 0; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: 20px; padding: 28px; text-align: left; display: grid; gap: 14px; backdrop-filter: blur(6px); }
@media (min-width: 640px) { .biz-form { padding: 36px; } }
.biz-field { display: flex; flex-direction: column; gap: 6px; }
.biz-field label { font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255,255,255,.55); }
.biz-field input { background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.12); border-radius: 12px; padding: 14px 16px; color: white; font-size: 15px; outline: none; transition: border-color .18s, background .18s; }
.biz-field input::placeholder { color: rgba(255,255,255,.35); }
.biz-field input:focus { border-color: var(--biz-emerald); background: rgba(255,255,255,.08); }
.biz-field input.has-error { border-color: #F87171; }
.biz-form__submit { margin-top: 6px; }
.biz-form__legal { font-size: 11px; line-height: 1.6; color: rgba(255,255,255,.4); text-align: center; margin-top: 10px; }
.biz-form__error { font-size: 13px; color: #FCA5A5; text-align: center; margin-top: 8px; }
.biz-form-success { display: none; flex-direction: column; align-items: center; gap: 14px; padding: 56px 28px; text-align: center; }
.biz-form-success.is-shown { display: flex; }
.biz-form-success__check { width: 64px; height: 64px; border-radius: 50%; background: var(--biz-emerald); color: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 32px -8px rgba(16,185,129,.6); }
.biz-form-success__check svg { width: 28px; height: 28px; }
.biz-form-success h4 { font-family: var(--biz-display); font-size: 22px; color: white; font-weight: 600; }
.biz-form-success p { color: rgba(255,255,255,.6); font-size: 15px; }
.biz-form.is-sent .biz-form__content { display: none; }
.biz-form.is-sent .biz-form-success { display: flex; }

/* Footer */
.biz-footer { background: #08111F; color: rgba(255,255,255,.55); padding: 36px 0 44px; font-size: 13px; border-top: 1px solid rgba(255,255,255,.05); }
.biz-footer__inner { display: flex; flex-direction: column; gap: 18px; align-items: flex-start; }
@media (min-width: 768px) { .biz-footer__inner { flex-direction: row; justify-content: space-between; align-items: center; } }
.biz-footer__brand { display: flex; align-items: center; gap: 10px; color: white; font-family: var(--biz-display); font-weight: 600; }
.biz-footer__links { display: flex; gap: 24px; flex-wrap: wrap; }
.biz-footer__links a:hover { color: white; }

/* Reveal */
.biz-reveal { opacity: 0; transform: translateY(20px); transition: opacity .7s ease, transform .7s ease; }
.biz-reveal.is-visible { opacity: 1; transform: translateY(0); }

/* Skip link */
.biz-skip { position: absolute; top: -100px; left: 12px; z-index: 200; padding: 10px 16px; background: var(--biz-ink); color: white; border-radius: 8px; font-size: 14px; font-weight: 500; transition: top .15s ease; }
.biz-skip:focus { top: 12px; outline: 2px solid var(--biz-emerald); outline-offset: 2px; }

/* Sticky bottom CTA */
.biz-sticky-cta { position: fixed; left: 12px; right: 12px; bottom: 14px; z-index: 40; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 14px 18px; background: var(--biz-ink); color: white; border-radius: 999px; font-family: var(--biz-display); font-weight: 600; font-size: 15px; letter-spacing: -0.01em; box-shadow: 0 12px 32px -6px rgba(15,23,42,.4), 0 4px 14px rgba(15,23,42,.2); border: 1px solid rgba(255,255,255,.08); transform: translateY(140%); transition: transform .3s ease; opacity: 0; }
.biz-sticky-cta.is-shown { transform: translateY(0); opacity: 1; }
.biz-sticky-cta::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: var(--biz-emerald); box-shadow: 0 0 0 4px rgba(16,185,129,.25); }
.biz-sticky-cta svg { width: 14px; height: 14px; }
@media (min-width: 900px) { .biz-sticky-cta { display: none !important; } }

/* Popup lead capture */
.biz-popup { position: fixed; inset: 0; z-index: 100; display: none; align-items: flex-start; justify-content: center; padding: 24px 16px; overflow-y: auto; }
.biz-popup.is-open { display: flex; }
.biz-popup__backdrop { position: absolute; inset: 0; background: rgba(15,23,42,.7); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); opacity: 0; transition: opacity .25s ease; }
.biz-popup.is-open .biz-popup__backdrop { opacity: 1; }
.biz-popup__card { position: relative; width: 100%; max-width: 460px; margin: auto; background: var(--biz-mist); border-radius: 20px; padding: 36px 28px 28px; box-shadow: 0 30px 80px -20px rgba(0,0,0,.5); transform: scale(.96); opacity: 0; transition: transform .32s cubic-bezier(.16,1,.3,1), opacity .32s ease; }
.biz-popup.is-open .biz-popup__card { transform: scale(1); opacity: 1; }
.biz-popup__close { position: absolute; top: 14px; right: 14px; width: 36px; height: 36px; border-radius: 50%; background: transparent; border: 1px solid var(--biz-fog); color: var(--biz-graphite); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background .15s, color .15s, border-color .15s; }
.biz-popup__close:hover { background: var(--biz-ink); color: white; border-color: var(--biz-ink); }
.biz-popup__close svg { width: 16px; height: 16px; }
.biz-popup__title { font-family: var(--biz-display); font-size: 24px; font-weight: 600; letter-spacing: -0.02em; color: var(--biz-ink); margin-bottom: 8px; padding-right: 32px; }
.biz-popup__sub { font-size: 14px; color: var(--biz-graphite); line-height: 1.55; margin-bottom: 22px; }
.biz-popup__form { display: flex; flex-direction: column; gap: 14px; }
.biz-popup__field { display: flex; flex-direction: column; gap: 6px; }
.biz-popup__field label { font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--biz-graphite); font-weight: 500; }
.biz-popup__field input { padding: 12px 14px; border-radius: 12px; border: 1px solid var(--biz-fog); background: white; font-size: 15px; color: var(--biz-ink); outline: none; transition: border-color .15s, box-shadow .15s; }
.biz-popup__field input:focus { border-color: var(--biz-emerald); box-shadow: 0 0 0 3px rgba(16,185,129,.15); }
.biz-popup__field input.has-error { border-color: #EF4444; }
.biz-popup__field-hint { font-size: 12px; color: var(--biz-graphite-soft); }
.biz-popup__consent { display: flex; align-items: flex-start; gap: 10px; font-size: 13px; color: var(--biz-graphite); line-height: 1.5; cursor: pointer; user-select: none; }
.biz-popup__consent.has-error { color: #EF4444; }
.biz-popup__consent input { width: 18px; height: 18px; margin-top: 1px; accent-color: var(--biz-emerald); flex-shrink: 0; }
.biz-popup__submit { margin-top: 4px; width: 100%; }
.biz-popup__legal { font-size: 11px; color: var(--biz-graphite-soft); text-align: center; margin-top: 4px; }
.biz-popup__error { font-size: 13px; color: #EF4444; text-align: center; }
.biz-popup__success { display: none; flex-direction: column; align-items: center; gap: 14px; padding: 28px 0 8px; text-align: center; }
.biz-popup__success.is-shown { display: flex; }
.biz-popup__success-check { width: 56px; height: 56px; border-radius: 50%; background: var(--biz-emerald); color: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 22px -6px rgba(16,185,129,.55); }
.biz-popup__success-check svg { width: 26px; height: 26px; }
.biz-popup__success h4 { font-family: var(--biz-display); font-size: 20px; color: var(--biz-ink); }
.biz-popup__success p { font-size: 14px; color: var(--biz-graphite); }
.biz-popup.is-sent .biz-popup__form { display: none; }
.biz-popup.is-sent .biz-popup__success { display: flex; }
.biz-popup.is-sent .biz-popup__title, .biz-popup.is-sent .biz-popup__sub { display: none; }
body.biz-no-scroll { overflow: hidden; }

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .biz-page *, .biz-page *::before, .biz-page *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; }
  .biz-page .biz-reveal { opacity: 1 !important; transform: none !important; }
  .biz-tier__bar::after { transform: scaleX(1) !important; }
  .biz-result { opacity: 1 !important; transform: none !important; }
}

/* PRINT */
@media print {
  @page { size: A4; margin: 14mm; }
  body { background: white; }
  .biz-page { font-size: 11pt; }
  .biz-header, .biz-hero__bg, .biz-hero__grain, .biz-cta, .biz-form, .biz-print, .biz-hero__ctas, .biz-result__cta, .biz-sim__compute, .biz-sticky-cta, .biz-popup, .biz-skip { display: none !important; }
  .biz-hero { min-height: auto; background: white; color: var(--biz-ink); padding: 0 0 16pt; page-break-after: avoid; }
  .biz-hero h1, .biz-hero .biz-eyebrow, .biz-hero__sub, .biz-meta-strip__num { color: var(--biz-ink) !important; }
  .biz-hero h1 em { -webkit-text-fill-color: var(--biz-emerald-deep); color: var(--biz-emerald-deep); background: none; }
  .biz-meta-strip { border-color: var(--biz-fog); }
  .biz-meta-strip__label { color: var(--biz-graphite); }
  .biz-section { padding: 14pt 0; page-break-inside: avoid; }
  .biz-section--ink { background: white; color: var(--biz-ink); }
  .biz-section--ink * { color: var(--biz-ink) !important; }
  .biz-tier__bar { background: var(--biz-fog); }
  .biz-tier__bar::after { transform: scaleX(1) !important; }
  .biz-tier__star { background: rgba(184,146,42,.12) !important; border-color: rgba(184,146,42,.4) !important; color: var(--biz-gold) !important; }
  .biz-reveal { opacity: 1 !important; transform: none !important; }
  .biz-result { display: none !important; }
  .biz-faq__a { max-height: none !important; }
  .biz-faq__a-inner { padding-bottom: 12pt; color: var(--biz-graphite); }
  .biz-pack, .biz-stat, .biz-pillar, .biz-way, .biz-support__card, .biz-story { box-shadow: none; }
  .biz-cta::after { content: "Pour démarrer ton activité, contacte ton partenaire La Base 360 ou écris-nous à hello@labase360.com."; display: block; font-style: italic; color: var(--biz-graphite); padding: 16pt; text-align: center; }
  .biz-story, .biz-faq__item, .biz-pack, .biz-stat { page-break-inside: avoid; }
  a { color: var(--biz-ink); }
  a[href^="http"]::after { content: " (" attr(href) ")"; font-size: 9pt; color: #666; }
  a[href^="#"]::after { content: ""; }
}
`;
