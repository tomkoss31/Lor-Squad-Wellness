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
const CONTEST_URL = "https://commande.labase-nutrition.com/jeu";

// Coordonnées du club — la source unique est `clubEmail.ts`, pour qu'un
// changement d'horaire n'ait qu'un seul endroit où être fait. (Ce fichier les
// hébergeait ; le mail d'achat de carte en avait besoin aussi, et deux copies
// d'une adresse finissent toujours par diverger.)
import { CLUB_URL, CLUB_ADDRESS, CLUB_HOURS, CLUB_PHONE, CLUB_PHONE_HREF } from "./clubEmail.ts";

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
  // La Base 360 — remis à la charte le 2026-08-11. Ce mail avait deux
  // décalages que personne n'avait vus, parce qu'on ne relit pas un email :
  //   • le fond était #0B0D11, le bleu nuit abandonné (la charte, c'est le
  //     vert profond #162624) ;
  //   • la date du rendez-vous et le bouton étaient peints en #C9A84C, le doré
  //     purgé de toute l'app — le dernier endroit où il survivait, et le
  //     premier écran que voit un prospect.
  // Valeurs reprises telles quelles du design system (tokens/colors.css).
  app: {
    bg: "#162624", surface: "#1E3330", border: "rgba(255,255,255,.09)",
    heading: "#F4EFE4", text: "#9BAAA3", hint: "#74847C", faint: "#5A6B64",
    accent: "#2DD4BF", accentInk: "#0A1F1C",
    // Le teal est la couleur de structure. Le lime reste réservé aux
    // victoires — un rendez-vous confirmé n'en est pas encore une.
    highlight: "#2DD4BF",
    eyebrow: "La Base 360", tagline: "The wellness nutrition club",
    contestBg: "#1E3330", contestBorder: "rgba(45,212,191,.22)",
    contestBtnBg: "#2DD4BF", contestBtnInk: "#0A1F1C",
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
  /**
   * `requested` — la demande vient d'être posée, personne ne l'a encore
   *   acceptée. C'est l'état réel d'un RDV pris sur /rdv (book-rdv crée en
   *   `status: "requested"`). Avant le 2026-08-11 ce cas empruntait `confirm`
   *   et annonçait « c'est bien calé » — un rendez-vous que le coach n'avait
   *   pas encore vu. Le vrai « c'est confirmé » part maintenant à
   *   l'acceptation (cf. rdvAccepteEmailHtml).
   * `confirm`  — le rendez-vous EST calé. Réservé aux clients de suivi
   *   (rdv-confirm-client), dont le RDV est confirmé dès sa création.
   * `reminder` — le rappel de la veille.
   */
  kind: "confirm" | "reminder" | "requested";
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
  /**
   * Le destinataire a-t-il un espace client ? Défaut `true` : les mails aux
   * CLIENTS (rdv-confirm-client, client-rdv-reminder) gardent leur bouton.
   * Les tunnels publics passent `false` — un prospect qui réserve son 1er RDV
   * n'a pas de compte, le bouton l'enverrait sur une connexion impossible
   * (retour Thomas 2026-08-09, d'abord côté club puis sur le funnel /rdv).
   */
  hasAccount?: boolean;
}

