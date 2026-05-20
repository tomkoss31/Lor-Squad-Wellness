// =============================================================================
// useDailyActionChecklist — Chantier #2 (étape 2.2, 2026-05-20)
//
// Agrège les 5 actions du jour pour la check-list Co-pilote matinale :
// 1. Suivis F1/F21 dus aujourd'hui (pendingFollowups protocole)
// 2. Leads bilan online à qualifier (online_bilans status=new)
// 3. Clients dormants à relancer (useDormantClients)
// 4. RDV aujourd'hui à confirmer/préparer (todayAgenda)
// 5. 1-2 contacts liste 100 du Cahier de bord
//
// Fallback (chantier #2 Q8 bis Thomas) : si 0 F1/F21 dus, la ligne #1 est
// REMPLACÉE par "Grandir ton réseau / Prospection froide" (lien /prospection).
// Jamais "rien à faire" — toujours une action constructive.
//
// Persistance via table coach_daily_actions (migration 2.1).
// Skipped + pending repartent en pending au lendemain (logique côté hook).
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppContext } from "../context/AppContext";
import { useCopiloteData } from "./useCopiloteData";
import { useGlobalView } from "./useGlobalView";
import { useDormantClients } from "./useDormantClients";
import { useOnlineBilans } from "./useOnlineBilans";
import { useCahierDeBord } from "./useCahierDeBord";
import { getSupabaseClient } from "../services/supabaseClient";

export type DailyActionKey =
  | "f1_f21"
  | "leads"
  | "dormants"
  | "rdv_today"
  | "liste_100"
  | "grow_network"; // fallback de f1_f21

export type DailyActionStatus = "pending" | "done" | "skipped";

export interface DailyAction {
  key: DailyActionKey;
  label: string;
  emoji: string;
  count: number | null; // null = action discipline (pas de count business)
  detail: string;
  linkPath: string;
  linkLabel: string;
  status: DailyActionStatus;
  /** true si l'action est un fallback (grow_network remplace f1_f21). */
  isFallback?: boolean;
}

interface UseDailyActionChecklistResult {
  actions: DailyAction[];
  score: number; // nb done
  total: number; // toujours 5
  loading: boolean;
  /** Marque une action done (persistance DB + state local). */
  markDone: (key: DailyActionKey) => Promise<void>;
  /** Marque skipped — revient pending le lendemain. */
  markSkipped: (key: DailyActionKey) => Promise<void>;
  /** Reset une action si Thomas re-coche (toggle). */
  resetAction: (key: DailyActionKey) => Promise<void>;
  refetch: () => Promise<void>;
}

function todayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

