// =============================================================================
// journal-noaly — Noaly dans le journal nutritionnel (lot 2, 21/09/2026).
//
// Deux modes, appelés par l'espace membre (jeton d'URL, pas de session) :
//
//   • lire_repas — « 150 g de poulet, des carottes et des pâtes » devient des
//     lignes DU CATALOGUE (journal_aliments) avec leur quantité. L'IA choisit
//     l'aliment et la quantité ; les protéines sont recalculées ici pour
//     l'affichage, puis par `journal_ajouter_lot` à l'écriture — jamais par
//     l'IA. Rien n'est écrit ici : la membre relit, retire, puis valide.
//
//   • conseil — « Le mot de Noaly » : 2 ou 3 phrases qui DISENT le plan de fin
//     de journée calculé par l'app (Noaly rédige, elle ne calcule pas). Gardé
//     sur la journée (journal_jours.conseil_noaly) tant que la journée ne
//     change pas : rouvrir la feuille ne rappelle pas l'IA.
//
// Modèle : Claude Sonnet 5 (décision de Thomas, 21/09), sans réflexion et à
// effort bas — de la lecture et une rédaction courte, la membre attend.
// Plafonds par membre sur 24 h : NOALY_JOURNAL_REPAS_JOUR (25) et
// NOALY_JOURNAL_CONSEILS_JOUR (8). Chaque appel est tracé dans ai_usage_log
// (journal_repas / journal_conseil). Si l'IA ne répond pas, l'app garde ses
// conseils calculés : Noaly est un plus, jamais un passage obligé.
//
// Déploiement : supabase functions deploy journal-noaly
// (verify_jwt = false dans config.toml : l'accès se vérifie ici, par le jeton).
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import Anthropic from "npm:@anthropic-ai/sdk@0.127.0";
import { zodOutputFormat } from "npm:@anthropic-ai/sdk@0.127.0/helpers/zod";
import { z } from "npm:zod@4.6.5/v4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const MODEL = "claude-sonnet-5";
const REPAS_PAR_JOUR = Number(Deno.env.get("NOALY_JOURNAL_REPAS_JOUR") ?? 25);
const CONSEILS_PAR_JOUR = Number(Deno.env.get("NOALY_JOURNAL_CONSEILS_JOUR") ?? 8);
// Claude Sonnet 5 : 2 $ / 10 $ le million de tokens ; cache lu à 0,1×, écrit à 1,25×.
const PRIX_ENTREE = 2;
const PRIX_SORTIE = 10;
const USD_TO_EUR = 0.92;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const anthropic = ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: ANTHROPIC_API_KEY, timeout: 25_000, maxRetries: 1 })
  : null;

type Creneau = "pdj" | "enc1" | "dej" | "enc2" | "din" | "aut";
const CRENEAUX: Creneau[] = ["pdj", "enc1", "dej", "enc2", "din", "aut"];
const NOM_CRENEAU: Record<Creneau, string> = {
  pdj: "Petit-déjeuner",
  enc1: "Encas du matin",
  dej: "Déjeuner",
  enc2: "Encas de l'après-midi",
  din: "Dîner",
  aut: "Autre (grignotage, boisson)",
};

const arrondi = (n: number) => Math.round(n * 10) / 10;

// ─── Le catalogue (le même que celui de l'app) ───────────────────────────────
interface Aliment {
  cle: string;
  nom: string;
  herbalife: boolean;
  prot_portion: number | null;
  prot_100g: number | null;
  portions: number[];
  unite: string | null;
  indice: string | null;
}
interface Catalogue {
  lu: number;
  parCle: Map<string, Aliment>;
  texte: string;
}
let catalogue: Catalogue | null = null;

