// =============================================================================
// DecouvrirPage — Page découverte publique La Base 360 (chantier 2026-07-31).
//
// Porte d'entrée « douce » ouverte depuis la 3e carte de WelcomePage
// (« Découvrir le club »). Remplace l'envoi direct vers /rejoindre, qui
// verrouillait le contenu derrière un questionnaire avant d'avoir rien
// expliqué — d'où zéro conversion.
//
// Maquette validée par Thomas le 2026-07-31 (« aller comme ça »).
// Reprend À L'IDENTIQUE l'identité de WelcomePage : fond #0a0c0a, dégradé
// signature lime #c5f82a → teal #2DD4BF → violet #A78BFA, Anton (titres) +
// DM Sans (corps) + JetBrains Mono (labels), orbe logo, blobs mesh, grain.
//
// Deux chemins en climax :
//   - Bilan offert       → /bilan-online/thomas   (entrée douce, sans engagement)
//   - Opportunité        → /rejoindre?ref=<Thomas> (complément de revenus)
//
// Page marketing SOMBRE-ONLY : on neutralise le thème clair de l'app coach
// pendant l'affichage (même motif que RejoindreOpportunitePage), sinon les
// overrides globaux html.theme-light forcent le texte cream → noir → invisible.
// =============================================================================

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Attribution par défaut : Thomas (owner). Aligné sur la 3e carte de WelcomePage.
const THOMAS_REF = "656dcf35-4859-4a70-9d20-990104813423";
const THOMAS_SLUG = "thomas";

const GOALS: { icon: string; label: string }[] = [
  { icon: "⚖️", label: "Perdre du poids" },
  { icon: "💪", label: "Prendre du muscle" },
  { icon: "⚡", label: "Plus d'énergie" },
  { icon: "🌿", label: "Mieux digérer" },
  { icon: "😴", label: "Mieux dormir" },
];

const STEPS: { n: string; title: string; sub: string }[] = [
  { n: "1", title: "Ton bilan", sub: "2 minutes pour comprendre ton corps et tes objectifs." },
  { n: "2", title: "Ton plan", sub: "Un programme perso + les bons produits, expliqués." },
  { n: "3", title: "Ton suivi", sub: "Un coach à tes côtés, semaine après semaine." },
];

