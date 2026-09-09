// =============================================================================
// « Mon point de départ » — l'écran de fin.
//
// Route : /point-de-depart[/:coachSlug]/resultats
//
// Deux choses que le bilan La Base 360 ne fait pas :
//
//  1. Le radar accepte 6 OU 7 axes. Un bilan du club a « Le matin » en plus,
//     et la géométrie se recalcule au lieu d'être écrite en dur — sinon la
//     7e dimension serait tombée à côté de son axe.
//  2. La fin a DEUX portes, et leur ORDRE dépend de la réponse à « tu peux
//     passer le matin ? ». Quelqu'un qui a répondu « Verdun c'est loin »
//     voit « démarrer d'ici » en premier. Aujourd'hui, ces gens-là n'ont
//     aucune porte : le bilan les envoie vers un agenda où ils ne viendront
//     jamais.
//
// La page ne relit RIEN en base : tout vient de la session posée par le
// formulaire. Un accès direct (lien partagé, rafraîchissement au mauvais
// moment) n'affiche donc pas une page vide cassée — il renvoie au début.
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useEtapeTunnel } from "../features/audience/useEtapeTunnel";
import {
  computeBilanResults, type BilanResults, type ScoringInput,
} from "../lib/bilanOnlineScoring";
import { CLE_META, CLE_RESULTATS, type VenirMatin } from "./PointDeDepartPage";
import "./PointDeDepartPage.css";

const LOGO = "/brand/breakfast-club/logo-heart.png";

interface Meta {
  first_name?: string;
  venir_matin?: VenirMatin | "";
  bilan_id?: string | null;
}

function normalizeSlug(input: string): string {
  return input.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/**
 * Radar à N axes. Le premier axe pointe vers le haut, les suivants tournent
 * dans le sens horaire. Le viewBox garde 40 px de marge en haut et en bas pour
 * les libellés : sans ça, « Le matin » et « Sommeil » sortiraient du cadre.
 */
function Radar({ dims }: { dims: { label: string; score: number }[] }) {
  const n = dims.length;
  const cx = 150, cy = 116, r = 72;
  const pt = (i: number, f: number) => {
    const a = (-90 + (360 / n) * i) * (Math.PI / 180);
    return [cx + Math.cos(a) * r * f, cy + Math.sin(a) * r * f] as const;
  };
  const anneau = (f: number) =>
    dims.map((_, i) => pt(i, f).map((v) => v.toFixed(1)).join(",")).join(" ");
  const valeurs = dims
    .map((d, i) => pt(i, Math.max(d.score, 3) / 100).map((v) => v.toFixed(1)).join(","))
    .join(" ");

  return (
    <svg viewBox="0 0 300 236" width="290" height="228" role="img"
         aria-label={dims.map((d) => `${d.label} ${d.score} sur 100`).join(", ")}>
      <g fill="none" stroke="#E4DACA" strokeWidth="1">
        {[1, 0.66, 0.33].map((f) => <polygon key={f} points={anneau(f)} />)}
      </g>
      <g stroke="#EFE7D8" strokeWidth="1">
        {dims.map((_, i) => {
          const [x, y] = pt(i, 1);
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} />;
        })}
      </g>
      <polygon points={valeurs} fill="rgba(255,106,43,.2)" stroke="#FF6A2B"
               strokeWidth="2" strokeLinejoin="round" />
      <g fill="#FF6A2B">
        {dims.map((d, i) => {
          const [x, y] = pt(i, Math.max(d.score, 3) / 100);
          return <circle key={i} cx={x} cy={y} r="3" />;
        })}
      </g>
      <g fontFamily="Poppins,sans-serif" fontSize="10.5" fontWeight="600" fill="#55605A">
        {dims.map((d, i) => {
          const [x, y] = pt(i, 1.28);
          // L'ancrage suit la position : à droite du centre on aligne à gauche,
          // à gauche on aligne à droite. Sinon les libellés latéraux se
          // chevauchent avec le tracé.
          const ancre = x > cx + 12 ? "start" : x < cx - 12 ? "end" : "middle";
          return (
            <text key={i} x={x.toFixed(1)} y={(y + 3.5).toFixed(1)} textAnchor={ancre}>
              {d.label}
            </text>
          );
        })}
      </g>
    </svg>
  );
}

