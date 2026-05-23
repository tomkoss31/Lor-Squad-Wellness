// =============================================================================
// AdminNewsletterEditPage — Chantier #8 étape 8.4 (2026-05-23).
// Éditeur sections + aperçu HTML temps réel.
// =============================================================================
//
// Route : /admin/newsletters/:id/edit
// Admin only.
//
// Layout desktop : split 50/50 (form gauche, preview droite, sticky).
// Layout mobile  : stack vertical (preview rétractable).
//
// Sections : titre + body_md + is_public + reorder ↑/↓ + delete.
// CTAs Bilan + Business seront ajoutés en étape 8.10 (insertion auto).
//
// Save : bouton manuel (pas d'autosave V1 — éviter conflits multi-onglets).
// =============================================================================

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { getSupabaseClient } from "../services/supabaseClient";
import { useToast } from "../context/ToastContext";
import { MarkdownRenderer } from "../components/formation/MarkdownRenderer";

type NewsletterStatus = "draft" | "scheduled" | "sent" | "archived";
type NewsletterAudience = "clients" | "distri" | "all";

interface SectionData {
  id: string;
  title: string;
  body_md: string;
  is_public: boolean;
  position: number;
}

interface NewsletterFull {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  audience: NewsletterAudience;
  status: NewsletterStatus;
  is_public: boolean;
  body_json: { sections: SectionData[] };
  template_key: string | null;
}

