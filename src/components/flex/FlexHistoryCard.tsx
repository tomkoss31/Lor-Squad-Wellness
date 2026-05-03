// =============================================================================
// FlexHistoryCard — récap hebdo + historique 4 dernières semaines (Phase D)
//
// Affiche les 4 dernières semaines (lundi → dimanche, Paris) avec :
//   - Dates
//   - Nombre de jours remplis (ex. 5/7)
//   - 4 mini-bars (Invitations, Conversations, Bilans, Closings) colorées
//     selon le ratio actual/target (behind / ontrack / ahead)
//
// Source : RPC public.get_flex_weekly_recap(uuid, date) appelée 4 fois en
// parallèle (déjà SECURITY DEFINER + auth check côté DB).
// =============================================================================

import { useEffect, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";
import type { FlexWeeklyRecap, FlexWeeklyRecapResult } from "../../types/flex";
import { flexKpiStatus, FLEX_KPI_COLOR } from "../../types/flex";

interface Props {
  userId: string;
}

/** Lundi de la semaine de la date donnée (YYYY-MM-DD), heure Paris. */
function mondayOf(ymd: string): string {
  const d = new Date(ymd + "T00:00:00");
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function shiftDate(ymd: string, days: number): string {
  const d = new Date(ymd + "T00:00:00");
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function ymdParisToday(): string {
  const fmt = new Intl.DateTimeFormat("fr-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
}

function fmtRange(start: string, end: string): string {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  const sm = s.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  const em = e.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  return `${sm} → ${em}`;
}

export function FlexHistoryCard({ userId }: Props) {
  const [recaps, setRecaps] = useState<FlexWeeklyRecap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
      // 4 dernières semaines : current, -7, -14, -21
      const today = ymdParisToday();
      const currentMonday = mondayOf(today);
      const weeks = [
        currentMonday,
        shiftDate(currentMonday, -7),
        shiftDate(currentMonday, -14),
        shiftDate(currentMonday, -21),
      ];
      const results = await Promise.all(
        weeks.map((w) =>
          sb.rpc("get_flex_weekly_recap", { p_user_id: userId, p_week_start: w }),
        ),
      );
      if (cancelled) return;
      const ok: FlexWeeklyRecap[] = [];
      for (const r of results) {
        if (r.error) continue;
        const data = r.data as FlexWeeklyRecapResult | null;
        if (!data) continue;
        if ("error" in data) continue;
        ok.push(data);
      }
      setRecaps(ok);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) {
    return (
      <div style={cardStyle}>
        <h3 style={titleStyle}>Historique 4 semaines</h3>
        <p style={{ color: "var(--ls-text-muted)", fontSize: 12, margin: 0 }}>Chargement…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div style={cardStyle}>
        <p style={{ color: "var(--ls-coral)", fontSize: 12, margin: 0 }}>{error}</p>
      </div>
    );
  }
  if (recaps.length === 0) {
    return (
      <div style={cardStyle}>
        <h3 style={titleStyle}>Historique 4 semaines</h3>
        <p style={{ color: "var(--ls-text-muted)", fontSize: 12, margin: 0 }}>
          Pas encore de check-in. Ton premier passage cette semaine remplira le récap automatiquement.
        </p>
      </div>
    );
  }

  // Aggregate monthly totals (sum 4 last weeks)
  const monthly = recaps.reduce(
    (acc, r) => ({
      inv_a: acc.inv_a + r.actuals.invitations,
      inv_t: acc.inv_t + r.targets.invitations,
      conv_a: acc.conv_a + r.actuals.conversations,
      conv_t: acc.conv_t + r.targets.conversations,
      bilans_a: acc.bilans_a + r.actuals.bilans,
      bilans_t: acc.bilans_t + r.targets.bilans,
      clos_a: acc.clos_a + r.actuals.closings,
      clos_t: acc.clos_t + r.targets.closings,
    }),
    { inv_a: 0, inv_t: 0, conv_a: 0, conv_t: 0, bilans_a: 0, bilans_t: 0, clos_a: 0, clos_t: 0 },
  );

  return (
    <div style={cardStyle}>
      <h3 style={titleStyle}>Historique 4 semaines</h3>

      {/* Total mensuel */}
      <div
        style={{
          background: "color-mix(in srgb, var(--ls-gold) 8%, transparent)",
          border: "0.5px solid color-mix(in srgb, var(--ls-gold) 35%, transparent)",
          borderRadius: 12,
          padding: "12px 14px",
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 10, fontFamily: "DM Sans, sans-serif", textTransform: "uppercase", letterSpacing: 1.2, color: "var(--ls-gold)", marginBottom: 8 }}>
          Cumul des 4 dernières semaines
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8 }}>
          <MonthlyKpi label="Invitations" actual={monthly.inv_a} target={monthly.inv_t} />
          <MonthlyKpi label="Conversations" actual={monthly.conv_a} target={monthly.conv_t} />
          <MonthlyKpi label="Bilans" actual={monthly.bilans_a} target={monthly.bilans_t} />
          <MonthlyKpi label="Closings" actual={monthly.clos_a} target={monthly.clos_t} />
        </div>
      </div>

      {/* Détail semaine par semaine */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {recaps.map((r) => (
          <WeekRow key={r.week_start} recap={r} />
        ))}
      </div>
    </div>
  );
}

function WeekRow({ recap }: { recap: FlexWeeklyRecap }) {
  return (
    <div
      style={{
        background: "var(--ls-surface2)",
        borderRadius: 10,
        padding: "10px 12px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontFamily: "DM Sans, sans-serif", color: "var(--ls-text)" }}>
          {fmtRange(recap.week_start, recap.week_end)}
        </span>
        <span style={{ fontSize: 11, color: "var(--ls-text-muted)" }}>
          {recap.days_filled}/7 jours
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 6 }}>
        <MiniBar label="Inv" ratio={recap.ratios.invitations} />
        <MiniBar label="Conv" ratio={recap.ratios.conversations} />
        <MiniBar label="Bilans" ratio={recap.ratios.bilans} />
        <MiniBar label="Clos" ratio={recap.ratios.closings} />
      </div>
    </div>
  );
}

function MiniBar({ label, ratio }: { label: string; ratio: number }) {
  const status = flexKpiStatus(ratio);
  const color = FLEX_KPI_COLOR[status];
  const width = Math.min(100, Math.max(2, ratio));
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, marginBottom: 3 }}>
        <span style={{ color: "var(--ls-text-muted)", textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</span>
        <span style={{ color }}>{Math.round(ratio)}%</span>
      </div>
      <div style={{ height: 4, borderRadius: 999, background: "var(--ls-surface)", overflow: "hidden" }}>
        <div style={{ width: `${width}%`, height: "100%", background: color, transition: "width 0.4s" }} />
      </div>
    </div>
  );
}

function MonthlyKpi({ label, actual, target }: { label: string; actual: number; target: number }) {
  const ratio = target > 0 ? (actual / target) * 100 : 0;
  const status = flexKpiStatus(ratio);
  const color = FLEX_KPI_COLOR[status];
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontFamily: "Syne, sans-serif", fontSize: 18, fontWeight: 700, color }}>
        {actual}
        <span style={{ fontSize: 11, color: "var(--ls-text-muted)", fontWeight: 400 }}>/{target}</span>
      </div>
      <div style={{ fontSize: 9, color: "var(--ls-text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 }}>
        {label}
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 16,
  padding: 22,
};

const titleStyle: React.CSSProperties = {
  margin: "0 0 14px 0",
  fontFamily: "Syne, sans-serif",
  fontSize: 18,
  color: "var(--ls-text)",
};
