// =============================================================================
// AdminNewslettersPage — Chantier #8 étape 8.3 (2026-05-23).
// Page admin pour lister + créer des newsletters "La Base 360 News".
// =============================================================================
//
// Route : /admin/newsletters
// Admin only (redirect /co-pilote sinon).
//
// V1 (8.3) : liste + filtre statut + bouton "Nouvelle" qui crée un brouillon
//            vide et navigate vers l'éditeur (8.4 — pas encore livré, donc
//            navigate vers /admin/newsletters/:id/edit qui renverra 404 OK).
//            Action "Supprimer" pour les brouillons.
//
// V2 (8.4) : éditeur sections + aperçu temps réel.
// V3 (8.5) : action "Envoyer" + multi-canal.
// =============================================================================

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { getSupabaseClient } from "../services/supabaseClient";
import { useToast } from "../context/ToastContext";

type NewsletterStatus = "draft" | "scheduled" | "sent" | "archived";
type NewsletterAudience = "clients" | "distri" | "all";

interface NewsletterBrief {
  key: string;
  label: string;
  season: string | null;
  default_subtitle: string | null;
  default_sections: unknown;
  is_seasonal: boolean;
}

interface NewsletterRow {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  audience: NewsletterAudience;
  status: NewsletterStatus;
  is_public: boolean;
  template_key: string | null;
  scheduled_for: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
  view_count: number;
  email_open_count: number;
  email_click_count: number;
}