export function useDailyActionChecklist(now: Date = new Date()): UseDailyActionChecklistResult {
  const { currentUser } = useAppContext();
  const [globalView] = useGlobalView();
  const copilote = useCopiloteData(now, globalView);
  const { clients: dormantClients } = useDormantClients(currentUser?.id ?? null);
  const { bilans: onlineBilans } = useOnlineBilans();
  const { contacts: liste100Contacts } = useCahierDeBord(currentUser?.id ?? null);

  const [persisted, setPersisted] = useState<Record<DailyActionKey, DailyActionStatus>>({
    f1_f21: "pending",
    leads: "pending",
    dormants: "pending",
    rdv_today: "pending",
    liste_100: "pending",
    grow_network: "pending",
  });
  const [loading, setLoading] = useState(true);

  // ─── Counts data ─────────────────────────────────────────────────────────
  const f1f21Count = copilote.pendingFollowups.length + copilote.pendingFollowupsMoreCount;
  const rdvCount = copilote.todayAppointmentsCount;
  const dormantCount = dormantClients.length;
  const leadsCount = useMemo(
    () =>
      onlineBilans.filter((b) =>
        b.lead_status === "new" || b.lead_status === "to_recontact" || b.lead_status === "relance",
      ).length,
    [onlineBilans],
  );
  const liste100Count = liste100Contacts.length;

  // ─── Fetch persisté (coach_daily_actions du jour) ────────────────────────
  const refetch = useCallback(async () => {
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) {
        setLoading(false);
        return;
      }
      const today = todayISO();
      const { data, error } = await sb
        .from("coach_daily_actions")
        .select("action_key, status")
        .eq("coach_id", currentUser.id)
        .eq("action_date", today);
      if (error) {
        // Table peut ne pas exister encore (migration pas appliquée) → silent fail
        setLoading(false);
        return;
      }
      const next: Record<DailyActionKey, DailyActionStatus> = {
        f1_f21: "pending",
        leads: "pending",
        dormants: "pending",
        rdv_today: "pending",
        liste_100: "pending",
        grow_network: "pending",
      };
      for (const row of data ?? []) {
        const k = row.action_key as DailyActionKey;
        if (k in next) next[k] = row.status as DailyActionStatus;
      }
      setPersisted(next);
    } catch {
      // Silent fail (table peut manquer)
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  // ─── Upsert helper ────────────────────────────────────────────────────────
  const upsert = useCallback(
    async (key: DailyActionKey, status: DailyActionStatus) => {
      if (!currentUser?.id) return;
      setPersisted((p) => ({ ...p, [key]: status }));
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        const today = todayISO();
        const patch: Record<string, unknown> = {
          coach_id: currentUser.id,
          action_key: key,
          action_date: today,
          status,
        };
        if (status === "done") patch.done_at = new Date().toISOString();
        if (status === "skipped") patch.skipped_at = new Date().toISOString();
        // upsert sur (coach_id, action_key, action_date)
        await sb
          .from("coach_daily_actions")
          .upsert(patch, { onConflict: "coach_id,action_key,action_date" });
      } catch {
        // Silent fail
      }
    },
    [currentUser?.id],
  );

  const markDone = useCallback((key: DailyActionKey) => upsert(key, "done"), [upsert]);
  const markSkipped = useCallback((key: DailyActionKey) => upsert(key, "skipped"), [upsert]);
  const resetAction = useCallback((key: DailyActionKey) => upsert(key, "pending"), [upsert]);

  // ─── Build actions list (avec fallback prospection si f1_f21 = 0) ────────
  const actions = useMemo<DailyAction[]>(() => {
    const useFallback = f1f21Count === 0;
    const firstAction: DailyAction = useFallback
      ? {
          key: "grow_network",
          label: "Grandir ton réseau",
          emoji: "🌱",
          count: null,
          detail: "Aucun suivi F1/F21 aujourd'hui — c'est le moment de prospecter.",
          linkPath: "/prospection",
          linkLabel: "Aller à Prospection",
          status: persisted.grow_network,
          isFallback: true,
        }
      : {
          key: "f1_f21",
          label: "Suivis F1 / F21 dus aujourd'hui",
          emoji: "⏰",
          count: f1f21Count,
          detail:
            f1f21Count > 1
              ? `${f1f21Count} suivis protocole à boucler — squelette de ton business.`
              : "1 suivi protocole à boucler — squelette de ton business.",
          linkPath: "/agenda",
          linkLabel: "Voir l'agenda",
          status: persisted.f1_f21,
        };

    return [
      firstAction,
      {
        key: "leads",
        label: "Leads bilan online à qualifier",
        emoji: "🌱",
        count: leadsCount,
        detail:
          leadsCount === 0
            ? "Pipeline vide — partage ton lien bilan."
            : `${leadsCount} lead${leadsCount > 1 ? "s" : ""} en attente de qualif (= revenus court terme).`,
        linkPath: "/clients?tab=leads",
        linkLabel: "Ouvrir Leads",
        status: persisted.leads,
      },
      {
        key: "dormants",
        label: "Clients dormants à relancer",
        emoji: "🔥",
        count: dormantCount,
        detail:
          dormantCount === 0
            ? "Aucun client dormant — bravo, tout est actif."
            : `${dormantCount} client${dormantCount > 1 ? "s" : ""} sans commande depuis > 60j.`,
        linkPath: "/co-pilote",
        linkLabel: "Voir le widget",
        status: persisted.dormants,
      },
      {
        key: "rdv_today",
        label: "RDV aujourd'hui à confirmer / préparer",
        emoji: "📅",
        count: rdvCount,
        detail:
          rdvCount === 0
            ? "Pas de RDV aujourd'hui — anticipe demain."
            : `${rdvCount} RDV à confirmer — qualité de service = rétention.`,
        linkPath: "/agenda",
        linkLabel: "Ouvrir l'agenda",
        status: persisted.rdv_today,
      },
      {
        key: "liste_100",
        label: "Liste 100 du Cahier de bord",
        emoji: "📓",
        count: null, // action discipline, pas un compteur business
        detail:
          liste100Count > 0
            ? `Contacte 1 à 2 personnes parmi tes ${liste100Count} de ta liste.`
            : "Démarre ta liste 100 — discipline prospection.",
        linkPath: "/cahier-de-bord",
        linkLabel: "Ouvrir Cahier de bord",
        status: persisted.liste_100,
      },
    ];
  }, [f1f21Count, leadsCount, dormantCount, rdvCount, liste100Count, persisted]);

  const score = useMemo(() => actions.filter((a) => a.status === "done").length, [actions]);

  return {
    actions,
    score,
    total: 5,
    loading,
    markDone,
    markSkipped,
    resetAction,
    refetch,
  };
}
