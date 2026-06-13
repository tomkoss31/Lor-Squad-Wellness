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
import { Link } from "react-router-dom";
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

  if (loading) return null;

  // Si pas de lead ce mois, on n'affiche RIEN aux non-admins (anti-pollution
  // visuelle), mais on affiche un etat vide motivant aux admins (avec CTA
  // vers /outils-prospection).
  if (!stats || stats.leads_total === 0) {
    if (currentUser?.role !== "admin") return null;
    return (
      <div
        style={{
          padding: 18,
          borderRadius: 18,
          background: "var(--ls-surface)",
          border: "0.5px dashed color-mix(in srgb, #10B981 35%, var(--ls-border))",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 22 }}>🎯</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              fontFamily: "Sora, sans-serif",
              fontWeight: 800,
              fontSize: 14,
              margin: 0,
              color: "var(--ls-text)",
            }}
          >
            Pas encore de leads ce mois
          </h3>
          <p
            style={{
              fontSize: 11,
              color: "var(--ls-text-muted)",
              margin: "1px 0 0",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            Partage ton lien sur Insta / WhatsApp pour récolter tes premiers prospects.
          </p>
        </div>
        <Link
          to="/outils-prospection"
          style={{
            padding: "8px 14px",
            borderRadius: 10,
            background: "linear-gradient(135deg, #10B981 0%, #06B6D4 50%, #8B5CF6 100%)",
            color: "white",
            fontSize: 12,
            fontWeight: 700,
            fontFamily: "Sora, sans-serif",
            textDecoration: "none",
            boxShadow: "0 4px 12px rgba(16,185,129,0.32)",
            whiteSpace: "nowrap",
          }}
        >
          🎯 Mes outils →
        </Link>
      </div>
    );
  }

  const conversionPct =
    stats.leads_total > 0 ? Math.round((stats.leads_converted / stats.leads_total) * 100) : 0;

  // Les cellules ne sont cliquables que pour les admins : la gestion des leads
  // se fait dans /crm (source unique depuis 2026-06-13). Pour les autres, stats
  // en lecture seule.
  const isAdmin = currentUser?.role === "admin";
  const leadsHref = (_status?: string) => (isAdmin ? "/crm" : undefined);

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
      <style>{`
        .rsc-statcell-link { transition: border-color .15s, box-shadow .15s, transform .1s; }
        .rsc-statcell-link:hover { border-color: color-mix(in srgb, #10B981 55%, var(--ls-border)); box-shadow: 0 4px 12px rgba(16,185,129,0.18); transform: translateY(-1px); }
        .rsc-statcell-link:active { transform: translateY(0); }
      `}</style>
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
        {/* Raccourci Outils prospection (admin only) */}
        {currentUser?.role === "admin" ? (
          <Link
            to="/outils-prospection"
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              background: "linear-gradient(135deg, #10B981 0%, #06B6D4 50%, #8B5CF6 100%)",
              color: "white",
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "Sora, sans-serif",
              textDecoration: "none",
              boxShadow: "0 2px 8px rgba(16,185,129,0.32)",
              flexShrink: 0,
            }}
          >
            🎯 Partager mon lien
          </Link>
        ) : null}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <StatCell label="Total" value={stats.leads_total} color="#0F172A" big to={leadsHref()} />
        <StatCell label="Nouveaux" value={stats.leads_new} color="#10B981" to={leadsHref("new")} />
        <StatCell label="Contactés" value={stats.leads_contacted} color="#06B6D4" to={leadsHref("contacted")} />
        <StatCell label="Convertis" value={stats.leads_converted} color="#8B5CF6" to={leadsHref("converted")} />
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
  to,
}: {
  label: string;
  value: number;
  color: string;
  big?: boolean;
  to?: string;
}) {
  const baseStyle: React.CSSProperties = {
    display: "block",
    textAlign: "center",
    padding: "8px 6px",
    borderRadius: 10,
    background: "var(--ls-surface)",
    border: "0.5px solid var(--ls-border)",
    textDecoration: "none",
  };
  const inner = (
    <>
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
    </>
  );

  if (to) {
    return (
      <Link to={to} className="rsc-statcell-link" style={{ ...baseStyle, cursor: "pointer" }} aria-label={`Voir les leads — ${label}`}>
        {inner}
      </Link>
    );
  }
  return <div style={baseStyle}>{inner}</div>;
}
