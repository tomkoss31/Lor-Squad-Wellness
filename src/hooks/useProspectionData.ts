// Chantier #3 — Hook de chargement du catalogue Prospection cold.
//
// V1 (2026-05-17) : 4 tables markets/profiles/hashtags/scripts.
// V4 (2026-05-19) : +11 tables (mindset_blocks, metrics, profile_flags,
//   sources, reply_tree, objections, followups, closing, special_cases,
//   storytelling, routines) + category/crossover_hint sur hashtags.
//
// Charge tout en parallèle au mount, puis expose des accesseurs filtrés
// par marché/profil sélectionnés.

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

export type ProspectionHashtagCategory = "mainstream" | "niche" | "cross";

export interface ProspectionHashtag {
  id: string;
  market_code: string;
  profile_slug: string;
  hashtag: string;
  position: number;
  category: ProspectionHashtagCategory;
  crossover_hint: string | null;
}

// V4 tables — Section 1 Mindset
export type ProspectionMindsetKind = "truth" | "error";
export interface ProspectionMindsetBlock {
  id: string;
  market_code: string;
  kind: ProspectionMindsetKind;
  title: string;
  body: string;
  position: number;
}

// V4 — Section 1+10 Metrics
export type ProspectionMetricKind = "funnel_step" | "pipeline_target" | "weekly_kpi";
export interface ProspectionMetric {
  id: string;
  market_code: string;
  kind: ProspectionMetricKind;
  label: string;
  value_min: number | null;
  value_max: number | null;
  value_unit: string | null;
  hint: string | null;
  position: number;
}

// V4 — Section 2 Flags
export type ProspectionFlagType = "green" | "red";
export interface ProspectionProfileFlag {
  id: string;
  market_code: string;
  profile_slug: string;
  flag_type: ProspectionFlagType;
  text: string;
  position: number;
}

// V4 — Section 2 Sources
export type ProspectionSourceKind =
  | "hashtag_advanced"
  | "fb_groups"
  | "irl"
  | "recommendations"
  | "inbound_content";
export interface ProspectionSource {
  id: string;
  market_code: string;
  profile_slug: string | null;
  kind: ProspectionSourceKind;
  label: string;
  detail: string | null;
  position: number;
}

// V4 — Section 4 Reply tree
export type ProspectionReplyLevel = "M2" | "M3";
export type ProspectionReplyBranch =
  | "positive" | "vague" | "negative" | "question" | "hot" | "lukewarm";
export interface ProspectionReplyNode {
  id: string;
  market_code: string;
  profile_slug: string;
  level: ProspectionReplyLevel;
  branch: ProspectionReplyBranch;
  body: string;
  body_fr: string | null;
  tip: string | null;
  position: number;
}

// V4 — Section 5 Objections
export interface ProspectionObjection {
  id: string;
  market_code: string;
  slug: string;
  title: string;
  meaning: string;
  bad_response: string;
  good_response: string;
  good_response_fr: string | null;
  warning: string | null;
  position: number;
}

// V4 — Section 6 Followups
export type ProspectionFollowupKind = "post_call" | "client_onboarding" | "reactivation_old";
export interface ProspectionFollowup {
  id: string;
  market_code: string;
  kind: ProspectionFollowupKind;
  day_offset: number;
  title: string;
  body: string;
  body_fr: string | null;
  warning: string | null;
  position: number;
}

// V4 — Section 7 Closing
export type ProspectionClosingKind = "signal" | "propose" | "hesitation" | "final_no";
export interface ProspectionClosingBlock {
  id: string;
  market_code: string;
  kind: ProspectionClosingKind;
  title: string | null;
  body: string;
  body_fr: string | null;
  position: number;
}

// V4 — Section 8 Special cases
export type ProspectionSpecialKind = "reactivation_3_6m" | "ghost_after_exchange" | "referral_request";
export interface ProspectionSpecialCase {
  id: string;
  market_code: string;
  kind: ProspectionSpecialKind;
  title: string;
  body: string;
  body_fr: string | null;
  position: number;
}

// V4 — Section 9 Storytelling
export type ProspectionStoryKind = "structure_step" | "example" | "rule";
export interface ProspectionStoryBlock {
  id: string;
  market_code: string;
  profile_slug: string | null;
  kind: ProspectionStoryKind;
  title: string;
  body: string;
  position: number;
}

