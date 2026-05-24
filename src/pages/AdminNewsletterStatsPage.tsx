// =============================================================================
// AdminNewsletterStatsPage — Chantier #8 étape 8.6 (2026-05-23).
// Stats funnel + liste destinataires pour une newsletter envoyée.
// =============================================================================
//
// Route : /admin/newsletters/:id/stats
// Admin only.
//
// Source : compteurs agrégés sur `newsletters` + détail par destinataire
// dans `newsletter_recipients`. Mis à jour via edge fn `resend-webhook`.
// =============================================================================

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { getSupabaseClient } from "../services/supabaseClient";

type RecipientType = "client" | "distri";

interface NewsletterStats {
  id: string;
  title: string;
  slug: string;
  status: string;
  sent_at: string | null;
  audience: string;
  view_count: number;
  email_open_count: number;
  email_click_count: number;
  bilan_cta_clicks: number;
  business_cta_clicks: number;
}

interface RecipientRow {
  id: string;
  recipient_type: RecipientType;
  email: string;
  sent_at: string;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_bilan_at: string | null;
  clicked_business_at: string | null;
  bounced_at: string | null;
}

type RecipientFilter = "all" | "opened" | "clicked" | "bounced" | "delivered_only";

export function AdminNewsletterStatsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAppContext();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<NewsletterStats | null>(null);
  const [recipients, setRecipients] = useState<RecipientRow[]>([]);
  const [filter, setFilter] = useState<RecipientFilter>("all");

  useEffect(() => {
    if (currentUser && currentUser.role !== "admin") {
      navigate("/co-pilote", { replace: true });
    }
  }, [currentUser, navigate]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible.");

      const [nlRes, recRes] = await Promise.all([
        sb
          .from("newsletters")
          .select("id, title, slug, status, sent_at, audience, view_count, email_open_count, email_click_count, bilan_cta_clicks, business_cta_clicks")
          .eq("id", id)
          .single(),
        sb
          .from("newsletter_recipients")
          .select("id, recipient_type, email, sent_at, delivered_at, opened_at, clicked_bilan_at, clicked_business_at, bounced_at")
          .eq("newsletter_id", id)
          .order("sent_at", { ascending: false })
          .limit(1000),
      ]);

      if (nlRes.error) throw nlRes.error;
      if (recRes.error) throw recRes.error;
      setStats(nlRes.data as NewsletterStats);
      setRecipients((recRes.data ?? []) as RecipientRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const total = recipients.length;
    const delivered = recipients.filter((r) => r.delivered_at).length;
    const opened = recipients.filter((r) => r.opened_at).length;
    const clickedBilan = recipients.filter((r) => r.clicked_bilan_at).length;
    const clickedBusiness = recipients.filter((r) => r.clicked_business_at).length;
    const clicked = recipients.filter((r) => r.clicked_bilan_at || r.clicked_business_at).length;
    const bounced = recipients.filter((r) => r.bounced_at).length;
    return { total, delivered, opened, clicked, clickedBilan, clickedBusiness, bounced };
  }, [recipients]);

  const filtered = useMemo(() => {
    switch (filter) {
      case "opened":
        return recipients.filter((r) => r.opened_at);
      case "clicked":
        return recipients.filter((r) => r.clicked_bilan_at || r.clicked_business_at);
      case "bounced":
        return recipients.filter((r) => r.bounced_at);
      case "delivered_only":
        return recipients.filter((r) => r.delivered_at && !r.opened_at && !r.bounced_at);
      default:
        return recipients;
    }
  }, [recipients, filter]);

  if (!currentUser || currentUser.role !== "admin") return null;

  if (loading) {
    return <div style={{ padding: 32, textAlign: "center", color: "var(--ls-text-muted)" }}>Chargement…</div>;
  }
  if (error || !stats) {
    return (
      <div style={{ padding: 32, maxWidth: 600, margin: "0 auto" }}>
        <p style={{ color: "var(--ls-coral)", padding: 12, background: "rgba(251,113,133,0.10)", borderRadius: 10 }}>
          ⚠️ {error ?? "Newsletter introuvable."}
        </p>
        <button type="button" onClick={() => navigate("/admin/newsletters")} style={btnGhostStyle}>
          ← Retour à la liste
        </button>
      </div>
    );
  }

  const pct = (n: number) => (counts.total ? ((n / counts.total) * 100).toFixed(1) : "0.0");

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: "0 auto" }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <button type="button" onClick={() => navigate("/admin/newsletters")} style={btnGhostStyle}>
          ← Retour
        </button>
        <div style={{ flex: 1 }} />
        <button type="button" onClick={() => void load()} style={btnGhostStyle} title="Rafraîchir">
          🔄 Rafraîchir
        </button>
      </div>

      <h1
        style={{
          fontFamily: "'Syne', serif",
          fontSize: 26,
          fontWeight: 700,
          margin: "0 0 4px",
          color: "var(--ls-text)",
        }}
      >
        📊 {stats.title}
      </h1>
      <p style={{ margin: "0 0 24px", fontSize: 13, color: "var(--ls-text-muted)" }}>
        {stats.sent_at ? (
          <>Envoyée le {new Date(stats.sent_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</>
        ) : (
          <>Pas encore envoyée</>
        )}{" "}
        · {stats.audience === "all" ? "Tous" : stats.audience} · /news/{stats.slug}
      </p>

      {/* ─── Funnel KPIs ─── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <KpiCard label="Destinataires" value={counts.total} hint="Envois tentés" color="var(--ls-text-muted)" />
        <KpiCard
          label="Délivrés"
          value={counts.delivered}
          hint={`${pct(counts.delivered)}%`}
          color="var(--ls-teal)"
        />
        <KpiCard
          label="Ouvertures"
          value={counts.opened}
          hint={`${pct(counts.opened)}% des envois`}
          color="var(--ls-gold)"
        />
        <KpiCard
          label="Clics"
          value={counts.clicked}
          hint={`${pct(counts.clicked)}% · ${
            counts.opened ? ((counts.clicked / counts.opened) * 100).toFixed(1) : "0.0"
          }% des ouvreurs`}
          color="var(--ls-coral)"
        />
        <KpiCard
          label="Bounces"
          value={counts.bounced}
          hint={`${pct(counts.bounced)}%`}
          color="var(--ls-coral)"
          warning={counts.total > 50 && counts.bounced / counts.total > 0.05}
        />
      </div>

      {/* ─── Funnel bar visualisation ─── */}
      <div
        style={{
          background: "var(--ls-surface)",
          border: "1px solid var(--ls-border)",
          borderRadius: 12,
          padding: 18,
          marginBottom: 24,
        }}
      >
        <h3
          style={{
            margin: "0 0 14px",
            fontSize: 14,
            fontWeight: 700,
            color: "var(--ls-text)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Funnel
        </h3>
        <FunnelStep label="Envoyés" count={counts.total} total={counts.total} color="var(--ls-text-muted)" />
        <FunnelStep label="Délivrés" count={counts.delivered} total={counts.total} color="var(--ls-teal)" />
        <FunnelStep label="Ouverts" count={counts.opened} total={counts.total} color="var(--ls-gold)" />
        <FunnelStep label="Cliqués (toute origine)" count={counts.clicked} total={counts.total} color="var(--ls-coral)" />
      </div>

      {/* ─── CTAs breakdown ─── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <KpiCard
          label="🎯 Clics CTA Bilan"
          value={counts.clickedBilan}
          hint={`${pct(counts.clickedBilan)}% des envois`}
          color="var(--ls-gold)"
        />
        <KpiCard
          label="💼 Clics CTA Business"
          value={counts.clickedBusiness}
          hint={`${pct(counts.clickedBusiness)}% des envois`}
          color="var(--ls-teal)"
        />
        <KpiCard
          label="👁 Vues page publique"
          value={stats.view_count}
          hint="Compteur /news/:slug (étape 8.7)"
          color="var(--ls-purple)"
        />
      </div>

      {/* ─── Filtres destinataires ─── */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        <PillButton active={filter === "all"} onClick={() => setFilter("all")}>
          Tous ({counts.total})
        </PillButton>
        <PillButton active={filter === "opened"} onClick={() => setFilter("opened")}>
          📬 Ouverts ({counts.opened})
        </PillButton>
        <PillButton active={filter === "clicked"} onClick={() => setFilter("clicked")}>
          👆 Cliqueurs ({counts.clicked})
        </PillButton>
        <PillButton active={filter === "delivered_only"} onClick={() => setFilter("delivered_only")}>
          📭 Reçus mais pas ouverts ({counts.delivered - counts.opened > 0 ? counts.delivered - counts.opened : 0})
        </PillButton>
        <PillButton active={filter === "bounced"} onClick={() => setFilter("bounced")}>
          ⚠️ Bounces ({counts.bounced})
        </PillButton>
      </div>

      {/* ─── Liste destinataires ─── */}
      {filtered.length === 0 ? (
        <div
          style={{
            padding: 24,
            textAlign: "center",
            color: "var(--ls-text-muted)",
            border: "1px dashed var(--ls-border)",
            borderRadius: 10,
            background: "var(--ls-surface)",
          }}
        >
          Aucun destinataire dans cette catégorie.
        </div>
      ) : (
        <div
          style={{
            background: "var(--ls-surface)",
            border: "1px solid var(--ls-border)",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 90px 90px 90px 90px",
              gap: 8,
              padding: "10px 14px",
              background: "var(--ls-bg)",
              borderBottom: "1px solid var(--ls-border)",
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--ls-text-muted)",
            }}
          >
            <div>Email</div>
            <div style={{ textAlign: "center" }}>Délivré</div>
            <div style={{ textAlign: "center" }}>Ouvert</div>
            <div style={{ textAlign: "center" }}>Bilan</div>
            <div style={{ textAlign: "center" }}>Business</div>
          </div>
          {filtered.map((r) => (
            <RecipientRow key={r.id} row={r} />
          ))}
        </div>
      )}

      <p style={{ marginTop: 16, fontSize: 11, color: "var(--ls-text-muted)", textAlign: "center" }}>
        Les compteurs sont alimentés par les webhooks Resend (open + click).
        Configure le webhook dans Resend → Webhooks → URL{" "}
        <code>/functions/v1/resend-webhook</code>.
      </p>
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  color,
  warning,
}: {
  label: string;
  value: number;
  hint?: string;
  color: string;
  warning?: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--ls-surface)",
        border: `1px solid ${warning ? "var(--ls-coral)" : "var(--ls-border)"}`,
        borderRadius: 12,
        padding: 16,
        position: "relative",
      }}
    >
      {warning && (
        <span
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            fontSize: 10,
            color: "var(--ls-coral)",
            fontWeight: 700,
          }}
          title="Taux de bounce élevé (> 5%) — vérifier qualité de la liste email"
        >
          ⚠️
        </span>
      )}
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "var(--ls-text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "'Syne', serif",
          fontSize: 28,
          fontWeight: 700,
          color,
          lineHeight: 1,
          marginBottom: 4,
        }}
      >
        {value}
      </div>
      {hint && <div style={{ fontSize: 11, color: "var(--ls-text-muted)" }}>{hint}</div>}
    </div>
  );
}

