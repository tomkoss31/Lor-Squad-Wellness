// =============================================================================
// Styles Formation V2 — moteur + chemin (2026-08-04).
// Tokens `--ls-*` uniquement (règle CLAUDE.md : jamais de couleur en dur dans
// l'app coach, le thème clair/sombre doit suivre). Le violet n'a pas de token
// officiel → variable de secours locale.
// =============================================================================

export const FORMATION_V2_STYLES = `
.fv-wrap { --fv-violet: var(--ls-violet, #a78bfa); }

/* ── écran plein (le player) ── */
.fv-screen { position:fixed; inset:0; z-index:9999; background:var(--ls-bg); color:var(--ls-text);
  display:flex; flex-direction:column; --fv-violet: var(--ls-violet, #a78bfa);
  animation:fv-in .2s ease; }
@keyframes fv-in { from { opacity:0; transform:translateY(6px);} to { opacity:1; transform:none; } }
@media (prefers-reduced-motion: reduce) { .fv-screen { animation:none; } }

.fv-lhead { display:flex; align-items:center; gap:12px; padding:calc(12px + env(safe-area-inset-top)) 14px 6px; }
.fv-lclose { width:32px; height:32px; border:0; background:none; color:var(--ls-text-muted); font-size:20px; cursor:pointer; }
.fv-ltrack { flex:1; height:9px; border-radius:999px; background:var(--ls-surface2); overflow:hidden; }
.fv-ltrack i { display:block; height:100%; background:var(--ls-lime); border-radius:999px; transition:width .3s ease; }

/* min-height:0 OBLIGATOIRE : sans lui, un enfant flex garde min-height:auto,
   refuse de rétrécir sous son contenu → overflow-y:auto ne défile JAMAIS et le
   bas d'une leçon longue part hors écran (bug remonté par Thomas 2026-08-04). */
.fv-lbody { flex:1; min-height:0; overflow-y:auto; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; padding:12px 18px 8px; }
.fv-kicker { font-family:'JetBrains Mono',ui-monospace,monospace; font-size:10px; letter-spacing:.12em; text-transform:uppercase; color:var(--ls-teal); margin-bottom:8px; }
.fv-lh1 { font-size:23px; font-weight:800; letter-spacing:-.3px; line-height:1.15; margin:0 0 14px; color:var(--ls-text); }

.fv-force { border-radius:16px; padding:15px 16px; margin-bottom:14px;
  background:color-mix(in srgb, var(--ls-teal) 10%, transparent);
  border:1px solid color-mix(in srgb, var(--ls-teal) 32%, transparent); }
.fv-accent-lime { background:color-mix(in srgb, var(--ls-lime) 9%, transparent); border-color:color-mix(in srgb, var(--ls-lime) 30%, transparent); }
.fv-accent-coral { background:color-mix(in srgb, var(--ls-coral) 9%, transparent); border-color:color-mix(in srgb, var(--ls-coral) 32%, transparent); }
.fv-accent-violet { background:color-mix(in srgb, var(--fv-violet) 10%, transparent); border-color:color-mix(in srgb, var(--fv-violet) 32%, transparent); }
.fv-force-l { font-family:'JetBrains Mono',ui-monospace,monospace; font-size:9.5px; letter-spacing:.1em; text-transform:uppercase; color:var(--ls-teal); margin-bottom:6px; }
.fv-accent-lime .fv-force-l { color:var(--ls-lime); }
.fv-accent-coral .fv-force-l { color:var(--ls-coral); }
.fv-force-t { font-size:17px; font-weight:800; line-height:1.35; color:var(--ls-text); }

/* Corps de leçon : lisibilité d'abord. --ls-text-muted seul était trop pâle
   pour un paragraphe entier sur mobile (retour Thomas 2026-08-04) → ~87 % du
   texte plein, le gras reste à 100 % pour garder le contraste d'emphase. */
.fv-text { font-size:15px; line-height:1.62; color:color-mix(in srgb, var(--ls-text) 87%, transparent); margin:0 0 12px; }
.fv-text b { color:var(--ls-text); font-weight:700; }
.fv-bullet { display:flex; gap:9px; font-size:14.5px; line-height:1.55; color:color-mix(in srgb, var(--ls-text) 87%, transparent); margin:0 0 8px; }
.fv-bullet b { color:var(--ls-text); font-weight:700; }
.fv-bullet-dot { color:var(--ls-teal); font-weight:800; }
.fv-example { background:var(--ls-surface); border-left:3px solid var(--ls-lime); border-radius:0 12px 12px 0; padding:11px 14px; font-size:13.5px; line-height:1.55; color:var(--ls-text); margin-bottom:12px; }
.fv-example-l { font-size:10px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; color:var(--ls-lime); margin-bottom:4px; }

/* ── check ── */
.fv-qtitle { font-size:19px; font-weight:800; margin:2px 0 16px; line-height:1.25; color:var(--ls-text); }
.fv-opt { display:block; width:100%; text-align:left; background:var(--ls-surface); border:2px solid var(--ls-border); border-radius:14px; padding:14px 15px; font-size:14.5px; color:var(--ls-text); cursor:pointer; margin-bottom:10px; transition:.12s; min-height:52px; }
.fv-opt:hover:not(:disabled) { border-color:var(--ls-border2); }
.fv-opt:disabled { cursor:default; }
.fv-opt-good { border-color:var(--ls-teal); background:color-mix(in srgb, var(--ls-teal) 12%, transparent); }
.fv-opt-bad { border-color:var(--ls-coral); background:color-mix(in srgb, var(--ls-coral) 12%, transparent); }

/* ── footer feedback / cta ── */
.fv-foot { padding:14px 16px calc(16px + env(safe-area-inset-bottom)); border-top:1px solid var(--ls-border); }
.fv-foot-good { background:color-mix(in srgb, var(--ls-teal) 12%, transparent); border-top-color:transparent; }
.fv-foot-bad { background:color-mix(in srgb, var(--ls-coral) 12%, transparent); border-top-color:transparent; }
.fv-fbtitle { font-family:'Anton',Impact,sans-serif; font-size:18px; letter-spacing:.3px; margin-bottom:3px; color:var(--ls-teal); }
.fv-foot-bad .fv-fbtitle { color:var(--ls-coral); }
.fv-fbdesc { font-size:12.5px; color:var(--ls-text-muted); line-height:1.5; margin-bottom:11px; }
.fv-cta { display:block; width:100%; text-align:center; border:0; border-radius:14px; padding:15px; font-size:15px; font-weight:800; cursor:pointer; }
.fv-cta-lime { background:var(--ls-lime); color:#141a05; }
.fv-cta-teal { background:var(--ls-teal); color:var(--ls-teal-contrast); }
.fv-cta-ghost { background:var(--ls-surface); color:var(--ls-text); border:1px solid var(--ls-border2); }

/* ── récompense ── */
.fv-reward { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:30px 24px; gap:6px; }
.fv-rbig { font-family:'Anton',Impact,sans-serif; font-size:30px; letter-spacing:.5px; color:var(--ls-text); }
.fv-rrow { display:flex; gap:10px; margin:14px 0 20px; }
.fv-rstat { background:var(--ls-surface); border:1px solid var(--ls-border); border-radius:14px; padding:12px 16px; min-width:92px; }
.fv-rv { font-family:'Anton',Impact,sans-serif; font-size:24px; }
.fv-rl { font-size:9.5px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; color:var(--ls-text-muted); margin-top:2px; }
.fv-note { font-size:11px; color:var(--ls-text-hint); margin-top:4px; }

/* ── le chemin (hub) ── */
.fv-top { display:flex; align-items:center; gap:10px; margin-bottom:14px; }
.fv-top-sp { margin-left:auto; display:flex; gap:12px; align-items:center; font-weight:800; font-size:13.5px; }
.fv-streak { color:var(--ls-lime); } .fv-xp { color:var(--ls-teal); }
.fv-chapter { margin:14px 0 4px; }
.fv-cn { font-family:'JetBrains Mono',ui-monospace,monospace; font-size:9.5px; letter-spacing:.14em; text-transform:uppercase; color:var(--ls-text-muted); }
.fv-ct { font-family:'Anton',Impact,sans-serif; font-size:19px; letter-spacing:.4px; margin-top:2px; color:var(--ls-text); }
.fv-cbar { height:5px; border-radius:999px; background:var(--ls-surface2); margin-top:7px; overflow:hidden; }
.fv-cbar i { display:block; height:100%; background:var(--ls-teal); border-radius:999px; transition:width .4s ease; }
.fv-path { display:flex; flex-direction:column; align-items:center; gap:3px; margin:8px 0 4px; }
.fv-node { display:flex; flex-direction:column; align-items:center; gap:3px; }
.fv-dot { width:62px; height:62px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:24px; cursor:pointer; border:0; transition:transform .12s; }
.fv-dot:active { transform:scale(.94); }
.fv-dot-done { background:var(--ls-teal); color:var(--ls-teal-contrast); box-shadow:0 4px 0 color-mix(in srgb, var(--ls-teal) 55%, #000); }
.fv-dot-active { background:var(--ls-lime); color:#141a05; box-shadow:0 4px 0 color-mix(in srgb, var(--ls-lime) 55%, #000), 0 0 0 5px color-mix(in srgb, var(--ls-lime) 22%, transparent); animation:fv-bob 1.6s ease-in-out infinite; }
@keyframes fv-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
@media (prefers-reduced-motion: reduce) { .fv-dot-active { animation:none; } }
.fv-dot-lock { background:var(--ls-surface2); color:var(--ls-text-hint); cursor:default; box-shadow:0 4px 0 rgba(0,0,0,.3); }
.fv-nl { font-size:11px; color:var(--ls-text-muted); max-width:150px; text-align:center; line-height:1.3; }
.fv-node-active .fv-nl { color:var(--ls-text); font-weight:700; }
.fv-link { width:3px; height:16px; background:var(--ls-border2); border-radius:2px; }
.fv-startchip { font-size:10px; font-weight:800; letter-spacing:.05em; color:#141a05; background:var(--ls-lime); padding:3px 10px; border-radius:999px; margin-bottom:2px; }

/* Bandeau « parcours terminé » en tête du chemin, une fois tout ✓. */
.fv-donebar { display:flex; align-items:center; justify-content:center; gap:8px; width:100%; margin:6px 0 12px; border:0; border-radius:14px; padding:13px 16px; font-weight:800; font-size:14px; cursor:pointer; color:#141a05;
  background:linear-gradient(90deg, var(--ls-lime), color-mix(in srgb, var(--ls-teal) 65%, var(--ls-lime)));
  box-shadow:0 4px 14px color-mix(in srgb, var(--ls-lime) 30%, transparent); }
.fv-donebar:active { transform:scale(.99); }

/* ── écran de fin de parcours (le pont vers le cockpit) ── */
.fv-done-glow { position:absolute; inset:0; pointer-events:none; z-index:0;
  background:radial-gradient(60% 40% at 50% 20%, color-mix(in srgb, var(--ls-lime) 15%, transparent), transparent 70%),
             radial-gradient(70% 45% at 50% 58%, color-mix(in srgb, var(--ls-teal) 11%, transparent), transparent 72%); }
.fv-done { text-align:center; position:relative; z-index:1; }
.fv-done-medal { font-size:56px; margin:10px 0 2px; filter:drop-shadow(0 8px 22px color-mix(in srgb, var(--ls-lime) 35%, transparent)); }
.fv-done-h1 { font-family:'Anton',Impact,sans-serif; font-size:32px; letter-spacing:.5px; line-height:1.03; margin:6px 0 6px; color:var(--ls-text); }
.fv-done-sub { font-size:15px; line-height:1.5; color:color-mix(in srgb, var(--ls-text) 88%, transparent); max-width:300px; margin:0 auto; }
.fv-done-stats { display:flex; gap:10px; justify-content:center; margin:20px 0 4px; }
.fv-done-recap { text-align:left; background:var(--ls-surface); border:1px solid var(--ls-border); border-radius:18px; padding:16px 16px 6px; margin:22px 0 4px; }
.fv-done-recap h2 { font-family:'JetBrains Mono',ui-monospace,monospace; font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:var(--ls-text-muted); margin:0 0 12px; }
.fv-drow { display:flex; align-items:center; gap:11px; margin-bottom:12px; }
.fv-dcheck { flex:none; width:26px; height:26px; border-radius:50%; background:var(--ls-teal); color:var(--ls-teal-contrast); display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:800; }
.fv-dtxt { font-size:14.5px; font-weight:600; color:var(--ls-text); }
.fv-bridge { text-align:left; margin:22px 0 6px; border-radius:20px; padding:19px 18px; position:relative; overflow:hidden;
  background:linear-gradient(150deg, color-mix(in srgb, var(--ls-lime) 14%, var(--ls-surface)), color-mix(in srgb, var(--ls-teal) 10%, var(--ls-surface)));
  border:1px solid color-mix(in srgb, var(--ls-lime) 34%, transparent); }
.fv-bridge-t { font-family:'JetBrains Mono',ui-monospace,monospace; font-size:10px; letter-spacing:.12em; text-transform:uppercase; color:var(--ls-lime); margin-bottom:7px; }
.fv-bridge-h { font-family:'Anton',Impact,sans-serif; font-size:22px; letter-spacing:.4px; margin:0 0 7px; color:var(--ls-text); }
.fv-bridge-p { font-size:14px; line-height:1.5; color:color-mix(in srgb, var(--ls-text) 90%, transparent); margin:0 0 15px; }
.fv-done-ghost { display:block; width:100%; text-align:center; background:none; border:0; color:var(--ls-text-muted); font-size:13.5px; font-weight:700; padding:16px 0 6px; cursor:pointer; }
`;
