// =============================================================================
// ClubShell — coquille partagée du site public Breakfast Club (header + nav +
// footer + wrapper crème `.cl`). Reproduction fidèle de la v7.
// Nav MOBILE/iOS : menu plein écran (hamburger) + barre d'action collée en bas
// (« Réserver » / « Appeler ») < 860px, avec safe-area. Nav inline ≥ 860px.
// =============================================================================

import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import "../ClubLandingPage.css";
import { useClubHead } from "./useClubHead";
import { ClubNewsletter } from "./ClubNewsletter";

const MARK = "/brand/breakfast-club/logo-mark.png";
const WORDMARK = "/brand/breakfast-club/logo-wordmark-dark.png";
// Wordmark AVEC le cœur rouge — pour les fonds clairs (le footer inverse en blanc,
// où le cœur rouge ne survivrait pas à l'inversion → il garde WORDMARK).
const WORDMARK_HEART = "/brand/breakfast-club/logo-heart.png";
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
  { to: "/club/rejoindre", label: "Rejoindre l'équipe" },
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
  const [open, setOpen] = useState(false);
  useClubHead(
    "The Breakfast Club · Verdun",
    "Le club de petit-déjeuner et de coaching nutrition de Verdun : aloe vera, thé aux plantes, smoothie complet et suivi quotidien. Ton premier body scan est offert, sans engagement.",
  );

  // Reset du scroll au changement de page interne (React Router ne le fait pas).
  // Garde sur le hash : préserve les ancres type « Voir le rituel » (#rituel).
  useEffect(() => {
    if (!window.location.hash) window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="cl">
      <div className="cl-header">
        <div className="cl-wrap">
          <div className="bar">
            <Link className="cl-lock" to="/club" onClick={() => setOpen(false)}>
              <span className="cl-medal">
                <img src={MARK} alt="" aria-hidden="true" />
                <svg className="cl-heart-badge" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 26.5C7.4 21 4.8 15.6 8.3 12.3c2.3-2.1 5.3-1 6.7 1.4l1 1.6 1-1.6c1.4-2.4 4.4-3.5 6.7-1.4 3.5 3.3.9 8.7-7.7 14.2z" fill="#E5352B" stroke="#F7F1E6" stroke-width="2.4" paint-order="stroke" /></svg>
              </span>
              <span className="cl-name"><span className="n1">The Breakfast Club</span><span className="n2">by La Base · Verdun</span></span>
            </Link>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <a className="cl-hcta cl-hcta-desk" href={R}>Je commence</a>
              <button type="button" className="cl-burger" aria-label="Ouvrir le menu" aria-expanded={open} onClick={() => setOpen(true)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
              </button>
            </div>
          </div>
          <nav className="cl-nav" aria-label="Navigation">
            {NAV.slice(0, 6).map((n) => (
              <Link key={n.to} to={n.to} className={pathname === n.to ? "on" : undefined}>{n.label}</Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Menu plein écran mobile */}
      {open ? (
        <div className="cl-menu" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="cl-menu-top">
            <img src={WORDMARK_HEART} alt="The Breakfast Club by La Base" style={{ height: 34 }} />
            <button type="button" className="cl-burger" aria-label="Fermer le menu" onClick={() => setOpen(false)}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          <nav className="cl-menu-nav" aria-label="Navigation">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className={pathname === n.to ? "on" : undefined} onClick={() => setOpen(false)}>{n.label}</Link>
            ))}
          </nav>
          <div className="cl-menu-foot">
            <a className="cl-cta" style={{ width: "100%" }} href={R} onClick={() => setOpen(false)}>Réserver mon body scan</a>
            <a className="cl-ghost" style={{ width: "100%", marginTop: 10 }} href={TEL}>Appeler · 06 79 44 87 59</a>
          </div>
        </div>
      ) : null}

      {children}

      <div className="cl-band foot">
        <div className="cl-wrap" style={{ paddingTop: "clamp(48px,6vw,80px)", paddingBottom: 28 }}>
          <div className="cl-footgrid">
            <div>
              <img src={WORDMARK} alt="The Breakfast Club by La Base" style={{ width: 210, filter: "brightness(0) invert(1)" }} />
              <p style={{ color: "var(--on-dark-3)", fontSize: 16, marginTop: 16, maxWidth: "34ch" }}>Le club de petit-déjeuner de Verdun. Nutrition, énergie, communauté.</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>
                <a className="cl-social" href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer">Instagram</a>
                <a className="cl-social" href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer">Facebook</a>
                {/* Google : remplacer par la vraie fiche Google Business du club */}
                <a className="cl-social" href="https://www.google.com/maps/place//data=!4m3!3m2!1s0x47eb1d44e38c23ab:0x685b5b72dd6c5ae2!12e1?source=g.page.m._&laa=merchant-review-solicitation" target="_blank" rel="noopener noreferrer">Google</a>
              </div>
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
              <div style={{ color: "var(--on-dark-2)", fontSize: 15, lineHeight: 1.7 }}>11 rue Saint Pierre<br />55100 Verdun<br />Lun–Ven 7h–11h · Sam 8h–11h<br />Dimanche fermé<br /><a href={TEL}>06 79 44 87 59</a></div>
            </div>
            <ClubNewsletter />
          </div>
          <div style={{ marginTop: 30, paddingTop: 18, borderTop: "1px solid rgba(244,239,228,.14)", fontSize: 12.5, color: "var(--on-dark-3)" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 20px", marginBottom: 10 }}>
              <Link to="/legal/mentions" style={{ color: "var(--on-dark-2)", minHeight: 44, display: "inline-flex", alignItems: "center" }}>Mentions légales</Link>
              <Link to="/legal/confidentialite" style={{ color: "var(--on-dark-2)", minHeight: 44, display: "inline-flex", alignItems: "center" }}>Politique de confidentialité</Link>
            </div>
            <p style={{ margin: "0 0 14px", maxWidth: "82ch", lineHeight: 1.6 }}>Les informations de ce site ne constituent pas un avis médical et les produits présentés ne sont pas des médicaments. Pour toute question de santé, consultez un professionnel de santé. Une alimentation variée et équilibrée et un mode de vie sain sont recommandés.</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ letterSpacing: ".14em", fontWeight: 700 }}>NUTRITION · ÉNERGIE · COMMUNAUTÉ</span>
              <span>© 2026 Breakfast Club by La Base — Verdun · <Link to="/club/rejoindre" style={{ color: "var(--on-dark-3)" }}>Ouvrir un club</Link></span>
            </div>
          </div>
        </div>
      </div>

      {/* Barre d'action collée en bas — mobile uniquement (safe-area iOS) */}
      <div className="cl-sticky">
        <a className="cl-sticky-main" href={R}>Réserver un matin</a>
        <a className="cl-sticky-call" href={TEL} aria-label="Appeler le club">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2Z" /></svg>
        </a>
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
