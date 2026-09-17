// =============================================================================
// mail-agenda-club — « L'agenda du club, mode d'emploi », envoyé à UNE coach.
//
// POURQUOI (Thomas, 17/09/2026) : « un e-mail, avec visuel explication ? […]
// cet e-mail doit et peut être envoyé à plusieurs reprises pour les nouveaux ».
// L'équipe ne lit pas les annonces de l'app ; elle lit ses mails. Et une coach
// qui rejoint le club dans six mois doit recevoir LE MÊME mode d'emploi : d'où
// un bouton (dans le « ? » de L'agenda) et pas une campagne envoyée une fois.
//
// ── LE TON ──────────────────────────────────────────────────────────────────
// Thomas, en relisant la 1re version : « tu es dur avec TimeTree, je n'impose
// rien, je propose juste un outil ». Ce mail PROPOSE : pas de « on arrête X »,
// pas de date butoir. Et rien ne le date — pas de « jusqu'ici on faisait… ».
//
// ── UN BOUTON, JAMAIS UN AUTOMATISME ────────────────────────────────────────
// Même règle que `mail-acces-coach` : rien ne part tout seul. Celui qui clique
// est le propriétaire du club ou un admin, et la destinataire doit être une
// coach de CE club. On écrit à `users.email` — l'adresse de CONNEXION.
//
// ── LES VISUELS ─────────────────────────────────────────────────────────────
// Des mini-écrans dessinés en tableaux HTML, pas des captures : ils s'affichent
// même quand la messagerie bloque les images, et ne montrent AUCUN vrai nom de
// lead (les personnes des exemples sont inventées). La légende des coachs, elle,
// est celle du club réel, avec leurs couleurs d'agenda.
//
// verify_jwt = true (défaut) + contrôle des droits ci-dessous.
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { escapeHtml, sendResend } from "../_shared/email.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const URL_AGENDA = "https://www.labase360.fr/agenda";
const LOGO = "https://www.labase-nutrition.com/brand/breakfast-club/logo-heart.png";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COULEUR_RE = /^#[0-9a-fA-F]{6}$/;
/** Le même repli que l'app quand une coach n'a pas encore choisi sa couleur. */
const REPLI = ["#EC4899", "#22C55E", "#A78BFA", "#3B82F6", "#F97316", "#2DD4BF"];

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

const prenomDe = (nom: string | null | undefined) => (nom ?? "").trim().split(/\s+/)[0] ?? "";

interface CoachDuClub {
  prenom: string;
  couleur: string;
}

// ── Le gabarit ──────────────────────────────────────────────────────────────
const POLICE = "font-family:'Poppins',Helvetica,Arial,sans-serif;";
const MONO = "font-family:'Courier New',monospace;";

function ecran(contenu: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#162624" style="margin:14px 0 0;background:#162624;border-radius:16px;"><tr><td class="ecran" style="padding:16px 18px;${POLICE}">${contenu}</td></tr></table>`;
}

function titreBloc(n: number, texte: string): string {
  return `<p style="margin:30px 0 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#E0532A;font-weight:700;">${n} &middot; ${texte}</p>`;
}

function para(html: string): string {
  return `<p style="margin:6px 0 0;font-size:14.5px;line-height:1.6;color:#55605A;">${html}</p>`;
}

function ligneRdv(heure: string, couleur: string, titre: string, sous: string): string {
  const b = "border-top:1px solid #2E4A44;";
  return `<tr><td width="52" style="padding:9px 0;${b}${MONO}font-size:13px;font-weight:700;color:#F4EFE4;">${heure}</td><td width="4" bgcolor="${couleur}" style="background:${couleur};${b}font-size:1px;">&nbsp;</td><td style="padding:9px 0 9px 12px;${b}font-size:14px;font-weight:700;color:#F4EFE4;">${titre}<br><span style="font-size:11.5px;font-weight:400;color:#AEB9B2;">${sous}</span></td></tr>`;
}