export function rdvEmailHtml(p: RdvEmailParams): string {
  const t = THEMES[p.theme ?? "app"];
  const first = esc(p.firstName || "");
  const coach = esc(p.coachName || "ton coach");
  const isDemande = p.kind === "requested";
  // `requested` partage toute la mise en page de `confirm` — seuls le titre et
  // l'accroche changent, parce que la promesse n'est pas la même.
  const isConfirm = p.kind === "confirm" || isDemande;

  const heading = isDemande
    ? `On a bien reçu ta demande, ${first}`
    : isConfirm
      ? `C'est noté, ${first} ✅`
      : `À demain, ${first} 🌿`;
  const intro = isDemande
    ? `Ta demande de rendez-vous avec <b style="color:${t.heading};">${coach}</b> est arrivée. On te confirme le créneau très vite, par email.`
    : isConfirm
      ? `Ton rendez-vous avec <b style="color:${t.heading};">${coach}</b> est bien calé. On a hâte de te voir 🌿`
      : `Petit rappel : ton rendez-vous avec <b style="color:${t.heading};">${coach}</b>, c'est demain.`;
  // Avec un lien de gestion, on invite à se servir tout seul plutôt qu'à écrire.
  const closing = isDemande
    ? (p.manageUrl
        ? `Tu recevras la confirmation dès qu'on aura validé le créneau. Besoin de le changer d'ici là ? Tu peux le faire toi-même 👇`
        : `Tu recevras la confirmation dès qu'on aura validé le créneau. Une question d'ici là ? Réponds simplement à cet email 💬`)
    : p.manageUrl
      ? (isConfirm
          ? `Un rappel t'arrivera la veille. Un empêchement ? Tu peux déplacer ou annuler toi-même, en deux clics 👇`
          : `Pense à bien t'hydrater d'ici là 💧 Un empêchement ? Déplace ou annule toi-même 👇`)
      : (isConfirm
          ? `Un rappel t'arrivera la veille. Un empêchement ? Réponds simplement à cet email, on s'arrange 💬`
          : `Pense à bien t'hydrater d'ici là 💧 Un empêchement ? Réponds à cet email, on s'arrange.`);

  const btn = (href: string, label: string, bg: string, fg: string) =>
    `<a href="${href}" target="_blank" rel="noopener noreferrer" style="display:block;text-align:center;padding:15px 18px;background:${bg};color:${fg};border-radius:13px;text-decoration:none;font-size:15px;font-weight:700;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">${label}</a>`;

  // Le bouton « mon espace » n'a de sens que pour un CLIENT, qui en a un. Un
  // prospect vient de réserver son tout premier rendez-vous : il n'a pas encore
  // de compte, l'envoyer sur une page de connexion serait une impasse.
  // La condition porte donc sur `hasAccount`, la vraie raison — et non sur le
  // thème, qui ne dit rien de qui reçoit le mail.
  const cta = p.manageUrl
    ? btn(p.manageUrl, "Modifier / annuler mon rendez-vous", t.accent, t.accentInk)
    : (p.hasAccount ?? true)
      ? btn(APP_URL, "Accéder à mon espace →", t.accent, t.accentInk)
      : "";

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

// =============================================================================
// rdvAccepteEmailHtml — « C'est confirmé » (2026-08-11, maquette validée Thomas)
//
// Le mail que reçoit le prospect quand le coach ACCEPTE sa demande dans le CRM.
// Jusqu'ici il ne recevait rien : les trois endroits qui changent le statut
// faisaient un `update({ status })` nu. Une personne réservait, lisait « on a
// bien reçu ta demande », et n'apprenait jamais que c'était validé.
//
// Fonction séparée plutôt qu'un 4e `kind` dans rdvEmailHtml : la mise en page
// diffère (les trois temps du rendez-vous), et empiler une condition de plus
// dans l'autre fonction l'aurait rendue illisible.
//
// Décisions Thomas :
//   • aucun bouton d'annulation — c'est confirmé, on n'ouvre pas la sortie ;
//   • pas de bloc jeu concours — ce mail parle du rendez-vous, point ;
//   • signé « L'équipe La Base » ;
//   • deux ambiances, un seul gabarit : le mail doit ressembler à la porte que
//     la personne vient de franchir (app pour un lead colis, club pour un lead
//     Breakfast Club).
// =============================================================================

export interface RdvAccepteParams {
  firstName: string;
  coachName: string;
  dateLabel: string;
  hour: string;
  /** Adresse sur deux lignes : rue, puis code postal + ville. */
  addressLine1: string;
  addressLine2: string;
  durationMin?: number;
  theme?: RdvEmailTheme;
}

export function rdvAccepteEmailHtml(p: RdvAccepteParams): string {
  const t = THEMES[p.theme ?? "app"];
  const club = (p.theme ?? "app") === "club";
  const first = esc(p.firstName || "");
  const coach = esc(p.coachName || "ton coach");
  const duree = p.durationMin ?? 45;
  const mono = "ui-monospace,Menlo,Consolas,monospace";

  // Le logo, en PNG : ni Gmail ni Outlook n'affichent un SVG.
  const marque = club
    ? `<img src="${CLUB_URL}/brand/breakfast-club/logo-heart.png" alt="The Breakfast Club by La Base" width="190" style="width:190px;max-width:72%;height:auto;display:block;border:0;">`
    : `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="padding-right:11px;vertical-align:middle;">
          <img src="${APP_URL}/brand/labase360/logo-email.png" alt="" width="42" height="42" style="display:block;border:0;width:42px;height:42px;">
        </td>
        <td style="vertical-align:middle;">
          <div style="font-family:${mono};font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:${t.accent};font-weight:700;">${t.eyebrow}</div>
          <div style="font-size:11px;color:${t.faint};letter-spacing:.04em;margin-top:3px;">${t.tagline}</div>
        </td></tr></table>`;

  // Les trois temps du rendez-vous. Ce qui fait peur à quelqu'un qui n'est
  // jamais venu, ce n'est pas l'heure — c'est de ne pas savoir ce qui l'attend.
  const etape = (n: string, titre: string, texte: string) => `
    <tr>
      <td style="padding:0 12px 0 0;vertical-align:top;width:26px;">
        <div style="font-family:${mono};font-size:13px;font-weight:700;color:${t.accent};line-height:1.5;">${n}</div>
      </td>
      <td style="padding:0 0 14px;vertical-align:top;">
        <div style="font-size:14.5px;font-weight:700;color:${t.heading};margin-bottom:2px;">${titre}</div>
        <div style="font-size:13.5px;line-height:1.55;color:${t.text};">${texte}</div>
      </td>
    </tr>`;

  const pied = club
    ? `<div style="margin:26px 0 0;padding-top:18px;border-top:1px solid ${t.border};font-size:12.5px;line-height:1.75;color:${t.text};">
        <div style="font-weight:700;color:${t.heading};">The Breakfast Club by La Base</div>
        <div>${esc(CLUB_ADDRESS)}</div>
        <div>${esc(CLUB_HOURS)}</div>
        <div><a href="tel:${CLUB_PHONE_HREF}" style="color:${t.highlight};text-decoration:none;font-weight:600;">${esc(CLUB_PHONE)}</a></div>
      </div>`
    : `<p style="font-family:${mono};font-size:11.5px;color:${t.faint};margin:26px 0 0;padding-top:18px;border-top:1px solid ${t.border};">${t.eyebrow} · ${t.tagline} · ${t.siteLabel}</p>`;

  return `
<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:${t.bg};font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${t.heading};">
  <div style="max-width:480px;margin:0 auto;padding:28px 22px;">

    ${marque}

    <h1 style="font-size:26px;line-height:1.15;margin:22px 0 6px;color:${t.heading};letter-spacing:-.02em;">C'est confirmé, ${first}</h1>
    <p style="font-size:15px;line-height:1.6;color:${t.text};margin:8px 0 22px;">
      <b style="color:${t.heading};">${coach}</b> vient de bloquer ce créneau dans son agenda. On a hâte de te rencontrer et de comprendre ce que tu veux changer.
    </p>

    <div style="background:${t.surface};border:1px solid ${t.border};border-radius:16px;padding:18px 20px;">
      <div style="font-family:${mono};font-size:11px;color:${t.hint};text-transform:uppercase;letter-spacing:.14em;">Quand</div>
      <div style="font-size:19px;font-weight:700;color:${t.highlight};margin:4px 0 16px;letter-spacing:-.01em;">${esc(p.dateLabel)} · ${esc(p.hour)}</div>
      <div style="font-family:${mono};font-size:11px;color:${t.hint};text-transform:uppercase;letter-spacing:.14em;">Où</div>
      <div style="font-size:16px;font-weight:600;color:${t.heading};margin-top:4px;">${esc(p.addressLine1)}<br>${esc(p.addressLine2)}</div>
    </div>

    <div style="height:26px;"></div>

    <div style="font-family:${mono};font-size:11px;color:${t.hint};text-transform:uppercase;letter-spacing:.14em;margin-bottom:14px;">Ce qu'on va faire ensemble</div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
      ${etape("1", "On parle de toi", "Ton quotidien, ton énergie, ce qui coince depuis un moment. C'est le plus long, et le plus utile.")}
      ${etape("2", "On mesure où tu en es", "Un point de départ, simplement. Pas de jugement &mdash; juste des chiffres pour savoir d'où on part.")}
      ${etape("3", "On pose un cap", "Tu repars avec quelque chose de clair. Rien à décider sur place.")}
    </table>

    <div style="background:${t.surface};border:1px solid ${t.border};border-radius:14px;padding:15px 18px;margin-top:4px;">
      <p style="font-size:14px;line-height:1.6;color:${t.text};margin:0;">
        Prévois <b style="color:${t.heading};">${duree} minutes</b>, et viens comme tu es. Un rappel t'arrivera la veille.
      </p>
    </div>

    <p style="font-size:14.5px;line-height:1.6;color:${t.text};margin:24px 0 0;">
      À très vite,<br>
      <b style="color:${t.heading};">L'équipe La Base</b>
    </p>

    ${pied}
  </div>
</body></html>`.trim();
}
