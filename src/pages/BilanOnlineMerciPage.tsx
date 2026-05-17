// =============================================================================
// BilanOnlineMerciPage — Page remerciement, mockup Égypte validé.
// docs/mockups/bilan-online.html (commit 25c0165), view "thank".
// Route : /bilan-online/:coachSlug?/merci?firstName=...
// =============================================================================

import { useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { BO, BilanOnlineShell } from "../components/bilan-online/BilanOnlineShell";

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export function BilanOnlineMerciPage() {
  const { coachSlug } = useParams<{ coachSlug?: string }>();
  const [params] = useSearchParams();
  const firstName = (params.get("firstName") ?? "").trim();
  const coachName = useMemo(() => (coachSlug ? capitalize(coachSlug) : ""), [coachSlug]);
  const hasCoach = !!coachSlug;

  return (
    <BilanOnlineShell bgAccent>
      <div style={{
        padding: "48px 24px 40px", textAlign: "center",
        minHeight: "calc(100dvh - 80px)",
      }}>
        <div
          className="bo-pop"
          style={{
            width: 80, height: 80,
            margin: "0 auto 24px",
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${BO.gold}, ${BO.teal})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", fontSize: 40, fontWeight: 700,
            animation: "bo-popIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
            boxShadow: "0 12px 32px rgba(201, 168, 76, 0.3)",
          }}
        >
          ✓
        </div>

        <h1 style={{
          fontFamily: BO.fontDisplay, fontSize: 30, fontWeight: 700,
          color: BO.text, marginBottom: 14, lineHeight: 1.25,
          margin: "0 auto 14px",
        }}>
          Merci{firstName ? ` ${firstName}` : ""} ! 🙏
        </h1>

        <p style={{
          fontSize: 15, color: BO.textMuted, marginBottom: 6,
          margin: "0 0 6px",
        }}>
          {hasCoach ? (
            <>
              Ton bilan est arrivé chez{" "}
              <strong style={{ color: BO.gold, fontWeight: 700 }}>{coachName}</strong>.
            </>
          ) : (
            <>
              Ton bilan est arrivé chez l'équipe{" "}
              <strong style={{ color: BO.gold, fontWeight: 700 }}>La Base 360</strong>.
            </>
          )}
        </p>

        <p style={{
          fontSize: 13, color: BO.textMuted, marginBottom: 32,
          margin: "0 0 32px",
        }}>
          {hasCoach
            ? "Il va l'analyser et te recontacter sous 48h max."
            : "Un coach adapté à ton profil va te répondre rapidement."}
        </p>

        <div style={{
          margin: "28px auto", width: 60, height: 1, background: BO.border,
        }} />

        <h3 style={{
          fontFamily: BO.fontDisplay, fontSize: 16, fontWeight: 700,
          color: BO.text, marginBottom: 14, margin: "0 0 14px",
        }}>
          En attendant, retrouve-nous :
        </h3>

        <div style={{
          display: "flex", flexDirection: "column", gap: 10,
          maxWidth: 320, margin: "0 auto 24px",
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

        <div style={{
          marginTop: 32, fontSize: 11, color: BO.textHint, lineHeight: 1.5,
        }}>
          Tu peux fermer cette page ou la garder ouverte.<br />
          <strong style={{ color: BO.gold }}>La Base 360</strong> · 2026
        </div>
      </div>
    </BilanOnlineShell>
  );
}

function SocialBtn({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 18px",
        background: "white",
        border: `1px solid ${BO.border}`, borderRadius: 12,
        color: BO.text, textDecoration: "none",
        fontSize: 14, fontWeight: 600,
        transition: "all 0.18s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <span style={{ fontSize: 22, width: 28, textAlign: "center" }}>{icon}</span>
      <span>{label}</span>
    </a>
  );
}
