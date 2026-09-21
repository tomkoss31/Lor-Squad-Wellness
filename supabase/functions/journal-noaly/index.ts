// =============================================================================
// journal-noaly — Noaly dans le journal nutritionnel (lot 2, 21/09/2026).
//
// Deux modes, appelés par l'espace membre (jeton d'URL, pas de session) :
//
//   • lire_repas — « 150 g de poulet, des carottes et des pâtes » devient des
//     lignes de journal. Un aliment DU CATALOGUE (journal_aliments) garde ses
//     chiffres officiels : l'IA ne choisit que l'aliment et la quantité, les
//     protéines sont recalculées ici puis par `journal_ajouter_lot`. Ce que le
//     catalogue ne connaît pas (burrata, pizza au thon…), l'IA l'ESTIME : un
//     nom, un poids et des protéines pour 100 g, contrôlés ici et en base
//     (0 à 90 g). Thomas, 21/09 : « une pizza thon vs une pizza artichaut, c'est
//     des détails qui changent l'effet ». Rien n'est écrit ici : la membre
//     relit, retire, puis valide.
//
//   ⏱ Où passent les secondes (mesuré le 21/09, journaux de la fonction) : l'IA
//     2,6-3,2 s ; le démarrage 0,3-1,2 s (une instance NEUVE à chaque appel :
//     inutile de « réveiller » la fonction à l'avance) ; le jeton 0,2-0,7 s ;
//     les lectures ~0,3 s ; la trace ~0,2 s. D'où : le catalogue se charge
//     PENDANT la vérification du jeton, et la trace part APRÈS la réponse.
//     Haiku 4.5 essayé : 0,5 s de gagné seulement, protéines surestimées
//     (burrata 20 g au lieu de ~15), et plus cher (consigne trop courte pour
//     son cache) → on garde Sonnet 5.
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
// Les modèles qu'on sait appeler ici, avec leur prix ($ le million de tokens) et
// le réglage d'effort (Haiku 4.5 ne le connaît pas). Un ESSAI réservé au
// service_role peut en choisir un autre que MODEL (21/09, Thomas : « plus léger
// c'est-à-dire ? ») : comparer vitesse et résultat sur les mêmes repas. Une
// membre ne choisit jamais le modèle.
const REPAS_PAR_JOUR = Number(Deno.env.get("NOALY_JOURNAL_REPAS_JOUR") ?? 25);
const CONSEILS_PAR_JOUR = Number(Deno.env.get("NOALY_JOURNAL_CONSEILS_JOUR") ?? 8);
const MODELES: Record<string, { entree: number; sortie: number; effort: boolean }> = {
  "claude-sonnet-5": { entree: 2, sortie: 10, effort: true },
  "claude-haiku-4-5-20251001": { entree: 1, sortie: 5, effort: false },
};
// Cache lu à 0,1×, écrit à 1,25× le prix d'entrée.
const USD_TO_EUR = 0.92;

/**
 * L'appelant porte-t-il une vraie clé service_role ? Cette fonction tourne sans
 * vérification de jeton à l'entrée (verify_jwt = false) : lire le rôle inscrit
 * dans le jeton laisserait passer un jeton fabriqué à la main. Plusieurs clés
 * service_role coexistent (celle du Vault n'est pas celle de l'environnement) :
 * hors égalité stricte, c'est l'API d'administration qui vérifie la signature.
 * Appelée seulement quand un essai de modèle est demandé.
 */
