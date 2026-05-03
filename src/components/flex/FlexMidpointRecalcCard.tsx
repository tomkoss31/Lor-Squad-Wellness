// =============================================================================
// FlexMidpointRecalcCard — banner + modal recalc mi-parcours (V2.1, 2026-11-05)
//
// Détecte automatiquement quand le distri est à mi-parcours de son plan
// (entre 40% et 70% de la durée écoulée) ET que midpoint_recalculated_at
// est NULL → affiche un banner suggérant de recalibrer ses cibles.
//
// Le distri peut :
//   - Ouvrir une modal pour ajuster son objectif revenu mensuel et son
//     panier moyen retail
//   - Voir les nouvelles cibles calculées en live
//   - Valider → update du plan (toutes les cibles + midpoint_recalculated_at
//     + midpoint_revenue_target_adjusted) ou skip → set midpoint_recalculated_at
//     pour ne plus afficher le banner
// =============================================================================

import { useMemo, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";
import { computeFlexTargets } from "../../lib/flexCalculations";
import type { DistributorActionPlan } from "../../types/flex";
import { type HerbalifeRank, RANK_LABELS } from "../../types/domain";

interface Props {
  plan: DistributorActionPlan;
  userRank: HerbalifeRank;
  onUpdated: (updated: DistributorActionPlan) => void;
}

/** Renvoie le pourcentage de la durée écoulée (0-100). */
function progressPct(plan: DistributorActionPlan): number {
  const start = new Date(plan.created_at).getTime();
  const end = new Date(plan.target_deadline_date + "T23:59:59").getTime();
  const total = end - start;
  if (total <= 0) return 100;
  const elapsed = Date.now() - start;
  return Math.max(0, Math.min(100, (elapsed / total) * 100));
}

export function FlexMidpointRecalcCard({ plan, userRank, onUpdated }: Props) {
  const pct = progressPct(plan);
  const isMidpoint = !plan.midpoint_recalculated_at && pct >= 40 && pct <= 70;
  const [open, setOpen] = useState(false);

  if (!isMidpoint) return null;

  return (
    <>
      <div
        style={{
          background: "color-mix(in srgb, var(--ls-teal) 10%, var(--ls-surface))",
          border: "1px solid var(--ls-teal)",
          borderRadius: 14,
          padding: "14px 18px",
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1 1 240px", minWidth: 0 }}>
          <div style={{ fontFamily: "Syne, sans-serif", fontSize: 15, fontWeight: 700, color: "var(--ls-teal)", marginBottom: 4 }}>
            🎯 Tu es à mi-parcours ({Math.round(pct)} %)
          </div>
          <p style={{ margin: 0, fontSize: 12, color: "var(--ls-text-muted)", fontFamily: "DM Sans, sans-serif", lineHeight: 1.5 }}>
            Tes données réelles permettent d'ajuster tes cibles. Garde le même
            objectif si tu veux pousser, ou recalibre selon ton rythme effectif.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            padding: "10px 18px",
            borderRadius: 10,
            border: "none",
            background: "var(--ls-teal)",
            color: "var(--ls-bg)",
            fontFamily: "Syne, sans-serif",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Ajuster mes cibles
        </button>
      </div>

      {open && (
        <RecalcModal
          plan={plan}
          userRank={userRank}
          onClose={() => setOpen(false)}
          onUpdated={(p) => {
            onUpdated(p);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

// ─── Modal ──────────────────────────────────────────────────────────────────

function RecalcModal({
  plan,
  userRank,
  onClose,
  onUpdated,
}: {
  plan: DistributorActionPlan;
  userRank: HerbalifeRank;
  onClose: () => void;
  onUpdated: (p: DistributorActionPlan) => void;
}) {
  const [revenue, setRevenue] = useState(plan.monthly_revenue_target);
  const [basket, setBasket] = useState(plan.average_basket);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const breakdown = useMemo(
    () =>
      computeFlexTargets({
        monthlyRevenueTarget: revenue,
        averageBasket: basket,
        rank: userRank,
        startingClients: plan.starting_clients_count,
      }),
    [revenue, basket, userRank, plan.starting_clients_count],
  );

  async function handleSave(skip: boolean) {
    setSaving(true);
    setError(null);
    const sb = await getSupabaseClient();
    if (!sb) {
      setSaving(false);
      setError("Connexion Supabase indisponible");
      return;
    }
    const updates = skip
      ? {
          // Skip : on marque juste qu'on a vu le prompt mi-parcours pour
          // ne plus afficher le banner. Pas de change des cibles.
          midpoint_recalculated_at: new Date().toISOString(),
        }
      : {
          monthly_revenue_target: revenue,
          average_basket: basket,
          daily_invitations_target: breakdown.daily_invitations_target,
          daily_conversations_target: breakdown.daily_conversations_target,
          weekly_bilans_target: breakdown.weekly_bilans_target,
          weekly_closings_target: breakdown.weekly_closings_target,
          monthly_active_clients_target: breakdown.monthly_active_clients_target,
          midpoint_recalculated_at: new Date().toISOString(),
          midpoint_revenue_target_adjusted: revenue,
        };
    const { data, error: e } = await sb
      .from("distributor_action_plan")
      .update(updates)
      .eq("id", plan.id)
      .select()
      .single();
    setSaving(false);
    if (e) {
      setError(e.message);
      return;
    }
    if (data) onUpdated(data as DistributorActionPlan);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "color-mix(in srgb, var(--ls-bg) 80%, transparent)",
        backdropFilter: "blur(6px)",
        zIndex: 9000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          background: "var(--ls-surface)",
          border: "1px solid var(--ls-teal)",
          borderRadius: 18,
          padding: 26,
          maxWidth: 520,
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 24px 80px color-mix(in srgb, var(--ls-teal) 20%, transparent)",
        }}
      >
        <div style={{ fontSize: 11, fontFamily: "DM Sans, sans-serif", textTransform: "uppercase", letterSpacing: 1.4, color: "var(--ls-teal)", marginBottom: 6 }}>
          Recalibrage mi-parcours
        </div>
        <h2 style={{ margin: 0, fontFamily: "Syne, sans-serif", fontSize: 22, color: "var(--ls-text)", fontWeight: 700 }}>
          Ajuste tes cibles
        </h2>
        <p style={{ margin: "8px 0 22px 0", fontSize: 13, color: "var(--ls-text-muted)", fontFamily: "DM Sans, sans-serif", lineHeight: 1.55 }}>
          Rang actuel : <strong>{RANK_LABELS[userRank]}</strong>. Avec ces
          réglages, tu gagnes <strong style={{ color: "var(--ls-gold)" }}>{breakdown.net_per_client.toFixed(2)} €</strong> net par client.
        </p>

        <Field label="Objectif revenu mensuel" suffix="€/mois">
          <input
            type="range"
            min={100}
            max={5000}
            step={50}
            value={revenue}
            onChange={(e) => setRevenue(Number(e.target.value))}
            style={{ width: "100%", accentColor: "var(--ls-gold)" }}
          />
          <div style={{ fontFamily: "Syne, sans-serif", fontSize: 28, fontWeight: 700, color: "var(--ls-gold)", textAlign: "center", marginTop: 8 }}>
            {revenue.toLocaleString("fr-FR")} €
          </div>
        </Field>

        <Field label="Panier moyen client (retail)" suffix="€">
          <input
            type="range"
            min={50}
            max={500}
            step={5}
            value={basket}
            onChange={(e) => setBasket(Number(e.target.value))}
            style={{ width: "100%", accentColor: "var(--ls-teal)" }}
          />
          <div style={{ fontFamily: "Syne, sans-serif", fontSize: 22, fontWeight: 700, color: "var(--ls-teal)", textAlign: "center", marginTop: 8 }}>
            {basket} €
          </div>
        </Field>

        <div style={{ background: "var(--ls-surface2)", borderRadius: 12, padding: 14, marginTop: 16 }}>
          <div style={{ fontSize: 10, fontFamily: "DM Sans, sans-serif", textTransform: "uppercase", letterSpacing: 1.2, color: "var(--ls-gold)", marginBottom: 8 }}>
            Nouvelles cibles
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8 }}>
            <Tile label="Invit / jour" value={breakdown.daily_invitations_target} />
            <Tile label="Conv / jour" value={breakdown.daily_conversations_target} />
            <Tile label="Bilans / sem" value={breakdown.weekly_bilans_target} />
            <Tile label="Clos / sem" value={breakdown.weekly_closings_target} />
          </div>
        </div>

        {error && <div style={{ color: "var(--ls-coral)", fontSize: 12, marginTop: 10 }}>{error}</div>}

        <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => void handleSave(false)}
            disabled={saving}
            style={{
              flex: 1,
              padding: "12px 18px",
              borderRadius: 12,
              border: "none",
              background: saving ? "var(--ls-border)" : "var(--ls-teal)",
              color: "var(--ls-bg)",
              fontFamily: "Syne, sans-serif",
              fontSize: 14,
              fontWeight: 700,
              cursor: saving ? "wait" : "pointer",
              minWidth: 160,
            }}
          >
            {saving ? "…" : "✓ Recalculer mes cibles"}
          </button>
          <button
            type="button"
            onClick={() => void handleSave(true)}
            disabled={saving}
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              border: "0.5px solid var(--ls-border)",
              background: "transparent",
              color: "var(--ls-text-muted)",
              fontFamily: "DM Sans, sans-serif",
              fontSize: 12,
              cursor: saving ? "wait" : "pointer",
            }}
          >
            Garder identique
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              border: "0.5px solid var(--ls-border)",
              background: "transparent",
              color: "var(--ls-text-muted)",
              fontFamily: "DM Sans, sans-serif",
              fontSize: 12,
              cursor: saving ? "wait" : "pointer",
            }}
          >
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, suffix, children }: { label: string; suffix?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: "var(--ls-text-muted)", textTransform: "uppercase", letterSpacing: 0.5, fontFamily: "DM Sans, sans-serif" }}>
          {label}
        </span>
        {suffix && <span style={{ fontSize: 10, color: "var(--ls-text-muted)" }}>{suffix}</span>}
      </div>
      {children}
    </div>
  );
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontFamily: "Syne, sans-serif", fontSize: 22, fontWeight: 700, color: "var(--ls-text)" }}>
        {value}
      </div>
      <div style={{ fontSize: 9, color: "var(--ls-text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 }}>
        {label}
      </div>
    </div>
  );
}
