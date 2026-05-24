// =============================================================================
// newsletter-html.ts — Compile une newsletter (sections riches) en HTML.
// Chantier #8 étape 8.5 (2026-05-23).
//
// Aligné sur le mockup docs/mockups/newsletter-mai-juin.html :
//   - Container 640px max, light theme cream
//   - Header brand gold/teal, Hero Syne, Sections avec tag pill +
//     emoji + body markdown + callout + CTA Bilan inline + paywall
//   - CTA Business teal gradient à la fin
//   - Footer charcoal
//
// Public mode = sections privées masquées + CTA "Débloque via bilan".
// Email mode  = toutes les sections affichées (le client paye en email
//              donc pas de paywall).
// =============================================================================

export interface NewsletterSection {
  id: string;
  title: string;
  body_md: string;
  is_public: boolean;
  position: number;
  emoji: string;
  tag_label: string;
  saviez_vous_md: string;
  saviez_vous_label: string;
  show_cta_bilan: boolean;
  paywall_mode: "none" | "teaser";
}

export interface NewsletterCompileInput {
  title: string;
  subtitle: string | null;
  slug: string;
  sections: NewsletterSection[];
  // 'public' = page web /news/:slug → cache sections privées
  // 'email'  = envoi destinataires → tout visible (pas de paywall)
  mode: "public" | "email";
  bilanCtaUrl?: string; // /bilan-online/admin par défaut
  businessUrl?: string; // /business avec UTM
  unsubUrl?: string;    // pour footer email
}

// ─── Markdown mini parser ─────────────────────────────────────────────────────
// Supporte : **bold**, *italic*, - liste, paragraphes, links [txt](url).
// Pas de h2/h3 dans le body (les titres sont déjà gérés au niveau section).
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInline(text: string): string {
  // Order matters : escape, puis inline transformations
  let out = escapeHtml(text);
  // Links [txt](url)
  out = out.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" style="color:#0F766E;text-decoration:underline;">$1</a>',
  );
  // Bold
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // Italic
  out = out.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>");
  return out;
}

function renderMarkdown(md: string): string {
  if (!md.trim()) return "";
  const lines = md.split("\n");
  const blocks: string[] = [];
  let listBuffer: string[] = [];
  let paraBuffer: string[] = [];

  function flushList() {
    if (listBuffer.length === 0) return;
    const items = listBuffer
      .map(
        (item) =>
          `<li style="position:relative;padding-left:22px;margin-bottom:8px;font-size:14.5px;color:#4B5563;">
            <span style="position:absolute;left:6px;color:#C9A84C;font-weight:700;">▸</span>
            ${renderInline(item)}
          </li>`,
      )
      .join("");
    blocks.push(
      `<ul style="list-style:none;padding:0;margin:12px 0;">${items}</ul>`,
    );
    listBuffer = [];
  }

  function flushPara() {
    if (paraBuffer.length === 0) return;
    const text = paraBuffer.join(" ").trim();
    if (text) {
      blocks.push(
        `<p style="font-size:15px;color:#1F2937;margin:0 0 12px;line-height:1.6;">${renderInline(text)}</p>`,
      );
    }
    paraBuffer = [];
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const listMatch = line.match(/^[-*]\s+(.+)$/);
    if (listMatch) {
      flushPara();
      listBuffer.push(listMatch[1]);
      continue;
    }
    if (line.trim() === "") {
      flushList();
      flushPara();
      continue;
    }
    flushList();
    paraBuffer.push(line);
  }
  flushList();
  flushPara();
  return blocks.join("\n");
}

