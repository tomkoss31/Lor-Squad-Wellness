import { useEffect } from "react";

// Titre d'onglet + favicon Breakfast Club pour les VRAIS visiteurs du site public.
// Le SPA hérite sinon du titre/favicon « La Base 360 » de index.html (générique,
// pas adapté à une vitrine grand public). Les robots sociaux, eux, passent par
// api/club-meta (bot-rewrite) — ceci ne concerne que l'onglet du navigateur humain.
//
// On retire les icônes de l'app le temps de la visite puis on les restaure à la
// sortie (un visiteur public ne navigue pas vers l'app coach, mais on reste propre).
const FAVICON = "/brand/breakfast-club/favicon.svg";

export function useClubHead(title: string): void {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;

    const head = document.head;
    const originals = Array.from(
      head.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]'),
    ) as HTMLLinkElement[];
    originals.forEach((l) => l.remove());

    const link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/svg+xml";
    link.href = FAVICON;
    head.appendChild(link);

    return () => {
      document.title = prevTitle;
      link.remove();
      originals.forEach((l) => head.appendChild(l));
    };
  }, [title]);
}