async function estServiceRole(authHeader: string): Promise<boolean> {
  const jeton = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!jeton) return false;
  if (SERVICE_KEY && jeton === SERVICE_KEY) return true;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1`, {
      headers: { apikey: jeton, Authorization: `Bearer ${jeton}` },
      signal: AbortSignal.timeout(5000),
    });
    return r.ok;
  } catch {
    return false;
  }
}

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

async function tracer(sb: SupabaseClient, feature: string, usage: Anthropic.Usage, clientId: string, modele: string) {
  const prix = MODELES[modele] ?? MODELES[MODEL];
  const neuf = usage.input_tokens ?? 0;
  const ecrit = usage.cache_creation_input_tokens ?? 0;
  const lu = usage.cache_read_input_tokens ?? 0;
  const sortie = usage.output_tokens ?? 0;
  const usd = (neuf * prix.entree + ecrit * prix.entree * 1.25 + lu * prix.entree * 0.1 + sortie * prix.sortie) / 1e6;
  const { error } = await sb.from("ai_usage_log").insert({
    user_id: null,
    client_id: clientId,
    feature,
    model: modele,
    input_tokens: neuf + ecrit + lu,
    output_tokens: sortie,
    cost_eur: Number((usd * USD_TO_EUR).toFixed(4)),
  });
  if (error) console.warn("[journal-noaly] trace non critique :", error.message);
}

const INDISPONIBLE = { error: "ai_error", message: "Noaly ne répond pas pour le moment." };

/** Termine un travail APRÈS la réponse (la trace des coûts n'a pas à faire attendre la membre). */
async function enFond(travail: Promise<unknown>): Promise<void> {
  const runtime = (globalThis as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } }).EdgeRuntime;
  if (runtime?.waitUntil) runtime.waitUntil(travail);
  else await travail;
}

// ─── Mode lire_repas ─────────────────────────────────────────────────────────
const Repas = z.object({
  lignes: z.array(
    z.object({
      texte: z.string(),
      cle: z.string().nullable(),
      nom: z.string(),
      grammes: z.number().nullable(),
      quantite: z.number().int().nullable(),
      prot_100g: z.number().nullable(),
      kcal_100g: z.number().nullable(),
      estime: z.boolean(),
    }),
  ),
  non_reconnus: z.array(z.string()),
});

function systemeRepas(liste: string): string {
  return `Tu es Noaly, l'assistante nutrition de La Base (clubs de nutrition Herbalife, en France). Une membre écrit ce qu'elle a mangé, avec ses mots ; tu le traduis en lignes de son journal alimentaire. Sois juste sur les protéines : les détails comptent (une pizza au thon n'a pas les protéines d'une pizza aux artichauts, une salade avec de la burrata n'est pas une salade avec du poulet).

Chaque aliment devient une ligne, avec \`texte\` = le morceau de sa phrase qui lui correspond.

1. S'il est dans la liste ci-dessous — le même aliment, pas un cousin —, prends sa clé EXACTE dans \`cle\` (ses chiffres sont officiels) et son nom dans \`nom\` ; \`prot_100g\` = null et \`kcal_100g\` = null.
   - Aliment « pesé » : \`grammes\` = le poids tel qu'on le mange (la liste est en poids CUIT, prêt à manger), \`quantite\` = null. Convertis les unités naturelles avec les repères de la liste (« 2 œufs » → 100 g). Un poids donné cru : pâtes, riz, semoule, quinoa, boulgour, lentilles, pois chiches → × 2,5 ; viande, poisson → × 0,75.
   - Produit « à la portion » (Herbalife) : \`quantite\` de 1 à 5, \`grammes\` = null.
2. Sinon, estime-le toi-même : \`cle\` = null, \`nom\` = son nom court en français (« Burrata », « Maïs doux », « Pizza au thon »), \`grammes\` = le poids mangé, \`prot_100g\` = ses protéines pour 100 g telles qu'on le mange, d'après les tables de composition françaises (CIQUAL) et sa recette habituelle ; \`kcal_100g\` = ses kilocalories pour 100 g, même source.
   - Un plat préparé (pizza, lasagnes, quiche, burger, sandwich, wrap, plat traiteur…) = UNE ligne dont les protéines tiennent compte de sa garniture.
   - Une assiette faite d'aliments séparés (« salade maïs, tomate, burrata ») = une ligne par aliment.

Sans quantité donnée, prends la portion habituelle et mets \`estime\` à true : la première portion de la liste, sinon ces repères (le poids ne dépend pas de la garniture) — une pizza entière ≈ 450 g, une demi-pizza ≈ 225 g, une part ≈ 110 g ; une burrata ≈ 125 g ; une assiette de pâtes ou de riz ≈ 200 g cuits ; un sandwich ≈ 250 g ; un burger ≈ 220 g ; une part de quiche ≈ 150 g. \`estime\` = false seulement quand elle a donné la quantité elle-même.

Le shake Herbalife n'existe qu'en combinaison, jamais seul : « un shake », « mon shake », « F1 » sans précision → f1demi (le repère du club : F1 + ½ sachet de PDM). « Avec un sachet entier de PDM » → f1plein ; « au lait » → f1lait ; « au lait de soja » → f1soja.
« Des légumes » sans précision → poelee_legumes. Une boisson sans protéines (eau, café, thé, tisane, soda) n'est pas une ligne : ignore-la, l'eau se note à part.
Ce qui est trop vague pour être compté (« un truc », « un petit quelque chose ») va dans \`non_reconnus\`, avec ses mots.

La liste (clé | nom | mesure | repère) :
${liste}`;
}

