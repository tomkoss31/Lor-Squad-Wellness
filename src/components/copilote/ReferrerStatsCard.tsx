// =============================================================================
// ReferrerStatsCard — V2 funnel business stats Co-pilote (chantier 2026-11-07)
// =============================================================================
//
// Affiche les stats des leads attribues au coach via referrer_user_id sur le
// mois courant. Source des leads :
//   - opportunite : page educative
//   - simulateur : page interactive avec calcul plan
//   - welcome_page : form direct depuis la 3e card Welcome (avant le redirect)
//
// Card masquee si aucun lead ce mois (pas de spam visuel).
// =============================================================================

import { useEffect, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { getSupabaseClient } from "../../services/supabaseClient";

interface Stats {
  leads_total: number;
  leads_new: number;
  leads_contacted: number;
  leads_converted: number;
  leads_lost: number;
  source_opportunite: number;
  source_simulateur: number;
  source_other: number;
}

export function ReferrerStatsCard() {
  const { currentUser } = useAppContext();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.id) return;
    let cancelled = false;
    void (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        const { data, error } = await sb.rpc("get_referrer_stats", {
          p_user_id: currentUser.id,
        });
        if (cancelled) return;
        if (error) {
          console.warn("[ReferrerStatsCard] RPC error", error);
          setStats(null);
        } else {
          const row = Array.isArray(data) && data.length > 0 ? (data[0] as Stats) : null;
          setStats(row);
        }
      } catch (err) {
        console.warn("[ReferrerStatsCard] fetch failed", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id]);

  if (loading || !stats || stats.leads_total === 0) return null;

  const conversionPct =
    stats.leads_total > 0 ? Math.round((stats.leads_converted / stats.leads_total) * 100) : 0;

  return (
    <div
      style={{
        padding: 18,
        borderRadius: 18,
        background:
          "linear-gradient(135deg, color-mix(in srgb, #10B981 8%, var(--ls-surface)) 0%, color-mix(in srgb, #06B6D4 6%, var(--ls-surface)) 50%, color-mix(in srgb, #8B5CF6 6%, var(--ls-surface)) 100%)",
        border: "0.5px solid color-mix(in srgb, #10B981 30%, var(--ls-border))",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        <span aria-hidden="true" style={{ fontSize: 22 }}>
          📨
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              fontFamily: "Sora, sans-serif",
              fontWeight: 800,
              fontSize: 14,
              margin: 0,
              letterSpacing: "-0.01em",
              color: "var(--ls-text)",
            }}
          >
            Tes leads ce mois
          </h3>
          <p
            style={{
              fontSize: 11,
              color: "var(--ls-text-muted)",
              margin: "1px 0 0",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            depuis tes liens partagés (?ref=)
          </p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <StatCell label="Total" value={stats.leads_total} color="#0F172A" big />
        <StatCell label="Nouveaux" value={stats.leads_new} color="#10B981" />
        <StatCell label="Contactés" value={stats.leads_contacted} color="#06B6D4" />
        <StatCell label="Convertis" value={stats.leads_converted} color="#8B5CF6" />
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          fontSize: 11,
          color: "var(--ls-text-muted)",
          padding: "8px 12px",
          background: "color-mix(in srgb, var(--ls-text) 4%, transparent)",
          borderRadius: 10,
        }}
      >
        {stats.source_opportunite > 0 ? (
          <div>
            🔗 {stats.source_opportunite} via{" "}
            <strong style={{ color: "var(--ls-text)" }}>/opportunite</strong>
          </div>
        ) : null}
        {stats.source_simulateur > 0 ? (
          <div>
            ✨ {stats.source_simulateur} via{" "}
            <strong style={{ color: "var(--ls-text)" }}>/simulateur</strong>
          </div>
        ) : null}
        {stats.source_other > 0 ? (
          <div>📋 {stats.source_other} via formulaire direct (Welcome)</div>
        ) : null}
        {stats.leads_converted > 0 ? (
          <div style={{ marginTop: 4, color: "var(--ls-purple)", fontWeight: 600 }}>
            🎯 Taux conversion : {conversionPct}%
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StatCell({
  label,
  value,
  color,
  big,
}: {
  label: string;
  value: number;
  color: string;
  big?: boolean;
}) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "8px 6px",
        borderRadius: 10,
        background: "var(--ls-surface)",
        border: "0.5px solid var(--ls-border)",
      }}
    >
      <div
        style={{
          fontFamily: "Sora, sans-serif",
          fontWeight: 800,
          fontSize: big ? 22 : 18,
          color,
          letterSpacing: "-0.02em",
          lineHeight: 1,
          marginBottom: 2,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 9,
          color: "var(--ls-text-muted)",
          textTransform: "uppercase",
          letterSpacing: 0.6,
          fontWeight: 600,
        }}
      >
        {label}
      </div>
    </div>
  );
}
