// =============================================================================
// profileDeepLink — construit l'URL deep-link d'un contact selon sa plateforme
// (Phase 0.8 brainstorm Égypte 2026-05)
// =============================================================================
//
// Pour chaque plateforme, on accepte soit un username, soit une URL complète
// déjà valide (auquel cas on la retourne telle quelle). Cela permet à Thomas
// de coller indifféremment "berges_account" ou "https://instagram.com/berges_account"
// sans se prendre la tête.
//
// WhatsApp : si pas de profile_url, on retombe sur le téléphone du contact
// (raison : sur WhatsApp le deep link standard est `wa.me/<phone>`).
// =============================================================================

export type ContactPlatform =
  | "instagram"
  | "whatsapp"
  | "facebook"
  | "linkedin"
  | "telegram"
  | "tiktok"
  | "twitter"
  | "snapchat"
  | "irl"
  | "autre";

export const PLATFORM_META: Record<
  ContactPlatform,
  { label: string; emoji: string; placeholder: string }
> = {
  instagram: { label: "Instagram", emoji: "📷", placeholder: "username ou URL" },
  whatsapp: { label: "WhatsApp", emoji: "💬", placeholder: "n° tél (utilise le téléphone si vide)" },
  facebook: { label: "Facebook", emoji: "📘", placeholder: "username ou URL" },
  linkedin: { label: "LinkedIn", emoji: "💼", placeholder: "username ou URL /in/…" },
  telegram: { label: "Telegram", emoji: "✈️", placeholder: "username (sans @)" },
  tiktok: { label: "TikTok", emoji: "🎵", placeholder: "username (sans @)" },
  twitter: { label: "X (Twitter)", emoji: "🐦", placeholder: "username (sans @)" },
  snapchat: { label: "Snapchat", emoji: "👻", placeholder: "username" },
  irl: { label: "IRL", emoji: "🤝", placeholder: "lieu ou contexte" },
  autre: { label: "Autre", emoji: "🌐", placeholder: "URL ou note" },
};

const ALL_PLATFORMS: ContactPlatform[] = [
  "instagram",
  "whatsapp",
  "facebook",
  "linkedin",
  "telegram",
  "tiktok",
  "twitter",
  "snapchat",
  "irl",
  "autre",
];

export function listPlatforms(): ContactPlatform[] {
  return ALL_PLATFORMS;
}

export function isContactPlatform(value: string | null | undefined): value is ContactPlatform {
  return !!value && (ALL_PLATFORMS as string[]).includes(value);
}

function stripAt(s: string): string {
  return s.replace(/^@+/, "").trim();
}

function isFullUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim());
}

function phoneToE164NoPlus(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.startsWith("0")) return "33" + digits.slice(1);
  return digits;
}

/**
 * Construit l'URL deep-link d'un contact.
 * - Retourne null si la plateforme ne supporte pas de deep link (IRL, autre sans URL).
 * - Retourne null si on n'a aucune info exploitable.
 *
 * `fallbackPhone` : utilisé pour WhatsApp si `usernameOrUrl` est vide.
 */
export function buildProfileUrl(
  platform: ContactPlatform | null,
  usernameOrUrl: string | null,
  fallbackPhone?: string | null,
): string | null {
  if (!platform) return null;
  const raw = (usernameOrUrl ?? "").trim();

  // URL complète : on respecte (sauf IRL où ça n'a pas de sens deep-link)
  if (raw && isFullUrl(raw) && platform !== "irl") {
    return raw;
  }

  switch (platform) {
    case "instagram": {
      const u = stripAt(raw);
      return u ? `https://instagram.com/${encodeURIComponent(u)}` : null;
    }
    case "whatsapp": {
      const phone = raw || fallbackPhone || "";
      const e164 = phone ? phoneToE164NoPlus(phone) : "";
      return e164 ? `https://wa.me/${e164}` : null;
    }
    case "facebook": {
      const u = stripAt(raw);
      return u ? `https://facebook.com/${encodeURIComponent(u)}` : null;
    }
    case "linkedin": {
      const u = stripAt(raw);
      if (!u) return null;
      // Si l'utilisateur a tapé "in/username" ou juste "username", normaliser
      const cleaned = u.startsWith("in/") ? u : `in/${u}`;
      return `https://www.linkedin.com/${cleaned}`;
    }
    case "telegram": {
      const u = stripAt(raw);
      return u ? `https://t.me/${encodeURIComponent(u)}` : null;
    }
    case "tiktok": {
      const u = stripAt(raw);
      return u ? `https://www.tiktok.com/@${encodeURIComponent(u)}` : null;
    }
    case "twitter": {
      const u = stripAt(raw);
      return u ? `https://x.com/${encodeURIComponent(u)}` : null;
    }
    case "snapchat": {
      const u = stripAt(raw);
      return u ? `https://www.snapchat.com/add/${encodeURIComponent(u)}` : null;
    }
    case "irl":
      return null;
    case "autre":
      return null;
  }
}
