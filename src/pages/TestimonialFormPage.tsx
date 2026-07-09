// =============================================================================
// TestimonialFormPage V2 dark — Chantier #11 V1.1 (2026-05-18)
// =============================================================================
// 2 modes :
// - Route /temoignage/:token       → mode "client" (V1 legacy, lookup client_app_accounts)
// - Route /temoignage/coach/:slug  → mode "coach" (V1.1 generique, le visiteur saisit prenom+ville)
//
// Source de verite visuelle : docs/mockups/temoignage-client-v2.html
// =============================================================================

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { getSupabaseClient } from "../services/supabaseClient";
import { extractFunctionError } from "../lib/utils/extractFunctionError";
import {
  PublicShell,
  PublicCtaPrimary,
  PublicBrand,
  PUBLIC_TOKENS,
  PUBLIC_FONTS,
  publicGradText,
} from "../components/public/PublicShell";

interface TestimonialContext {
  mode: "token" | "coach";
  firstName: string | null;
  city: string | null;
  coachFirstName: string | null;
  alreadySubmitted: boolean;
}

type LoadStatus = "loading" | "ready" | "already" | "invalid" | "error";

// PROMPTS retirés 2026-05-28 : Thomas trouvait que les gabarits
// "J'ai démarré il y a [X mois]..." bloquaient les gens / les forçaient
// dans une structure rigide. On laisse maintenant l'utilisateur écrire
// librement avec juste un placeholder doux.

