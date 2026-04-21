import type { SupabaseClient } from "@supabase/supabase-js";

type RuntimeSupabaseConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

let cachedConfig: RuntimeSupabaseConfig | null | undefined;
let cachedClient: SupabaseClient | null = null;

export type AnonKeyFormat = "hs256_legacy" | "es256_publishable" | "unknown";

/**
 * Détecte le format de la clé anon Supabase.
 *
 * - `hs256_legacy` : JWT HS256 classique (`eyJhbGciOiJIUzI1NiI...`). C'est
 *   le seul format accepté par le runtime Edge Functions actuellement.
 * - `es256_publishable` : nouvelle clé publishable ES256, soit préfixée
 *   `sb_publishable_...`, soit JWT ES256 (`eyJhbGciOiJFUzI1NiI...`).
 *   Supabase Edge Functions la rejettent avec
 *   `UNAUTHORIZED_UNSUPPORTED_TOKEN_ALGORITHM`.
 *
 * Utilisé côté app pour afficher un bandeau diagnostic si Thomas a collé
 * la mauvaise clé dans les variables d'env Vercel.
 *
 * Hotfix 2026-04-21.
 */
export function detectAnonKeyFormat(rawKey: string): AnonKeyFormat {
  const key = rawKey.trim();
  if (!key) return "unknown";
  if (key.startsWith("sb_publishable_")) return "es256_publishable";
  if (!key.startsWith("eyJ")) return "unknown";

  try {
    const headerB64 = key.split(".")[0];
    if (!headerB64) return "unknown";
    const padded = headerB64.padEnd(
      headerB64.length + ((4 - (headerB64.length % 4)) % 4),
      "=",
    );
    const normalized = padded.replace(/-/g, "+").replace(/_/g, "/");
    const header = JSON.parse(atob(normalized)) as { alg?: string };
    if (header.alg === "HS256") return "hs256_legacy";
    if (header.alg === "ES256") return "es256_publishable";
    return "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Lit la clé anon actuellement en cache (ou env) et retourne son format.
 * Retourne null si pas de clé résolue.
 */
export async function getAnonKeyFormat(): Promise<AnonKeyFormat | null> {
  const config = await resolveSupabaseConfig();
  if (!config) return null;
  return detectAnonKeyFormat(config.supabaseAnonKey);
}

async function fetchRuntimeConfig(): Promise<RuntimeSupabaseConfig | null> {
  if (typeof window === "undefined") {
    return null;
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch("/api/runtime-config", {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      },
      signal: controller.signal
    });

    if (!response.ok) {
      return null;
    }

    const result = (await response.json()) as Partial<RuntimeSupabaseConfig>;
    const supabaseUrl = result.supabaseUrl?.trim() ?? "";
    const supabaseAnonKey = result.supabaseAnonKey?.trim() ?? "";

    if (!supabaseUrl || !supabaseAnonKey) {
      return null;
    }

    return {
      supabaseUrl,
      supabaseAnonKey
    };
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function resolveSupabaseConfig() {
  if (cachedConfig !== undefined) {
    return cachedConfig;
  }

  const envSupabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
  const envSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";

  if (envSupabaseUrl && envSupabaseAnonKey) {
    cachedConfig = {
      supabaseUrl: envSupabaseUrl,
      supabaseAnonKey: envSupabaseAnonKey
    };

    return cachedConfig;
  }

  cachedConfig = await fetchRuntimeConfig();
  return cachedConfig;
}

/**
 * Retourne true si aucune configuration Supabase utilisable n'a pu être
 * résolue (ni via VITE_SUPABASE_URL/ANON_KEY, ni via /api/runtime-config).
 * Sert à bloquer le boot de l'app en production — depuis la suppression
 * du mode mock (chantier 2026-04-19), il n'y a plus de fallback local.
 */
export async function isSupabaseUnavailable(): Promise<boolean> {
  const config = await resolveSupabaseConfig();
  return config === null;
}

export async function getSupabaseClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const config = await resolveSupabaseConfig();
  if (!config) {
    return null;
  }

  const { createClient } = await import("@supabase/supabase-js");

  // Hotfix 2026-04-21 : warn si la clé anon est en format ES256 (nouvelle
  // publishable key). Les Edge Functions Supabase rejettent ES256 avec
  // UNAUTHORIZED_UNSUPPORTED_TOKEN_ALGORITHM → il faut utiliser la legacy
  // anon HS256 depuis Dashboard → Settings → API → "Legacy API keys".
  const keyFormat = detectAnonKeyFormat(config.supabaseAnonKey);
  if (keyFormat === "es256_publishable") {
    console.error(
      "[Supabase] VITE_SUPABASE_ANON_KEY est au format ES256 (publishable key). " +
        "Les Edge Functions vont rejeter les appels avec UNAUTHORIZED_UNSUPPORTED_TOKEN_ALGORITHM. " +
        "Remplacer par la clé HS256 legacy : Supabase Dashboard → Settings → API → « Legacy API keys » → anon public.",
    );
  }

  cachedClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  return cachedClient;
}
