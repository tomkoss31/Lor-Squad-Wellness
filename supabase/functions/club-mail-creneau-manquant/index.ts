// =============================================================================
// club-mail-creneau-manquant — rattraper la plus grosse fuite de l'entonnoir.
//
// LE CONSTAT (audit du 25/08) : sur le site du club, 8 personnes sur 20
// laissent leurs coordonnées et ne choisissent JAMAIS de créneau. Elles ne
// recevaient rien du tout. C'est le moment où l'intention est la plus haute de
// tout le parcours — elles viennent de taper leur numéro — et on n'en faisait
// rien.
//
// Ce mail a UN SEUL travail : transformer les coordonnées en créneau. Un
// bouton, pas trois liens.
//
// ── LA FENÊTRE, ET POURQUOI ELLE EST BORNÉE DES DEUX CÔTÉS ────────────────
//   · 5 minutes au plus tôt  — elle est peut-être encore en train de choisir
//     son heure. Lui écrire pendant qu'elle réserve serait ridicule.
//   · 24 heures au plus tard — sans cette borne, la mise en service aurait
//     écrit à des gens inscrits il y a DEUX SEMAINES (mesuré : les 8 en attente
//     ont entre 6 et 14 jours). « Il te reste à choisir ton heure », quinze
//     jours après, c'est pire que le silence.
//
// ── POURQUOI TOUTES LES DIX MINUTES, ET PAS TOUTES LES CINQ ───────────────
// Cette base a déjà gelé 2 h 45 sous la charge des tâches planifiées
// (incident du 29/07 : 676 lancements/jour). Toutes les 5 minutes = 288
// lancements de plus par jour, presque le double du total actuel. Toutes les
// dix = 144, sur une minute décalée pour ne jamais tomber avec les autres.
// La personne reçoit donc son mail entre 5 et 15 minutes : l'écart est sans
// effet sur elle, et il évite de refaire tomber la base.
//
// Deploy: supabase functions deploy club-mail-creneau-manquant
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getServiceClient, corsHeaders, jsonResponse } from "../_shared/push.ts";
import { clubMessageHtml } from "../_shared/clubEmail.ts";
import { mailCreneauManquant } from "../_shared/mailsEntonnoir.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM = "La Base 360 <rdv@labase360.fr>";
const REPLY_TO = "labaseverdun@gmail.com";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MINUTES_MIN = 5;
const HEURES_MAX = 24;
/** Filet anti-emballement : si quelque chose déraille, on n'envoie jamais
 *  cinquante mails d'un coup sans que personne ne s'en aperçoive. */
const MAX_PAR_PASSAGE = 10;

/** ⚠️ Jumelle de `src/features/crm/cleDoublon.ts` — une edge function ne peut
 *  pas importer le front. Toute modif de l'une va sur l'autre. */
function telNorm(v: string | null): string | null {
  if (!v || v.includes("@")) return null;
  const c = v.replace(/\D/g, "").replace(/^0+/, "").replace(/^33/, "");
  return c.length >= 9 ? c.slice(-9) : null;
}
function mailNorm(v: string | null): string | null {
  const c = (v ?? "").trim().toLowerCase();
  return EMAIL_RE.test(c) ? c : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (!RESEND_API_KEY) {
    return jsonResponse({ success: true, envoyes: 0, raison: "resend_non_configure" });
  }

  const sb = getServiceClient();
  const maintenant = Date.now();
  const pasAvant = new Date(maintenant - HEURES_MAX * 60 * 60 * 1000).toISOString();
  const pasApres = new Date(maintenant - MINUTES_MIN * 60 * 1000).toISOString();

  // Les candidates : arrivées par le site du club, dans la fenêtre, jamais
  // relancées, encore dans le flux.
  const { data: leads, error: eLeads } = await sb
    .from("prospect_leads")
    .select("id, first_name, email, phone, status")
    .eq("source", "site-club")
    .is("creneau_email_sent_at", null)
    .gte("created_at", pasAvant)
    .lte("created_at", pasApres)
    .order("created_at", { ascending: true })
    .limit(MAX_PAR_PASSAGE);

  if (eLeads) return jsonResponse({ success: false, error: eLeads.message }, 500);
  if (!leads || leads.length === 0) return jsonResponse({ success: true, envoyes: 0 });

  // Qui a DÉJÀ réservé ? On relit les créneaux vivants une seule fois, et on
  // rapproche en JS : la normalisation d'un numéro ne se fait pas dans un `.eq()`.
  const { data: resas } = await sb
    .from("rdv_bookings")
    .select("contact")
    .neq("status", "canceled")
    .limit(1000);
  const clesReservees = new Set<string>();
  for (const r of resas ?? []) {
    const c = (r as { contact: string | null }).contact;
    const t = telNorm(c); if (t) clesReservees.add(`t:${t}`);
    const m = mailNorm(c); if (m) clesReservees.add(`e:${m}`);
  }

  let envoyes = 0;
  let ignores = 0;

  for (const l of leads as Array<Record<string, unknown>>) {
    const id = String(l.id);
    const email = mailNorm((l.email as string | null) ?? null);
    const tel = telNorm((l.phone as string | null) ?? null);
    const statut = String(l.status ?? "");

    // Elle a réservé entre-temps, ou elle est déjà refermée : on marque comme
    // traité pour ne pas la repasser en revue à chaque tour, et on n'écrit pas.
    const dejaReserve = (email && clesReservees.has(`e:${email}`)) || (tel && clesReservees.has(`t:${tel}`));
    const refermee = statut === "converted" || statut === "lost";

    if (!email || dejaReserve || refermee) {
      await sb.from("prospect_leads").update({ creneau_email_sent_at: new Date().toISOString() }).eq("id", id);
      ignores += 1;
      continue;
    }

    const contenu = mailCreneauManquant((l.first_name as string | null) ?? null);
    const html = clubMessageHtml({
      prenom: (l.first_name as string | null) ?? "",
      titre: contenu.titre,
      message: contenu.message,
      signature: { nom: "L'équipe du Breakfast Club", role: "Verdun" },
      cta: contenu.cta,
    });

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [email], subject: contenu.objet, reply_to: REPLY_TO, html }),
    });

    if (res.ok) {
      // On ne marque QU'APRÈS un envoi réussi : marquer avant ferait perdre la
      // personne en silence au premier hoquet de Resend.
      await sb.from("prospect_leads").update({ creneau_email_sent_at: new Date().toISOString() }).eq("id", id);
      envoyes += 1;
    } else {
      const detail = await res.text().catch(() => "");
      console.warn(`[club-mail-creneau-manquant] Resend ${res.status} pour ${id} : ${detail.slice(0, 160)}`);
    }
  }

  return jsonResponse({ success: true, envoyes, ignores, examines: leads.length });
});
