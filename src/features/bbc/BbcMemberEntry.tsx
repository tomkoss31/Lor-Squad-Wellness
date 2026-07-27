// =============================================================================
// BbcMemberEntry — l'écran d'entrée du membre BBC (port du design validé).
// 3 temps : landing → 4 slides d'intro → écran final. Vu UNE SEULE FOIS
// (persisté via la RPC mark_bbc_entry_seen), skippable à tout moment.
// =============================================================================

import { useState, type CSSProperties } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";

interface BbcMemberEntryProps {
  firstName?: string;
  clubName?: string;
  openHours?: string;
  token?: string;
  onDone: () => void;
}

interface Slide {
  eyebrow: string;
  title: string;
  text: string;
  accent: string;
  icon: string;
  fill: boolean;
}

const SLIDES: Slide[] = [
  {
    eyebrow: "ton club",
    title: "ton club du matin, dans ta poche",
    text: "ta carte de visites, ton QR à montrer au coach, ta place au club — tout est là chaque matin.",
    accent: "var(--ls-bbc-lime)",
    icon: "M3 5h18v14H3zM3 10h18M7 15h5",
    fill: false,
  },
  {
    eyebrow: "ta progression",
    title: "vois tes résultats avancer",
    text: "ton poids, tes mensurations, ta courbe — ta transformation en un coup d'œil.",
    accent: "var(--ls-bbc-teal)",
    icon: "M3 12h4l2-7 4 14 2-7h6",
    fill: false,
  },
  {
    eyebrow: "tes cœurs",
    title: "recommande, sois récompensé",
    text: "chaque proche que tu fais venir = un cœur. à 2 cœurs, tu débloques ta remise à vie. et ça continue.",
    accent: "var(--ls-bbc-lime)",
    icon: "M12 20.3S4.6 15.7 2.6 11.3C1.4 8.7 2.9 5.6 6 5.6c1.9 0 3.2 1.2 4 2.2.8-1 2.1-2.2 4-2.2 3.1 0 4.6 3.1 3.4 5.7C19.4 15.7 12 20.3 12 20.3z",
    fill: true,
  },
  {
    eyebrow: "ton assistante",
    title: "noaly répond, matin et soir",
    text: "une recette, une info produit, une fringale, décaler un rdv… demande à Noaly, à tout moment.",
    accent: "var(--ls-bbc-teal)",
    icon: "M12 2l1.9 5.1L19 9l-5.1 1.9L12 16l-1.9-5.1L5 9l5.1-1.9z",
    fill: true,
  },
];

const ARROW = "M5 12h14M12 5l7 7-7 7";

