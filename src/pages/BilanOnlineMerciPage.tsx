// =============================================================================
// BilanOnlineMerciPage V2 — page remerciement avec CTAs adaptatifs
// (chantier C, 2026-05-27).
//
// Lit en sessionStorage :
//  - ls-bilan-meta-${slug}    : first_name, contact_pref, email, phone,
//                                objectives, motivation_score, coach_slug
//  - ls-bilan-results-${slug} : scoring inputs (pour recalculer le verdict
//                                + top 3 priorités dans le mailto pré-rempli)
//
// Selon contact_pref choisi à l'étape 7, affiche un message + CTAs adaptés :
//  - phone    : "Ton coach va t'appeler au [phone] dans les 48h"
//  - email    : "Ton coach va t'écrire à [email] dans les 48h"
//  - whatsapp : "Ton coach va te whatsapper dans les 48h"
//
// CTA primary : "Préparer un message pour mon coach" → mailto: pré-rempli
// avec récap (objectifs + score global + top 3 priorités).
// Destinataire vide pour l'instant (privacy : pas d'exposition d'email coach
// dans une RPC publique tant que pas d'opt-in côté coach).
//
// CTA secondary : "Revoir mon bilan" → /resultats (back history)
// CTA tertiaire : "Prendre RDV" en placeholder (chantier D non livré).
//
// Cleanup sessionStorage au démontage pour ne pas garder les PII.
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  PublicShell,
  PublicBrand,
  PublicCtaPrimary,
  PUBLIC_TOKENS,
  PUBLIC_FONTS,
  publicGradText,
} from "../components/public/PublicShell";
import {
  computeBilanResults,
  type BilanResults,
  type ScoringInput,
} from "../lib/bilanOnlineScoring";

type ContactPref = "phone" | "email" | "whatsapp" | "";

interface BilanMeta {
  first_name: string;
  contact_pref: ContactPref;
  email: string | null;
  phone: string | null;
  objectives: string[];
  motivation_score: number;
  coach_slug: string | null;
}

const OBJECTIVE_LABELS: Record<string, string> = {
  weight_loss: "Perte de poids",
  mass_gain: "Prise de masse",
  energy: "Plus d'énergie",
  sleep: "Mieux dormir",
  wellbeing: "Bien-être",
  perf_pro: "Performance au travail",
};

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
function prettifyFirstName(raw: string): string {
  if (!raw) return "";
  return raw.trim().toLowerCase()
    .split(/(\s|-)/)
    .map((p) => (p.length > 1 ? capitalize(p) : p))
    .join("");
}

