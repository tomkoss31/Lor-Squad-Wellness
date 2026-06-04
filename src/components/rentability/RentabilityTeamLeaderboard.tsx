// =============================================================================
// RentabilityTeamLeaderboard — chantier #10 polish 2026-05-22
//
// Affiche le top 5 des membres team par rentabilité du mois en cours.
// Réservé admin (vue d'ensemble équipe). Léger : 1 RPC call par membre
// via useUserRentability, max 5 rows. Auto-refresh quand pv_breakdown
// est saisi (via le event global).
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { useRentabilitySummary } from "../../hooks/useRentabilitySummary";
import { usePvBreakdowns } from "../../hooks/usePvBreakdowns";
import { Avatar, avatarHue, initialsOf } from "./shared/Avatar";
import { currentMonthIso, rankProgression, totalPvFromBreakdown } from "../../lib/herbalifeFormulas";

interface MemberResolved {
  /** Gain réel du membre = marge retail + override sur sa downline. */
  margin: number;
  progressionPct: number | null;
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

// Fetcher invisible : calcule le gain réel d'UN membre (via la source de
// vérité partagée useRentabilitySummary) et le remonte au parent. Rendu null —
// on monte un fetcher pour CHAQUE membre afin de pouvoir classer tout le monde
// avant d'afficher le top 5 (l'ancienne version ne fetchait que les 5 premiers
// users du tableau, jamais classés → tout restait à 0 / Mandy invisible).
function MemberFetcher({
  userId,
  currentRank,
  onResolved,
}: {
  userId: string;
  currentRank: string | undefined;
  onResolved: (userId: string, resolved: MemberResolved) => void;
}) {
  const { totalMargin, loading, data } = useRentabilitySummary(userId);
  const monthIso = useMemo(() => currentMonthIso(), []);
  const { breakdowns } = usePvBreakdowns(monthIso);

  // Mini progression % vers prochain rang (chantier ext #2 2026-05-22)
  const progressionPct = useMemo(() => {
    const breakdown = breakdowns.find((b) => b.userId === userId);
    const personalPv = breakdown ? totalPvFromBreakdown(breakdown) : 0;
    const prog = rankProgression(currentRank, personalPv);
    return prog?.pct ?? null;
  }, [breakdowns, userId, currentRank]);

  useEffect(() => {
    if (!loading && data) {
      onResolved(userId, { margin: totalMargin, progressionPct });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, totalMargin, progressionPct]);

  return null;
}

export function RentabilityTeamLeaderboard() {
  const navigate = useNavigate();
  const { users, currentUser } = useAppContext();
  const [resolved, setResolved] = useState<Map<string, MemberResolved>>(new Map());

  const isAdmin = currentUser?.role === "admin";

  // Liste des membres : tous les vrais users (pas externes) sauf TOUS les admins
  // (Thomas + Mélanie = même équipe co-managée, leaderboard = membres distri
  // hors couple admin). Chantier 2026-05-22.
  const teamMembers = useMemo(() => {
    if (!isAdmin || !currentUser) return [];
    return users
      .filter((u) => u.active && !u.isExternal && u.role !== "admin")
      .slice(0, 24); // safety cap (fetch large, on n'affiche que le top 5)
  }, [users, currentUser, isAdmin]);

  const handleResolved = useCallback((userId: string, r: MemberResolved) => {
    setResolved((prev) => {
      const cur = prev.get(userId);
      if (cur && cur.margin === r.margin && cur.progressionPct === r.progressionPct) {
        return prev;
      }
      const next = new Map(prev);
      next.set(userId, r);
      return next;
    });
  }, []);

  // Classement par gain réel décroissant (membres non résolus en bas).
  const ranked = useMemo(
    () =>
      [...teamMembers].sort(
        (a, b) => (resolved.get(b.id)?.margin ?? -1) - (resolved.get(a.id)?.margin ?? -1),
      ),
    [teamMembers, resolved],
  );

  if (!isAdmin || teamMembers.length === 0) return null;

  const top5 = ranked.slice(0, 5);
  const leader = top5[0];
  const leaderHasGain = leader ? (resolved.get(leader.id)?.margin ?? 0) > 0 : false;

  return (
    <section style={cardStyle}>
      {/* Fetch invisible de TOUS les membres → classement complet */}
      {teamMembers.map((u) => (
        <MemberFetcher
          key={`fetch-${u.id}`}
          userId={u.id}
          currentRank={u.currentRank}
          onResolved={handleResolved}
        />
      ))}
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
          <MemberRowItem
            key={u.id}
            name={u.name}
            rank={i + 1}
            total={resolved.get(u.id)?.margin ?? 0}
            isLeader={leader?.id === u.id && leaderHasGain}
            rankProgressionPct={resolved.get(u.id)?.progressionPct ?? null}
            onClick={() => navigate("/rentabilite")}
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
