// =============================================================================
// FlexOnboardingPage — FLEX Lor'Squad Phase B (2026-11-05)
//
// Onboarding 6 questions du moteur de pilotage du distri. À la validation,
// insert dans distributor_action_plan + redirect vers /flex (dashboard).
//
// 6 questions :
//   1. Objectif revenu mensuel (slider 100→5000€, default 1500)
//   2. Panier moyen retail (slider 50→500€, default 150) — sert au calc net
//   3. Temps dispo/jour (radio 15/30/45/60/90/-1)
//   4. Combien de clients actifs aujourd'hui (number 0-200)
//   5. Tes créneaux dispo de la semaine (chips multi-jours, optionnel)
//   6. Date d'objectif (date picker, default +90j)
//
// Le rang Herbalife est lu depuis currentUser.currentRank (rempli via le
// pop-up RankSelectorModal forcé à la connexion). Combiné au panier, il
// donne le net par client (panier × marge 25/35/42/50%).
//
// Summary card sticky en bas : KPI calculés live via computeFlexTargets.
//
// Si un plan existe déjà (distributor_action_plan unique sur user_id), on
// redirect vers /flex. Le bouton "Recommencer" sur le dashboard appelle
// archive_flex_plan() et renvoie ici.
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeading } from "../components/ui/PageHeading";
import { useAppContext } from "../context/AppContext";
import { getSupabaseClient } from "../services/supabaseClient";
import {
  computeFlexTargets,
  estimateFlexDailyMinutes,
  FLEX_DEFAULT_BASKET,
} from "../lib/flexCalculations";
import type {
  DistributorActionPlanInsert,
  FlexAvailableSlot,
  FlexDailyTimeMinutes,
} from "../types/flex";
import { RANK_LABELS, type HerbalifeRank } from "../types/domain";

const TIME_OPTIONS: Array<{ value: FlexDailyTimeMinutes; label: string }> = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1 h" },
  { value: 90, label: "1 h 30" },
  { value: -1, label: "Variable" },
];

const DAYS = [
  { id: "monday", label: "Lun" },
  { id: "tuesday", label: "Mar" },
  { id: "wednesday", label: "Mer" },
  { id: "thursday", label: "Jeu" },
  { id: "friday", label: "Ven" },
  { id: "saturday", label: "Sam" },
  { id: "sunday", label: "Dim" },
] as const;

function ymdInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function FlexOnboardingPage() {
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const userId = currentUser?.id ?? null;

  const [revenue, setRevenue] = useState<number>(1500);
  const [averageBasket, setAverageBasket] = useState<number>(FLEX_DEFAULT_BASKET);
  const [dailyTime, setDailyTime] = useState<FlexDailyTimeMinutes>(60);
  const [startingClients, setStartingClients] = useState<number>(0);
  const [slots, setSlots] = useState<FlexAvailableSlot[]>([]);
  const [deadline, setDeadline] = useState<string>(ymdInDays(90));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasExistingPlan, setHasExistingPlan] = useState<boolean | null>(null);

  // Si plan existe déjà → redirect
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const sb = await getSupabaseClient();
      if (!sb) {
        setHasExistingPlan(false);
        return;
      }
      const { data, error: e } = await sb
        .from("distributor_action_plan")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled) return;
      if (e) {
        setHasExistingPlan(false);
        return;
      }
      if (data?.id) {
        setHasExistingPlan(true);
        navigate("/flex", { replace: true });
      } else {
        setHasExistingPlan(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, navigate]);

  const userRank: HerbalifeRank =
    (currentUser?.currentRank as HerbalifeRank | undefined) ?? "distributor_25";

  const breakdown = useMemo(
    () =>
      computeFlexTargets({
        monthlyRevenueTarget: revenue,
        averageBasket,
        rank: userRank,
        startingClients,
      }),
    [revenue, averageBasket, userRank, startingClients],
  );

  const estimateMin = useMemo(
    () => estimateFlexDailyMinutes(breakdown),
    [breakdown],
  );

  const realisticTime =
    dailyTime === -1 ? true : estimateMin <= dailyTime + 15;

  function toggleDay(dayId: string) {
    setSlots((prev) => {
      const exists = prev.find((s) => s.day === dayId);
      if (exists) return prev.filter((s) => s.day !== dayId);
      return [...prev, { day: dayId, start: "18:00", end: "20:00" }];
    });
  }

  function updateSlot(
    dayId: string,
    field: "start" | "end",
    value: string,
  ) {
    setSlots((prev) =>
      prev.map((s) => (s.day === dayId ? { ...s, [field]: value } : s)),
    );
  }

  async function handleSubmit() {
    if (!userId) {
      setError("Utilisateur non connecté");
      return;
    }
    setSaving(true);
    setError(null);

    const insert: DistributorActionPlanInsert = {
      user_id: userId,
      monthly_revenue_target: revenue,
      daily_time_minutes: dailyTime,
      starting_clients_count: startingClients,
      available_slots: slots,
      average_basket: averageBasket,
      target_deadline_date: deadline,
      daily_invitations_target: breakdown.daily_invitations_target,
      daily_conversations_target: breakdown.daily_conversations_target,
      weekly_bilans_target: breakdown.weekly_bilans_target,
      weekly_closings_target: breakdown.weekly_closings_target,
      monthly_active_clients_target: breakdown.monthly_active_clients_target,
    };

    const sb = await getSupabaseClient();
    if (!sb) {
      setSaving(false);
      setError("Connexion Supabase indisponible");
      return;
    }
    const { error: e } = await sb
      .from("distributor_action_plan")
      .insert(insert);
    setSaving(false);
    if (e) {
      setError(e.message);
      return;
    }
    navigate("/flex", { replace: true });
  }

  if (hasExistingPlan === null) {
    return (
      <div style={{ padding: 40, color: "var(--ls-text-muted)" }}>
        Chargement…
      </div>
    );
  }

  return (
    <div className="space-y-6" style={{ paddingBottom: 180 }}>
      <PageHeading
        eyebrow="FLEX Lor'Squad"
        title="Construis ton plan d'action"
        description={`6 questions pour calibrer tes cibles quotidiennes (formule 5-3-1). Ton rang actuel : ${RANK_LABELS[userRank]}.`}
      />

      {/* Question 1 — Objectif revenu */}
      <SectionCard
        index={1}
        title="Quel revenu mensuel tu vises ?"
        hint="Net dans ta poche, après marge retail (selon ton rang)."
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
          <span style={{ fontFamily: "Syne, sans-serif", fontSize: 40, fontWeight: 700, color: "var(--ls-gold)" }}>
            {revenue.toLocaleString("fr-FR")}
          </span>
          <span style={{ color: "var(--ls-text-muted)", fontSize: 18 }}>€/mois</span>
        </div>
        <input
          type="range"
          min={100}
          max={5000}
          step={50}
          value={revenue}
          onChange={(e) => setRevenue(Number(e.target.value))}
          style={{ width: "100%", accentColor: "var(--ls-gold)" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", color: "var(--ls-text-muted)", fontSize: 11, marginTop: 4 }}>
          <span>100 €</span>
          <span>5 000 €</span>
        </div>
      </SectionCard>

      {/* Question 2 — Panier moyen */}
      <SectionCard
        index={2}
        title="Ton panier moyen client (retail) ?"
        hint={`Ce que ton client paie en moyenne / mois. Avec ta marge ${breakdown.margin_pct}%, tu gagnes ${breakdown.net_per_client.toFixed(2)} € net / client.`}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
          <span style={{ fontFamily: "Syne, sans-serif", fontSize: 40, fontWeight: 700, color: "var(--ls-teal)" }}>
            {averageBasket.toLocaleString("fr-FR")}
          </span>
          <span style={{ color: "var(--ls-text-muted)", fontSize: 18 }}>€ retail</span>
        </div>
        <input
          type="range"
          min={50}
          max={500}
          step={5}
          value={averageBasket}
          onChange={(e) => setAverageBasket(Number(e.target.value))}
          style={{ width: "100%", accentColor: "var(--ls-teal)" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", color: "var(--ls-text-muted)", fontSize: 11, marginTop: 4 }}>
          <span>50 €</span>
          <span>500 €</span>
        </div>
      </SectionCard>

      {/* Question 3 — Temps dispo */}
      <SectionCard
        index={3}
        title="Combien de temps tu peux y consacrer par jour ?"
        hint="Sois réaliste — l'app calibre les cibles selon ce temps."
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 10 }}>
          {TIME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDailyTime(opt.value)}
              style={{
                padding: "14px 10px",
                borderRadius: 12,
                border: dailyTime === opt.value
                  ? "1px solid var(--ls-gold)"
                  : "0.5px solid var(--ls-border)",
                background: dailyTime === opt.value
                  ? "color-mix(in srgb, var(--ls-gold) 12%, var(--ls-surface2))"
                  : "var(--ls-surface)",
                color: "var(--ls-text)",
                fontFamily: "DM Sans, sans-serif",
                fontSize: 14,
                fontWeight: dailyTime === opt.value ? 600 : 400,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </SectionCard>

      {/* Question 4 — Clients actuels */}
      <SectionCard
        index={4}
        title="Combien de clients actifs aujourd'hui ?"
        hint="Ceux qui consomment encore régulièrement (commande au moins 1×/mois)."
      >
        <input
          type="number"
          min={0}
          max={500}
          value={startingClients}
          onChange={(e) => setStartingClients(Math.max(0, Math.min(500, Number(e.target.value) || 0)))}
          style={{
            width: 120,
            padding: "12px 14px",
            borderRadius: 10,
            border: "0.5px solid var(--ls-border)",
            background: "var(--ls-surface2)",
            color: "var(--ls-text)",
            fontFamily: "Syne, sans-serif",
            fontSize: 22,
            fontWeight: 600,
            textAlign: "center",
          }}
        />
      </SectionCard>

      {/* Question 5 — Créneaux dispo */}
      <SectionCard
        index={5}
        title="Tes créneaux dispo dans la semaine"
        hint="Optionnel — sert à programmer les bilans. Tu peux ajuster plus tard."
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
          {DAYS.map((d) => {
            const active = slots.some((s) => s.day === d.id);
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => toggleDay(d.id)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 999,
                  border: active ? "1px solid var(--ls-teal)" : "0.5px solid var(--ls-border)",
                  background: active
                    ? "color-mix(in srgb, var(--ls-teal) 14%, transparent)"
                    : "transparent",
                  color: active ? "var(--ls-teal)" : "var(--ls-text-muted)",
                  fontSize: 13,
                  fontFamily: "DM Sans, sans-serif",
                  cursor: "pointer",
                }}
              >
                {d.label}
              </button>
            );
          })}
        </div>
        {slots.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {slots.map((s) => {
              const day = DAYS.find((dd) => dd.id === s.day);
              return (
                <div
                  key={s.day}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "60px 1fr 1fr",
                    gap: 8,
                    alignItems: "center",
                    padding: "8px 12px",
                    background: "var(--ls-surface2)",
                    borderRadius: 8,
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{day?.label}</span>
                  <input
                    type="time"
                    value={s.start}
                    onChange={(e) => updateSlot(s.day, "start", e.target.value)}
                    style={{
                      padding: "6px 8px",
                      borderRadius: 6,
                      border: "0.5px solid var(--ls-border)",
                      background: "var(--ls-surface)",
                      color: "var(--ls-text)",
                      fontSize: 13,
                    }}
                  />
                  <input
                    type="time"
                    value={s.end}
                    onChange={(e) => updateSlot(s.day, "end", e.target.value)}
                    style={{
                      padding: "6px 8px",
                      borderRadius: 6,
                      border: "0.5px solid var(--ls-border)",
                      background: "var(--ls-surface)",
                      color: "var(--ls-text)",
                      fontSize: 13,
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* Question 6 — Deadline */}
      <SectionCard
        index={6}
        title="D'ici quand tu veux atteindre cet objectif ?"
        hint="On recalcule les cibles à mi-parcours automatiquement."
      >
        <input
          type="date"
          value={deadline}
          min={ymdInDays(14)}
          max={ymdInDays(365)}
          onChange={(e) => setDeadline(e.target.value)}
          style={{
            padding: "12px 14px",
            borderRadius: 10,
            border: "0.5px solid var(--ls-border)",
            background: "var(--ls-surface2)",
            color: "var(--ls-text)",
            fontFamily: "DM Sans, sans-serif",
            fontSize: 14,
          }}
        />
      </SectionCard>

      {/* Summary sticky */}
      <div
        style={{
          position: "sticky",
          bottom: 16,
          background: "var(--ls-surface)",
          border: "1px solid var(--ls-gold)",
          borderRadius: 16,
          padding: 18,
          boxShadow: "0 12px 40px color-mix(in srgb, var(--ls-gold) 18%, transparent)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
          <span style={{ fontFamily: "Syne, sans-serif", fontSize: 16, fontWeight: 700, color: "var(--ls-gold)" }}>
            Tes cibles calculées
          </span>
          <span style={{ fontSize: 11, color: "var(--ls-text-muted)" }}>
            ~{breakdown.needed_new_clients_per_month} nouveaux clients / mois
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 14 }}>
          <KpiTile label="Invitations / jour" value={breakdown.daily_invitations_target} />
          <KpiTile label="Conversations / jour" value={breakdown.daily_conversations_target} />
          <KpiTile label="Bilans / sem." value={breakdown.weekly_bilans_target} />
          <KpiTile label="Clos / sem." value={breakdown.weekly_closings_target} />
        </div>
        {!realisticTime && dailyTime !== -1 && (
          <div
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              background: "color-mix(in srgb, var(--ls-coral) 12%, transparent)",
              border: "0.5px solid var(--ls-coral)",
              color: "var(--ls-coral)",
              fontSize: 12,
              marginBottom: 12,
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            ⚠️ Estimation : ~{estimateMin} min/jour pour tenir ces cibles. Tu as
            indiqué {dailyTime} min — soit tu réduis l'objectif revenu, soit tu
            ajoutes du temps.
          </div>
        )}
        {error && (
          <div style={{ color: "var(--ls-coral)", fontSize: 12, marginBottom: 10 }}>{error}</div>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || !userId}
          style={{
            width: "100%",
            padding: "14px 20px",
            borderRadius: 12,
            border: "none",
            background: saving
              ? "var(--ls-border)"
              : "linear-gradient(135deg, var(--ls-gold), color-mix(in srgb, var(--ls-gold) 80%, var(--ls-coral)))",
            color: "var(--ls-bg)",
            fontFamily: "Syne, sans-serif",
            fontSize: 15,
            fontWeight: 700,
            cursor: saving ? "wait" : "pointer",
          }}
        >
          {saving ? "Enregistrement…" : "🚀 Lancer mon plan FLEX"}
        </button>
      </div>
    </div>
  );
}

interface SectionCardProps {
  index: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
}

function SectionCard({ index, title, hint, children }: SectionCardProps) {
  return (
    <div
      style={{
        background: "var(--ls-surface)",
        border: "0.5px solid var(--ls-border)",
        borderRadius: 16,
        padding: 22,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <span
          style={{
            width: 26,
            height: 26,
            borderRadius: 999,
            background: "color-mix(in srgb, var(--ls-gold) 18%, transparent)",
            color: "var(--ls-gold)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Syne, sans-serif",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {index}
        </span>
        <h3 style={{ margin: 0, fontFamily: "Syne, sans-serif", fontSize: 18, color: "var(--ls-text)" }}>
          {title}
        </h3>
      </div>
      {hint && (
        <p style={{ margin: "0 0 14px 36px", fontSize: 12, color: "var(--ls-text-muted)" }}>
          {hint}
        </p>
      )}
      <div style={{ paddingLeft: 36 }}>{children}</div>
    </div>
  );
}

function KpiTile({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        background: "var(--ls-surface2)",
        borderRadius: 10,
        padding: "10px 12px",
        textAlign: "center",
      }}
    >
      <div style={{ fontFamily: "Syne, sans-serif", fontSize: 24, fontWeight: 700, color: "var(--ls-text)" }}>
        {value}
      </div>
      <div style={{ fontSize: 10, color: "var(--ls-text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 }}>
        {label}
      </div>
    </div>
  );
}

// Note pour V2 : averageBasket pourra être pré-rempli depuis les
// pv_transactions du distri (moyenne 3 derniers mois) au lieu du défaut.