export function TestimonialFormPage() {
  // 2 patterns d'URL :
  // - /temoignage/:token
  // - /temoignage/coach/:slug
  const params = useParams<{ token?: string; slug?: string }>();
  const isCoachMode = !!params.slug;
  const tokenSafe = (params.token ?? "").trim();
  const slugSafe = (params.slug ?? "").trim();

  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [ctx, setCtx] = useState<TestimonialContext | null>(null);

  // Form state — friendly 2026-07-09 : on ne capture QUE le prénom (ni nom, ni
  // ville — « ça fait amateur »). ctx.city reste toléré côté fetch mais inutilisé.
  const [firstName, setFirstName] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [content, setContent] = useState("");
  const [consentRgpd, setConsentRgpd] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // ─── Fetch context ────────────────────────────────────────────────────────
  useEffect(() => {
    if (isCoachMode) {
      if (!slugSafe) {
        setLoadStatus("invalid");
        return;
      }
    } else {
      if (!tokenSafe || !/^[0-9a-f-]{36}$/i.test(tokenSafe)) {
        setLoadStatus("invalid");
        return;
      }
    }
    let cancelled = false;
    (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) {
          if (!cancelled) setLoadStatus("error");
          return;
        }
        const qs = isCoachMode
          ? `coach_slug=${encodeURIComponent(slugSafe)}`
          : `token=${encodeURIComponent(tokenSafe)}`;
        const url = `${(sb as unknown as { supabaseUrl: string }).supabaseUrl}/functions/v1/get-testimonial-context?${qs}`;
        const apiKey = (sb as unknown as { supabaseKey: string }).supabaseKey;
        const resp = await fetch(url, {
          headers: {
            apikey: apiKey,
            Authorization: `Bearer ${apiKey}`,
          },
        });
        const payload = (await resp.json()) as {
          success: boolean;
          mode?: "token" | "coach";
          firstName?: string;
          city?: string;
          coachFirstName?: string;
          alreadySubmitted?: boolean;
          error?: string;
        };
        if (cancelled) return;
        if (!payload.success) {
          setLoadStatus("invalid");
          return;
        }
        const next: TestimonialContext = {
          mode: payload.mode ?? (isCoachMode ? "coach" : "token"),
          firstName: payload.firstName ?? null,
          city: payload.city ?? null,
          coachFirstName: payload.coachFirstName ?? null,
          alreadySubmitted: !!payload.alreadySubmitted,
        };
        setCtx(next);
        if (next.firstName) setFirstName(next.firstName);
        if (next.alreadySubmitted) {
          setLoadStatus("already");
        } else {
          setLoadStatus("ready");
        }
      } catch {
        if (!cancelled) setLoadStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isCoachMode, tokenSafe, slugSafe]);

  useEffect(() => {
    const prev = document.title;
    document.title = "Ton retour · La Base 360";
    return () => {
      document.title = prev;
    };
  }, []);

  // Minimum 50 mots (Thomas 2026-07-09) : garantit des témoignages étoffés.
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const canSubmit = useMemo(
    () =>
      !!firstName.trim() &&
      rating >= 1 &&
      wordCount >= 50 &&
      content.length <= 1000 &&
      consentRgpd,
    [firstName, rating, wordCount, content, consentRgpd],
  );

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setErrorMsg("");
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible.");
      const baseBody = {
        content: content.trim(),
        rating,
        // photo_consent figé à false depuis 2026-05-28 (case retirée du form
        // public à la demande de Thomas : "ça limite et bloque"). On garde
        // le champ dans le payload pour compat edge function existante.
        photo_consent: false,
        language: "fr",
        first_name: firstName.trim(),
      };
      const body = isCoachMode
        ? { ...baseBody, coach_slug: slugSafe }
        : { ...baseBody, client_token: tokenSafe };
      const { data, error } = await sb.functions.invoke("submit-testimonial", { body });
      if (error || !data?.success) {
        const raw = await extractFunctionError(data, error, "Erreur inconnue.");
        throw new Error(
          raw === "rate_limited"
            ? "Trop de tentatives — réessaie dans une heure."
            : raw,
        );
      }
      setSubmitted(true);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erreur inconnue.");
      setSubmitting(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  if (loadStatus === "loading") {
    return (
      <PublicShell defaultTheme="dark">
        <div style={{ padding: 64, textAlign: "center" }}>
          <div style={{ fontFamily: PUBLIC_FONTS.mono, fontSize: 13, color: "var(--cream-muted)", letterSpacing: "0.08em" }}>
            Chargement…
          </div>
        </div>
      </PublicShell>
    );
  }

  if (loadStatus === "invalid" || loadStatus === "error") {
    return (
      <PublicShell defaultTheme="dark">
        <ResultPanel
          emoji="⚠️"
          title="Lien introuvable"
          message="Ce lien de témoignage n'existe pas ou a expiré. Demande au coach de te renvoyer le lien correct."
        />
      </PublicShell>
    );
  }

  if (loadStatus === "already" || submitted) {
    return (
      <PublicShell defaultTheme="dark">
        <SuccessView firstName={firstName} coachFirstName={ctx?.coachFirstName ?? null} />
      </PublicShell>
    );
  }

  // ─── FORM VIEW ─────────────────────────────────────────────────────────────

  return (
    <PublicShell defaultTheme="dark">
      <form onSubmit={handleSubmit} style={{ padding: "48px 22px 64px", textAlign: "center" }}>
        <PublicBrand label="Témoignage" />

        {/* Hero — picto « bulle » teal→lime (identité v2 2026-07-09, remplace
            l'ancien emoji 🌱 : plus premium, garde la chaleur). */}
        <div
          className="ps-bounce"
          style={{
            width: 80,
            height: 80,
            margin: "24px auto 16px",
            borderRadius: 22,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, rgba(45,212,191,0.18), rgba(197,248,42,0.12))",
            border: "1px solid var(--hair)",
          }}
        >
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="url(#temoGrad)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <defs>
              <linearGradient id="temoGrad" x1="0" y1="0" x2="24" y2="24">
                <stop stopColor={PUBLIC_TOKENS.teal} />
                <stop offset="1" stopColor={PUBLIC_TOKENS.lime} />
              </linearGradient>
            </defs>
            <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7a8.5 8.5 0 0 1-.9-3.8A8.38 8.38 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z" />
          </svg>
        </div>
        <h1
          style={{
            fontFamily: PUBLIC_FONTS.display,
            fontSize: "clamp(28px, 6.5vw, 40px)",
            fontWeight: 600,
            color: "var(--cream)",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            margin: "0 auto 14px",
            maxWidth: 480,
          }}
        >
          {firstName ? `Bonjour ${firstName}, ` : ""}Ton retour compte.
          <br />
          <span style={publicGradText}>Vraiment.</span>
        </h1>
        <p
          style={{
            fontSize: 15,
            color: "var(--cream-muted)",
            maxWidth: 420,
            margin: "0 auto 24px",
            lineHeight: 1.55,
          }}
        >
          Partage ton vécu en 30 secondes — ça inspire celles et ceux qui hésitent à se lancer.
        </p>

        {/* Meta-strip */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: 16,
            marginBottom: 30,
            fontFamily: PUBLIC_FONTS.mono,
            fontSize: 11,
            color: "var(--cream-hint)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          <span>· 30 secondes</span>
          <span>· RGPD friendly</span>
          {ctx?.coachFirstName && <span>· pour {ctx.coachFirstName}</span>}
        </div>

        {/* Guide bienveillant retiré 2026-05-28 : Thomas trouvait que la
            card de prompts "J'ai démarré il y a [X mois]…" bloquait les gens
            en imposant un gabarit. Maintenant : juste un placeholder doux
            sur la textarea ci-dessous, et l'utilisateur écrit librement. */}

        {/* Form card */}
        <div
          style={{
            background: "var(--glass)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid var(--hair)",
            borderRadius: 18,
            padding: "22px 18px",
            textAlign: "left",
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          {/* Identité */}
          <div>
            <div style={fieldLabelStyle}>
              Tu es ?<span style={{ color: PUBLIC_TOKENS.coral }}> *</span>
            </div>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Ton prénom"
              style={inputStyle}
              maxLength={40}
              required
            />
          </div>

          {/* Rating étoiles */}
          <div>
            <div style={fieldLabelStyle}>
              Comment notes-tu ton expérience ?<span style={{ color: PUBLIC_TOKENS.coral }}> *</span>
            </div>
            <div
              style={{ display: "flex", gap: 8, justifyContent: "center" }}
              role="radiogroup"
              aria-label="Note de 1 à 5 étoiles"
            >
              {[1, 2, 3, 4, 5].map((v) => {
                const filled = v <= (hoverRating || rating);
                return (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={rating === v}
                    aria-label={`${v} étoile${v > 1 ? "s" : ""}`}
                    onClick={() => setRating(v)}
                    onMouseEnter={() => setHoverRating(v)}
                    onMouseLeave={() => setHoverRating(0)}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 36,
                      lineHeight: 1,
                      color: filled ? PUBLIC_TOKENS.gold : "var(--cream-hint)",
                      transition: "all 0.18s",
                      textShadow: filled ? "0 0 14px rgba(201,168,76,0.45)" : "none",
                      padding: 4,
                    }}
                  >
                    ★
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content textarea */}
          <div>
            <div style={fieldLabelStyle}>
              Ton ressenti, ton vécu, tes résultats<span style={{ color: PUBLIC_TOKENS.coral }}> *</span>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 1000))}
              placeholder="Raconte ton vécu, tes résultats, ce qui a changé pour toi… (50 mots minimum)"
              rows={6}
              maxLength={1000}
              style={{ ...inputStyle, minHeight: 140, resize: "vertical" }}
              required
            />
            <div
              style={{
                marginTop: 6,
                fontFamily: PUBLIC_FONTS.mono,
                fontSize: 11,
                color: wordCount < 50 ? PUBLIC_TOKENS.coral : "var(--cream-hint)",
                letterSpacing: "0.06em",
                textAlign: "right",
              }}
            >
              {wordCount} mot{wordCount > 1 ? "s" : ""} · min 50
            </div>
          </div>

          {/* Consent RGPD */}
          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              padding: 14,
              background: consentRgpd ? "var(--glass-input-focus)" : "var(--glass)",
              border: `1px solid ${consentRgpd ? PUBLIC_TOKENS.teal : "var(--hair)"}`,
              borderRadius: 12,
              cursor: "pointer",
              fontSize: 13,
              color: "var(--cream-soft)",
              lineHeight: 1.5,
              transition: "all 0.22s",
            }}
          >
            <input
              type="checkbox"
              checked={consentRgpd}
              onChange={(e) => setConsentRgpd(e.target.checked)}
              style={{ marginTop: 2, flexShrink: 0, width: 18, height: 18, accentColor: PUBLIC_TOKENS.teal }}
            />
            <span>
              <strong>J'accepte</strong> que mon prénom soit affiché publiquement sur le site
              La Base 360, ainsi que mon témoignage.
            </span>
          </label>

          {/* Case "consent photo" retirée 2026-05-28 (cf. commit) : Thomas
              voulait simplifier — limite/bloque la soumission. La colonne
              testimonials.photo_consent reste, on envoie false en dur. */}

          {errorMsg && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                background: "rgba(251,113,133,0.10)",
                border: "1px solid rgba(251,113,133,0.40)",
                color: PUBLIC_TOKENS.coral,
                fontSize: 13,
                textAlign: "center",
              }}
            >
              {errorMsg}
            </div>
          )}

          <PublicCtaPrimary type="submit" disabled={!canSubmit || submitting}>
            {submitting ? "Envoi…" : "Envoyer mon retour →"}
          </PublicCtaPrimary>
        </div>

        <div
          style={{
            marginTop: 24,
            fontFamily: PUBLIC_FONTS.mono,
            fontSize: 11,
            color: "var(--cream-hint)",
            letterSpacing: "0.06em",
            lineHeight: 1.6,
            textAlign: "center",
          }}
        >
          🔒 Tes données restent privées. Aucun spam, aucune revente.
          <br />
          <strong style={{ color: "var(--cream-muted)" }}>La Base 360</strong> · Since 2022
        </div>
      </form>
    </PublicShell>
  );
}

const fieldLabelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: PUBLIC_FONTS.display,
  fontSize: 12,
  fontWeight: 600,
  color: "var(--cream-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  marginBottom: 10,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "13px 15px",
  background: "var(--glass-input)",
  border: "1px solid var(--hair-strong)",
  borderRadius: 12,
  fontFamily: PUBLIC_FONTS.body,
  fontSize: 16,
  color: "var(--cream)",
  outline: "none",
  boxSizing: "border-box",
  transition: "all 0.22s",
  WebkitAppearance: "none",
};

// ─── Success view ─────────────────────────────────────────────────────────────
function SuccessView({ firstName, coachFirstName }: { firstName: string; coachFirstName: string | null }) {
  return (
    <div style={{ padding: "64px 22px 80px", textAlign: "center" }}>
      <PublicBrand label="Témoignage" />
      <div
        className="ps-pop-in"
        style={{
          width: 96,
          height: 96,
          margin: "16px auto 28px",
          borderRadius: "50%",
          background: PUBLIC_TOKENS.gradCta,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: PUBLIC_TOKENS.ink,
          fontSize: 48,
          fontWeight: 700,
          boxShadow: "0 16px 48px -8px rgba(197,248,42,0.40), 0 0 0 8px rgba(45,212,191,0.10)",
        }}
      >
        ✓
      </div>
      <h2
        style={{
          fontFamily: PUBLIC_FONTS.display,
          fontSize: "clamp(28px, 6vw, 36px)",
          fontWeight: 600,
          color: "var(--cream)",
          lineHeight: 1.2,
          letterSpacing: "-0.02em",
          margin: "0 auto 18px",
        }}
      >
        Merci{firstName ? ` ${firstName}` : ""} <span style={publicGradText}>infiniment</span>
      </h2>
      <p
        style={{
          fontSize: 15,
          color: "var(--cream-muted)",
          maxWidth: 440,
          margin: "0 auto 28px",
          lineHeight: 1.55,
        }}
      >
        Ton retour a bien été envoyé. {coachFirstName ?? "Le coach"} va le valider sous 24 h, et il
        s'affichera bientôt sur le site pour aider les prochains à se lancer.
      </p>
      <a
        href="https://instagram.com/labase360"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 22px",
          background: "var(--glass)",
          border: "1px solid var(--hair)",
          borderRadius: 999,
          fontSize: 14,
          fontWeight: 500,
          color: "var(--cream)",
          textDecoration: "none",
          transition: "all 0.22s",
        }}
      >
        📷 Suis-nous sur Instagram
      </a>
      <div
        style={{
          marginTop: 40,
          fontFamily: PUBLIC_FONTS.mono,
          fontSize: 11,
          color: "var(--cream-hint)",
          letterSpacing: "0.08em",
        }}
      >
        La Base 360 · Since 2022
      </div>
    </div>
  );
}

function ResultPanel({ emoji, title, message }: { emoji: string; title: string; message: string }) {
  return (
    <div style={{ padding: "64px 22px 80px", textAlign: "center" }}>
      <PublicBrand label="Témoignage" />
      <div style={{ fontSize: 56, margin: "24px 0 16px" }}>{emoji}</div>
      <h2
        style={{
          fontFamily: PUBLIC_FONTS.display,
          fontSize: 28,
          fontWeight: 600,
          color: "var(--cream)",
          marginBottom: 14,
        }}
      >
        {title}
      </h2>
      <p style={{ fontSize: 14, color: "var(--cream-muted)", maxWidth: 420, margin: "0 auto", lineHeight: 1.55 }}>
        {message}
      </p>
    </div>
  );
}

export default TestimonialFormPage;
