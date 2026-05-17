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
  position: number;
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

export interface ProspectionScript {
  id: string;
  market_code: string;
  profile_slug: string;
  platform: ProspectionPlatform;
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
}

const INITIAL: State = {
  loading: true,
  error: null,
  markets: [],
  profiles: [],
  hashtags: [],
  scripts: [],
};

export function useProspectionData() {
  const [state, setState] = useState<State>(INITIAL);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) throw new Error("Service indisponible.");

        const [m, p, h, s] = await Promise.all([
          sb.from("prospection_markets")
            .select("code, flag, label, description, position")
            .eq("active", true)
            .order("position", { ascending: true }),
          sb.from("prospection_profiles")
            .select("slug, emoji, label, description, position")
            .eq("active", true)
            .order("position", { ascending: true }),
          sb.from("prospection_hashtags")
            .select("id, market_code, profile_slug, hashtag, position")
            .eq("active", true)
            .order("position", { ascending: true }),
          sb.from("prospection_scripts")
            .select("id, market_code, profile_slug, platform, body, body_fr, tip, position")
            .eq("active", true)
            .order("position", { ascending: true }),
        ]);

        if (cancelled) return;

        if (m.error || p.error || h.error || s.error) {
          const msg = m.error?.message ?? p.error?.message ?? h.error?.message ?? s.error?.message;
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
