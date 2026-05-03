// =============================================================================
// FlexDashboardPage — FLEX Lor'Squad Phase B stub (2026-11-05)
//
// Placeholder du dashboard FLEX. Affiche le plan en cours + redirect vers
// /flex/onboarding si pas de plan. Phase C remplira cette page avec le
// check-in du jour (matin + soir).
// =============================================================================

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeading } from "../components/ui/PageHeading";
import { useAppContext } from "../context/AppContext";
import { getSupabaseClient } from "../services/supabaseClient";
import type { DistributorActionPlan } from "../types/flex";

export function FlexDashboardPage() {
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const userId = currentUser?.id ?? null;
  const [plan, setPlan] = useState<DistributorActionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);

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
      const { data, error: e } = await sb
        .from("distributor_action_plan")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled) return;
      if (e) {
        setError(e.message);
        setLoading(false);
        return;
      }
      if (!data) {
        navigate("/flex/onboarding", { replace: true });
        return;
      }
      setPlan(data as DistributorActionPlan);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, navigate]);

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

  if (loading) {
    return (
      <div style={{ padding: 40, color: "var(--ls-text-muted)" }}>
        Chargement…
      </div>
    );
  }
  if (error) {
    return (
      <div style={{ padding: 24, color: "var(--ls-coral)" }}>{error}</div>
    );
  }
  if (!plan) return null;

  const daysUntilDeadline = Math.ceil(
    (new Date(plan.target_deadline_date).getTime() - Date.now()) /
      (1000 * 60 * 60 * 24),
  );

  return (
    <div className="space-y-6" style={{ paddingBottom: 60 }}>
      <PageHeading
        eyebrow="FLEX Lor'Squad"
        title="Ton plan d'action"
        description={`${plan.monthly_revenue_target.toLocaleString("fr-FR")} €/mois · échéance dans ${Math.max(0, daysUntilDeadline)} jours.`}
      />

      <div
        style={{
          background: "var(--ls-surface)",
          border: "1px solid var(--ls-gold)",
          borderRadius: 16,
          padding: 24,
          boxShadow: "0 12px 40px color-mix(in srgb, var(--ls-gold) 14%, transparent)",
        }}
      >
        <h2 style={{ margin: 0, fontFamily: "Syne, sans-serif", fontSize: 20, color: "var(--ls-gold)" }}>
          Tes cibles
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginTop: 16 }}>
          <Tile label="Invitations / jour" value={plan.daily_invitations_target} />
          <Tile label="Conversations / jour" value={plan.daily_conversations_target} />
          <Tile label="Bilans / sem." value={plan.weekly_bilans_target} />
          <Tile label="Closings / sem." value={plan.weekly_closings_target} />
          <Tile label="Clients actifs visés" value={plan.monthly_active_clients_target} />
        </div>
      </div>

      <div
        style={{
          background: "var(--ls-surface)",
          border: "0.5px solid var(--ls-border)",
          borderRadius: 16,
          padding: 22,
        }}
      >
        <p style={{ margin: 0, color: "var(--ls-text-muted)", fontSize: 13 }}>
          🚧 Le check-in quotidien du soir arrive en Phase C. Pour l'instant
          ton plan est créé et tes cibles sont posées. Tu peux le réinitialiser
          à tout moment ci-dessous.
        </p>
      </div>

      <button
        type="button"
        onClick={handleReset}
        disabled={archiving}
        style={{
          background: "transparent",
          border: "0.5px solid var(--ls-border)",
          color: "var(--ls-text-muted)",
          padding: "10px 18px",
          borderRadius: 10,
          fontSize: 12,
          cursor: archiving ? "wait" : "pointer",
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        {archiving ? "Archivage…" : "↺ Recommencer mon plan"}
      </button>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        background: "var(--ls-surface2)",
        borderRadius: 12,
        padding: "14px 12px",
        textAlign: "center",
      }}
    >
      <div style={{ fontFamily: "Syne, sans-serif", fontSize: 28, fontWeight: 700, color: "var(--ls-text)" }}>
        {value}
      </div>
      <div style={{ fontSize: 10, color: "var(--ls-text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 4 }}>
        {label}
      </div>
    </div>
  );
}