async function chargerCatalogue(sb: SupabaseClient): Promise<Catalogue> {
  if (catalogue && Date.now() - catalogue.lu < 10 * 60_000) return catalogue;
  const { data, error } = await sb
    .from("journal_aliments")
    .select("cle, nom, herbalife, prot_portion, prot_100g, portions, unite, indice")
    .eq("actif", true)
    .order("cle");
  if (error || !data?.length) throw new Error("catalogue indisponible");
  const liste: Aliment[] = data.map((a) => ({
    cle: String(a.cle),
    nom: String(a.nom),
    herbalife: Boolean(a.herbalife),
    prot_portion: a.prot_portion == null ? null : Number(a.prot_portion),
    prot_100g: a.prot_100g == null ? null : Number(a.prot_100g),
    portions: Array.isArray(a.portions) ? a.portions.map(Number) : [],
    unite: a.unite ?? null,
    indice: a.indice ?? null,
  }));
  // Une ligne par aliment, dans un ordre stable : le début du prompt ne change
  // pas d'un appel à l'autre, il reste en cache chez Anthropic.
  const texte = liste
    .map((a) =>
      a.prot_portion != null
        ? `${a.cle} | ${a.nom} | à la portion${a.herbalife ? " | Herbalife" : ""}${a.indice ? ` | ${a.indice}` : ""}`
        : `${a.cle} | ${a.nom} | pesé, portions ${a.portions.join("/") || "100"} g${a.unite ? ` | ${a.unite}` : ""}`
    )
    .join("\n");
  catalogue = { lu: Date.now(), parCle: new Map(liste.map((a) => [a.cle, a])), texte };
  return catalogue;
}

function protAliment(a: Aliment, grammes: number | null, quantite: number): number {
  return a.prot_portion != null
    ? arrondi(a.prot_portion * quantite)
    : arrondi(((a.prot_100g ?? 0) * (grammes ?? 0)) / 100);
}

// ─── Accès, plafond, traçage ─────────────────────────────────────────────────
async function membre(sb: SupabaseClient, token: string) {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;
  const { data } = await sb
    .from("client_app_accounts")
    .select("client_id, client_first_name, expires_at")
    .eq("token", token)
    .maybeSingle();
  if (!data?.client_id) return null;
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null;
  return { clientId: String(data.client_id), prenom: (data.client_first_name as string | null) ?? null };
}

async function plafondAtteint(sb: SupabaseClient, clientId: string, feature: string, max: number) {
  const depuis = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await sb
    .from("ai_usage_log")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .eq("feature", feature)
    .gte("created_at", depuis);
  return (count ?? 0) >= max;
}

async function tracer(sb: SupabaseClient, feature: string, usage: Anthropic.Usage, clientId: string) {
  const neuf = usage.input_tokens ?? 0;
  const ecrit = usage.cache_creation_input_tokens ?? 0;
  const lu = usage.cache_read_input_tokens ?? 0;
  const sortie = usage.output_tokens ?? 0;
  const usd = (neuf * PRIX_ENTREE + ecrit * PRIX_ENTREE * 1.25 + lu * PRIX_ENTREE * 0.1 + sortie * PRIX_SORTIE) / 1e6;
  const { error } = await sb.from("ai_usage_log").insert({
    user_id: null,
    client_id: clientId,
    feature,
    model: MODEL,
    input_tokens: neuf + ecrit + lu,
    output_tokens: sortie,
    cost_eur: Number((usd * USD_TO_EUR).toFixed(4)),
  });
  if (error) console.warn("[journal-noaly] trace non critique :", error.message);
}

const INDISPONIBLE = { error: "ai_error", message: "Noaly ne répond pas pour le moment." };

// ─── Mode lire_repas ─────────────────────────────────────────────────────────
const Repas = z.object({
  lignes: z.array(
    z.object({
      texte: z.string(),
      cle: z.string(),
      grammes: z.number().nullable(),
      quantite: z.number().int().nullable(),
      estime: z.boolean(),
    }),
  ),
  non_reconnus: z.array(z.string()),
});

