// =============================================================================
// _shared/rdvEmail.ts — template UNIQUE des mails de RDV.
// Utilisé par book-rdv (confirm prospect), rdv-confirm-client (confirm client),
// client-rdv-reminder (rappel J-1) et book-club-discovery (RDV du club).
//
// HTML email-safe : styles inline, couleurs solides (pas de gradient/color-mix,
// Outlook ne les rend pas), largeur max 480.
//
// ─── DEUX HABILLAGES, UNE SEULE STRUCTURE ────────────────────────────────────
// L'identité de La Base 360 compte trois systèmes visuels qui ne se mélangent
// JAMAIS. Un mail envoyé par le site public du Breakfast Club ne peut donc pas
// arriver en dark premium : la personne vient de parcourir une page crème et
// orange. `theme` choisit l'habillage — la mise en page, elle, ne change pas.
//   • "app"  (défaut) — dark premium La Base 360. Les 3 appelants historiques
//                       ne passent rien : leur mail est strictement inchangé.
//   • "club"          — crème + orange du site public (tokens --bc-*).
// =============================================================================

const APP_URL = "https://www.labase360.fr";
const CLUB_URL = "https://www.labase-nutrition.com";
const CONTEST_URL = "https://commande.labase-nutrition.com/jeu";

// Coordonnées du club — reprises telles quelles du pied de page du site
// (ClubShell.tsx), pour qu'un changement d'horaire ne crée pas deux vérités.
const CLUB_ADDRESS = "11 rue Saint Pierre · 55100 Verdun";
const CLUB_HOURS = "Lun–Ven 7h–11h · Sam 8h–11h · Dimanche fermé";
const CLUB_PHONE = "06 79 44 87 59";
const CLUB_PHONE_HREF = "+33679448759";

export type RdvEmailTheme = "app" | "club";

interface Palette {
  bg: string; surface: string; border: string;
  heading: string; text: string; hint: string; faint: string;
  /** Couleur des boutons principaux + de l'eyebrow. */
  accent: string; accentInk: string;
  /** Met en valeur la date du rendez-vous. */
  highlight: string;
  eyebrow: string; tagline: string;
  contestBg: string; contestBorder: string; contestBtnBg: string; contestBtnInk: string;
  siteUrl: string; siteLabel: string;
}

const THEMES: Record<RdvEmailTheme, Palette> = {
  // Dark premium La Base 360 — inchangé, c'est ce que reçoivent déjà les clients.
  app: {
    bg: "#0B0D11", surface: "#13161C", border: "rgba(255,255,255,.08)",
    heading: "#F0EDE8", text: "#C3CCC0", hint: "#7A8099", faint: "#4A5068",
    accent: "#2DD4BF", accentInk: "#04231A",
    highlight: "#C9A84C",
    eyebrow: "La Base 360", tagline: "The wellness nutrition club",
    contestBg: "#101A18", contestBorder: "rgba(45,212,191,.22)",
    contestBtnBg: "#C9A84C", contestBtnInk: "#1A1407",
    siteUrl: APP_URL, siteLabel: "labase360.fr",
  },
  // Crème + orange du site public. Valeurs reprises telles quelles de
  // ClubLandingPage.css : cream-alt en fond, carte blanche, orange plein (pas
  // le dégradé du site — un email ne sait pas le rendre partout).
  club: {
    bg: "#F0E7D7", surface: "#FFFFFF", border: "#E7E1D6",
    heading: "#17201C", text: "#55605A", hint: "#8A938D", faint: "#8A938D",
    accent: "#FF6A2B", accentInk: "#FFFFFF",
    highlight: "#E0532A",
    eyebrow: "☕ The Breakfast Club", tagline: "by La Base · Verdun",
    contestBg: "#FCF8F1", contestBorder: "#E7E1D6",
    contestBtnBg: "#1E3330", contestBtnInk: "#F4EFE4",
    siteUrl: CLUB_URL, siteLabel: "labase-nutrition.com",
  },
};

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
  /**
   * Lien « Modifier / annuler mon rendez-vous » (chantier RDV du club, 2026-08-09).
   * Optionnel : seuls les RDV qui portent un manage_token le passent. Les autres
   * appelants (book-rdv, rdv-confirm-client, client-rdv-reminder) sont inchangés.
   */
  manageUrl?: string;
  /**
   * Habillage du mail. Absent = "app" (dark premium) : les appelants
   * historiques restent strictement identiques. Le site public du club passe
   * "club" pour rester dans le crème/orange que la personne vient de quitter.
   */
  theme?: RdvEmailTheme;
}

