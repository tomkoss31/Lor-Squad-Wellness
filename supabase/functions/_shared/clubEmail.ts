// =============================================================================
// _shared/clubEmail.ts — identité du Breakfast Club dans les emails.
//
// Deux choses vivent ici :
//   1. les COORDONNÉES du club (source unique — `rdvEmail.ts` les importe) ;
//   2. le mail de CONFIRMATION D'ACHAT d'une carte de visites.
//
// Pourquoi un fichier à part plutôt qu'un `kind` de plus dans `rdvEmail.ts` :
// celui-ci est structuré autour d'un rendez-vous (date, heure, lieu, lien de
// modification). Un achat n'a ni heure ni lieu — il a un montant, un nombre de
// visites et une date de fin de validité. Forcer les deux dans un même gabarit
// aurait produit des champs vides d'un côté ou de l'autre.
//
// HTML email-safe, comme rdvEmail : styles inline, couleurs solides (Outlook ne
// rend ni dégradé ni color-mix), largeur max 480.
// =============================================================================

export const CLUB_URL = "https://www.labase-nutrition.com";

// Reprises telles quelles du pied de page du site (ClubShell.tsx).
export const CLUB_ADDRESS = "11 rue Saint Pierre · 55100 Verdun";
export const CLUB_HOURS = "Lun–Ven 7h–11h · Sam 8h–11h · Dimanche fermé";
export const CLUB_PHONE = "06 79 44 87 59";
export const CLUB_PHONE_HREF = "+33679448759";

const LOGO = `${CLUB_URL}/brand/breakfast-club/logo-heart.png`;

// Crème + orange du site public — mêmes valeurs que le thème "club" de rdvEmail.
const C = {
  bg: "#F0E7D7", surface: "#FFFFFF", border: "#E7E1D6",
  heading: "#17201C", text: "#55605A", hint: "#8A938D",
  accent: "#FF6A2B", accentInk: "#FFFFFF", highlight: "#E0532A",
  softBg: "#FCF8F1",
};

function esc(s: string): string {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}

