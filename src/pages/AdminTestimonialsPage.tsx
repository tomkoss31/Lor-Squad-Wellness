// =============================================================================
// AdminTestimonialsPage — Chantier #11 Sprint 2 (2026-05-18)
// Page admin uniquement (RoleRoute allowedRoles=["admin"]) pour moderer
// les temoignages clients : approve / reject + filtres status.
// Style : theme app interne (var(--ls-*)), pas V2 dark public.
// =============================================================================

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { getSupabaseClient } from "../services/supabaseClient";

type TestimonialStatus = "pending" | "approved" | "rejected";

interface TestimonialRow {
  id: string;
  client_id: string;
  client_token: string;
  coach_user_id: string | null;
  content: string;
  rating: number;
  language: string;
  status: TestimonialStatus;
  approved_at: string | null;
  approved_by: string | null;
  rejected_reason: string | null;
  created_at: string;
  // Enrichissement cote front via join clients
  client_first_name?: string | null;
  client_last_name?: string | null;
  client_city?: string | null;
}

type Filter = "pending" | "approved" | "rejected" | "all";

export function AdminTestimonialsPage() {
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const [rows, setRows] = useState<TestimonialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("pending");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser && currentUser.role !== "admin") {
      navigate("/co-pilote", { replace: true });
    }
  }, [currentUser, navigate]);

  const load = useMemo(
    () => async () => {
      setLoading(true);
      setError(null);
      try {
        const sb = await getSupabaseClient();
        if (!sb) throw new Error("Service indisponible.");
        const { data, error } = await sb
          .from("client_testimonials")
          .select("id, client_id, client_token, coach_user_id, content, rating, language, status, approved_at, approved_by, rejected_reason, created_at, clients!inner(first_name, last_name, city)")
          .order("created_at", { ascending: false })
          .limit(200);
        if (error) throw error;
        const enriched = (data as unknown as Array<TestimonialRow & { clients: { first_name: string | null; last_name: string | null; city: string | null } }>).map((r) => ({
          ...r,
          client_first_name: r.clients?.first_name ?? null,
          client_last_name: r.clients?.last_name ?? null,
          client_city: r.clients?.city ?? null,
        }));
        setRows(enriched);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur inconnue.");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((r) => r.status === filter);
  }, [rows, filter]);

  const counts = useMemo(() => ({
    pending: rows.filter((r) => r.status === "pending").length,
    approved: rows.filter((r) => r.status === "approved").length,
    rejected: rows.filter((r) => r.status === "rejected").length,
    all: rows.length,
  }), [rows]);

  async function approve(id: string) {
    if (busyId) return;
    setBusyId(id);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible.");
      const { error } = await sb
        .from("client_testimonials")
        .update({ status: "approved", approved_at: new Date().toISOString(), approved_by: currentUser?.id ?? null, rejected_reason: null })
        .eq("id", id);
      if (error) throw error;
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur inconnue.");
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: string) {
    const reason = window.prompt("Raison du rejet (visible admin uniquement) :", "");
    if (reason === null) return;
    setBusyId(id);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible.");
      const { error } = await sb
        .from("client_testimonials")
        .update({ status: "rejected", rejected_reason: reason.trim() || null, approved_at: null, approved_by: null })
        .eq("id", id);
      if (error) throw error;
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur inconnue.");
    } finally {
      setBusyId(null);
    }
  }

  async function resetPending(id: string) {
    setBusyId(id);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible.");
      const { error } = await sb
        .from("client_testimonials")
        .update({ status: "pending", approved_at: null, approved_by: null, rejected_reason: null })
        .eq("id", id);
      if (error) throw error;
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur inconnue.");
    } finally {
      setBusyId(null);
    }
  }

  if (!currentUser || currentUser.role !== "admin") return null;

  return (
    <div style={{ padding: 20, maxWidth: 980, margin: "0 auto" }}>
      <h1 style={{
        fontFamily: "'Syne', serif",
        fontSize: 26, fontWeight: 700,
        margin: 0, marginBottom: 6,
        color: "var(--ls-text)",
      }}>
        💬 Témoignages clients
      </h1>
      <p style={{ fontSize: 13, color: "var(--ls-text-muted)", margin: "0 0 18px" }}>
        Modère les retours envoyés par les clients via le lien partageable
        /temoignage/&lt;token&gt;. Approve = visible publiquement (carrousel
        bilan online + business). Reject = caché à jamais.
      </p>

      <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
        <PillButton active={filter === "pending"} onClick={() => setFilter("pending")}>
          🕒 En attente ({counts.pending})
        </PillButton>
        <PillButton active={filter === "approved"} onClick={() => setFilter("approved")}>
          ✅ Validés ({counts.approved})
        </PillButton>
        <PillButton active={filter === "rejected"} onClick={() => setFilter("rejected")}>
          ❌ Rejetés ({counts.rejected})
        </PillButton>
        <PillButton active={filter === "all"} onClick={() => setFilter("all")}>
          Tous ({counts.all})
        </PillButton>
      </div>

      {loading && <p style={{ color: "var(--ls-text-muted)" }}>Chargement…</p>}
      {error && (
        <p style={{ color: "var(--ls-coral)", padding: 12, background: "rgba(251,113,133,0.10)", borderRadius: 10 }}>
          ⚠️ {error}
        </p>
      )}
      {!loading && !error && filtered.length === 0 && (
        <div style={{
          padding: 32,
          textAlign: "center",
          color: "var(--ls-text-muted)",
          background: "var(--ls-surface)",
          borderRadius: 12,
          border: "1px dashed var(--ls-border)",
        }}>
          Aucun témoignage dans cette catégorie.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.map((r) => (
          <TestimonialCard
            key={r.id}
            row={r}
            busy={busyId === r.id}
            onApprove={() => approve(r.id)}
            onReject={() => reject(r.id)}
            onResetPending={() => resetPending(r.id)}
          />
        ))}
      </div>
    </div>
  );
}

function PillButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 14px",
        borderRadius: 999,
        border: "1px solid var(--ls-border)",
        background: active ? "var(--ls-gold)" : "var(--ls-surface)",
        color: active ? "var(--ls-charcoal)" : "var(--ls-text)",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.18s",
      }}
    >
      {children}
    </button>
  );
}

function TestimonialCard({
  row, busy, onApprove, onReject, onResetPending,
}: {
  row: TestimonialRow;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onResetPending: () => void;
}) {
  const date = new Date(row.created_at).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
  });
  const fullName = `${row.client_first_name ?? "?"} ${row.client_last_name ? row.client_last_name.charAt(0).toUpperCase() + "." : ""}`;
  const statusBadge = STATUS_BADGES[row.status];

  return (
    <div style={{
      background: "var(--ls-surface)",
      border: "1px solid var(--ls-border)",
      borderRadius: 12,
      padding: 16,
      display: "flex",
      flexDirection: "column",
      gap: 12,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontFamily: "'Syne', serif", fontSize: 16, fontWeight: 700, color: "var(--ls-text)" }}>
            {fullName.trim()}{row.client_city ? `, ${row.client_city}` : ""}
          </div>
          <div style={{ fontSize: 11, color: "var(--ls-text-muted)", marginTop: 2 }}>
            {date} · langue {row.language.toUpperCase()}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ color: "var(--ls-gold)", fontSize: 18 }}>
            {"★".repeat(row.rating)}<span style={{ opacity: 0.2 }}>{"★".repeat(5 - row.rating)}</span>
          </span>
          <span style={{
            padding: "4px 10px",
            borderRadius: 999,
            background: statusBadge.bg,
            color: statusBadge.fg,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.04em",
          }}>
            {statusBadge.label}
          </span>
        </div>
      </div>

      <div style={{
        fontSize: 14,
        color: "var(--ls-text)",
        lineHeight: 1.55,
        whiteSpace: "pre-wrap",
        background: "var(--ls-surface-2)",
        padding: 12,
        borderRadius: 10,
        border: "1px solid var(--ls-border)",
      }}>
        {row.content}
      </div>

      {row.rejected_reason && (
        <div style={{ fontSize: 12, color: "var(--ls-coral)", fontStyle: "italic" }}>
          Raison du rejet : {row.rejected_reason}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {row.status === "pending" && (
          <>
            <AdminButton variant="success" onClick={onApprove} disabled={busy}>
              ✓ Approuver
            </AdminButton>
            <AdminButton variant="danger" onClick={onReject} disabled={busy}>
              ✕ Rejeter
            </AdminButton>
          </>
        )}
        {row.status === "approved" && (
          <AdminButton variant="ghost" onClick={onResetPending} disabled={busy}>
            ↩ Remettre en attente
          </AdminButton>
        )}
        {row.status === "rejected" && (
          <>
            <AdminButton variant="success" onClick={onApprove} disabled={busy}>
              ✓ Approuver finalement
            </AdminButton>
            <AdminButton variant="ghost" onClick={onResetPending} disabled={busy}>
              ↩ Remettre en attente
            </AdminButton>
          </>
        )}
      </div>
    </div>
  );
}

const STATUS_BADGES: Record<TestimonialStatus, { label: string; bg: string; fg: string }> = {
  pending: { label: "EN ATTENTE", bg: "rgba(201,168,76,0.16)", fg: "var(--ls-gold)" },
  approved: { label: "VALIDÉ", bg: "rgba(45,212,191,0.16)", fg: "var(--ls-teal)" },
  rejected: { label: "REJETÉ", bg: "rgba(251,113,133,0.16)", fg: "var(--ls-coral)" },
};

function AdminButton({ variant, onClick, disabled, children }: {
  variant: "success" | "danger" | "ghost";
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  const stylesByVariant = {
    success: { background: "var(--ls-teal)", color: "white", border: "none" },
    danger: { background: "var(--ls-coral)", color: "white", border: "none" },
    ghost: { background: "transparent", color: "var(--ls-text-muted)", border: "1px solid var(--ls-border)" },
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        ...stylesByVariant[variant],
        padding: "8px 14px",
        borderRadius: 10,
        fontSize: 13,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "opacity 0.18s",
      }}
    >
      {children}
    </button>
  );
}

export default AdminTestimonialsPage;
