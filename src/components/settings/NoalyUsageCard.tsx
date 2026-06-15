// =============================================================================
// NoalyUsageCard — compteur de consommation Noaly du mois (2026-06-15).
//
// Affiche, pour le coach courant, sa conso IA du mois en cours depuis
// `ai_usage_log` (appels + tokens + coût €). Lecture filtrée par user_id (la
// RLS autorise déjà : admin = tout, chacun = sa conso). Carte dans Paramètres.
// =============================================================================

import { useEffect, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { getSupabaseClient } from "../../services/supabaseClient";

interface Usage {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  costEur: number;
}

export function NoalyUsageCard() {
  const { currentUser } = useAppContext();
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const sb = await getSupabaseClient();
      if (!sb || !currentUser?.id) { setLoading(false); return; }
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { data, error } = await sb
        .from("ai_usage_log")
        .select("input_tokens, output_tokens, cost_eur")
        .eq("user_id", currentUser.id)
        .gte("created_at", monthStart);
      if (cancelled) return;
      if (error || !data) { setUsage({ calls: 0, inputTokens: 0, outputTokens: 0, costEur: 0 }); setLoading(false); return; }
      const agg = data.reduce<Usage>(
        (acc, r: { input_tokens: number | null; output_tokens: number | null; cost_eur: number | null }) => {
          acc.calls += 1;
          acc.inputTokens += r.input_tokens ?? 0;
          acc.outputTokens += r.output_tokens ?? 0;
          acc.costEur += Number(r.cost_eur ?? 0);
          return acc;
        },
        { calls: 0, inputTokens: 0, outputTokens: 0, costEur: 0 },
      );
      setUsage(agg);
      setLoading(false);
    }
    void load();
    return () => { cancelled = true; };
  }, [currentUser?.id]);

  const monthLabel = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date());
  const totalTokens = (usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0);

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <div aria-hidden="true" style={{ width: 30, height: 30, borderRadius: 9, flex: "0 0 auto", background: "linear-gradient(135deg, var(--ls-purple), var(--ls-teal))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>✨</div>
        <div>
          <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 15, color: "var(--ls-text)" }}>Noaly · ma conso</div>
          <div style={{ fontSize: 12, color: "var(--ls-text-muted)", textTransform: "capitalize" }}>{monthLabel}</div>
        </div>
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: "var(--ls-text-muted)", padding: "10px 0" }}>Chargement…</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 12 }}>
          <Stat label="Appels" value={(usage?.calls ?? 0).toLocaleString("fr-FR")} />
          <Stat label="Tokens" value={totalTokens.toLocaleString("fr-FR")} />
          <Stat label="Coût" value={`${(usage?.costEur ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`} accent />
        </div>
      )}

      <div style={{ fontSize: 11.5, color: "var(--ls-text-hint)", marginTop: 12, lineHeight: 1.45 }}>
        Chaque échange avec Noaly (assistant IA) est compté ici. Le coût est estimé d'après les tokens consommés sur le crédit IA.
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ background: "var(--ls-surface2)", borderRadius: 12, padding: "12px 10px", textAlign: "center" }}>
      <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 19, color: accent ? "var(--ls-gold)" : "var(--ls-text)", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ls-text-hint)", marginTop: 5, fontWeight: 600 }}>{label}</div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "var(--ls-surface)",
  border: "1px solid var(--ls-border)",
  borderRadius: 16,
  padding: "16px 18px",
};
