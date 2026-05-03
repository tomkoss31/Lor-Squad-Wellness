// =============================================================================
// FlexDashboardPage — FLEX Lor'Squad Phase C (2026-11-05)
//
// Hub quotidien du distri :
//   - Header plan (revenu cible + jours restants)
//   - Section "Aujourd'hui" : check-in du soir inline (4 KPI + 2 réflexions)
//     - Si pas encore rempli : formulaire de saisie
//     - Si rempli : récap avec status vs cibles
//   - Section "Cette semaine" : progressions vs cibles hebdo (4 KPI)
//   - Bouton Recommencer plan (archive + onboarding)
//
// Date du jour : Europe/Paris (le distri voit le bon "aujourd'hui").
// Upsert via unique (user_id, date) pour permettre l'édition.
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeading } from "../components/ui/PageHeading";
import { FlexHistoryCard } from "../components/flex/FlexHistoryCard";
import { FlexMidpointRecalcCard } from "../components/flex/FlexMidpointRecalcCard";
import { useAppContext } from "../context/AppContext";
import type { HerbalifeRank } from "../types/domain";
import { getSupabaseClient } from "../services/supabaseClient";
import type {
  DailyActionCheckin,
  DistributorActionPlan,
  FlexKpiStatus,
} from "../types/flex";
import { flexKpiStatus, FLEX_KPI_COLOR } from "../types/flex";

