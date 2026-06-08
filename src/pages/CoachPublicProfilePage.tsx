// =============================================================================
// CoachPublicProfilePage — Fiche distri PUBLIQUE (#13-B, 2026-06-08).
// Route : /coach/:slug  (publique, hors AppLayout authentifié).
// Vitrine partageable en prospection : avatar + prénom + rang Herbalife +
// crédibilité (ancienneté/ville) + témoignages + DOUBLE CTA (bilan gratuit
// pour clients, rejoindre l'équipe pour recrues).
//
// Données : RPC publique get_coach_credibility_by_slug (via CoachCredibilityBadges,
// SECURITY DEFINER, champs public-safe uniquement — pas d'email/téléphone).
// Avatar réel + bio = étape B.2 (migration RPC). Ici : placeholder initiale.
//
// Briques réutilisées : PublicShell (dark), RankPinBadge, CoachCredibilityBadges,
// TestimonialsCarousel. Aucun mockup validé → direction à valider avec Thomas.
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  PublicShell,
  PublicCtaPrimary,
  PublicBrand,
  PUBLIC_TOKENS,
  PUBLIC_FONTS,
  publicGradText,
} from "../components/public/PublicShell";
import {
  CoachCredibilityBadges,
  type CoachCredibility,
} from "../components/bilan-online/CoachCredibilityBadges";
import { TestimonialsCarousel } from "../components/testimonials/TestimonialsCarousel";
import { RankPinBadge } from "../components/rank/RankPinBadge";
import type { HerbalifeRank } from "../types/domain";

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

export function CoachPublicProfilePage() {
  const navigate = useNavigate();
  const { slug: rawSlug } = useParams<{ slug?: string }>();
  const slug = useMemo(() => normalizeSlug(rawSlug ?? ""), [rawSlug]);
  const fallbackCoachName = slug ? capitalize(slug) : "";

  const [coachData, setCoachData] = useState<CoachCredibility | null>(null);
  const [resolved, setResolved] = useState(false);

  const coachDisplayName = useMemo(() => {
    if (coachData?.first_name) {
      const lastInit = coachData.name?.[0] ? ` ${coachData.name[0]}.` : "";
      return `${coachData.first_name}${lastInit}`;
    }
    return fallbackCoachName;
  }, [coachData, fallbackCoachName]);

  const coachRank = (coachData?.rank ?? null) as HerbalifeRank | null;
  const initial = (coachData?.first_name ?? fallbackCoachName ?? "?")
    .charAt(0)
    .toUpperCase();

  // SEO de base (les balises og: viendront en B.2)
  useEffect(() => {
    if (coachDisplayName) {
      document.title = `${coachDisplayName} · Coach La Base 360`;
    }
  }, [coachDisplayName]);

  function goBilan() {
    navigate(slug ? `/bilan-online/${slug}` : "/bilan-online");
  }
  function goRejoindre() {
    navigate(slug ? `/rejoindre/${slug}` : "/rejoindre");
  }

  return (
    <PublicShell defaultTheme="dark">
      <div style={{ padding: "48px 22px 80px", textAlign: "center", maxWidth: 560, margin: "0 auto" }}>
        <PublicBrand label="Coach" />

        {/* ── Hero : avatar initiale + nom + pin rang ─────────────────── */}
        <div
          style={{
            marginTop: 28,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}
        >
          {/* Avatar placeholder (initiale dans cercle gradient) — avatar réel en B.2 */}
          <div
            className="ps-bounce"
            style={{
              width: 112,
              height: 112,
              borderRadius: "50%",
              background: PUBLIC_TOKENS.gradCta,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: PUBLIC_FONTS.display,
              fontSize: 44,
              fontWeight: 700,
              color: "#fff",
              boxShadow: "0 8px 32px rgba(45,212,191,0.35)",
              border: "3px solid var(--hair)",
            }}
            aria-hidden="true"
          >
            {initial}
          </div>

          <div>
            <h1
              style={{
                fontFamily: PUBLIC_FONTS.display,
                fontSize: "clamp(28px, 6vw, 38px)",
                fontWeight: 600,
                color: "var(--cream)",
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              <span>{coachDisplayName || "—"}</span>
              {coachRank && <RankPinBadge rank={coachRank} size="sm" />}
            </h1>
            <p
              style={{
                fontFamily: PUBLIC_FONTS.body,
                fontSize: 14,
                color: "var(--cream-hint)",
                marginTop: 6,
              }}
            >
              Coach bien-être <span style={publicGradText}>La Base 360</span>
            </p>
          </div>

          {/* Badges crédibilité (rang · ville · ancienneté) — résout aussi coachData */}
          {slug && (
            <CoachCredibilityBadges
              coachSlug={slug}
              variant="business"
              onResolved={(d) => {
                setCoachData(d);
                setResolved(true);
              }}
            />
          )}
        </div>

        {/* ── Tagline ──────────────────────────────────────────────────── */}
        <p
          style={{
            fontSize: 16,
            color: "var(--cream-muted)",
            maxWidth: 420,
            margin: "28px auto 32px",
            lineHeight: 1.55,
          }}
        >
          Reprends ta forme avec un accompagnement humain et personnalisé — ou
          découvre comment en faire ton activité.
        </p>

        {/* ── Double CTA ───────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 360, margin: "0 auto" }}>
          <PublicCtaPrimary onClick={goBilan}>
            🥗 Faire mon bilan gratuit
          </PublicCtaPrimary>
          <button
            type="button"
            onClick={goRejoindre}
            style={{
              width: "100%",
              padding: "15px 24px",
              borderRadius: 14,
              background: "transparent",
              border: "1px solid var(--hair)",
              color: "var(--cream)",
              fontFamily: PUBLIC_FONTS.display,
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              transition: "border-color 0.2s, background 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = PUBLIC_TOKENS.violet;
              e.currentTarget.style.background = "var(--glass)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--hair)";
              e.currentTarget.style.background = "transparent";
            }}
          >
            🚀 Rejoindre mon équipe
          </button>
        </div>

        {/* ── Témoignages du coach ─────────────────────────────────────── */}
        {coachData?.user_id && (
          <div style={{ marginTop: 48 }}>
            <h2
              style={{
                fontFamily: PUBLIC_FONTS.display,
                fontSize: 20,
                fontWeight: 600,
                color: "var(--cream)",
                marginBottom: 18,
              }}
            >
              Ils ont fait <span style={publicGradText}>confiance</span>
            </h2>
            <TestimonialsCarousel variant="business" coachId={coachData.user_id} limit={6} />
          </div>
        )}

        {/* ── État coach introuvable ───────────────────────────────────── */}
        {resolved && !coachData && (
          <p
            style={{
              marginTop: 40,
              fontSize: 13,
              color: "var(--cream-hint)",
              fontStyle: "italic",
            }}
          >
            Profil coach non reconnu — mais tu peux quand même{" "}
            <button
              type="button"
              onClick={goBilan}
              style={{
                background: "none",
                border: "none",
                color: PUBLIC_TOKENS.teal,
                cursor: "pointer",
                textDecoration: "underline",
                font: "inherit",
                padding: 0,
              }}
            >
              faire ton bilan gratuit
            </button>
            .
          </p>
        )}
      </div>
    </PublicShell>
  );
}