export function BilanOnlineMerciPage() {
  const navigate = useNavigate();
  const { coachSlug } = useParams<{ coachSlug?: string }>();
  const slug = coachSlug?.trim() || "";
  const [params] = useSearchParams();
  const firstNameQp = prettifyFirstName(params.get("firstName") ?? "");

  const [meta, setMeta] = useState<BilanMeta | null>(null);
  const [scoringInput, setScoringInput] = useState<ScoringInput | null>(null);

  const coachName = useMemo(() => (slug ? capitalize(slug) : ""), [slug]);
  const hasCoach = !!slug;
  const firstName = meta?.first_name || firstNameQp;

  // Lecture sessionStorage au mount + cleanup au démontage.
  useEffect(() => {
    try {
      const metaRaw = sessionStorage.getItem(`ls-bilan-meta-${slug || "none"}`);
      if (metaRaw) setMeta(JSON.parse(metaRaw) as BilanMeta);
      const inputRaw = sessionStorage.getItem(`ls-bilan-results-${slug || "none"}`);
      if (inputRaw) setScoringInput(JSON.parse(inputRaw) as ScoringInput);
    } catch { /* */ }

    return () => {
      // PII out : on nettoie sessionStorage quand la merci page disparaît.
      try {
        sessionStorage.removeItem(`ls-bilan-meta-${slug || "none"}`);
        sessionStorage.removeItem(`ls-bilan-results-${slug || "none"}`);
      } catch { /* */ }
    };
  }, [slug]);

  const results: BilanResults | null = useMemo(
    () => (scoringInput ? computeBilanResults(scoringInput) : null),
    [scoringInput],
  );

  // Construit le mailto: pré-rempli avec récap (subject + body).
  const mailtoHref = useMemo(() => buildMailto({
    firstName, meta, results, coachName,
  }), [firstName, meta, results, coachName]);

  function onSeeResults() {
    // Restaure les inputs dans sessionStorage (qu'on a stockés au mount).
    // Si l'user click "Revoir mon bilan" après nettoyage, on re-set.
    try {
      if (scoringInput) {
        sessionStorage.setItem(
          `ls-bilan-results-${slug || "none"}`,
          JSON.stringify(scoringInput),
        );
      }
      if (meta) {
        sessionStorage.setItem(
          `ls-bilan-meta-${slug || "none"}`,
          JSON.stringify(meta),
        );
      }
    } catch { /* */ }
    const q = firstName ? `?firstName=${encodeURIComponent(firstName)}` : "";
    navigate(`/bilan-online${slug ? `/${slug}` : ""}/resultats${q}`);
  }

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
          fontSize: 16, color: "var(--cream-soft)",
          marginBottom: 10, maxWidth: 420, margin: "0 auto",
          lineHeight: 1.55,
        }}>
          {hasCoach ? (
            <>Ton bilan est arrivé chez{" "}
              <strong style={{ color: PUBLIC_TOKENS.teal, fontWeight: 600 }}>{coachName}</strong>.
            </>
          ) : (
            <>Ton bilan est arrivé chez l'équipe{" "}
              <strong style={{ color: PUBLIC_TOKENS.teal, fontWeight: 600 }}>La Base 360</strong>.
            </>
          )}
        </p>

        {/* Promesse de rappel adaptée à contact_pref */}
        <ContactPromise meta={meta} hasCoach={hasCoach} />

        {/* === Bloc "Et maintenant ?" — CTAs === */}
        <div style={{
          margin: "32px auto 0",
          maxWidth: 460,
          textAlign: "left",
        }}>
          <h3 style={{
            fontFamily: PUBLIC_FONTS.display,
            fontSize: 13, fontWeight: 600,
            color: "var(--cream-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            marginBottom: 14,
            textAlign: "center",
          }}>
            Et maintenant ?
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {/* CTA primary : revoir son bilan + analyse Noaly — action utile qui
                MARCHE (remplace l'ancien mailto sans destinataire en hero). */}
            {results && (
              <button
                type="button"
                onClick={onSeeResults}
                style={{
                  display: "block",
                  padding: "14px 20px",
                  background: PUBLIC_TOKENS.gradCta,
                  color: PUBLIC_TOKENS.cream,
                  border: "none",
                  borderRadius: 14,
                  fontFamily: PUBLIC_FONTS.display,
                  fontSize: 15, fontWeight: 600,
                  textAlign: "center",
                  cursor: "pointer",
                  boxShadow: "0 12px 32px -8px rgba(45,212,191,0.55)",
                  transition: "transform 0.18s, box-shadow 0.18s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 16px 36px -6px rgba(45,212,191,0.65)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 12px 32px -8px rgba(45,212,191,0.55)";
                }}
              >
                🔍 Revoir mon bilan &amp; mon analyse ({results.globalScore}/100)
              </button>
            )}

            {/* CTA secondary : brouillon mailto (optionnel, sans destinataire :
                le coach reste à l'initiative du contact — privacy). */}
            <a
              href={mailtoHref}
              style={{
                display: "block",
                padding: "12px 20px",
                background: "var(--glass)",
                border: "1px solid var(--hair-strong)",
                color: "var(--cream)",
                borderRadius: 14,
                textDecoration: "none",
                fontFamily: PUBLIC_FONTS.body,
                fontSize: 14, fontWeight: 500,
                textAlign: "center",
                transition: "background 0.18s, border-color 0.18s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--glass-strong)";
                e.currentTarget.style.borderColor = PUBLIC_TOKENS.teal;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--glass)";
                e.currentTarget.style.borderColor = "var(--hair-strong)";
              }}
            >
              ✍️ Préparer un message pour mon coach
            </a>
            <p style={{
              margin: "-4px 4px 8px",
              fontSize: 11.5, lineHeight: 1.45,
              color: "var(--cream-hint)",
              fontStyle: "italic",
            }}>
              Ouvre un brouillon pré-rempli (récap de tes objectifs et de ton bilan) — tu pourras l'envoyer à ton coach dès qu'il te recontactera.
            </p>

            {/* CTA RDV : sera activé au chantier « prise de RDV » (présentiel/visio
                + agenda anti-doublon). Honnête (disabled) tant que non livré. */}
            <button
              type="button"
              disabled
              style={{
                display: "block",
                padding: "12px 20px",
                background: "var(--glass-input)",
                border: "1px dashed var(--hair-strong)",
                color: "var(--cream-hint)",
                borderRadius: 14,
                fontFamily: PUBLIC_FONTS.body,
                fontSize: 13.5, fontWeight: 500,
                textAlign: "center",
                cursor: "not-allowed",
              }}
              title="Bientôt : choisis un créneau (présentiel ou visio) dans l'agenda du coach"
            >
              📅 Prendre RDV (présentiel ou visio) <span style={{ opacity: 0.7, fontSize: 11 }}>(bientôt)</span>
            </button>
          </div>
        </div>

        {/* Separator */}
        <div style={{
          margin: "32px auto 22px",
          width: 60, height: 1,
          background: "var(--hair-strong)",
        }} />

        <h3 style={{
          fontFamily: PUBLIC_FONTS.display,
          fontSize: 12, fontWeight: 600,
          color: "var(--cream-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          marginBottom: 14,
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
          {/* Bouton WhatsApp retiré 2026-06-14 : le numéro était un placeholder
              (wa.me/33000000000 = lien mort). À ré-ajouter avec le vrai lien
              communauté quand Thomas le fournit. */}
        </div>

        {/* Microfooter Sora mono */}
        <div style={{
          marginTop: 24,
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

// ── Sous-composants ─────────────────────────────────────────────────────────

function ContactPromise({ meta, hasCoach }: { meta: BilanMeta | null; hasCoach: boolean }) {
  // Promesse de rappel adaptée à la préférence contact si dispo.
  let detail: string;
  let emoji: string;
  if (meta?.contact_pref === "phone" && meta.phone) {
    detail = `Tu seras contacté(e) par téléphone au ${meta.phone} sous 48 h max.`;
    emoji = "📞";
  } else if (meta?.contact_pref === "email" && meta.email) {
    detail = `Tu recevras un mail à ${meta.email} sous 48 h max.`;
    emoji = "📧";
  } else if (meta?.contact_pref === "whatsapp" && meta.phone) {
    detail = `Tu seras contacté(e) par WhatsApp au ${meta.phone} sous 48 h max.`;
    emoji = "💬";
  } else if (meta?.contact_pref === "whatsapp") {
    detail = "Tu seras contacté(e) par WhatsApp sous 48 h max.";
    emoji = "💬";
  } else {
    detail = hasCoach
      ? "Il va l'analyser et te recontacter sous 48 h max."
      : "Un coach adapté à ton profil va te répondre rapidement.";
    emoji = "✨";
  }
  return (
    <p style={{
      fontSize: 14,
      color: "var(--cream-muted)",
      marginTop: 14,
      maxWidth: 460,
      marginLeft: "auto",
      marginRight: "auto",
      lineHeight: 1.55,
    }}>
      <span style={{ marginRight: 6 }}>{emoji}</span>{detail}
    </p>
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

// Le PublicCtaPrimary importe statiquement pour éviter un re-render du bouton
// si on l'utilisait. Volontairement non utilisé ici car on a 3 boutons custom.
// (Garde-fou : si jamais Vite tree-shake mal et que l'import s'en va.)
void PublicCtaPrimary;

// ── Helpers mailto ──────────────────────────────────────────────────────────

function buildMailto({
  firstName, meta, results, coachName,
}: {
  firstName: string;
  meta: BilanMeta | null;
  results: BilanResults | null;
  coachName: string;
}): string {
  const safeFirstName = firstName || "—";
  const coachLabel = coachName || "mon coach La Base 360";
  const subject = `Mes résultats du bilan en ligne — ${safeFirstName}`;

  const lines: string[] = [];
  lines.push(`Bonjour ${coachLabel},`);
  lines.push("");
  lines.push("Je viens de finaliser le bilan en ligne. Voici un récap rapide :");
  lines.push("");

  if (meta?.objectives && meta.objectives.length > 0) {
    const objs = meta.objectives
      .map((o) => `• ${OBJECTIVE_LABELS[o] ?? o}`)
      .join("\n");
    lines.push("MES OBJECTIFS");
    lines.push(objs);
    lines.push("");
  }

  if (typeof meta?.motivation_score === "number") {
    lines.push(`MA MOTIVATION : ${meta.motivation_score}/10`);
    lines.push("");
  }

  if (results) {
    lines.push(`SCORE GLOBAL : ${results.globalScore}/100`);
    lines.push(`VERDICT : ${results.verdict.headline}`);
    lines.push("");
    lines.push("MES 3 PRIORITÉS IDENTIFIÉES :");
    results.priorities.forEach((p, i) => {
      lines.push(`${i + 1}. ${p.title}`);
      lines.push(`   ${p.insight}`);
      lines.push(`   → ${p.advice}`);
    });
    lines.push("");
  }

  lines.push("J'aimerais échanger avec toi sur les prochaines étapes.");
  lines.push("");
  lines.push(`À très vite,`);
  lines.push(safeFirstName);

  const body = lines.join("\n");

  // mailto: sans destinataire — le prospect ajoutera l'email du coach
  // quand celui-ci aura répondu (privacy : on n'expose pas les contacts
  // coach dans une RPC publique tant que pas d'opt-in côté coach).
  const params = new URLSearchParams({ subject, body });
  return `mailto:?${params.toString()}`;
}
