// =============================================================================
// mail-acces-coach — « ton compte est passé en accès coach ».
//
// Demandé par Thomas le 02/09, en promouvant Romane : quelqu'un qui monte coach
// ne reçoit RIEN aujourd'hui. Son app change du jour au lendemain sans qu'on
// lui dise ni ce qui a changé, ni — surtout — que ses identifiants sont les
// mêmes. C'est le moment exact où l'on croit devoir recréer un compte.
//
// ── UN BOUTON, JAMAIS UN AUTOMATISME (décision Thomas) ──────────────────────
// La promotion se fait en DEUX gestes : « Promouvoir », puis « Mode club ».
// Un envoi accroché au premier annoncerait « coach BBC » à quelqu'un qui ne
// l'est pas encore. Et un automatisme transforme chaque essai en vrai mail
// dans la boîte de quelqu'un. C'est donc l'admin qui appuie, quand tout est en
// place.
//
// ── L'ADRESSE DE CONNEXION, PAS CELLE DE LA FICHE ───────────────────────────
// On lit `users.email`, jamais `clients.email`. Les deux DIVERGENT en vrai :
// Thomas se connecte avec `flt2tom.coach@…` et sa fiche client porte
// `tomkoss31@…`. Un mail « voici ton accès » envoyé à l'adresse de la fiche
// pointerait un compte qui n'existe pas à cette adresse.
//
// ── CE QU'ON NE FAIT PAS ────────────────────────────────────────────────────
// Aucun mot de passe, aucun lien de connexion automatique : le message dit
// « les mêmes identifiants qu'avant » et renvoie vers la page d'accueil. Un
// lien magique dans un mail non sollicité, c'est un compte à prendre pour qui
// lit la boîte.
//
// Deploy: supabase functions deploy mail-acces-coach
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { brandedEmail, escapeHtml, sendResend } from "../_shared/email.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";

const URL_APP = "https://www.labase360.fr";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

const prenom = (nom: string) => (nom ?? "").trim().split(/\s+/)[0] ?? "";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  // ── auth admin (même patron que campaign-send) ──
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: auth } = await createClient(SUPABASE_URL, ANON_KEY).auth.getUser(token);
  const uid = auth?.user?.id;
  if (!uid) {
    return json({ ok: false, error: "unauthorized", message: "Session non reconnue. Reconnecte-toi et réessaie." }, 401);
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: moi } = await sb.from("users").select("role").eq("id", uid).maybeSingle();
  if ((moi as { role?: string } | null)?.role !== "admin") {
    return json({ ok: false, error: "forbidden" }, 403);
  }

  let body: { user_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }
  const cible = (body.user_id ?? "").trim();
  if (!cible) return json({ ok: false, error: "user_id_manquant" }, 400);

  // Tout est relu en base : l'écran pourrait envoyer un nom ou un mode périmés.
  const { data: u, error } = await sb
    .from("users")
    .select("name, email, club_model, club_id, active")
    .eq("id", cible)
    .maybeSingle();
  if (error) return json({ ok: false, error: error.message }, 500);
  if (!u) return json({ ok: false, error: "coach_introuvable" }, 404);

  const coach = u as { name?: string; email?: string; club_model?: string; club_id?: string | null; active?: boolean };
  const dest = (coach.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(dest)) return json({ ok: false, error: "email_invalide" }, 400);
  if (coach.active === false) return json({ ok: false, error: "compte_desactive" }, 400);
  if (!RESEND_API_KEY) return json({ ok: false, error: "resend_non_configure" }, 500);

  const p = escapeHtml(prenom(coach.name ?? "") || "toi");
  const enBbc = coach.club_model === "bbc";

  // Le nom du club vient de la base, pas d'une constante : le jour où un
  // deuxième club ouvre, ce mail n'a pas à être réécrit.
  let nomClub = "";
  if (enBbc && coach.club_id) {
    const { data: c } = await sb.from("clubs").select("name").eq("id", coach.club_id).maybeSingle();
    nomClub = String((c as { name?: string } | null)?.name ?? "").trim();
  }

  const ligneClub = enBbc
    ? `Tu fais maintenant partie de l'équipe${nomClub ? ` de <strong>${escapeHtml(nomClub)}</strong>` : " du club"}.`
    : "";

  const html = brandedEmail({
    badge: "✨",
    eyebrow: "TON ACCÈS A CHANGÉ",
    heading: `Bonjour ${p},`,
    intro:
      `Ton compte La Base 360 vient de passer en <strong>accès coach</strong>. ${ligneClub}` +
      `<br><br>` +
      `<strong>Rien à recréer : même adresse, même mot de passe.</strong> ` +
      `Tu te connectes exactement comme avant — tu verras simplement ton nouvel espace.`,
    ctaLabel: "Ouvrir mon espace coach",
    ctaUrl: URL_APP,
    outro:
      `Mot de passe oublié ? Le lien « mot de passe oublié » de la page de connexion te le remet à zéro. ` +
      `Une question ? Réponds simplement à ce message.`,
  });

  const envoi = await sendResend({
    to: dest,
    subject: `${prenom(coach.name ?? "") || "Toi"}, ton accès La Base 360 a changé`,
    html,
  });

  if (!envoi.ok) return json({ ok: false, error: envoi.error }, 502);
  return json({ ok: true, envoye: true, to: dest });
});