function creneaux(couleur: string, heures: string[], reste?: string): string {
  const pilule = (h: string, c: string, texte: string) =>
    `<td style="padding:0 6px 0 0;"><span style="display:inline-block;padding:9px 11px;border:1.5px solid ${c};border-radius:10px;${MONO}font-size:13px;font-weight:700;color:${texte};">${h}</span></td>`;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${heures.map((h) => pilule(h, couleur, couleur)).join("")}${reste ? pilule(reste, "#4A625B", "#AEB9B2") : ""}</tr></table>`;
}

function choix(emoji: string, texte: string, actif = false): string {
  return `<tr><td style="padding:10px 12px;border:1px solid ${actif ? "#C5F82A" : "#2E4A44"};border-radius:12px;font-size:13.5px;font-weight:700;color:#F4EFE4;">${emoji}&nbsp; ${texte}</td></tr><tr><td style="height:6px;font-size:1px;line-height:6px;">&nbsp;</td></tr>`;
}

function plage(nom: string, heures: string, actif = false): string {
  return `<tr><td ${actif ? 'bgcolor="#26401F"' : ""} style="padding:12px 14px;border:1.5px solid ${actif ? "#C5F82A" : "#2E4A44"};border-radius:12px;${actif ? "background:#26401F;" : ""}font-size:14px;font-weight:700;color:#F4EFE4;">${nom}<br><span style="${MONO}font-size:12px;font-weight:400;color:#AEB9B2;">${heures}</span></td></tr><tr><td style="height:6px;font-size:1px;line-height:6px;">&nbsp;</td></tr>`;
}

