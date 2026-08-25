// =============================================================================
// club-mail-relance-dormants — le dernier essai propre sur ceux qu'on n'a
// jamais réussi à joindre.
//
// Ce n'est PAS une tâche planifiée, et c'est volontaire : on ne relance pas
// des gens en masse sur une minuterie. La fonction n'accepte qu'une LISTE
// EXPLICITE d'identifiants, choisie et relue à l'avance. Sans liste, elle ne
// fait rien — il ne peut donc pas partir d'envoi de masse par accident.
//
// ── CE QU'ELLE REFUSE D'ELLE-MÊME ─────────────────────────────────────────
// Même avec un id dans la liste, elle n'écrit pas si la personne :
//   · a déjà réservé un créneau (elle n'est pas dormante) ;
//   · est convertie ou perdue (le parcours est fini) ;
//   · n'a pas d'adresse exploitable.
// Le garde-fou vit ICI et pas dans l'appelant : c'est la fonction qui parle
// aux gens, c'est elle qui doit savoir se taire.
//
// ⚠️ QUI ON N'A PAS MIS DANS LA LISTE, ET POURQUOI (25/08) :
//   · Armonie a répondu « pas maintenant » le 18/08. La relancer aujourd'hui,
//     ce serait ne pas écouter ce qu'elle a dit. Elle reviendra à sa date.
//   · Les deux fiches « dehaesez » de claire sont des fautes de frappe de sa
//     propre adresse — elle a bien réservé avec la bonne. Écrire aux trois
//     lui enverrait le même mail en triple.
//
// Deploy: supabase functions deploy club-mail-relance-dormants
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getServiceClient, corsHeaders, jsonResponse } from "../_shared/push.ts";
import { clubMessageHtml } from "../_shared/clubEmail.ts";
import { mailRelanceDormant, type ContexteDormant } from "../_shared/mailsEntonnoir.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM = "La Base 360 <rdv@labase360.fr>";
const REPLY_TO = "labaseverdun@gmail.com";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** On ne relance jamais plus d'une poignée de gens d'un coup. */
const MAX = 20;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ success: false, error: "method_not_allowed" }, 405);
  if (!RESEND_API_KEY) return jsonResponse({ success: false, error: "resend_non_configure" }, 500);

  let body: { ids?: string[]; contexte?: Record<string, string>; test?: boolean };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ success: false, error: "invalid_json" }, 400);
  }

  const ids = Array.isArray(body.ids) ? body.ids.filter((x) => typeof x === "string") : [];
  if (ids.length === 0) return jsonResponse({ success: false, error: "liste_vide" }, 400);
  if (ids.length > MAX) return jsonResponse({ success: false, error: "liste_trop_longue" }, 400);

  const sb = getServiceClient();

  const { data: leads, error } = await sb
    .from("prospect_leads")
    .select("id, first_name, email, phone, status, created_at")
    .in("id", ids);

  if (error) return jsonResponse({ success: false, error: error.message }, 500);

  // Qui a déjà un créneau vivant ? On refuse de relancer quelqu'un qui a
  // réservé entre-temps.
  const { data: resas } = await sb
    .from("rdv_bookings")
    .select("contact")
    .neq("status", "canceled")
    .limit(1000);
  const mailsReserves = new Set(
    ((resas ?? []) as Array<{ contact: string | null }>)
      .map((r) => (r.contact ?? "").trim().toLowerCase())
      .filter((c) => EMAIL_RE.test(c)),
  );

  const partis: string[] = [];
  const ignores: Array<{ id: string; pourquoi: string }> = [];

  for (const l of (leads ?? []) as Array<Record<string, unknown>>) {
    const id = String(l.id);
    const email = String(l.email ?? "").trim().toLowerCase();
    const statut = String(l.status ?? "");

    if (!EMAIL_RE.test(email)) { ignores.push({ id, pourquoi: "pas_d_email" }); continue; }
    if (statut === "converted" || statut === "lost") { ignores.push({ id, pourquoi: "parcours_fini" }); continue; }
    if (mailsReserves.has(email)) { ignores.push({ id, pourquoi: "a_deja_reserve" }); continue; }

    // Le nombre de jours, LU sur la vraie date d'entrée — jamais approximé.
    const arrivee = new Date(String(l.created_at));
    const jours = Math.max(0, Math.floor((Date.now() - arrivee.getTime()) / 86_400_000));

    const contenu = mailRelanceDormant(
      (l.first_name as string | null) ?? null,
      jours,
      ((body.contexte ?? {})[id] as ContexteDormant | undefined) ?? "jamais_parle",
    );

    if (body.test === true) {
      partis.push(`${id} → « ${contenu.objet} » (${jours} j) [TEST, rien envoyé]`);
      continue;
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [email],
        subject: contenu.objet,
        reply_to: REPLY_TO,
        html: clubMessageHtml({
          prenom: (l.first_name as string | null) ?? "toi",
          titre: contenu.titre,
          message: contenu.message,
          signature: { nom: "L'équipe du Breakfast Club", role: "Verdun" },
          cta: contenu.cta,
        }),
      }),
    });

    if (res.ok) {
      // Trace : sans elle, on ne saurait pas qui a déjà eu son dernier essai.
      await sb
        .from("prospect_leads")
        .update({ creneau_email_sent_at: new Date().toISOString() })
        .eq("id", id);
      partis.push(`${email} (${jours} j)`);
    } else {
      const detail = await res.text().catch(() => "");
      ignores.push({ id, pourquoi: `resend_${res.status}` });
      console.warn(`[relance-dormants] ${id} : ${detail.slice(0, 160)}`);
    }
  }

  return jsonResponse({ success: true, envoyes: partis.length, partis, ignores });
});
