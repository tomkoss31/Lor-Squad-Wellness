// =============================================================================
// _shared/email.ts — template email transactionnel La Base 360 + envoi Resend.
//
// Utilisé par send-password-reset ET auth-email-hook (tous les mails auth
// passent par Resend avec cette présentation unique). Design email-safe
// (tables + styles inline + polices système), identité v2 : fond noir #0a0c0a,
// accent lime #c5f82a / teal #2DD4BF, bandeau gradient, badge picto.
// =============================================================================

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";

export const MAIL_FROM = "La Base 360 <no-reply@labase360.fr>";
export const MAIL_REPLY_TO = "support@labase360.fr";

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

export interface BrandedEmailParts {
  badge: string;        // emoji du badge d'en-tête (🔒 ✅ ✨ 📧 …)
  eyebrow: string;      // petit label mono au-dessus du titre
  heading: string;      // titre principal
  intro: string;        // paragraphe d'intro (peut contenir du HTML léger déjà échappé)
  ctaLabel?: string;    // libellé bouton (si lien)
  ctaUrl?: string;      // URL bouton (si lien)
  otp?: string;         // code OTP à afficher (si pas de lien)
  outro?: string;       // petit paragraphe de fin (sécurité)
  validity?: string;    // ex. "Ce lien est valable 1 heure."
}

// Rend un email complet, robuste sur les clients mail (Gmail/Apple/Outlook).
export function brandedEmail(p: BrandedEmailParts): string {
  const cta =
    p.ctaUrl && p.ctaLabel
      ? `
      <tr><td style="padding:24px 34px 6px 34px;">
        <a href="${escapeHtml(p.ctaUrl)}" style="display:inline-block;background:#c5f82a;color:#0a0c0a;text-decoration:none;font-weight:800;font-size:15px;letter-spacing:0.01em;padding:15px 30px;border-radius:12px;">
          ${escapeHtml(p.ctaLabel)}
        </a>
      </td></tr>`
      : "";

  const otpBlock = p.otp
    ? `
      <tr><td style="padding:22px 34px 6px 34px;">
        <div style="display:inline-block;background:#0f1310;border:1px solid rgba(197,248,42,0.35);border-radius:14px;padding:16px 26px;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:30px;font-weight:700;letter-spacing:0.32em;color:#c5f82a;">
          ${escapeHtml(p.otp)}
        </div>
      </td></tr>`
    : "";

  const linkFallback =
    p.ctaUrl && p.ctaLabel
      ? `
      <tr><td style="padding:14px 34px 4px 34px;">
        <p style="margin:0 0 6px 0;font-size:12.5px;color:#6b7280;line-height:1.6;">Si le bouton ne fonctionne pas, copie ce lien dans ton navigateur :</p>
        <p style="margin:0;font-size:12px;color:#2DD4BF;word-break:break-all;">${escapeHtml(p.ctaUrl)}</p>
      </td></tr>`
      : "";

  const validity = p.validity
    ? `<tr><td style="padding:10px 34px 0 34px;"><p style="margin:0;font-size:12.5px;color:#9AA0A6;">${escapeHtml(p.validity)}</p></td></tr>`
    : "";

  const outro = p.outro
    ? `<tr><td style="padding:18px 34px 2px 34px;"><p style="margin:0;font-size:12.5px;color:#6b7280;line-height:1.6;">${escapeHtml(p.outro)}</p></td></tr>`
    : "";

  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><meta name="color-scheme" content="dark" /></head>
<body style="margin:0;padding:0;background:#07090a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(p.heading)} — La Base 360</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#07090a;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background:#14171a;border:1px solid rgba(255,255,255,0.10);border-radius:20px;overflow:hidden;">

        <!-- Bandeau gradient + wordmark -->
        <tr><td style="background:linear-gradient(120deg,#2DD4BF 0%,#c5f82a 100%);height:6px;line-height:6px;font-size:6px;">&nbsp;</td></tr>
        <tr><td style="padding:26px 34px 0 34px;">
          <div style="font-size:16px;font-weight:800;letter-spacing:0.04em;color:#F1EFE8;">
            LA&nbsp;BASE&nbsp;<span style="color:#2DD4BF;">360</span>
          </div>
        </td></tr>

        <!-- Badge picto -->
        <tr><td style="padding:22px 34px 0 34px;">
          <span style="display:inline-block;width:52px;height:52px;line-height:52px;text-align:center;border-radius:14px;background:rgba(45,212,191,0.12);border:1px solid rgba(45,212,191,0.30);font-size:24px;">${p.badge}</span>
        </td></tr>

        <!-- Titre + intro -->
        <tr><td style="padding:18px 34px 0 34px;">
          <div style="font-family:'SFMono-Regular',Consolas,monospace;font-size:10.5px;letter-spacing:0.16em;text-transform:uppercase;color:#2DD4BF;font-weight:700;margin-bottom:10px;">${escapeHtml(p.eyebrow)}</div>
          <h1 style="margin:0 0 10px 0;font-size:24px;line-height:1.2;color:#F1EFE8;font-weight:800;letter-spacing:-0.3px;">${escapeHtml(p.heading)}</h1>
          <p style="margin:0;font-size:14.5px;color:#9AA0A6;line-height:1.65;">${p.intro}</p>
        </td></tr>

        ${cta}
        ${otpBlock}
        ${validity}
        ${linkFallback}
        ${outro}

        <!-- Footer -->
        <tr><td style="padding:26px 34px 30px 34px;">
          <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:18px;font-size:12px;color:#6b7280;line-height:1.6;">
            La Base 360 · La Base Verdun<br />
            <a href="https://labase360.fr" style="color:#2DD4BF;text-decoration:none;">labase360.fr</a>
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

// Envoi via Resend. Retourne ok/err (pas de throw).
export async function sendResend(params: {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: params.from ?? MAIL_FROM,
        to: [params.to],
        subject: params.subject,
        html: params.html,
        reply_to: params.replyTo ?? MAIL_REPLY_TO,
      }),
    });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      return { ok: false, error: b?.message ?? `resend_${res.status}` };
    }
    const b = await res.json().catch(() => ({}));
    return { ok: true, id: b?.id ?? "unknown" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "send_failed" };
  }
}
