// =============================================================================
// lead-clic — « qui a cliqué sur son lien ? »
//
// Thomas, 08/09/2026 : « 27 SMS envoyés, zéro signal ». Le lien de réservation
// était le même pour tout le monde : impossible de savoir qui avait lu, cliqué,
// hésité. Le seul retour possible était une réservation ; tout le reste était
// un trou noir.
//
// Chaque lead porte désormais un jeton court (`prospect_leads.lien_token`) et
// reçoit `labase-nutrition.com/r/<jeton>`. Cette fonction fait deux choses :
//   1. elle horodate le clic  →  un clic SANS réservation, c'est quelqu'un que
//      quelque chose a arrêté. C'est LUI qu'on rappelle dans l'heure.
//   2. elle rend le prénom / nom / téléphone / email pour pré-remplir le
//      formulaire — qui demande cinq champs, dont quatre qu'on connaît déjà.
//
// ⚠️ Le jeton EST le mot de passe : il donne accès aux coordonnées de la
// personne. D'où le format court mais imprévisible (48 bits), et le fait qu'on
// ne renvoie JAMAIS autre chose que ses propres coordonnées — ni identifiant
// interne, ni notes, ni historique.
//
// ⚠️ On ne compte le clic que sur un POST. Les antivirus et certains opérateurs
// « pré-visitent » les liens des SMS en GET : les compter ferait croire à un
// intérêt qui n'existe pas. Mieux vaut manquer un clic que d'en inventer un —
// on va décrocher son téléphone sur la foi de ce chiffre.
//
// Deploy : supabase functions deploy lead-clic --no-verify-jwt
// =============================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const cors = {
  "Access-Control-Allow-Origin": "*",
  // ⚠️ `x-client-info` est OBLIGATOIRE : supabase-js l'ajoute à chaque appel
  // via `functions.invoke`. Sans lui, le navigateur bloque la requête au
  // preflight et la fonction n'est même jamais atteinte — aucun clic
  // enregistré, aucune erreur côté serveur. Vécu le 08/09/2026.
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

/** Les robots qui déplient les liens : ils ne sont pas des prospects. */
const ROBOT = /bot|crawler|spider|preview|scan|curl|wget|python|monitor|facebookexternalhit|whatsapp|slackbot/i;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "json_invalide" }, 400);
  }
  const token = (body.token ?? "").trim();
  if (!/^[a-f0-9]{12}$/.test(token)) return json({ error: "jeton_invalide" }, 400);

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: lead, error } = await sb
    .from("prospect_leads")
    .select("id, first_name, last_name, phone, email, city, lien_clics")
    .eq("lien_token", token)
    .maybeSingle();

  // Jeton inconnu : on ne dit pas s'il a existé un jour. La page réagira en
  // affichant simplement un formulaire vide, ce qui est le bon comportement.
  if (error || !lead) return json({ trouve: false }, 200);

  const robot = ROBOT.test(req.headers.get("user-agent") ?? "");
  if (!robot) {
    // Best-effort : si le comptage échoue, la personne doit quand même pouvoir
    // réserver. On ne renvoie jamais d'erreur pour ça.
    await sb
      .from("prospect_leads")
      .update({
        lien_clic_at: new Date().toISOString(),
        lien_clics: (lead.lien_clics ?? 0) + 1,
      })
      .eq("id", lead.id);
  }

  return json({
    trouve: true,
    prenom: lead.first_name ?? "",
    nom: lead.last_name ?? "",
    tel: lead.phone ?? "",
    email: lead.email ?? "",
    ville: lead.city ?? "",
  });
});