function systemeRepas(liste: string): string {
  return `Tu es Noaly, l'assistante nutrition de La Base (clubs de nutrition Herbalife, en France). Une membre écrit ce qu'elle a mangé, avec ses mots ; tu le traduis en lignes de son journal alimentaire.

Chaque aliment reconnu devient une ligne :
- \`cle\` : la clé EXACTE d'un aliment de la liste ci-dessous. N'invente jamais de clé ; si rien ne correspond, l'aliment va dans \`non_reconnus\`.
- \`texte\` : le morceau de sa phrase qui correspond à la ligne.
- Aliment « pesé » : \`grammes\` = le poids tel qu'on le mange (la liste est en poids CUIT, prêt à manger) et \`quantite\` = null. Sans poids donné, prends la première portion proposée et mets \`estime\` à true. Convertis les unités naturelles avec les repères de la liste (« 2 œufs » → 100 g). Un poids donné cru : pâtes, riz, semoule, quinoa, boulgour, lentilles, pois chiches → × 2,5 ; viande, poisson → × 0,75 ; et \`estime\` à true.
- Produit « à la portion » (Herbalife) : \`quantite\` (de 1 à 5) et \`grammes\` = null.
- \`estime\` = false seulement quand elle a donné la quantité elle-même.

Le shake Herbalife n'existe qu'en combinaison, jamais seul : « un shake », « mon shake », « F1 » sans précision → f1demi (le repère du club : F1 + ½ sachet de PDM). « Avec un sachet entier de PDM » → f1plein ; « au lait » → f1lait ; « au lait de soja » → f1soja.
« Des légumes » sans précision → poelee_legumes. Une boisson sans protéines (eau, café, thé, tisane, soda) n'est pas une ligne : ignore-la, l'eau se note à part.
Ce qui est trop vague pour être compté (« un truc », « un petit quelque chose ») va dans \`non_reconnus\`, avec ses mots.

La liste (clé | nom | mesure | repère) :
${liste}`;
}

async function lireRepas(sb: SupabaseClient, clientId: string, body: Record<string, unknown>) {
  const texte = String(body.texte ?? "").replace(/\s+/g, " ").trim();
  if (texte.length < 2) return json({ error: "texte_vide", message: "Écris ce que tu as mangé." }, 400);
  if (texte.length > 400) return json({ error: "texte_long", message: "Un repas à la fois, en quelques mots." }, 400);
  const creneau = CRENEAUX.includes(body.creneau as Creneau) ? (body.creneau as Creneau) : null;

  if (await plafondAtteint(sb, clientId, "journal_repas", REPAS_PAR_JOUR)) {
    return json({ error: "cap_reached", message: "Noaly a beaucoup calculé aujourd'hui : choisis dans la liste, elle revient demain." }, 429);
  }
  const cat = await chargerCatalogue(sb);

  let reponse;
  try {
    reponse = await anthropic!.messages.parse({
      model: MODEL,
      max_tokens: 1500,
      thinking: { type: "disabled" },
      output_config: { effort: "low", format: zodOutputFormat(Repas) },
      system: [{ type: "text", text: systemeRepas(cat.texte), cache_control: { type: "ephemeral" } }],
      messages: [{
        role: "user",
        content: `Créneau : ${creneau ? NOM_CRENEAU[creneau] : "non précisé"}.\nCe qu'elle a écrit : « ${texte} »`,
      }],
    });
  } catch (e) {
    console.warn("[journal-noaly] lire_repas :", e instanceof Anthropic.APIError ? `${e.status} ${e.message}` : String(e));
    return json(INDISPONIBLE, 502);
  }
  await tracer(sb, "journal_repas", reponse.usage, clientId);

  const sortie = reponse.parsed_output;
  if (!sortie || reponse.stop_reason === "refusal") return json(INDISPONIBLE, 502);

  const lignes: Array<{ aliment: string; nom: string; grammes: number | null; quantite: number; prot_g: number; estime: boolean }> = [];
  const nonReconnus = [...sortie.non_reconnus];
  for (const l of sortie.lignes) {
    const a = cat.parCle.get(l.cle);
    if (!a) {
      nonReconnus.push(l.texte || l.cle);
      continue;
    }
    if (a.prot_portion != null) {
      const q = Math.min(5, Math.max(1, Math.round(l.quantite ?? 1)));
      lignes.push({ aliment: a.cle, nom: a.nom, grammes: null, quantite: q, prot_g: protAliment(a, null, q), estime: l.estime });
    } else {
      let g = l.grammes;
      let estime = l.estime;
      if (g == null || !Number.isFinite(g) || g < 1) {
        g = a.portions[0] ?? 100;
        estime = true;
      }
      g = Math.min(2000, Math.round(g));
      lignes.push({ aliment: a.cle, nom: a.nom, grammes: g, quantite: 1, prot_g: protAliment(a, g, 1), estime });
    }
  }
  return json({ lignes: lignes.slice(0, 12), non_reconnus: nonReconnus.filter(Boolean).slice(0, 8) });
}

