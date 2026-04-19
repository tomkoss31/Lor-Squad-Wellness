import type { SupabaseClient } from "@supabase/supabase-js";

type RuntimeSupabaseConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

let cachedConfig: RuntimeSupabaseConfig | null | undefined;
let cachedClient: SupabaseClient | null = null;

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

export async function resolveStorageMode() {
  const config = await resolveSupabaseConfig();
  return config ? "supabase" : "local";
}

/**
 * Retourne true si le mock mode est encore en vigueur en production.
 * En prod, on ne tolère AUCUN fallback mock : ni via env Vite, ni via
 * runtime-config. Si on tombe ici, on a un problème de déploiement qui
 * exposerait le login mock (demo1234) à n'importe quel visiteur.
 */
export async function isMockInProduction(): Promise<boolean> {
  if (!import.meta.env.PROD) return false; // tolérance dev uniquement
  const mode = await resolveStorageMode();
  return mode === "local";
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

  cachedClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  return cachedClient;
}
