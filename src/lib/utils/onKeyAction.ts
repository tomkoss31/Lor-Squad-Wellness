// onKeyAction — helper a11y pour les divs clickables (2026-04-30)
//
// Pattern frequent : un <div onClick={handleClick}> qui semantiquement
// devrait etre un <button>. Pour eviter le refactor massif, on l accepte
// mais on ajoute le handler clavier Enter/Space pour respecter WCAG.
//
// Usage :
//   <div
//     role="button"
//     tabIndex={0}
//     onClick={handleClick}
//     onKeyDown={onKeyAction(handleClick)}
//   >
//
// Pour les backdrops de modale (cosmetique souris uniquement, ESC au
// niveau dialog), utiliser plutot role="presentation" et silence le
// warning ESLint avec un commentaire.

import type { KeyboardEvent } from "react";

/**
 * Retourne un onKeyDown handler qui declenche `action` sur Enter ou Space.
 * Empeche le scroll par defaut sur Space.
 */
export function onKeyAction<T = HTMLElement>(action: () => void) {
  return (e: KeyboardEvent<T>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      action();
    }
  };
}
