// =============================================================================
// noaly — Noaly, l'IA de La Base 360 (chantier Noaly complet, 2026-06-10).
//
// 4 modes (champ `mode` du body) :
//   - "crm_message" (défaut si `lead` présent) : génère un message de 1er
//     contact / relance pour un lead CRM (V1 wagon 3 — inchangé).
//   - "coach_chat" : chat multi-tours du FAB coach. Reçoit l'historique au
//     format Anthropic (avec blocs tool_use/tool_result), des OUTILS déclarés
//     ici mais EXÉCUTÉS PAR LE FRONT (chercher_client, ouvrir_page,
//     clients_inactifs) — les données clients ne transitent que si le front
//     les fournit en tool_result. Cap mensuel tokens par coach.
//   - "client_chat" : chat de la PWA client (modale Aide rapide). Auth par
//     token client (client_app_accounts) ; le contexte est construit CÔTÉ
//     SERVEUR (jamais fourni par le client) ; garde-fous santé stricts +
//     escalade vers le coach ; cap quotidien de messages par client.
//   - "bilan_analysis" : assistant du bilan PHYSIQUE (étape « Programme
//     proposé », en RDV). Reçoit un résumé du bilan construit côté front et
//     renvoie synthèse + pitch à dire au client + points d'attention +
//     focus programme/assiette (JSON). Ne modifie jamais le bilan. Cap coach.
//
// Tous les appels loggés dans ai_usage_log (tokens + coût €).
// Modèle : NOALY_MODEL (fallback LORSQUAD_AI_MODEL, défaut claude-opus-4-8).
// Caps : NOALY_COACH_MONTHLY_TOKENS (déf. 2 000 000), NOALY_CLIENT_DAILY_MSGS
// (déf. 20). Sans ANTHROPIC_API_KEY → 503 « en attente d'activation ».
//
// Déploiement : supabase functions deploy noaly
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const MODEL =
  Deno.env.get("NOALY_MODEL") ?? Deno.env.get("LORSQUAD_AI_MODEL") ?? "claude-opus-4-8";
const COACH_MONTHLY_TOKENS = Number(Deno.env.get("NOALY_COACH_MONTHLY_TOKENS") ?? 2_000_000);
const CLIENT_DAILY_MSGS = Number(Deno.env.get("NOALY_CLIENT_DAILY_MSGS") ?? 20);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Prix par 1M tokens (USD) → EUR ≈ ×0.92.
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

function notConfigured(): Response {
  return json(
    {
      error: "ai_not_configured",
      message: "Noaly arrive très bientôt — en attente d'activation 🌿",
    },
    503,
  );
}

