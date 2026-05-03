// =============================================================================
// FlexTeamPage — vue sponsor (N+1) + admin du moteur FLEX (Phase F, 2026-11-05)
//
// Route /flex/equipe.
//
//   Sponsor (referent ou admin) : voit la liste des distri qu'il sponsorise
//   directement (users.parent_user_id = caller). Pour chacun :
//      - nom, rang, plan FLEX (✓ ou ✗)
//      - récap semaine en cours (jours remplis + ratios)
//      - bouton "Voir détail" → modal avec récap 4 sem (réutilise
//        FlexHistoryCard mais en lecture pour un autre user — RLS sponsor
//        autorise déjà).
//
//   Admin (role = 'admin') : section additionnelle "Distri en dérive"
//      via RPC list_flex_drift_distri() — distri sans check-in >2 sem.
//
// RLS déjà OK côté DB : flex_plan_sponsor_n1_select +
// flex_checkin_sponsor_n1_select + flex_*_admin_all.
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeading } from "../components/ui/PageHeading";
import { useAppContext } from "../context/AppContext";
import { getSupabaseClient } from "../services/supabaseClient";
import { FlexHistoryCard } from "../components/flex/FlexHistoryCard";
import type {
  DistributorActionPlan,
  FlexDriftDistri,
  FlexWeeklyRecap,
  FlexWeeklyRecapResult,
} from "../types/flex";
import { flexKpiStatus, FLEX_KPI_COLOR } from "../types/flex";
import { RANK_LABELS, type HerbalifeRank } from "../types/domain";

interface TeamMember {
  userId: string;
  name: string;
  currentRank: HerbalifeRank;
  hasPlan: boolean;
  plan: DistributorActionPlan | null;
  recap: FlexWeeklyRecap | null;
}

