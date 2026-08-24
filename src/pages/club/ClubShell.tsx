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
import { useRevelationAuScroll } from "./useRevelationAuScroll";
import { useEffetsAuScroll } from "./useEffetsAuScroll";
import { ClubNewsletter } from "./ClubNewsletter";
import { CLUB_TEL, CLUB_RUE, CLUB_CODE_POSTAL, CLUB_VILLE, HORAIRES_COURT_JOURS } from "../../data/clubInfos";

const MARK = "/brand/breakfast-club/logo-mark.png";
// Wordmark AVEC le cœur rouge — pour les fonds clairs.
const WORDMARK_HEART = "/brand/breakfast-club/logo-heart.png";
// Version crème du wordmark, dessinée pour les fonds sombres. À utiliser TELLE
// QUELLE : le pied de page prenait la version foncée et la forçait en blanc au
// filtre (`brightness(0) invert(1)`), ce qui écrasait le cœur rouge avec le
// reste. Le logo officiel a un cœur — il le retrouve via <ClubWordmarkDark>.
const WORDMARK_CREAM = "/brand/breakfast-club/logo-wordmark.png";
export const R = "/reserver?utm_source=site";
export const objUrl = (o: string) => `/reserver?objectif=${o}&utm_source=site`;
export const TEL = "tel:+33679448759";

// Menu revu le 14/08 sur le brief de Thomas : « deux objectifs très différents,
// je rendrais les parcours extrêmement clairs ».
//
// Le sien tenait en cinq entrées. Celui-ci en a six, et la raison est mesurée :
// `/club/le-rituel`, `/club/resultats`, `/club/le-club` et `/club/nous` ne sont
// liés NULLE PART ailleurs que dans ce menu. Les en retirer ne les cache pas,
// ça les rend inatteignables — et « Résultats », les transformations, est la
// meilleure preuve du site.
//
// « Accueil » disparaît en revanche : le logo y ramène, depuis l'en-tête comme
// depuis le tiroir mobile (vérifié). Une entrée de moins pour la même
// destination, c'est la seule qu'on pouvait retirer sans rien perdre.
//
// « Comment ça se passe » devient « Comment ça marche » et « Nous » devient
// « Qui sommes-nous » : les libellés de son brief, plus explicites pour
// quelqu'un qui arrive sans rien connaître.
const NAV: Array<{ to: string; label: string }> = [
  { to: "/club/le-club", label: "Le club" },
  { to: "/club/le-rituel", label: "Le rituel" },
  { to: "/club/comment-ca-se-passe", label: "Comment ça marche" },
  { to: "/club/resultats", label: "Résultats" },
  // Pointe vers la section existante `#formule` : pas de page de plus, donc pas
  // un endroit de plus où maintenir les mêmes prix (règle B9).
  { to: "/club#formule", label: "Tarifs" },
  { to: "/club/nous", label: "Qui sommes-nous" },
  // À part, dans son propre bouton mis en avant : devenir coach n'est pas une
  // rubrique du site, c'est l'AUTRE parcours.
  { to: "/club/rejoindre", label: "Devenir coach" },
];

/**
 * Emplacement photo encadré (backdrop teinté décalé + slot arrondi).
 *
 * Sans `src`, affiche le repère « 📷 … » — l'emplacement attend sa photo.
 * Avec `src`, affiche la vraie image DANS le même cadre : le panneau teinté
 * décalé et les coins arrondis sont conservés, rien du design ne bouge.
 * `priority` pour la seule image visible d'emblée (le hero) : les autres sont
 * chargées paresseusement, elles sont toutes sous la ligne de flottaison.
 */
export function Slot({
  ratio, label, sub, frame, src, alt, priority, position,
}: {
  ratio: string;
  label: string;
  sub?: string;
  frame?: string;
  src?: string;
  /** Décrit la photo pour qui ne la voit pas. Obligatoire dès qu'il y a `src`. */
  alt?: string;
  priority?: boolean;
  /**
   * Quelle partie de la photo garder quand son format ne correspond pas à
   * celui du cadre (`object-position`). Défaut « centre », ce qui coupe autant
   * en haut qu'en bas — rarement le bon choix pour un portrait, où le sujet
   * n'est presque jamais au milieu.
   */
  position?: string;
}) {
  return (
    <div className={`cl-frame${frame ? " " + frame : ""}`}>
      <div className="cl-slot" style={{ aspectRatio: ratio }}>
        {src ? (
          <img
            src={src}
            alt={alt ?? ""}
            width="100%"
            height="100%"
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={priority ? "high" : undefined}
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: position ?? "50% 50%" }}
          />
        ) : (
          <span>📷 {label}{sub ? <small>{sub}</small> : null}</span>
        )}
      </div>
    </div>
  );
}

/**
 * Le wordmark complet sur fond sombre — texte crème ET cœur rouge.
 *
 * Il n'existe pas d'image crème AVEC le cœur : `logo-wordmark.png` est crème
 * mais sans cœur, `logo-heart.png` a le cœur mais en noir. On superpose donc
 * le cœur sur la version crème, aux coordonnées RELEVÉES DANS L'IMAGE
 * OFFICIELLE plutôt que placées à l'œil — cœur rouge trouvé à x=721 y=65,
 * 60×38 px dans un cadre de 1180×756, soit 61,1 % / 8,6 % et 5,1 % de large.
 * Les trois fichiers partagent ce cadrage exact (vérifié), donc le repère
 * reste juste quelle que soit la taille d'affichage.
 */
