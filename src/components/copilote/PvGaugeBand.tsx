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
      className="pv-gauge-band"
      data-tour-id="pv-gauge"
      style={{
        padding: 16,
        borderRadius: 16,
        background: "var(--ls-surface)",
        border: "1px solid var(--ls-border)",
        display: "flex",
        alignItems: "center",
        gap: 16,
        flexWrap: "wrap",
        transition: "box-shadow 0.3s ease, border-color 0.3s ease, transform 0.3s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(239,159,39,0.3)";
        e.currentTarget.style.boxShadow = "0 4px 24px rgba(239,159,39,0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--ls-border)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <style>{`
        @keyframes pv-stat-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .pv-gauge-band > div {
          animation: pv-stat-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .pv-gauge-band > div:nth-child(1) { animation-delay: 0ms; }
        .pv-gauge-band > div:nth-child(2) { animation-delay: 80ms; }
        .pv-gauge-band > div:nth-child(3) { animation-delay: 160ms; }
        .pv-gauge-band > div:nth-child(4) { animation-delay: 240ms; }
        .pv-gauge-band > div:nth-child(5) { animation-delay: 320ms; }
        .pv-gauge-band > div:nth-child(6) { animation-delay: 400ms; }
        @media (prefers-reduced-motion: reduce) {
          .pv-gauge-band > div { animation: none !important; }
        }
      `}</style>
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
        data-tour-id="pv-mini-stats"
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
  const size = 80;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (percent / 100) * c;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <defs>
        <linearGradient id="pv-gauge-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#EF9F27" />
          <stop offset="100%" stopColor="#BA7517" />
        </linearGradient>
        <filter id="pv-gauge-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--ls-border)"
        strokeWidth={stroke}
        opacity={0.6}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="url(#pv-gauge-gradient)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`}
        strokeDashoffset={c / 4}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        filter="url(#pv-gauge-glow)"
        style={{ transition: "stroke-dasharray 800ms cubic-bezier(0.16, 1, 0.3, 1)" }}
      />
      <text
        x={size / 2}
        y={size / 2 + 5}
        textAnchor="middle"
        fontSize="17"
        fontWeight={800}
        fontFamily="Syne, sans-serif"
        fill="var(--ls-text)"
        letterSpacing="-0.02em"
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