async function callAnthropic(payload: Record<string, unknown>) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal: AbortSignal.timeout(25000),
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, ...payload }),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.warn("[noaly] Anthropic error", res.status, errText.slice(0, 200));
    throw new Response(
      JSON.stringify({ error: "ai_error", message: `Noaly est indisponible (${res.status}).` }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  return (await res.json()) as {
    content?: { type: string; text?: string; [k: string]: unknown }[];
    stop_reason?: string;
    usage?: { input_tokens?: number; output_tokens?: number };
  };
}

function logUsage(
  sb: SupabaseClient,
  feature: string,
  usage: { input_tokens?: number; output_tokens?: number } | undefined,
  userId: string | null,
  clientId: string | null,
) {
  const inTok = usage?.input_tokens ?? 0;
  const outTok = usage?.output_tokens ?? 0;
  const price = PRICING[MODEL] ?? PRICING["claude-opus-4-8"];
  const costEur = ((inTok / 1e6) * price.in + (outTok / 1e6) * price.out) * USD_TO_EUR;
  sb.from("ai_usage_log")
    .insert({
      user_id: userId,
      client_id: clientId,
      feature,
      model: MODEL,
      input_tokens: inTok,
      output_tokens: outTok,
      cost_eur: Number(costEur.toFixed(4)),
    })
    .then(({ error }) => {
      if (error) console.warn("[noaly] log non critique:", error.message);
    });
}

// ─── Mode 1 : crm_message (V1, inchangé) ─────────────────────────────────────

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

const CRM_SYSTEM = `Tu es Noaly, l'assistante IA de La Base 360, un club de coaching bien-être/nutrition (méthode Herbalife).
Tu rédiges des messages COURTS (4-6 lignes max) de premier contact ou de relance, à envoyer par WhatsApp/SMS à un prospect.
Ton : chaleureux, naturel, jamais commercial agressif, jamais de jargon. Tutoiement. Quelques emojis bien placés (🌿 👋 🙂), pas plus de 3.
Règles : pas de promesses santé, pas de "perte de poids garantie". On propose un échange ou un bilan, sans pression, avec une porte de sortie douce.
Tu réponds UNIQUEMENT avec le texte du message (pas de préambule, pas de guillemets, pas d'options multiples).`;

async function handleCrmMessage(sb: SupabaseClient, body: Record<string, unknown>) {
  const lead = (body.lead ?? {}) as LeadCtx;
  const coach = String(body.coachFirstName ?? "ton coach").trim();
  const bilanUrl = String(body.bilanUrl ?? "").trim();
  const mode = body.mode === "relance" ? "relance" : "first_contact";
  // Un lead « bilan-online » a DÉJÀ rempli son bilan → ne pas reproposer un bilan.
  const bilanDone = body.bilanDone === true || lead.source === "bilan-online";

  const userPrompt =
    `Rédige un message de ${mode === "relance" ? "RELANCE DOUCE (le prospect n'a pas répondu à un 1er message)" : "PREMIER CONTACT"}.\n\n` +
    `Coach (signe avec ce prénom) : ${coach}\n` +
    `Prénom du prospect : ${lead.firstName || "(inconnu)"}\n` +
    `Source du lead : ${lead.sourceLabel || lead.source || "inconnue"}\n` +
    (lead.viaName ? `Recommandé par : ${lead.viaName}\n` : "") +
    (lead.extra ? `Relation/contexte : ${lead.extra}\n` : "") +
    (lead.city ? `Ville : ${lead.city}\n` : "") +
    (lead.notes ? `Notes : ${lead.notes}\n` : "") +
    (bilanDone
      ? `\nIMPORTANT : ce prospect a DÉJÀ rempli son bilan en ligne — NE propose PAS de (re)faire un bilan ni un questionnaire. Propose plutôt un court échange (appel/RDV) pour lui présenter ses résultats personnalisés et la suite, en douceur.\n`
      : bilanUrl
        ? `\nSi pertinent, tu peux proposer ce questionnaire bilan rapide (2 min) : ${bilanUrl}\n`
        : "") +
    (lead.source === "reco-client" || lead.source === "intention"
      ? `\nC'est une recommandation : remercie d'avoir été mis en relation, mentionne la personne qui a recommandé si connue, reste léger.\n`
      : "") +
    (lead.source === "vip" ? `\nLe prospect s'intéresse au Club VIP (remises sur la nutrition) : rebondis là-dessus.\n` : "");

  const data = await callAnthropic({
    max_tokens: 1000,
    system: CRM_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });

  const message = (data.content ?? [])
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("")
    .trim();

  logUsage(sb, "crm_message", data.usage, (body.coachUserId as string) ?? null, null);
  return json({ message, model: MODEL, usage: data.usage });
}

// ─── Mode 2 : coach_chat (FAB coach, outils exécutés par le front) ──────────

const COACH_TOOLS = [
  {
    name: "chercher_client",
    description:
      "Cherche un client de La Base 360 par prénom et/ou nom. Appelle cet outil dès que le coach mentionne un client par son nom et que tu as besoin de le retrouver ou d'ouvrir sa fiche.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string", description: "Prénom et/ou nom (partiel accepté)" } },
      required: ["query"],
    },
  },
  {
    name: "clients_inactifs",
    description:
      "Liste les clients sans bilan depuis N jours. Appelle cet outil quand le coach demande qui relancer, les clients dormants ou inactifs.",
    input_schema: {
      type: "object",
      properties: { jours: { type: "number", description: "Seuil en jours (ex 30)" } },
      required: ["jours"],
    },
  },
  {
    name: "ouvrir_page",
    description:
      "Ouvre une page de l'app pour le coach. Appelle cet outil quand le coach demande d'aller quelque part ou quand ouvrir une page est la suite logique (ex : fiche d'un client trouvé via chercher_client → chemin /clients/<id>). Chemins valides : /co-pilote, /flex, /agenda, /messages, /clients, /clients/<id>, /crm, /pv, /outils-prospection, /developpement, /routine-du-jour, /cahier-de-bord, /parametres.",
    input_schema: {
      type: "object",
      properties: { chemin: { type: "string", description: "Chemin de la page (ex /crm)" } },
      required: ["chemin"],
    },
  },
];

