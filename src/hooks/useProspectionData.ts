// Chantier #3 — Hook de chargement du catalogue Prospection cold (2026-05-17).
// Charge les 4 tables (markets, profiles, hashtags, scripts) en une fois,
// puis expose des accesseurs filtrés par marché/profil sélectionnés.

import { useEffect, useState } from "react";
import { getSupabaseClient } from "../services/supabaseClient";

export interface ProspectionMarket {
  code: string;
  flag: string;
  label: string;
  description: string | null;
  position: number;
}

export interface ProspectionProfile {
  slug: string;
  emoji: string;
  label: string;
  description: string | null;
  hashtag_advice: string | null;
  gopro_steps: string[];
  posture: string | null;
  mistakes: string[];
  local_venues_hint: string | null;
  recommended_platforms: string[];
  position: number;
}

export type AttemptResponseStatus =
  | "pending"
  | "positive"
  | "curious"
  | "negative"
  | "no_response";

export interface ProspectionAttempt {
  id: string;
  coach_id: string;
  market_code: string;
  profile_slug: string;
  platform: ProspectionPlatform;
  target_label: string | null;
  target_handle: string | null;
  first_message_sent_at: string;
  response_status: AttemptResponseStatus;
  converted_to_lead_id: string | null;
  note: string | null;
  created_at: string;
}

export interface ProspectionStats {
  total_7d: number;
  responses_7d: number;
  positive_7d: number;
  conversions_7d: number;
  total_30d: number;
}

export interface ProspectionMarketTip {
  market_code: string;
  language_label: string;
  timing: string;
  cultural_tip: string;
}

export interface ProspectionHashtag {
  id: string;
  market_code: string;
  profile_slug: string;
  hashtag: string;
  position: number;
}

export type ProspectionPlatform =
  | "insta"
  | "fb"
  | "whatsapp"
  | "telegram"
  | "linkedin"
  | "sms";

export type ProspectionScriptKind =
  | "first_contact"
  | "j3_followup"
  | "referral"
  | "direct"
  | "pitch";

export interface ProspectionScript {
  id: string;
  market_code: string;
  profile_slug: string;
  platform: ProspectionPlatform;
  kind: ProspectionScriptKind;
  label: string | null;
  language_label: string | null;
  body: string;
  body_fr: string | null;
  tip: string | null;
  position: number;
}

interface State {
  loading: boolean;
  error: string | null;
  markets: ProspectionMarket[];
  profiles: ProspectionProfile[];
  hashtags: ProspectionHashtag[];
  scripts: ProspectionScript[];
  marketTips: ProspectionMarketTip[];
}

const INITIAL: State = {
  loading: true,
  error: null,
  markets: [],
  profiles: [],
  hashtags: [],
  scripts: [],
  marketTips: [],
};