async function lireRepas(
  sb: SupabaseClient, clientId: string, body: Record<string, unknown>, modele: string, essai: boolean, catalogueEnRoute: Promise<Catalogue>,
) {
  const texte = String(body.texte ?? "").replace(/\s+/g, " ").trim();
  if (texte.length < 2) return json({ error: "texte_vide", message: "Écris ce que tu as mangé." }, 400);
  if (texte.length > 400) return json({ error: "texte_long", message: "Un repas à la fois, en quelques mots." }, 400);
  const creneau = CRENEAUX.includes(body.creneau as Creneau) ? (body.creneau as Creneau) : null;

  // Les deux lectures en même temps : chaque aller-retour vers la base compte
  // dans l'attente de la membre (mesuré le 21/09 : l'IA ne fait que ~2,5 s des 4 à 6).
  const tLectures = Date.now();
  const [plafond, cat] = await Promise.all([
    plafondAtteint(sb, clientId, "journal_repas", REPAS_PAR_JOUR),
    catalogueEnRoute,
  ]);
  const msLectures = Date.now() - tLectures;
  if (plafond) {
    return json({ error: "cap_reached", message: "Noaly a beaucoup calculé aujourd'hui : choisis dans la liste, elle revient demain." }, 429);
  }

  const format = zodOutputFormat(Repas);
  const t0 = Date.now();
  let reponse;
  try {
    reponse = await anthropic!.messages.parse({
      model: modele,
      max_tokens: 1500,
      thinking: { type: "disabled" },
      output_config: MODELES[modele]?.effort ? { effort: "low", format } : { format },
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
  const duree = Date.now() - t0;
  await enFond(tracer(sb, "journal_repas", reponse.usage, clientId, modele));
  // Le chronomètre de chaque étape, dans les journaux de la fonction.
  console.log(`[journal-noaly] lire_repas ms lectures=${msLectures} ia=${duree}`);

  const sortie = reponse.parsed_output;
  if (!sortie || reponse.stop_reason === "refusal") return json(INDISPONIBLE, 502);

  const lignes: Array<{
    aliment: string | null;
    nom: string;
    grammes: number | null;
    quantite: number;
    prot_g: number;
    prot_100g: number | null;
    kcal_100g: number | null;
    estime: boolean;
  }> = [];
  const nonReconnus = [...sortie.non_reconnus];
  for (const l of sortie.lignes) {
    const a = l.cle ? cat.parCle.get(l.cle) : undefined;
    if (!a) {
      // Estimée par Noaly : un nom, un poids, des protéines pour 100 g plausibles
      // (les mêmes bornes que la base : 0 à 90 g, 1 à 2 000 g).
      const nom = (l.nom || l.texte || "").replace(/\s+/g, " ").trim().slice(0, 60);
      const p100 = l.prot_100g;
      if (!nom || p100 == null || !Number.isFinite(p100) || p100 < 0 || p100 > 90) {
        nonReconnus.push(l.texte || l.nom || "");
        continue;
      }
      let g = l.grammes;
      let estime = l.estime;
      if (g == null || !Number.isFinite(g) || g < 1) {
        g = 100;
        estime = true;
      }
      g = Math.min(2000, Math.round(g));
      const p = Math.round(p100 * 100) / 100;
      const k100 = l.kcal_100g;
      const kcal100 = k100 != null && Number.isFinite(k100) && k100 >= 0 && k100 <= 900 ? Math.round(k100 * 10) / 10 : null;
      lignes.push({ aliment: null, nom: nom.charAt(0).toUpperCase() + nom.slice(1), grammes: g, quantite: 1, prot_g: arrondi((p * g) / 100), prot_100g: p, kcal_100g: kcal100, estime });
      continue;
    }
    if (a.prot_portion != null) {
      const q = Math.min(5, Math.max(1, Math.round(l.quantite ?? 1)));
      lignes.push({ aliment: a.cle, nom: a.nom, grammes: null, quantite: q, prot_g: protAliment(a, null, q), prot_100g: null, kcal_100g: null, estime: l.estime });
    } else {
      let g = l.grammes;
      let estime = l.estime;
      if (g == null || !Number.isFinite(g) || g < 1) {
        g = a.portions[0] ?? 100;
        estime = true;
      }
      g = Math.min(2000, Math.round(g));
      lignes.push({ aliment: a.cle, nom: a.nom, grammes: g, quantite: 1, prot_g: protAliment(a, g, 1), prot_100g: null, kcal_100g: null, estime });
    }
  }
  return json({
    lignes: lignes.slice(0, 12),
    non_reconnus: nonReconnus.filter(Boolean).slice(0, 8),
    ...(essai ? { essai: { modele, duree_ms: duree, usage: reponse.usage } } : {}),
  });
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

async function conseil(sb: SupabaseClient, token: string, clientId: string, prenomCompte: string | null, body: Record<string, unknown>, modele: string) {
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
      model: modele,
      max_tokens: 600,
      thinking: { type: "disabled" },
      ...(MODELES[modele]?.effort ? { output_config: { effort: "low" as const } } : {}),
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
  await enFond(tracer(sb, "journal_conseil", reponse.usage, clientId, modele));

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
  // Le catalogue (données publiques) se charge PENDANT la vérification du jeton.
  const catalogueEnRoute = chargerCatalogue(sb);
  catalogueEnRoute.catch(() => undefined); // un jeton refusé ne doit pas laisser de promesse en erreur
  const tAcces = Date.now();
  const qui = await membre(sb, token);
  console.log(`[journal-noaly] ${String(body.mode)} ms acces=${Date.now() - tAcces}`);
  if (!qui) return json({ error: "token invalide" }, 401);

  // Un essai de modèle n'est possible qu'avec la clé service_role (jamais depuis l'app).
  const essai = typeof body.modele === "string" && body.modele in MODELES && (await estServiceRole(req.headers.get("Authorization") ?? ""));
  const modele = essai ? String(body.modele) : MODEL;

  try {
    if (body.mode === "lire_repas") return await lireRepas(sb, qui.clientId, body, modele, essai, catalogueEnRoute);
    if (body.mode === "conseil") return await conseil(sb, token, qui.clientId, qui.prenom, body, modele);
    return json({ error: "mode inconnu" }, 400);
  } catch (e) {
    console.error("[journal-noaly]", e instanceof Error ? e.message : String(e));
    return json(INDISPONIBLE, 500);
  }
});
