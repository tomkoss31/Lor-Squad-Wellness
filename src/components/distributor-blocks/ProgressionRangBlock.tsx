// =============================================================================
// ProgressionRangBlock — jauge progression vers le prochain rang Herbalife
// =============================================================================
// Refactor 2026-05-18 (feat/jauge-fenetre-glissante) :
//   - Calcul PV désormais sur FENÊTRES GLISSANTES (2/3/12 mois) via RPC
//     get_distributor_qualifications, plus jamais sur mois courant seul.
//   - Le calcul "PV étendu" (perso + downline non-Supervisor) du mois courant
//     reste calculé en JS et MAJORE la fenêtre 12m pour qualif Supervisor.
//   - Le libellé jauge mentionne explicitement la fenêtre glissante.
// =============================================================================

import { useMemo } from "react";
import { useAppContext } from "../../context/AppContext";
import { useDistributorQualifications } from "../../hooks/useDistributorQualifications";
import { usePvBreakdowns } from "../../hooks/usePvBreakdowns";
import {
  computeQualifyingPersonalPv,
  currentMonthIso,
  rankProgressionFromWindows,
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

  // Fenêtres glissantes 2/3/6/12 mois via RPC SQL (PV perso uniquement).
  const { qualifications, loading } = useDistributorQualifications(memberId, month);

  // Mois courant : pour majorer la fenêtre 12m avec le downline non-Sup
  // (règle Herbalife "PV personnel étendu").
  const { breakdowns: allBreakdowns } = usePvBreakdowns(month);

  const qualifyingPvCurrentMonth = useMemo(() => {
    if (!fullUser) return 0;
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
  }, [fullUser, users, allBreakdowns, month]);

  const progression = useMemo(() => {
    if (!qualifications) return null;
    return rankProgressionFromWindows(
      fullUser?.currentRank,
      {
        pv_2m: qualifications.pv_2m,
        pv_3m: qualifications.pv_3m,
        pv_12m: qualifications.pv_12m,
      },
      qualifyingPvCurrentMonth,
    );
  }, [fullUser?.currentRank, qualifications, qualifyingPvCurrentMonth]);

  if (loading && !qualifications) {
    return (
      <AdminCard style={{ marginTop: 12 }}>
        <div style={{ ...hintStyle, opacity: 0.6 }}>Calcul des PV glissants…</div>
      </AdminCard>
    );
  }
  if (!progression) return null;

  const windowLabel = `${progression.windowMonths} mois glissants`;

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
          ? `🎉 Seuil atteint ! ${progression.pvCurrent.toLocaleString("fr-FR")} / ${progression.pvNeeded.toLocaleString("fr-FR")} PV · ${windowLabel}`
          : `${progression.pvCurrent.toLocaleString("fr-FR")} / ${progression.pvNeeded.toLocaleString("fr-FR")} PV · ${windowLabel} · reste ${progression.remaining.toLocaleString("fr-FR")} PV`}
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
