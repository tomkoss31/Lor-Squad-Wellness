// =============================================================================
// RentabilityTeamLeaderboard — chantier #10 polish 2026-05-22
//
// Affiche le top 5 des membres team par rentabilité du mois en cours.
// Réservé admin (vue d'ensemble équipe). Léger : 1 RPC call par membre
// via useUserRentability, max 5 rows. Auto-refresh quand pv_breakdown
// est saisi (via le event global).
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { useUserRentability } from "../../hooks/useUserRentability";
import { usePvBreakdowns } from "../../hooks/usePvBreakdowns";
import { Avatar, avatarHue, initialsOf } from "./shared/Avatar";
import { currentMonthIso, rankProgression, totalPvFromBreakdown } from "../../lib/herbalifeFormulas";

interface MemberRow {
  userId: string;
  name: string;
  margin: number;
}

function MemberRowItem({
  name,
  rank,
  total,
  isLeader,
  rankProgressionPct,
  onClick,
}: {
  name: string;
  rank: number;
  total: number;
  isLeader: boolean;
  rankProgressionPct: number | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 10px",
        background: isLeader ? "color-mix(in srgb, var(--ls-gold) 8%, var(--ls-surface))" : "var(--ls-surface)",
        border: isLeader ? "0.5px solid color-mix(in srgb, var(--ls-gold) 30%, transparent)" : "0.5px solid var(--ls-border)",
        borderRadius: 10,
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
        fontFamily: "inherit",
        transition: "background .15s",
      }}
    >
      <span style={{ width: 22, fontFamily: "Syne, serif", fontWeight: 700, fontSize: 12, color: isLeader ? "var(--ls-gold)" : "var(--ls-text-muted)" }}>
        #{rank}
      </span>
      <Avatar initials={initialsOf(name)} hue={avatarHue(name)} size={28} />
      <span style={{ flex: 1, minWidth: 0, fontFamily: "DM Sans, sans-serif", fontSize: 12.5, fontWeight: 600, color: "var(--ls-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {name}
      </span>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
        <span
          data-stealth
          style={{
            fontFamily: "Syne, serif",
            fontStyle: "italic",
            fontWeight: 700,
            fontSize: 14,
            color: isLeader ? "var(--ls-gold)" : "var(--ls-text)",
          }}
        >
          {Math.round(total).toLocaleString("fr-FR")} €
        </span>
        {rankProgressionPct !== null && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: "DM Sans, sans-serif", fontSize: 9.5, color: "var(--ls-text-muted)" }}>
            <div style={{ width: 36, height: 3, background: "var(--ls-surface2)", borderRadius: 999, overflow: "hidden" }}>
              <div style={{
                width: `${rankProgressionPct}%`,
                height: "100%",
                background: rankProgressionPct >= 80 ? "var(--ls-gold)" : "var(--ls-teal)",
                borderRadius: 999,
              }} />
            </div>
            <span>{rankProgressionPct}%</span>
          </div>
        )}
      </div>
    </button>
  );
}

function MemberFetcher({
  userId,
  name,
  currentRank,
  rank,
  isLeader,
  onResolved,
}: {
  userId: string;
  name: string;
  currentRank: string | undefined;
  rank: number;
  isLeader: boolean;
  onResolved: (row: MemberRow) => void;
}) {
  const navigate = useNavigate();
  const { data, loading } = useUserRentability(userId);
  const monthIso = useMemo(() => currentMonthIso(), []);
  const { breakdowns } = usePvBreakdowns(monthIso);

  useEffect(() => {
    if (!loading && data) {
      onResolved({ userId, name, margin: data.margin_eur });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, data?.margin_eur]);

  // Mini progression % vers prochain rang (chantier ext #2 2026-05-22)
  const progressionPct = useMemo(() => {
    const breakdown = breakdowns.find((b) => b.userId === userId);
    const personalPv = breakdown ? totalPvFromBreakdown(breakdown) : 0;
    const prog = rankProgression(currentRank, personalPv);
    return prog?.pct ?? null;
  }, [breakdowns, userId, currentRank]);

  if (loading || !data) {
    return (
      <div style={{ height: 44, opacity: 0.4, fontSize: 11, color: "var(--ls-text-muted)", padding: "12px 10px" }}>
        Chargement {name}…
      </div>
    );
  }

  return (
    <MemberRowItem
      name={name}
      rank={rank}
      total={data.margin_eur}
      isLeader={isLeader}
      rankProgressionPct={progressionPct}
      onClick={() => navigate("/rentabilite")}
    />
  );
}

export function RentabilityTeamLeaderboard() {
  const { users, currentUser } = useAppContext();
  const [resolved, setResolved] = useState<Map<string, number>>(new Map());

  const isAdmin = currentUser?.role === "admin";

  // Liste des membres : tous les vrais users (pas externes) sauf moi
  const teamMembers = useMemo(() => {
    if (!isAdmin || !currentUser) return [];
    return users
      .filter((u) => u.active && !u.isExternal && u.id !== currentUser.id && u.role !== "admin")
      .slice(0, 8); // safety cap
  }, [users, currentUser, isAdmin]);

  if (!isAdmin || teamMembers.length === 0) return null;

  // Tri par margin resolved (les non-resolved restent en bas)
  const sortedMembers = [...teamMembers].sort((a, b) => {
    const ma = resolved.get(a.id) ?? -1;
    const mb = resolved.get(b.id) ?? -1;
    return mb - ma;
  });
  const top5 = sortedMembers.slice(0, 5);
  const leaderId = top5[0]?.id;

  const handleResolved = (row: MemberRow) => {
    setResolved((prev) => {
      if (prev.get(row.userId) === row.margin) return prev;
      const next = new Map(prev);
      next.set(row.userId, row.margin);
      return next;
    });
  };

  return (
    <section style={cardStyle}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 1.4, textTransform: "uppercase", color: "var(--ls-gold)", fontWeight: 700 }}>
            🏆 Leaderboard team
          </div>
          <div style={{ fontFamily: "Syne, serif", fontWeight: 600, fontSize: 16, color: "var(--ls-text)", marginTop: 2 }}>
            Top {top5.length} ce mois
          </div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {top5.map((u, i) => (
          <MemberFetcher
            key={u.id}
            userId={u.id}
            name={u.name}
            currentRank={u.currentRank}
            rank={i + 1}
            isLeader={u.id === leaderId && resolved.get(u.id) !== undefined && (resolved.get(u.id) ?? 0) > 0}
            onResolved={handleResolved}
          />
        ))}
      </div>
    </section>
  );
}

const cardStyle: React.CSSProperties = {
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 18,
  padding: 14,
  margin: "16px 0",
};