export function DecouvrirPage() {
  const navigate = useNavigate();

  // Neutralise le thème clair le temps de la page (cf. RejoindreOpportunitePage).
  useEffect(() => {
    const html = document.documentElement;
    const wasLight = html.classList.contains("theme-light");
    if (wasLight) html.classList.remove("theme-light");
    return () => {
      if (wasLight) html.classList.add("theme-light");
    };
  }, []);

  return (
    <div className="dec-root">
      <style>{`
        .dec-root {
          min-height: 100vh;
          min-height: 100dvh;
          position: relative;
          overflow: hidden;
          background: #0a0c0a;
          color: #F1EFE8;
          font-family: 'DM Sans', sans-serif;
        }
        /* ─── Mesh G3 ─── */
        .dec-blob { position: absolute; border-radius: 50%; filter: blur(100px); pointer-events: none; will-change: transform; }
        .dec-b1 { top: -8%; left: -10%; width: 420px; height: 420px; background: radial-gradient(circle,#c5f82a,transparent 70%); opacity: .16; animation: dec-f1 28s ease-in-out infinite alternate; }
        .dec-b2 { top: 22%; right: -16%; width: 380px; height: 380px; background: radial-gradient(circle,#2DD4BF,transparent 70%); opacity: .14; animation: dec-f2 32s ease-in-out infinite alternate; }
        .dec-b3 { bottom: -12%; left: 24%; width: 340px; height: 340px; background: radial-gradient(circle,#A78BFA,transparent 70%); opacity: .13; animation: dec-f3 36s ease-in-out infinite alternate; }
        @keyframes dec-f1 { to { transform: translate(-46px,36px) scale(1.1); } }
        @keyframes dec-f2 { to { transform: translate(56px,-28px) scale(1.12); } }
        @keyframes dec-f3 { to { transform: translate(40px,-46px) scale(1.08); } }
        .dec-grain {
          position: absolute; inset: 0; pointer-events: none; opacity: .028; mix-blend-mode: overlay;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
        }

        .dec-wrap { position: relative; z-index: 1; max-width: 440px; margin: 0 auto; padding: 30px 20px 52px; }

        /* ─── Orbe logo ─── */
        .dec-orbe { position: relative; width: 96px; height: 96px; margin: 0 auto; animation: dec-in .8s cubic-bezier(0.16,1,0.3,1) both; }
        .dec-orbe::before { content:''; position:absolute; inset:-7px; border-radius:50%;
          background: conic-gradient(from 0deg,transparent,rgba(197,248,42,.4) 25%,rgba(45,212,191,.5) 50%,rgba(167,139,250,.4) 75%,transparent); animation: dec-rot 6s linear infinite; opacity:.7; }
        .dec-orbe::after { content:''; position:absolute; inset:-3px; border-radius:50%; background:#0a0c0a; }
        .dec-orbe img { position:relative; z-index:1; width:96px; height:96px; border-radius:24px; object-fit:contain;
          animation: dec-breathe 3.5s ease-in-out infinite alternate;
          filter: drop-shadow(0 0 26px rgba(197,248,42,.32)) drop-shadow(0 12px 32px rgba(45,212,191,.2)); }
        @keyframes dec-rot { to { transform: rotate(360deg); } }
        @keyframes dec-breathe { to { transform: scale(1.04); } }

        .dec-badge { display:inline-block; margin-top:14px; padding:6px 18px; border-radius:100px;
          background: rgba(197,248,42,.06); border:.5px solid rgba(197,248,42,.18);
          font-size:10px; font-weight:600; letter-spacing:.30em; text-transform:uppercase; color:#9AA0A6; }

        .dec-center { text-align: center; }
        .dec-hero { text-align:center; animation: dec-in .9s cubic-bezier(0.16,1,0.3,1) .15s both; }
        .dec-h1 { font-family:'Anton','Syne',sans-serif; text-transform:uppercase; font-weight:400;
          font-size: clamp(34px,9vw,44px); line-height:1; margin:14px 0 0; letter-spacing:.01em; color:#F1EFE8; }
        .dec-grad { background: linear-gradient(135deg,#c5f82a 0%,#2DD4BF 50%,#A78BFA 100%);
          -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; color:transparent; display:inline-block; }
        .dec-lead { font-size:15px; line-height:1.6; color:#9AA0A6; margin:14px auto 0; max-width:340px; }

        .dec-sec { margin-top: 38px; animation: dec-in .8s cubic-bezier(0.16,1,0.3,1) both; }
        .dec-kicker { font-family:'JetBrains Mono',monospace; font-size:11px; font-weight:600; letter-spacing:.16em;
          text-transform:uppercase; color:#2DD4BF; display:block; margin-bottom:10px; }
        .dec-sec h2 { font-family:'Anton',sans-serif; text-transform:uppercase; font-weight:400; font-size:26px; line-height:1.05; margin:0 0 12px; color:#F1EFE8; }
        .dec-sec p { font-size:14.5px; line-height:1.65; color:#9AA0A6; margin:0; }

        .dec-chips { display:flex; flex-wrap:wrap; gap:8px; margin-top:16px; }
        .dec-chip { display:flex; align-items:center; gap:7px; padding:10px 13px; border-radius:13px;
          border:1px solid rgba(255,255,255,.09); background:rgba(255,255,255,.025); font-size:13px; font-weight:600; color:#F1EFE8; }
        .dec-chip span { font-size:16px; }

        .dec-steps { margin-top:16px; display:flex; flex-direction:column; gap:12px; }
        .dec-step { display:flex; gap:13px; align-items:flex-start; }
        .dec-step .n { width:30px; height:30px; flex:0 0 auto; border-radius:9px; display:flex; align-items:center; justify-content:center;
          font-family:'Anton',sans-serif; font-size:15px; background:rgba(45,212,191,.12); color:#2DD4BF; }
        .dec-step .st { font-weight:700; font-size:14.5px; color:#F1EFE8; }
        .dec-step .sp { font-size:13px; color:#9AA0A6; margin-top:1px; line-height:1.5; }

        /* ─── Deux chemins ─── */
        .dec-paths { margin-top:20px; display:flex; flex-direction:column; gap:14px; }
        .dec-path { border-radius:20px; padding:22px 18px; border:1px solid rgba(255,255,255,.09); position:relative; overflow:hidden; }
        .dec-path-a { background: linear-gradient(160deg, rgba(45,212,191,.10), rgba(45,212,191,.02)); }
        .dec-path-b { background: linear-gradient(160deg, rgba(167,139,250,.11), rgba(167,139,250,.02)); }
        .dec-pk { font-family:'JetBrains Mono',monospace; font-size:10.5px; letter-spacing:.14em; text-transform:uppercase; font-weight:600; }
        .dec-path-a .dec-pk { color:#2DD4BF; } .dec-path-b .dec-pk { color:#A78BFA; }
        .dec-path h3 { font-family:'Anton',sans-serif; text-transform:uppercase; font-weight:400; font-size:22px; margin:8px 0; line-height:1.05; color:#F1EFE8; }
        .dec-path p { font-size:13.5px; line-height:1.6; color:#9AA0A6; margin:0 0 16px; }
        .dec-cta { display:flex; align-items:center; justify-content:center; gap:8px; width:100%; padding:15px;
          border-radius:14px; border:0; font-family:'DM Sans',sans-serif; font-weight:700; font-size:15px; cursor:pointer; transition: transform .2s cubic-bezier(0.16,1,0.3,1); }
        .dec-cta:hover { transform: translateY(-2px); }
        .dec-cta-a { background: linear-gradient(135deg,#c5f82a 0%,#2DD4BF 50%,#A78BFA 100%); color:#08110a; }
        .dec-cta-b { background: transparent; border:1.5px solid #A78BFA; color:#F1EFE8; }
        .dec-mini { text-align:center; font-size:11.5px; color:#6b7280; margin:9px 0 0; }

        .dec-back { display:inline-flex; align-items:center; gap:6px; margin-top:34px; font-size:13px; color:#9AA0A6;
          background:none; border:0; cursor:pointer; font-family:inherit; }
        .dec-foot { text-align:center; font-size:11px; color:#6b7280; margin-top:22px; }
        .dec-foot b { background: linear-gradient(135deg,#c5f82a 0%,#2DD4BF 50%,#A78BFA 100%);
          -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }

        @keyframes dec-in { from { opacity:0; transform: translateY(14px); } to { opacity:1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) {
          .dec-orbe, .dec-hero, .dec-sec { animation: none !important; }
          .dec-orbe::before, .dec-orbe img, .dec-blob { animation: none !important; }
          .dec-cta:hover { transform: none; }
        }
      `}</style>

      <div aria-hidden="true" className="dec-blob dec-b1" />
      <div aria-hidden="true" className="dec-blob dec-b2" />
      <div aria-hidden="true" className="dec-blob dec-b3" />
      <div aria-hidden="true" className="dec-grain" />

      <div className="dec-wrap">
        {/* Hero */}
        <div className="dec-hero">
          <div className="dec-orbe">
            <img src="/brand/labase360/app-icon-512.svg" alt="La Base 360" />
          </div>
          <div className="dec-center">
            <span className="dec-badge">★ Since 2022 · Verdun ★</span>
          </div>
          <h1 className="dec-h1">
            Bienvenue<br />dans <span className="dec-grad">le club</span>
          </h1>
          <p className="dec-lead">
            Un accompagnement nutrition sur-mesure, porté par des coachs humains.
            Ici, on transforme les objectifs en résultats qui durent.
          </p>
        </div>

        {/* Qui on est */}
        <section className="dec-sec" style={{ animationDelay: "0.25s" }}>
          <span className="dec-kicker">Qui on est</span>
          <h2>Un club, pas<br />une appli de plus</h2>
          <p>
            La Base 360, c'est un club de nutrition bien-être installé à Verdun depuis 2022.
            Derrière chaque parcours, un vrai coach qui te connaît, t'écoute et t'accompagne —
            pas un algorithme.
          </p>
        </section>

        {/* Ce qu'on fait */}
        <section className="dec-sec" style={{ animationDelay: "0.3s" }}>
          <span className="dec-kicker">Ce qu'on fait</span>
          <h2>On part de <span className="dec-grad">ton corps</span></h2>
          <p>
            Tout commence par un bilan personnalisé qui comprend où tu en es. On construit
            ensuite un plan concret, adapté à ton objectif&nbsp;:
          </p>
          <div className="dec-chips">
            {GOALS.map((g) => (
              <div key={g.label} className="dec-chip">
                <span aria-hidden="true">{g.icon}</span>
                {g.label}
              </div>
            ))}
          </div>
        </section>

        {/* Comment ça se passe */}
        <section className="dec-sec" style={{ animationDelay: "0.35s" }}>
          <span className="dec-kicker">Comment ça se passe</span>
          <h2>Simple, en 3 temps</h2>
          <div className="dec-steps">
            {STEPS.map((s) => (
              <div key={s.n} className="dec-step">
                <span className="n" aria-hidden="true">{s.n}</span>
                <span>
                  <span className="st">{s.title}</span>
                  <br />
                  <span className="sp">{s.sub}</span>
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Deux chemins */}
        <section className="dec-sec" style={{ animationDelay: "0.4s" }}>
          <span className="dec-kicker">Par où tu commences&nbsp;?</span>
          <div className="dec-paths">
            <div className="dec-path dec-path-a">
              <span className="dec-pk">Envie de te sentir mieux</span>
              <h3>Fais ton bilan offert</h3>
              <p>
                2 minutes, sans engagement. Tu comprends ton corps et tu reçois un premier
                plan personnalisé.
              </p>
              <button
                type="button"
                className="dec-cta dec-cta-a"
                onClick={() => navigate(`/bilan-online/${THOMAS_SLUG}`)}
              >
                Faire mon bilan gratuit →
              </button>
              <p className="dec-mini">Gratuit · 2 min · sans engagement</p>
            </div>

            <div className="dec-path dec-path-b">
              <span className="dec-pk">Envie d'en faire plus</span>
              <h3>Deviens acteur du club</h3>
              <p>
                Partage ce qui marche autour de toi, aide ton entourage à se sentir mieux,
                et gagne un complément de revenus.
              </p>
              <button
                type="button"
                className="dec-cta dec-cta-b"
                onClick={() => navigate(`/rejoindre?ref=${THOMAS_REF}`)}
              >
                Découvrir l'opportunité →
              </button>
              <p className="dec-mini">Sans pression · à ton rythme</p>
            </div>
          </div>
        </section>

        <div className="dec-center">
          <button type="button" className="dec-back" onClick={() => navigate("/welcome")}>
            ← Retour à l'accueil
          </button>
        </div>
        <div className="dec-foot">
          Propulsé par <b>La Base 360</b> · Verdun · France
        </div>
      </div>
    </div>
  );
}
