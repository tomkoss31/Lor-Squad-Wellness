import { useEffect } from "react";

// Titre d'onglet + favicon + SEO Breakfast Club pour les VRAIS visiteurs du site
// public. Le SPA hérite sinon du titre/favicon « La Base 360 » de index.html
// (générique, pas adapté à une vitrine grand public). Les robots sociaux, eux,
// passent par api/club-meta (bot-rewrite) — ceci ne concerne que le navigateur
// humain, plus la meta description et les données structurées côté SEO.
//
// On retire les icônes de l'app le temps de la visite puis on les restaure à la
// sortie (un visiteur public ne navigue pas vers l'app coach, mais on reste propre).
const FAVICON = "/brand/breakfast-club/favicon.svg";

// Données structurées LocalBusiness (SEO local, améliore le référencement Google).
// `url` volontairement omis tant que le domaine public définitif n'est pas fixé —
// JSON-LD reste valide sans. Injecté une seule fois par le hook.
const LOCAL_BUSINESS_LD = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Breakfast Club by La Base",
  description:
    "Club de petit-déjeuner à Verdun : aloe vera, thé aux plantes, smoothie nutritionnel et suivi quotidien.",
  telephone: "+33679448759",
  priceRange: "€€",
  address: {
    "@type": "PostalAddress",
    streetAddress: "11 rue Saint Pierre",
    postalCode: "55100",
    addressLocality: "Verdun",
    addressCountry: "FR",
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "07:00",
      closes: "11:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Saturday"],
      opens: "08:00",
      closes: "11:00",
    },
  ],
};

export function useClubHead(title: string, description?: string): void {
  useEffect(() => {
    const head = document.head;
    const prevTitle = document.title;
    document.title = title;

    // Favicon Breakfast Club (retire ceux de l'app, restaure à la sortie).
    const originals = Array.from(
      head.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]'),
    ) as HTMLLinkElement[];
    originals.forEach((l) => l.remove());

    const link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/svg+xml";
    link.href = FAVICON;
    head.appendChild(link);

    // Meta description — mémorise l'ancienne valeur (ou la création) pour restaurer.
    let metaDesc: HTMLMetaElement | null = null;
    let createdDesc = false;
    let prevDescContent: string | null = null;
    if (description) {
      metaDesc = head.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (metaDesc) {
        prevDescContent = metaDesc.getAttribute("content");
      } else {
        metaDesc = document.createElement("meta");
        metaDesc.setAttribute("name", "description");
        head.appendChild(metaDesc);
        createdDesc = true;
      }
      metaDesc.setAttribute("content", description);
    }

    // Données structurées LocalBusiness (une seule instance à la fois).
    head.querySelectorAll("script[data-club-ld]").forEach((s) => s.remove());
    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.setAttribute("data-club-ld", "1");
    ld.textContent = JSON.stringify(LOCAL_BUSINESS_LD);
    head.appendChild(ld);

    return () => {
      document.title = prevTitle;
      link.remove();
      originals.forEach((l) => head.appendChild(l));
      if (metaDesc) {
        if (createdDesc) metaDesc.remove();
        else if (prevDescContent !== null) metaDesc.setAttribute("content", prevDescContent);
      }
      ld.remove();
    };
  }, [title, description]);
}