/** Date du jour en heure de Paris au format YYYY-MM-DD. */
function ymdParisToday(): string {
  const fmt = new Intl.DateTimeFormat("fr-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date()); // fr-CA → "YYYY-MM-DD"
}

/** Lundi de la semaine en cours (Paris) au format YYYY-MM-DD. */
function ymdParisMonday(): string {
  const todayStr = ymdParisToday();
  const today = new Date(todayStr + "T00:00:00");
  const dow = today.getDay(); // 0 = dim, 1 = lun, ..., 6 = sam
  const diff = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
}

interface CheckinDraft {
  invitations_sent: number;
  new_conversations: number;
  bilans_scheduled: number;
  closings_count: number;
  daily_win: string;
  improvement_note: string;
}

const EMPTY_DRAFT: CheckinDraft = {
  invitations_sent: 0,
  new_conversations: 0,
  bilans_scheduled: 0,
  closings_count: 0,
  daily_win: "",
  improvement_note: "",
};

export function FlexDashboardPage() {
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const userId = currentUser?.id ?? null;
  const today = ymdParisToday();
  const monday = ymdParisMonday();

  const [plan, setPlan] = useState<DistributorActionPlan | null>(null);
  const [todayCheckin, setTodayCheckin] = useState<DailyActionCheckin | null>(null);
  const [weekCheckins, setWeekCheckins] = useState<DailyActionCheckin[]>([]);
  const [draft, setDraft] = useState<CheckinDraft>(EMPTY_DRAFT);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [togglingPause, setTogglingPause] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const sb = await getSupabaseClient();
      if (!sb) {
        setError("Connexion Supabase indisponible");
        setLoading(false);
        return;
      }
      const [planRes, todayRes, weekRes] = await Promise.all([
        sb.from("distributor_action_plan").select("*").eq("user_id", userId).maybeSingle(),
        sb.from("daily_action_checkin").select("*").eq("user_id", userId).eq("date", today).maybeSingle(),
        sb.from("daily_action_checkin").select("*").eq("user_id", userId).gte("date", monday).order("date", { ascending: true }),
      ]);
      if (cancelled) return;

      if (planRes.error) {
        setError(planRes.error.message);
        setLoading(false);
        return;
      }
      if (!planRes.data) {
        navigate("/flex/onboarding", { replace: true });
        return;
      }
      setPlan(planRes.data as DistributorActionPlan);

      if (todayRes.data) {
        const c = todayRes.data as DailyActionCheckin;
        setTodayCheckin(c);
        setDraft({
          invitations_sent: c.invitations_sent,
          new_conversations: c.new_conversations,
          bilans_scheduled: c.bilans_scheduled,
          closings_count: c.closings_count,
          daily_win: c.daily_win ?? "",
          improvement_note: c.improvement_note ?? "",
        });
      }
      if (weekRes.data) {
        setWeekCheckins(weekRes.data as DailyActionCheckin[]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, navigate, today, monday]);

  // Agrégats semaine
  const weekTotals = useMemo(() => {
    const sum = (k: keyof Pick<DailyActionCheckin, "invitations_sent" | "new_conversations" | "bilans_scheduled" | "closings_count">) =>
      weekCheckins.reduce((acc, c) => acc + (c[k] ?? 0), 0);
    return {
      invitations: sum("invitations_sent"),
      conversations: sum("new_conversations"),
      bilans: sum("bilans_scheduled"),
      closings: sum("closings_count"),
    };
  }, [weekCheckins]);

  const weekTargets = useMemo(() => {
    if (!plan) return { invitations: 0, conversations: 0, bilans: 0, closings: 0 };
    return {
      invitations: plan.daily_invitations_target * 7,
      conversations: plan.daily_conversations_target * 7,
      bilans: plan.weekly_bilans_target,
      closings: plan.weekly_closings_target,
    };
  }, [plan]);

  // Streak (jours consécutifs check-in remplis se terminant à hier ou aujourd'hui)
  const streak = useMemo(() => computeStreak(weekCheckins, today), [weekCheckins, today]);

  async function handleSaveCheckin() {
    if (!userId || !plan) return;
    setSaving(true);
    setError(null);
    const sb = await getSupabaseClient();
    if (!sb) {
      setSaving(false);
      setError("Connexion Supabase indisponible");
      return;
    }
    const payload = {
      user_id: userId,
      date: today,
      invitations_sent: clamp(draft.invitations_sent, 0, 200),
      new_conversations: clamp(draft.new_conversations, 0, 100),
      bilans_scheduled: clamp(draft.bilans_scheduled, 0, 50),
      closings_count: clamp(draft.closings_count, 0, 50),
      daily_win: draft.daily_win.trim() || null,
      improvement_note: draft.improvement_note.trim() || null,
    };
    const { data, error: e } = await sb
      .from("daily_action_checkin")
      .upsert(payload, { onConflict: "user_id,date" })
      .select()
      .single();
    setSaving(false);
    if (e) {
      setError(e.message);
      return;
    }
    if (data) {
      const newCheckin = data as DailyActionCheckin;
      setTodayCheckin(newCheckin);
      // Update week
      setWeekCheckins((prev) => {
        const filtered = prev.filter((c) => c.date !== today);
        return [...filtered, newCheckin].sort((a, b) => a.date.localeCompare(b.date));
      });
      setEditing(false);
    }
  }

  async function handleReset() {
    const ok = window.confirm(
      "Archiver ton plan actuel et en recréer un nouveau ?\n\nTon historique de check-ins est conservé.",
    );
    if (!ok) return;
    setArchiving(true);
    const sb = await getSupabaseClient();
    if (!sb) {
      setArchiving(false);
      setError("Connexion Supabase indisponible");
      return;
    }
    const { error: e } = await sb.rpc("archive_flex_plan", {
      p_reset_reason: "manual_reset",
    });
    setArchiving(false);
    if (e) {
      setError(e.message);
      return;
    }
    navigate("/flex/onboarding", { replace: true });
  }

  async function handleTogglePause() {
    if (!plan) return;
    setTogglingPause(true);
    setError(null);
    const sb = await getSupabaseClient();
    if (!sb) {
      setTogglingPause(false);
      setError("Connexion Supabase indisponible");
      return;
    }
    const newPaused = !plan.is_paused;
    const { data, error: e } = await sb
      .from("distributor_action_plan")
      .update({
        is_paused: newPaused,
        paused_at: newPaused ? new Date().toISOString() : null,
      })
      .eq("id", plan.id)
      .select()
      .single();
    setTogglingPause(false);
    if (e) {
      setError(e.message);
      return;
    }
    if (data) setPlan(data as DistributorActionPlan);
  }

  if (loading) {
    return <div style={{ padding: 40, color: "var(--ls-text-muted)" }}>Chargement…</div>;
  }
  if (error && !plan) {
    return <div style={{ padding: 24, color: "var(--ls-coral)" }}>{error}</div>;
  }
  if (!plan) return null;

  const daysUntilDeadline = Math.ceil(
    (new Date(plan.target_deadline_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  const showForm = !todayCheckin || editing;

  return (
    <div className="space-y-6" style={{ paddingBottom: 60 }}>
      <PageHeading
        eyebrow="FLEX Lor'Squad"
        title="Ton pilotage du jour"
        description={`Objectif ${plan.monthly_revenue_target.toLocaleString("fr-FR")} €/mois · échéance dans ${Math.max(0, daysUntilDeadline)} jours${streak > 0 ? ` · 🔥 ${streak} jour${streak > 1 ? "s" : ""} consécutif${streak > 1 ? "s" : ""}` : ""}`}
      />

      {/* V2.1 — Banner mi-parcours (auto-affiché entre 40-70% durée écoulée). */}
      <FlexMidpointRecalcCard
        plan={plan}
        userRank={(currentUser?.currentRank as HerbalifeRank | undefined) ?? "distributor_25"}
        onUpdated={(updated) => setPlan(updated)}
      />

      {/* AUJOURD'HUI : check-in */}
      <Card>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontFamily: "Syne, sans-serif", fontSize: 18, color: "var(--ls-text)" }}>
            {showForm ? "Ton check-in du jour" : "Tu as déjà rempli aujourd'hui ✅"}
          </h2>
          {todayCheckin && !editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              style={btnGhost}
            >
              Modifier
            </button>
          )}
        </div>

        {showForm ? (
          <CheckinForm
            draft={draft}
            setDraft={setDraft}
            plan={plan}
            saving={saving}
            error={error}
            onSave={handleSaveCheckin}
            onCancel={todayCheckin ? () => {
              const c = todayCheckin;
              setDraft({
                invitations_sent: c.invitations_sent,
                new_conversations: c.new_conversations,
                bilans_scheduled: c.bilans_scheduled,
                closings_count: c.closings_count,
                daily_win: c.daily_win ?? "",
                improvement_note: c.improvement_note ?? "",
              });
              setEditing(false);
            } : undefined}
          />
        ) : todayCheckin ? (
          <CheckinSummary checkin={todayCheckin} plan={plan} />
        ) : null}
      </Card>

      {/* CETTE SEMAINE */}
      <Card>
        <h2 style={{ margin: "0 0 14px 0", fontFamily: "Syne, sans-serif", fontSize: 18, color: "var(--ls-text)" }}>
          Cette semaine
        </h2>
        <ProgressRow label="Invitations" actual={weekTotals.invitations} target={weekTargets.invitations} />
        <ProgressRow label="Conversations" actual={weekTotals.conversations} target={weekTargets.conversations} />
        <ProgressRow label="Bilans" actual={weekTotals.bilans} target={weekTargets.bilans} />
        <ProgressRow label="Closings" actual={weekTotals.closings} target={weekTargets.closings} />
        <p style={{ margin: "12px 0 0 0", fontSize: 11, color: "var(--ls-text-muted)" }}>
          {weekCheckins.length} check-in{weekCheckins.length > 1 ? "s" : ""} sur {currentDayOfWeek()} jours cette semaine
        </p>
      </Card>

      {/* Phase D : récap 4 semaines + cumul mensuel via RPC. */}
      <FlexHistoryCard userId={userId!} />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={handleTogglePause}
          disabled={togglingPause}
          style={btnGhost}
          title={plan.is_paused ? "Reprendre ton plan FLEX" : "Mettre ton plan en pause (vacances, etc.)"}
        >
          {togglingPause ? "…" : plan.is_paused ? "▶ Reprendre mon plan" : "⏸ Mettre en pause"}
        </button>
        <button type="button" onClick={handleReset} disabled={archiving} style={btnGhost}>
          {archiving ? "Archivage…" : "↺ Recommencer mon plan"}
        </button>
      </div>
      {plan.is_paused && (
        <div
          style={{
            background: "color-mix(in srgb, var(--ls-text-muted) 8%, transparent)",
            border: "0.5px dashed var(--ls-border)",
            borderRadius: 12,
            padding: "10px 14px",
            color: "var(--ls-text-muted)",
            fontSize: 12,
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          ⏸ Plan en pause depuis le{" "}
          {plan.paused_at
            ? new Date(plan.paused_at).toLocaleDateString("fr-FR")
            : "—"}
          . Tu ne reçois plus les notifs FLEX et tu n'apparais pas dans la
          drift list. Reprends quand tu veux.
        </div>
      )}
    </div>
  );
}

// ─── Sous-composants ────────────────────────────────────────────────────────

function CheckinForm({
  draft,
  setDraft,
  plan,
  saving,
  error,
  onSave,
  onCancel,
}: {
  draft: CheckinDraft;
  setDraft: (d: CheckinDraft) => void;
  plan: DistributorActionPlan;
  saving: boolean;
  error: string | null;
  onSave: () => void;
  onCancel?: () => void;
}) {
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 16 }}>
        <KpiInput
          label="Invitations envoyées"
          value={draft.invitations_sent}
          target={plan.daily_invitations_target}
          onChange={(v) => setDraft({ ...draft, invitations_sent: v })}
        />
        <KpiInput
          label="Conversations"
          value={draft.new_conversations}
          target={plan.daily_conversations_target}
          onChange={(v) => setDraft({ ...draft, new_conversations: v })}
        />
        <KpiInput
          label="Bilans posés"
          value={draft.bilans_scheduled}
          target={Math.ceil(plan.weekly_bilans_target / 7)}
          onChange={(v) => setDraft({ ...draft, bilans_scheduled: v })}
        />
        <KpiInput
          label="Closings"
          value={draft.closings_count}
          target={Math.ceil(plan.weekly_closings_target / 7)}
          onChange={(v) => setDraft({ ...draft, closings_count: v })}
        />
      </div>

      <label style={fieldLabel}>
        ✨ Ta victoire du jour <span style={{ color: "var(--ls-text-muted)", fontSize: 11 }}>(optionnel)</span>
      </label>
      <textarea
        value={draft.daily_win}
        onChange={(e) => setDraft({ ...draft, daily_win: e.target.value.slice(0, 500) })}
        rows={2}
        placeholder="Quelque chose qui a bien marché aujourd'hui ?"
        style={textareaStyle}
      />

      <label style={fieldLabel}>
        🔧 À améliorer demain <span style={{ color: "var(--ls-text-muted)", fontSize: 11 }}>(optionnel)</span>
      </label>
      <textarea
        value={draft.improvement_note}
        onChange={(e) => setDraft({ ...draft, improvement_note: e.target.value.slice(0, 500) })}
        rows={2}
        placeholder="Ce que tu peux ajuster pour demain ?"
        style={textareaStyle}
      />

      {error && <div style={{ color: "var(--ls-coral)", fontSize: 12, marginTop: 8 }}>{error}</div>}

      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          style={{
            flex: 1,
            padding: "12px 18px",
            borderRadius: 12,
            border: "none",
            background: saving
              ? "var(--ls-border)"
              : "linear-gradient(135deg, var(--ls-gold), color-mix(in srgb, var(--ls-gold) 80%, var(--ls-coral)))",
            color: "var(--ls-bg)",
            fontFamily: "Syne, sans-serif",
            fontSize: 14,
            fontWeight: 700,
            cursor: saving ? "wait" : "pointer",
          }}
        >
          {saving ? "Enregistrement…" : "💪 Valider mon check-in"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} style={btnGhost}>
            Annuler
          </button>
        )}
      </div>
    </div>
  );
}

