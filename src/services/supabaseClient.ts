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

  cachedClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  return cachedClient;
}
