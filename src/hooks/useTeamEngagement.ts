// =============================================================================
// useTeamEngagement — hub équipe (2026-05-04)
//
// Wrap la RPC get_team_engagement(root_user_id) qui retourne, pour chaque
// membre du sous-arbre sponsorisé par root_user_id, l'ensemble des
// métriques nécessaires au tableau de bord équipe (XP, Academy, Formation,
// activité, engagement, statut).
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
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
  idle: { label: "Discret", color: "var(--ls-teal)", emoji: "🌤" },
  stuck: { label: "Bloqué", color: "var(--ls-coral)", emoji: "⚠️" },
  decroche: { label: "Décroché", color: "var(--ls-coral)", emoji: "🔻" },
  never_started: { label: "Pas démarré", color: "var(--ls-text-muted)", emoji: "⚪" },
};

/**
 * L'engagement de l'équipe, sous une racine — ou sous PLUSIEURS.
 *
 * ⚠️ 07/09 — POURQUOI PLUSIEURS RACINES. Thomas et Mélanie sont deux comptes
 * pour un seul distributeur Herbalife, et les douze recrues portent
 * l'identifiant de Thomas. `get_team_engagement` étant récursive sur un SEUL
 * `sponsor_id`, l'appeler pour Mélanie ne rendait qu'elle-même : ses onglets
 * Membres, Engagement et Apprentissage étaient vides. `/team` avait déjà réglé
 * ça pour l'ARBRE (`useCoupleTeamTree`, 26/04) mais pas pour l'engagement —
 * un oubli, pas un choix.
 *
 * On accepte donc une liste, et on fusionne par `user_id` : un distri
 * rattaché aux deux (ou double-parrainé en base) ne compte qu'une fois.
 *
 * Passer une simple chaîne reste valable et se comporte exactement comme
 * avant — `RentabilitePage` s'appuie dessus, et on ne touche à rien de ce qui
 * calcule des PV.
 */
export function useTeamEngagement(
  rootUserId: string | string[] | null,
): UseTeamEngagementResult {
  const [members, setMembers] = useState<TeamMemberEngagement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const roots = useMemo(() => {
    const l = typeof rootUserId === "string" ? [rootUserId] : rootUserId ?? [];
    return l.filter((id): id is string => typeof id === "string" && id.length > 0);
  }, [rootUserId]);
  // Une liste reconstruite à chaque render relancerait l'effet en boucle : on
  // ne dépend que du contenu, pas de l'objet.
  const cle = roots.slice().sort().join("|");

  const fetchAll = useCallback(async () => {
    const ids = cle ? cle.split("|") : [];
    if (ids.length === 0) {
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
    const reponses = await Promise.all(
      ids.map((id) =>
        sb.rpc("get_team_engagement", { p_root_user_id: id }).then((r) => ({ id, ...r })),
      ),
    );
    const echec = reponses.find((r) => r.error);
    if (echec?.error) {
      console.warn("[useTeamEngagement] RPC error:", echec.error.message, echec.error);
      setError(echec.error.message);
      setMembers([]);
      setLoading(false);
      return;
    }
    // Fusion par `user_id` — le premier rencontré gagne, comme dans
    // `useCoupleTeamTree`, pour que l'ordre ne bouge pas d'un render à l'autre.
    const parId = new Map<string, TeamMemberEngagement>();
    for (const r of reponses) {
      for (const row of (r.data ?? []) as TeamMemberEngagement[]) {
        if (!parId.has(row.user_id)) parId.set(row.user_id, row);
      }
    }
    const rows = Array.from(parId.values());
    console.info(
      `[useTeamEngagement] roots=${ids.join(",")} -> ${rows.length} members`,
      rows.map((r) => `${r.name} (xp=${r.xp_total})`),
    );
    setMembers(rows);
    setLoading(false);
  }, [cle]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  return { members, loading, error, refetch: fetchAll };
}
