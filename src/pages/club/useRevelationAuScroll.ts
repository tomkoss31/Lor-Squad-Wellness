// =============================================================================
// useRevelationAuScroll — fait vivre le site du club sur les navigateurs qui
// ne savent PAS animer au défilement nativement.
//
// LE PROBLÈME QU'IL RÉSOUT
// Toutes les animations de ClubLandingPage.css sont enfermées dans
// `@supports (animation-timeline: view())`. Quand le navigateur ne connaît pas
// cette propriété, il ne joue pas une version dégradée : il ignore le bloc en
// entier. La page ne bouge alors pas d'un pixel — pas « moins d'animations »,
// aucune. C'est le cas selon les versions de Safari, donc potentiellement sur
// l'iPhone depuis lequel Thomas regarde le site le plus souvent.
//
// LA RÈGLE DE SÛRETÉ
// Un rideau qui se lève au JavaScript est le moyen le plus courant de rendre
// une page définitivement blanche : le CSS cache, le script ne tourne pas,
// plus rien n'apparaît. Ici le masquage est conditionné à `html.cl-repli-js`,
// posée par ce fichier et par lui seul. Pas de script, pas de classe, donc
// rien de caché — la page reste simplement immobile, comme aujourd'hui.
// Un filet de sécurité découvre en plus tout ce qui n'aurait pas été vu au
// bout de trois secondes.
// =============================================================================

import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

// Les deux mêmes familles que le bloc natif anime : les blocs qui montent, et
// les images d'emplacement qui se dézooment. Les pastilles de fond
// (`.cl-blob`) en sont exclues : elles flottent EN CONTINU avec le
// défilement, ce qu'un observateur d'entrée ne sait pas reproduire. Immobiles,
// elles restent un décor de fond correct.
const CIBLES = ".cl-rv, .cl-slot img";
const CLASSE_ARMEE = "cl-repli-js";
const FILET_MS = 3000;

export function useRevelationAuScroll() {
  const { pathname } = useLocation();

  // useLayoutEffect et non useEffect : la classe doit être posée AVANT que le
  // navigateur peigne, sinon on voit le contenu apparaître puis se cacher.
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    // Le navigateur sait faire nativement -> ne rien doubler.
    if (window.CSS?.supports?.("animation-timeline", "view()")) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    const cibles = Array.from(document.querySelectorAll<HTMLElement>(CIBLES));
    if (cibles.length === 0) return;

    document.documentElement.classList.add(CLASSE_ARMEE);

    const decouvrir = (el: Element) => el.classList.add("est-vu");

    const io = new IntersectionObserver(
      (entrees) => {
        entrees.forEach((e) => {
          if (!e.isIntersecting) return;
          io.unobserve(e.target);
          decouvrir(e.target);
        });
      },
      // Un seuil bas et une marge basse négative : le bloc se révèle quand il
      // est franchement entré, pas dès que son premier pixel affleure.
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    cibles.forEach((c) => io.observe(c));

    // Filet : si un élément n'est jamais « vu » (parent masqué au montage,
    // observateur qui ne se déclenche pas), on le découvre quand même.
    const filet = window.setTimeout(() => cibles.forEach(decouvrir), FILET_MS);

    return () => {
      io.disconnect();
      window.clearTimeout(filet);
      // La classe n'est PAS retirée : la page suivante du club en a besoin dès
      // son premier rendu, et la retirer entre deux pages ferait clignoter le
      // contenu. Elle ne pilote que des sélecteurs `.cl-*`, absents partout
      // ailleurs.
    };
  }, [pathname]);
}
