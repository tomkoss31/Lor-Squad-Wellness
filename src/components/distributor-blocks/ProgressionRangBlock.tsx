// =============================================================================
// ProgressionRangBlock — jauge progression vers le prochain rang Herbalife
// =============================================================================
// Extrait de TeamMemberDrilldownModal (Chantier #13 sous-vague A.1, 2026-05-18).
// Calcul PV qualifiant = perso + downline non-Supervisor (cf. herbalifeFormulas).
// =============================================================================

import { useMemo } from "react";
import { useAppContext } from "../../context/AppContext";
import { usePvBreakdowns } from "../../hooks/usePvBreakdowns";
import {
  computeQualifyingPersonalPv,
  currentMonthIso,
  rankProgression,
  totalPvFromBreakdown,
} from "../../lib/herbalifeFormulas";
import type { User } from "../../types/domain";
import { AdminCard, hintStyle } from "./_shared";

interface Props {
  memberId: string;
  fullUser: User | null;
  /** ISO YYYY-MM, default = mois en cours. */
  monthIso?: string;
}

export function ProgressionRangBlock({ memberId, fullUser, monthIso }: Props) {
  const { users } = useAppContext();
  const month = monthIso ?? currentMonthIso();
  const { getForUser, breakdowns: allBreakdowns } = usePvBreakdowns(month);
  const existingBreakdown = getForUser(memberId);

  const personalPv = useMemo(() => {
    if (existingBreakdown) return totalPvFromBreakdown(existingBreakdown);
    const ux = fullUser as
      | (User & { monthlyPvOverrideMonth?: string | null; monthlyPvOverride?: number | null })
      | null;
    if (ux?.monthlyPvOverrideMonth === month && typeof ux?.monthlyPvOverride === "number") {
      return ux.monthlyPvOverride;
    }
    return 0;
  }, [existingBreakdown, fullUser, month]);

  const qualifyingPv = useMemo(() => {
    if (!fullUser) return personalPv;
    return computeQualifyingPersonalPv(
      fullUser.id,
      users.map((u) => ({
        id: u.id,
        sponsorId: u.sponsorId,
        currentRank: u.currentRank,
        frozenAt: u.frozenAt,
      })),
      allBreakdowns,
      (uid) => {
        const u = users.find((x) => x.id === uid);
        if (!u) return 0;
        const ux = u as User & {
          monthlyPvOverrideMonth?: string | null;
          monthlyPvOverride?: number | null;
        };
        if (ux.monthlyPvOverrideMonth === month && typeof ux.monthlyPvOverride === "number") {
          return ux.monthlyPvOverride;
        }
        return 0;
      },
    );
  }, [fullUser, users, allBreakdowns, month, personalPv]);

  const progression = useMemo(
    () => rankProgression(fullUser?.currentRank, personalPv, qualifyingPv),
    [fullUser?.currentRank, personalPv, qualifyingPv],
  );

  if (!progression) return null;

  return (
    <AdminCard style={{ marginTop: 12 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: "var(--ls-text)",
          letterSpacing: 0.3,
          marginBottom: 4,
        }}
      >
        📈 Progression · {progression.currentLabel} → {progression.nextLabel}
      </div>
      <div style={hintStyle}>
        {progression.pct >= 100
          ? `🎉 Seuil atteint ! ${progression.pvCurrent.toLocaleString("fr-FR")} / ${progression.pvNeeded.toLocaleString("fr-FR")} PV`
          : `${progression.pvCurrent.toLocaleString("fr-FR")} / ${progression.pvNeeded.toLocaleString("fr-FR")} PV · reste ${progression.remaining.toLocaleString("fr-FR")} PV`}
        <span
          style={{
            display: "inline-block",
            marginLeft: 6,
            padding: "1px 6px",
            borderRadius: 5,
            fontSize: 9,
            fontWeight: 700,
            background: "color-mix(in srgb, var(--ls-teal) 14%, transparent)",
            color: "var(--ls-teal)",
            textTransform: "uppercase",
            letterSpacing: 0.4,
          }}
        >
          {progression.pvSource === "personal_extended"
            ? "PV perso · ventes directes + downline non-Sup"
            : "PV perso · ventes directes"}
        </span>
      </div>
      <div
        style={{
          position: "relative",
          width: "100%",
          height: 10,
          borderRadius: 999,
          background: "color-mix(in srgb, var(--ls-text) 8%, transparent)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: "100%",
            width: `${progression.pct}%`,
            background:
              progression.pct >= 100
                ? "linear-gradient(90deg, #10B981 0%, #06B6D4 50%, #8B5CF6 100%)"
                : progression.pct >= 75
                  ? "linear-gradient(90deg, #10B981 0%, #06B6D4 100%)"
                  : "var(--ls-teal)",
            transition: "width 0.4s ease",
          }}
        />
      </div>
    </AdminCard>
  );
}
