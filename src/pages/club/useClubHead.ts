import { useEffect } from "react";
import { CLUB_RUE, CLUB_CODE_POSTAL, CLUB_VILLE, CLUB_TEL_HREF } from "../../data/clubInfos";

// Titre d'onglet + favicon + SEO Breakfast Club pour les VRAIS visiteurs du site
// public. Le SPA hérite sinon du titre/favicon « La Base 360 » de index.html
// (générique, pas adapté à une vitrine grand public). Les robots sociaux, eux,
// passent par api/club-meta (bot-rewrite) — ceci ne concerne que le navigateur
// humain, plus la meta description et les données structurées côté SEO.
//
// On retire les icônes de l'app le temps de la visite puis on les restaure à la
// sortie (un visiteur public ne navigue pas vers l'app coach, mais on reste propre).
const FAVICON = "/brand/breakfast-club/favicon.svg";

// Données structurées LocalBusiness — c'est ce qui alimente le panneau local de
// Google (la fiche à droite des résultats) et le rattachement à la ville.
//
// `url` était omis « tant que le domaine public définitif n'est pas fixé ». Il
// l'est depuis le 13/08 : www.labase-nutrition.com. Sans cette clé, rien ne
// reliait ces données structurées au site.
//
// La description reprend les termes que les gens tapent réellement — nutrition,
// petit-déjeuner, perte de poids, remise en forme, communauté — parce que
// l'objectif est de sortir sur « Verdun ». Aucune marque tierce : on ne se
// positionne pas sur un nom qu'on ne possède pas.
//
// `sameAs` : les comptes officiels du club, donnés par Thomas le 13/08. C'est
// ce qui permet à Google de relier le site, la fiche établissement et les
// réseaux comme une seule et même entreprise — utile pour sortir sur la ville.
//
// Toujours pas de coordonnées GPS en revanche : je ne les connais pas avec
// certitude, et une donnée structurée fausse vaut moins qu'une donnée absente.
const LOCAL_BUSINESS_LD = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Breakfast Club by La Base",
  url: "https://www.labase-nutrition.com/club",
  image: "https://www.labase-nutrition.com/api/og/club?path=club",
  sameAs: [
    "https://www.instagram.com/thebreakfastclub.verdun/",
    "https://www.facebook.com/profile.php?id=61592788492152",
  ],
  description:
    "Club de nutrition et de petit-déjeuner à Verdun : un rituel du matin, un suivi quotidien et une communauté. Accompagnement perte de poids, remise en forme et énergie. Body scan offert.",
  telephone: CLUB_TEL_HREF.replace("tel:", ""),
  priceRange: "€€",
  address: {
    "@type": "PostalAddress",
    streetAddress: CLUB_RUE,
    postalCode: CLUB_CODE_POSTAL,
    addressLocality: CLUB_VILLE,
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