// ─── Section HTML ─────────────────────────────────────────────────────────────
function renderSection(
  section: NewsletterSection,
  input: NewsletterCompileInput,
): string {
  // En mode public, sections privées sont masquées (gérées avant l'appel)
  const isPaywall = section.paywall_mode === "teaser";
  const sectionPaddingBottom = isPaywall && input.mode === "public" ? "80px" : "20px";

  const tagPill = section.tag_label
    ? `<span style="display:inline-block;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;padding:4px 10px;border-radius:12px;background:rgba(45,212,191,0.12);color:#0F766E;margin-bottom:12px;">${escapeHtml(
        section.tag_label,
      )}</span>`
    : "";

  const emojiSpan = section.emoji
    ? `<span style="font-size:26px;margin-right:4px;">${escapeHtml(section.emoji)}</span>`
    : "";

  const titleH2 = `<h2 style="font-family:'Syne',Georgia,serif;font-size:22px;font-weight:700;color:#1F2937;line-height:1.3;margin:0 0 10px;">${emojiSpan}${escapeHtml(
    section.title,
  )}</h2>`;

  const bodyHtml = renderMarkdown(section.body_md);

  const callout = section.saviez_vous_md.trim()
    ? `<div style="margin-top:14px;padding:14px 16px;background:#F7F3EC;border-left:3px solid #C9A84C;border-radius:4px;font-size:14px;color:#4B5563;font-style:italic;">
        <strong style="font-style:normal;color:#C9A84C;display:block;margin-bottom:4px;">${escapeHtml(
          section.saviez_vous_label || "Le saviez-vous ?",
        )}</strong>
        ${renderMarkdown(section.saviez_vous_md)}
      </div>`
    : "";

  const ctaBilan =
    section.show_cta_bilan && input.bilanCtaUrl
      ? `<a href="${input.bilanCtaUrl}" style="margin:18px 0 6px;padding:16px 18px;background:linear-gradient(135deg,#FAEEDA 0%,#F4DFA8 100%);border-radius:12px;border:1px solid rgba(201,168,76,0.3);display:flex;align-items:center;gap:14px;text-decoration:none;color:inherit;">
        <div style="font-size:28px;flex-shrink:0;">🎯</div>
        <div style="flex:1;">
          <div style="font-family:'Syne',Georgia,serif;font-size:15px;font-weight:700;color:#633806;line-height:1.3;margin-bottom:2px;">Prêt(e) pour la suite ?</div>
          <div style="font-size:12px;color:#8B5A1B;">Fais ton bilan personnalisé en 2 min</div>
        </div>
        <span style="display:inline-block;margin-left:auto;padding:10px 16px;background:#0B0D11;color:#FBF7F0;border-radius:8px;font-weight:600;font-size:13px;white-space:nowrap;">Je commence</span>
      </a>`
      : "";

  const paywallOverlay =
    isPaywall && input.mode === "public" && input.bilanCtaUrl
      ? `<div style="position:absolute;left:0;right:0;bottom:0;padding:28px 20px;background:linear-gradient(180deg,rgba(255,255,255,0) 0%,rgba(251,247,240,0.8) 30%,#F7F3EC 100%);text-align:center;">
          <h3 style="font-family:'Syne',Georgia,serif;font-size:18px;font-weight:700;color:#1F2937;margin:0 0 8px;">🔒 La suite est réservée</h3>
          <p style="font-size:14px;color:#4B5563;max-width:380px;margin:0 auto 18px;">Le programme complet adapté à ton profil t'attend après ton bilan personnalisé (2 min top chrono).</p>
          <a href="${input.bilanCtaUrl}" style="display:inline-block;padding:12px 24px;background:#0B0D11;color:#FBF7F0;text-decoration:none;border-radius:8px;font-weight:600;font-size:13px;">Je débloque mon programme →</a>
        </div>`
      : "";

  return `<section style="padding:24px 20px ${sectionPaddingBottom};border-bottom:1px solid rgba(11,13,17,0.10);position:relative;${
    isPaywall && input.mode === "public" ? "overflow:hidden;" : ""
  }">
    ${tagPill}
    ${titleH2}
    ${bodyHtml}
    ${callout}
    ${ctaBilan}
    ${paywallOverlay}
  </section>`;
}