const COACH_SYSTEM = `Tu es Noaly, l'assistante IA de La Base 360 — l'app des coachs bien-être/nutrition du club (méthode Herbalife, basé à Verdun).
Tu aides le COACH au quotidien : retrouver un client, savoir qui relancer, rédiger des messages (relance douce, félicitations, proposition de RDV), comprendre les outils de l'app, suggérer la prochaine action.
L'app contient : Co-pilote (tableau de bord du jour), FLEX (pilotage 5-3-1 invitations/conversations/bilans), Agenda, Messagerie, Dossiers clients, CRM (pipeline de leads — bilan online, Club VIP, recos), Suivi PV (points volume Herbalife), Outil de prospection, Mon développement (Academy, Formation, fiches), Routine du jour (5 actions), Cahier de bord (liste 100), Club VIP (remises clients 15→35%, parrainage).
Tu disposes d'outils (chercher_client, clients_inactifs, ouvrir_page) : utilise-les dès qu'ils sont utiles au lieu de deviner. Après un outil, réponds en t'appuyant sur le résultat.
Style : français, tutoiement, chaleureux et direct, réponses COURTES et actionnables (3-6 lignes sauf si on te demande de rédiger un message complet). Emojis avec parcimonie. Jamais de promesse santé ni de conseil médical.`;

async function handleCoachChat(sb: SupabaseClient, body: Record<string, unknown>) {
  const coachUserId = (body.coachUserId as string) ?? null;
  const rawMessages = Array.isArray(body.messages) ? body.messages : [];
  if (rawMessages.length === 0) return json({ error: "messages requis" }, 400);

  // Cap mensuel tokens par coach (somme du mois en cours).
  if (coachUserId) {
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const { data: rows } = await sb
      .from("ai_usage_log")
      .select("input_tokens, output_tokens")
      .eq("user_id", coachUserId)
      .gte("created_at", monthStart.toISOString())
      .limit(5000);
    const used = (rows ?? []).reduce(
      (s, r) => s + (r.input_tokens as number) + (r.output_tokens as number),
      0,
    );
    if (used >= COACH_MONTHLY_TOKENS) {
      return json(
        {
          error: "cap_reached",
          message:
            "Tu as atteint ton quota Noaly du mois 🙏 Il se réinitialise le 1er. (L'admin peut l'augmenter.)",
        },
        429,
      );
    }
  }

  const context = (body.context ?? {}) as { route?: string; clientSummary?: string };
  const contextNote =
    `\n\n[Contexte actuel : le coach ${body.coachFirstName ?? ""} est sur la page ${context.route ?? "?"}` +
    (context.clientSummary ? ` · Fiche client ouverte : ${context.clientSummary}` : "") +
    `]`;

  // Garde les ~24 derniers messages pour borner le contexte.
  const messages = rawMessages.slice(-24);

  const data = await callAnthropic({
    max_tokens: 1500,
    system: COACH_SYSTEM + contextNote,
    tools: COACH_TOOLS,
    messages,
  });

  logUsage(sb, "coach_chat", data.usage, coachUserId, null);
  return json({ content: data.content ?? [], stop_reason: data.stop_reason, model: MODEL });
}

// ─── Mode 3 : client_chat (PWA client, contexte construit côté serveur) ─────

