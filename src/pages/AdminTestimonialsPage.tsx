// =============================================================================
// AdminTestimonialsPage — Chantier #11 Sprint 2 + V1.1 (2026-05-18)
// Page admin pour moderer + recuperer le lien generique a partager.
// =============================================================================

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { getSupabaseClient } from "../services/supabaseClient";
import { useToast } from "../context/ToastContext";

type TestimonialStatus = "pending" | "approved" | "rejected";

interface TestimonialRow {
  id: string;
  client_id: string | null;
  client_token: string;
  coach_user_id: string | null;
  coach_slug: string | null;
  content: string;
  rating: number;
  language: string;
  status: TestimonialStatus;
  approved_at: string | null;
  approved_by: string | null;
  rejected_reason: string | null;
  created_at: string;
  // Enrichissement client (mode token) OU parse meta (mode coach_slug)
  display_first_name?: string | null;
  display_last_name?: string | null;
  display_city?: string | null;
  display_content?: string;
  source_label?: string;
}

type Filter = "pending" | "approved" | "rejected" | "all";

function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

// Parse les rows pour normaliser l'affichage admin :
// - Mode token (client_id != null) : utilise clients.first_name/last_name/city
// - Mode coach_slug (client_id null) : extrait FROM:firstName|city dans le content
function enrichRow(
  raw: TestimonialRow & { clients?: { first_name: string | null; last_name: string | null; city: string | null } | null },
): TestimonialRow {
  if (raw.client_id && raw.clients) {
    return {
      ...raw,
      display_first_name: raw.clients.first_name,
      display_last_name: raw.clients.last_name,
      display_city: raw.clients.city,
      display_content: raw.content,
      source_label: "fiche client",
    };
  }
  // Mode generique : extract meta [FROM:Marie|Metz]
  const match = raw.content.match(/^\[FROM:([^|]+)\|([^\]]+)\]\n\n([\s\S]+)$/);
  if (match) {
    const [, fn, c, rest] = match;
    return {
      ...raw,
      display_first_name: fn.trim(),
      display_last_name: null,
      display_city: c.trim(),
      display_content: rest.trim(),
      source_label: "lien générique",
    };
  }
  // Fallback : pas de meta
  return {
    ...raw,
    display_first_name: null,
    display_last_name: null,
    display_city: null,
    display_content: raw.content,
    source_label: raw.client_id ? "fiche client" : "lien générique",
  };
}

export function AdminTestimonialsPage() {
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const { push: pushToast } = useToast();
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

  const coachSlug = useMemo(() => {
    if (!currentUser?.name) return null;
    const firstName = currentUser.name.trim().split(/\s+/)[0] ?? "";
    return firstName ? normalizeSlug(firstName) : null;
  }, [currentUser]);

  const shareUrl = useMemo(() => {
    if (!coachSlug) return null;
    const origin = typeof window !== "undefined" ? window.location.origin : "https://labase360.com";
    return `${origin}/temoignage/coach/${coachSlug}`;
  }, [coachSlug]);

  const load = useMemo(
    () => async () => {
      setLoading(true);
      setError(null);
      try {
        const sb = await getSupabaseClient();
        if (!sb) throw new Error("Service indisponible.");
        const { data, error } = await sb
          .from("client_testimonials")
          .select("id, client_id, client_token, coach_user_id, coach_slug, content, rating, language, status, approved_at, approved_by, rejected_reason, created_at, clients(first_name, last_name, city)")
          .order("created_at", { ascending: false })
          .limit(200);
        if (error) throw error;
        const enriched = (data as unknown as Array<TestimonialRow & { clients?: { first_name: string | null; last_name: string | null; city: string | null } | null }>).map(enrichRow);
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

  function copyShareLink() {
    if (!shareUrl) return;
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => pushToast({ tone: "success", title: "Lien copié 📋" }))
      .catch(() => pushToast({ tone: "error", title: "Impossible de copier" }));
  }
  function shareWhatsApp() {
    if (!shareUrl) return;
    const msg = `Coucou 🌱\n\nJ'aimerais beaucoup ton retour sur ce qu'on a fait ensemble ! C'est rapide (30 sec) et ça aide énormément les prochains :\n\n${shareUrl}\n\nMerci 🙏`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
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
        Tes clients t'envoient un retour en 30 secondes via le lien ci-dessous.
        Tu valides ici ce qui s'affiche sur ta page bilan en ligne.
      </p>

      {/* ─── Header : ton lien a partager ─────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg, rgba(45,212,191,0.08), rgba(167,139,250,0.08))",
        border: "1px solid var(--ls-border)",
        borderRadius: 14,
        padding: 18,
        marginBottom: 20,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase",
          color: "var(--ls-teal)", marginBottom: 8,
        }}>
          Ton lien à partager
        </div>
        {shareUrl ? (
          <>
            <div style={{
              padding: "10px 12px",
              background: "var(--ls-surface)",
              border: "1px solid var(--ls-border)",
              borderRadius: 10,
              fontFamily: "var(--ls-font-mono, monospace)",
              fontSize: 13,
              color: "var(--ls-text)",
              wordBreak: "break-all",
              marginBottom: 10,
            }}>
              {shareUrl}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={copyShareLink}
                style={{
                  padding: "9px 14px",
                  background: "var(--ls-gold)",
                  color: "var(--ls-charcoal)",
                  border: "none",
                  borderRadius: 10,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                📋 Copier le lien
              </button>
              <button
                type="button"
                onClick={shareWhatsApp}
                style={{
                  padding: "9px 14px",
                  background: "#25D366",
                  color: "white",
                  border: "none",
                  borderRadius: 10,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                💬 Partager sur WhatsApp
              </button>
            </div>
            <p style={{ fontSize: 11, color: "var(--ls-text-muted)", marginTop: 10, lineHeight: 1.5 }}>
              💡 Partage le sur ton groupe WhatsApp client, dans ta bio Insta, en story, ou en DM aux clients que tu veux relancer. Tu reçois une notif à chaque retour.
            </p>
          </>
        ) : (
          <p style={{ fontSize: 13, color: "var(--ls-coral)" }}>
            Renseigne ton prénom dans Paramètres &gt; Profil pour générer ton lien.
          </p>
        )}
      </div>

      {/* ─── Filtres + liste ──────────────────────────────────────────────── */}
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
          Aucun témoignage dans cette catégorie. Partage ton lien pour amorcer.
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
  const fn = row.display_first_name ?? "?";
  const lastInit = row.display_last_name ? row.display_last_name.charAt(0).toUpperCase() + "." : "";
  const fullName = `${fn} ${lastInit}`.trim();
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
            {fullName}{row.display_city ? `, ${row.display_city}` : ""}
          </div>
          <div style={{ fontSize: 11, color: "var(--ls-text-muted)", marginTop: 2 }}>
            {date} · {row.source_label} · {row.language.toUpperCase()}
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
        {row.display_content ?? row.content}
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
