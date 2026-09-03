// Envoi SMS manuel via Twilio — sert aux envois ponctuels pilotes a la main
// (fermetures de contact, relances one-shot) et a verifier les 3 secrets.
//
// ⚠️ 03/09/2026 — CETTE FONCTION ETAIT PUBLIQUE (--no-verify-jwt).
// N'importe qui connaissant l'URL pouvait envoyer des SMS sur le compte
// Twilio de La Base, a nos frais. Elle exige desormais un JWT valide :
// on la deploie SANS --no-verify-jwt, et on l'appelle avec la service_role
// key. Ne JAMAIS la redeployer avec --no-verify-jwt.
//
// Secrets requis : TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_SENDER
//
// Deploy: supabase functions deploy test-twilio-sms --project-ref <ref>

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
  const AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
  const SENDER = Deno.env.get("TWILIO_SENDER") ?? "";

  const missing = [
    !ACCOUNT_SID && "TWILIO_ACCOUNT_SID",
    !AUTH_TOKEN && "TWILIO_AUTH_TOKEN",
    !SENDER && "TWILIO_SENDER",
  ].filter(Boolean);
  if (missing.length > 0) {
    return new Response(JSON.stringify({ error: "secrets_manquants", missing }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  let body: { to?: string; message?: string } = {};
  try {
    body = await req.json();
  } catch {
    // corps illisible : on refuse plus bas, on n'invente pas de destinataire
  }
  const to = (body.to ?? "").trim();
  // ⚠️ Le texte par defaut a disparu VOLONTAIREMENT : un appel sans `message`
  // envoyait « Test La Base 360… » a un vrai numero. Le message est obligatoire.
  const message = (body.message ?? "").trim();
  if (!to || !message) {
    return new Response(JSON.stringify({ error: !to ? "missing_to" : "missing_message" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  // Le numero doit etre au format international : Twilio facture un echec
  // comme un envoi, autant refuser ici.
  if (!/^\+[1-9]\d{7,14}$/.test(to)) {
    return new Response(JSON.stringify({ error: "to_non_e164", to }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const auth = btoa(`${ACCOUNT_SID}:${AUTH_TOKEN}`);
  const params = new URLSearchParams({ To: to, From: SENDER, Body: message });

  const resp = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    },
  );
  const data = await resp.json().catch(() => ({}));

  return new Response(JSON.stringify({ twilio_status: resp.status, twilio_response: data }), {
    status: resp.ok ? 200 : 502,
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
