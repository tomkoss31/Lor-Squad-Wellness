// =============================================================================
// ClubShell — coquille partagée du site public Breakfast Club (header + nav +
// footer + wrapper crème `.cl`). Utilisée par la landing et les 6 pages internes.
// Reproduction fidèle de la maquette v7. CSS = ../ClubLandingPage.css.
// =============================================================================

import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import "../ClubLandingPage.css";

const MARK = "/brand/breakfast-club/logo-mark.png";
const WORDMARK = "/brand/breakfast-club/logo-wordmark-dark.png";
export const R = "/reserver?utm_source=site";
export const objUrl = (o: string) => `/reserver?objectif=${o}&utm_source=site`;
export const TEL = "tel:+33679448759";

const NAV: Array<{ to: string; label: string }> = [
  { to: "/club", label: "Accueil" },
  { to: "/club/le-club", label: "Le club" },
  { to: "/club/le-rituel", label: "Le rituel" },
  { to: "/club/comment-ca-se-passe", label: "Comment ça se passe" },
  { to: "/club/resultats", label: "Résultats" },
  { to: "/club/nous", label: "Nous" },
];

/** Emplacement photo encadré (backdrop teinté décalé + slot arrondi). */
export function Slot({ ratio, label, sub, frame }: { ratio: string; label: string; sub?: string; frame?: string }) {
  return (
    <div className={`cl-frame${frame ? " " + frame : ""}`}>
      <div className="cl-slot" style={{ aspectRatio: ratio }}>
        <span>📷 {label}{sub ? <small>{sub}</small> : null}</span>
      </div>
    </div>
  );
}

export function ClubShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="cl">
      <div className="cl-header">
        <div className="cl-wrap">
          <div className="bar">
            <Link className="cl-lock" to="/club">
              <img src={MARK} alt="" aria-hidden="true" />
              <span><span className="n1">Breakfast Club</span><span className="n2">by La Base · Verdun</span></span>
            </Link>
            <a className="cl-hcta" href={R}>Je commence</a>
          </div>
          <nav className="cl-nav" aria-label="Navigation">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className={pathname === n.to ? "on" : undefined}>{n.label}</Link>
            ))}
          </nav>
        </div>
      </div>

      {children}

      <div className="cl-band foot">
        <div className="cl-wrap" style={{ paddingTop: "clamp(48px,6vw,80px)", paddingBottom: 28 }}>
          <div className="cl-footgrid">
            <div>
              <img src={WORDMARK} alt="The Breakfast Club by La Base" style={{ width: 210, filter: "brightness(0) invert(1)" }} />
              <p style={{ color: "var(--on-dark-3)", fontSize: 16, marginTop: 16, maxWidth: "34ch" }}>Le club de petit-déjeuner de Verdun. Nutrition, énergie, communauté.</p>
            </div>
            <div>
              <div className="k">Le club</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Link to="/club/le-rituel">Le rituel</Link>
                <Link to="/club/comment-ca-se-passe">Comment ça se passe</Link>
                <Link to="/club/resultats">Résultats</Link>
                <Link to="/club/nous">Nous</Link>
                <a href={R}>Réserver</a>
              </div>
            </div>
            <div>
              <div className="k">Nous trouver</div>
              <div style={{ color: "var(--on-dark-2)", fontSize: 15, lineHeight: 1.7 }}>11 rue Saint Pierre<br />55100 Verdun<br />Lun–Ven 7h–11h · Sam 8h–11h<br /><a href={TEL}>06 79 44 87 59</a></div>
            </div>
          </div>
          <div style={{ marginTop: 30, paddingTop: 18, borderTop: "1px solid rgba(244,239,228,.14)", display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", alignItems: "center", fontSize: 12.5, color: "var(--on-dark-3)" }}>
            <span style={{ letterSpacing: ".14em", fontWeight: 700 }}>NUTRITION · ÉNERGIE · COMMUNAUTÉ</span>
            <span>The Breakfast Club by La Base · Verdun · <Link to="/club/rejoindre" style={{ color: "var(--on-dark-3)" }}>Ouvrir un club</Link></span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Hero d'une page interne : pill + grand h1 + intro. */
export function InnerHero({ pill, pillClass, title, accent, intro, dark }: { pill: string; pillClass?: string; title: ReactNode; accent?: string; intro: string; dark?: boolean }) {
  return (
    <div className={`cl-band${dark ? " dark" : ""}`}>
      <div className="cl-wrap cl-rv" style={{ maxWidth: 960, paddingTop: "clamp(46px,7vw,92px)", paddingBottom: "clamp(32px,5vw,56px)" }}>
        <span className={`cl-pill ${pillClass ?? ""}`}>{pill}</span>
        <h1 style={{ marginTop: 24, fontSize: "clamp(40px,6.6vw,86px)", color: dark ? "#fff" : undefined }}>{title}{accent ? <> <span className={dark ? "cl-a-yellow" : "cl-a-orange"}>{accent}</span></> : null}</h1>
        <p className="cl-lead" style={{ marginTop: 18, maxWidth: "42em" }}>{intro}</p>
      </div>
    </div>
  );
}
