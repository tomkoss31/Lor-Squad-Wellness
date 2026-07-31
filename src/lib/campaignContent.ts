// =============================================================================
// campaignContent — modèle de contenu d'une campagne riche + valeurs par défaut.
// Chantier Campagnes, étape 4 (2026-08).
//
// Volontairement SIMPLE (Thomas : « un bouton bascule simple pour éditer un
// texte », pas le monstre 1982 lignes de l'éditeur newsletter). Un hero, des
// blocs texte, une offre optionnelle, un bouton optionnel.
//
// À l'envoi (étape 5), ce modèle sera MAPPÉ vers NewsletterSection[] et compilé
// par newsletter-html.ts (le moteur brandé déjà en prod) — donc on réutilise le
// rendu ttesté sans hériter des champs propres à la newsletter (paywall,
// saviez-vous, CTA bilan…).
//
// `{prénom}` dans n'importe quel champ texte est remplacé par le prénom du
// destinataire à l'envoi (ou retiré proprement si absent).
// =============================================================================

export interface CampaignBlock {
  id: string;
  emoji: string;
  title: string;
  body: string;
}

export interface CampaignOffer {
  enabled: boolean;
  label: string; // « Ton cadeau d'ouverture »
  value: string; // « −30% »
  subtext: string; // « sur ton 1er bilan + une boisson offerte »
}

export interface CampaignCta {
  enabled: boolean;
  label: string; // « Je réserve ma place »
  url: string; // https://labase360.fr/rdv/thomas
}

export interface CampaignRichContent {
  hero_title: string;
  intro: string; // paragraphe d'accroche sous le hero
  blocks: CampaignBlock[];
  offer: CampaignOffer;
  cta: CampaignCta;
}

// Id stable sans Math.random (interdit dans certains contextes ; suffisant ici).
let _seq = 0;
export function newBlockId(): string {
  _seq += 1;
  return `blk_${Date.now().toString(36)}_${_seq}`;
}

export function defaultRichContent(): CampaignRichContent {
  return {
    hero_title: "",
    intro: "",
    blocks: [],
    offer: { enabled: false, label: "", value: "", subtext: "" },
    cta: { enabled: false, label: "", url: "" },
  };
}

/**
 * Lit le body_json stocké (jsonb) en garantissant tous les champs — rétro-compat
 * et robustesse : une campagne à peine créée a `[]` ou `{}`.
 */
export function normalizeRichContent(raw: unknown): CampaignRichContent {
  const d = defaultRichContent();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return d;
  const o = raw as Record<string, unknown>;
  return {
    hero_title: typeof o.hero_title === "string" ? o.hero_title : "",
    intro: typeof o.intro === "string" ? o.intro : "",
    blocks: Array.isArray(o.blocks)
      ? (o.blocks as unknown[]).map((b, i) => {
          const bb = (b ?? {}) as Record<string, unknown>;
          return {
            id: typeof bb.id === "string" ? bb.id : `blk_${i}`,
            emoji: typeof bb.emoji === "string" ? bb.emoji : "",
            title: typeof bb.title === "string" ? bb.title : "",
            body: typeof bb.body === "string" ? bb.body : "",
          };
        })
      : [],
    offer: {
      enabled: Boolean((o.offer as Record<string, unknown>)?.enabled),
      label: String((o.offer as Record<string, unknown>)?.label ?? ""),
      value: String((o.offer as Record<string, unknown>)?.value ?? ""),
      subtext: String((o.offer as Record<string, unknown>)?.subtext ?? ""),
    },
    cta: {
      enabled: Boolean((o.cta as Record<string, unknown>)?.enabled),
      label: String((o.cta as Record<string, unknown>)?.label ?? ""),
      url: String((o.cta as Record<string, unknown>)?.url ?? ""),
    },
  };
}

/** Remplace {prénom}/{prenom} par la valeur (ou nettoie « Bonjour , » si vide). */
export function personalize(text: string, firstName: string | null): string {
  if (!text) return text;
  const name = (firstName ?? "").trim();
  let out = text.replace(/\{pr[ée]nom\}/gi, name);
  if (!name) {
    // « Bonjour {prénom}, » sans prénom → « Bonjour, »
    out = out.replace(/\bBonjour\s*,/g, "Bonjour,").replace(/\s{2,}/g, " ");
  }
  return out;
}
