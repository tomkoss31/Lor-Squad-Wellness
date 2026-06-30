// =============================================================================
// _shared/rdvEmail.ts — template UNIQUE des mails de RDV (La Base 360).
// Utilisé par book-rdv (confirm prospect), rdv-confirm-client (confirm client)
// et client-rdv-reminder (rappel J-1 client + prospect). Un seul design partout.
//
// HTML email-safe : styles inline, couleurs solides (pas de gradient/color-mix),
// largeur max 480, dark premium La Base 360.
// =============================================================================

const APP_URL = "https://www.labase360.fr";
const CONTEST_URL = "https://commande.labase-nutrition.com/jeu";

// Palette
const INK = "#0B0D11";
const SURFACE = "#13161C";
const TEAL = "#2DD4BF";
const GOLD = "#C9A84C";
const CREAM = "#F0EDE8";
const MUTED = "#C3CCC0";
const HINT = "#7A8099";
const FAINT = "#4A5068";

function esc(s: string): string {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}

export interface RdvEmailParams {
  kind: "confirm" | "reminder";
  firstName: string;
  coachName: string;
  dateLabel: string; // ex « mardi 1 juillet »
  hour: string;      // ex « 13:30 »
  location: string;
}

export function rdvEmailHtml(p: RdvEmailParams): string {
  const first = esc(p.firstName || "");
  const coach = esc(p.coachName || "ton coach");
  const isConfirm = p.kind === "confirm";

  const heading = isConfirm ? `C'est noté, ${first} ✅` : `À demain, ${first} 🌿`;
  const intro = isConfirm
    ? `Ton rendez-vous avec <b style="color:${CREAM};">${coach}</b> est bien calé. On a hâte de te voir 🌿`
    : `Petit rappel : ton rendez-vous avec <b style="color:${CREAM};">${coach}</b>, c'est demain.`;
  const closing = isConfirm
    ? `Un rappel t'arrivera la veille. Un empêchement ? Réponds simplement à cet email, on s'arrange 💬`
    : `Pense à bien t'hydrater d'ici là 💧 Un empêchement ? Réponds à cet email, on s'arrange.`;

  const btn = (href: string, label: string, bg: string, fg: string) =>
    `<a href="${href}" target="_blank" rel="noopener noreferrer" style="display:block;text-align:center;padding:15px 18px;background:${bg};color:${fg};border-radius:13px;text-decoration:none;font-size:15px;font-weight:700;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">${label}</a>`;

  return `
<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:${INK};font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${CREAM};">
  <div style="max-width:480px;margin:0 auto;padding:28px 22px;">

    <div style="font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:${TEAL};font-weight:700;">La Base 360</div>
    <div style="font-size:11px;color:${FAINT};letter-spacing:.04em;margin-top:2px;">The wellness nutrition club</div>

    <h1 style="font-size:24px;margin:18px 0 4px;color:${CREAM};">${heading}</h1>
    <p style="font-size:15px;line-height:1.55;color:${MUTED};margin:8px 0 20px;">${intro}</p>

    <div style="background:${SURFACE};border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:18px 20px;">
      <div style="font-size:13px;color:${HINT};text-transform:uppercase;letter-spacing:.08em;">Quand</div>
      <div style="font-size:18px;font-weight:700;color:${GOLD};margin:2px 0 14px;">${esc(p.dateLabel)} · ${esc(p.hour)}</div>
      <div style="font-size:13px;color:${HINT};text-transform:uppercase;letter-spacing:.08em;">Où</div>
      <div style="font-size:16px;font-weight:600;color:${CREAM};margin-top:2px;">${esc(p.location)}</div>
    </div>

    <p style="font-size:14px;line-height:1.55;color:${MUTED};margin:18px 0 18px;">${closing}</p>

    ${btn(APP_URL, "Accéder à mon espace →", TEAL, "#04231A")}

    <div style="height:18px;"></div>

    <div style="background:#101A18;border:1px solid rgba(45,212,191,.22);border-radius:16px;padding:18px 20px;">
      <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${TEAL};font-weight:700;">🥤 Club Nutrition</div>
      <div style="font-size:17px;font-weight:700;color:${CREAM};margin:6px 0 4px;">Tente de gagner ta boisson 🎁</div>
      <p style="font-size:13.5px;line-height:1.5;color:${MUTED};margin:0 0 14px;">À ton prochain rendez-vous, participe au tirage du Club et repars avec ta boisson offerte.</p>
      ${btn(CONTEST_URL, "Je tente ma chance →", GOLD, "#1A1407")}
    </div>

    <p style="font-size:12px;color:${FAINT};margin:24px 0 0;">La Base 360 · The wellness nutrition club · <a href="${APP_URL}" style="color:${HINT};text-decoration:none;">labase360.fr</a></p>
  </div>
</body></html>`.trim();
}
