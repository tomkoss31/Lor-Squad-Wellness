// =============================================================================
// noaly — Noaly, l'IA de La Base 360 (ex « lor-squad-ai », renommée 2026-06-10
// sur décision Thomas : l'app c'est La Base 360, et son IA s'appelle Noaly).
//
// V1 (wagon 3 chantier 8) : génération d'un message de 1er contact / relance
// CRM. Reçoit le contexte d'un lead + le coach, appelle l'API Claude
// (Messages), renvoie un message personnalisé prêt à envoyer. Logge tokens +
// coût dans ai_usage_log. Appelée depuis l'app coach (JWT) via
// sb.functions.invoke("noaly").
//
// Modèle : variable d'env NOALY_MODEL (fallback legacy LORSQUAD_AI_MODEL,
// défaut claude-opus-4-8). Passer sur claude-haiku-4-5 (5× moins cher) ou
// claude-sonnet-4-6 via
//   supabase secrets set NOALY_MODEL=claude-haiku-4-5
// sans redéployer le code.
//
// Pré-requis : secret ANTHROPIC_API_KEY. Absent → 503 + message clair
// (l'UI affiche « configure ta clé »).
//
// Déploiement : supabase functions deploy noaly
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const MODEL =
  Deno.env.get("NOALY_MODEL") ?? Deno.env.get("LORSQUAD_AI_MODEL") ?? "claude-opus-4-8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Prix par 1M tokens (USD) → EUR ≈ ×0.92. Maj si Thomas change de modèle.
const PRICING: Record<string, { in: number; out: number }> = {
  "claude-opus-4-8": { in: 5, out: 25 },
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-haiku-4-5": { in: 1, out: 5 },
};
const USD_TO_EUR = 0.92;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface LeadCtx {
  firstName?: string;
  source?: string;
  sourceLabel?: string;
  viaName?: string | null;
  city?: string | null;
  status?: string;
  extra?: string | null;
  notes?: string | null;
}

const SYSTEM_PROMPT = `Tu es Noaly, l'assistante IA de La Base 360, un club de coaching bien-être/nutrition (méthode Herbalife).
Tu rédiges des messages COURTS (4-6 lignes max) de premier contact ou de relance, à envoyer par WhatsApp/SMS à un prospect.
Ton : chaleureux, naturel, jamais commercial agressif, jamais de jargon. Tutoiement. Quelques emojis bien placés (🌿 👋 🙂), pas plus de 3.
Règles : pas de promesses santé, pas de "perte de poids garantie". On propose un échange ou un bilan, sans pression, avec une porte de sortie douce.
Tu réponds UNIQUEMENT avec le texte du message (pas de préambule, pas de guillemets, pas d'options multiples).`;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  if (!ANTHROPIC_API_KEY) {
    return json(
      {
        error: "ai_not_configured",
        message:
          "L'IA n'est pas encore activée. Renseigne ta clé Anthropic : supabase secrets set ANTHROPIC_API_KEY=…",
      },
      503,
    );
  }

  try {
    const body = (await req.json()) as {
      lead?: LeadCtx;
      coachFirstName?: string;
      bilanUrl?: string;
      mode?: "first_contact" | "relance";
      coachUserId?: string;
    };
    const lead = body.lead ?? {};
    const coach = (body.coachFirstName ?? "ton coach").trim();
    const bilanUrl = (body.bilanUrl ?? "").trim();
    const mode = body.mode === "relance" ? "relance" : "first_contact";

    const userPrompt =
      `Rédige un message de ${mode === "relance" ? "RELANCE DOUCE (le prospect n'a pas répondu à un 1er message)" : "PREMIER CONTACT"}.\n\n` +
      `Coach (signe avec ce prénom) : ${coach}\n` +
      `Prénom du prospect : ${lead.firstName || "(inconnu)"}\n` +
      `Source du lead : ${lead.sourceLabel || lead.source || "inconnue"}\n` +
      (lead.viaName ? `Recommandé par : ${lead.viaName}\n` : "") +
      (lead.extra ? `Relation/contexte : ${lead.extra}\n` : "") +
      (lead.city ? `Ville : ${lead.city}\n` : "") +
      (lead.notes ? `Notes : ${lead.notes}\n` : "") +
      (bilanUrl
        ? `\nSi pertinent, tu peux proposer ce questionnaire bilan rapide (2 min) : ${bilanUrl}\n`
        : "") +
      (lead.source === "reco-client" || lead.source === "intention"
        ? `\nC'est une recommandation : remercie d'avoir été mis en relation, mentionne la personne qui a recommandé si connue, reste léger.\n`
        : "") +
      (lead.source === "vip"
        ? `\nLe prospect s'intéresse au Club VIP (remises sur la nutrition) : rebondis là-dessus.\n`
        : "");

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: AbortSignal.timeout(20000),
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.warn("[noaly] Anthropic error", aiRes.status, errText.slice(0, 200));
      return json({ error: "ai_error", message: `IA indisponible (${aiRes.status}).` }, 502);
    }

    const data = (await aiRes.json()) as {
      content?: { type: string; text?: string }[];
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const message = (data.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("")
      .trim();

    const inTok = data.usage?.input_tokens ?? 0;
    const outTok = data.usage?.output_tokens ?? 0;
    const price = PRICING[MODEL] ?? PRICING["claude-opus-4-8"];
    const costEur = ((inTok / 1e6) * price.in + (outTok / 1e6) * price.out) * USD_TO_EUR;

    // Log usage (best-effort, non bloquant).
    try {
      const sb = createClient(SUPABASE_URL, SERVICE_KEY);
      await sb.from("ai_usage_log").insert({
        user_id: body.coachUserId ?? null,
        feature: "crm_message",
        model: MODEL,
        input_tokens: inTok,
        output_tokens: outTok,
        cost_eur: Number(costEur.toFixed(4)),
      });
    } catch (logErr) {
      console.warn("[noaly] log non critique:", logErr);
    }

    return json({ message, model: MODEL, usage: { input_tokens: inTok, output_tokens: outTok } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.warn("[noaly]", msg);
    return json({ error: "server_error", message: msg }, 500);
  }
});
