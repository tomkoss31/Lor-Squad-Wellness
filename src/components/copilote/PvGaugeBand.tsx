// Chantier Co-pilote V4 (2026-04-24).
// Bande stats : jauge circulaire PV + 3 mini-stats (clients, RDV semaine,
// conversion).

import { pvProgressPercent } from "../../lib/utils/copiloteHelpers";

export interface PvGaugeBandProps {
  monthlyPV: number;
  monthlyPVTarget: number;
  daysLeftInMonth: number;
  activeClientsCount: number;
  activeClientsDelta: number;
  weekAppointmentsCount: number;
  todayAppointmentsCount: number;
  conversionRate: number;
}

function conversionTone(pct: number): string {
  if (pct >= 60) return "#0F6E56";
  if (pct >= 40) return "#8B6F2A";
  return "#C13048";
}

function deltaTone(delta: number): { color: string; prefix: string } {
  if (delta > 0) return { color: "#0F6E56", prefix: "+" };
  if (delta < 0) return { color: "#C13048", prefix: "" };
  return { color: "var(--ls-text-hint)", prefix: "±" };
}

export function PvGaugeBand({
  monthlyPV,
  monthlyPVTarget,
  daysLeftInMonth,
  activeClientsCount,
  activeClientsDelta,
  weekAppointmentsCount,
  todayAppointmentsCount,
  conversionRate,
}: PvGaugeBandProps) {
  const pct = pvProgressPercent(monthlyPV, monthlyPVTarget);
  const tone = deltaTone(activeClientsDelta);
  const convColor = conversionTone(conversionRate);

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 16,
        background: "var(--ls-surface)",
        border: "1px solid var(--ls-border)",
        display: "flex",
        alignItems: "center",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      {/* Partie gauche : jauge */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
        <Gauge percent={pct} />
        <div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--ls-text-hint)",
              fontWeight: 600,
              marginBottom: 4,
            }}
          >
            PV du mois
          </div>
          <div
            style={{
              fontFamily: "Syne, sans-serif",
              fontWeight: 700,
              fontSize: 18,
              color: "var(--ls-text)",
              lineHeight: 1.1,
            }}
          >
            {monthlyPV.toLocaleString("fr-FR")}
            <span
              style={{
                color: "var(--ls-text-hint)",
                fontWeight: 400,
                fontSize: 14,
                marginLeft: 4,
              }}
            >
              / {monthlyPVTarget.toLocaleString("fr-FR")}
            </span>
          </div>
          <div style={{ fontSize: 11, color: "var(--ls-text-hint)", marginTop: 3 }}>
            {daysLeftInMonth} jour{daysLeftInMonth > 1 ? "s" : ""} restants
          </div>
        </div>
      </div>

      {/* Séparateur */}
      <div
        aria-hidden="true"
        style={{
          width: 1,
          height: 72,
          background: "var(--ls-border)",
          flexShrink: 0,
        }}
      />

      {/* Partie droite : 3 mini-stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
          flex: 1,
          minWidth: 260,
        }}
      >
        <MiniStat
          label="Clients actifs"
          value={activeClientsCount.toString()}
          hint={
            <span style={{ color: tone.color, fontWeight: 700 }}>
              {tone.prefix}
              {activeClientsDelta}
            </span>
          }
        />
        <MiniStat
          label="RDV cette semaine"
          value={weekAppointmentsCount.toString()}
          hint={`${todayAppointmentsCount} auj.`}
        />
        <MiniStat
          label="Conversion"
          value={`${conversionRate}%`}
          hint={
            <span
              style={{
                color: convColor,
                fontWeight: 700,
              }}
              aria-hidden="true"
            >
              {conversionRate >= 60 ? "↑" : conversionRate >= 40 ? "→" : "↓"}
            </span>
          }
        />
      </div>
    </div>
  );
}

function Gauge({ percent }: { percent: number }) {
  const size = 72;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (percent / 100) * c;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--ls-border)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#BA7517"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`}
        strokeDashoffset={c / 4}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x={size / 2}
        y={size / 2 + 4}
        textAnchor="middle"
        fontSize="15"
        fontWeight={700}
        fontFamily="Syne, sans-serif"
        fill="var(--ls-text)"
      >
        {percent}%
      </text>
    </svg>
  );
}

function MiniStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          color: "var(--ls-text-hint)",
          marginBottom: 4,
          fontWeight: 500,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "Syne, sans-serif",
          fontWeight: 700,
          fontSize: 20,
          color: "var(--ls-text)",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 11, color: "var(--ls-text-hint)", marginTop: 3 }}>
        {hint}
      </div>
    </div>
  );
}
