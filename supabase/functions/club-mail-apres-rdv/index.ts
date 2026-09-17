// =============================================================================
// club-mail-apres-rdv — le mail qui manquait APRÈS le rendez-vous.
//
// Audit du 25/08 : l'entonnoir s'arrêtait net à la porte du club. Ni pour celle
// qui démarre, ni pour celle qui ne vient pas — ZÉRO mail, et zéro ligne
// `honored` en base depuis la création de cet état le 19/08.
//
// Deux moments, un seul chemin :
//   · `demarre`   → elle est venue et elle démarre. Court, chaleureux, on
//                   s'arrête là.
//   · `pas_venue` → le lapin. Le créneau réservé est un fait, pas une facture,
//                   et un bouton pour reprendre une heure.
//
// Le troisième cas — venue mais pas démarré — est VOLONTAIREMENT absent :
// c'est le seul où la raison change à chaque personne (décision Thomas 25/08).
//
// ── CE QU'ON N'INVENTE PAS ────────────────────────────────────────────────
// Tout est relu en base à partir du `booking_id` : le prénom, le nom, l'heure.
// L'écran pourrait envoyer des valeurs périmées (un créneau déplacé entre
// temps) — la base, elle, ne ment pas.
//
// ── UN SEUL MOT PAR ISSUE (idempotence, 15/09) ────────────────────────────
// Depuis que l'envoi est fiable (keepalive côté front) ET appelé de deux
// écrans (agenda + CRM), le même geste peut arriver deux fois : double-clic,
// coach qui conclut depuis l'agenda puis rouvre le CRM, requête keepalive
// rejouée. On grave donc un marqueur PAR TYPE dans `rdv_bookings.metadata`
// (`apres_rdv_mails.{demarre|pas_venue}`) — même motif que
// `rdv-accepted-notify` (`metadata.accepted_email_sent_at`). Le marqueur
// n'est posé QU'APRÈS un envoi réussi : le graver avant perdrait la personne
// au premier hoquet de Resend.
//
// Deploy: supabase functions deploy club-mail-apres-rdv
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getServiceClient, corsHeaders, jsonResponse } from "../_shared/push.ts";
import { clubMessageHtml } from "../_shared/clubEmail.ts";
import { mailDemarrage, mailPasVenue } from "../_shared/mailsEntonnoir.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM = "La Base 360 <rdv@labase360.fr>";
const REPLY_TO = "labaseverdun@gmail.com";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** L'heure du créneau en heure de Paris — jamais en UTC, sinon on annonce
 *  « ton créneau de 8 h » pour un rendez-vous de 10 h. */
