// =============================================================================
// useTeamEngagement — hub équipe (2026-05-04)
//
// Wrap la RPC get_team_engagement(root_user_id) qui retourne, pour chaque
// membre du sous-arbre sponsorisé par root_user_id, l'ensemble des
// métriques nécessaires au tableau de bord équipe (XP, Academy, Formation,
// activité, engagement, statut).
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "../services/supabaseClient";

export type TeamMemberStatus = "active" | "idle" | "stuck" | "decroche" | "never_started";

export interface TeamMemberEngagement {
  user_id: string;
  name: string;
  role: string;
  current_rank: string | null;
  parent_id: string | null;
  depth: number;

  // XP
  xp_total: number;
  xp_level: number;
  xp_academy: number;
  xp_bilans: number;
  xp_rdv: number;
  xp_messages: number;
  xp_formation: number;
  xp_daily: number;

  // Academy (12 sections après mai 2026)
  academy_step: number;
  academy_total_sections: number;
  academy_percent: number;
  academy_completed_at: string | null;

  // Formation pyramide
  formation_validated_n1: number;
  formation_validated_n2: number;
  formation_validated_n3: number;
  formation_pending: number;
  formation_total_validated: number;

  // Activité rolling
  bilans_30d: number;
  rdv_30d: number;
  messages_7d: number;

  // Engagement
  last_seen_at: string | null;
  lifetime_login_count: number;

  status: TeamMemberStatus;
}

interface UseTeamEngagementResult {
  members: TeamMemberEngagement[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const STATUS_META: Record<TeamMemberStatus, { label: string; color: string; emoji: string }> = {
  active: { label: "Actif", color: "var(--ls-teal)", emoji: "✅" },
  idle: { label: "Discret", color: "var(--ls-gold)", emoji: "🌤" },
  stuck: { label: "Bloqué", color: "var(--ls-coral)", emoji: "⚠️" },
  decroche: { label: "Décroché", color: "var(--ls-coral)", emoji: "🔻" },
  never_started: { label: "Pas démarré", color: "var(--ls-text-muted)", emoji: "⚪" },
};

export function useTeamEngagement(rootUserId: string | null): UseTeamEngagementResult {
  const [members, setMembers] = useState<TeamMemberEngagement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!rootUserId) {
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const sb = await getSupabaseClient();
    if (!sb) {
      setError("Connexion Supabase indisponible");
      setLoading(false);
      return;
    }
    const { data, error: e } = await sb.rpc("get_team_engagement", {
      p_root_user_id: rootUserId,
    });
    if (e) {
      setError(e.message);
      setMembers([]);
      setLoading(false);
      return;
    }
    setMembers((data ?? []) as TeamMemberEngagement[]);
    setLoading(false);
  }, [rootUserId]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  return { members, loading, error, refetch: fetchAll };
}
