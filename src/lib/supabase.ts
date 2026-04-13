import { createClient } from "@supabase/supabase-js";

export const hasSupabaseEnv =
  Boolean(import.meta.env.VITE_SUPABASE_URL) && Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY);

const supabaseUrl = hasSupabaseEnv
  ? (import.meta.env.VITE_SUPABASE_URL as string)
  : "https://placeholder.supabase.co";

const supabaseAnonKey = hasSupabaseEnv
  ? (import.meta.env.VITE_SUPABASE_ANON_KEY as string)
  : "placeholder-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