export function ClubWordmarkDark({ width = 210 }: { width?: number }) {
  return (
    <span style={{ position: "relative", display: "inline-block", width, lineHeight: 0 }}>
      <img src={WORDMARK_CREAM} alt="The Breakfast Club by La Base" style={{ width: "100%", display: "block" }} />
      <svg
        viewBox="0 0 32 32"
        aria-hidden="true"
        style={{ position: "absolute", left: "61.1%", top: "8.6%", width: "5.1%", height: "auto" }}
      >
        <path
          d="M16 26.5C7.4 21 4.8 15.6 8.3 12.3c2.3-2.1 5.3-1 6.7 1.4l1 1.6 1-1.6c1.4-2.4 4.4-3.5 6.7-1.4 3.5 3.3.9 8.7-7.7 14.2z"
          fill="#E5352B"
        />
      </svg>
    </span>
  );
}

/**
 * Une vignette de bande. `position` (object-position) dit QUELLE PART de la
 * photo garder : une bande est très large, une photo verticale n'y entre que
 * pour un quart de sa hauteur, et le centrage par défaut coupe alors les têtes.
 * Réglage à faire à partir d'une MESURE, jamais à l'œil — cf. les commentaires
 * là où ces valeurs sont posées.
 */
export type BandPhoto = { src: string; position?: string };

/**
 * Bande photo pleine largeur qui sépare deux sections.
 *
 * Purement décorative : chaque vignette porte `alt=""` et la bande est
 * `aria-hidden`. Les photos ne portent aucune information qui ne soit pas
 * déjà dans le texte des sections qu'elles séparent — les décrire une à une
 * ne ferait qu'allonger la lecture d'un lecteur d'écran sans rien lui
 * apprendre. Si un jour une vignette porte une info propre, elle sort de la
 * bande et devient un <Slot> légendé.
 */
export function PhotoBand({ srcs, hauteur }: { srcs: Array<string | BandPhoto>; hauteur?: string }) {
  return (
    <div
      className="cl-photoband"
      aria-hidden="true"
      style={hauteur ? ({ ["--band-h" as string]: hauteur }) : undefined}
    >
      {srcs.map((s) => {
        const p: BandPhoto = typeof s === "string" ? { src: s } : s;
        return (
          <img
            key={p.src}
            src={p.src}
            alt=""
            loading="lazy"
            decoding="async"
            style={p.position ? { objectPosition: p.position } : undefined}
          />
        );
      })}
    </div>
  );
}

