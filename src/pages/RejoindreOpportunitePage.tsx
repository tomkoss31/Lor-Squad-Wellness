// =============================================================================
// RejoindreOpportunitePage — Funnel Opportunité « gated » (chantier 2026-06).
// Brief : docs/BRIEF_OPPORTUNITE_GATED_2026-06.md
//
// ÉTAPE 1 — la « porte » (AVANT) :
//   - Route /rejoindre/:coachSlug (attribution coach + ?ref préservé)
//   - Hero accroche + pill coach
//   - Teaser de la page opportunité FLOUTÉ derrière un overlay verrouillé
//   - CTA « Je réponds » → questionnaire (étape 2)
//
// Identité visuelle : monde business G3 (emerald/cyan/violet, Sora/Inter),
// alignée sur BusinessPage + ProspectFormModal pour la continuité vers
// « le après » (la page /business débloquée). PAS la palette bilan.
//
// Le questionnaire rebondissant + scoring + submit = étapes 2-3 (à venir).
// =============================================================================

import { useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

// ─── Palette G3 business (cf. CLAUDE.md : BusinessPage --biz-* / ProspectFormModal) ──
const C = {
  emerald: "#10B981",
  cyan: "#06B6D4",
  violet: "#8B5CF6",
  ink: "#0B0D11",
  cream: "#F0EDE8",
  creamMuted: "rgba(240,237,232,0.62)",
  creamHint: "rgba(240,237,232,0.40)",
  hair: "rgba(255,255,255,0.10)",
};

function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}
function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export function RejoindreOpportunitePage() {
  const navigate = useNavigate();
  const { coachSlug } = useParams<{ coachSlug?: string }>();
  const [searchParams] = useSearchParams();

  const slug = useMemo(() => normalizeSlug(coachSlug ?? ""), [coachSlug]);
  const coachName = slug ? capitalize(slug) : "";

  // Préserve l'attribution (?ref=<coach_id>) en passant au questionnaire.
  function startQuestionnaire() {
    const qs = searchParams.toString();
    const base = slug ? `/rejoindre/${slug}/questionnaire` : "/rejoindre/questionnaire";
    navigate(qs ? `${base}?${qs}` : base);
  }

  return (
    <div style={styles.page}>
      <style>{KEYFRAMES}</style>

      {/* Glows ambient G3 */}
      <div aria-hidden="true" style={styles.glowTop} />
      <div aria-hidden="true" style={styles.glowBottom} />

      <div style={styles.container}>
        {/* Brand */}
        <div style={styles.brandRow}>
          <span style={styles.brandMark} aria-hidden="true" />
          <span style={styles.brandText}>
            La Base <span style={styles.brand360}>360</span>
          </span>
          <span style={styles.brandSub}>· Opportunité</span>
        </div>

        {/* Eyebrow */}
        <div style={styles.eyebrow}>
          <span style={styles.eyebrowDot} aria-hidden="true" /> Sur invitation
        </div>

        {/* H1 */}
        <h1 style={styles.h1}>
          Et si tu transformais ce que tu vis déjà{" "}
          <span style={styles.grad}>en revenu</span> ?
        </h1>

        <p style={styles.lead}>
          Avant de tout te montrer, on aimerait te connaître un peu.
          <br />
          <strong style={{ color: C.cream }}>1 minute, 0 engagement.</strong>
        </p>

        {/* Pill coach (attribution) */}
        {coachName ? (
          <div style={styles.coachPill}>
            <span style={styles.coachAvatar} aria-hidden="true">
              {coachName[0]}
            </span>
            <span style={styles.coachMeta}>
              <span style={styles.coachLabel}>Invité·e par</span>
              <span style={styles.coachName}>{coachName}</span>
            </span>
          </div>
        ) : null}

        {/* Teaser flouté de la page opportunité */}
        <div style={styles.teaserWrap}>
          <div style={styles.teaserBlur} aria-hidden="true">
            {TEASER_CARDS.map((t) => (
              <div key={t.title} style={styles.teaserCard}>
                <div style={styles.teaserEmoji}>{t.emoji}</div>
                <div>
                  <div style={styles.teaserTitle}>{t.title}</div>
                  <div style={styles.teaserDesc}>{t.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Overlay verrouillé */}
          <div style={styles.lockOverlay}>
            <div style={styles.lockBadge} aria-hidden="true">
              🔒
            </div>
            <div style={styles.lockTitle}>Accès verrouillé</div>
            <div style={styles.lockText}>
              Réponds à quelques questions pour débloquer l'opportunité complète :
              les 3 façons d'en vivre, ton plan chiffré, les témoignages.
            </div>
          </div>
        </div>

        {/* CTA */}
        <button type="button" onClick={startQuestionnaire} style={styles.cta}>
          Je réponds (1 min) →
        </button>

        <div style={styles.trust}>✓ Gratuit · ✓ Sans engagement · ✓ Réponse rapide</div>

        <p style={styles.legal}>
          En continuant, tu acceptes d'être recontacté·e par un coach La Base 360.
          Aucune donnée revendue.
        </p>
      </div>
    </div>
  );
}

// ─── Données teaser ─────────────────────────────────────────────────────────
const TEASER_CARDS = [
  { emoji: "💸", title: "Trois façons d'en vivre", desc: "Consommer, recommander, construire — tu choisis." },
  { emoji: "📈", title: "Tes 5 paliers de progression", desc: "Une mécanique claire : tes résultats, tes paliers." },
  { emoji: "🎯", title: "Démarrer coûte 61,21 €", desc: "Pas de stock, pas d'engagement, pas de minimum." },
  { emoji: "💬", title: "Ils l'ont fait avant toi", desc: "Des histoires vraies. Tu peux en écrire une autre." },
];

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(ellipse at top, rgba(16,185,129,0.12) 0%, transparent 55%)," +
      "radial-gradient(ellipse at bottom right, rgba(139,92,246,0.10) 0%, transparent 55%)," +
      "radial-gradient(ellipse at bottom left, rgba(6,182,212,0.08) 0%, transparent 55%)," +
      C.ink,
    color: C.cream,
    fontFamily: "Inter, system-ui, sans-serif",
    position: "relative",
    overflow: "hidden",
  },
  glowTop: {
    position: "absolute",
    top: -120,
    right: -80,
    width: 320,
    height: 320,
    background: "radial-gradient(circle, rgba(16,185,129,0.18), transparent 65%)",
    pointerEvents: "none",
    filter: "blur(8px)",
  },
  glowBottom: {
    position: "absolute",
    bottom: -120,
    left: -80,
    width: 300,
    height: 300,
    background: "radial-gradient(circle, rgba(139,92,246,0.14), transparent 65%)",
    pointerEvents: "none",
    filter: "blur(8px)",
  },
  container: {
    position: "relative",
    zIndex: 1,
    maxWidth: 520,
    margin: "0 auto",
    padding: "40px 22px 64px",
  },
  brandRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 28 },
  brandMark: {
    width: 22,
    height: 22,
    borderRadius: 7,
    background: `linear-gradient(135deg, ${C.emerald}, ${C.cyan} 55%, ${C.violet})`,
    boxShadow: "0 0 16px rgba(16,185,129,0.4)",
  },
  brandText: { fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: 16, letterSpacing: "-0.02em", color: C.cream },
  brand360: {
    fontStyle: "italic",
    fontWeight: 400,
    background: `linear-gradient(135deg, ${C.emerald}, ${C.cyan} 55%, ${C.violet})`,
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
  },
  brandSub: { fontSize: 13, color: C.creamHint, fontWeight: 500 },
  eyebrow: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: 11,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: C.emerald,
    fontWeight: 700,
    padding: "6px 12px",
    borderRadius: 999,
    background: "color-mix(in srgb, #10B981 12%, transparent)",
    border: "0.5px solid color-mix(in srgb, #10B981 24%, transparent)",
    marginBottom: 16,
  },
  eyebrowDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: C.emerald,
    boxShadow: "0 0 0 4px color-mix(in srgb, #10B981 22%, transparent)",
  },
  h1: {
    fontFamily: "Sora, sans-serif",
    fontSize: "clamp(30px, 7vw, 42px)",
    fontWeight: 800,
    lineHeight: 1.12,
    letterSpacing: "-0.025em",
    margin: "0 0 14px",
    color: C.cream,
  },
  grad: {
    fontStyle: "italic",
    fontWeight: 400,
    background: `linear-gradient(120deg, ${C.emerald}, ${C.cyan} 55%, ${C.violet})`,
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
    // Fix clip italique : sans inline-block + padding, le jambage de
    // l'italique dépasse la boîte du dégradé et se fait rogner (le "u" de
    // "revenu" coupé). Même correctif que l'accent gradient du Co-pilote.
    display: "inline-block",
    paddingRight: "0.12em",
  },
  lead: { fontSize: 15.5, color: C.creamMuted, lineHeight: 1.6, margin: "0 0 24px", maxWidth: 420 },
  coachPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 18px 10px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.05)",
    border: `1px solid ${C.hair}`,
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    marginBottom: 28,
  },
  coachAvatar: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    background: `linear-gradient(135deg, ${C.emerald}, ${C.cyan})`,
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "Sora, sans-serif",
    fontWeight: 800,
    fontSize: 18,
  },
  coachMeta: { display: "flex", flexDirection: "column", textAlign: "left" },
  coachLabel: { fontSize: 10, color: C.creamHint, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600 },
  coachName: { fontFamily: "Sora, sans-serif", fontSize: 15, fontWeight: 700, color: C.cream },
  teaserWrap: { position: "relative", borderRadius: 20, overflow: "hidden", marginBottom: 28, border: `1px solid ${C.hair}` },
  teaserBlur: {
    filter: "blur(7px)",
    opacity: 0.55,
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    pointerEvents: "none",
    userSelect: "none",
  },
  teaserCard: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 14,
    background: "rgba(255,255,255,0.05)",
    border: `1px solid ${C.hair}`,
  },
  teaserEmoji: { fontSize: 26 },
  teaserTitle: { fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 16, color: C.cream },
  teaserDesc: { fontSize: 13, color: C.creamMuted, marginTop: 2 },
  lockOverlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "24px 22px",
    background:
      "linear-gradient(180deg, rgba(11,13,17,0.55) 0%, rgba(11,13,17,0.82) 60%, rgba(11,13,17,0.92) 100%)",
  },
  lockBadge: {
    width: 52,
    height: 52,
    borderRadius: "50%",
    background: `linear-gradient(135deg, ${C.emerald}, ${C.violet})`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 24,
    marginBottom: 12,
    boxShadow: "0 8px 24px rgba(16,185,129,0.3)",
  },
  lockTitle: { fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: 18, color: C.cream, marginBottom: 6 },
  lockText: { fontSize: 13.5, color: C.creamMuted, lineHeight: 1.55, maxWidth: 340 },
  cta: {
    width: "100%",
    padding: "16px 20px",
    borderRadius: 14,
    border: "none",
    background: `linear-gradient(135deg, ${C.emerald} 0%, ${C.cyan} 50%, ${C.violet} 100%)`,
    color: "white",
    fontFamily: "Sora, sans-serif",
    fontWeight: 700,
    fontSize: 16,
    cursor: "pointer",
    boxShadow: "0 10px 28px rgba(16,185,129,0.32)",
    animation: "rj-cta-pulse 2.6s ease-in-out infinite",
  },
  trust: { marginTop: 16, fontSize: 12.5, color: C.creamHint, textAlign: "center", letterSpacing: "0.01em" },
  legal: { marginTop: 22, fontSize: 11, color: C.creamHint, lineHeight: 1.5, textAlign: "center", maxWidth: 380, marginLeft: "auto", marginRight: "auto" },
};

const KEYFRAMES = `
@keyframes rj-cta-pulse {
  0%, 100% { box-shadow: 0 10px 28px rgba(16,185,129,0.32); }
  50% { box-shadow: 0 12px 34px rgba(16,185,129,0.5); }
}
@media (prefers-reduced-motion: reduce) {
  [style*="rj-cta-pulse"] { animation: none !important; }
}
`;

export default RejoindreOpportunitePage;
