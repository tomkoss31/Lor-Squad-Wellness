// =============================================================================
// FlexTodayWidget — résumé FLEX visible direct sur /co-pilote (2026-11-05)
//
// 3 états :
//   1. Pas de plan → CTA "Configure ton FLEX" → /flex/onboarding
//   2. Plan + check-in du jour pas rempli → cibles du jour + CTA "Faire mon
//      check-in" → /flex
//   3. Plan + check-in rempli → 4 mini-tiles status + CTA "Voir le détail"
//
// Compact (~120-160 px de hauteur). Gold border pour ressortir comme
// "moteur de pilotage".
// =============================================================================

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { getSupabaseClient } from "../../services/supabaseClient";
import type {
  DailyActionCheckin,
  DistributorActionPlan,
  FlexKpiStatus,
} from "../../types/flex";
import { flexKpiStatus, FLEX_KPI_COLOR } from "../../types/flex";

function ymdParisToday(): string {
  const fmt = new Intl.DateTimeFormat("fr-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
}

interface State {
  loading: boolean;
  plan: DistributorActionPlan | null;
  todayCheckin: DailyActionCheckin | null;
}

export function FlexTodayWidget() {
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const userId = currentUser?.id ?? null;
  const [state, setState] = useState<State>({
    loading: true,
    plan: null,
    todayCheckin: null,
  });

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const sb = await getSupabaseClient();
      if (!sb) {
        if (!cancelled) setState({ loading: false, plan: null, todayCheckin: null });
        return;
      }
      const today = ymdParisToday();
      const [planRes, checkinRes] = await Promise.all([
        sb.from("distributor_action_plan").select("*").eq("user_id", userId).maybeSingle(),
        sb.from("daily_action_checkin").select("*").eq("user_id", userId).eq("date", today).maybeSingle(),
      ]);
      if (cancelled) return;
      setState({
        loading: false,
        plan: (planRes.data as DistributorActionPlan | null) ?? null,
        todayCheckin: (checkinRes.data as DailyActionCheckin | null) ?? null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (state.loading || !userId) return null;

  // ── État 1 : pas de plan ──
  if (!state.plan) {
    return (
      <Wrapper>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 240px", minWidth: 0 }}>
            <Eyebrow>FLEX Lor'Squad</Eyebrow>
            <h3 style={titleStyle}>Configure ton plan d'action 🎯</h3>
            <p style={subStyle}>
              5 questions pour calibrer tes cibles quotidiennes. Formule 5-3-1
              testée et calibrée France.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/flex/onboarding")}
            style={ctaStyle}
          >
            Démarrer →
          </button>
        </div>
      </Wrapper>
    );
  }

  const plan = state.plan;
  const checkin = state.todayCheckin;

  // ── État 2 : plan, pas de check-in aujourd'hui ──
  if (!checkin) {
    const dailyBilans = Math.ceil(plan.weekly_bilans_target / 7);
    const dailyClosings = Math.ceil(plan.weekly_closings_target / 7);
    return (
      <Wrapper>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <Eyebrow>FLEX · Aujourd'hui</Eyebrow>
            <h3 style={titleStyle}>Tes cibles du jour</h3>
          </div>
          <button
            type="button"
            onClick={() => navigate("/flex")}
            style={ctaStyle}
          >
            Check-in →
          </button>
        </div>
        <div style={tilesGrid}>
          <Tile label="Invitations" value={plan.daily_invitations_target} />
          <Tile label="Conversations" value={plan.daily_conversations_target} />
          <Tile label="Bilans" value={dailyBilans} />
          <Tile label="Closings" value={dailyClosings} />
        </div>
      </Wrapper>
    );
  }

  // ── État 3 : check-in rempli ──
  const items: Array<{ label: string; actual: number; target: number }> = [
    { label: "Invit", actual: checkin.invitations_sent, target: plan.daily_invitations_target },
    { label: "Conv", actual: checkin.new_conversations, target: plan.daily_conversations_target },
    { label: "Bilans", actual: checkin.bilans_scheduled, target: Math.ceil(plan.weekly_bilans_target / 7) },
    { label: "Clos", actual: checkin.closings_count, target: Math.ceil(plan.weekly_closings_target / 7) },
  ];
  return (
    <Wrapper>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
        <div>
          <Eyebrow>FLEX · Aujourd'hui</Eyebrow>
          <h3 style={titleStyle}>Check-in validé ✅</h3>
        </div>
        <button
          type="button"
          onClick={() => navigate("/flex")}
          style={ctaGhostStyle}
        >
          Voir le détail
        </button>
      </div>
      <div style={tilesGrid}>
        {items.map((it) => {
          const ratio = it.target > 0 ? (it.actual / it.target) * 100 : 100;
          const status: FlexKpiStatus = flexKpiStatus(ratio);
          const color = FLEX_KPI_COLOR[status];
          return (
            <div
              key={it.label}
              style={{
                background: "var(--ls-surface2)",
                borderRadius: 10,
                padding: "10px 8px",
                textAlign: "center",
                border: `0.5px solid ${color}`,
              }}
            >
              <div style={{ fontFamily: "Syne, sans-serif", fontSize: 18, fontWeight: 700, color }}>
                {it.actual}
                <span style={{ fontSize: 11, color: "var(--ls-text-muted)", fontWeight: 400 }}>
                  /{it.target}
                </span>
              </div>
              <div style={{ fontSize: 9, color: "var(--ls-text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 }}>
                {it.label}
              </div>
            </div>
          );
        })}
      </div>
    </Wrapper>
  );
}

// ─── Sous-composants ────────────────────────────────────────────────────────

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--ls-surface)",
        border: "1px solid var(--ls-gold)",
        borderRadius: 16,
        padding: 18,
        boxShadow: "0 8px 28px color-mix(in srgb, var(--ls-gold) 14%, transparent)",
      }}
    >
      {children}
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontFamily: "DM Sans, sans-serif",
        textTransform: "uppercase",
        letterSpacing: 1.2,
        color: "var(--ls-gold)",
        marginBottom: 4,
      }}
    >
      {children}
    </div>
  );
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        background: "var(--ls-surface2)",
        borderRadius: 10,
        padding: "10px 8px",
        textAlign: "center",
      }}
    >
      <div style={{ fontFamily: "Syne, sans-serif", fontSize: 22, fontWeight: 700, color: "var(--ls-text)" }}>
        {value}
      </div>
      <div style={{ fontSize: 9, color: "var(--ls-text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 }}>
        {label}
      </div>
    </div>
  );
}

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: "Syne, sans-serif",
  fontSize: 18,
  fontWeight: 700,
  color: "var(--ls-text)",
};

const subStyle: React.CSSProperties = {
  margin: "6px 0 0 0",
  fontSize: 12,
  color: "var(--ls-text-muted)",
  fontFamily: "DM Sans, sans-serif",
  lineHeight: 1.5,
};

const tilesGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 8,
};

const ctaStyle: React.CSSProperties = {
  padding: "10px 18px",
  borderRadius: 12,
  border: "none",
  background: "linear-gradient(135deg, var(--ls-gold), color-mix(in srgb, var(--ls-gold) 80%, var(--ls-coral)))",
  color: "var(--ls-bg)",
  fontFamily: "Syne, sans-serif",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const ctaGhostStyle: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 10,
  border: "0.5px solid var(--ls-border)",
  background: "transparent",
  color: "var(--ls-text-muted)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 12,
  cursor: "pointer",
};
