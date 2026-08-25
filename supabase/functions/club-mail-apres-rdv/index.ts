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

  let body: { booking_id?: string; type?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ success: false, error: "invalid_json" }, 400);
  }

  const bookingId = (body.booking_id ?? "").trim();
  const type = (body.type ?? "").trim();
  if (!bookingId) return jsonResponse({ success: false, error: "booking_id_manquant" }, 400);
  if (type !== "demarre" && type !== "pas_venue") {
    return jsonResponse({ success: false, error: "type_inconnu" }, 400);
  }
  if (!RESEND_API_KEY) {
    // Pas d'erreur bruyante : le geste du coach (marquer venue / pas venue) a
    // déjà réussi. On dit juste que le mail n'est pas parti.
    return jsonResponse({ success: true, envoye: false, raison: "resend_non_configure" });
  }

  const sb = getServiceClient();

  const { data: resa, error: eLecture } = await sb
    .from("rdv_bookings")
    .select("first_name, last_name, contact, slot_start, coach_user_id")
    .eq("id", bookingId)
    .maybeSingle();

  if (eLecture) return jsonResponse({ success: false, error: eLecture.message }, 500);
  if (!resa) return jsonResponse({ success: false, error: "reservation_introuvable" }, 404);

  const contact = String((resa as { contact?: string }).contact ?? "").trim();
  if (!EMAIL_RE.test(contact)) {
    // Certaines réservations n'ont qu'un téléphone : rien à envoyer, et ce
    // n'est pas une panne.
    return jsonResponse({ success: true, envoye: false, raison: "pas_d_email" });
  }

  const prenom = (resa as { first_name?: string }).first_name ?? null;
  const slot = String((resa as { slot_start?: string }).slot_start ?? "");

  // La signature : le coach qui menait le rendez-vous, à défaut l'équipe.
  let signataire = "L'équipe du Breakfast Club";
  const coachId = (resa as { coach_user_id?: string | null }).coach_user_id;
  if (coachId) {
    const { data: u } = await sb.from("users").select("name").eq("id", coachId).maybeSingle();
    const n = (u as { name?: string } | null)?.name?.trim();
    if (n) signataire = n;
  }

  const contenu =
    type === "demarre" ? mailDemarrage(prenom) : mailPasVenue(prenom, heureParis(slot));

  const html = clubMessageHtml({
    prenom: prenom ?? "toi",
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
    return jsonResponse({ success: false, error: "envoi_refuse", statut: res.status }, 502);
  }

  return jsonResponse({ success: true, envoye: true, a: contact });
});
