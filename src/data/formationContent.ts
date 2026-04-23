// Chantier Centre de Formation V1 (2026-04-24).
// Catalogue statique V1 : 4 catégories avec vidéos YouTube embed +
// PDFs téléchargeables. À enrichir au fil de l'eau via ce fichier.

export interface FormationResource {
  id: string;
  title: string;
  description: string;
  /** YouTube video ID (ex: "dQw4w9WgXcQ") OU URL PDF */
  videoId?: string;
  pdfUrl?: string;
  durationMin?: number;
  tag?: string;
}

export interface FormationCategory {
  slug: string;
  title: string;
  emoji: string;
  accent: "teal" | "gold" | "magenta" | "violet";
  description: string;
  resources: FormationResource[];
}

export const FORMATION_CATEGORIES: FormationCategory[] = [
  {
    slug: "prospection",
    title: "Prospection & Recrutement",
    emoji: "🎯",
    accent: "gold",
    description: "Les bases pour trouver des prospects chauds et construire ton équipe.",
    resources: [
      {
        id: "prospect-01",
        title: "Les 3 phrases d'accroche qui convertissent",
        description: "Ouvre une conversation en 10 secondes avec n'importe qui.",
        videoId: "dQw4w9WgXcQ",
        durationMin: 12,
        tag: "Fondamentaux",
      },
      {
        id: "prospect-02",
        title: "Réseaux sociaux — stratégie Insta+TikTok",
        description: "Construis une audience qualifiée sans spammer.",
        videoId: "dQw4w9WgXcQ",
        durationMin: 18,
        tag: "Digital",
      },
      {
        id: "prospect-03",
        title: "Script téléphone prospect froid",
        description: "Modèle à dupliquer pour tes appels.",
        pdfUrl: "/formation/pdf/script-tel-prospect.pdf",
        tag: "Script",
      },
    ],
  },
  {
    slug: "bilan",
    title: "Bilan & Body Scan",
    emoji: "📊",
    accent: "teal",
    description: "Maîtrise le déroulé du bilan initial pour poser un cadre pro.",
    resources: [
      {
        id: "bilan-01",
        title: "Déroulé complet d'un bilan en 45 min",
        description: "Étape par étape, avec les questions qui font le déclic.",
        videoId: "dQw4w9WgXcQ",
        durationMin: 28,
        tag: "Essentiel",
      },
      {
        id: "bilan-02",
        title: "Interpréter un body scan (Tanita)",
        description: "Masse grasse, hydratation, masse musc : lire pour bien orienter.",
        videoId: "dQw4w9WgXcQ",
        durationMin: 15,
        tag: "Technique",
      },
      {
        id: "bilan-03",
        title: "Check-list matériel pour un bilan réussi",
        description: "Tout ce qu'il te faut pour un RDV fluide.",
        pdfUrl: "/formation/pdf/checklist-materiel-bilan.pdf",
        tag: "Check-list",
      },
    ],
  },
  {
    slug: "suivi",
    title: "Suivi & Fidélisation",
    emoji: "💪",
    accent: "violet",
    description: "Garde tes clients motivés dans la durée et transforme-les en ambassadeurs.",
    resources: [
      {
        id: "suivi-01",
        title: "Le suivi qui change tout : J+2, J+7, J+15",
        description: "Le protocole qui multiplie par 3 la rétention.",
        videoId: "dQw4w9WgXcQ",
        durationMin: 14,
        tag: "Protocole",
      },
      {
        id: "suivi-02",
        title: "Gérer un client qui décroche",
        description: "Les 4 leviers pour le remettre en selle sans pression.",
        videoId: "dQw4w9WgXcQ",
        durationMin: 11,
        tag: "Relationnel",
      },
      {
        id: "suivi-03",
        title: "Messages types pour relances WhatsApp",
        description: "10 templates prêts à copier-coller.",
        pdfUrl: "/formation/pdf/templates-whatsapp.pdf",
        tag: "Templates",
      },
    ],
  },
  {
    slug: "business",
    title: "Business & 100 clubs",
    emoji: "🚀",
    accent: "magenta",
    description: "Structure ton activité pour passer de coach solo à leader d'équipe.",
    resources: [
      {
        id: "biz-01",
        title: "Les piliers du 100 clubs",
        description: "Le plan de route clair pour atteindre ton premier 100 clubs.",
        videoId: "dQw4w9WgXcQ",
        durationMin: 25,
        tag: "Vision",
      },
      {
        id: "biz-02",
        title: "Former ton premier distributeur",
        description: "La méthode qui évite le turnover et crée des leaders.",
        videoId: "dQw4w9WgXcQ",
        durationMin: 22,
        tag: "Leadership",
      },
      {
        id: "biz-03",
        title: "Organisation d'une journée type",
        description: "Comment gérer 15+ clients actifs sans te cramer.",
        pdfUrl: "/formation/pdf/journee-type.pdf",
        tag: "Productivité",
      },
    ],
  },
];

export function getFormationCategory(slug: string): FormationCategory | undefined {
  return FORMATION_CATEGORIES.find((c) => c.slug === slug);
}
