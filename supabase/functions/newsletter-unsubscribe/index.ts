// =============================================================================
// newsletter-unsubscribe — la porte de sortie de la newsletter.
//
//   GET  ?e=<email>&s=<signature>  → désinscrit + page de confirmation
//   POST ?e=…&s=…                  → désinscrit (Gmail one-click) + 200
//
// Même motif que `campaign-unsubscribe`, à une différence près : la newsletter
// part à quatre publics et son HTML est construit une seule fois, donc il n'y
// a pas d'identifiant de destinataire à mettre dans le lien. C'est l'adresse
// qui voyage, SIGNÉE — sinon le lien deviendrait un bouton « désabonne
// n'importe qui » (cf. _shared/unsubToken.ts).
//
// L'adresse rejoint `email_suppressions`, la liste COMMUNE aux campagnes :
// se désabonner une fois vaut pour tout. Idempotent.
//
// ⚠️ Les e-mails de RENDEZ-VOUS ne sont pas concernés : ce n'est pas de la
// publicité, c'est le service. Un désabonné continue d'être prévenu de son RDV.
//
// Déployée --no-verify-jwt : le lien est cliqué depuis une boîte mail, sans
// session.
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { normaliserEmail, verifierEmail } from "../_shared/unsubToken.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function page(titre: string, message: string): Response {
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${titre}</title></head>
<body style="margin:0;background:#0F1A17;color:#EAF2EE;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;">
  <div style="max-width:430px;text-align:center;padding:32px 24px;">
    <div style="width:60px;height:60px;border-radius:17px;margin:0 auto 20px;background:#2DD4BF;color:#06110E;font-family:'Arial Black',sans-serif;font-size:31px;line-height:60px;">B</div>
    <h1 style="font-size:23px;margin:0 0 12px;line-height:1.25;">${titre}</h1>
    <p style="font-size:15px;line-height:1.65;color:#9DB3AC;margin:0;">${message}</p>
    <p style="font-size:12px;color:#6E8A82;margin-top:30px;line-height:1.6;">
      La Base 360 · Verdun<br>
      Tes e-mails de rendez-vous, eux, continuent d'arriver.
    </p>
  </div>
</body></html>`;
  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

async function desinscrire(email: string): Promise<{ ok: boolean; deja?: boolean }> {
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const em = normaliserEmail(email);

  // 1. Liste de suppression COMMUNE — c'est elle qui fait foi pour tous les
  //    envois. Le doublon (23505) veut dire « déjà désinscrit », pas une erreur.
  const { error: supErr } = await sb
    .from("email_suppressions")
    .insert({ email: em, reason: "unsubscribed" });
  const deja = supErr?.code === "23505";
  if (supErr && !deja) {
    console.warn("[newsletter-unsubscribe] suppression échouée :", supErr.message);
    return { ok: false };
  }

  // 2. Marque aussi l'inscrit du site club, s'il en est un — c'est ce qui
  //    alimente le compteur « désabonnés » de l'écran admin.
  await sb
    .from("newsletter_subscribers")
    .update({ unsubscribed_at: new Date().toISOString() })
    .ilike("email", em)
    .is("unsubscribed_at", null);

  return { ok: true, deja };
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const email = url.searchParams.get("e") ?? "";
  const sig = url.searchParams.get("s") ?? "";

  const valide = email && sig && (await verifierEmail(email, sig));

  // Gmail one-click : POST, réponse minimale, aucune page.
  if (req.method === "POST") {
    if (valide) await desinscrire(email);
    return new Response("ok", { status: 200 });
  }
  if (req.method !== "GET") return new Response("method_not_allowed", { status: 405 });

  if (!valide) {
    return page(
      "Lien invalide",
      "Ce lien de désinscription est incomplet ou périmé. Réponds simplement à l'un de nos e-mails et on s'en occupe.",
    );
  }

  const res = await desinscrire(email);
  if (!res.ok) {
    return page("Ça n'a pas marché", "Réessaie dans un instant, ou réponds à cet e-mail — on te retire à la main.");
  }
  return page(
    "C'est fait ✓",
    res.deja
      ? "Tu étais déjà désinscrit·e. Tu ne reçois plus notre newsletter."
      : "Tu ne recevras plus la newsletter. Ça prend effet tout de suite.",
  );
});