function CheckinSummary({ checkin, plan }: { checkin: DailyActionCheckin; plan: DistributorActionPlan }) {
  const items: Array<{ label: string; actual: number; target: number }> = [
    { label: "Invitations", actual: checkin.invitations_sent, target: plan.daily_invitations_target },
    { label: "Conversations", actual: checkin.new_conversations, target: plan.daily_conversations_target },
    { label: "Bilans", actual: checkin.bilans_scheduled, target: Math.ceil(plan.weekly_bilans_target / 7) },
    { label: "Closings", actual: checkin.closings_count, target: Math.ceil(plan.weekly_closings_target / 7) },
  ];
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: checkin.daily_win || checkin.improvement_note ? 16 : 0 }}>
        {items.map((it) => {
          const ratio = it.target > 0 ? (it.actual / it.target) * 100 : 100;
          const status = flexKpiStatus(ratio);
          return (
            <div
              key={it.label}
              style={{
                background: "var(--ls-surface2)",
                borderRadius: 10,
                padding: "12px 10px",
                textAlign: "center",
                border: `0.5px solid ${FLEX_KPI_COLOR[status]}`,
              }}
            >
              <div style={{ fontFamily: "Syne, sans-serif", fontSize: 22, fontWeight: 700, color: FLEX_KPI_COLOR[status] }}>
                {it.actual}
                <span style={{ fontSize: 12, color: "var(--ls-text-muted)", fontWeight: 400 }}>
                  /{it.target}
                </span>
              </div>
              <div style={{ fontSize: 10, color: "var(--ls-text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 }}>
                {it.label}
              </div>
            </div>
          );
        })}
      </div>
      {checkin.daily_win && (
        <div style={summaryNote("var(--ls-gold)")}>
          <strong>✨ Victoire :</strong> {checkin.daily_win}
        </div>
      )}
      {checkin.improvement_note && (
        <div style={summaryNote("var(--ls-teal)")}>
          <strong>🔧 À améliorer :</strong> {checkin.improvement_note}
        </div>
      )}
    </div>
  );
}

