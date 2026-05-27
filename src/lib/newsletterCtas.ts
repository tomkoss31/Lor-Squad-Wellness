// =============================================================================
// newsletterCtas.ts — Chantier #8 étape 8.10 (2026-05-24).
// Variantes saisonnières des CTAs (Bilan + Business) pour les newsletters.
// =============================================================================
//
// Décision actée brainstorm Égypte D4.3 : 4 saisons + neutre.
// Utilisé par compileNewsletterHtml (email Deno) + PublicNewsletterPage (web).
// =============================================================================

export type NewsletterSeason = "summer" | "autumn" | "winter" | "spring" | "neutral";

export interface BilanCta {
  title: string;
  subtitle: string;
  buttonText: string;
}

export interface BusinessCta {
  tag: string;
  title: string;
  description: string;
  buttonText: string;
}

export interface NewsletterCtas {
  bilan: BilanCta;
  business: BusinessCta;
}

/**
 * Détecte la saison depuis (template_key prioritaire, sinon date d'envoi).
 * Mai-juillet = été (préparation), août-octobre = rentrée, nov-fev = hiver,
 * mars-avril = printemps. Neutre si pas de date.
 */
export function detectSeason(
  sentAt: string | null | undefined,
  templateKey: string | null | undefined,
): NewsletterSeason {
  if (templateKey === "summer-prep") return "summer";
  if (templateKey === "back-to-school") return "autumn";
  if (templateKey === "winter-immunity") return "winter";
  if (templateKey === "new-year-fresh") return "spring";

  if (!sentAt) return "neutral";
  const m = new Date(sentAt).getMonth() + 1; // 1-12
  if (m >= 5 && m <= 7) return "summer";
  if (m >= 8 && m <= 10) return "autumn";
  if (m === 11 || m === 12 || m <= 2) return "winter";
  return "spring"; // mars + avril
}

const CTAS_BY_SEASON: Record<NewsletterSeason, NewsletterCtas> = {
  summer: {
    bilan: {
      title: "Prêt(e) pour l'été ?",
      subtitle: "Fais ton bilan personnalisé en 2 min",
      buttonText: "Je commence",
    },
    business: {
      tag: "💼 Opportunité",
      title: "Tu pensais auto-financer tes vacances ?",
      description:
        "Découvre comment notre équipe accompagne celles et ceux qui veulent transformer leur passion santé en revenus complémentaires.",
      buttonText: "Je découvre l'opportunité →",
    },
  },
  autumn: {
    bilan: {
      title: "Cette rentrée, tu repars du bon pied ?",
      subtitle: "Bilan personnalisé en 2 min",
      buttonText: "Je fais mon bilan",
    },
    business: {
      tag: "💼 Opportunité rentrée",
      title: "Tu pensais auto-financer la rentrée des enfants ?",
      description:
        "La rentrée coûte cher. Découvre comment certains de nos coachs ont créé un revenu complémentaire qui finance école, sport, loisirs des kids.",
      buttonText: "Je découvre l'opportunité →",
    },
  },
  winter: {
    bilan: {
      title: "Boost ton immunité avant l'hiver",
      subtitle: "Bilan personnalisé en 2 min — sommeil, énergie, défenses",
      buttonText: "Je commence",
    },
    business: {
      tag: "💼 Opportunité",
      title: "Tu pensais auto-financer tes cadeaux de Noël ?",
      description:
        "Décembre arrive vite. Découvre comment notre équipe accompagne celles et ceux qui veulent un revenu complémentaire pour vivre les fêtes sans stress.",
      buttonText: "Je découvre l'opportunité →",
    },
  },
  spring: {
    bilan: {
      title: "Nouvelle année, nouveau toi ?",
      subtitle: "Fais le point en 2 min — bilan personnalisé",
      buttonText: "Je commence",
    },
    business: {
      tag: "💼 Opportunité",
      title: "Tu pensais auto-financer tes projets de l'année ?",
      description:
        "Nouvelle année = nouveaux projets. Découvre comment notre équipe accompagne celles et ceux qui veulent créer un revenu complémentaire en partant du bon pied.",
      buttonText: "Je découvre l'opportunité →",
    },
  },
  neutral: {
    bilan: {
      title: "Envie de comprendre ton corps ?",
      subtitle: "Fais ton bilan personnalisé en 2 min",
      buttonText: "Je commence",
    },
    business: {
      tag: "💼 Opportunité",
      title: "Et si tu vivais de ta passion santé ?",
      description:
        "Découvre comment notre équipe accompagne celles et ceux qui veulent transformer leur passion santé en revenus complémentaires.",
      buttonText: "Je découvre l'opportunité →",
    },
  },
};

export function getNewsletterCtas(
  sentAt: string | null | undefined,
  templateKey: string | null | undefined,
): NewsletterCtas {
  return CTAS_BY_SEASON[detectSeason(sentAt, templateKey)];
}