export function gabarit(p: { prenom: string; expediteur: string; coachs: CoachDuClub[] }): string {
  // Trois coachs pour les exemples : celles du club, sinon des couleurs seules.
  const c = (i: number): CoachDuClub => p.coachs[i % Math.max(1, p.coachs.length)] ?? { prenom: "ta collègue", couleur: REPLI[i % REPLI.length] };
  const legende = p.coachs
    .map((k) => `<td style="padding:0 12px 0 0;font-size:12px;font-weight:700;color:#F4EFE4;"><span style="color:${k.couleur};">&#9679;</span>&nbsp;${escapeHtml(k.prenom)}</td>`)
    .join("");
  const n = (i: number) => escapeHtml(c(i).prenom);

  return `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>L'agenda du club</title>
<style>@media (max-width:520px){.inner{padding:24px 18px 28px !important}.h1{font-size:27px !important}.logo{width:160px !important}.ecran{padding:12px 12px !important}} a{color:#E0532A}</style>
</head>
<body style="margin:0;padding:0;background:#ECE3D2;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#ECE3D2;font-size:1px;line-height:1px;">Tous les rendez-vous de l'équipe au même endroit, avec les dispos de chacune. Le mode d'emploi en 4 gestes.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ECE3D2;"><tr><td align="center" style="padding:26px 12px 46px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#FCF8F1;border-radius:16px;overflow:hidden;">
      <tr><td style="height:6px;line-height:6px;font-size:6px;background:#FF6A2B;background:linear-gradient(135deg,#FF7A2F,#FF1E3C);">&nbsp;</td></tr>
      <tr><td class="inner" style="padding:30px 34px 34px;${POLICE}">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">
          <img class="logo" src="${LOGO}" alt="The Breakfast Club by La Base" width="190" style="display:block;width:190px;max-width:78%;height:auto;border:0;">
        </td></tr></table>
        <p style="text-align:center;margin:20px 0 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#E0532A;font-weight:700;">Pour l'équipe &middot; mode d'emploi</p>
        <h1 class="h1" style="margin:8px 0 0;font-family:'Anton','Arial Narrow',Impact,Helvetica,sans-serif;font-weight:400;text-transform:uppercase;letter-spacing:.5px;font-size:31px;line-height:1.06;color:#17201C;text-align:center;">L'agenda du club,<br>en 4 gestes</h1>

        <p style="margin:22px 0 0;font-size:16px;font-weight:600;color:#17201C;">Salut ${escapeHtml(p.prenom)},</p>
        <p style="margin:14px 0 0;font-size:15px;line-height:1.62;color:#55605A;">L'app a <b style="color:#17201C;">un agenda pour tout le club</b>, pensé pour le téléphone. Tu y vois les rendez-vous de toute l'équipe, tu cales chez toi ou chez une autre en voyant ses dispos, et tu donnes une suite à chaque rendez-vous. Voici comment t'en servir.</p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 0;background:#F4EEE1;border-radius:12px;"><tr><td style="padding:14px 16px;font-size:13.5px;line-height:1.6;color:#55605A;${POLICE}">
          <b style="color:#17201C;">Où le trouver&nbsp;?</b><br>
          Dans le mode Breakfast Club&nbsp;: <b style="color:#17201C;">Le club &rsaquo; L'agenda</b>.<br>
          Dans l'app classique&nbsp;: menu <b style="color:#17201C;">Agenda &rsaquo; Agenda du club</b>.
        </td></tr></table>

        ${titreBloc(1, "Tout le club, d'un coup d'œil")}
        ${para(`Une couleur par coach, les noms visibles de toutes. Trois vues&nbsp;: <b style="color:#17201C;">Jour</b> (une colonne par coach), <b style="color:#17201C;">Semaine</b> et <b style="color:#17201C;">Mois</b>. Les rituels du soir sont dedans, en violet.`)}
        ${ecran(
          `${legende ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${legende}</tr></table>` : ""}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0 0;">
            ${ligneRdv("10:00", c(0).couleur, "Bilan &middot; Justine Bernard", `avec ${n(0)} &middot; &#10003; venue`)}
            ${ligneRdv("11:00", c(1).couleur, "Bilan &middot; Coralie Martin", `avec ${n(1)}`)}
            ${ligneRdv("15:00", c(2).couleur, "Suivi &middot; Pauline Roux", `avec ${n(2)}`)}
            ${ligneRdv("20:00", "#A78BFA", "Atelier Cœurs", "rituel &middot; toute l'équipe")}
          </table>`,
        )}

        ${titreBloc(2, "Caler un rendez-vous avec les dispos")}
        ${para(`Le <b style="color:#17201C;">+</b> en bas à droite. Tu choisis le type, puis <b style="color:#17201C;">&#9889; au plus tôt</b> ou un jour&nbsp;: seuls les créneaux <b style="color:#17201C;">libres</b> de chaque coach s'affichent. Tu cherches la personne dans tes contacts, et c'est calé. Si c'est chez une autre, elle reçoit une notification.`)}
        ${ecran(
          `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #C5F82A;border-radius:12px;"><tr><td style="padding:11px 14px;font-size:13.5px;font-weight:700;color:#F4EFE4;">&#9889; Au plus tôt&nbsp;: ${n(1)} &middot; demain à 09:00<br><span style="font-size:11.5px;font-weight:400;color:#AEB9B2;">Le premier créneau libre de toute l'équipe</span></td></tr></table>
          <p style="margin:14px 0 6px;font-size:13.5px;font-weight:700;color:#F4EFE4;"><span style="color:${c(0).couleur};">&#9679;</span>&nbsp;${n(0)} <span style="font-weight:400;font-size:11.5px;color:#AEB9B2;">&middot; 7 créneaux</span></p>
          ${creneaux(c(0).couleur, ["09:00", "09:30", "11:00"], "+4")}
          <p style="margin:14px 0 6px;font-size:13.5px;font-weight:700;color:#F4EFE4;"><span style="color:${c(2).couleur};">&#9679;</span>&nbsp;${n(2)} <span style="font-weight:400;font-size:11.5px;color:#AEB9B2;">&middot; 3 créneaux</span></p>
          ${creneaux(c(2).couleur, ["08:00", "10:30", "14:00"])}`,
        )}
        <p style="margin:10px 0 0;font-size:13px;line-height:1.55;color:#8A938D;">Encore plus vite&nbsp;: en vue Jour, touche un trou dans la colonne d'une coach &mdash; le rendez-vous se cale chez elle, à cette heure-là.</p>

        ${titreBloc(3, "Toucher un rendez-vous = lui donner une suite")}
        ${para(`Un seul écran, que le rendez-vous soit passé ou à venir. C'est aussi là qu'on le <b style="color:#17201C;">déplace</b>. Un rendez-vous passé sans suite reste signalé&nbsp;: plus de lead oublié.`)}
        ${ecran(
          `<p style="margin:0;font-size:17px;font-weight:700;color:#F4EFE4;">Coralie Martin</p>
          <p style="margin:2px 0 12px;${MONO}font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#8FA39A;">rdv jeudi &middot; 11:00 &middot; ${n(1)}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            ${choix("&#9749;", "Elle prend sa carte de membre", true)}
            ${choix("&#128203;", "Elle démarre en suivi classique")}
            ${choix("&#128339;", `Pas encore <span style="font-weight:400;font-size:11.5px;color:#AEB9B2;">&middot; tu choisis quand elle revient dans ta liste d'appels</span>`)}
            ${choix("&#128683;", "Pas venue")}
          </table>`,
        )}

        ${titreBloc(4, "«&nbsp;Pas dispo&nbsp;»")}
        ${para(`Le <b style="color:#17201C;">+</b>, puis <b style="color:#17201C;">Pas dispo</b>&nbsp;: le matin, l'après-midi ou la journée. Plus personne ne cale rien dessus &mdash; et <b style="color:#17201C;">le site du club ne propose plus ces heures</b>. Pour l'enlever&nbsp;: tu la touches, puis «&nbsp;Libérer&nbsp;».`)}
        ${ecran(
          `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            ${plage("Le matin", "08:00 &ndash; 12:00")}
            ${plage("L'après-midi", "12:00 &ndash; 18:00", true)}
            ${plage("Toute la journée", "08:00 &ndash; 18:00")}
          </table>`,
        )}

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:30px 0 0;background:#FFFFFF;border:1px solid #E4DACA;border-radius:14px;"><tr><td style="padding:18px 18px 16px;${POLICE}">
          <p style="margin:0;font-size:16px;font-weight:700;color:#17201C;">Ce que ça t'apporte</p>
          <p style="margin:8px 0 0;font-size:14px;line-height:1.6;color:#55605A;">Un rendez-vous noté dans l'agenda travaille pour toi&nbsp;:</p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:10px 0 0;">
            <tr><td valign="top" style="font-size:16px;padding:0 10px 8px 0;">&#128233;</td><td style="font-size:14px;line-height:1.5;color:#55605A;padding-bottom:8px;">la personne reçoit son <b style="color:#17201C;">rappel par mail la veille</b> (si tu as noté son mail)&nbsp;;</td></tr>
            <tr><td valign="top" style="font-size:16px;padding:0 10px 8px 0;">&#127760;</td><td style="font-size:14px;line-height:1.5;color:#55605A;padding-bottom:8px;">le <b style="color:#17201C;">site du club</b> ne propose que tes heures vraiment libres&nbsp;;</td></tr>
            <tr><td valign="top" style="font-size:16px;padding:0 10px 0 0;">&#9989;</td><td style="font-size:14px;line-height:1.5;color:#55605A;">chaque rendez-vous a une <b style="color:#17201C;">suite</b>&nbsp;: membre, relance ou perdue.</td></tr>
          </table>
          <p style="margin:14px 0 0;font-size:14px;line-height:1.6;color:#55605A;">Tu as déjà ton agenda (TimeTree ou un autre)&nbsp;? Aucun souci&nbsp;: <b style="color:#17201C;">c'est un outil de plus, pas une obligation</b>. Essaie-le sur tes prochains rendez-vous, et dis-nous ce qui manque.</p>
        </td></tr></table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 0;"><tr><td align="center"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="#FF3B33" style="border-radius:999px;background:#FF3B33;background:linear-gradient(135deg,#FF7A2F,#FF1E3C);"><a href="${URL_AGENDA}" style="display:inline-block;padding:16px 38px;font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:999px;${POLICE}">Ouvrir l'agenda</a></td></tr></table></td></tr></table>
        <p style="text-align:center;margin:12px 0 0;font-size:12.5px;color:#8A938D;">Un doute sur place&nbsp;? Le bouton <b>?</b> en haut de l'agenda reprend tout ça en une minute.</p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0;"><tr><td style="padding-top:20px;border-top:1px solid #E4DACA;font-size:14px;line-height:1.6;color:#55605A;${POLICE}">Si quelque chose coince, dis-le moi &mdash; on corrige.<br><b style="color:#17201C;">${escapeHtml(p.expediteur)}</b></td></tr></table>
      </td></tr>
    </table>
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;"><tr><td align="center" style="padding:14px 20px 0;${POLICE}font-size:11px;line-height:1.6;color:#8A938D;">Message interne à l'équipe du club, envoyé à la demande de ${escapeHtml(p.expediteur)}.<br>The Breakfast Club by La Base &middot; 11 rue Saint-Pierre, 55100 Verdun</td></tr></table>
  </td></tr></table>
</body></html>`;
}

// ── La requête ──────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: auth } = await createClient(SUPABASE_URL, ANON_KEY).auth.getUser(token);
  const uid = auth?.user?.id;
  if (!uid) return json({ ok: false, error: "unauthorized", message: "Session non reconnue. Reconnecte-toi et réessaie." }, 401);

  let body: { user_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }
  const cible = (body.user_id ?? "").trim();
  if (!cible) return json({ ok: false, error: "user_id_manquant" }, 400);

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const [{ data: moi }, { data: u }] = await Promise.all([
    sb.from("users").select("name, role, club_id").eq("id", uid).maybeSingle(),
    sb.from("users").select("name, email, club_id, active").eq("id", cible).maybeSingle(),
  ]);
  if (!u) return json({ ok: false, error: "coach_introuvable" }, 404);
  const appelant = moi as { name?: string; role?: string; club_id?: string | null } | null;
  const coach = u as { name?: string; email?: string; club_id?: string | null; active?: boolean };

  // Le club de la destinataire : celui où elle travaille, sinon celui qu'elle possède.
  let clubId = coach.club_id ?? null;
  if (!clubId) {
    const { data: possede } = await sb.from("clubs").select("id").eq("owner_user_id", cible).eq("active", true).limit(1).maybeSingle();
    clubId = (possede as { id?: string } | null)?.id ?? null;
  }
  if (!clubId) return json({ ok: false, error: "pas_dans_un_club", message: "Cette personne n'est rattachée à aucun club." }, 400);

  // Qui a le droit : un admin, ou le propriétaire de CE club.
  const { data: club } = await sb.from("clubs").select("owner_user_id").eq("id", clubId).maybeSingle();
  const proprietaire = (club as { owner_user_id?: string } | null)?.owner_user_id ?? null;
  if (appelant?.role !== "admin" && proprietaire !== uid) return json({ ok: false, error: "forbidden" }, 403);

  const dest = (coach.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(dest)) return json({ ok: false, error: "email_invalide", message: "Pas d'adresse mail valide sur ce compte." }, 400);
  if (coach.active === false) return json({ ok: false, error: "compte_desactive" }, 400);
  if (!RESEND_API_KEY) return json({ ok: false, error: "resend_non_configure" }, 500);

  // La légende : les coachs du club, propriétaire compris, avec leur couleur.
  const { data: equipe } = await sb
    .from("users")
    .select("id, name, calendar_color, active")
    .or(`club_id.eq.${clubId}${proprietaire ? `,id.eq.${proprietaire}` : ""}`);
  const coachs: CoachDuClub[] = ((equipe ?? []) as Array<{ name?: string; calendar_color?: string | null; active?: boolean }>)
    .filter((k) => k.active !== false && prenomDe(k.name))
    .map((k, i) => ({ prenom: prenomDe(k.name), couleur: COULEUR_RE.test(k.calendar_color ?? "") ? String(k.calendar_color) : REPLI[i % REPLI.length] }))
    .sort((a, b) => a.prenom.localeCompare(b.prenom, "fr"));

  const prenom = prenomDe(coach.name) || "toi";
  const envoi = await sendResend({
    to: dest,
    from: "The Breakfast Club <no-reply@labase360.fr>",
    subject: `${prenomDe(coach.name) || "Hello"}, l'agenda du club : mode d'emploi ☕`,
    html: gabarit({ prenom, expediteur: prenomDe(appelant?.name) || "L'équipe", coachs }),
  });
  if (!envoi.ok) return json({ ok: false, error: envoi.error }, 502);
  return json({ ok: true, envoye: true, prenom });
});