// Titre et description propres à chaque page. Sans eux, les 8 pages du club
// partageaient un seul et même titre : un moteur de recherche y voit 8 fois la
// même page et n'en retient qu'une. Les valeurs par défaut restent celles de
// l'accueil, donc une page qui ne dit rien ne casse pas pour autant.
export function ClubShell({
  children,
  title = "The Breakfast Club · Verdun",
  description = "Le club de petit-déjeuner et de coaching nutrition de Verdun : aloe vera, boisson thermo, smoothie complet et suivi quotidien. Ton premier body scan est offert, sans engagement.",
}: {
  children: ReactNode;
  title?: string;
  description?: string;
}) {
  const { pathname, hash } = useLocation();
  const [open, setOpen] = useState(false);
  useClubHead(title, description);

  // Reset du scroll au changement de page interne (React Router ne le fait pas).
  // Garde sur le hash : préserve les ancres type « Voir le rituel » (#rituel).
  useEffect(() => {
    if (!window.location.hash) window.scrollTo(0, 0);
  }, [pathname]);

  // DESCENDRE JUSQU'À L'ANCRE quand on arrive avec un « #… ».
  //
  // Sans ça, « Tarifs » depuis une autre page changeait bien d'URL mais laissait
  // le visiteur EN HAUT de l'accueil : React Router ne défile pas, et le
  // navigateur ne le fait que pour une ancre de la page déjà chargée. Le menu
  // aurait eu l'air cassé.
  //
  // Le décalage de 76 px n'est pas décoratif : l'en-tête est collant, sans lui
  // le titre de la section se glisse dessous et on croit avoir raté la cible.
  //
  // ⚠ ON ATTEND QUE L'ANCRE EXISTE, on ne la cherche pas une fois.
  // Premier essai avec un simple délai de 80 ms : le défilement ne partait pas.
  // Mesuré — arrivé depuis une autre page, l'accueil est un morceau chargé à la
  // demande : au moment où l'effet s'exécute, `#formule` n'est pas encore dans
  // la page. On réessaie donc à chaque image jusqu'à deux secondes, puis on
  // abandonne sans rien casser (le visiteur reste en haut, comme avant).
  useEffect(() => {
    if (!hash) return;
    const id = hash.slice(1);
    let arrete = false;
    let minuterie = 0;
    const limite = Date.now() + 2000;
    const chercher = () => {
      if (arrete) return;
      const cible = document.getElementById(id);
      if (cible) {
        const y = cible.getBoundingClientRect().top + window.scrollY - 76;
        // Instantané, pas « smooth » : depuis une autre page le saut fait
        // ~6 700 px. Animé, il fait défiler tout l'accueil sous les yeux
        // pendant plusieurs secondes, et iOS interrompt l'animation au premier
        // geste. Un lien de menu doit arriver, pas voyager.
        window.scrollTo({ top: y, behavior: "auto" });
        return;
      }
      // Minuterie et non `requestAnimationFrame` : celui-ci est suspendu dès que
      // la page ne compose plus — onglet en arrière-plan, fenêtre masquée. La
      // boucle ne repartait jamais et le défilement n'avait pas lieu.
      if (Date.now() < limite) minuterie = window.setTimeout(chercher, 50);
    };
    chercher();
    return () => { arrete = true; window.clearTimeout(minuterie); };
  }, [pathname, hash]);

  // Posé ici, donc valable pour les 9 pages du club d'un coup. Ne fait rien
  // quand le navigateur sait animer au défilement tout seul.
  useRevelationAuScroll();

  // Cartes en cascade, bande photo en profondeur, en-tete qui se tasse, fil de
  // lecture. Maquette validee le 13/08. Vaut pour les 9 pages du club.
  useEffetsAuScroll();

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
              {/* Action distincte de la navigation informative : le 7e item de
                  NAV (« Rejoindre l'équipe ») était coupé par le slice(0,6) du
                  menu desktop et n'était visible que dans le menu mobile plein
                  écran. Recrutement ≠ parcourir le site → sa propre place à
                  côté du CTA principal, pas une 7e entrée dans la nav. */}
              <Link className="cl-hcta-ghost cl-hcta-desk" to="/club/rejoindre">Devenir coach</Link>
              <a className="cl-hcta cl-hcta-desk" href={R}>Mon bilan offert</a>
              <button type="button" className="cl-burger" aria-label="Ouvrir le menu" aria-expanded={open} onClick={() => setOpen(true)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
              </button>
            </div>
          </div>
          <nav className="cl-nav" aria-label="Navigation">
            {/* Filtré par DESTINATION, plus par `slice(0, 6)`. L'ancien découpage
                comptait sur l'ordre : en insérant « Tarifs » en 6e position le
                13/08, « Nous » est tombé hors de la tranche et a disparu du menu
                de bureau sans que rien ne le signale. Un index en dur casse à la
                première insertion ; nommer ce qu'on écarte, non. */}
            {NAV.filter((n) => n.to !== "/club/rejoindre").map((n) => (
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
            <a className="cl-ghost" style={{ width: "100%", marginTop: 10 }} href={TEL}>Appeler · {CLUB_TEL}</a>
          </div>
        </div>
      ) : null}

      {children}

      <div className="cl-band foot">
        <div className="cl-wrap" style={{ paddingTop: "clamp(48px,6vw,80px)", paddingBottom: 28 }}>
          <div className="cl-footgrid">
            <div>
              <ClubWordmarkDark width={210} />
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
                <Link to="/club/rejoindre">Devenir coach</Link>
                <a href={R}>Réserver</a>
              </div>
            </div>
            <div>
              <div className="k">Nous trouver</div>
              <div style={{ color: "var(--on-dark-2)", fontSize: 15, lineHeight: 1.7 }}>{CLUB_RUE}<br />{CLUB_CODE_POSTAL} {CLUB_VILLE}<br />{HORAIRES_COURT_JOURS}<br />Dimanche fermé<br /><a href={TEL}>{CLUB_TEL}</a></div>
            </div>
            <ClubNewsletter />
          </div>
          <div style={{ marginTop: 30, paddingTop: 18, borderTop: "1px solid rgba(244,239,228,.14)", fontSize: 12.5, color: "var(--on-dark-3)" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 20px", marginBottom: 10 }}>
              <Link to="/legal/mentions" style={{ color: "var(--on-dark-2)", minHeight: 44, display: "inline-flex", alignItems: "center" }}>Mentions légales</Link>
              <Link to="/legal/confidentialite" style={{ color: "var(--on-dark-2)", minHeight: 44, display: "inline-flex", alignItems: "center" }}>Politique de confidentialité</Link>
              {/* Le club encaisse depuis l'accueil : les conditions de vente
                  doivent être joignables de n'importe quelle page, pas
                  seulement depuis la caisse. */}
              <Link to="/legal/cgv" style={{ color: "var(--on-dark-2)", minHeight: 44, display: "inline-flex", alignItems: "center" }}>Conditions de vente</Link>
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
        {/* « Mon bilan offert » et non « Réserver un matin » (Mélanie, 13/08).
            C'est le bouton le plus vu du site — collé en bas sur tout mobile,
            sur les neuf pages. « Réserver un matin » décrit le geste ; « Mon
            bilan offert » dit ce qu'on y gagne, et que ça ne coûte rien. */}
        <a className="cl-sticky-main" href={R}>Mon bilan offert</a>
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