function newSectionId(): string {
  return `sec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function emptySection(position: number): SectionData {
  return {
    id: newSectionId(),
    title: "Nouvelle section",
    body_md: "",
    is_public: true,
    position,
  };
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function AdminNewsletterEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const { push: pushToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(true);

  const [data, setData] = useState<NewsletterFull | null>(null);

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
      const { data: row, error: err } = await sb
        .from("newsletters")
        .select("id, title, slug, subtitle, audience, status, is_public, body_json, template_key")
        .eq("id", id)
        .single();
      if (err) throw err;
      const sections = (row.body_json?.sections as SectionData[] | undefined) ?? [];
      // Normalise positions (au cas où data corrompue)
      sections.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      sections.forEach((s, i) => {
        s.position = i + 1;
        if (!s.id) s.id = newSectionId();
        if (typeof s.is_public !== "boolean") s.is_public = true;
      });
      setData({
        ...row,
        body_json: { sections },
      } as NewsletterFull);
      setDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  // Garde-fou : warn si quitte sans save
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function update<K extends keyof NewsletterFull>(key: K, value: NewsletterFull[K]) {
    setData((d) => (d ? { ...d, [key]: value } : d));
    setDirty(true);
  }

  function updateSection(sectionId: string, patch: Partial<SectionData>) {
    setData((d) => {
      if (!d) return d;
      const sections = d.body_json.sections.map((s) =>
        s.id === sectionId ? { ...s, ...patch } : s,
      );
      return { ...d, body_json: { sections } };
    });
    setDirty(true);
  }

  function addSection() {
    setData((d) => {
      if (!d) return d;
      const next = [...d.body_json.sections, emptySection(d.body_json.sections.length + 1)];
      return { ...d, body_json: { sections: next } };
    });
    setDirty(true);
  }

  function removeSection(sectionId: string) {
    if (!confirm("Supprimer cette section ?")) return;
    setData((d) => {
      if (!d) return d;
      const next = d.body_json.sections
        .filter((s) => s.id !== sectionId)
        .map((s, i) => ({ ...s, position: i + 1 }));
      return { ...d, body_json: { sections: next } };
    });
    setDirty(true);
  }

  function moveSection(sectionId: string, direction: "up" | "down") {
    setData((d) => {
      if (!d) return d;
      const sections = [...d.body_json.sections];
      const idx = sections.findIndex((s) => s.id === sectionId);
      if (idx < 0) return d;
      const target = direction === "up" ? idx - 1 : idx + 1;
      if (target < 0 || target >= sections.length) return d;
      [sections[idx], sections[target]] = [sections[target], sections[idx]];
      sections.forEach((s, i) => (s.position = i + 1));
      return { ...d, body_json: { sections } };
    });
    setDirty(true);
  }

  async function save() {
    if (!data || saving) return;
    if (data.title.trim().length < 4) {
      alert("Titre obligatoire (4 caractères minimum).");
      return;
    }
    if (!data.slug.trim()) {
      alert("Slug obligatoire.");
      return;
    }
    setSaving(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible.");
      const { error: err } = await sb
        .from("newsletters")
        .update({
          title: data.title.trim(),
          slug: data.slug.trim(),
          subtitle: data.subtitle?.trim() || null,
          audience: data.audience,
          is_public: data.is_public,
          body_json: data.body_json,
        })
        .eq("id", data.id);
      if (err) throw err;
      setDirty(false);
      pushToast({ tone: "success", title: "✅ Enregistré" });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur inconnue.");
    } finally {
      setSaving(false);
    }
  }

  const publicSectionsCount = useMemo(
    () => (data ? data.body_json.sections.filter((s) => s.is_public).length : 0),
    [data],
  );

  if (!currentUser || currentUser.role !== "admin") return null;

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: "var(--ls-text-muted)" }}>
        Chargement…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: 32, maxWidth: 600, margin: "0 auto" }}>
        <p style={{ color: "var(--ls-coral)", padding: 12, background: "rgba(251,113,133,0.10)", borderRadius: 10 }}>
          ⚠️ {error ?? "Newsletter introuvable."}
        </p>
        <button
          type="button"
          onClick={() => navigate("/admin/newsletters")}
          style={btnGhostStyle}
        >
          ← Retour à la liste
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 16px", maxWidth: 1400, margin: "0 auto" }}>
      {/* ─── Top bar ────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() => {
            if (dirty && !confirm("Modifications non sauvegardées. Quitter ?")) return;
            navigate("/admin/newsletters");
          }}
          style={btnGhostStyle}
        >
          ← Retour
        </button>
        <div style={{ flex: 1 }} />
        <button
          type="button"
          onClick={() => setPreviewOpen((v) => !v)}
          style={btnGhostStyle}
          title="Afficher/masquer l'aperçu"
        >
          {previewOpen ? "👁 Aperçu" : "📝 Édition seule"}
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving || !dirty}
          style={{
            ...btnPrimaryStyle,
            opacity: saving ? 0.6 : dirty ? 1 : 0.5,
            cursor: saving || !dirty ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "Enregistrement…" : dirty ? "💾 Enregistrer" : "✓ À jour"}
        </button>
      </div>

      {/* ─── Split layout ───────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: previewOpen ? "minmax(0, 1fr) minmax(0, 1fr)" : "minmax(0, 1fr)",
          gap: 20,
          alignItems: "start",
        }}
      >
        {/* ─── LEFT — Form ────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          <Section title="Méta">
            <Label>Titre *</Label>
            <input
              type="text"
              value={data.title}
              onChange={(e) => update("title", e.target.value)}
              style={inputStyle}
            />

            <Label>Sous-titre</Label>
            <input
              type="text"
              value={data.subtitle ?? ""}
              onChange={(e) => update("subtitle", e.target.value)}
              style={inputStyle}
              placeholder="Sous-titre éditorial…"
            />

            <Label>
              Slug (URL publique)
              <button
                type="button"
                onClick={() => update("slug", slugify(data.title))}
                style={{
                  marginLeft: 8,
                  padding: "2px 8px",
                  fontSize: 10,
                  background: "transparent",
                  border: "1px solid var(--ls-border)",
                  borderRadius: 6,
                  color: "var(--ls-text-muted)",
                  cursor: "pointer",
                }}
              >
                Re-générer depuis titre
              </button>
            </Label>
            <input
              type="text"
              value={data.slug}
              onChange={(e) => update("slug", e.target.value)}
              style={{ ...inputStyle, fontFamily: "var(--ls-font-mono, monospace)" }}
            />
            <p style={{ fontSize: 11, color: "var(--ls-text-muted)", margin: "-8px 0 14px" }}>
              URL publique : <code>/news/{data.slug}</code>
            </p>

            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <Label>Audience</Label>
                <select
                  value={data.audience}
                  onChange={(e) => update("audience", e.target.value as NewsletterAudience)}
                  style={inputStyle}
                >
                  <option value="all">Tous (clients + distri)</option>
                  <option value="clients">Clients uniquement</option>
                  <option value="distri">Distri uniquement</option>
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <Label>Version publique</Label>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 12px",
                    background: "var(--ls-bg)",
                    border: "1px solid var(--ls-border)",
                    borderRadius: 10,
                    cursor: "pointer",
                    marginBottom: 14,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={data.is_public}
                    onChange={(e) => update("is_public", e.target.checked)}
                  />
                  <span style={{ fontSize: 13, color: "var(--ls-text)" }}>
                    Page <code>/news/{data.slug}</code> publique
                  </span>
                </label>
              </div>
            </div>
          </Section>

          <Section
            title={`Sections (${data.body_json.sections.length})`}
            subtitle={
              data.is_public
                ? `${publicSectionsCount} publique${publicSectionsCount > 1 ? "s" : ""} · ${
                    data.body_json.sections.length - publicSectionsCount
                  } privée${data.body_json.sections.length - publicSectionsCount > 1 ? "s" : ""} (teaser)`
                : "Toutes les sections sont privées (newsletter non publique)"
            }
          >
            {data.body_json.sections.length === 0 && (
              <p style={{ fontSize: 13, color: "var(--ls-text-muted)", margin: "0 0 12px" }}>
                Aucune section. Ajoute-en pour commencer la rédaction.
              </p>
            )}
            {data.body_json.sections.map((section, idx) => (
              <SectionEditor
                key={section.id}
                section={section}
                index={idx}
                total={data.body_json.sections.length}
                onChange={(patch) => updateSection(section.id, patch)}
                onRemove={() => removeSection(section.id)}
                onMoveUp={() => moveSection(section.id, "up")}
                onMoveDown={() => moveSection(section.id, "down")}
              />
            ))}
            <button
              type="button"
              onClick={addSection}
              style={{
                ...btnGhostStyle,
                width: "100%",
                padding: "12px 16px",
                marginTop: 8,
                background: "color-mix(in srgb, var(--ls-teal) 8%, transparent)",
                borderColor: "color-mix(in srgb, var(--ls-teal) 30%, var(--ls-border))",
                color: "var(--ls-teal)",
              }}
            >
              ➕ Ajouter une section
            </button>
          </Section>
        </div>

        {/* ─── RIGHT — Preview ────────────────────────────────────────── */}
        {previewOpen && (
          <div style={{ minWidth: 0, position: "sticky", top: 16, alignSelf: "start" }}>
            <NewsletterPreview data={data} />
          </div>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        background: "var(--ls-surface)",
        border: "1px solid var(--ls-border)",
        borderRadius: 12,
        padding: 16,
      }}
    >
      <div style={{ marginBottom: 12 }}>
        <h2
          style={{
            margin: 0,
            fontFamily: "'Syne', serif",
            fontSize: 16,
            fontWeight: 700,
            color: "var(--ls-text)",
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--ls-text-muted)" }}>
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

function SectionEditor({
  section,
  index,
  total,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  section: SectionData;
  index: number;
  total: number;
  onChange: (patch: Partial<SectionData>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div
      style={{
        border: "1px solid var(--ls-border)",
        borderRadius: 10,
        padding: 12,
        marginBottom: 10,
        background: "var(--ls-bg)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "var(--ls-text-muted)",
            background: "var(--ls-surface)",
            padding: "3px 9px",
            borderRadius: 999,
            border: "1px solid var(--ls-border)",
          }}
        >
          #{index + 1}
        </span>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: "var(--ls-text-muted)",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={section.is_public}
            onChange={(e) => onChange({ is_public: e.target.checked })}
          />
          {section.is_public ? "🌐 Publique" : "🔒 Privée (teaser)"}
        </label>
        <div style={{ flex: 1 }} />
        <button
          type="button"
          onClick={onMoveUp}
          disabled={index === 0}
          style={{ ...iconBtnStyle, opacity: index === 0 ? 0.3 : 1 }}
          title="Monter"
        >
          ↑
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={index === total - 1}
          style={{ ...iconBtnStyle, opacity: index === total - 1 ? 0.3 : 1 }}
          title="Descendre"
        >
          ↓
        </button>
        <button
          type="button"
          onClick={onRemove}
          style={{ ...iconBtnStyle, color: "var(--ls-coral)" }}
          title="Supprimer"
        >
          🗑
        </button>
      </div>
      <input
        type="text"
        value={section.title}
        onChange={(e) => onChange({ title: e.target.value })}
        placeholder="Titre de la section…"
        style={{ ...inputStyle, fontWeight: 600, marginBottom: 8 }}
      />
      <textarea
        value={section.body_md}
        onChange={(e) => onChange({ body_md: e.target.value })}
        rows={6}
        placeholder="Contenu (markdown : ## titre, **gras**, *italique*, - liste, > citation…)"
        style={{
          ...inputStyle,
          fontFamily: "var(--ls-font-mono, monospace)",
          fontSize: 13,
          resize: "vertical",
          minHeight: 100,
          marginBottom: 0,
        }}
      />
    </div>
  );
}

function NewsletterPreview({ data }: { data: NewsletterFull }) {
  return (
    <div
      style={{
        background: "var(--ls-surface)",
        border: "1px solid var(--ls-border)",
        borderRadius: 12,
        padding: 24,
        maxHeight: "calc(100vh - 60px)",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--ls-teal)",
          marginBottom: 12,
        }}
      >
        🌐 Aperçu page publique /news/{data.slug}
      </div>

      <h1
        style={{
          fontFamily: "'Syne', serif",
          fontSize: 28,
          fontWeight: 700,
          margin: "0 0 6px",
          color: "var(--ls-text)",
          lineHeight: 1.2,
        }}
      >
        {data.title || <span style={{ opacity: 0.4 }}>(titre)</span>}
      </h1>
      {data.subtitle && (
        <p
          style={{
            margin: "0 0 20px",
            fontSize: 15,
            color: "var(--ls-text-muted)",
            lineHeight: 1.5,
            fontStyle: "italic",
          }}
        >
          {data.subtitle}
        </p>
      )}

      {data.body_json.sections.length === 0 && (
        <div
          style={{
            padding: 24,
            textAlign: "center",
            color: "var(--ls-text-muted)",
            fontSize: 13,
            border: "1px dashed var(--ls-border)",
            borderRadius: 10,
            marginTop: 16,
          }}
        >
          Aucune section pour le moment.<br />
          L'aperçu se met à jour automatiquement.
        </div>
      )}

      {data.body_json.sections.map((section) => (
        <article
          key={section.id}
          style={{
            marginTop: 24,
            paddingTop: 20,
            borderTop: "1px solid var(--ls-border)",
            opacity: section.is_public || !data.is_public ? 1 : 0.55,
            position: "relative",
          }}
        >
          {data.is_public && !section.is_public && (
            <span
              style={{
                position: "absolute",
                top: 14,
                right: 0,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "var(--ls-gold)",
                background: "color-mix(in srgb, var(--ls-gold) 14%, transparent)",
                padding: "3px 9px",
                borderRadius: 999,
              }}
            >
              🔒 PRIVÉE
            </span>
          )}
          <h2
            style={{
              fontFamily: "'Syne', serif",
              fontSize: 20,
              fontWeight: 700,
              margin: "0 0 10px",
              color: "var(--ls-text)",
            }}
          >
            {section.title || <span style={{ opacity: 0.4 }}>(titre section)</span>}
          </h2>
          {section.body_md.trim() ? (
            <MarkdownRenderer content={section.body_md} />
          ) : (
            <p style={{ color: "var(--ls-text-muted)", fontSize: 13, fontStyle: "italic", margin: 0 }}>
              (Vide — saisis du markdown à gauche)
            </p>
          )}
        </article>
      ))}

      {data.is_public && data.body_json.sections.some((s) => !s.is_public) && (
        <div
          style={{
            marginTop: 24,
            padding: 16,
            background: "color-mix(in srgb, var(--ls-teal) 8%, transparent)",
            border: "1px dashed color-mix(in srgb, var(--ls-teal) 40%, var(--ls-border))",
            borderRadius: 12,
            textAlign: "center",
          }}
        >
          <p style={{ margin: "0 0 6px", fontSize: 13, color: "var(--ls-text)", fontWeight: 600 }}>
            🔓 Lis la suite en faisant ton bilan en 2 min
          </p>
          <p style={{ margin: 0, fontSize: 11, color: "var(--ls-text-muted)" }}>
            (CTA réel sera câblé en étape 8.10)
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────
function Label({ children }: { children: ReactNode }) {
  return (
    <label
      style={{
        display: "block",
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: "var(--ls-text-muted)",
        marginBottom: 6,
      }}
    >
      {children}
    </label>
  );
}

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
const iconBtnStyle: React.CSSProperties = {
  width: 30,
  height: 30,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--ls-surface)",
  border: "1px solid var(--ls-border)",
  borderRadius: 8,
  color: "var(--ls-text)",
  fontSize: 14,
  cursor: "pointer",
  padding: 0,
};
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
const btnPrimaryStyle: React.CSSProperties = {
  padding: "9px 18px",
  background: "var(--ls-gold)",
  border: "none",
  borderRadius: 10,
  color: "var(--ls-charcoal)",
  fontWeight: 700,
  fontSize: 13,
};

export default AdminNewsletterEditPage;
