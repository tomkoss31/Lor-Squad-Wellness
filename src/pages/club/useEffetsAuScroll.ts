// =============================================================================
// useEffetsAuScroll — ce qui bouge quand on descend le site du club.
// Maquette validée par Thomas le 13/08 : cartes en cascade, bande photo en
// profondeur, en-tête qui se tasse, barre de progression.
//
// POURQUOI TOUT PASSE PAR LE JAVASCRIPT ICI
// Le CSS du site anime déjà les blocs, mais uniquement derrière
// `@supports (animation-timeline: view())`. Ce bloc est tout ou rien : un
// navigateur qui ignore la propriété le saute en entier, et la page devient
// parfaitement immobile — c'est le cas selon les versions de Safari, donc
// potentiellement sur l'iPhone depuis lequel Thomas regarde le plus souvent.
// Les effets ci-dessous reposent donc sur un observateur d'entrée et un
// écouteur de défilement, qui marchent partout, plutôt que d'exister deux fois.
//
// LA RÈGLE DE SÛRETÉ, LA MÊME QUE POUR LE REPLI
// Rien n'est caché tant que ce fichier n'a pas posé `html.cl-anim-js`. Pas de
// script, pas de classe, donc pas de page blanche : le site s'affiche
// simplement immobile. Un filet découvre en plus tout ce qui n'aurait pas été
// vu au bout de trois secondes.
// =============================================================================

import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

const CLASSE_ARMEE = "cl-anim-js";
const FILET_MS = 3000;
/** Décalage entre deux cartes voisines. Remis à zéro toutes les 4 : au-delà,
 *  la dernière d'une longue liste attendrait près d'une seconde. */
const PAS_MS = 90;
const PAR_VAGUE = 4;
/** Amplitude maximale de la dérive des photos, en pixels. Essayé plus ample :
 *  les photos se décollent les unes des autres et on voit la coupure. */
const DERIVE_MAX = 14;

/** Creux au centre, nul aux bords — les cases extrêmes touchent le bord de
 *  l'écran, les faire bouger montrerait le vide. */
function amplitude(i: number, n: number): number {
  if (n < 3) return 0;
  return Math.round(DERIVE_MAX * Math.sin((Math.PI * i) / (n - 1)));
}

export function useEffetsAuScroll() {
  const { pathname } = useLocation();

  // useLayoutEffect et non useEffect : la classe doit être posée AVANT le
  // premier peint, sinon on voit le contenu apparaître puis se cacher.
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const html = document.documentElement;
    const nettoyage: Array<() => void> = [];

    // ── 1. Les cartes arrivent l'une après l'autre ──────────────────────────
    // C'est l'effet principal : le site montait déjà ses sections, mais d'un
    // seul tenant. Quatre cartes qui apparaissent en même temps ne se lisent
    // pas comme du mouvement.
    const cartes = Array.from(document.querySelectorAll<HTMLElement>(".cl-card"));
    if (cartes.length > 0 && "IntersectionObserver" in window) {
      html.classList.add(CLASSE_ARMEE);

      // Le rang se compte DANS le conteneur, pas dans la page : sinon la
      // première carte d'une section serait décalée selon ce qui la précède.
      const rang = new Map<HTMLElement, number>();
      for (const c of cartes) {
        const parent = c.parentElement;
        if (!parent) { rang.set(c, 0); continue; }
        rang.set(c, Array.from(parent.children).indexOf(c) % PAR_VAGUE);
      }

      const minuteries: number[] = [];
      const io = new IntersectionObserver(
        (entrees) => {
          for (const e of entrees) {
            if (!e.isIntersecting) continue;
            io.unobserve(e.target);
            const el = e.target as HTMLElement;
            minuteries.push(
              window.setTimeout(() => el.classList.add("est-vu"), (rang.get(el) ?? 0) * PAS_MS),
            );
          }
        },
        { threshold: 0.15, rootMargin: "0px 0px -6% 0px" },
      );
      cartes.forEach((c) => io.observe(c));

      // Filet : une carte jamais « vue » (parent masqué au montage, observateur
      // qui ne se déclenche pas) finit par se montrer quand même.
      const filet = window.setTimeout(() => cartes.forEach((c) => c.classList.add("est-vu")), FILET_MS);

      nettoyage.push(() => {
        io.disconnect();
        window.clearTimeout(filet);
        minuteries.forEach(window.clearTimeout);
      });
    }

    // ── 2, 3, 4. Ce qui suit le doigt ───────────────────────────────────────
    const bandes = Array.from(document.querySelectorAll<HTMLElement>(".cl-photoband"));
    const entete = document.querySelector<HTMLElement>(".cl-header");

    // La barre de progression : sur l'accueil seulement. Les pages internes
    // sont courtes, un fil de lecture n'y dirait rien. L'accueil, lui, fait
    // près de 12 000 px.
    let barre: HTMLElement | null = null;
    if (pathname === "/club") {
      barre = document.createElement("div");
      barre.className = "cl-progress";
      barre.setAttribute("aria-hidden", "true");
      document.body.appendChild(barre);
      nettoyage.push(() => barre?.remove());
    }

    let enAttente = false;
    const auDefilement = () => {
      enAttente = false;
      const doc = document.documentElement;
      const y = doc.scrollTop || document.body.scrollTop;

      if (barre) {
        const max = doc.scrollHeight - window.innerHeight;
        barre.style.width = (max > 0 ? Math.min(100, (y / max) * 100) : 0) + "%";
      }
      if (entete) entete.classList.toggle("est-tasse", y > 60);

      for (const bande of bandes) {
        const photos = Array.from(bande.querySelectorAll<HTMLElement>("img"));
        if (photos.length === 0) continue;
        const r = bande.getBoundingClientRect();
        // −1 quand la bande sort par le haut, +1 quand elle entre par le bas.
        const demi = window.innerHeight / 2;
        let t = (r.top + r.height / 2 - demi) / (demi + r.height / 2);
        t = Math.max(-1, Math.min(1, t));
        photos.forEach((p, i) => {
          p.style.transform = `translateY(${(t * amplitude(i, photos.length)).toFixed(1)}px)`;
        });
      }
    };
    const planifier = () => {
      if (!enAttente) { enAttente = true; requestAnimationFrame(auDefilement); }
    };

    window.addEventListener("scroll", planifier, { passive: true });
    window.addEventListener("resize", planifier);
    nettoyage.push(() => {
      window.removeEventListener("scroll", planifier);
      window.removeEventListener("resize", planifier);
      entete?.classList.remove("est-tasse");
      bandes.forEach((b) => b.querySelectorAll<HTMLElement>("img").forEach((p) => (p.style.transform = "")));
    });

    // Directement, pas via requestAnimationFrame : l'état de départ doit être
    // juste même si la première image tarde à être composée.
    auDefilement();

    return () => nettoyage.forEach((f) => f());
    // La classe `cl-anim-js` n'est PAS retirée : la page suivante du club en a
    // besoin dès son premier rendu, et la retirer entre deux pages ferait
    // clignoter le contenu. Elle ne pilote que des sélecteurs `.cl-*`.
  }, [pathname]);
}
