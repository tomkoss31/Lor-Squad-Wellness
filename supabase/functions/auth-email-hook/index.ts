// =============================================================================
// auth-email-hook — Supabase Auth « Send Email Hook » (2026-07-10).
//
// BUT : router TOUS les mails d'auth Supabase (confirmation d'inscription,
// invitation, magic link, changement d'email, réauthentification, reset) par
// Resend avec le template La Base 360, au lieu du mailer intégré GoTrue (bridé
// + délivrabilité pourrie). Filet de sécurité : même si le code applicatif
// utilise surtout des liens token custom + createUser({email_confirm:true}),
// tout mail auth qui se déclencherait un jour part proprement.
//
// CONFIG DASHBOARD (Thomas, une fois) :
//   Authentication → Hooks → « Send Email Hook » → Enable
//     · Type : HTTPS
//     · URI  : https://<ref>.supabase.co/functions/v1/auth-email-hook
//     · Copier le secret généré (format v1,whsec_…)
//   Puis : Edge Functions → Secrets → SEND_EMAIL_HOOK_SECRET = <ce secret>
//
// Auth : signature standardwebhooks (secret du hook). verify_jwt = false.
// Deploy : supabase functions deploy auth-email-hook --no-verify-jwt
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import { brandedEmail, sendResend } from "../_shared/email.ts";

const HOOK_SECRET = Deno.env.get("SEND_EMAIL_HOOK_SECRET") ?? "";

interface EmailData {
  token: string;
  token_hash: string;
  redirect_to: string;
  email_action_type: string;
  site_url: string;
  token_new?: string;
  token_hash_new?: string;
}
interface HookPayload {
  user: { email: string };
  email_data: EmailData;
}

// Contenu email par type d'action GoTrue.
function contentFor(type: string): { subject: string; badge: string; eyebrow: string; heading: string; intro: string; cta: string } {
  switch (type) {
    case "signup":
      return { subject: "Confirme ton inscription — La Base 360", badge: "✅", eyebrow: "Bienvenue", heading: "Confirme ton inscription", intro: "Un dernier clic pour activer ton compte La Base 360 et démarrer.", cta: "Confirmer mon inscription →" };
    case "invite":
      return { subject: "Ton invitation — La Base 360", badge: "🎟️", eyebrow: "Invitation", heading: "Tu es invité·e sur La Base 360", intro: "Ton coach t'a créé un accès. Clique pour l'activer et te connecter.", cta: "Accepter l'invitation →" };
    case "magiclink":
      return { subject: "Ton lien de connexion — La Base 360", badge: "✨", eyebrow: "Connexion", heading: "Connecte-toi en un clic", intro: "Voici ton lien de connexion sécurisé. Il expire vite, utilise-le maintenant.", cta: "Me connecter →" };
    case "recovery":
      return { subject: "Réinitialise ton mot de passe — La Base 360", badge: "🔒", eyebrow: "Sécurité du compte", heading: "Réinitialise ton mot de passe", intro: "Tu as demandé à changer ton mot de passe. Clique pour en choisir un nouveau.", cta: "Choisir un nouveau mot de passe →" };
    case "email_change":
    case "email_change_new":
    case "email_change_current":
      return { subject: "Confirme ton nouvel email — La Base 360", badge: "📧", eyebrow: "Changement d'email", heading: "Confirme ton nouvel email", intro: "Tu as demandé à modifier l'adresse email de ton compte. Confirme pour valider.", cta: "Confirmer le changement →" };
    default:
      return { subject: "La Base 360", badge: "🌱", eyebrow: "La Base 360", heading: "Action requise", intro: "Une action est requise sur ton compte La Base 360.", cta: "Continuer →" };
  }
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("method_not_allowed", { status: 405 });

  const raw = await req.text();

  // Vérifie la signature du hook (standardwebhooks). Le secret Supabase est de
  // la forme « v1,whsec_<base64> » → la lib attend juste le base64.
  let payload: HookPayload;
  try {
    const wh = new Webhook(HOOK_SECRET.replace(/^v1,whsec_/, ""));
    const headers = {
      "webhook-id": req.headers.get("webhook-id") ?? "",
      "webhook-timestamp": req.headers.get("webhook-timestamp") ?? "",
      "webhook-signature": req.headers.get("webhook-signature") ?? "",
    };
    payload = wh.verify(raw, headers) as HookPayload;
  } catch (e) {
    return new Response(JSON.stringify({ error: { message: "invalid_signature", detail: String(e) } }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const email = payload.user?.email;
  const ed = payload.email_data;
  if (!email || !ed) {
    return new Response(JSON.stringify({ error: { message: "missing_data" } }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const c = contentFor(ed.email_action_type);

  // Réauthentification = OTP (code à saisir, pas de lien).
  const isOtp = ed.email_action_type === "reauthentication";

  let html: string;
  if (isOtp) {
    html = brandedEmail({
      badge: "🔐",
      eyebrow: "Vérification",
      heading: "Ton code de vérification",
      intro: "Saisis ce code pour confirmer ton identité :",
      otp: ed.token,
      validity: "Ce code expire dans quelques minutes.",
      outro: "Tu n'es pas à l'origine de cette demande ? Ignore cet email.",
    });
    c.subject = "Ton code de vérification — La Base 360";
  } else {
    const base = ed.site_url.replace(/\/+$/, "");
    const actionLink = `${base}/auth/v1/verify?token=${encodeURIComponent(ed.token_hash)}&type=${encodeURIComponent(ed.email_action_type)}&redirect_to=${encodeURIComponent(ed.redirect_to)}`;
    html = brandedEmail({
      badge: c.badge,
      eyebrow: c.eyebrow,
      heading: c.heading,
      intro: c.intro,
      ctaLabel: c.cta,
      ctaUrl: actionLink,
      validity: "Ce lien est valable 1 heure.",
      outro: "Tu n'es pas à l'origine de cette demande ? Ignore simplement cet email.",
    });
  }

  const sent = await sendResend({ to: email, subject: c.subject, html });
  if (!sent.ok) {
    // Non-200 → GoTrue sait que l'envoi a échoué (n'affiche pas un faux succès).
    return new Response(JSON.stringify({ error: { message: sent.error } }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } });
});