async function handleClientChat(sb: SupabaseClient, body: Record<string, unknown>) {
  const token = String(body.client_token ?? "").trim();
  if (!token) return json({ error: "client_token requis" }, 400);

  // Auth : token → compte client (même pattern que client-app-data).
  const { data: account } = await sb
    .from("client_app_accounts")
    .select("client_id, coach_id")
    .eq("token", token)
    .maybeSingle();
  if (!account?.client_id) return json({ error: "token invalide" }, 401);

  // Cap quotidien par client.
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const { count } = await sb
    .from("ai_usage_log")
    .select("id", { count: "exact", head: true })
    .eq("client_id", account.client_id)
    .eq("feature", "client_chat")
    .gte("created_at", dayStart.toISOString());
  if ((count ?? 0) >= CLIENT_DAILY_MSGS) {
    return json(
      {
        error: "cap_reached",
        message:
          "Tu as posé beaucoup de questions aujourd'hui 🙂 Noaly revient demain — en attendant, écris directement à ton coach !",
      },
      429,
    );
  }

  // Contexte serveur : données du client UNIQUEMENT (jamais fournies par le front).
  const [{ data: cli }, { data: coachUser }] = await Promise.all([
    sb
      .from("clients")
      .select("first_name, next_follow_up, current_program, objective")
      .eq("id", account.client_id)
      .maybeSingle(),
    sb.from("users").select("name").eq("id", account.coach_id).maybeSingle(),
  ]);
  const coachFirst = ((coachUser?.name as string) ?? "ton coach").split(/\s+/)[0];
  const rdv = cli?.next_follow_up
    ? new Date(cli.next_follow_up as string).toLocaleString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const system =
    `Tu es Noaly, l'assistante IA de La Base 360, qui répond aux CLIENTS du club bien-être/nutrition dans leur application.\n` +
    `Contexte de CE client (seules infos que tu connais — n'invente rien d'autre) :\n` +
    `- Prénom : ${cli?.first_name ?? "?"}\n` +
    `- Coach : ${coachFirst}\n` +
    (rdv ? `- Prochain RDV : ${rdv}\n` : `- Prochain RDV : pas encore planifié\n`) +
    (cli?.current_program ? `- Programme en cours : ${cli.current_program}\n` : "") +
    (cli?.objective ? `- Objectif : ${cli.objective}\n` : "") +
    `L'app du client contient les onglets : Accueil (RDV), Évolution (poids/bilans), Produits, Conseils (assiette idéale, routine), Messages (écrire au coach), Recommander (Club VIP, remises 15→35%).\n` +
    `RÈGLES STRICTES :\n` +
    `1. JAMAIS de conseil médical, de diagnostic, de dosage, d'avis sur un médicament ou un symptôme inquiétant → réponds qu'il faut en parler à ${coachFirst} ou à un professionnel de santé.\n` +
    `2. Tu ne connais QUE ce client. Jamais d'info sur d'autres clients ou sur le business du coach.\n` +
    `3. Questions nutrition générales (fringale, hydratation, motivation, comment lire son évolution) : réponds simplement, 3-5 lignes max, chaleureux, tutoiement, 1-2 emojis.\n` +
    `4. Si tu n'es pas sûre ou si c'est personnel (changer le programme, douleur, résultat anormal) → oriente vers l'onglet Messages pour écrire à ${coachFirst}.\n` +
    `5. Pour décaler un RDV → bouton « Modifier » sur la card RDV de l'Accueil. Pour commander → onglet Produits puis message au coach.\n` +
    `Réponds UNIQUEMENT avec ta réponse au client (pas de préambule).`;

  const rawMessages = Array.isArray(body.messages) ? body.messages : [];
  const messages = rawMessages
    .slice(-8)
    .map((m) => ({
      role: (m as { role?: string }).role === "assistant" ? "assistant" : "user",
      content: String((m as { content?: string }).content ?? "").slice(0, 1500),
    }))
    .filter((m) => m.content.trim().length > 0);
  if (messages.length === 0) return json({ error: "messages requis" }, 400);

  const data = await callAnthropic({ max_tokens: 700, system, messages });
  const message = (data.content ?? [])
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("")
    .trim();

  logUsage(sb, "client_chat", data.usage, null, account.client_id as string);
  return json({ message, model: MODEL });
}

// ─── Mode 4 : bilan_analysis (assistant du bilan PHYSIQUE, côté coach) ───────
//
// Pendant le RDV, à l'étape « Programme proposé ». Noaly NE remplace PAS la
// logique déterministe (besoins/boosters/assiette déjà calculés et affichés) :
// elle la SYNTHÉTISE pour le coach et lui donne un pitch à dire au client.
// Principe « assistant, pas pilote auto » : Noaly suggère, ne modifie jamais le
// bilan. Le `summary` est construit côté front (le coach a déjà toutes les
// données saisies). Coach-facing → modèle par défaut (Opus). Cap mensuel coach.

