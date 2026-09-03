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
  kind: "confirm" | "reminder" | "requested" | "moved" | "canceled";
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

/**
 * L'EXPÉDITEUR SUIT L'IDENTITÉ (28/08/2026).
 *
 * Le corps des mails respectait déjà les deux chartes (thèmes « app » et
 * « club », 09-11/08). Mais TOUT partait sous « La Base 360 » : quelqu'un
 * réservait sur le site du Breakfast Club, recevait une lettre crème et
 * orange… annoncée dans sa boîte par une marque qu'il n'avait jamais vue.
 * La ligne de l'expéditeur est pourtant la PREMIÈRE chose qu'on lit.
 *
 * Le domaine reste `labase360.fr` — c'est lui qui est vérifié chez Resend, et
 * en changer demanderait une nouvelle validation DNS. Seul le nom affiché
 * change, et c'est lui qu'on voit dans la liste des messages.
 */
export function expediteurPour(theme: RdvEmailTheme | undefined): string {
  return theme === "club"
    ? "The Breakfast Club <rdv@labase360.fr>"
    : "La Base 360 <rdv@labase360.fr>";
}

export function rdvEmailHtml(p: RdvEmailParams): string {
  const t = THEMES[p.theme ?? "app"];
  const first = esc(p.firstName || "");
  // « , Sophie » — ou rien. Sans ça, un lead sans prénom reçoit un titre qui
  // se termine par une virgule en l'air (« On a bien reçu votre demande, »).
  const vocatif = first ? `, ${first}` : "";
  const coach = esc(p.coachName || "votre coach");
  const isDemande = p.kind === "requested";
  const isAnnule = p.kind === "canceled";
  const isDeplace = p.kind === "moved";
  // `requested` partage toute la mise en page de `confirm` — seuls le titre et
  // l'accroche changent, parce que la promesse n'est pas la même.
  const isConfirm = p.kind === "confirm" || isDemande;

  const heading = isAnnule
    ? `C'est annulé${vocatif}`
    : isDeplace
      ? `C'est noté${vocatif} ✅`
      : isDemande
        ? `On a bien reçu votre demande${vocatif}`
        : isConfirm
          ? `C'est noté${vocatif} ✅`
          : `À demain${vocatif} 🌿`;
  const intro = isAnnule
    ? `On a bien enregistré l'annulation de votre rendez-vous. Vous n'avez rien d'autre à faire.`
    : isDeplace
      ? `Votre rendez-vous avec <b style="color:${t.heading};">${coach}</b> est bien déplacé. L'ancien créneau est libéré.`
      : isDemande
      ? `Votre demande de rendez-vous avec <b style="color:${t.heading};">${coach}</b> est arrivée. On vous confirme le créneau très vite, par email.`
      : isConfirm
        ? `Votre rendez-vous avec <b style="color:${t.heading};">${coach}</b> est bien calé. On a hâte de vous voir 🌿`
        : `Petit rappel : votre rendez-vous avec <b style="color:${t.heading};">${coach}</b>, c'est demain.`;
  // Avec un lien de gestion, on invite à se servir tout seul plutôt qu'à écrire.
  const closing = isAnnule
    ? `Quand vous voudrez reprendre une heure, elle vous attend — votre body scan de 45 min vous reste offert. Au plaisir de vous accueillir 🌿`
    : isDeplace
      ? `Un rappel vous arrivera la veille. Un nouvel empêchement ? Vous pouvez redéplacer ou annuler vous-même 👇`
      : isDemande
        ? (p.manageUrl
            ? `Vous recevrez la confirmation dès qu'on aura validé le créneau. Besoin de le changer d'ici là ? Vous pouvez le faire vous-même 👇`
            : `Vous recevrez la confirmation dès qu'on aura validé le créneau. Une question d'ici là ? Répondez simplement à cet email 💬`)
        : p.manageUrl
          ? (isConfirm
              ? `Un rappel vous arrivera la veille. Un empêchement ? Vous pouvez déplacer ou annuler vous-même, en deux clics 👇`
              : `Un empêchement ? Vous pouvez déplacer ou annuler vous-même, en deux clics 👇`)
          : (isConfirm
              ? `Un rappel vous arrivera la veille. Un empêchement ? Répondez simplement à cet email, on s'arrange 💬`
              : `Un empêchement ? Répondez simplement à cet email, on s'arrange 💬`);

  /**
   * Le délai de prévenance. Demandé par Mélanie à 24 h, ramené à 12 h par
   * Thomas — « 24 h me semble lourd ». Le choix se tient : le rappel partant
   * la veille au soir, 12 h laissent encore à la personne le temps de se
   * décider après l'avoir lu, ce que 24 h ne permettaient pas.
   *
   * UNIQUEMENT sur les mails de PRISE de rendez-vous, jamais sur le rappel :
   * celui-ci part la veille, donc annoncer « au moins 12 h à l'avance » à
   * quelqu'un qui n'a plus 24 h, c'est lui reprocher un retard qu'on vient de
   * créer. Sur les confirmations, en revanche, il tombe au bon moment — la
   * personne prend note de son rendez-vous ET de la règle en même temps.
   *
   * Posé juste sous le bouton de gestion : la phrase parle de modifier ou
   * annuler, elle doit être là où l'on modifie et annule.
   */
  const prevenance = isConfirm
    ? `<p style="margin:12px 0 0 0;font-size:13px;line-height:1.55;color:${t.hint};">Toute modification ou annulation de rendez-vous doit idéalement être effectuée au minimum 12&nbsp;h à l'avance.</p>`
    : "";

  const btn = (href: string, label: string, bg: string, fg: string) =>
    `<a href="${href}" target="_blank" rel="noopener noreferrer" style="display:block;text-align:center;padding:15px 18px;background:${bg};color:${fg};border-radius:13px;text-decoration:none;font-size:15px;font-weight:700;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">${label}</a>`;

  // Le bouton « mon espace » n'a de sens que pour un CLIENT, qui en a un. Un
  // prospect vient de réserver son tout premier rendez-vous : il n'a pas encore
  // de compte, l'envoyer sur une page de connexion serait une impasse.
  // La condition porte donc sur `hasAccount`, la vraie raison — et non sur le
  // thème, qui ne dit rien de qui reçoit le mail.
  const cta = isAnnule
    ? btn(`${CLUB_URL}/reserver`, "Choisir un nouveau créneau", t.accent, t.accentInk)
    : p.manageUrl
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

  // Bloc du bas — présent côté APP seulement.
  //
  // ⚠️ 03/09/2026 — côté CLUB, il n'y en a plus. Il a d'abord porté le jeu
  // « tente de gagner ta boisson », retiré le 09/08 parce qu'il promettait une
  // boisson à quelqu'un qui vient le matin alors que le bar ouvre à 11h. Son
  // remplaçant — « le même lieu, l'après-midi » — écrivait « à partir de 11h »
  // et « jusqu'à 17h30 » en toutes lettres, dans un mail envoyé tous les
  // jours : au premier changement d'horaires il se met à mentir, et personne
  // ne pense à relire un gabarit. Thomas l'a coupé.
  //
  // Les vrais horaires vivent dans CLUB_HOURS, une seule constante, et
  // figurent déjà au pied de page. Un mail de rendez-vous n'a rien d'autre à
  // vendre : il dit quand, où, et comment changer d'avis.
  const bottom = (p.theme ?? "app") === "club"
    ? ""
    : `<div style="background:${t.contestBg};border:1px solid ${t.contestBorder};border-radius:16px;padding:18px 20px;">
      <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${t.accent};font-weight:700;">🥤 La Base Shakes&amp;Drinks</div>
      <div style="font-size:17px;font-weight:700;color:${t.heading};margin:6px 0 4px;">Tentez de gagner votre boisson 🎁</div>
      <p style="font-size:13.5px;line-height:1.5;color:${t.text};margin:0 0 14px;">Connaissez-vous La Base Shakes&amp;Drinks, notre bar healthy de boissons saines à emporter ? À votre prochain rendez-vous, participez au tirage et repartez avec votre boisson offerte.</p>
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
${cta ? `\n    ${cta}\n${prevenance ? `    ${prevenance}\n` : ""}\n    <div style="height:18px;"></div>\n` : `${prevenance ? `\n    ${prevenance}\n` : ""}\n    <div style="height:4px;"></div>\n`}
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
  const vocatif = first ? `, ${first}` : "";
  const coach = esc(p.coachName || "votre coach");
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

    <h1 style="font-size:26px;line-height:1.15;margin:22px 0 6px;color:${t.heading};letter-spacing:-.02em;">C'est confirmé${vocatif}</h1>
    <p style="font-size:15px;line-height:1.6;color:${t.text};margin:8px 0 22px;">
      <b style="color:${t.heading};">${coach}</b> vient de bloquer ce créneau dans son agenda. On a hâte de vous rencontrer et de comprendre ce que vous voulez changer.
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
      ${etape("1", "On parle de vous", "Votre quotidien, votre énergie, ce qui coince depuis un moment. C'est le plus long, et le plus utile.")}
      ${etape("2", "On mesure où vous en êtes", "Un point de départ, simplement. Pas de jugement &mdash; juste des chiffres pour savoir d'où on part.")}
      ${etape("3", "On pose un cap", "Vous repartez avec quelque chose de clair. Rien à décider sur place.")}
    </table>

    <div style="background:${t.surface};border:1px solid ${t.border};border-radius:14px;padding:15px 18px;margin-top:4px;">
      <p style="font-size:14px;line-height:1.6;color:${t.text};margin:0;">
        Prévoyez <b style="color:${t.heading};">${duree} minutes</b>, et venez comme vous êtes. Un rappel vous arrivera la veille.
      </p>
      <!-- Délai de prévenance (Mélanie, ramené de 24 h à 12 h par Thomas). Ce mail-ci
           n'ouvre volontairement aucune porte de sortie (décision Thomas :
           « c'est confirmé, on n'ouvre pas la sortie »), donc la phrase reste
           une INFORMATION posée à sa place — dans l'encadré pratique, avec la
           durée et le rappel — et non un bouton d'annulation déguisé. -->
      <p style="font-size:13px;line-height:1.55;color:${t.hint};margin:10px 0 0;">
        Toute modification ou annulation de rendez-vous doit idéalement être effectuée au minimum 12&nbsp;h à l'avance.
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

// ─────────────────────────────────────────────────────────────────────────────
// Notification INTERNE (labaseverdun@gmail.com) — 2026-08-11.
//
// Elle était écrite en dur dans book-rdv, en crème + orange Breakfast Club,
// y compris pour annoncer un RDV **La Base 360**. Deux chartes mélangées dans
// le même mail : c'est le défaut qu'on traque partout ailleurs dans l'app, et
// personne ne l'avait vu parce qu'on ne relit pas un email interne.
//
// Même table THEMES que les mails prospects — donc une seule source pour les
// deux marques. `theme: "app"` pour un bilan, `theme: "club"` pour une
// candidature Breakfast Club : chacune garde SA charte, aucune ne déborde.
// ─────────────────────────────────────────────────────────────────────────────

export interface NotifInterneParams {
  theme?: RdvEmailTheme;
  /** Petit label mono au-dessus du titre. Ex. « 🗓️ Nouveau RDV ». */
  eyebrow: string;
  titre: string;
  /** Une phrase de contexte. Peut contenir du HTML déjà échappé (<b>). */
  phrase: string;
  /** Les faits, en paires clé → valeur. Valeur déjà échappée. */
  lignes: Array<[string, string]>;
  /** Ce qu'il reste à faire, en bas. */
  pied: string;
}

export function notifInterneHtml(p: NotifInterneParams): string {
  const t = THEMES[p.theme ?? "app"];
  const mono = "ui-monospace,Menlo,Consolas,monospace";

  const lignes = p.lignes
    .filter(([, v]) => v && v !== "—")
    .map(([k, v]) => `
      <tr>
        <td style="padding:7px 16px 7px 0;font-family:${mono};font-size:11px;color:${t.hint};text-transform:uppercase;letter-spacing:.1em;white-space:nowrap;vertical-align:top;">${esc(k)}</td>
        <td style="padding:7px 0;font-size:14.5px;font-weight:600;color:${t.heading};line-height:1.45;">${v}</td>
      </tr>`)
    .join("");

  return `
<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:${t.bg};font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${t.heading};">
  <div style="max-width:480px;margin:0 auto;padding:28px 22px;">

    <div style="font-family:${mono};font-size:11.5px;letter-spacing:.18em;text-transform:uppercase;color:${t.accent};font-weight:700;">${esc(p.eyebrow)}</div>
    <h1 style="font-size:23px;line-height:1.2;margin:10px 0 4px;color:${t.heading};letter-spacing:-.02em;">${esc(p.titre)}</h1>
    <p style="font-size:14.5px;line-height:1.6;color:${t.text};margin:6px 0 20px;">${p.phrase}</p>

    <div style="background:${t.surface};border:1px solid ${t.border};border-radius:16px;padding:14px 20px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
        ${lignes}
      </table>
    </div>

    <p style="font-size:13px;line-height:1.6;color:${t.hint};margin:18px 0 0;">${esc(p.pied)}</p>
    <p style="font-family:${mono};font-size:11.5px;color:${t.faint};margin:24px 0 0;padding-top:16px;border-top:1px solid ${t.border};">${t.eyebrow} · ${t.tagline} · ${t.siteLabel}</p>
  </div>
</body></html>`.trim();
}
