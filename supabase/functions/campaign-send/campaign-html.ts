// =============================================================================
// campaign-html.ts — compile une campagne RICHE en HTML email.
// Chantier Campagnes, étape 5 (2026-08).
//
// Pourquoi PAS newsletter-html.ts : ce moteur-là force en fin de mail deux CTA
// (« Fais ton bilan » + « Opportunité ») propres à la newsletter lead-magnet.
// Sur une campagne ciblée (ex. lancement BBC), ça polluerait le message. On
// reprend donc le STYLE visuel (header brandé, CTA dégradé, footer charcoal)
// dans un compilateur dédié, qui rend EXACTEMENT l'aperçu de l'éditeur — ni
// plus ni moins.
//
// Le mail est en table/inline-style (compatibilité clients email). Le lien de
// désabonnement est OBLIGATOIRE (prospection froide) et injecté ici.
// =============================================================================

export interface CampBlock { emoji: string; title: string; body: string }
export interface CampOffer { enabled: boolean; label: string; value: string; subtext: string }
export interface CampCta { enabled: boolean; label: string; url: string }
export interface CampRich {
  hero_title: string;
  intro: string;
  blocks: CampBlock[];
  offer: CampOffer;
  cta: CampCta;
}

function esc(s: string): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function nl2br(s: string): string {
  return esc(s).replace(/\n/g, "<br>");
}

/** {prénom}/{prenom} → valeur, et « Bonjour , » nettoyé si absent. */
export function personalize(text: string, firstName: string | null): string {
  if (!text) return text;
  const name = (firstName ?? "").trim();
  let out = text.replace(/\{pr[ée]nom\}/gi, name);
  if (!name) out = out.replace(/\bBonjour\s*,/g, "Bonjour,").replace(/ {2,}/g, " ");
  return out;
}

/** Version texte brut (type 'plain') : perso + rien d'autre, plus le désabo. */
export function compilePlainText(letter: string, firstName: string | null, unsubUrl: string): string {
  const body = personalize(letter, firstName);
  return `${body}\n\n—\nLa Base 360 · Verdun, France\nSe désabonner : ${unsubUrl}`;
}

// Coerce un body_json quelconque (souvent `[]` par défaut en base) en CampRich
// sûr — le compilateur ne doit JAMAIS planter sur un contenu incomplet.
function safeRich(raw: unknown): CampRich {
  const o = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const offer = (o.offer ?? {}) as Record<string, unknown>;
  const cta = (o.cta ?? {}) as Record<string, unknown>;
  return {
    hero_title: typeof o.hero_title === "string" ? o.hero_title : "",
    intro: typeof o.intro === "string" ? o.intro : "",
    blocks: Array.isArray(o.blocks)
      ? (o.blocks as unknown[]).map((b) => {
          const bb = (b ?? {}) as Record<string, unknown>;
          return {
            emoji: typeof bb.emoji === "string" ? bb.emoji : "",
            title: typeof bb.title === "string" ? bb.title : "",
            body: typeof bb.body === "string" ? bb.body : "",
          };
        })
      : [],
    offer: {
      enabled: Boolean(offer.enabled),
      label: String(offer.label ?? ""),
      value: String(offer.value ?? ""),
      subtext: String(offer.subtext ?? ""),
    },
    cta: { enabled: Boolean(cta.enabled), label: String(cta.label ?? ""), url: String(cta.url ?? "") },
  };
}

/** Vrai si le contenu riche est vide (rien à envoyer). */
export function isRichEmpty(raw: unknown): boolean {
  const c = safeRich(raw);
  return !c.hero_title.trim() && !c.intro.trim() && c.blocks.every((b) => !(b.title + b.body).trim()) && !c.offer.enabled && !(c.cta.enabled && c.cta.label);
}

export function compileCampaignHtml(raw: unknown, firstName: string | null, unsubUrl: string): string {
  const content = safeRich(raw);
  const p = (s: string) => personalize(s, firstName);

  const blocksHtml = content.blocks
    .filter((b) => (b.title || b.body).trim())
    .map(
      (b) => `
      <div style="margin:18px 0;">
        <h4 style="font-family:'DM Sans',Arial,sans-serif;font-size:16px;color:#1a1a1a;margin:0 0 5px;">
          ${b.emoji ? esc(b.emoji) + " " : ""}${esc(p(b.title))}
        </h4>
        <p style="font-family:'DM Sans',Arial,sans-serif;font-size:14px;line-height:1.6;color:#333;margin:0;">
          ${nl2br(p(b.body))}
        </p>
      </div>`,
    )
    .join("");

  const offerHtml = content.offer.enabled
    ? `
      <div style="background:#ffffff;border:1px solid #e5ddcf;border-radius:12px;padding:16px;text-align:center;margin:18px 0;">
        <div style="font-size:13px;color:#666;font-family:'DM Sans',Arial,sans-serif;">${esc(p(content.offer.label))}</div>
        <div style="font-family:'Anton','Arial Black',sans-serif;font-size:34px;color:#0B0D11;margin:4px 0;">${esc(p(content.offer.value)) || "—"}</div>
        <div style="font-size:13px;color:#444;font-family:'DM Sans',Arial,sans-serif;">${esc(p(content.offer.subtext))}</div>
      </div>`
    : "";

  const ctaHtml =
    content.cta.enabled && content.cta.label
      ? `
      <a href="${esc(content.cta.url || "#")}" style="display:block;text-align:center;background:linear-gradient(135deg,#2DD4BF,#7d6bf0);color:#ffffff;font-family:'DM Sans',Arial,sans-serif;font-weight:700;font-size:15px;padding:14px;border-radius:12px;text-decoration:none;margin:8px 0;">
        ${esc(p(content.cta.label))} →
      </a>`
      : "";

  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#e9e5dc;font-family:'DM Sans',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e9e5dc;padding:22px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#F4F1EA;border-radius:16px;overflow:hidden;">
        <!-- header brandé -->
        <tr><td style="background:#0B0D11;padding:24px 20px;text-align:center;">
          <div style="width:52px;height:52px;border-radius:14px;margin:0 auto 10px;background:linear-gradient(150deg,#2ec5c0,#3f8ef0,#7d6bf0);color:#fff;font-family:'Anton','Arial Black',sans-serif;font-size:28px;line-height:52px;">B</div>
          <div style="color:#F4F1EA;font-family:'Anton','Arial Black',sans-serif;font-size:22px;letter-spacing:1px;">LA BASE 360</div>
        </td></tr>
        <!-- corps -->
        <tr><td style="padding:22px 20px;">
          ${content.hero_title ? `<h1 style="font-family:'DM Sans',Arial,sans-serif;font-size:20px;color:#1a1a1a;margin:0 0 10px;">${esc(p(content.hero_title))}</h1>` : ""}
          ${content.intro ? `<p style="font-family:'DM Sans',Arial,sans-serif;font-size:14px;line-height:1.6;color:#333;margin:0 0 14px;">${nl2br(p(content.intro))}</p>` : ""}
          ${blocksHtml}
          ${offerHtml}
          ${ctaHtml}
        </td></tr>
        <!-- footer + désabo OBLIGATOIRE -->
        <tr><td style="background:#0B0D11;color:#7A8099;font-size:11px;text-align:center;padding:18px 20px;font-family:'DM Sans',Arial,sans-serif;line-height:1.6;">
          La Base 360 · Verdun, France<br>
          <a href="${esc(unsubUrl)}" style="color:#9AA0A6;text-decoration:underline;">Se désabonner</a> · tu reçois ce mail car tu as laissé tes coordonnées.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
