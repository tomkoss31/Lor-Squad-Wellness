// =============================================================================
// BilanOnlineMerciPage V2 dark (chantier A, 2026-05-18) — page remerciement.
// Source de verite : docs/mockups/bilan-online-v2.html view-thank.
// Route : /bilan-online/:coachSlug?/merci?firstName=...
// =============================================================================

import { useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  PublicShell,
  PublicBrand,
  PUBLIC_TOKENS,
  PUBLIC_FONTS,
  publicGradText,
} from "../components/public/PublicShell";

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

// Normalise un prenom potentiellement tape en MAJUSCULES (THOMAS -> Thomas)
// ou tout-minuscules (thomas -> Thomas). Gere les prenoms composes : "jean-claude"
// devient "Jean-Claude", "marie anne" devient "Marie Anne".
function prettifyFirstName(raw: string): string {
  if (!raw) return "";
  return raw
    .trim()
    .toLowerCase()
    .split(/(\s|-)/) // garde les separateurs (espace / tiret)
    .map((part) => (part.length > 1 ? capitalize(part) : part))
    .join("");
}

export function BilanOnlineMerciPage() {
  const { coachSlug } = useParams<{ coachSlug?: string }>();
  const [params] = useSearchParams();
  const firstName = prettifyFirstName(params.get("firstName") ?? "");
  const coachName = useMemo(() => (coachSlug ? capitalize(coachSlug) : ""), [coachSlug]);
  const hasCoach = !!coachSlug;

  return (
    <PublicShell defaultTheme="dark">
      <div style={{
        padding: "48px 24px 60px", textAlign: "center",
        minHeight: "calc(100dvh - 80px)",
      }}>
        <PublicBrand label="Merci" />

        {/* Check circle 96px gradient teal -> violet popIn animé */}
        <div
          className="ps-pop-in"
          style={{
            width: 96, height: 96,
            margin: "12px auto 32px",
            borderRadius: "50%",
            background: PUBLIC_TOKENS.gradCta,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", fontSize: 48, fontWeight: 700,
            boxShadow: "0 16px 48px -8px rgba(45,212,191,0.55), 0 0 0 8px rgba(45,212,191,0.10)",
          }}
        >
          ✓
        </div>

        {/* h1 "Merci {firstName} 🙏" avec firstName en gradient */}
        <h1 style={{
          fontFamily: PUBLIC_FONTS.display,
          fontSize: "clamp(30px, 6vw, 40px)",
          fontWeight: 600,
          color: "var(--cream)",
          lineHeight: 1.18,
          letterSpacing: "-0.02em",
          margin: "0 auto 18px",
        }}>
          Merci{firstName && (
            <> <strong style={publicGradText}>{firstName}</strong></>
          )} 🙏
        </h1>

        <p style={{
          fontSize: 16,
          color: "var(--cream-soft)",
          marginBottom: 10,
          maxWidth: 420,
          marginLeft: "auto",
          marginRight: "auto",
          lineHeight: 1.55,
        }}>
          {hasCoach ? (
            <>
              Ton bilan est arrivé chez{" "}
              <strong style={{ color: PUBLIC_TOKENS.teal, fontWeight: 600 }}>{coachName}</strong>.
            </>
          ) : (
            <>
              Ton bilan est arrivé chez l'équipe{" "}
              <strong style={{ color: PUBLIC_TOKENS.teal, fontWeight: 600 }}>La Base 360</strong>.
            </>
          )}
        </p>

        <p style={{
          fontSize: 14,
          color: "var(--cream-muted)",
          marginBottom: 40,
          maxWidth: 380,
          marginLeft: "auto",
          marginRight: "auto",
        }}>
          {hasCoach
            ? "Il va l'analyser et te recontacter sous 48 h max."
            : "Un coach adapté à ton profil va te répondre rapidement."}
        </p>

        {/* Separator */}
        <div style={{
          margin: "8px auto 28px",
          width: 60,
          height: 1,
          background: "var(--hair-strong)",
        }} />

        <h3 style={{
          fontFamily: PUBLIC_FONTS.display,
          fontSize: 13, fontWeight: 600,
          color: "var(--cream-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          marginBottom: 18,
        }}>
          En attendant, retrouve-nous
        </h3>

        <div style={{
          display: "flex", flexDirection: "column", gap: 10,
          maxWidth: 360, margin: "0 auto 32px",
        }}>
          <SocialBtn
            href="https://instagram.com/labase360"
            icon="📷" label="Suis-nous sur Instagram"
          />
          <SocialBtn
            href="https://wa.me/33000000000"
            icon="💬" label="Rejoins notre WhatsApp"
          />
        </div>

        {/* Microfooter Sora mono */}
        <div style={{
          marginTop: 40,
          fontFamily: PUBLIC_FONTS.mono,
          fontSize: 11,
          color: "var(--cream-hint)",
          letterSpacing: "0.08em",
        }}>
          La Base 360 · Since 2022
        </div>
      </div>
    </PublicShell>
  );
}

function SocialBtn({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "14px 20px",
        background: "var(--glass)",
        border: "1px solid var(--hair)",
        borderRadius: 14,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        color: "var(--cream)", textDecoration: "none",
        fontFamily: PUBLIC_FONTS.body,
        fontSize: 14, fontWeight: 500,
        transition: "all 0.22s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.borderColor = PUBLIC_TOKENS.teal;
        e.currentTarget.style.boxShadow = "0 8px 22px rgba(45,212,191,0.18)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.borderColor = "var(--hair)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <span style={{ fontSize: 22, width: 28, textAlign: "center" }}>{icon}</span>
      <span>{label}</span>
    </a>
  );
}