export default function PointDeDepartResultatsPage() {
  const { coachSlug } = useParams<{ coachSlug?: string }>();
  const slug = useMemo(() => normalizeSlug(coachSlug ?? ""), [coachSlug]);
  const navigate = useNavigate();

  const [resultats, setResultats] = useState<BilanResults | null>(null);
  const [meta, setMeta] = useState<Meta>({});

  useEtapeTunnel("point-de-depart", resultats ? "resultats" : null, 7);

  useEffect(() => {
    let entree: ScoringInput | null = null;
    try {
      const brut = sessionStorage.getItem(CLE_RESULTATS(slug));
      if (brut) entree = JSON.parse(brut) as ScoringInput;
      const m = sessionStorage.getItem(CLE_META(slug));
      if (m) setMeta(JSON.parse(m) as Meta);
    } catch { /* session illisible : traité comme absente juste en dessous */ }

    if (!entree) {
      navigate(`/point-de-depart${slug ? `/${slug}` : ""}`, { replace: true });
      return;
    }
    setResultats(computeBilanResults(entree));
  }, [slug, navigate]);

  if (!resultats) return null;

  const prenom = (meta.first_name ?? "").trim();
  // « Verdun c'est loin » et « je préfère à distance » : le club en premier
  // serait une porte fermée. On inverse.
  const clubDabord = meta.venir_matin !== "loin" && meta.venir_matin !== "distance";

  const porteClub = (
    <div className="pdd-door main">
      <span className="tag">Offert · sans engagement</span>
      <h2>Venir au club</h2>
      <p className="m">45 min · 11 rue Saint-Pierre, Verdun</p>
      <ul>
        <li><span className="c" aria-hidden="true">✓</span><span>Ton bilan repris en détail, avec toi</span></li>
        <li><span className="c" aria-hidden="true">✓</span><span>Le body scan — masse grasse, muscle, eau</span></li>
        <li><span className="c" aria-hidden="true">✓</span><span>Ta boisson du Breakfast Club, offerte</span></li>
      </ul>
      <a className="pdd-cta" href="/reserver?utm_source=point-de-depart">Choisir mon créneau</a>
    </div>
  );

  const porteDistance = (
    <div className="pdd-door alt">
      <span className="tag">À distance</span>
      <h2>Démarrer d'ici</h2>
      <p className="m">Sans bouger de chez toi</p>
      <ul>
        <li><span className="c" aria-hidden="true">✓</span><span>Tes résultats détaillés, écran par écran</span></li>
        <li><span className="c" aria-hidden="true">✓</span><span>Le programme qui correspond, avec son prix</span></li>
        <li><span className="c" aria-hidden="true">✓</span><span>Le suivi par l'équipe, à distance</span></li>
      </ul>
      {/* La page détaillée `/resultat-bilan/:token` existe depuis juin, mais son
          jeton n'est pas rendu au navigateur — c'est le coach qui l'envoie à la
          main. Tant que ce n'est pas branché, on demande à être rappelée
          plutôt que de promettre un lien qui n'arrivera pas. */}
      <a className="pdd-cta"
         href={`/reserver?utm_source=point-de-depart&mode=distance${
           prenom ? `&prenom=${encodeURIComponent(prenom)}` : ""}`}>
        Être rappelée
      </a>
    </div>
  );

  return (
    <div className="pdd">
      <header className="pdd-header"><div className="pdd-wrap in">
        <a href="/club" aria-label="Aller au site du Breakfast Club">
          <img src={LOGO} alt="The Breakfast Club by La Base" />
        </a>
        <span className="pdd-badge">Ton point de départ</span>
      </div></header>

      <main className="pdd-wrap">
        <section className="pdd-screen">
          <p className="pdd-eyebrow" style={{ textAlign: "center", marginTop: 8 }}>
            Ton bilan en un coup d'œil
          </p>
          <h1 className="pdd-title" style={{ textAlign: "center", marginTop: 7 }}>
            {prenom ? `${prenom}, ` : ""}{resultats.verdict.headline}
          </h1>

          <div className="pdd-score">
            <div className="n">{resultats.globalScore}<small>/100</small></div>
            <div className="t">
              <b>{resultats.verdict.emoji} Ton point de départ</b>
              {resultats.verdict.body}
            </div>
          </div>

          <div className="pdd-radar">
            <Radar dims={resultats.dimensions.map((d) => ({ label: d.label, score: d.score }))} />
          </div>

          <p className="pdd-eyebrow" style={{ marginTop: 10 }}>Tes 3 priorités</p>
          {resultats.priorities.map((p, i) => (
            <div key={p.key} className={`pdd-prio${p.key === "morning" ? " matin" : ""}`}>
              <span className="r">{i + 1}</span>
              <div>
                <p className="h">{p.emoji} {p.title}</p>
                <p className="o">{p.insight}</p>
                <p className="a">→ {p.advice}</p>
              </div>
            </div>
          ))}

          <div className="pdd-hint" style={{ marginTop: 16 }}>
            <span className="i" aria-hidden="true">🤝</span>
            <span>
              Ces notes sont un point de départ, pas un verdict — une photo à un instant T.
              On les reprend une par une avec toi.
            </span>
          </div>

          <h2 className="pdd-title" style={{ fontSize: 24, marginTop: 28 }}>
            Deux façons<br />de commencer
          </h2>
          <p className="pdd-sub">
            Ton bilan dit <b>quoi</b>. La suite sert à trouver le <b>comment</b> —
            celui qui tient dans tes journées.
          </p>

          {clubDabord ? <>{porteClub}{porteDistance}</> : <>{porteDistance}{porteClub}</>}

          <p className="pdd-foot" style={{ marginTop: 24 }}>
            The Breakfast Club · 11 rue Saint-Pierre, Verdun<br />
            Ouvert dès 7h, du lundi au samedi
          </p>
        </section>
      </main>
    </div>
  );
}