export function rdvEmailHtml(p: RdvEmailParams): string {
  const t = THEMES[p.theme ?? "app"];
  const first = esc(p.firstName || "");
  const coach = esc(p.coachName || "ton coach");
  const isConfirm = p.kind === "confirm";

  const heading = isConfirm ? `C'est noté, ${first} ✅` : `À demain, ${first} 🌿`;
  const intro = isConfirm
    ? `Ton rendez-vous avec <b style="color:${t.heading};">${coach}</b> est bien calé. On a hâte de te voir 🌿`
    : `Petit rappel : ton rendez-vous avec <b style="color:${t.heading};">${coach}</b>, c'est demain.`;
  // Avec un lien de gestion, on invite à se servir tout seul plutôt qu'à écrire.
  const closing = p.manageUrl
    ? (isConfirm
        ? `Un rappel t'arrivera la veille. Un empêchement ? Tu peux déplacer ou annuler toi-même, en deux clics 👇`
        : `Pense à bien t'hydrater d'ici là 💧 Un empêchement ? Déplace ou annule toi-même 👇`)
    : (isConfirm
        ? `Un rappel t'arrivera la veille. Un empêchement ? Réponds simplement à cet email, on s'arrange 💬`
        : `Pense à bien t'hydrater d'ici là 💧 Un empêchement ? Réponds à cet email, on s'arrange.`);

  const btn = (href: string, label: string, bg: string, fg: string) =>
    `<a href="${href}" target="_blank" rel="noopener noreferrer" style="display:block;text-align:center;padding:15px 18px;background:${bg};color:${fg};border-radius:13px;text-decoration:none;font-size:15px;font-weight:700;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">${label}</a>`;

  // Le bouton « mon espace » n'a de sens que pour un CLIENT, qui en a un. Un
  // prospect du club vient de réserver son tout premier RDV : il n'a pas encore
  // de compte, l'envoyer sur une page de connexion serait une impasse (retour
  // Thomas 2026-08-09). Il ne reçoit donc que son lien de gestion, ou rien.
  const cta = p.manageUrl
    ? btn(p.manageUrl, "Modifier / annuler mon rendez-vous", t.accent, t.accentInk)
    : (p.theme ?? "app") === "club"
      ? ""
      : btn(APP_URL, "Accéder à mon espace →", t.accent, t.accentInk);

  // En-tête. Côté club, le logo SEUL : il porte déjà « by La Base », répéter
  // « by La Base · Verdun » en dessous faisait doublon (retour Thomas
  // 2026-08-09). Le `alt` reste la sécurité quand la messagerie bloque les
  // images distantes, et le pied de page redonne de toute façon le nom complet.
  const brand = (p.theme ?? "app") === "club"
    ? `<img src="${CLUB_URL}/brand/breakfast-club/logo-heart.png" alt="The Breakfast Club by La Base" width="190" style="width:190px;max-width:72%;height:auto;display:block;border:0;margin:0;">`
    : `<div style="font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:${t.accent};font-weight:700;">${t.eyebrow}</div>
    <div style="font-size:11px;color:${t.faint};letter-spacing:.04em;margin-top:2px;">${t.tagline}</div>`;

  // Bloc du bas — il ne raconte pas la même chose selon le destinataire.
  //
  // Côté CLUB, le jeu « tente de gagner ta boisson » posait deux problèmes
  // (retour Thomas 2026-08-09) : il mélangeait le Breakfast Club et le bar,
  // qui sont deux ambiances du MÊME lieu, et surtout il promettait une boisson
  // à quelqu'un qui vient le MATIN — alors que le bar n'ouvre qu'à 11h. On
  // remplace donc par une simple information, exacte et sans promesse : la
  // même adresse, l'après-midi. Aucun bouton : rien d'utile à faire tout de
  // suite, la personne a déjà son rendez-vous.
  const bottom = (p.theme ?? "app") === "club"
    ? `<div style="background:${t.contestBg};border:1px solid ${t.contestBorder};border-radius:16px;padding:18px 20px;">
      <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${t.accent};font-weight:700;">🥤 La Base Shakes&amp;Drinks</div>
      <div style="font-size:17px;font-weight:700;color:${t.heading};margin:6px 0 4px;">Le même lieu, l'après-midi</div>
      <p style="font-size:13.5px;line-height:1.5;color:${t.text};margin:0;">Ton rendez-vous est le matin, à l'heure du Breakfast Club. À partir de 11h, la même adresse devient un bar healthy : smoothies, shakes et boissons saines à emporter, jusqu'à 17h30.</p>
    </div>`
    : `<div style="background:${t.contestBg};border:1px solid ${t.contestBorder};border-radius:16px;padding:18px 20px;">
      <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${t.accent};font-weight:700;">🥤 La Base Shakes&amp;Drinks</div>
      <div style="font-size:17px;font-weight:700;color:${t.heading};margin:6px 0 4px;">Tente de gagner ta boisson 🎁</div>
      <p style="font-size:13.5px;line-height:1.5;color:${t.text};margin:0 0 14px;">Connais-tu La Base Shakes&amp;Drinks, notre bar healthy de boissons saines à emporter ? À ton prochain rendez-vous, participe au tirage et repars avec ta boisson offerte.</p>
      ${btn(CONTEST_URL, "Je tente ma chance →", t.contestBtnBg, t.contestBtnInk)}
    </div>`;

  // Pied de page. Côté club : les coordonnées complètes, pour que la personne
  // n'ait pas à retourner chercher l'adresse ou le numéro le matin du RDV.
  // Le téléphone est un lien tel: — sur mobile, un seul appui pour appeler.
  const footer = (p.theme ?? "app") === "club"
    ? `<div style="margin:26px 0 0;padding-top:18px;border-top:1px solid ${t.border};font-size:12.5px;line-height:1.75;color:${t.text};">
      <div style="font-weight:700;color:${t.heading};">The Breakfast Club by La Base</div>
      <div>${esc(CLUB_ADDRESS)}</div>
      <div>${esc(CLUB_HOURS)}</div>
      <div><a href="tel:${CLUB_PHONE_HREF}" style="color:${t.highlight};text-decoration:none;font-weight:600;">${esc(CLUB_PHONE)}</a> · <a href="${t.siteUrl}" style="color:${t.hint};text-decoration:none;">${t.siteLabel}</a></div>
    </div>`
    : `<p style="font-size:12px;color:${t.faint};margin:24px 0 0;">${t.eyebrow} · ${t.tagline} · <a href="${t.siteUrl}" style="color:${t.hint};text-decoration:none;">${t.siteLabel}</a></p>`;

  return `
<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:${t.bg};font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${t.heading};">
  <div style="max-width:480px;margin:0 auto;padding:28px 22px;">

    ${brand}

    <h1 style="font-size:24px;margin:18px 0 4px;color:${t.heading};">${heading}</h1>
    <p style="font-size:15px;line-height:1.55;color:${t.text};margin:8px 0 20px;">${intro}</p>

    <div style="background:${t.surface};border:1px solid ${t.border};border-radius:16px;padding:18px 20px;">
      <div style="font-size:13px;color:${t.hint};text-transform:uppercase;letter-spacing:.08em;">Quand</div>
      <div style="font-size:18px;font-weight:700;color:${t.highlight};margin:2px 0 14px;">${esc(p.dateLabel)} · ${esc(p.hour)}</div>
      <div style="font-size:13px;color:${t.hint};text-transform:uppercase;letter-spacing:.08em;">Où</div>
      <div style="font-size:16px;font-weight:600;color:${t.heading};margin-top:2px;">${esc(p.location)}</div>
    </div>

    <p style="font-size:14px;line-height:1.55;color:${t.text};margin:18px 0 18px;">${closing}</p>
${cta ? `\n    ${cta}\n\n    <div style="height:18px;"></div>\n` : `\n    <div style="height:4px;"></div>\n`}
    ${bottom}

    ${footer}
  </div>
</body></html>`.trim();
}
