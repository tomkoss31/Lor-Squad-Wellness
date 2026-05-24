// =============================================================================
// PublicNewsletterPage — Chantier #8 étape 8.7 (2026-05-23).
// Route publique /news/:slug pour partage social et lead-magnet.
// =============================================================================
//
// Public (no auth). Visible uniquement si status='sent' AND is_public=true.
// Sections privées sont masquées + paywall affiché.
//
// Style : copie pixel-perfect du mockup docs/mockups/newsletter-mai-juin.html.
// Couleurs hardcodées (light theme cream), indépendant du theme app coach.
//
// Tracking : POST /functions/v1/track-newsletter-view au mount (rate limit
// IP côté edge, idempotent).
//
// OG tags : injectés via useEffect (V1). Pour vrai preview social → 8.8.
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { MarkdownRenderer } from "../components/formation/MarkdownRenderer";
import { getSupabaseClient } from "../services/supabaseClient";

interface SectionData {
  id: string;
  title: string;
  body_md: string;
  is_public: boolean;
  position: number;
  emoji: string;
  tag_label: string;
  saviez_vous_md: string;
  saviez_vous_label: string;
  show_cta_bilan: boolean;
  paywall_mode: "none" | "teaser";
}

interface NewsletterPublic {
  id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  body_json: { sections: SectionData[] };
  sent_at: string | null;
  preview_image_url: string | null;
}

// Palette light cream du mockup (pas le theme app)
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

function normalizeSection(raw: Partial<SectionData>, idx: number): SectionData {
  return {
    id: raw.id ?? `sec-${idx}`,
    title: raw.title ?? "",
    body_md: raw.body_md ?? "",
    is_public: raw.is_public !== false,
    position: raw.position ?? idx + 1,
    emoji: raw.emoji ?? "",
    tag_label: raw.tag_label ?? "",
    saviez_vous_md: raw.saviez_vous_md ?? "",
    saviez_vous_label: raw.saviez_vous_label ?? "Le saviez-vous ?",
    show_cta_bilan: raw.show_cta_bilan === true,
    paywall_mode: raw.paywall_mode === "teaser" ? "teaser" : "none",
  };
}