// V4 — Section 10 Routines
export type ProspectionRoutineKind = "routine_30m" | "routine_1h" | "pre_send_checklist";
export interface ProspectionRoutineItem {
  id: string;
  market_code: string;
  kind: ProspectionRoutineKind;
  title: string;
  detail: string | null;
  duration_minutes: number | null;
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
  // V4
  mindsetBlocks: ProspectionMindsetBlock[];
  metrics: ProspectionMetric[];
  profileFlags: ProspectionProfileFlag[];
  sources: ProspectionSource[];
  replyTree: ProspectionReplyNode[];
  objections: ProspectionObjection[];
  followups: ProspectionFollowup[];
  closing: ProspectionClosingBlock[];
  specialCases: ProspectionSpecialCase[];
  storytelling: ProspectionStoryBlock[];
  routines: ProspectionRoutineItem[];
}

const INITIAL: State = {
  loading: true,
  error: null,
  markets: [],
  profiles: [],
  hashtags: [],
  scripts: [],
  marketTips: [],
  mindsetBlocks: [],
  metrics: [],
  profileFlags: [],
  sources: [],
  replyTree: [],
  objections: [],
  followups: [],
  closing: [],
  specialCases: [],
  storytelling: [],
  routines: [],
};

export function useProspectionData() {
  const [state, setState] = useState<State>(INITIAL);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) throw new Error("Service indisponible.");

        const asc = { ascending: true } as const;
        const [m, p, h, s, t, mb, mt, pf, src, rt, obj, fu, cl, sc, st, rt2] = await Promise.all([
          sb.from("prospection_markets").select("code, flag, label, description, position").eq("active", true).order("position", asc),
          sb.from("prospection_profiles").select("slug, emoji, label, description, hashtag_advice, gopro_steps, posture, mistakes, local_venues_hint, recommended_platforms, position").eq("active", true).order("position", asc),
          sb.from("prospection_hashtags").select("id, market_code, profile_slug, hashtag, position, category, crossover_hint").eq("active", true).order("position", asc),
          sb.from("prospection_scripts").select("id, market_code, profile_slug, platform, kind, label, language_label, body, body_fr, tip, position").eq("active", true).order("position", asc),
          sb.from("prospection_market_tips").select("market_code, language_label, timing, cultural_tip"),
          sb.from("prospection_mindset_blocks").select("id, market_code, kind, title, body, position").eq("active", true).order("position", asc),
          sb.from("prospection_metrics").select("id, market_code, kind, label, value_min, value_max, value_unit, hint, position").eq("active", true).order("position", asc),
          sb.from("prospection_profile_flags").select("id, market_code, profile_slug, flag_type, text, position").eq("active", true).order("position", asc),
          sb.from("prospection_sources").select("id, market_code, profile_slug, kind, label, detail, position").eq("active", true).order("position", asc),
          sb.from("prospection_reply_tree").select("id, market_code, profile_slug, level, branch, body, body_fr, tip, position").eq("active", true).order("position", asc),
          sb.from("prospection_objections").select("id, market_code, slug, title, meaning, bad_response, good_response, good_response_fr, warning, position").eq("active", true).order("position", asc),
          sb.from("prospection_followups").select("id, market_code, kind, day_offset, title, body, body_fr, warning, position").eq("active", true).order("position", asc),
          sb.from("prospection_closing").select("id, market_code, kind, title, body, body_fr, position").eq("active", true).order("position", asc),
          sb.from("prospection_special_cases").select("id, market_code, kind, title, body, body_fr, position").eq("active", true).order("position", asc),
          sb.from("prospection_storytelling").select("id, market_code, profile_slug, kind, title, body, position").eq("active", true).order("position", asc),
          sb.from("prospection_routines").select("id, market_code, kind, title, detail, duration_minutes, position").eq("active", true).order("position", asc),
        ]);

        if (cancelled) return;

        const allResults = [m, p, h, s, t, mb, mt, pf, src, rt, obj, fu, cl, sc, st, rt2];
        const firstError = allResults.find((r) => r.error)?.error;
        if (firstError) {
          setState({ ...INITIAL, loading: false, error: firstError.message });
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
          mindsetBlocks: (mb.data ?? []) as ProspectionMindsetBlock[],
          metrics: (mt.data ?? []) as ProspectionMetric[],
          profileFlags: (pf.data ?? []) as ProspectionProfileFlag[],
          sources: (src.data ?? []) as ProspectionSource[],
          replyTree: (rt.data ?? []) as ProspectionReplyNode[],
          objections: (obj.data ?? []) as ProspectionObjection[],
          followups: (fu.data ?? []) as ProspectionFollowup[],
          closing: (cl.data ?? []) as ProspectionClosingBlock[],
          specialCases: (sc.data ?? []) as ProspectionSpecialCase[],
          storytelling: (st.data ?? []) as ProspectionStoryBlock[],
          routines: (rt2.data ?? []) as ProspectionRoutineItem[],
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

// ============================================================================
// V4 — Onboarding state
// ============================================================================

export async function fetchProspectionOnboardedAt(userId: string): Promise<string | null> {
  const sb = await getSupabaseClient();
  if (!sb) return null;
  const { data, error } = await sb
    .from("users")
    .select("prospection_onboarded_at")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return (data as { prospection_onboarded_at: string | null }).prospection_onboarded_at;
}

export async function markProspectionOnboarded(userId: string): Promise<boolean> {
  const sb = await getSupabaseClient();
  if (!sb) return false;
  const { error } = await sb
    .from("users")
    .update({ prospection_onboarded_at: new Date().toISOString() })
    .eq("id", userId);
  return !error;
}

// ============================================================================
// V4 — Filtres par marché/profil
// ============================================================================

export function filterByMarket<T extends { market_code: string }>(
  arr: T[], market: string | null,
): T[] {
  if (!market) return [];
  return arr.filter((x) => x.market_code === market);
}

export function filterByMarketAndProfile<T extends { market_code: string; profile_slug: string | null }>(
  arr: T[], market: string | null, profile: string | null,
): T[] {
  if (!market || !profile) return [];
  return arr.filter((x) => x.market_code === market && (x.profile_slug === profile || x.profile_slug === null));
}

// ============================================================================
// V4 — Module hub : labels et meta
// ============================================================================

export type ProspectionModuleId =
  | "mindset"
  | "find_prospects"
  | "messages_m1"
  | "reply_tree"
  | "objections"
  | "followups"
  | "closing"
  | "special_cases"
  | "storytelling"
  | "routine";

export interface ProspectionModuleMeta {
  id: ProspectionModuleId;
  emoji: string;
  title: string;
  subtitle: string;
  /** Section du brief (numéro affiché en chip). */
  section: string;
}

export const PROSPECTION_MODULES: ProspectionModuleMeta[] = [
  { id: "mindset",        emoji: "🧠", title: "Mindset & posture",   subtitle: "3 vérités + 5 erreurs à éviter",       section: "§1" },
  { id: "find_prospects", emoji: "🔍", title: "Trouver les prospects",subtitle: "Hashtags, flags 30s, sources alt",     section: "§2" },
  { id: "messages_m1",    emoji: "📨", title: "Messages M1",         subtitle: "Premier contact par plateforme",       section: "§3" },
  { id: "reply_tree",     emoji: "🌳", title: "Arbres M2 / M3",      subtitle: "4 branches × profil + conv chaude/tiède", section: "§4" },
  { id: "objections",     emoji: "🛡️", title: "Objections",          subtitle: "8 objections classiques + réponses",   section: "§5" },
  { id: "followups",      emoji: "📞", title: "Séquence post-appel", subtitle: "J0/J+2/J+5/J+30 + suivi client",        section: "§6" },
  { id: "closing",        emoji: "🎯", title: "Closing",             subtitle: "Signaux + 3 scripts vente",            section: "§7" },
  { id: "special_cases",  emoji: "🔁", title: "Cas spéciaux",        subtitle: "Réactivation, ghost, recommandation",  section: "§8" },
  { id: "storytelling",   emoji: "📖", title: "Storytelling",        subtitle: "Structure 4 temps + exemples",         section: "§9" },
  { id: "routine",        emoji: "⏰", title: "Routine quotidienne", subtitle: "30min/1h + checklist 7 items",         section: "§10" },
];
