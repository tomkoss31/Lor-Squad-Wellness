// =============================================================================
// ProgressionRangBlock — jauge progression vers le prochain rang Herbalife
// =============================================================================
// V2 2026-05-18 (feat/jauge-fenetre-glissante) :
//   - Source unique : RPC SQL `get_distributor_qualifications` qui retourne
//     pv_2m / pv_3m / pv_12m_extended (self + downline non-Sup, 12 mois
//     glissants). Plus aucun calcul JS de fenêtre — tout côté DB.
//   - Le libellé jauge mentionne explicitement la fenêtre glissante.
// =============================================================================

import { useMemo } from "react";
import { useDistributorQualifications } from "../../hooks/useDistributorQualifications";
import { currentMonthIso, rankProgressionFromWindows } from "../../lib/herbalifeFormulas";
import type { User } from "../../types/domain";
import { AdminCard, hintStyle } from "./_shared";

interface Props {
  memberId: string;
  fullUser: User | null;
  /** ISO YYYY-MM, default = mois en cours. */
  monthIso?: string;
}

export function ProgressionRangBlock({ memberId, fullUser, monthIso }: Props) {
  const month = monthIso ?? currentMonthIso();
  const { qualifications, loading } = useDistributorQualifications(memberId, month);

  const progression = useMemo(() => {
    if (!qualifications) return null;
    return rankProgressionFromWindows(fullUser?.currentRank, {
      pv_2m: qualifications.pv_2m,
      pv_3m: qualifications.pv_3m,
      pv_12m: qualifications.pv_12m,
      pv_12m_extended: qualifications.pv_12m_extended,
    });
  }, [fullUser?.currentRank, qualifications]);

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