export function PublicNewsletterPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<NewsletterPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leadPopupOpen, setLeadPopupOpen] = useState(false);

  // Build CTA URLs avec UTM (slug = utm_campaign)
  const bilanUrl = `https://labase360.fr/bilan-online/admin?utm_source=newsletter&utm_medium=web&utm_campaign=${slug ?? "unknown"}`;
  const businessUrl = `https://labase360.fr/business?utm_source=newsletter&utm_medium=web&utm_campaign=${slug ?? "unknown"}&leadcapture=1`;

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const sb = await getSupabaseClient();
        if (!sb) throw new Error("Service indisponible.");
        // RLS public_read : status='sent' AND is_public=true
        const { data: row, error: err } = await sb
          .from("newsletters")
          .select("id, title, slug, subtitle, body_json, sent_at, preview_image_url")
          .eq("slug", slug)
          .eq("status", "sent")
          .eq("is_public", true)
          .single();
        if (err || !row) throw new Error("Newsletter introuvable ou non publique.");
        if (cancelled) return;

        const rawSections = (row.body_json?.sections as Array<Partial<SectionData>> | undefined) ?? [];
        const sections = rawSections.map(normalizeSection).sort((a, b) => a.position - b.position);
        setData({ ...row, body_json: { sections } } as NewsletterPublic);

        // Track view (best-effort, ne bloque pas)
        const supabaseUrl = (sb as unknown as { supabaseUrl: string }).supabaseUrl;
        fetch(`${supabaseUrl}/functions/v1/track-newsletter-view`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug }),
        }).catch(() => undefined);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erreur inconnue.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // OG tags V1 — injection useEffect (8.8 fera mieux avec edge function SSR).
  useEffect(() => {
    if (!data) return;
    const originalTitle = document.title;
    document.title = `${data.title} — La Base 360 News`;

    const metas: HTMLMetaElement[] = [];
    const setMeta = (attr: "name" | "property", key: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
        metas.push(el);
      }
      el.setAttribute("content", content);
    };
    const desc = data.subtitle ?? "Conseils nutrition & bien-être par La Base 360.";
    setMeta("name", "description", desc);
    setMeta("property", "og:title", `${data.title} — La Base 360 News`);
    setMeta("property", "og:description", desc);
    setMeta("property", "og:type", "article");
    // OG image dynamique via Vercel edge fn (étape 8.8)
    // URL absolue obligatoire pour les crawlers sociaux
    const origin = typeof window !== "undefined" ? window.location.origin : "https://labase360.fr";
    const ogImageUrl = data.preview_image_url ?? `${origin}/api/og/${data.slug}`;
    setMeta("property", "og:image", ogImageUrl);
    setMeta("property", "og:image:width", "1200");
    setMeta("property", "og:image:height", "630");
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:image", ogImageUrl);

    return () => {
      document.title = originalTitle;
      metas.forEach((m) => m.remove());
    };
  }, [data]);

  const editionLabel = useMemo(() => {
    if (!data) return "";
    if (data.subtitle) return data.subtitle;
    if (data.sent_at) {
      return `Édition ${new Date(data.sent_at).toLocaleDateString("fr-FR", {
        month: "long",
        year: "numeric",
      })}`;
    }
    return "";
  }, [data]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: PV.cream,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'DM Sans', sans-serif",
          color: PV.textMuted,
        }}
      >
        Chargement…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: PV.cream,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: 480,
            textAlign: "center",
            background: PV.surface,
            borderRadius: 16,
            padding: 32,
            boxShadow: "0 4px 30px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <h1
            style={{
              fontFamily: "'Syne', Georgia, serif",
              fontSize: 24,
              fontWeight: 700,
              color: PV.text,
              margin: "0 0 10px",
            }}
          >
            Newsletter introuvable
          </h1>
          <p style={{ fontSize: 14, color: PV.textMuted, margin: "0 0 18px" }}>
            {error ?? "Cette édition n'existe pas ou n'est pas publique."}
          </p>
          <a
            href="https://labase360.fr"
            style={{
              display: "inline-block",
              padding: "12px 22px",
              background: PV.charcoal,
              color: PV.cream,
              borderRadius: 10,
              textDecoration: "none",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            ← Retour sur La Base 360
          </a>
        </div>
      </div>
    );
  }

  const sections = data.body_json.sections;
  // En mode public : on garde les sections marquées is_public ET les paywall=teaser
  // (le teaser veut le début du contenu visible). Les sections is_public=false sans
  // paywall_mode='teaser' sont totalement masquées.
  const visibleSections = sections.filter((s) => s.is_public || s.paywall_mode === "teaser");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: PV.cream,
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        color: PV.text,
        lineHeight: 1.6,
        fontSize: 16,
      }}
    >
      <div
        style={{
          maxWidth: 640,
          margin: "0 auto",
          background: PV.surface,
          minHeight: "100vh",
          boxShadow: "0 4px 30px rgba(0,0,0,0.05)",
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
          <a
            href="https://labase360.fr"
            style={{
              display: "inline-block",
              fontFamily: "'Syne', Georgia, serif",
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "0.15em",
              color: PV.gold,
              textTransform: "uppercase",
              marginBottom: 6,
              textDecoration: "none",
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
          </a>
          <div style={{ fontSize: 12, color: PV.textHint, fontWeight: 500 }}>{editionLabel}</div>
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
            {data.title}
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

        {/* ─── Sections visibles ─── */}
        {visibleSections.map((section) => (
          <PublicSection key={section.id} section={section} bilanUrl={bilanUrl} />
        ))}

        {/* ─── CTA Business teal ─── */}
        <section
          style={{
            margin: "24px 20px",
            padding: "22px 20px",
            background: `linear-gradient(135deg, ${PV.tealDark} 0%, ${PV.teal} 100%)`,
            borderRadius: 16,
            color: "white",
            textAlign: "center",
            boxShadow: "0 8px 24px rgba(13,118,110,0.25)",
          }}
        >
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
              color: "white",
            }}
          >
            Tu pensais auto-financer tes vacances ?
          </h3>
          <p style={{ fontSize: 14, opacity: 0.92, margin: "0 auto 16px", maxWidth: 340, color: "white" }}>
            Découvre comment notre équipe accompagne celles et ceux qui veulent transformer leur passion santé en
            revenus complémentaires.
          </p>
          <button
            type="button"
            onClick={() => setLeadPopupOpen(true)}
            style={{
              display: "inline-block",
              padding: "14px 28px",
              background: "white",
              color: PV.tealDark,
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 14,
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Je découvre l'opportunité →
          </button>
        </section>

        {/* ─── Footer charcoal ─── */}
        <footer
          style={{
            padding: "28px 20px 32px",
            textAlign: "center",
            background: PV.charcoal,
            color: PV.cream,
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
              marginBottom: 8,
            }}
          >
            La Base 360 <span style={{ color: PV.teal }}>·</span> News
          </div>
          <div style={{ fontSize: 13, color: "rgba(251,247,240,0.7)", marginBottom: 18 }}>
            Conseils nutrition & bien-être, sans pression.
          </div>
          <div
            style={{
              fontSize: 11,
              color: "rgba(251,247,240,0.45)",
              maxWidth: 420,
              margin: "0 auto",
              lineHeight: 1.5,
            }}
          >
            Tu es ici parce que quelqu'un a partagé cette édition avec toi.<br />
            <a href="https://labase360.fr/mentions-legales" style={{ color: PV.goldLight, textDecoration: "none" }}>
              Mentions légales
            </a>
            {" · "}
            <a href="https://labase360.fr/privacy" style={{ color: PV.goldLight, textDecoration: "none" }}>
              Confidentialité
            </a>
          </div>
        </footer>
      </div>

      {/* ─── Popup Lead Capture ─── */}
      {leadPopupOpen && (
        <LeadCapturePopup
          onClose={() => setLeadPopupOpen(false)}
          businessUrl={businessUrl}
          newsletterSlug={slug ?? ""}
        />
      )}
    </div>
  );
}

function PublicSection({ section, bilanUrl }: { section: SectionData; bilanUrl: string }) {
  const isPaywall = section.paywall_mode === "teaser";

  return (
    <section
      style={{
        padding: "24px 20px 20px",
        borderBottom: `1px solid ${PV.border}`,
        position: "relative",
        overflow: isPaywall ? "hidden" : undefined,
        paddingBottom: isPaywall ? 80 : 20,
      }}
    >
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
        {section.emoji && <span style={{ fontSize: 26, marginRight: 4 }}>{section.emoji}</span>}
        {section.title}
      </h2>
      <div style={{ color: PV.text, fontSize: 15, lineHeight: 1.6 }}>
        {section.body_md && <MarkdownRenderer content={section.body_md} />}
      </div>

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
          <strong style={{ fontStyle: "normal", color: PV.gold, display: "block", marginBottom: 4 }}>
            {section.saviez_vous_label || "Le saviez-vous ?"}
          </strong>
          <MarkdownRenderer content={section.saviez_vous_md} />
        </div>
      )}

      {section.show_cta_bilan && (
        <a
          href={bilanUrl}
          style={{
            margin: "18px 0 6px",
            padding: "16px 18px",
            background: "linear-gradient(135deg, #FAEEDA 0%, #F4DFA8 100%)",
            borderRadius: 12,
            border: "1px solid rgba(201,168,76,0.3)",
            display: "flex",
            alignItems: "center",
            gap: 14,
            textDecoration: "none",
            color: "inherit",
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
            <div style={{ fontSize: 12, color: "#8B5A1B" }}>Fais ton bilan personnalisé en 2 min</div>
          </div>
          <span
            style={{
              display: "inline-block",
              marginLeft: "auto",
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
        </a>
      )}

      {isPaywall && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            padding: "28px 20px",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(251,247,240,0.8) 30%, " + PV.surface2 + " 100%)",
            textAlign: "center",
          }}
        >
          <h3
            style={{
              fontFamily: "'Syne', Georgia, serif",
              fontSize: 18,
              fontWeight: 700,
              color: PV.text,
              margin: "0 0 8px",
            }}
          >
            🔒 La suite est réservée
          </h3>
          <p style={{ fontSize: 14, color: PV.textMuted, margin: "0 auto 18px", maxWidth: 380 }}>
            Le programme complet adapté à ton profil t'attend après ton bilan personnalisé (2 min top chrono).
          </p>
          <a
            href={bilanUrl}
            style={{
              display: "inline-block",
              padding: "12px 24px",
              background: PV.charcoal,
              color: PV.cream,
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 13,
              textDecoration: "none",
            }}
          >
            Je débloque mon programme →
          </a>
        </div>
      )}
    </section>
  );
}

