// =============================================================================
// Registre central des tutoriels vidéo (#6 Vidéos pédagogiques, 2026-06-09).
//
// 👉 POUR THOMAS : pour activer une vidéo, colle simplement l'URL YouTube dans
//    `youtubeUrl` de l'entrée correspondante ci-dessous. C'est tout.
//    - URL acceptées : https://youtu.be/XXXX  ·  https://www.youtube.com/watch?v=XXXX
//    - Laisse `youtubeUrl: ""` tant que la vidéo n'est pas prête → le bouton
//      affiche un état discret « 🎬 bientôt » (non cliquable).
//
// Pour AJOUTER un tuto ailleurs dans l'app : ajoute une entrée ici (une clé +
// un titre), puis place `<TutorialLink tutorialKey="ta-cle" />` où tu veux.
// =============================================================================

export interface TutorialVideo {
  /** Titre affiché dans la modale + le bouton (tooltip). */
  title: string;
  /** Sous-titre court optionnel (sous le titre dans la modale). */
  description?: string;
  /** URL YouTube. Vide = pas encore dispo (bouton « bientôt »). */
  youtubeUrl: string;
}

export const TUTORIALS: Record<string, TutorialVideo> = {
  copilote: {
    title: "Le Co-pilote en 2 minutes",
    description: "Ta page d'accueil : RDV, suivis, jauge PV, météo.",
    youtubeUrl: "",
  },
  flex: {
    title: "Comprendre FLEX",
    description: "Tes cibles, ta marge, comment lire le tableau de bord.",
    youtubeUrl: "",
  },
  bilan: {
    title: "Faire un bilan client",
    description: "De la prise de mesures au programme proposé.",
    youtubeUrl: "",
  },
  pv: {
    title: "Suivre tes PV",
    description: "Saisie, historique, objectif mensuel.",
    youtubeUrl: "",
  },
  agenda: {
    title: "Gérer ton agenda",
    description: "RDV clients, prospects, rappels.",
    youtubeUrl: "",
  },
  clients: {
    title: "Gérer tes dossiers clients",
    description: "Filtres, kanban, relances, messages groupés.",
    youtubeUrl: "",
  },
  messagerie: {
    title: "La messagerie client",
    description: "Répondre, archiver, demandes à traiter.",
    youtubeUrl: "",
  },
  prospection: {
    title: "Prospecter à froid",
    description: "Les scripts par profil et par marché.",
    youtubeUrl: "",
  },
  "fiche-publique": {
    title: "Ta fiche coach publique",
    description: "La partager sur Insta/WhatsApp pour capter des prospects.",
    youtubeUrl: "",
  },
  rentabilite: {
    title: "La jauge de rentabilité",
    description: "Comprendre ton EBE et tes leviers.",
    youtubeUrl: "",
  },
};

export type TutorialKey = keyof typeof TUTORIALS;

/** Extrait l'ID YouTube d'une URL (watch / youtu.be / embed). Null si invalide. */
export function youtubeIdFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1) || null;
    if (u.hostname.endsWith("youtube.com")) {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      if (u.pathname.startsWith("/embed/")) return u.pathname.split("/")[2] || null;
    }
  } catch {
    /* url vide ou invalide */
  }
  return null;
}