export function BbcMemberEntry({ firstName, clubName, openHours, token, onDone }: BbcMemberEntryProps) {
  const [screen, setScreen] = useState<"landing" | "onb" | "done">("landing");
  const [step, setStep] = useState(0);

  async function finish() {
    // Persiste « vu » côté serveur (RPC token-only). Silent-fail : l'écran se
    // ferme quoi qu'il arrive, on ne bloque jamais l'accès à l'app.
    try {
      const sb = await getSupabaseClient();
      if (sb && token) await sb.rpc("mark_bbc_entry_seen", { p_token: token });
    } catch {
      /* ignore */
    }
    onDone();
  }

  const s = SLIDES[Math.min(step, SLIDES.length - 1)];
  const isLast = step === SLIDES.length - 1;

  return (
    <div
      className="bbc-mode"
      style={{
        position: "relative",
        minHeight: "100vh",
        background: "var(--ls-bbc-bg)",
        color: "var(--ls-bbc-text)",
        fontFamily: "var(--ls-bbc-font-body)",
        overflow: "hidden",
        maxWidth: 460,
        margin: "0 auto",
      }}
    >
      {/* halos d'ambiance */}
      <div aria-hidden="true" style={{ position: "absolute", top: "-8%", left: "-16%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, var(--ls-bbc-lime), transparent 70%)", opacity: 0.13, filter: "blur(64px)", pointerEvents: "none" }} />
      <div aria-hidden="true" style={{ position: "absolute", top: "26%", right: "-20%", width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, var(--ls-bbc-teal), transparent 70%)", opacity: 0.12, filter: "blur(64px)", pointerEvents: "none" }} />

      {screen === "landing" ? (
        <div style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", padding: "calc(56px + env(safe-area-inset-top)) 26px calc(30px + env(safe-area-inset-bottom))" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div style={{ width: 104, height: 104, borderRadius: 28, background: "radial-gradient(circle at 50% 38%, #12160f, #0a0c0a)", border: "1px solid rgba(197,248,42,.22)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 34px -6px rgba(197,248,42,.4)" }}>
              <span style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 38, color: "var(--ls-bbc-lime)" }}>BBC</span>
            </div>
            <span style={{ padding: "6px 18px", borderRadius: 100, background: "rgba(197,248,42,.06)", border: "1px solid rgba(197,248,42,.2)", fontFamily: "var(--ls-bbc-font-mono)", fontSize: 9.5, fontWeight: 600, letterSpacing: "0.28em", textTransform: "uppercase", color: "var(--ls-bbc-muted)", whiteSpace: "nowrap" }}>
              breakfast budget club
            </span>
          </div>

          <div style={{ textAlign: "center", marginTop: 28 }}>
            <div style={{ fontFamily: "var(--ls-bbc-font-mono)", textTransform: "uppercase", fontWeight: 600, color: "var(--ls-bbc-muted)", fontSize: 11, letterSpacing: "0.18em", marginBottom: 12 }}>
              {firstName ? `bienvenue ${firstName}, dans` : "bienvenue dans"}
            </div>
            <h1 style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 50, lineHeight: 0.94, margin: 0 }}>
              ton club
              <br />
              <span style={{ color: "var(--ls-bbc-lime)" }}>du matin</span>
            </h1>
            <p style={{ margin: "16px 0 0", fontSize: 15, lineHeight: 1.5, color: "var(--ls-bbc-muted)" }}>le petit-déj qui te transforme.</p>
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--ls-bbc-hint)" }}>
              ouvert {openHours || "7h — 11h"}
              {clubName ? ` · ${clubName}` : ""}
            </p>
          </div>

          <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 11, paddingTop: 40 }}>
            <button type="button" onClick={() => { setScreen("onb"); setStep(0); }} style={ctaStyle}>
              entrer dans mon club
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ARROW} /></svg>
            </button>
            <button type="button" onClick={() => void finish()} style={{ width: "100%", minHeight: 48, borderRadius: 12, background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", color: "var(--ls-bbc-text)", fontFamily: "var(--ls-bbc-font-body)", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
              aller directement à mon espace
            </button>
            <div style={{ textAlign: "center", fontSize: 11, color: "var(--ls-bbc-hint)", marginTop: 6 }}>
              propulsé par <span style={{ color: "var(--ls-bbc-lime-text)", fontWeight: 600 }}>La Base 360</span>
            </div>
          </div>
        </div>
      ) : screen === "onb" ? (
        <div style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", padding: "calc(48px + env(safe-area-inset-top)) 26px calc(30px + env(safe-area-inset-bottom))" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              {SLIDES.map((_, i) => (
                <span key={i} style={{ height: 7, width: i === step ? 24 : 7, borderRadius: 999, background: i === step ? s.accent : "var(--ls-bbc-line2)", transition: "width .3s, background .3s" }} />
              ))}
            </div>
            <button type="button" onClick={() => void finish()} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ls-bbc-muted)", fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, fontWeight: 600, padding: 6 }}>
              passer
            </button>
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 24, padding: "40px 0" }}>
            <div style={{ width: 112, height: 112, borderRadius: 30, background: `color-mix(in srgb, ${s.accent} 12%, var(--ls-bbc-s1))`, border: `1px solid color-mix(in srgb, ${s.accent} 30%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="52" height="52" viewBox="0 0 24 24" fill={s.fill ? s.accent : "none"} stroke={s.fill ? "none" : s.accent} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={s.icon} />
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: s.accent, marginBottom: 14 }}>{s.eyebrow}</div>
              <h1 style={{ fontFamily: "var(--ls-bbc-font-display)", textTransform: "uppercase", fontSize: 32, lineHeight: 1.04, margin: 0 }}>{s.title}</h1>
              <p style={{ margin: "16px auto 0", maxWidth: 300, fontSize: 14.5, lineHeight: 1.6, color: "var(--ls-bbc-muted)" }}>{s.text}</p>
            </div>
          </div>

          <button type="button" onClick={() => (isLast ? setScreen("done") : setStep((v) => v + 1))} style={ctaStyle}>
            {isLast ? "c'est parti" : "continuer"}
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ARROW} /></svg>
          </button>
        </div>
      ) : (
        <div style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "26px", gap: 20 }}>
          <div style={{ width: 96, height: 96, borderRadius: "50%", background: "var(--ls-bbc-lime)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--ls-bbc-lime-ink)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
          </div>
          <div>
            <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--ls-bbc-lime-text)", fontWeight: 700 }}>tu fais partie du club</div>
            <h1 style={{ fontFamily: "var(--ls-bbc-font-display)", textTransform: "uppercase", fontSize: 30, lineHeight: 1.02, margin: "8px 0 0" }}>on se voit demain 7h</h1>
            <p style={{ margin: "14px auto 0", maxWidth: 280, fontSize: 14, lineHeight: 1.55, color: "var(--ls-bbc-muted)" }}>ta carte de membre et ton QR t'attendent sur ton accueil.</p>
          </div>
          <button type="button" onClick={() => void finish()} style={{ ...ctaStyle, maxWidth: 340 }}>
            ouvrir mon club
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ARROW} /></svg>
          </button>
        </div>
      )}
    </div>
  );
}

const ctaStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 9,
  width: "100%",
  minHeight: 54,
  borderRadius: 14,
  border: "none",
  cursor: "pointer",
  background: "var(--ls-bbc-lime)",
  color: "var(--ls-bbc-lime-ink)",
  fontFamily: "var(--ls-bbc-font-display)",
  textTransform: "uppercase",
  letterSpacing: "0.02em",
  fontSize: 16,
  boxShadow: "0 6px 22px -6px rgba(197,248,42,.4)",
};