// ─── Mode conseil (« Le mot de Noaly ») ──────────────────────────────────────
const SYSTEME_CONSEIL = `Tu es Noaly, l'assistante nutrition de La Base (clubs de nutrition Herbalife, en France). Tu écris « le mot de Noaly » : un petit paragraphe chaleureux qui aide une membre à finir sa journée. Tu la tutoies.

- Commence par son prénom.
- Dis où elle en est avec un mot encourageant et VRAI : ne félicite que ce qui est réellement fait.
- Reprends le plan de fin de journée qu'on te donne, dans l'ordre, sans rien y ajouter ni changer les quantités. Il est calculé par l'app : tu le dis, tu ne le recalcules pas.
- Si le total avec le plan n'atteint pas son objectif de protéines, ne dis pas qu'elle l'atteindra : donne le total qu'elle atteindra, et c'est déjà bien.
- Sans objectif de protéines (pas encore de bilan pesé), parle de l'équilibre de ses repas et de l'eau.
- Un mot sur l'eau s'il lui reste des verres à boire : le nombre de verres de 25 cl.
- Les produits Herbalife passent en premier quand tu en cites. Jamais de marque de supermarché, jamais de promotion.
- Pas de conseil médical, pas de régime, pas de calories, jamais de culpabilisation.
- 60 mots au plus, sans emoji, sans liste, sans titre.`;

