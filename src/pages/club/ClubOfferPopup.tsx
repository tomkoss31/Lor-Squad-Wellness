// =============================================================================
// ClubOfferPopup — l'offre d'entrée du site club. Maquette validée 2026-08-10.
//
// LE MOMENT EST LE SUJET. Celui de thebreakfast-club.com tombe au chargement :
// « body scan offert » ne veut rien dire pour quelqu'un qui ignore encore ce
// qu'on fait le matin — le meilleur argument du site, gaspillé sur un inconnu.
// Ici il attend d'avoir DÉPASSÉ la section « Le rituel » : à cet endroit la
// personne a lu les trois boissons et le suivi, elle sait ce qu'on lui offre,
// et le fait d'avoir défilé jusque-là est déjà un signal d'intérêt.
// L'intention de sortie s'y ajoute sur ordinateur — deuxième chance, jamais
// seule : elle n'existe pas sur téléphone, or c'est là qu'est le trafic.
//
// LES TROIS GARDE-FOUS (règles validées) :
//   1. une fois par personne, mémorisé dans son navigateur ;
//   2. jamais sur le tunnel de réservation — ce composant n'est monté que sur
//      la page d'accueil du club, donc la règle tient par construction ;
//   3. fermeture évidente : croix, « non merci », Échap et clic à côté.
// =============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { R } from "./ClubShell";

const VU = "bc-offre-vue";
/** Ancre de déclenchement : l'id de la section qui SUIT « Le rituel ». */
const APRES_LE_RITUEL = "inclus";

const AVANTAGES = [
  "Ton bilan bien-être complet",
  "Ton scan de composition corporelle",
  "Ta boisson détox et ton smoothie",
  "Ton plan de départ, clair et à toi",
];

export function ClubOfferPopup() {
  const [ouvert, setOuvert] = useState(false);
  // Un ref en plus de l'état : les écouteurs enregistrés une seule fois ne
  // verraient jamais changer la valeur capturée dans leur portée.
  const fini = useRef(false);

  const fermer = useCallback(() => {
    setOuvert(false);
    fini.current = true;
    try {
      window.localStorage.setItem(VU, "1");
    } catch {
      // Navigation privée, stockage plein : tant pis pour la mémorisation,
      // ça ne doit pas empêcher de fermer le popup.
    }
  }, []);

  const ouvrir = useCallback(() => {
    if (fini.current) return;
    fini.current = true;
    setOuvert(true);
  }, []);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(VU)) {
        fini.current = true;
        return;
      }
    } catch {
      /* stockage inaccessible : on continue, quitte à le remontrer une fois */
    }

    const cibles: Array<() => void> = [];

    // 1. Le défilement au-delà du rituel.
    //
    // Lecture directe de la position plutôt qu'un IntersectionObserver : celui-ci
    // dépend du pipeline de composition et ne délivre AUCUNE entrée dans un
    // onglet qui ne peint pas — mesuré, pas même le rappel initial pourtant
    // garanti par la spec. Le coût de l'alternative est négligeable : une
    // lecture de rectangle par événement, et l'écouteur se retire dès qu'il a
    // servi, donc il ne survit pas au défilement qui le déclenche.
    const ancre = document.getElementById(APRES_LE_RITUEL);
    if (ancre) {
      // Pas de requestAnimationFrame pour étrangler : lui non plus ne
      // s'exécute pas dans un onglet qui ne peint pas, et il ferait retomber
      // ce déclencheur dans le travers qu'on vient de lui retirer. Le calcul
      // est une lecture de rectangle et une comparaison ; l'écouteur se retire
      // à la première réussite, donc il ne survit pas au défilement.
      const verifier = () => {
        // Le haut de la section a dépassé les trois quarts de l'écran.
        if (ancre.getBoundingClientRect().top < window.innerHeight * 0.75) {
          retirerDefilement();
          ouvrir();
        }
      };
      const retirerDefilement = () => window.removeEventListener("scroll", verifier);
      window.addEventListener("scroll", verifier, { passive: true });
      cibles.push(retirerDefilement);
      verifier(); // au cas où la page s'ouvre déjà sur une ancre (#inclus)
    }

    // 2. L'intention de sortie — souris vers le haut de la fenêtre. Réservé au
    //    pointeur fin : sur un écran tactile, `mouseout` se déclenche à tort.
    const finPointeur = window.matchMedia?.("(pointer: fine)").matches ?? false;
    if (finPointeur) {
      const surSortie = (e: MouseEvent) => {
        if (e.clientY <= 0) ouvrir();
      };
      document.addEventListener("mouseout", surSortie);
      cibles.push(() => document.removeEventListener("mouseout", surSortie));
    }

    return () => cibles.forEach((f) => f());
  }, [ouvrir]);

  useEffect(() => {
    if (!ouvert) return;
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === "Escape") fermer();
    };
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [ouvert, fermer]);

  if (!ouvert) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cl-offre-titre"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) fermer();
      }}
      style={{
        position: "fixed", inset: 0, zIndex: 190, background: "rgba(23,32,28,.66)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 18, overflowY: "auto",
      }}
    >
      <div style={{
        position: "relative", width: "100%", maxWidth: 420, margin: "auto",
        background: "var(--dark, #1E3330)", color: "var(--on-dark, #F4EFE4)",
        borderRadius: 20, padding: "24px 20px 22px",
        boxShadow: "0 24px 70px rgba(23,32,28,.34)",
      }}>
        <button type="button" onClick={fermer} aria-label="Fermer"
          style={{
            position: "absolute", top: 10, right: 10, width: 44, height: 44,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "none", border: "none", cursor: "pointer", color: "var(--on-dark-3, #8FA09B)",
          }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <span className="cl-pill y">Avant de partir</span>
        <h2 id="cl-offre-titre" style={{ margin: "12px 0 8px", fontSize: 27, color: "#fff", lineHeight: 1.12 }}>
          Ton body scan<br />est offert.
        </h2>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--on-dark-2, #C3CCC7)" }}>
          45 minutes avec un coach, sans rien acheter et sans engagement.
        </p>

        <ul style={{ listStyle: "none", margin: "16px 0 18px", padding: 0, display: "flex", flexDirection: "column", gap: 9 }}>
          {AVANTAGES.map((a) => (
            <li key={a} style={{ display: "flex", gap: 10, fontSize: 14, color: "var(--on-dark-2, #C3CCC7)" }}>
              <span aria-hidden="true" style={{ color: "var(--yellow, #F1E27E)", fontWeight: 800, flex: "none" }}>✓</span>
              <span>{a}</span>
            </li>
          ))}
        </ul>

        <a className="cl-cta" href={R} onClick={fermer} style={{ width: "100%", minHeight: 50 }}>
          Réserver — c'est gratuit
        </a>
        <button type="button" onClick={fermer}
          style={{
            width: "100%", marginTop: 10, minHeight: 44, background: "none", border: "none",
            fontFamily: "inherit", fontSize: 15, color: "var(--on-dark-3, #8FA09B)",
            textDecoration: "underline", cursor: "pointer",
          }}>
          Non merci, je regarde
        </button>
      </div>
    </div>
  );
}