function FunnelStep({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: "var(--ls-text)", fontWeight: 600 }}>{label}</span>
        <span style={{ color: "var(--ls-text-muted)" }}>
          {count} · {pct.toFixed(1)}%
        </span>
      </div>
      <div
        style={{
          width: "100%",
          height: 8,
          background: "var(--ls-bg)",
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color,
            transition: "width 0.4s ease",
          }}
        />
      </div>
    </div>
  );
}

function RecipientRow({ row }: { row: RecipientRow }) {
  const fmt = (iso: string | null): string =>
    iso ? new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 90px 90px 90px 90px",
        gap: 8,
        padding: "10px 14px",
        borderBottom: "1px solid var(--ls-border)",
        fontSize: 13,
        alignItems: "center",
        color: "var(--ls-text)",
        background: row.bounced_at ? "color-mix(in srgb, var(--ls-coral) 6%, transparent)" : undefined,
      }}
    >
      <div>
        <div style={{ fontWeight: 500 }}>{row.email}</div>
        <div style={{ fontSize: 10, color: "var(--ls-text-muted)" }}>
          {row.recipient_type === "client" ? "Client" : "Distri"} · envoyé {fmt(row.sent_at)}
        </div>
      </div>
      <CellStatus done={!!row.delivered_at} label={fmt(row.delivered_at)} good="var(--ls-teal)" />
      <CellStatus done={!!row.opened_at} label={fmt(row.opened_at)} good="var(--ls-gold)" />
      <CellStatus done={!!row.clicked_bilan_at} label={fmt(row.clicked_bilan_at)} good="var(--ls-coral)" />
      <CellStatus done={!!row.clicked_business_at} label={fmt(row.clicked_business_at)} good="var(--ls-teal)" />
    </div>
  );
}

function CellStatus({ done, label, good }: { done: boolean; label: string; good: string }) {
  return (
    <div style={{ textAlign: "center", fontSize: 11, color: done ? good : "var(--ls-text-muted)", fontWeight: done ? 600 : 400 }}>
      {done ? label : "—"}
    </div>
  );
}

function PillButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "7px 12px",
        borderRadius: 999,
        border: "1px solid var(--ls-border)",
        background: active ? "var(--ls-gold)" : "var(--ls-surface)",
        color: active ? "var(--ls-charcoal)" : "var(--ls-text)",
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

const btnGhostStyle: React.CSSProperties = {
  padding: "9px 14px",
  background: "transparent",
  border: "1px solid var(--ls-border)",
  borderRadius: 10,
  color: "var(--ls-text)",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
};

export default AdminNewsletterStatsPage;
