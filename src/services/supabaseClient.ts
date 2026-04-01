import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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

  try {
    const response = await fetch("/api/runtime-config", {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
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

export async function getSupabaseClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const config = await resolveSupabaseConfig();
  if (!config) {
    return null;
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