/** Date longue en français, sans dépendance : « 9 novembre 2026 ». */
export function frenchDate(d: Date): string {
  const M = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  // Le club est à Paris : on formate dans SON fuseau, pas en UTC — sinon une
  // carte achetée après 23h porte la date de la veille.
  const p = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "numeric", year: "numeric" }).formatToParts(d);
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${get("day")} ${M[Number(get("month")) - 1]} ${get("year")}`;
}

export interface ClubCardEmailParams {
  firstName: string;
  /** 10 ou 30. */
  cardType: number;
  amountEur: number;
  /** Durée de validité en jours (30 ou 90) — vient de clubs.settings.cards. */
  validityDays: number;
  /** Fin de validité déjà calculée, pour ne pas la recalculer différemment ici. */
  expiresLabel: string;
}

/**
 * Mail envoyé À L'ACHETEUR après un paiement abouti.
 *
 * Il ne se contente pas de dire merci : c'est la PREUVE D'ACHAT que le membre
 * présentera au comptoir (décision Thomas — « le mail de paiement fait foi »).
 * Il doit donc porter, lisibles sans ouvrir de pièce jointe : le nombre de
 * visites, le montant, et la date de fin de validité.
 */
export function clubCardEmailHtml(p: ClubCardEmailParams): string {
  // Sans décimales inutiles : « 8 € » et non « 8,00 € », comme sur le site.
  const raw = p.amountEur / p.cardType;
  const perVisit = (Number.isInteger(raw) ? String(raw) : raw.toFixed(2)).replace(".", ",");

  const line = (k: string, v: string, strong = false) => `
    <tr>
      <td style="padding:9px 0;border-bottom:1px solid ${C.border};font-size:14px;color:${C.hint};">${esc(k)}</td>
      <td style="padding:9px 0;border-bottom:1px solid ${C.border};font-size:${strong ? "16px" : "14px"};color:${C.heading};font-weight:${strong ? 800 : 600};text-align:right;">${esc(v)}</td>
    </tr>`;

  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${C.bg};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Ta carte ${esc(String(p.cardType))} visites est validée — garde ce mail, il fait office de preuve d'achat.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:26px 14px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:${C.surface};border:1px solid ${C.border};border-radius:18px;overflow:hidden;">

        <tr><td align="center" style="padding:28px 26px 6px 26px;">
          <img src="${LOGO}" alt="The Breakfast Club by La Base" width="190" style="width:190px;max-width:72%;height:auto;display:block;border:0;">
        </td></tr>

        <tr><td style="padding:18px 26px 0 26px;">
          <p style="margin:0;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:${C.highlight};font-weight:800;">Paiement reçu</p>
          <h1 style="margin:8px 0 0 0;font-size:25px;line-height:1.25;color:${C.heading};">Ta carte est validée, ${esc(p.firstName)} 🎉</h1>
          <p style="margin:12px 0 0 0;font-size:15px;line-height:1.65;color:${C.text};">
            On t'attend demain matin. <strong style="color:${C.heading};">Garde ce mail</strong> — c'est lui qui fait foi au comptoir pour ta carte.
          </p>
        </td></tr>

        <tr><td style="padding:18px 26px 0 26px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.softBg};border:1px solid ${C.border};border-radius:14px;padding:4px 16px;">
            ${line("Ta carte", `${p.cardType} visites`, true)}
            ${line("Montant payé", `${p.amountEur} €`, true)}
            ${line("Soit", `${perVisit} € la visite`)}
            ${line("Valable", `${p.validityDays} jours — jusqu'au ${p.expiresLabel}`)}
          </table>
          <p style="margin:10px 2px 0 2px;font-size:12.5px;line-height:1.6;color:${C.hint};">
            Les visites non utilisées à cette date sont perdues, et la carte n'est pas remboursable. Un imprévu sérieux&nbsp;? Appelle-nous, on regarde ensemble.
          </p>
        </td></tr>

        <tr><td style="padding:20px 26px 4px 26px;">
          <p style="margin:0 0 10px 0;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:${C.hint};font-weight:800;">Ta première visite</p>
          <p style="margin:0;font-size:15px;line-height:1.7;color:${C.text};">
            Tu passes quand tu veux pendant les horaires — pas besoin de rendez-vous. Dis simplement ton nom en arrivant&nbsp;: on retrouve ta carte, et on te sert ton aloé, ton thé et ton smoothie.
          </p>
        </td></tr>

        <tr><td align="center" style="padding:22px 26px 6px 26px;">
          <a href="${CLUB_URL}" style="display:inline-block;background:${C.accent};color:${C.accentInk};text-decoration:none;font-weight:800;font-size:15px;padding:14px 28px;border-radius:999px;">Revoir le rituel du matin</a>
        </td></tr>

        <tr><td style="padding:22px 26px 26px 26px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${C.border};">
            <tr><td style="padding-top:16px;font-size:13px;line-height:1.75;color:${C.hint};">
              <strong style="color:${C.heading};">The Breakfast Club</strong><br>
              ${esc(CLUB_ADDRESS)}<br>
              ${esc(CLUB_HOURS)}<br>
              <a href="tel:${CLUB_PHONE_HREF}" style="color:${C.highlight};text-decoration:none;font-weight:700;">${esc(CLUB_PHONE)}</a>
            </td></tr>
          </table>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;
}

/**
 * Mail interne (boîte partagée du club) : qui a payé quoi, et quoi faire.
 *
 * Volontairement sec et actionnable — il finit par la SEULE action à faire,
 * parce que le paiement en ligne ne crée pas la carte tout seul : c'est un
 * coach qui l'attribue dans BBC, à la personne, une fois sa fiche créée.
 */
export function clubCardLeadEmailHtml(p: ClubCardEmailParams & { email: string }): string {
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${C.bg};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:26px 14px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:${C.surface};border:1px solid ${C.border};border-radius:18px;padding:26px;">
        <tr><td>
          <p style="margin:0;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:${C.highlight};font-weight:800;">Carte payée en ligne</p>
          <h1 style="margin:8px 0 14px 0;font-size:23px;line-height:1.3;color:${C.heading};">${esc(p.firstName)} — carte ${esc(String(p.cardType))} visites</h1>
          <p style="margin:0 0 4px 0;font-size:15px;color:${C.text};"><strong style="color:${C.heading};">${p.amountEur} €</strong> encaissés · valable ${esc(String(p.validityDays))} jours (jusqu'au ${esc(p.expiresLabel)})</p>
          <p style="margin:0 0 18px 0;font-size:15px;color:${C.text};">Contact : <a href="mailto:${esc(p.email)}" style="color:${C.highlight};">${esc(p.email)}</a></p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.softBg};border:1px solid ${C.border};border-radius:14px;">
            <tr><td style="padding:16px;font-size:14.5px;line-height:1.7;color:${C.text};">
              <strong style="color:${C.heading};">À faire :</strong> attribuer la carte dans l'app — <em>BBC → Club → le membre → Attribuer une carte ${esc(String(p.cardType))}</em>.<br>
              L'argent est déjà encaissé, mais le compteur de visites ne démarre qu'une fois la carte attribuée.
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