function ymdParisToday(): string {
  return new Intl.DateTimeFormat("fr-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function mondayOf(ymd: string): string {
  const d = new Date(ymd + "T00:00:00");
  const dow = d.getDay();
  d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function FlexTeamPage() {
  const { currentUser, users } = useAppContext();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [drift, setDrift] = useState<FlexDriftDistri[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const isAdmin = currentUser?.role === "admin";

  // Liste des distri sponsorisés par le caller (users avec parent_user_id = caller)
  const directDownline = useMemo(() => {
    if (!currentUser) return [] as typeof users;
    return users.filter(
      (u) => u.active && u.sponsorId === currentUser.id && u.id !== currentUser.id,
    );
  }, [users, currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const sb = await getSupabaseClient();
      if (!sb) {
        if (!cancelled) {
          setError("Connexion Supabase indisponible");
          setLoading(false);
        }
        return;
      }

      const downlineIds = directDownline.map((u) => u.id);
      const monday = mondayOf(ymdParisToday());

      // Plans des downline + récap semaine en parallèle
      const [plansRes, ...recapResults] = await Promise.all([
        downlineIds.length > 0
          ? sb
              .from("distributor_action_plan")
              .select("*")
              .in("user_id", downlineIds)
          : Promise.resolve({ data: [], error: null } as const),
        ...downlineIds.map((uid) =>
          sb.rpc("get_flex_weekly_recap", {
            p_user_id: uid,
            p_week_start: monday,
          }),
        ),
      ]);

      if (cancelled) return;

      if (plansRes.error) {
        console.error(plansRes.error);
      }
      const plansById = new Map<string, DistributorActionPlan>(
        (plansRes.data ?? []).map((p) => [(p as DistributorActionPlan).user_id, p as DistributorActionPlan]),
      );
      const recapsById = new Map<string, FlexWeeklyRecap>();
      recapResults.forEach((r, i) => {
        if (r.error || !r.data) return;
        const data = r.data as FlexWeeklyRecapResult;
        if ("error" in data) return;
        recapsById.set(downlineIds[i], data);
      });

      const built: TeamMember[] = directDownline.map((u) => ({
        userId: u.id,
        name: u.name,
        currentRank: (u.currentRank as HerbalifeRank | undefined) ?? "distributor_25",
        hasPlan: plansById.has(u.id),
        plan: plansById.get(u.id) ?? null,
        recap: recapsById.get(u.id) ?? null,
      }));
      setMembers(built);

      // Drift list (admin only)
      if (isAdmin) {
        const driftRes = await sb.rpc("list_flex_drift_distri");
        if (!cancelled && !driftRes.error && driftRes.data) {
          setDrift(driftRes.data as FlexDriftDistri[]);
        }
      }

      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser, directDownline, isAdmin]);

  if (!currentUser) return null;

  return (
    <div className="space-y-6" style={{ paddingBottom: 60 }}>
      <PageHeading
        eyebrow={isAdmin ? "FLEX · Vue admin" : "FLEX · Mon équipe"}
        title="Pilotage de ton équipe"
        description={
          isAdmin
            ? `${members.length} distri direct + ${drift.length} en dérive >2 sem.`
            : `${members.length} distri sous ton parrainage direct.`
        }
      />

      {loading ? (
        <div style={{ padding: 24, color: "var(--ls-text-muted)" }}>Chargement…</div>
      ) : error ? (
        <div style={{ padding: 24, color: "var(--ls-coral)" }}>{error}</div>
      ) : members.length === 0 ? (
        <div
          style={{
            background: "var(--ls-surface)",
            border: "0.5px solid var(--ls-border)",
            borderRadius: 16,
            padding: 22,
            color: "var(--ls-text-muted)",
            fontSize: 13,
          }}
        >
          Aucun distri sous ton parrainage direct pour le moment. Quand tu en
          parraineras, leur progression FLEX s'affichera ici.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {members.map((m) => (
            <MemberRow
              key={m.userId}
              member={m}
              expanded={expanded === m.userId}
              onToggle={() => setExpanded(expanded === m.userId ? null : m.userId)}
            />
          ))}
        </div>
      )}

      {/* Section admin — drift list */}
      {isAdmin && (
        <div
          style={{
            background: "var(--ls-surface)",
            border: "1px solid var(--ls-coral)",
            borderRadius: 16,
            padding: 22,
            marginTop: 24,
          }}
        >
          <h2
            style={{
              margin: "0 0 12px 0",
              fontFamily: "Syne, sans-serif",
              fontSize: 18,
              color: "var(--ls-coral)",
            }}
          >
            ⚠️ Distri en dérive (&gt; 2 semaines sans check-in)
          </h2>
          {drift.length === 0 ? (
            <p style={{ color: "var(--ls-text-muted)", fontSize: 13, margin: 0 }}>
              Aucun distri en dérive. 🎉
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {drift.map((d) => (
                <Link
                  key={d.user_id}
                  to={`/users`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    background: "var(--ls-surface2)",
                    borderRadius: 8,
                    textDecoration: "none",
                    color: "var(--ls-text)",
                    fontSize: 13,
                    fontFamily: "DM Sans, sans-serif",
                  }}
                >
                  <span>{d.user_name}</span>
                  <span style={{ color: "var(--ls-coral)", fontSize: 12 }}>
                    {d.weeks_drift} sem ·{" "}
                    {d.last_checkin_date
                      ? new Date(d.last_checkin_date).toLocaleDateString("fr-FR")
                      : "jamais"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MemberRow({
  member,
  expanded,
  onToggle,
}: {
  member: TeamMember;
  expanded: boolean;
  onToggle: () => void;
}) {
  const recap = member.recap;
  return (
    <div
      style={{
        background: "var(--ls-surface)",
        border: expanded ? "1px solid var(--ls-gold)" : "0.5px solid var(--ls-border)",
        borderRadius: 14,
        overflow: "hidden",
        transition: "all 0.15s",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%",
          background: "transparent",
          border: "none",
          padding: "14px 16px",
          textAlign: "left",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: "var(--ls-text)",
          fontFamily: "DM Sans, sans-serif",
          gap: 12,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "Syne, sans-serif", fontSize: 15, fontWeight: 700 }}>
            {member.name}
          </div>
          <div style={{ fontSize: 11, color: "var(--ls-text-muted)", marginTop: 2 }}>
            {RANK_LABELS[member.currentRank]} ·{" "}
            {member.hasPlan ? "Plan FLEX actif" : <span style={{ color: "var(--ls-coral)" }}>Pas de plan FLEX</span>}
          </div>
        </div>
        {recap ? (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <MiniDot label="Inv" ratio={recap.ratios.invitations} />
            <MiniDot label="Conv" ratio={recap.ratios.conversations} />
            <MiniDot label="Bilans" ratio={recap.ratios.bilans} />
            <MiniDot label="Clos" ratio={recap.ratios.closings} />
            <span style={{ fontSize: 11, color: "var(--ls-text-muted)", marginLeft: 6 }}>
              {recap.days_filled}/7
            </span>
          </div>
        ) : (
          <span style={{ fontSize: 11, color: "var(--ls-text-muted)" }}>
            {member.hasPlan ? "Pas de check-in cette sem." : ""}
          </span>
        )}
      </button>
      {expanded && member.hasPlan && (
        <div style={{ padding: 16, borderTop: "0.5px solid var(--ls-border)" }}>
          <FlexHistoryCard userId={member.userId} />
        </div>
      )}
    </div>
  );
}

function MiniDot({ label, ratio }: { label: string; ratio: number }) {
  const status = flexKpiStatus(ratio);
  const color = FLEX_KPI_COLOR[status];
  return (
    <div
      title={`${label} ${Math.round(ratio)}%`}
      style={{
        width: 22,
        height: 22,
        borderRadius: 999,
        background: `color-mix(in srgb, ${color} 18%, transparent)`,
        border: `1px solid ${color}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 8,
        fontWeight: 700,
        color,
        fontFamily: "DM Sans, sans-serif",
      }}
    >
      {label.slice(0, 1)}
    </div>
  );
}