function heureParis(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ success: false, error: "method_not_allowed" }, 405);

  let body: { booking_id?: string; prospect_id?: string; type?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ success: false, error: "invalid_json" }, 400);
  }

  const bookingId = (body.booking_id ?? "").trim();
  const prospectId = (body.prospect_id ?? "").trim();
  const type = (body.type ?? "").trim();
  if (!bookingId && !prospectId) return jsonResponse({ success: false, error: "cible_manquante" }, 400);
  if (type !== "demarre" && type !== "pas_venue") {
    return jsonResponse({ success: false, error: "type_inconnu" }, 400);
  }
  if (!RESEND_API_KEY) {
    // Pas d'erreur bruyante : le geste du coach (marquer venue / pas venue) a
    // déjà réussi. On dit juste que le mail n'est pas parti.
    return jsonResponse({ success: true, envoye: false, raison: "resend_non_configure" });
  }

  const sb = getServiceClient();

  // Deux origines de RDV : réservation en ligne (`rdv_bookings`) ou RDV calé
  // depuis le CRM (`prospects`, 17/09). Même mot, mêmes règles, autre table.
  let prenom: string | null = null;
  let contact = "";
  let slot = "";
  let coachId: string | null = null;
  // Marqueur d'idempotence, posé APRÈS un envoi réussi. Côté réservation il vit
  // dans `metadata`. Côté prospect, la table n'a pas de `metadata` — l'envoi
  // est un geste unique du coach, sans 2e surface de déclenchement.
  let marquerEnvoye: () => Promise<void> = async () => {};

  if (prospectId) {
    const { data: p, error: e } = await sb
      .from("prospects")
      .select("first_name, email, rdv_date, distributor_id")
      .eq("id", prospectId)
      .maybeSingle();
    if (e) return jsonResponse({ success: false, error: e.message }, 500);
    if (!p) return jsonResponse({ success: false, error: "prospect_introuvable" }, 404);
    prenom = (p as { first_name?: string }).first_name ?? null;
    contact = String((p as { email?: string }).email ?? "").trim();
    slot = String((p as { rdv_date?: string }).rdv_date ?? "");
    coachId = (p as { distributor_id?: string | null }).distributor_id ?? null;
  } else {
    const { data: resa, error: eLecture } = await sb
      .from("rdv_bookings")
      .select("first_name, last_name, contact, slot_start, coach_user_id, metadata")
      .eq("id", bookingId)
      .maybeSingle();
    if (eLecture) return jsonResponse({ success: false, error: eLecture.message }, 500);
    if (!resa) return jsonResponse({ success: false, error: "reservation_introuvable" }, 404);
    // Idempotence : ce type de mot a-t-il DÉJÀ été envoyé pour ce rendez-vous ?
    // On préserve le reste de `metadata` (nom du funnel…) en le fusionnant.
    const meta = ((resa as { metadata?: Record<string, unknown> | null }).metadata ?? {}) as Record<string, unknown>;
    const dejaEnvoye = (meta.apres_rdv_mails ?? {}) as Record<string, unknown>;
    if (dejaEnvoye[type]) return jsonResponse({ success: true, envoye: false, raison: "deja_envoye" });
    prenom = (resa as { first_name?: string }).first_name ?? null;
    contact = String((resa as { contact?: string }).contact ?? "").trim();
    slot = String((resa as { slot_start?: string }).slot_start ?? "");
    coachId = (resa as { coach_user_id?: string | null }).coach_user_id ?? null;
    marquerEnvoye = async () => {
      await sb.from("rdv_bookings").update({
        metadata: { ...meta, apres_rdv_mails: { ...dejaEnvoye, [type]: new Date().toISOString() } },
      }).eq("id", bookingId);
    };
  }

  if (!EMAIL_RE.test(contact)) {
    // Sans email fiable, rien à envoyer — et ce n'est pas une panne.
    return jsonResponse({ success: true, envoye: false, raison: "pas_d_email" });
  }

  // La signature : le coach qui menait le rendez-vous, à défaut l'équipe.
  let signataire = "L'équipe du Breakfast Club";
  if (coachId) {
    const { data: u } = await sb.from("users").select("name").eq("id", coachId).maybeSingle();
    const n = (u as { name?: string } | null)?.name?.trim();
    if (n) signataire = n;
  }

  const contenu =
    type === "demarre" ? mailDemarrage(prenom) : mailPasVenue(prenom, heureParis(slot));

  const html = clubMessageHtml({
    prenom: prenom ?? "",
    titre: contenu.titre,
    message: contenu.message,
    signature: { nom: signataire, role: "Breakfast Club · Verdun" },
    cta: contenu.cta,
  });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM,
      to: [contact],
      subject: contenu.objet,
      reply_to: REPLY_TO,
      html,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.warn(`[club-mail-apres-rdv] Resend ${res.status} : ${detail.slice(0, 200)}`);
    // Pas de marqueur sur un échec : la question pourra se re-poser et repartir.
    return jsonResponse({ success: false, error: "envoi_refuse", statut: res.status }, 502);
  }

  // Envoi réussi : on grave le marqueur pour que ce type ne reparte pas deux
  // fois. Best-effort — si l'écriture échoue, on a au pire un doublon possible,
  // jamais un mail perdu.
  await marquerEnvoye();

  return jsonResponse({ success: true, envoye: true, a: contact });
});
