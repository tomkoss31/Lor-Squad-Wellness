// Défilement vers une section de la boutique.
//
// On n'utilise PAS scrollIntoView : il ignore l'en-tête collant (le titre de la
// section se retrouve masqué dessous) et il s'est révélé inopérant dans certains
// navigateurs embarqués. Un window.scrollTo avec décalage est fiable partout.

/** Hauteur de la barre collante (.bk-bar = 64px) + une marge de respiration. */
const HEADER_OFFSET = 78;

export function scrollToSection(id: string, delayMs = 0): boolean {
  const el = document.getElementById(id);
  if (!el) return false;
  const run = () => {
    const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  };
  if (delayMs > 0) window.setTimeout(run, delayMs);
  else run();
  return true;
}
