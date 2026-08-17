// =============================================================================
// crm-repondre-lead — répondre à UNE personne depuis le CRM, à l'identité de la
// maison dont elle vient.
//
// Thomas, 17/08 : « j'ai répondu avec mon Gmail donc message simple, aucune
// signature, que dalle — vs ce que j'ai reçu sur ma boîte ». L'app envoyait des
// mails soignés, le coach répondait en texte nu : le prospect recevait deux
// choses qui n'avaient pas l'air de venir de la même maison.
//
// DEUX GABARITS, et c'est le cœur du travail (« fait la différence entre les
// leads club donc BBC et ceux online ») :
//   · lead du site du club  → clubMessageHtml   (crème/orange, coordonnées du
//     club, bouton vers labase-nutrition.com/reserver). Cette personne ne
//     connaît PAS « La Base 360 » : elle a laissé son numéro au Breakfast Club.
//   · tout le reste         → brandedEmail      (sombre, La Base 360, bouton
//     vers le tunnel de rendez-vous PERSONNEL du coach, /rdv/<prénom>).
//
// PAS de lien de désinscription (décision Thomas) : une campagne en porte un,
// une réponse à quelqu'un qui vient d'écrire, non — ça la ferait passer pour un
// envoi automatique. Ce n'est pas de la prospection froide, c'est une réponse.
//
// Sécurité : déployé --no-verify-jwt, le contrôle se fait ICI. Le JWT identifie
// le coach ; un coach n'écrit qu'aux leads qu'il peut déjà voir (RLS), vérifié
// en relisant la ligne AVEC SON JETON À LUI et non en service_role.
//
// Deploy : supabase functions deploy crm-repondre-lead --no-verify-jwt
// =============================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { brandedEmail, sendResend, escapeHtml } from "../_shared/email.ts";
import { CLUB_URL, clubMessageHtml } from "../_shared/clubEmail.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

/** Les deux tables du CRM qui portent une adresse et un propriétaire. */
type TableLead = "online_bilans" | "prospect_leads";

/** Le prénom d'un nom complet, normalisé comme la RPC `ls_normalize_slug`. */
function slugPrenom(nom: string): string {
  return (nom ?? "")
    .trim()
    .split(/\s+/)[0]
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/** Le texte du coach → des `<p>` échappés. Jamais de HTML venu de l'écran. */
function paragraphes(texte: string): string {
  return texte
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map(
      (b) =>
        `<span style="display:block;margin:0 0 13px 0;">${escapeHtml(b).replace(/\n/g, "<br />")}</span>`,
    )
    .join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ success: false, error: "method_not_allowed" }, 405);

  const jeton = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jeton) return json({ success: false, error: "non_authentifie" }, 401);

  let body: {
    table?: string;
    leadId?: string;
    objet?: string;
    message?: string;
    avecBoutonRdv?: boolean;
    /** Rendre sans envoyer — l'onglet « Aperçu » de la fenêtre du CRM. */
    apercu?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "json_invalide" }, 400);
  }

  const table = body.table as TableLead;
  if (table !== "online_bilans" && table !== "prospect_leads") {
    return json({ success: false, error: "table_inconnue" }, 400);
  }
  const leadId = (body.leadId ?? "").trim();
  const objet = (body.objet ?? "").trim();
  const message = (body.message ?? "").trim();
  if (!leadId || !objet || !message) {
    return json({ success: false, error: "champs_manquants" }, 400);
  }

  // Le client porte le JETON DU COACH : tout ce qui suit est filtré par la RLS,
  // donc un coach qui ne voit pas ce lead ne pourra pas lui écrire. C'est le
  // contrôle d'accès — pas une simple lecture de confort.
  const sb = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jeton}` } },
  });

  const { data: moi } = await sb.auth.getUser();
  const authId = moi?.user?.id;
  if (!authId) return json({ success: false, error: "session_invalide" }, 401);

  const { data: coach } = await sb
    .from("users")
    .select("name, email, role")
    .eq("id", authId)
    .maybeSingle();
  if (!coach?.name) return json({ success: false, error: "coach_introuvable" }, 403);

  const colonnes =
    table === "online_bilans"
      ? "id, first_name, email, coach_slug"
      : "id, first_name, email, phone, source";
  const { data: lead, error: errLead } = await sb
    .from(table)
    .select(colonnes)
    .eq("id", leadId)
    .maybeSingle();

  // Introuvable OU masqué par la RLS : la réponse est la même, on ne dit pas à
  // un coach qu'une fiche existe chez quelqu'un d'autre.
  if (errLead || !lead) return json({ success: false, error: "lead_introuvable" }, 404);

  const destinataire = String((lead as Record<string, unknown>).email ?? "").trim();
  if (!destinataire.includes("@")) {
    return json({ success: false, error: "pas_d_email" }, 400);
  }

  const prenom = String((lead as Record<string, unknown>).first_name ?? "").trim() || "toi";
  const source = String((lead as Record<string, unknown>).source ?? "");
  const vientDuClub = table === "prospect_leads" && source === "site-club";

  const prenomCoach = String(coach.name).trim().split(/\s+/)[0];
  const signature = {
    nom: prenomCoach,
    role: vientDuClub ? "The Breakfast Club · Verdun" : "Coach La Base 360 · Verdun",
  };

  // Le bouton mène là où la personne peut agir TOUT DE SUITE, et dans l'univers
  // d'où elle vient. Côté app, c'est le tunnel personnel du coach : ce chemin-là
  // écrit `rdv_bookings.coach_user_id`, donc le rendez-vous atterrit chez lui —
  // contrairement au tunnel du club, qui n'attribue personne.
  const cta = body.avecBoutonRdv === false
    ? undefined
    : vientDuClub
      ? { label: "Choisir mon créneau au club", url: `${CLUB_URL}/reserver` }
      : {
          label: "Prendre rendez-vous avec moi",
          url: `https://www.labase360.fr/rdv/${slugPrenom(coach.name)}`,
        };

  const html = vientDuClub
    ? clubMessageHtml({ prenom, message, signature, cta })
    : brandedEmail({
        badge: "🌿",
        eyebrow: "Message de ton coach",
        heading: `Hello ${prenom} !`,
        intro: paragraphes(message),
        ctaLabel: cta?.label,
        ctaUrl: cta?.url,
        signature,
      });

  // Aperçu : on rend, on n'envoie pas. C'est ce que la fenêtre du CRM affiche
  // sous l'onglet « Aperçu » — donc le coach voit EXACTEMENT ce qui partira,
  // gabarit compris, et pas une reconstitution approximative côté navigateur.
  if (body.apercu === true) {
    return json({ success: true, apercu: true, html, gabarit: vientDuClub ? "club" : "app" });
  }

  // `replyTo` = la vraie adresse du coach : le mail part de La Base 360 pour
  // l'identité, mais « Répondre » ramène chez lui et pas dans une boîte
  // générique que personne ne relève.
  const envoi = await sendResend({
    to: destinataire,
    subject: objet,
    html,
    replyTo: String(coach.email ?? "").trim() || undefined,
  });

  if (!envoi.ok) return json({ success: false, error: envoi.error }, 502);

  // Trace : le CRM affiche « contacté il y a X ». Best-effort — le mail est
  // parti, ce serait absurde de renvoyer une erreur parce que la date n'a pas
  // pu s'écrire.
  await sb.from(table).update({ contacted_at: new Date().toISOString() }).eq("id", leadId);

  return json({ success: true, id: envoi.id, envoyeA: destinataire, gabarit: vientDuClub ? "club" : "app" });
});