export function useProspectionData() {
  const [state, setState] = useState<State>(INITIAL);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) throw new Error("Service indisponible.");

        const [m, p, h, s, t] = await Promise.all([
          sb.from("prospection_markets")
            .select("code, flag, label, description, position")
            .eq("active", true)
            .order("position", { ascending: true }),
          sb.from("prospection_profiles")
            .select("slug, emoji, label, description, hashtag_advice, gopro_steps, posture, mistakes, local_venues_hint, recommended_platforms, position")
            .eq("active", true)
            .order("position", { ascending: true }),
          sb.from("prospection_hashtags")
            .select("id, market_code, profile_slug, hashtag, position")
            .eq("active", true)
            .order("position", { ascending: true }),
          sb.from("prospection_scripts")
            .select("id, market_code, profile_slug, platform, kind, label, language_label, body, body_fr, tip, position")
            .eq("active", true)
            .order("position", { ascending: true }),
          sb.from("prospection_market_tips")
            .select("market_code, language_label, timing, cultural_tip"),
        ]);

        if (cancelled) return;

        if (m.error || p.error || h.error || s.error || t.error) {
          const msg = m.error?.message ?? p.error?.message ?? h.error?.message
            ?? s.error?.message ?? t.error?.message;
          setState({ ...INITIAL, loading: false, error: msg ?? "Erreur de chargement." });
          return;
        }

        setState({
          loading: false,
          error: null,
          markets: (m.data ?? []) as ProspectionMarket[],
          profiles: (p.data ?? []) as ProspectionProfile[],
          hashtags: (h.data ?? []) as ProspectionHashtag[],
          scripts: (s.data ?? []) as ProspectionScript[],
          marketTips: (t.data ?? []) as ProspectionMarketTip[],
        });
      } catch (e) {
        if (!cancelled) {
          setState({
            ...INITIAL,
            loading: false,
            error: e instanceof Error ? e.message : "Erreur inconnue.",
          });
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return state;
}

export function filterHashtags(
  hashtags: ProspectionHashtag[],
  market: string | null,
  profile: string | null,
): ProspectionHashtag[] {
  if (!market || !profile) return [];
  return hashtags.filter(
    (h) => h.market_code === market && h.profile_slug === profile,
  );
}

export function filterScripts(
  scripts: ProspectionScript[],
  market: string | null,
  profile: string | null,
): ProspectionScript[] {
  if (!market || !profile) return [];
  return scripts.filter(
    (s) => s.market_code === market && s.profile_slug === profile,
  );
}

export const PLATFORM_LABELS: Record<ProspectionPlatform, string> = {
  insta: "Instagram",
  fb: "Facebook",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  linkedin: "LinkedIn",
  sms: "SMS",
};

export const PLATFORM_ICONS: Record<ProspectionPlatform, string> = {
  insta: "📷",
  fb: "📘",
  whatsapp: "💬",
  telegram: "✈️",
  linkedin: "💼",
  sms: "📱",
};

export const PLATFORM_GRADIENTS: Record<ProspectionPlatform, string> = {
  insta: "linear-gradient(135deg, #F58529, #DD2A7B, #8134AF)",
  fb: "#1877F2",
  whatsapp: "#25D366",
  telegram: "#0088CC",
  linkedin: "#0A66C2",
  sms: "#6B7280",
};

// ============================================================================
// Attempts CRUD + stats
// ============================================================================

export async function createProspectionAttempt(input: {
  coach_id: string;
  market_code: string;
  profile_slug: string;
  platform: ProspectionPlatform;
  target_label?: string | null;
  target_handle?: string | null;
}): Promise<{ id: string } | null> {
  const sb = await getSupabaseClient();
  if (!sb) return null;
  const { data, error } = await sb
    .from("prospection_attempts")
    .insert({
      coach_id: input.coach_id,
      market_code: input.market_code,
      profile_slug: input.profile_slug,
      platform: input.platform,
      target_label: input.target_label ?? null,
      target_handle: input.target_handle ?? null,
    })
    .select("id")
    .single();
  if (error || !data) return null;
  return { id: (data as { id: string }).id };
}

export async function updateAttemptResponseStatus(
  id: string,
  status: AttemptResponseStatus,
): Promise<boolean> {
  const sb = await getSupabaseClient();
  if (!sb) return false;
  const { error } = await sb
    .from("prospection_attempts")
    .update({ response_status: status, updated_at: new Date().toISOString() })
    .eq("id", id);
  return !error;
}

export async function fetchRecentAttempts(coachId: string, limit = 10): Promise<ProspectionAttempt[]> {
  const sb = await getSupabaseClient();
  if (!sb) return [];
  const { data, error } = await sb
    .from("prospection_attempts")
    .select("*")
    .eq("coach_id", coachId)
    .order("first_message_sent_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as ProspectionAttempt[];
}

export async function fetchProspectionStats(coachId: string): Promise<ProspectionStats | null> {
  const sb = await getSupabaseClient();
  if (!sb) return null;
  const { data, error } = await sb.rpc("get_prospection_stats", { p_user_id: coachId });
  if (error || !data) return null;
  return data as ProspectionStats;
}
