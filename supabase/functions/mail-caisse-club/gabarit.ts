// =============================================================================
// Le gabarit de « La caisse du club, en 4 gestes » (mail-caisse-club, 26/09/2026).
//
// À part de index.ts pour être relu et affiché sans Deno (aperçu envoyé à Thomas
// avant tout envoi). Même identité que le mode d'emploi de l'agenda : crème du
// Breakfast Club, mini-écrans dessinés en tableaux HTML (ils s'affichent même
// quand la messagerie bloque les images), des exemples INVENTÉS — jamais le nom
// d'une vraie membre. Les prix sont ceux du tableau du comptoir (26/09).
//
// LE TON (règle de Thomas, pour l'équipe) : on propose un outil, on n'impose
// rien ; pas de date butoir, rien qui date le texte.
// =============================================================================

import { escapeHtml } from "../_shared/email.ts";

const LOGO = "https://www.labase-nutrition.com/brand/breakfast-club/logo-heart.png";
/** Le club, en mode Breakfast Club : « Le matin ». La caisse s'ouvre au pointage. */
export const URL_APP = "https://www.labase360.fr/co-pilote";

const POLICE = "font-family:'Poppins',Helvetica,Arial,sans-serif;";
const MONO = "font-family:'Courier New',monospace;";
// Les couleurs du thème sombre de l'app, posées sur le fond d'un mini-écran (#162624).
const TEXTE = "#F4EFE4";
const DOUX = "#AEB9B2";
const TRAIT = "#2E4A44";
const ORANGE = "#FF7A45";
const ORANGE_TEXTE = "#FF9A6B";
const ORANGE_FOND = "#373229";
const AMBRE_TEXTE = "#F0C06A";
const AMBRE_FOND = "#333827";
const DEGRADE = "background:#FF3B33;background:linear-gradient(135deg,#FF7A2F,#FF1E3C);";

function ecran(contenu: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#162624" style="margin:14px 0 0;background:#162624;border-radius:16px;"><tr><td class="ecran" style="padding:16px 18px;${POLICE}">${contenu}</td></tr></table>`;
}

function titreBloc(n: number, texte: string): string {
  return `<p style="margin:30px 0 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#E0532A;font-weight:700;">${n} &middot; ${texte}</p>`;
}

function para(html: string): string {
  return `<p style="margin:6px 0 0;font-size:14.5px;line-height:1.6;color:#55605A;">${html}</p>`;
}

const fort = (t: string) => `<b style="color:#17201C;">${t}</b>`;

/** Une ligne de produit de la caisse : nom, « la dernière fois », quantité, total. */
function ligneProduit(nom: string, sous: string, qte: number, total: string): string {
  const b = `border-top:1px solid ${TRAIT};`;
  return `<tr>
    <td style="padding:10px 0;${b}font-size:14px;font-weight:700;color:${TEXTE};">${nom}<br><span style="font-size:11.5px;font-weight:400;color:${DOUX};">${sous}</span></td>
    <td align="right" style="padding:10px 0;${b}white-space:nowrap;"><span style="display:inline-block;width:26px;height:26px;line-height:26px;text-align:center;border:1px solid #4A625B;border-radius:999px;font-size:14px;color:${DOUX};">&minus;</span><span style="display:inline-block;min-width:26px;text-align:center;${MONO}font-size:15px;font-weight:700;color:${TEXTE};">${qte}</span><span style="display:inline-block;width:26px;height:26px;line-height:26px;text-align:center;border:1px solid ${ORANGE};border-radius:999px;font-size:14px;color:${ORANGE_TEXTE};">+</span></td>
    <td align="right" width="70" style="padding:10px 0;${b}${MONO}font-size:13px;font-weight:700;color:${TEXTE};">${total}</td>
  </tr>`;
}

/** Une puce d'upgrade (« Grand thé-aloé 2,60 € ») ; cochée = ajoutée à son shake. */
function puce(nom: string, prix: string, on = false): string {
  return `<td style="padding:0 6px 6px 0;"><span style="display:inline-block;padding:8px 11px;border:1px solid ${on ? ORANGE : "#4A625B"};border-radius:999px;${on ? `background:${ORANGE_FOND};` : ""}font-size:12.5px;font-weight:${on ? 700 : 400};color:${on ? ORANGE_TEXTE : TEXTE};">${on ? "&#10003;&nbsp;" : ""}${nom} <span style="${MONO}font-size:11.5px;color:${on ? ORANGE_TEXTE : DOUX};">${prix}</span></span></td>`;
}