type Filter = NewsletterStatus | "all";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function AdminNewslettersPage() {
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const { push: pushToast } = useToast();
  const [rows, setRows] = useState<NewsletterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ title: "", subtitle: "" });
  const [creating, setCreating] = useState(false);
  const [briefs, setBriefs] = useState<NewsletterBrief[]>([]);
  const [selectedBriefKey, setSelectedBriefKey] = useState<string>("");

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
        const { data, error: err } = await sb
          .from("newsletters")
          .select(
            "id, title, slug, subtitle, audience, status, is_public, template_key, scheduled_for, sent_at, created_at, updated_at, view_count, email_open_count, email_click_count",
          )
          .order("created_at", { ascending: false })
          .limit(200);
        if (err) throw err;
        setRows((data ?? []) as NewsletterRow[]);
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

  // Load briefs (templates saisonniers seedés en étape 8.11)
  useEffect(() => {
    void (async () => {
      const sb = await getSupabaseClient();
      if (!sb) return;
      const { data, error: err } = await sb
        .from("newsletter_briefs")
        .select("key, label, season, default_subtitle, default_sections, is_seasonal")
        .eq("active", true)
        .order("position", { ascending: true });
      if (!err && data) setBriefs(data as NewsletterBrief[]);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((r) => r.status === filter);
  }, [rows, filter]);

  const counts = useMemo(
    () => ({
      draft: rows.filter((r) => r.status === "draft").length,
      scheduled: rows.filter((r) => r.status === "scheduled").length,
      sent: rows.filter((r) => r.status === "sent").length,
      archived: rows.filter((r) => r.status === "archived").length,
      all: rows.length,
    }),
    [rows],
  );

  async function createNewsletter() {
    const title = createForm.title.trim();
    const subtitle = createForm.subtitle.trim();
    if (title.length < 4) {
      alert("Titre obligatoire (4 caractères minimum).");
      return;
    }
    setCreating(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible.");
      let baseSlug = slugify(title);
      if (!baseSlug) baseSlug = `news-${Date.now()}`;
      // Slug unique : ajoute -2, -3 si conflit
      let slug = baseSlug;
      let suffix = 2;
      while (rows.some((r) => r.slug === slug)) {
        slug = `${baseSlug}-${suffix}`;
        suffix += 1;
      }
      // Si un template est sélectionné, on injecte ses sections + sous-titre par défaut
      const selectedBrief = selectedBriefKey ? briefs.find((b) => b.key === selectedBriefKey) : null;
      const initialSections = selectedBrief?.default_sections ?? [];
      const initialSubtitle =
        subtitle || (selectedBrief?.default_subtitle ?? null);
      const { data, error: err } = await sb
        .from("newsletters")
        .insert({
          title,
          slug,
          subtitle: initialSubtitle,
          status: "draft",
          audience: "all",
          is_public: true,
          body_json: { sections: initialSections },
          template_key: selectedBrief?.key ?? null,
          created_by_user_id: currentUser?.id ?? null,
        })
        .select("id")
        .single();
      if (err) throw err;
      pushToast({ tone: "success", title: `✅ Brouillon "${title}" créé` });
      setCreateOpen(false);
      setCreateForm({ title: "", subtitle: "" });
      setSelectedBriefKey("");
      navigate(`/admin/newsletters/${data.id}/edit`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur inconnue.");
    } finally {
      setCreating(false);
    }
  }

  async function deleteNewsletter(id: string, title: string) {
    if (busyId) return;
    if (!confirm(`Supprimer définitivement le brouillon "${title}" ?`)) return;
    setBusyId(id);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible.");
      const { error: err } = await sb.from("newsletters").delete().eq("id", id);
      if (err) throw err;
      pushToast({ tone: "success", title: `🗑 "${title}" supprimé` });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur inconnue.");
    } finally {
      setBusyId(null);
    }
  }

  async function archiveNewsletter(id: string, title: string) {
    setBusyId(id);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible.");
      const { error: err } = await sb
        .from("newsletters")
        .update({ status: "archived" })
        .eq("id", id);
      if (err) throw err;
      pushToast({ tone: "success", title: `📦 "${title}" archivé` });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur inconnue.");
    } finally {
      setBusyId(null);
    }
  }

  if (!currentUser || currentUser.role !== "admin") return null;

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: "0 auto" }}>
      <h1
        style={{
          fontFamily: "'Syne', serif",
          fontSize: 26,
          fontWeight: 700,
          margin: 0,
          marginBottom: 6,
          color: "var(--ls-text)",
        }}
      >
        📰 Newsletters
      </h1>
      <p
        style={{
          fontSize: 13,
          color: "var(--ls-text-muted)",
          margin: "0 0 18px",
        }}
      >
        Gère tes éditions de <strong>La Base 360 News</strong> (bi-mensuel).
        Crée, édite, envoie aux clients + distri, et partage la version
        publique sur Insta/WhatsApp pour capter des leads.
      </p>

      {/* ─── Header : bouton créer ──────────────────────────────────────── */}
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          style={{
            padding: "11px 18px",
            background: "var(--ls-gold)",
            color: "var(--ls-charcoal)",
            border: "none",
            borderRadius: 10,
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            letterSpacing: "0.02em",
          }}
        >
          ➕ Nouvelle newsletter
        </button>
      </div>

      {/* ─── Filtres ────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
        <PillButton active={filter === "all"} onClick={() => setFilter("all")}>
          Tous ({counts.all})
        </PillButton>
        <PillButton active={filter === "draft"} onClick={() => setFilter("draft")}>
          ✏️ Brouillons ({counts.draft})
        </PillButton>
        <PillButton active={filter === "scheduled"} onClick={() => setFilter("scheduled")}>
          🕒 Programmés ({counts.scheduled})
        </PillButton>
        <PillButton active={filter === "sent"} onClick={() => setFilter("sent")}>
          📨 Envoyés ({counts.sent})
        </PillButton>
        <PillButton active={filter === "archived"} onClick={() => setFilter("archived")}>
          📦 Archivés ({counts.archived})
        </PillButton>
      </div>

      {loading && <p style={{ color: "var(--ls-text-muted)" }}>Chargement…</p>}
      {error && (
        <p
          style={{
            color: "var(--ls-coral)",
            padding: 12,
            background: "rgba(251,113,133,0.10)",
            borderRadius: 10,
          }}
        >
          ⚠️ {error}
        </p>
      )}
      {!loading && !error && filtered.length === 0 && (
        <div
          style={{
            padding: 32,
            textAlign: "center",
            color: "var(--ls-text-muted)",
            background: "var(--ls-surface)",
            borderRadius: 12,
            border: "1px dashed var(--ls-border)",
          }}
        >
          {filter === "all" ? (
            <>
              Aucune newsletter pour l'instant. Clique sur{" "}
              <strong>« ➕ Nouvelle newsletter »</strong> pour démarrer.
            </>
          ) : (
            <>Aucune newsletter dans cette catégorie.</>
          )}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map((r) => (
          <NewsletterCard
            key={r.id}
            row={r}
            busy={busyId === r.id}
            onEdit={() => navigate(`/admin/newsletters/${r.id}/edit`)}
            onStats={() => navigate(`/admin/newsletters/${r.id}/stats`)}
            onPreview={() => window.open(`/news/${r.slug}`, "_blank", "noopener,noreferrer")}
            onDelete={() => deleteNewsletter(r.id, r.title)}
            onArchive={() => archiveNewsletter(r.id, r.title)}
          />
        ))}
      </div>

      {/* ─── Modale création ────────────────────────────────────────────── */}
      {createOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 1000,
          }}
          onClick={() => !creating && setCreateOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--ls-surface)",
              border: "1px solid var(--ls-border)",
              borderRadius: 16,
              padding: 22,
              maxWidth: 480,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <h3
              style={{
                margin: 0,
                marginBottom: 6,
                fontSize: 18,
                fontWeight: 700,
                color: "var(--ls-text)",
              }}
            >
              Nouvelle newsletter
            </h3>
            <p
              style={{
                margin: 0,
                marginBottom: 16,
                fontSize: 12,
                color: "var(--ls-text-muted)",
                lineHeight: 1.5,
              }}
            >
              Tu pourras tout éditer ensuite. Le slug est généré automatiquement
              depuis le titre.
            </p>

            <label style={labelStyle}>Titre *</label>
            <input
              type="text"
              value={createForm.title}
              onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Préparation été — juin/juillet 2026"
              style={inputStyle}
              autoFocus
            />

            <label style={labelStyle}>Sous-titre (optionnel)</label>
            <input
              type="text"
              value={createForm.subtitle}
              onChange={(e) => setCreateForm((f) => ({ ...f, subtitle: e.target.value }))}
              placeholder="Hydratation, repas légers, voyages…"
              style={inputStyle}
            />

            {briefs.length > 0 && (
              <>
                <label style={labelStyle}>Template (optionnel)</label>
                <select
                  value={selectedBriefKey}
                  onChange={(e) => setSelectedBriefKey(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">— Vide (je rédige depuis zéro) —</option>
                  <optgroup label="🌿 Templates saisonniers (sections pré-remplies)">
                    {briefs
                      .filter((b) => b.is_seasonal)
                      .map((b) => (
                        <option key={b.key} value={b.key}>
                          {b.label}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="📅 Templates neutres mensuels (squelette vide)">
                    {briefs
                      .filter((b) => !b.is_seasonal)
                      .map((b) => (
                        <option key={b.key} value={b.key}>
                          {b.label}
                        </option>
                      ))}
                  </optgroup>
                </select>
                {selectedBriefKey && (
                  <p style={{ fontSize: 11, color: "var(--ls-text-muted)", margin: "-8px 0 14px", fontStyle: "italic" }}>
                    ✨ Les sections du template seront pré-remplies. Tu pourras tout
                    éditer ensuite.
                  </p>
                )}
              </>
            )}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
              <button
                type="button"
                onClick={() => !creating && setCreateOpen(false)}
                disabled={creating}
                style={{ ...btnGhostStyle, opacity: creating ? 0.5 : 1 }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={createNewsletter}
                disabled={creating}
                style={{ ...btnPrimaryStyle, opacity: creating ? 0.6 : 1 }}
              >
                {creating ? "Création…" : "Créer le brouillon"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PillButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
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

function NewsletterCard({
  row,
  busy,
  onEdit,
  onStats,
  onPreview,
  onDelete,
  onArchive,
}: {
  row: NewsletterRow;
  busy: boolean;
  onEdit: () => void;
  onStats: () => void;
  onPreview: () => void;
  onDelete: () => void;
  onArchive: () => void;
}) {
  const statusBadge = STATUS_BADGES[row.status];
  const audienceBadge = AUDIENCE_BADGES[row.audience];
  const [copied, setCopied] = useState(false);
  const publicUrl =
    typeof window !== "undefined" ? `${window.location.origin}/news/${row.slug}` : `/news/${row.slug}`;
  const copyLink = () => {
    void navigator.clipboard?.writeText(publicUrl).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    });
  };
  const shareTelegram = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(publicUrl)}&text=${encodeURIComponent(row.title)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };
  const created = new Date(row.created_at).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const sentAt = row.sent_at
    ? new Date(row.sent_at).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div
      style={{
        background: "var(--ls-surface)",
        border: "1px solid var(--ls-border)",
        borderRadius: 12,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: 200 }}>
          <div
            style={{
              fontFamily: "'Syne', serif",
              fontSize: 16,
              fontWeight: 700,
              color: "var(--ls-text)",
              marginBottom: 3,
            }}
          >
            {row.title}
          </div>
          {row.subtitle && (
            <div style={{ fontSize: 13, color: "var(--ls-text-muted)", marginBottom: 6 }}>
              {row.subtitle}
            </div>
          )}
          <div
            style={{
              fontSize: 11,
              color: "var(--ls-text-muted)",
              fontFamily: "var(--ls-font-mono, monospace)",
            }}
          >
            /news/{row.slug}
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <Badge bg={statusBadge.bg} fg={statusBadge.fg}>
            {statusBadge.label}
          </Badge>
          <Badge bg={audienceBadge.bg} fg={audienceBadge.fg}>
            {audienceBadge.label}
          </Badge>
          {row.is_public && (
            <Badge bg="rgba(45,212,191,0.16)" fg="var(--ls-teal)">
              🌐 PUBLIC
            </Badge>
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 16,
          fontSize: 11,
          color: "var(--ls-text-muted)",
          flexWrap: "wrap",
        }}
      >
        <span>Créé le {created}</span>
        {sentAt && <span>Envoyé le {sentAt}</span>}
        {row.status === "sent" && (
          <>
            <span>👁 {row.view_count} vues</span>
            <span>📬 {row.email_open_count} opens</span>
            <span>👆 {row.email_click_count} clicks</span>
          </>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
        <ActionButton variant="primary" onClick={onEdit} disabled={busy}>
          ✏️ Éditer
        </ActionButton>
        {row.status === "sent" && (
          <ActionButton variant="ghost" onClick={onStats} disabled={busy}>
            📊 Stats
          </ActionButton>
        )}
        {row.is_public && (
          <ActionButton variant="ghost" onClick={onPreview} disabled={busy}>
            🌐 Voir publique
          </ActionButton>
        )}
        {row.is_public && (
          <>
            <ActionButton variant="ghost" onClick={copyLink} disabled={busy}>
              {copied ? "✅ Lien copié" : "🔗 Copier le lien"}
            </ActionButton>
            <ActionButton variant="ghost" onClick={shareTelegram} disabled={busy}>
              ✈️ Telegram
            </ActionButton>
          </>
        )}
        {row.status !== "archived" && row.status !== "draft" && (
          <ActionButton variant="ghost" onClick={onArchive} disabled={busy}>
            📦 Archiver
          </ActionButton>
        )}
        {row.status === "draft" && (
          <ActionButton variant="danger" onClick={onDelete} disabled={busy}>
            🗑 Supprimer
          </ActionButton>
        )}
      </div>
    </div>
  );
}

function Badge({
  bg,
  fg,
  children,
}: {
  bg: string;
  fg: string;
  children: ReactNode;
}) {
  return (
    <span
      style={{
        padding: "3px 9px",
        borderRadius: 999,
        background: bg,
        color: fg,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.06em",
      }}
    >
      {children}
    </span>
  );
}

function ActionButton({
  variant,
  onClick,
  disabled,
  children,
}: {
  variant: "primary" | "ghost" | "danger";
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  const stylesByVariant = {
    primary: { background: "var(--ls-gold)", color: "var(--ls-charcoal)", border: "none" },
    danger: { background: "var(--ls-coral)", color: "white", border: "none" },
    ghost: {
      background: "transparent",
      color: "var(--ls-text-muted)",
      border: "1px solid var(--ls-border)",
    },
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        ...stylesByVariant[variant],
        padding: "7px 12px",
        borderRadius: 8,
        fontSize: 12,
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

const STATUS_BADGES: Record<NewsletterStatus, { label: string; bg: string; fg: string }> = {
  draft: { label: "BROUILLON", bg: "rgba(201,168,76,0.16)", fg: "var(--ls-gold)" },
  scheduled: { label: "PROGRAMMÉ", bg: "rgba(167,139,250,0.16)", fg: "var(--ls-purple)" },
  sent: { label: "ENVOYÉ", bg: "rgba(45,212,191,0.16)", fg: "var(--ls-teal)" },
  archived: { label: "ARCHIVÉ", bg: "rgba(156,163,175,0.16)", fg: "var(--ls-text-muted)" },
};

const AUDIENCE_BADGES: Record<NewsletterAudience, { label: string; bg: string; fg: string }> = {
  all: { label: "TOUS", bg: "rgba(167,139,250,0.16)", fg: "var(--ls-purple)" },
  clients: { label: "CLIENTS", bg: "rgba(45,212,191,0.16)", fg: "var(--ls-teal)" },
  distri: { label: "DISTRI", bg: "rgba(201,168,76,0.16)", fg: "var(--ls-gold)" },
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--ls-text-muted)",
  marginBottom: 6,
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: "var(--ls-bg)",
  border: "1px solid var(--ls-border)",
  borderRadius: 10,
  color: "var(--ls-text)",
  fontSize: 14,
  marginBottom: 14,
  boxSizing: "border-box",
};
const btnGhostStyle: React.CSSProperties = {
  padding: "10px 16px",
  background: "transparent",
  border: "1px solid var(--ls-border)",
  borderRadius: 10,
  color: "var(--ls-text)",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
};
const btnPrimaryStyle: React.CSSProperties = {
  padding: "10px 18px",
  background: "var(--ls-gold)",
  border: "none",
  borderRadius: 10,
  color: "var(--ls-charcoal)",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};

export default AdminNewslettersPage;
