// =============================================================================
// mail-caisse-club — « La caisse du club, mode d'emploi », envoyé à UNE coach.
//
// POURQUOI (Thomas, 26/09/2026, après les 5 lots du comptoir) : « aide pour les
// coachs de l'équipe à comprendre ». Même modèle que `mail-agenda-club` : l'équipe
// lit ses mails, pas les annonces de l'app, et une coach qui arrivera dans six
// mois doit recevoir LE MÊME mode d'emploi — d'où un bouton (dans le « ? » de
// Ma caisse, `GuideCaisseSheet`), jamais une campagne envoyée une fois.
//
// ── UN BOUTON, JAMAIS UN AUTOMATISME ────────────────────────────────────────
// Rien ne part tout seul. Celui qui clique est le propriétaire du club ou un
// admin, et la destinataire doit être une coach de CE club. On écrit à
// `users.email` — l'adresse de CONNEXION. Mêmes réponses d'erreur que l'agenda
// (le front les traduit : `envoyerModeEmploi`).
//
// Le texte et les mini-écrans : gabarit.ts. verify_jwt = true (défaut) + contrôle
// des droits ci-dessous.
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { sendResend } from "../_shared/email.ts";
import { gabarit } from "./gabarit.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

const prenomDe = (nom: string | null | undefined) => (nom ?? "").trim().split(/\s+/)[0] ?? "";

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

  const prenom = prenomDe(coach.name) || "toi";
  const envoi = await sendResend({
    to: dest,
    from: "The Breakfast Club <no-reply@labase360.fr>",
    subject: `${prenomDe(coach.name) || "Hello"}, la caisse du club : mode d'emploi 🧾`,
    html: gabarit({ prenom, expediteur: prenomDe(appelant?.name) || "L'équipe" }),
  });
  if (!envoi.ok) return json({ ok: false, error: envoi.error }, 502);
  return json({ ok: true, envoye: true, prenom });
});
