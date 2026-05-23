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

type PaywallMode = "none" | "teaser";

interface SectionData {
  id: string;
  title: string;
  body_md: string;
  is_public: boolean;
  position: number;
  // Champs riches alignés sur docs/mockups/newsletter-mai-juin.html (8.4b)
  emoji: string;             // ex: "💧"
  tag_label: string;         // ex: "Conseil #1 · Hydratation" (vide = pas de pill)
  saviez_vous_md: string;    // markdown callout (vide = pas de callout)
  saviez_vous_label: string; // ex: "Le saviez-vous ?" ou "Côté coach 👋"
  show_cta_bilan: boolean;   // affiche le CTA Bilan inline gold
  paywall_mode: PaywallMode; // 'teaser' = masque + CTA "Débloque"
}

// Normalise les sections lues depuis Supabase pour garantir tous les champs riches
// (rétro-compat : sections créées avant 8.4b n'ont que id/title/body_md/is_public/position).
function normalizeSection(raw: Partial<SectionData> & { id?: string }, fallbackPos: number): SectionData {
  return {
    id: raw.id ?? `sec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: raw.title ?? "",
    body_md: raw.body_md ?? "",
    is_public: typeof raw.is_public === "boolean" ? raw.is_public : true,
    position: raw.position ?? fallbackPos,
    emoji: raw.emoji ?? "",
    tag_label: raw.tag_label ?? "",
    saviez_vous_md: raw.saviez_vous_md ?? "",
    saviez_vous_label: raw.saviez_vous_label ?? "Le saviez-vous ?",
    show_cta_bilan: raw.show_cta_bilan ?? false,
    paywall_mode: raw.paywall_mode ?? "none",
  };
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
  return normalizeSection(
    {
      id: newSectionId(),
      title: "Nouvelle section",
      tag_label: `Conseil #${position}`,
    },
    position,
  );
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
      const rawSections = (row.body_json?.sections as Array<Partial<SectionData>> | undefined) ?? [];
      const sectionsSorted = [...rawSections].sort(
        (a, b) => (a.position ?? 0) - (b.position ?? 0),
      );
      const sections = sectionsSorted.map((s, i) => normalizeSection(s, i + 1));
      sections.forEach((s, i) => (s.position = i + 1));
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
  const [showAdvanced, setShowAdvanced] = useState(
    Boolean(section.saviez_vous_md || section.show_cta_bilan || section.paywall_mode !== "none"),
  );

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
      {/* Top bar : numéro + public/privé + reorder + delete */}
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

      {/* Tag pill + emoji */}
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input
          type="text"
          value={section.emoji}
          onChange={(e) => onChange({ emoji: e.target.value.slice(0, 4) })}
          placeholder="💧"
          style={{
            ...inputStyle,
            width: 70,
            textAlign: "center",
            fontSize: 22,
            marginBottom: 0,
            flex: "0 0 70px",
          }}
          title="Emoji affiché à côté du titre"
        />
        <input
          type="text"
          value={section.tag_label}
          onChange={(e) => onChange({ tag_label: e.target.value })}
          placeholder="Conseil #1 · Hydratation"
          style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
          title="Tag pill teal au-dessus du titre"
        />
      </div>

      {/* Titre */}
      <input
        type="text"
        value={section.title}
        onChange={(e) => onChange({ title: e.target.value })}
        placeholder="Titre de la section…"
        style={{ ...inputStyle, fontWeight: 600, marginTop: 8, marginBottom: 8 }}
      />

      {/* Body markdown */}
      <textarea
        value={section.body_md}
        onChange={(e) => onChange({ body_md: e.target.value })}
        rows={6}
        placeholder="Contenu (markdown : **gras**, *italique*, - liste, > citation…)"
        style={{
          ...inputStyle,
          fontFamily: "var(--ls-font-mono, monospace)",
          fontSize: 13,
          resize: "vertical",
          minHeight: 100,
          marginBottom: 8,
        }}
      />

      {/* Toggle "Options avancées" */}
      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        style={{
          background: "transparent",
          border: "none",
          color: "var(--ls-text-muted)",
          fontSize: 12,
          cursor: "pointer",
          padding: "4px 0",
          fontWeight: 600,
        }}
      >
        {showAdvanced ? "− Masquer options" : "+ Callout, CTA Bilan, Paywall…"}
      </button>

      {showAdvanced && (
        <div
          style={{
            marginTop: 10,
            paddingTop: 12,
            borderTop: "1px dashed var(--ls-border)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {/* Callout "Le saviez-vous ?" */}
          <div>
            <Label>Label du callout</Label>
            <input
              type="text"
              value={section.saviez_vous_label}
              onChange={(e) => onChange({ saviez_vous_label: e.target.value })}
              placeholder="Le saviez-vous ?"
              style={{ ...inputStyle, marginBottom: 6 }}
            />
            <Label>Contenu du callout (markdown, vide = masqué)</Label>
            <textarea
              value={section.saviez_vous_md}
              onChange={(e) => onChange({ saviez_vous_md: e.target.value })}
              rows={3}
              placeholder="Ex: Avoir soif = être déjà légèrement déshydraté…"
              style={{
                ...inputStyle,
                fontFamily: "var(--ls-font-mono, monospace)",
                fontSize: 13,
                resize: "vertical",
                minHeight: 60,
                marginBottom: 0,
              }}
            />
          </div>

          {/* CTA Bilan inline */}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              background: "var(--ls-surface)",
              border: "1px solid var(--ls-border)",
              borderRadius: 10,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={section.show_cta_bilan}
              onChange={(e) => onChange({ show_cta_bilan: e.target.checked })}
            />
            <span style={{ fontSize: 13, color: "var(--ls-text)" }}>
              🎯 Afficher CTA Bilan en bas de section (gold)
            </span>
          </label>

          {/* Paywall mode */}
          <div>
            <Label>Paywall</Label>
            <select
              value={section.paywall_mode}
              onChange={(e) => onChange({ paywall_mode: e.target.value as PaywallMode })}
              style={{ ...inputStyle, marginBottom: 0 }}
            >
              <option value="none">Pas de paywall</option>
              <option value="teaser">Teaser : masque + CTA "Débloque ton programme"</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

// Rendu pixel-perfect du mockup docs/mockups/newsletter-mai-juin.html
// Couleurs hardcodées car cet aperçu doit ressembler à l'email/page publique
// (qui sont toujours light theme cream, indépendamment du thème admin).
const PV = {
  gold: "#C9A84C",
  goldLight: "#E5C97D",
  teal: "#2DD4BF",
  tealDark: "#0F766E",
  charcoal: "#0B0D11",
  cream: "#FBF7F0",
  surface: "#FFFFFF",
  surface2: "#F7F3EC",
  border: "rgba(11,13,17,0.10)",
  text: "#1F2937",
  textMuted: "#4B5563",
  textHint: "#9CA3AF",
};

function NewsletterPreview({ data }: { data: NewsletterFull }) {
  const sections = data.body_json.sections;
  const hasPrivateSections = data.is_public && sections.some((s) => !s.is_public);

  return (
    <div
      style={{
        background: PV.surface2,
        border: "1px solid var(--ls-border)",
        borderRadius: 12,
        padding: 12,
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
          marginBottom: 10,
          paddingLeft: 4,
        }}
      >
        🌐 Aperçu /news/{data.slug}
      </div>

      {/* Container newsletter (max 640px comme mockup) */}
      <div
        style={{
          maxWidth: 640,
          margin: "0 auto",
          background: PV.surface,
          boxShadow: "0 4px 30px rgba(0,0,0,0.05)",
          borderRadius: 8,
          overflow: "hidden",
          color: PV.text,
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {/* ─── Header brand ─── */}
        <header
          style={{
            padding: "24px 20px 20px",
            background: "linear-gradient(135deg, #FAEEDA 0%, #FBF7F0 100%)",
            borderBottom: `1px solid ${PV.border}`,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: "'Syne', Georgia, serif",
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "0.15em",
              color: PV.gold,
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            La Base 360{" "}
            <span
              style={{
                display: "inline-block",
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: PV.teal,
                margin: "0 6px",
                transform: "translateY(-2px)",
              }}
            />{" "}
            News
          </div>
          <div style={{ fontSize: 12, color: PV.textHint, fontWeight: 500 }}>
            {data.subtitle || `Édition ${new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`}
          </div>
        </header>

        {/* ─── Hero ─── */}
        <section style={{ padding: "32px 20px 28px", textAlign: "center", background: PV.surface }}>
          <h1
            style={{
              fontFamily: "'Syne', Georgia, serif",
              fontSize: 28,
              fontWeight: 700,
              color: PV.text,
              lineHeight: 1.25,
              margin: "0 0 12px",
            }}
          >
            {data.title || <span style={{ opacity: 0.4 }}>(titre de la newsletter)</span>}
          </h1>
          {data.subtitle && (
            <p
              style={{
                fontSize: 15,
                color: PV.textMuted,
                maxWidth: 380,
                margin: "0 auto",
                lineHeight: 1.5,
              }}
            >
              {data.subtitle}
            </p>
          )}
        </section>

        {/* ─── Sections ─── */}
        {sections.length === 0 && (
          <div
            style={{
              padding: 32,
              textAlign: "center",
              color: PV.textMuted,
              fontSize: 13,
              fontStyle: "italic",
            }}
          >
            Aucune section. Ajoute-en à gauche, l'aperçu s'actualise en temps réel.
          </div>
        )}

        {sections.map((section) => (
          <NewsletterPreviewSection
            key={section.id}
            section={section}
            newsletterIsPublic={data.is_public}
          />
        ))}

        {/* ─── CTA Business (auto-appended, futur 8.10) ─── */}
        <section
          style={{
            margin: "24px 20px",
            padding: "22px 20px",
            background: `linear-gradient(135deg, ${PV.tealDark} 0%, ${PV.teal} 100%)`,
            borderRadius: 16,
            color: "white",
            textAlign: "center",
            boxShadow: "0 8px 24px rgba(13,118,110,0.25)",
            position: "relative",
          }}
        >
          <span
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.06em",
              color: "rgba(255,255,255,0.7)",
              background: "rgba(255,255,255,0.12)",
              padding: "2px 7px",
              borderRadius: 4,
            }}
          >
            AUTO 8.10
          </span>
          <div
            style={{
              display: "inline-block",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              padding: "4px 12px",
              borderRadius: 12,
              background: "rgba(255,255,255,0.18)",
              marginBottom: 12,
            }}
          >
            💼 Opportunité
          </div>
          <h3
            style={{
              fontFamily: "'Syne', Georgia, serif",
              fontSize: 22,
              fontWeight: 700,
              margin: "0 0 10px",
              lineHeight: 1.3,
            }}
          >
            Tu pensais auto-financer tes vacances ?
          </h3>
          <p style={{ fontSize: 14, opacity: 0.92, margin: "0 auto 16px", maxWidth: 340 }}>
            Découvre comment notre équipe accompagne celles et ceux qui veulent
            transformer leur passion santé en revenus complémentaires.
          </p>
          <span
            style={{
              display: "inline-block",
              padding: "14px 28px",
              background: "white",
              color: PV.tealDark,
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            Je découvre l'opportunité →
          </span>
        </section>

        {/* ─── Footer (auto-appended, futur 8.7) ─── */}
        <footer
          style={{
            padding: "28px 20px 32px",
            textAlign: "center",
            background: PV.charcoal,
            color: PV.cream,
            position: "relative",
          }}
        >
          <span
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.06em",
              color: "rgba(251,247,240,0.5)",
              background: "rgba(251,247,240,0.1)",
              padding: "2px 7px",
              borderRadius: 4,
            }}
          >
            AUTO 8.7
          </span>
          <div
            style={{
              fontFamily: "'Syne', Georgia, serif",
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "0.15em",
              color: PV.gold,
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            La Base 360 <span style={{ color: PV.teal }}>·</span> News
          </div>
          <div style={{ fontSize: 13, color: "rgba(251,247,240,0.7)", marginBottom: 18 }}>
            Conseils nutrition & bien-être, sans pression.
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 18 }}>
            {["📷", "📘", "💬", "▶️"].map((e, i) => (
              <span
                key={i}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "rgba(251,247,240,0.08)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                }}
              >
                {e}
              </span>
            ))}
          </div>
          <div style={{ fontSize: 11, color: "rgba(251,247,240,0.45)", maxWidth: 420, margin: "0 auto", lineHeight: 1.5 }}>
            Se désabonner · Mentions légales
          </div>
        </footer>
      </div>

      {hasPrivateSections && (
        <p
          style={{
            marginTop: 12,
            padding: 10,
            fontSize: 11,
            color: "var(--ls-text-muted)",
            textAlign: "center",
            fontStyle: "italic",
          }}
        >
          🔒 Les sections privées (paywall) ne s'affichent pas en mode public —
          remplacées par un CTA "Débloque via ton bilan".
        </p>
      )}
    </div>
  );
}

function NewsletterPreviewSection({
  section,
  newsletterIsPublic,
}: {
  section: SectionData;
  newsletterIsPublic: boolean;
}) {
  const hiddenInPublic = newsletterIsPublic && !section.is_public;

  return (
    <section
      style={{
        padding: "24px 20px 20px",
        borderBottom: `1px solid ${PV.border}`,
        position: "relative",
        opacity: hiddenInPublic ? 0.55 : 1,
        overflow: section.paywall_mode === "teaser" ? "hidden" : undefined,
        paddingBottom: section.paywall_mode === "teaser" ? 80 : 20,
      }}
    >
      {hiddenInPublic && (
        <span
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: PV.gold,
            background: "rgba(201,168,76,0.16)",
            padding: "3px 8px",
            borderRadius: 999,
          }}
        >
          🔒 MASQUÉE (PUBLIC)
        </span>
      )}

      {/* Tag pill */}
      {section.tag_label && (
        <span
          style={{
            display: "inline-block",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            padding: "4px 10px",
            borderRadius: 12,
            background: "rgba(45,212,191,0.12)",
            color: PV.tealDark,
            marginBottom: 12,
          }}
        >
          {section.tag_label}
        </span>
      )}

      {/* Titre H2 avec emoji */}
      <h2
        style={{
          fontFamily: "'Syne', Georgia, serif",
          fontSize: 22,
          fontWeight: 700,
          color: PV.text,
          lineHeight: 1.3,
          margin: "0 0 10px",
        }}
      >
        {section.emoji && (
          <span style={{ fontSize: 26, marginRight: 4 }}>{section.emoji}</span>
        )}
        {section.title || <span style={{ opacity: 0.4 }}>(titre section)</span>}
      </h2>

      {/* Body markdown */}
      <div style={{ color: PV.text, fontSize: 15, lineHeight: 1.6 }}>
        {section.body_md.trim() ? (
          <MarkdownRenderer content={section.body_md} />
        ) : (
          <p style={{ color: PV.textMuted, fontStyle: "italic", margin: 0 }}>
            (Saisis du markdown à gauche)
          </p>
        )}
      </div>

      {/* Callout "Le saviez-vous ?" */}
      {section.saviez_vous_md.trim() && (
        <div
          style={{
            marginTop: 14,
            padding: "14px 16px",
            background: PV.surface2,
            borderLeft: `3px solid ${PV.gold}`,
            borderRadius: 4,
            fontSize: 14,
            color: PV.textMuted,
            fontStyle: "italic",
          }}
        >
          <strong
            style={{
              fontStyle: "normal",
              color: PV.gold,
              display: "block",
              marginBottom: 4,
            }}
          >
            {section.saviez_vous_label || "Le saviez-vous ?"}
          </strong>
          <MarkdownRenderer content={section.saviez_vous_md} />
        </div>
      )}

      {/* CTA Bilan inline */}
      {section.show_cta_bilan && (
        <div
          style={{
            margin: "18px 0 6px",
            padding: "16px 18px",
            background: "linear-gradient(135deg, #FAEEDA 0%, #F4DFA8 100%)",
            borderRadius: 12,
            border: "1px solid rgba(201,168,76,0.3)",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div style={{ fontSize: 28, flexShrink: 0 }}>🎯</div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: "'Syne', Georgia, serif",
                fontSize: 15,
                fontWeight: 700,
                color: "#633806",
                lineHeight: 1.3,
                marginBottom: 2,
              }}
            >
              Prêt(e) pour la suite ?
            </div>
            <div style={{ fontSize: 12, color: "#8B5A1B" }}>
              Fais ton bilan personnalisé en 2 min
            </div>
          </div>
          <span
            style={{
              padding: "10px 16px",
              background: PV.charcoal,
              color: PV.cream,
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 13,
              whiteSpace: "nowrap",
            }}
          >
            Je commence
          </span>
        </div>
      )}

      {/* Paywall teaser : masque + CTA "Débloque" */}
      {section.paywall_mode === "teaser" && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            padding: "28px 20px",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(251,247,240,0.8) 30%, " +
              PV.surface2 +
              " 100%)",
            textAlign: "center",
          }}
        >
          <h3
            style={{
              fontFamily: "'Syne', Georgia, serif",
              fontSize: 16,
              fontWeight: 700,
              color: PV.text,
              margin: "0 0 6px",
            }}
          >
            🔒 La suite est réservée
          </h3>
          <p style={{ fontSize: 13, color: PV.textMuted, margin: "0 auto 12px", maxWidth: 320 }}>
            Débloque le programme complet avec ton bilan personnalisé.
          </p>
          <span
            style={{
              display: "inline-block",
              background: PV.charcoal,
              color: PV.cream,
              padding: "10px 20px",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            Je débloque →
          </span>
        </div>
      )}
    </section>
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