function ProgressRow({ label, actual, target }: { label: string; actual: number; target: number }) {
  const ratio = target > 0 ? (actual / target) * 100 : 0;
  const cappedWidth = Math.min(100, ratio);
  const status: FlexKpiStatus = flexKpiStatus(ratio);
  const color = FLEX_KPI_COLOR[status];
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontFamily: "DM Sans, sans-serif", color: "var(--ls-text)" }}>{label}</span>
        <span style={{ fontSize: 12, color: "var(--ls-text-muted)" }}>
          <strong style={{ color, fontFamily: "Syne, sans-serif", fontSize: 14 }}>{actual}</strong> / {target} <span style={{ color }}>({Math.round(ratio)}%)</span>
        </span>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: "var(--ls-surface2)", overflow: "hidden" }}>
        <div style={{ width: `${cappedWidth}%`, height: "100%", background: color, transition: "width 0.4s ease" }} />
      </div>
    </div>
  );
}

function KpiInput({
  label,
  value,
  target,
  onChange,
}: {
  label: string;
  value: number;
  target: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, color: "var(--ls-text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label} <span style={{ color: "var(--ls-text-muted)" }}>· cible {target}</span>
      </label>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 10,
          border: "0.5px solid var(--ls-border)",
          background: "var(--ls-surface2)",
          color: "var(--ls-text)",
          fontFamily: "Syne, sans-serif",
          fontSize: 18,
          fontWeight: 600,
          textAlign: "center",
        }}
      />
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--ls-surface)",
        border: "0.5px solid var(--ls-border)",
        borderRadius: 16,
        padding: 22,
      }}
    >
      {children}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}

