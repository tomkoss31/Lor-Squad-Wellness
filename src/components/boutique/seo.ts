// Helper SEO des pages boutique.
//
// L'app est une SPA : sans écrasement explicite, chaque page publique hérite de
// la <meta name="description"> de index.html (« La Base 360 — club nutrition à
// Verdun »), qui n'a rien à voir avec une boutique de cosmétiques. Google et les
// aperçus de partage affichaient donc le mauvais texte.

export function setMetaDescription(content: string): void {
  if (typeof document === "undefined") return;
  let tag = document.querySelector('meta[name="description"]');
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", "description");
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content.slice(0, 300));
}