// ─── Lead capture popup (étape 8.10 enrichira le wiring vrai backend) ────────
function LeadCapturePopup({
  onClose,
  businessUrl,
  newsletterSlug,
}: {
  onClose: () => void;
  businessUrl: string;
  newsletterSlug: string;
}) {
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [referralSource, setReferralSource] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (firstName.trim().length < 2 || phone.trim().length < 6) {
      alert("Prénom et téléphone obligatoires.");
      return;
    }
    if (!consent) {
      alert("Merci de cocher le consentement.");
      return;
    }
    setSubmitting(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible.");
      // Réutilise submit-prospect-lead existant (étendu chantier #7 V2)
      const supabaseUrl = (sb as unknown as { supabaseUrl: string }).supabaseUrl;
      const res = await fetch(`${supabaseUrl}/functions/v1/submit-prospect-lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName.trim(),
          phone: phone.trim(),
          city: null,
          source: "newsletter_public",
          referral_source: referralSource.trim() || null,
          consent_recontact: consent,
          utm_source: "newsletter",
          utm_medium: "web",
          utm_campaign: newsletterSlug,
        }),
      });
      const result = await res.json();
      if (!res.ok || !result?.success) {
        throw new Error(result?.error ?? `HTTP ${res.status}`);
      }
      // Redirige vers /business
      window.location.href = businessUrl;
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur d'envoi.");
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(11,13,17,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        zIndex: 1000,
      }}
      onClick={() => !submitting && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: PV.surface,
          borderRadius: 16,
          padding: "28px 24px 24px",
          maxWidth: 420,
          width: "100%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          position: "relative",
        }}
      >
        <button
          type="button"
          onClick={() => !submitting && onClose()}
          aria-label="Fermer"
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: PV.surface2,
            border: "none",
            cursor: "pointer",
            fontSize: 18,
            color: PV.textMuted,
          }}
        >
          ×
        </button>
        <h3
          style={{
            fontFamily: "'Syne', Georgia, serif",
            fontSize: 22,
            fontWeight: 700,
            color: PV.text,
            margin: "0 0 6px",
          }}
        >
          Avant qu'on te montre tout ça… 👇
        </h3>
        <p style={{ fontSize: 14, color: PV.textMuted, margin: "0 0 20px" }}>
          2 infos rapides pour qu'on puisse t'envoyer la bonne info au bon moment.
        </p>

        <div style={{ marginBottom: 14 }}>
          <label htmlFor="lc-firstname" style={lcLabel}>
            Ton prénom *
          </label>
          <input
            id="lc-firstname"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Marie"
            style={lcInput}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label htmlFor="lc-phone" style={lcLabel}>
            Téléphone (WhatsApp préféré) *
          </label>
          <input
            id="lc-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="06 12 34 56 78"
            style={lcInput}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label htmlFor="lc-source" style={lcLabel}>
            Tu nous as découvert où ?
          </label>
          <input
            id="lc-source"
            type="text"
            value={referralSource}
            onChange={(e) => setReferralSource(e.target.value)}
            placeholder="Instagram, Facebook, un ami, autre…"
            style={lcInput}
          />
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            margin: "16px 0",
            fontSize: 12,
            color: PV.textMuted,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            style={{ marginTop: 2 }}
          />
          <span>J'accepte d'être recontacté(e) — pas de spam, pas de revente.</span>
        </label>

        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          style={{
            width: "100%",
            padding: 14,
            background: `linear-gradient(135deg, ${PV.tealDark}, ${PV.teal})`,
            color: "white",
            border: "none",
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 15,
            fontFamily: "inherit",
            cursor: submitting ? "not-allowed" : "pointer",
            opacity: submitting ? 0.6 : 1,
          }}
        >
          {submitting ? "Envoi…" : "Je découvre l'opportunité"}
        </button>

        <p style={{ textAlign: "center", fontSize: 11, color: PV.textHint, marginTop: 12 }}>
          🔒 Tes données restent privées et ne quittent jamais La Base 360.
        </p>
      </div>
    </div>
  );
}

const lcLabel: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: PV.text,
  marginBottom: 6,
};
const lcInput: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  border: `1px solid ${PV.border}`,
  borderRadius: 10,
  fontSize: 15,
  fontFamily: "inherit",
  background: PV.surface2,
  color: PV.text,
  outline: "none",
  boxSizing: "border-box",
};

export default PublicNewsletterPage;