function currentDayOfWeek(): number {
  const dow = new Date(ymdParisToday() + "T12:00:00").getDay();
  return dow === 0 ? 7 : dow;
}

function computeStreak(checkins: DailyActionCheckin[], today: string): number {
  if (checkins.length === 0) return 0;
  // Tri desc
  const sorted = [...checkins].map((c) => c.date).sort((a, b) => b.localeCompare(a));
  // Le streak inclut aujourd'hui s'il existe, sinon part d'hier
  let cursor = sorted[0];
  if (cursor !== today) {
    const yest = shiftDate(today, -1);
    if (cursor !== yest) return 0;
  }
  let count = 1;
  for (let i = 1; i < sorted.length; i++) {
    const expected = shiftDate(cursor, -1);
    if (sorted[i] === expected) {
      count++;
      cursor = sorted[i];
    } else {
      break;
    }
  }
  return count;
}

function shiftDate(ymd: string, days: number): string {
  const d = new Date(ymd + "T00:00:00");
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── Styles partagés ────────────────────────────────────────────────────────

const btnGhost: React.CSSProperties = {
  background: "transparent",
  border: "0.5px solid var(--ls-border)",
  color: "var(--ls-text-muted)",
  padding: "10px 16px",
  borderRadius: 10,
  fontSize: 12,
  cursor: "pointer",
  fontFamily: "DM Sans, sans-serif",
};

const fieldLabel: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "var(--ls-text-muted)",
  marginBottom: 6,
  marginTop: 14,
  fontFamily: "DM Sans, sans-serif",
  textTransform: "uppercase",
  letterSpacing: 0.5,
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "0.5px solid var(--ls-border)",
  background: "var(--ls-surface2)",
  color: "var(--ls-text)",
  fontFamily: "DM Sans, sans-serif",
  fontSize: 13,
  resize: "vertical",
};

function summaryNote(color: string): React.CSSProperties {
  return {
    background: `color-mix(in srgb, ${color} 10%, transparent)`,
    border: `0.5px solid ${color}`,
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 13,
    fontFamily: "DM Sans, sans-serif",
    color: "var(--ls-text)",
    marginBottom: 8,
  };
}