/** Une case « qui encaisse » : le club ou la coach en caisse. */
function caseQui(titre: string, lignes: string[], pied: string, accent: string): string {
  return `<td width="50%" valign="top" style="padding:12px 12px 12px 14px;border:1px solid ${TRAIT};border-radius:12px;">
    <p style="margin:0;${MONO}font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;color:${accent};">${titre}</p>
    ${lignes.map((l) => `<p style="margin:8px 0 0;font-size:13px;line-height:1.45;color:${TEXTE};">${l}</p>`).join("")}
    <p style="margin:10px 0 0;font-size:12px;line-height:1.45;color:${DOUX};">${pied}</p>
  </td>`;
}

export function gabarit(p: { prenom: string; expediteur: string }): string {
  return `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>La caisse du club</title>
<style>@media (max-width:520px){.inner{padding:24px 18px 28px !important}.h1{font-size:27px !important}.logo{width:160px !important}.ecran{padding:12px 12px !important}.qui td{display:block !important;width:auto !important}} a{color:#E0532A}</style>
</head>
<body style="margin:0;padding:0;background:#ECE3D2;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#ECE3D2;font-size:1px;line-height:1px;">Ce que tu vends au comptoir, noté en un geste : tu vois ce que tu gagnes, et tes membres ne tombent plus à court. Le mode d'emploi en 4 gestes.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ECE3D2;"><tr><td align="center" style="padding:26px 12px 46px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#FCF8F1;border-radius:16px;overflow:hidden;">
      <tr><td style="height:6px;line-height:6px;font-size:6px;${DEGRADE}">&nbsp;</td></tr>
      <tr><td class="inner" style="padding:30px 34px 34px;${POLICE}">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
          <img class="logo" src="${LOGO}" alt="The Breakfast Club by La Base" width="190" style="display:block;width:190px;max-width:78%;height:auto;border:0;">
        </td></tr></table>
        <p style="text-align:center;margin:20px 0 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#E0532A;font-weight:700;">Pour l'équipe &middot; mode d'emploi</p>
        <h1 class="h1" style="margin:8px 0 0;font-family:'Anton','Arial Narrow',Impact,Helvetica,sans-serif;font-weight:400;text-transform:uppercase;letter-spacing:.5px;font-size:31px;line-height:1.06;color:#17201C;text-align:center;">La caisse du club,<br>en 4 gestes</h1>

        <p style="margin:22px 0 0;font-size:16px;font-weight:600;color:#17201C;">Salut ${escapeHtml(p.prenom)},</p>
        <p style="margin:14px 0 0;font-size:15px;line-height:1.62;color:#55605A;">L'app a ${fort("une caisse pour le comptoir")}. Elle ne prend aucun paiement&nbsp;: elle ${fort("note ce que tu vends")}, en un geste au pointage. Tu vois ce que tu gagnes vraiment, et tes membres ne tombent plus à court de sachets. Voici comment t'en servir.</p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 0;background:#F4EEE1;border-radius:12px;"><tr><td style="padding:14px 16px;font-size:13.5px;line-height:1.6;color:#55605A;${POLICE}">
          ${fort("Où la trouver&nbsp;?")}<br>
          Elle s'ouvre ${fort("toute seule après le +1")} du pointage.<br>
          Sur la fiche d'une membre&nbsp;: ${fort("Ses achats au comptoir")}.<br>
          Ce que tu as vendu et gagné&nbsp;: ${fort("&#8943; Plus &rsaquo; Ma caisse")}.
        </td></tr></table>

        ${titreBloc(1, "«&nbsp;Elle prend quelque chose&nbsp;?&nbsp;»")}
        ${para(`Après le ${fort("+1")}, la caisse s'ouvre&nbsp;: ses habituels d'abord, les upgrades d'un toucher, tout le tableau plus bas. ${fort("Payé sur mon terminal")} note la vente, ${fort("Rien aujourd'hui")} ferme. Jamais obligatoire. Elle passe juste acheter&nbsp;? Sur sa fiche, «&nbsp;Lui vendre quelque chose&nbsp;».`)}
        ${ecran(
          `<p style="margin:0;font-size:17px;font-weight:700;color:${TEXTE};">Julie prend quelque chose&nbsp;?</p>
          <p style="margin:2px 0 10px;${MONO}font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#8FA39A;">+1 visite &#10003; &middot; ses habituels</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            ${ligneProduit("Formula 1", "sachet &middot; la dernière fois&nbsp;: 3", 3, "11,40&nbsp;€")}
            ${ligneProduit("PDM", "sachet &middot; 2 doses", 0, "")}
          </table>
          <p style="margin:12px 0 6px;${MONO}font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#8FA39A;">Avec son shake</p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${puce("Grand thé-aloé", "2,60&nbsp;€", true)}${puce("F3", "1,30&nbsp;€")}${puce("Collagène", "2,80&nbsp;€")}</tr></table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0 0;"><tr><td align="center" style="border-radius:999px;${DEGRADE}padding:13px 16px;font-size:15px;font-weight:700;color:#FFFFFF;">Payé sur mon terminal &middot; 14,00&nbsp;€</td></tr></table>
          <p style="margin:10px 0 0;text-align:center;font-size:13px;color:${DOUX};text-decoration:underline;">Rien aujourd'hui</p>`,
        )}

        ${titreBloc(2, "Qui encaisse quoi")}
        ${para(`La carte de visites, c'est le club. Tout ce qui s'ajoute vient de ${fort("tes pots")}, achetés avec ta remise, et se paie sur ${fort("ton terminal")}&nbsp;: tu gardes ta marge, rien à reverser. L'app n'encaisse rien, elle note. Un seul prix pour tout le club&nbsp;: celui du tableau du comptoir.`)}
        ${ecran(
          `<table class="qui" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;border-spacing:0;"><tr>
            ${caseQui("Le club", ["La carte de visites", "Le shake et la boisson du matin, servis avec le stock du club"], "Le propriétaire encaisse.", AMBRE_TEXTE)}
            <td width="8" style="font-size:1px;">&nbsp;</td>
            ${caseQui("Toi, en caisse", ["Les upgrades&nbsp;: grand thé-aloé, F3, collagène…", "L'à emporter&nbsp;: sachets, barres, packs"], "Tes pots, ta remise, ton terminal&nbsp;: ta marge.", ORANGE_TEXTE)}
          </tr></table>`,
        )}

        ${titreBloc(3, "Avant un jour fermé&nbsp;: de quoi tenir")}
        ${para(`La veille d'une fermeture, la caisse te le dit, avec ce qu'elle a chez elle. ${fort("Ajouter")} met de quoi tenir&nbsp;; le ${fort("pack 6 jours")} est proposé quand il vaut le coup. Contacter te prévient quand son F1 arrive au bout, et son journal lui propose ses sachets du club.`)}
        ${ecran(
          `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${AMBRE_FOND}" style="padding:12px 14px;border-radius:12px;background:${AMBRE_FOND};font-size:13.5px;line-height:1.5;color:${TEXTE};"><b style="color:${AMBRE_TEXTE};">Club fermé dimanche, elle revient lundi.</b><br>Chez elle&nbsp;: 1 F1 &middot; 2 doses de PDM</td></tr></table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:10px 0 0;"><tr>
            <td style="font-size:13.5px;color:${TEXTE};">De quoi tenir&nbsp;: <b>1 &times; Formula 1</b></td>
            <td align="right"><span style="display:inline-block;padding:8px 14px;border:1px solid ${ORANGE};border-radius:999px;font-size:13px;font-weight:700;color:${ORANGE_TEXTE};">Ajouter</span></td>
          </tr></table>`,
        )}

        ${titreBloc(4, "Ma caisse&nbsp;: ce que tu gagnes")}
        ${para(`${fort("&#8943; Plus &rsaquo; Ma caisse")}&nbsp;: ce que tu as vendu et gagné aujourd'hui et ce mois-ci, tes PV, et ce qu'il te manque pour le rang suivant. Tu ne vois que tes ventes. Une erreur&nbsp;? Sur sa fiche, ${fort("Ses achats au comptoir")} &rsaquo; ${fort("Annuler")}, le jour même, puis tu revends.`)}
        ${ecran(
          `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#F4EFE4" style="padding:14px 16px;border-radius:14px;background:#F4EFE4;${POLICE}">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
              <td style="${MONO}font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#C1441F;font-weight:700;">Aujourd'hui</td>
              <td align="right"><span style="display:inline-block;padding:3px 9px;border-radius:999px;background:#F6D9CB;font-size:11.5px;font-weight:700;color:#C1441F;">ta remise 35&nbsp;%</span></td>
            </tr></table>
            <p style="margin:6px 0 0;font-family:'Anton','Arial Narrow',Impact,Helvetica,sans-serif;font-size:38px;line-height:1;color:#162624;">10,11&nbsp;€</p>
            <p style="margin:4px 0 0;font-size:13px;color:#3B4A45;">gagnés aujourd'hui, sur 21,60&nbsp;€ vendus &middot; 7 PV</p>
          </td></tr></table>
          <p style="margin:12px 0 6px;font-size:13px;color:${TEXTE};">Vers 42&nbsp;% &middot; 3 mois <span style="float:right;${MONO}font-size:12px;color:${DOUX};">610 / 1 000 PV</span></p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#2E4A44" style="height:8px;border-radius:999px;background:#2E4A44;font-size:1px;line-height:8px;"><table role="presentation" width="61%" cellpadding="0" cellspacing="0" border="0"><tr><td style="height:8px;border-radius:999px;${DEGRADE}font-size:1px;line-height:8px;">&nbsp;</td></tr></table></td></tr></table>
          <p style="margin:8px 0 0;font-size:12px;color:${DOUX};">Exemple à 35&nbsp;% de remise&nbsp;: gagné = prix du club &minus; prix public &times; 0,65.</p>`,
        )}

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:30px 0 0;background:#FFFFFF;border:1px solid #E4DACA;border-radius:14px;"><tr><td style="padding:18px 18px 16px;${POLICE}">
          <p style="margin:0;font-size:16px;font-weight:700;color:#17201C;">Ce que ça t'apporte</p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:10px 0 0;">
            <tr><td valign="top" style="font-size:16px;padding:0 10px 8px 0;">&#128182;</td><td style="font-size:14px;line-height:1.5;color:#55605A;padding-bottom:8px;">tu vois ce que tu ${fort("gagnes vraiment")}, vente par vente&nbsp;;</td></tr>
            <tr><td valign="top" style="font-size:16px;padding:0 10px 8px 0;">&#128200;</td><td style="font-size:14px;line-height:1.5;color:#55605A;padding-bottom:8px;">ce que tu vends ici, tu le rachètes sur ta plateforme&nbsp;: ${fort("ce sont tes PV")}&nbsp;;</td></tr>
            <tr><td valign="top" style="font-size:16px;padding:0 10px 0 0;">&#127968;</td><td style="font-size:14px;line-height:1.5;color:#55605A;">tes membres ${fort("ne tombent plus à court")} le week-end.</td></tr>
          </table>
          <p style="margin:14px 0 0;font-size:14px;line-height:1.6;color:#55605A;">${fort("C'est un outil de plus, pas une obligation.")} Essaie-le sur tes prochaines ventes, et dis-nous ce qui manque.</p>
        </td></tr></table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 0;"><tr><td align="center"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="#FF3B33" style="border-radius:999px;${DEGRADE}"><a href="${URL_APP}" style="display:inline-block;padding:16px 38px;font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:999px;${POLICE}">Ouvrir l'app</a></td></tr></table></td></tr></table>
        <p style="text-align:center;margin:12px 0 0;font-size:12.5px;color:#8A938D;">Un doute sur place&nbsp;? Le bouton <b>?</b> en haut de Ma caisse reprend tout ça en une minute.</p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0;"><tr><td style="padding-top:20px;border-top:1px solid #E4DACA;font-size:14px;line-height:1.6;color:#55605A;${POLICE}">Si quelque chose coince, dis-le moi &mdash; on corrige.<br><b style="color:#17201C;">${escapeHtml(p.expediteur)}</b></td></tr></table>
      </td></tr>
    </table>
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;"><tr><td align="center" style="padding:14px 20px 0;${POLICE}font-size:11px;line-height:1.6;color:#8A938D;">Message interne à l'équipe du club, envoyé à la demande de ${escapeHtml(p.expediteur)}.<br>The Breakfast Club by La Base &middot; 11 rue Saint-Pierre, 55100 Verdun</td></tr></table>
  </td></tr></table>
</body></html>`;
}