async function empreinte(valeur: unknown): Promise<string> {
  const octets = new TextEncoder().encode(JSON.stringify(valeur));
  const hache = await crypto.subtle.digest("SHA-256", octets);
  return Array.from(new Uint8Array(hache)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface EtatJour {
  jour: string;
  objectifs: { proteines: number | null; eau_l: number };
  lignes: Array<{ creneau: Creneau; libelle: string; prot_g: number; origine: string }>;
  verres: number;
  boisson_club: boolean;
  activite: string | null;
  humeur: string | null;
}

async function conseil(sb: SupabaseClient, token: string, clientId: string, prenomCompte: string | null, body: Record<string, unknown>) {
  const jour = typeof body.jour === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.jour) ? body.jour : null;
  const { data, error } = await sb.rpc("journal_jour", { p_token: token, p_jour: jour });
  if (error || !data) return json({ error: "journal_indisponible" }, 400);
  const etat = data as EtatJour;
  const cat = await chargerCatalogue(sb);

  // Le plan de fin de journée, tel que l'app l'affiche : on vérifie chaque idée
  // contre le catalogue et on recalcule ses protéines (le front ne dicte pas les chiffres).
  const plan: Array<{ creneau: Creneau; idee: string; herbalife: boolean; proteines_g: number }> = [];
  for (const p of Array.isArray(body.plan) ? body.plan.slice(0, 4) : []) {
    const idee = p as Record<string, unknown>;
    const a = cat.parCle.get(String(idee?.aliment ?? ""));
    const c = idee?.creneau as Creneau;
    if (!a || !CRENEAUX.includes(c)) continue;
    const g = a.prot_portion != null ? null : Math.min(2000, Math.max(1, Math.round(Number(idee.grammes) || a.portions[0] || 100)));
    plan.push({ creneau: c, idee: `${a.nom}${g ? ` (${g} g)` : ""}`, herbalife: a.herbalife, proteines_g: Math.round(protAliment(a, g, 1)) });
  }

  const { data: cli } = await sb.from("clients").select("first_name").eq("id", clientId).maybeSingle();
  const prenom = (cli?.first_name as string | undefined)?.trim() || prenomCompte || "toi";
  const prot = etat.lignes.reduce((s, l) => s + Number(l.prot_g), 0);
  const litres = etat.verres * 0.25 + (etat.boisson_club ? 0.4 : 0);
  // Même tolérance que l'app (eauAtteinte) : 9 verres de 25 cl valent « 2,3 L ».
  const verresRestants = Math.max(0, Math.ceil((Number(etat.objectifs.eau_l) - 0.05 - litres) / 0.25 - 1e-9));
  const faits = {
    prenom,
    objectif_proteines_g: etat.objectifs.proteines,
    proteines_notees_g: Math.round(prot),
    repas_notes: CRENEAUX.filter((c) => etat.lignes.some((l) => l.creneau === c)).map((c) => ({
      creneau: NOM_CRENEAU[c],
      aliments: etat.lignes.filter((l) => l.creneau === c).map((l) => l.libelle + (l.origine === "club" ? " (pris au club)" : "")),
    })),
    plan_fin_de_journee: plan.map((p) => ({ creneau: NOM_CRENEAU[p.creneau], idee: p.idee, herbalife: p.herbalife, proteines_g: p.proteines_g })),
    total_avec_le_plan_g: Math.round(prot + plan.reduce((s, p) => s + p.proteines_g, 0)),
    eau: { bu_l: arrondi(litres), objectif_l: Number(etat.objectifs.eau_l), verres_de_25_cl_restants: verresRestants },
    activite: etat.activite,
    humeur: etat.humeur,
  };
  const cle = await empreinte(faits);

  const { data: garde } = await sb
    .from("journal_jours")
    .select("conseil_noaly, conseil_empreinte")
    .eq("client_id", clientId)
    .eq("jour", etat.jour)
    .maybeSingle();
  if (garde?.conseil_noaly && garde.conseil_empreinte === cle) return json({ texte: garde.conseil_noaly, garde: true });

  if (await plafondAtteint(sb, clientId, "journal_conseil", CONSEILS_PAR_JOUR)) return json(INDISPONIBLE, 429);

  let reponse;
  try {
    reponse = await anthropic!.messages.create({
      model: MODEL,
      max_tokens: 600,
      thinking: { type: "disabled" },
      output_config: { effort: "low" },
      system: SYSTEME_CONSEIL,
      messages: [{
        role: "user",
        content: `Les faits de sa journée, calculés par l'app (ne les modifie pas) :\n${JSON.stringify(faits, null, 1)}`,
      }],
    });
  } catch (e) {
    console.warn("[journal-noaly] conseil :", e instanceof Anthropic.APIError ? `${e.status} ${e.message}` : String(e));
    return json(INDISPONIBLE, 502);
  }
  await tracer(sb, "journal_conseil", reponse.usage, clientId);

  const texte = reponse.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
  if (!texte || reponse.stop_reason === "refusal") return json(INDISPONIBLE, 502);

  const { error: errGarde } = await sb
    .from("journal_jours")
    .upsert({ client_id: clientId, jour: etat.jour, conseil_noaly: texte, conseil_empreinte: cle }, { onConflict: "client_id,jour" });
  if (errGarde) console.warn("[journal-noaly] mot non gardé :", errGarde.message);
  return json({ texte, garde: false });
}

// ─── Entrée ──────────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!anthropic) return json({ error: "ai_not_configured", message: "Noaly arrive très bientôt." }, 503);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const token = String(body.token ?? "").trim();
  const qui = await membre(sb, token);
  if (!qui) return json({ error: "token invalide" }, 401);

  try {
    if (body.mode === "lire_repas") return await lireRepas(sb, qui.clientId, body);
    if (body.mode === "conseil") return await conseil(sb, token, qui.clientId, qui.prenom, body);
    return json({ error: "mode inconnu" }, 400);
  } catch (e) {
    console.error("[journal-noaly]", e instanceof Error ? e.message : String(e));
    return json(INDISPONIBLE, 500);
  }
});