const BILAN_SYSTEM = `Tu es Noaly, l'assistante IA de La Base 360 (club de coaching bien-être/nutrition, méthode Herbalife, Verdun).
Tu assistes le COACH pendant un bilan physique, en RDV, AVEC le client en face. À l'étape « Programme proposé », le coach te demande une lecture du bilan pour mieux le présenter.
Un programme a déjà été proposé par l'app (besoins détectés, boosters, assiette idéale, cible protéines/eau) : tu t'APPUIES dessus, tu ne le réinventes pas et tu ne le contredis pas sans raison.
Ton rôle : (1) synthétiser le bilan en clair, (2) donner au coach un PITCH à dire À VOIX HAUTE au client (tutoiement, chaleureux, oral, relie le bilan au programme proposé, donne une direction motivante), (3) repérer d'éventuels points d'attention/incohérences du bilan formulés comme de simples SUGGESTIONS au coach (jamais d'ordre), (4) dire sur quoi insister dans le programme/l'assiette pour CE profil.
RÈGLES : pas de conseil médical ni de diagnostic, pas de promesse de perte de poids chiffrée ni de délai garanti, pas de dosage. Tu peux mentionner le programme/les produits déjà proposés par l'app (c'est la méthode du club) mais sans en rajouter au-delà. Le pitch parle au client, pas au coach.
Tu réponds UNIQUEMENT en JSON valide (aucun texte autour), avec EXACTEMENT ces clés :
{
  "synthese": "2-3 phrases factuelles : où en est le client, ce que révèlent composition corporelle, objectif et habitudes clés.",
  "pitch": "4-7 lignes que le coach DIT au client (tutoiement, chaleureux, oral) : relie le bilan au programme proposé et donne une direction claire et motivante, sans chiffre promis.",
  "points_attention": ["suggestion courte au coach (incohérence ou manque repéré dans le bilan)", "..."],
  "programme_note": "1-2 phrases : sur quoi insister dans le programme et l'assiette pour ce profil précis."
}
Si rien à signaler en points d'attention, renvoie un tableau vide [].`;

async function coachCapReached(sb: SupabaseClient, coachUserId: string): Promise<boolean> {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const { data: rows } = await sb
    .from("ai_usage_log")
    .select("input_tokens, output_tokens")
    .eq("user_id", coachUserId)
    .gte("created_at", monthStart.toISOString())
    .limit(5000);
  const used = (rows ?? []).reduce(
    (s, r) => s + (r.input_tokens as number) + (r.output_tokens as number),
    0,
  );
  return used >= COACH_MONTHLY_TOKENS;
}

async function handleBilanAnalysis(sb: SupabaseClient, body: Record<string, unknown>) {
  const coachUserId = (body.coachUserId as string) ?? null;
  const summary = String(body.summary ?? "").trim();
  if (!summary) return json({ error: "summary requis" }, 400);

  if (coachUserId && (await coachCapReached(sb, coachUserId))) {
    return json(
      {
        error: "cap_reached",
        message:
          "Tu as atteint ton quota Noaly du mois 🙏 Il se réinitialise le 1er. (L'admin peut l'augmenter.)",
      },
      429,
    );
  }

  const refine = String(body.refine ?? "").trim();
  const userPrompt =
    `Voici les données du bilan physique (saisies par le coach) :\n\n${summary}\n\n` +
    (refine
      ? `Le coach souhaite affiner ta lecture : « ${refine} ». Tiens-en compte.\n\n`
      : "") +
    `Donne ta lecture au format JSON demandé.`;

  const data = await callAnthropic({
    max_tokens: 1500,
    system: BILAN_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });

  const raw = (data.content ?? [])
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("")
    .trim();

  // Parse tolérant : isole le 1er objet JSON même si le modèle a bavardé autour.
  let analysis: Record<string, unknown> | null = null;
  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) analysis = JSON.parse(raw.slice(start, end + 1));
  } catch {
    analysis = null;
  }
  if (!analysis) analysis = { synthese: raw, pitch: "", points_attention: [], programme_note: "" };

  logUsage(sb, "bilan_analysis", data.usage, coachUserId, null);
  return json({ analysis, model: MODEL, usage: data.usage });
}

// ─── Router ──────────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (!ANTHROPIC_API_KEY) return notConfigured();

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    if (body.mode === "coach_chat") return await handleCoachChat(sb, body);
    if (body.mode === "client_chat") return await handleClientChat(sb, body);
    if (body.mode === "bilan_analysis") return await handleBilanAnalysis(sb, body);
    // Défaut / rétro-compat : génération message CRM (body.lead + mode first_contact/relance).
    return await handleCrmMessage(sb, body);
  } catch (e) {
    if (e instanceof Response) return e; // erreur Anthropic déjà formatée
    const msg = e instanceof Error ? e.message : "unknown";
    console.warn("[noaly]", msg);
    return json({ error: "server_error", message: msg }, 500);
  }
});
