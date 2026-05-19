// =============================================================================
// countries — liste curée de pays pour la Liste 100 (2026-05-19)
// =============================================================================
//
// Liste optimisée pour le contexte Thomas (coach FR avec ambitions
// internationales — francophonie + Europe + LatAm + marchés Herbalife
// prioritaires). Pas exhaustif (200 pays = liste imbuvable dans un
// select). 22 pays + "Autre" pour les cas hors-liste.
//
// Code = ISO 3166 alpha-2 (standard). Drapeaux Twemoji emoji rendus
// via la font-family Twemoji Country Flags (cf. globals.css).
// =============================================================================

export interface CountryMeta {
  /** ISO 3166 alpha-2 uppercase (FR, BE, CH, etc.). */
  code: string;
  /** Drapeau emoji regional indicators (rendu Twemoji). */
  flag: string;
  /** Nom français du pays. */
  label: string;
}

const COUNTRIES: CountryMeta[] = [
  // Francophonie
  { code: "FR", flag: "🇫🇷", label: "France" },
  { code: "BE", flag: "🇧🇪", label: "Belgique" },
  { code: "CH", flag: "🇨🇭", label: "Suisse" },
  { code: "CA", flag: "🇨🇦", label: "Canada" },
  { code: "LU", flag: "🇱🇺", label: "Luxembourg" },
  // Maghreb + Afrique francophone
  { code: "MA", flag: "🇲🇦", label: "Maroc" },
  { code: "DZ", flag: "🇩🇿", label: "Algérie" },
  { code: "TN", flag: "🇹🇳", label: "Tunisie" },
  { code: "SN", flag: "🇸🇳", label: "Sénégal" },
  { code: "CI", flag: "🇨🇮", label: "Côte d'Ivoire" },
  // Europe
  { code: "GB", flag: "🇬🇧", label: "Royaume-Uni" },
  { code: "ES", flag: "🇪🇸", label: "Espagne" },
  { code: "PT", flag: "🇵🇹", label: "Portugal" },
  { code: "IT", flag: "🇮🇹", label: "Italie" },
  { code: "DE", flag: "🇩🇪", label: "Allemagne" },
  { code: "NL", flag: "🇳🇱", label: "Pays-Bas" },
  // Amériques
  { code: "US", flag: "🇺🇸", label: "États-Unis" },
  { code: "BR", flag: "🇧🇷", label: "Brésil" },
  { code: "MX", flag: "🇲🇽", label: "Mexique" },
  // Asie + Méditerranée
  { code: "TR", flag: "🇹🇷", label: "Turquie" },
  { code: "IN", flag: "🇮🇳", label: "Inde" },
  // Fallback générique (pas d'emoji drapeau — globe)
  { code: "XX", flag: "🌍", label: "Autre" },
];

const COUNTRIES_BY_CODE: Record<string, CountryMeta> = Object.fromEntries(
  COUNTRIES.map((c) => [c.code, c]),
);

export function listCountries(): CountryMeta[] {
  return COUNTRIES;
}

export function getCountry(code: string | null | undefined): CountryMeta | null {
  if (!code) return null;
  return COUNTRIES_BY_CODE[code.toUpperCase()] ?? null;
}