// ─── Full newsletter HTML ─────────────────────────────────────────────────────
export function compileNewsletterHtml(input: NewsletterCompileInput): string {
  const editionLabel = input.subtitle
    ? input.subtitle
    : `Édition ${new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`;

  // En mode public, on retire les sections privées (et la newsletter doit
  // afficher un paywall si elle est censée être publique). Le caller passe
  // déjà les sections filtrées si besoin — ici on respecte l'input.
  const sectionsHtml = input.sections
    .sort((a, b) => a.position - b.position)
    .map((s) => renderSection(s, input))
    .join("");

  // CTA Business final (auto-append, sera enrichi 8.10 avec variant saisonnier)
  const ctaBusinessUrl = input.businessUrl ?? "https://labase360.fr/business";
  const ctaBusiness = `<section style="margin:24px 20px;padding:22px 20px;background:linear-gradient(135deg,#0F766E 0%,#2DD4BF 100%);border-radius:16px;color:white;text-align:center;box-shadow:0 8px 24px rgba(13,118,110,0.25);">
    <div style="display:inline-block;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;padding:4px 12px;border-radius:12px;background:rgba(255,255,255,0.18);margin-bottom:12px;">💼 Opportunité</div>
    <h3 style="font-family:'Syne',Georgia,serif;font-size:22px;font-weight:700;margin:0 0 10px;line-height:1.3;color:white;">Tu pensais auto-financer tes vacances ?</h3>
    <p style="font-size:14px;opacity:0.92;margin:0 auto 16px;max-width:340px;color:white;">Découvre comment notre équipe accompagne celles et ceux qui veulent transformer leur passion santé en revenus complémentaires.</p>
    <a href="${ctaBusinessUrl}" style="display:inline-block;padding:14px 28px;background:white;color:#0F766E;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;">Je découvre l'opportunité →</a>
  </section>`;

  const unsubLink = input.unsubUrl
    ? `<a href="${input.unsubUrl}" style="color:#E5C97D;text-decoration:none;">Se désabonner</a> &nbsp;·&nbsp; `
    : "";

  // Préheader (texte caché qui apparaît à côté du sujet dans la liste Gmail)
  const preheader = input.subtitle
    ? escapeHtml(input.subtitle.slice(0, 120))
    : `La Base 360 News — ${escapeHtml(input.title)}`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${escapeHtml(input.title)}</title>
<meta property="og:title" content="${escapeHtml(input.title)}">
<meta property="og:description" content="${preheader}">
<meta property="og:type" content="article">
<meta name="twitter:card" content="summary_large_image">
</head>
<body style="margin:0;padding:0;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,sans-serif;background:#FBF7F0;color:#1F2937;line-height:1.6;font-size:16px;-webkit-text-size-adjust:100%;">

<!-- Préheader -->
<div style="display:none;max-height:0;overflow:hidden;color:transparent;font-size:1px;line-height:1px;">${preheader}</div>

<div style="max-width:640px;margin:0 auto;background:#FFFFFF;box-shadow:0 4px 30px rgba(0,0,0,0.05);">

  <!-- Header brand -->
  <header style="padding:24px 20px 20px;background:linear-gradient(135deg,#FAEEDA 0%,#FBF7F0 100%);border-bottom:1px solid rgba(11,13,17,0.10);text-align:center;">
    <div style="font-family:'Syne',Georgia,serif;font-size:14px;font-weight:700;letter-spacing:0.15em;color:#C9A84C;text-transform:uppercase;margin-bottom:6px;">
      La Base 360 <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#2DD4BF;margin:0 6px;transform:translateY(-2px);"></span> News
    </div>
    <div style="font-size:12px;color:#9CA3AF;font-weight:500;">${escapeHtml(editionLabel)}</div>
  </header>

  <!-- Hero -->
  <section style="padding:32px 20px 28px;text-align:center;background:#FFFFFF;">
    <h1 style="font-family:'Syne',Georgia,serif;font-size:28px;font-weight:700;color:#1F2937;line-height:1.25;margin:0 0 12px;">${escapeHtml(
      input.title,
    )}</h1>
    ${
      input.subtitle
        ? `<p style="font-size:15px;color:#4B5563;max-width:380px;margin:0 auto;line-height:1.5;">${escapeHtml(input.subtitle)}</p>`
        : ""
    }
  </section>

  ${sectionsHtml}

  ${ctaBusiness}

  <!-- Footer -->
  <footer style="padding:28px 20px 32px;text-align:center;background:#0B0D11;color:#FBF7F0;">
    <div style="font-family:'Syne',Georgia,serif;font-size:14px;font-weight:700;letter-spacing:0.15em;color:#C9A84C;text-transform:uppercase;margin-bottom:8px;">
      La Base 360 <span style="color:#2DD4BF;">·</span> News
    </div>
    <div style="font-size:13px;color:rgba(251,247,240,0.7);margin-bottom:18px;">Conseils nutrition & bien-être, sans pression.</div>
    <div style="font-size:11px;color:rgba(251,247,240,0.45);max-width:420px;margin:0 auto;line-height:1.5;">
      Tu reçois cet email parce que tu es client(e) ou abonné(e) à La Base 360 News.<br>
      ${unsubLink}<a href="https://labase360.fr/mentions-legales" style="color:#E5C97D;text-decoration:none;">Mentions légales</a>
    </div>
  </footer>

</div>
</body>
</html>`;
}
