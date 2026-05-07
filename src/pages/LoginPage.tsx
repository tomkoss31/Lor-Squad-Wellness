// LoginPage V4 — "Login vivant" (2026-04-30).
//
// Refonte complete suite challenger Thomas. La page change selon QUAND
// et QUI tu es :
//
//  A. Greeting heure-adaptatif (5 plages : matin/midi/aprem/soir/nuit)
//     avec emoji + gradient mesh visuel qui s adapte.
//  B. Reconnaissance prenom + avatar : au login reussi on capture
//     currentUser.firstName et avatarUrl en localStorage. Au prochain
//     visit, "Bon matin Thomas" avec mini-chip avatar dans le form.
//  C. Quote motivant rotatif cote visuel (12 quotes coaching/mindset)
//     signe d une initiale type note manuscrite.
//  D. Compteur "X coachs en ligne" deterministe par jour/heure (faux
//     mais credible, donne sentiment de plateforme vivante).
//  E. Lien magique avec hint au-dessus pour expliquer la valeur.
//  F. Bouton retour devient "Pas Thomas ?" si returning user (clear
//     localStorage + reload).
//
// Convention theme : default DARK, html.theme-light = LIGHT.
// Conserve toute la logique : loginWithCredentials, redirect coach/
// client, install PWA prompt, animations respectent prefers-reduced-
// motion.

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
// import { useInstallPrompt } from "../context/InstallPromptContext"; // retire 2026-05-07 (PWA install deplace sur /welcome)
import { getRandomTip } from "../components/error-boundary/errorTips";

const LAST_EMAIL_KEY = "ls_last_login_email";
const LAST_FIRSTNAME_KEY = "ls_last_login_firstname";
const LAST_AVATAR_KEY = "ls_last_login_avatar";

// ─── Heure-adaptatif ────────────────────────────────────────────────────────
type DayPhase = {
  greeting: (firstName: string | null) => string;
  emoji: string;
  /** Gradient du visuel gauche (3 stops). Utilise raw colors + tint. */
  gradient: { from: string; mid: string; to: string };
  /** Tint global pour les blobs (gold dominant ou teal/violet). */
  blobsTint: { gold: number; teal: number; cool: number };
};

function getDayPhase(date: Date): DayPhase {
  const h = date.getHours();
  // Matin 5-11
  if (h >= 5 && h < 11) {
    return {
      greeting: (n) => (n ? `Bon matin ${n}` : "Bon matin"),
      emoji: "☕",
      gradient: { from: "#1A1410", mid: "#2A1F18", to: "#1A1410" },
      blobsTint: { gold: 0.55, teal: 0.25, cool: 0 },
    };
  }
  // Midi 11-14
  if (h >= 11 && h < 14) {
    return {
      greeting: (n) => (n ? `Bon midi ${n}` : "Bon midi"),
      emoji: "🥗",
      gradient: { from: "#181610", mid: "#262318", to: "#181610" },
      blobsTint: { gold: 0.6, teal: 0.4, cool: 0 },
    };
  }
  // Apres-midi 14-18
  if (h >= 14 && h < 18) {
    return {
      greeting: (n) => (n ? `Belle après-midi ${n}` : "Belle après-midi"),
      emoji: "💪",
      gradient: { from: "#0F1614", mid: "#1A2420", to: "#0F1614" },
      blobsTint: { gold: 0.5, teal: 0.55, cool: 0 },
    };
  }
  // Soiree 18-22
  if (h >= 18 && h < 22) {
    return {
      greeting: (n) => (n ? `Bonne soirée ${n}` : "Bonne soirée"),
      emoji: "🌙",
      gradient: { from: "#150F1A", mid: "#241A2A", to: "#150F1A" },
      blobsTint: { gold: 0.45, teal: 0.35, cool: 0.4 },
    };
  }
  // Nuit 22-5
  return {
    greeting: (n) => (n ? `Tu bosses tard ${n}` : "Tu bosses tard"),
    emoji: "🦉",
    gradient: { from: "#0A0D14", mid: "#13182A", to: "#0A0D14" },
    blobsTint: { gold: 0.35, teal: 0.3, cool: 0.55 },
  };
}

// Quote = tip aleatoire depuis errorTips.ts (source unique de verite,
// ~60 tips coachs). Signature "— T." ajoutee a l affichage.

// ─── Compteur live deterministe ─────────────────────────────────────────────
function getLiveCoachCount(date: Date): number {
  // Determine par jour-de-l-annee + heure pour stabilite
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000,
  );
  const h = date.getHours();
  // Plus de coachs entre 8h-11h et 18h-22h, moins la nuit
  const peakBoost =
    h >= 8 && h <= 11 ? 12 :
    h >= 18 && h <= 22 ? 14 :
    h >= 12 && h <= 17 ? 7 :
    h >= 6 && h <= 7 ? 5 :
    2;
  const seed = (dayOfYear * 7 + h) % 7; // 0-6
  return 4 + seed + peakBoost;
}

// maskEmail retiree 2026-05-07 (fix retour Thomas : email masque pas
// pertinent pour returning user — fallback "Heureux de te revoir 👋"
// suffit, et le firstName s affiche des le prochain login).

// getInitials retiree (avatar chip supprime du greeting 2026-05-07).

// ─── Component ──────────────────────────────────────────────────────────────
export function LoginPage() {
  const { authReady, currentUser, loginWithCredentials } = useAppContext();
  // PWA install prompt retire de la page login (deja sur /welcome — fix
  // overcharged 2026-05-07). Hook conserve si reactivation rapide voulue :
  // const { canPromptInstall, isIos, isMobile, isStandalone, promptInstall } = useInstallPrompt();
  const navigate = useNavigate();

  // Restore last identity (returning user UX)
  // initialLastAvatar plus utilise depuis suppression avatar chip 2026-05-07
  const [initialLastEmail, initialLastFirstName] = useMemo(() => {
    if (typeof window === "undefined") return ["", null] as const;
    try {
      return [
        window.localStorage.getItem(LAST_EMAIL_KEY) ?? "",
        window.localStorage.getItem(LAST_FIRSTNAME_KEY),
      ] as const;
    } catch {
      return ["", null] as const;
    }
  }, []);

  const [email, setEmail] = useState(initialLastEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isReturning = Boolean(initialLastEmail);
  const knownFirstName = initialLastFirstName;
  // knownAvatar (initialLastAvatar) plus utilise depuis suppression avatar chip 2026-05-07

  // Heure-adaptatif (calcule 1 fois au mount, garde stable pour la session)
  const [phase] = useState(() => getDayPhase(new Date()));
  const [quote] = useState(() => getRandomTip());

  // Compteur live qui re-tick toutes les 30s pour donner sensation de vie
  const [liveCount, setLiveCount] = useState(() => getLiveCoachCount(new Date()));
  useEffect(() => {
    const t = window.setInterval(() => {
      // Petit drift +/- 1 pour avoir l impression que ca bouge
      const target = getLiveCoachCount(new Date());
      const drift = Math.random() < 0.5 ? -1 : 1;
      setLiveCount(Math.max(3, Math.min(35, target + drift)));
    }, 30_000);
    return () => window.clearInterval(t);
  }, []);

  // Capture currentUser dans localStorage des qu il est dispo (apres login OU
  // si user deja loggue revient sur /login). On extrait le firstName depuis
  // currentUser.name (pas de champ firstName direct dans le type User).
  useEffect(() => {
    if (!currentUser) return;
    try {
      if (currentUser.email) {
        window.localStorage.setItem(LAST_EMAIL_KEY, currentUser.email);
      }
      const firstName = (currentUser.name ?? "").trim().split(/\s+/)[0];
      if (firstName) {
        window.localStorage.setItem(LAST_FIRSTNAME_KEY, firstName);
      }
      if (currentUser.avatarUrl) {
        window.localStorage.setItem(LAST_AVATAR_KEY, currentUser.avatarUrl);
      } else {
        window.localStorage.removeItem(LAST_AVATAR_KEY);
      }
    } catch { /* quota / private mode */ }
  }, [currentUser]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authReady || submitting) return;

    setSubmitting(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const result = await loginWithCredentials({
        email: cleanEmail,
        password: password.trim(),
      });
      if (!result.ok) {
        const raw = result.error ?? "";
        const friendly =
          /invalid login credentials/i.test(raw) || /invalid_credentials/i.test(raw)
            ? "Email ou mot de passe incorrect."
            : raw;
        setError(friendly || "Email ou mot de passe incorrect.");
        return;
      }
      try { window.localStorage.setItem(LAST_EMAIL_KEY, cleanEmail); }
      catch { /* */ }
      setError("");
      navigate(result.redirectTo);
    } catch (submitError) {
      console.error("Soumission du login impossible.", submitError);
      setError("La connexion sécurisée ne répond pas correctement pour le moment.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleNotMe() {
    try {
      window.localStorage.removeItem(LAST_EMAIL_KEY);
      window.localStorage.removeItem(LAST_FIRSTNAME_KEY);
      window.localStorage.removeItem(LAST_AVATAR_KEY);
    } catch { /* */ }
    window.location.href = "/welcome";
  }

  const greeting = phase.greeting(knownFirstName);

  return (
    <div className="lp-root">
      <style>{`
        /* ─── Base / theme La Base 360 G3 (rebrand 2026-05-06) ──── */
        .lp-root {
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          font-family: 'Inter', system-ui, sans-serif;
          background: #FFFFFF;
          color: #0F172A;
          overflow: hidden;
          position: relative;
        }
        html.theme-light .lp-root {
          background: #FFFFFF;
          color: #0F172A;
        }

        /* ─── Layout split ────────────────────────────────────── */
        .lp-visual {
          flex: 0 0 45%;
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #F0FDF4 0%, #ECFEFF 50%, #F5F3FF 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 36px;
        }
        html.theme-light .lp-visual {
          background: linear-gradient(135deg, #F0FDF4 0%, #ECFEFF 50%, #F5F3FF 100%);
        }
        .lp-form-side {
          flex: 1 1 55%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 36px;
          position: relative;
          z-index: 2;
        }

        /* ─── Visuel : blobs heure-adaptatif ──────────────────── */
        .lp-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
          will-change: transform;
        }
        /* G3 Vital Fusion — emerald, cyan, violet (rebrand 2026-05-06).
           Les classes lp-blob-gold/teal/cool sont gardees comme noms de
           hooks mais leur contenu est totalement migre vers G3. */
        .lp-blob-gold {
          top: -10%; left: -8%;
          width: 460px; height: 460px;
          background: radial-gradient(circle, #10B981 0%, transparent 70%);
          opacity: 0.55;
          animation: lp-float-1 32s ease-in-out infinite alternate;
        }
        .lp-blob-teal {
          bottom: -12%; right: -10%;
          width: 400px; height: 400px;
          background: radial-gradient(circle, #06B6D4 0%, transparent 70%);
          opacity: 0.45;
          animation: lp-float-2 38s ease-in-out infinite alternate;
        }
        .lp-blob-cool {
          top: 35%; left: 25%;
          width: 360px; height: 360px;
          background: radial-gradient(circle, #8B5CF6 0%, transparent 70%);
          opacity: 0.40;
          animation: lp-float-3 42s ease-in-out infinite alternate;
        }
        html.theme-light .lp-blob-gold { opacity: 0.55; }
        html.theme-light .lp-blob-teal { opacity: 0.45; }
        html.theme-light .lp-blob-cool { opacity: 0.40; }
        @keyframes lp-float-1 {
          0%   { transform: translate(0, 0) scale(1); }
          100% { transform: translate(50px, 40px) scale(1.15); }
        }
        @keyframes lp-float-2 {
          0%   { transform: translate(0, 0) scale(1); }
          100% { transform: translate(-60px, -30px) scale(1.12); }
        }
        @keyframes lp-float-3 {
          0%   { transform: translate(0, 0) scale(1); }
          100% { transform: translate(40px, -50px) scale(1.08); }
        }
        .lp-grain {
          position: absolute; inset: 0; pointer-events: none;
          opacity: 0.07; mix-blend-mode: overlay;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
        }
        html.theme-light .lp-grain { opacity: 0.04; }

        /* ─── Visuel center ──────────────────────────────────── */
        .lp-visual-inner {
          position: relative;
          z-index: 2;
          text-align: center;
          max-width: 380px;
          animation: lp-in 0.9s cubic-bezier(0.16,1,0.3,1) both;
        }
        .lp-logo {
          width: 168px; height: 168px;
          object-fit: contain;
          margin-bottom: 12px;
          background: transparent;
          /* Animation unique combinee : float (translateY) + pulse (scale + glow)
             en une seule keyframes pour eviter le conflit transform de 2 anims
             concurrentes. Cycle 6s ease-in-out infini. */
          animation: lp-logo-life 6s ease-in-out infinite;
          filter: drop-shadow(0 0 32px rgba(16,185,129,0.28)) drop-shadow(0 18px 38px rgba(6,182,212,0.22));
          will-change: transform, filter;
        }
        @keyframes lp-logo-life {
          0%, 100% {
            transform: translateY(0) scale(1);
            filter: drop-shadow(0 0 24px rgba(16,185,129,0.25)) drop-shadow(0 12px 32px rgba(6,182,212,0.18));
          }
          50% {
            transform: translateY(-7px) scale(1.04);
            filter: drop-shadow(0 0 38px rgba(16,185,129,0.40)) drop-shadow(0 22px 42px rgba(6,182,212,0.28));
          }
        }
        /* Ancien lp-logo-pulse fusionne dans lp-logo-life ci-dessus (2026-05-07). */
        /* Pastille SINCE 2022 — au-dessus de la sphere logo (brand 2026-05-07) */
        .lp-since-pill {
          display: inline-block;
          padding: 7px 20px;
          border-radius: 100px;
          background: rgba(6,182,212,0.10);
          border: 1px solid rgba(6,182,212,0.28);
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.32em;
          text-transform: uppercase;
          color: #0E7490;
          margin-bottom: 18px;
          backdrop-filter: blur(8px);
        }
        /* Wordmark "La Base 360" — sous la sphere (brand 2026-05-07) */
        .lp-wordmark {
          font-family: 'Sora', system-ui, sans-serif;
          font-size: 44px;
          font-weight: 800;
          line-height: 1;
          letter-spacing: -0.025em;
          margin: 4px 0 6px;
          display: inline-flex;
          align-items: baseline;
          gap: 10px;
        }
        .lp-wordmark-base { color: #0F172A; }
        .lp-wordmark-360 {
          font-style: italic;
          font-weight: 700;
          background: linear-gradient(135deg, #10B981 0%, #06B6D4 50%, #8B5CF6 100%);
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent; color: transparent;
        }
        .lp-wordmark-sub {
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 14px;
          font-weight: 500;
          color: #64748B;
          margin: 0 0 22px;
          letter-spacing: 0.005em;
        }
        /* Anciennes classes lp-heritage / lp-tagline conservees commentees au cas ou */
        .lp-heritage { display: none; }
        .lp-tagline { display: none; }

        /* ─── Quote rotatif ─────────────────────────────────── */
        .lp-quote-block {
          margin: 0 auto 18px;
          padding: 16px 18px;
          max-width: 340px;
          background: rgba(255,255,255,0.6);
          border-left: 3px solid #10B981;
          border-radius: 4px 12px 12px 4px;
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          animation: lp-in 1s cubic-bezier(0.16,1,0.3,1) 0.4s both;
        }
        html.theme-light .lp-quote-block {
          background: rgba(255,255,255,0.6);
          border-left-color: #10B981;
        }
        .lp-quote-text {
          font-size: 13.5px;
          line-height: 1.55;
          color: #475569;
          font-style: italic;
          margin: 0 0 8px;
          font-family: 'Inter', system-ui, sans-serif;
        }
        html.theme-light .lp-quote-text { color: #475569; }
        .lp-quote-sign {
          font-family: 'Sora', system-ui, sans-serif;
          font-size: 12px;
          font-weight: 700;
          background: linear-gradient(135deg, #10B981 0%, #06B6D4 50%, #8B5CF6 100%);
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: 0.05em;
        }
        html.theme-light .lp-quote-sign {
          background: linear-gradient(135deg, #10B981 0%, #06B6D4 50%, #8B5CF6 100%);
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        /* ─── Compteur live ─────────────────────────────────── */
        .lp-live {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 999px;
          background: rgba(255,255,255,0.7);
          border: 1px solid rgba(15,23,42,0.06);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          font-size: 12px;
          font-weight: 500;
          color: #475569;
          font-family: 'Inter', system-ui, sans-serif;
          animation: lp-in 1s cubic-bezier(0.16,1,0.3,1) 0.5s both;
        }
        html.theme-light .lp-live {
          background: rgba(255,255,255,0.7);
          border-color: rgba(15,23,42,0.06);
          color: #475569;
        }
        .lp-live-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: #10B981;
          box-shadow: 0 0 8px #10B981;
          animation: lp-dot-pulse 2s ease-in-out infinite;
        }
        @keyframes lp-dot-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.6; transform: scale(0.85); }
        }
        .lp-live-num {
          font-family: 'Sora', system-ui, sans-serif;
          font-weight: 700;
          color: #10B981;
          font-size: 13px;
          font-variant-numeric: tabular-nums;
        }
        html.theme-light .lp-live-num { color: #10B981; }

        /* ─── Form right ─────────────────────────────────────── */
        .lp-form-inner {
          width: 100%;
          max-width: 400px;
          display: flex;
          flex-direction: column;
          gap: 22px;
          animation: lp-in 0.9s cubic-bezier(0.16,1,0.3,1) 0.15s both;
        }
        .lp-greeting {
          font-family: 'Sora', system-ui, sans-serif;
          font-size: 32px;
          font-weight: 700;
          letter-spacing: -0.025em;
          line-height: 1.15;
          margin: 0 0 8px;
          color: #0F172A;
        }
        html.theme-light .lp-greeting { color: #0F172A; }
        .lp-greeting-emoji {
          display: inline-block;
          margin-left: 8px;
          animation: lp-wave 2.4s ease-in-out infinite;
          transform-origin: 70% 70%;
        }
        @keyframes lp-wave {
          0%, 60%, 100% { transform: rotate(0); }
          10%, 30%      { transform: rotate(14deg); }
          20%, 40%      { transform: rotate(-8deg); }
        }
        .lp-greeting-hint {
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 14px;
          color: #475569;
          line-height: 1.5;
          margin: 0;
        }
        html.theme-light .lp-greeting-hint { color: #475569; }
        .lp-greeting-mask {
          font-family: 'JetBrains Mono', 'Courier New', monospace;
          background: linear-gradient(135deg, #10B981 0%, #06B6D4 50%, #8B5CF6 100%);
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent;
          font-weight: 600;
        }

        /* ─── Avatar chip (returning user) ───────────────────── */
        .lp-avatar-chip {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 6px 14px 6px 6px;
          border-radius: 999px;
          background: rgba(16,185,129,0.06);
          border: 1px solid rgba(16,185,129,0.25);
          font-size: 13px;
          font-family: 'Inter', system-ui, sans-serif;
          color: #0F172A;
          margin-top: 8px;
          animation: lp-in 0.7s cubic-bezier(0.16,1,0.3,1) 0.25s both;
        }
        html.theme-light .lp-avatar-chip {
          background: rgba(16,185,129,0.06);
          border-color: rgba(16,185,129,0.25);
          color: #0F172A;
        }
        .lp-avatar-circle {
          width: 32px; height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #10B981 0%, #06B6D4 50%, #8B5CF6 100%);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #FFFFFF;
          font-family: 'Sora', system-ui, sans-serif;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.02em;
          background-size: cover;
          background-position: center;
          flex-shrink: 0;
        }

        /* ─── Floating labels ────────────────────────────────── */
        .lp-field {
          position: relative;
          display: flex;
          flex-direction: column;
        }
        .lp-input {
          width: 100%;
          box-sizing: border-box;
          background: #F8FAFC !important;
          border: 1.5px solid #E2E8F0;
          border-radius: 12px;
          /* Padding tres aere : 34px top (label flottant + 18px de respiration
             au-dessus du texte tape), 18px bottom — fix overcrowding 2026-05-07
             (passe 2 : 28→34 apres retour Thomas, label encore trop colle). */
          padding: 34px 18px 18px;
          font-size: 15.5px;
          line-height: 1.3;
          min-height: 64px;
          font-family: 'Inter', system-ui, sans-serif;
          color: #0F172A !important;
          outline: none;
          transition: border-color 0.18s, background 0.18s, box-shadow 0.18s;
          -webkit-text-fill-color: #0F172A !important;
          /* Force light color-scheme : empeche le browser dark mode auto
             d'inverser les couleurs des form fields (fix 2026-05-07 retour
             Thomas : capture montrait fond noir sur autofill Chrome). */
          color-scheme: light;
          caret-color: #10B981;
        }
        /* Override autofill Chrome / Safari (fix 2026-05-07) :
           sans ca, le bg apparait sombre/jaunatre au lieu de #F8FAFC. */
        .lp-input:-webkit-autofill,
        .lp-input:-webkit-autofill:hover,
        .lp-input:-webkit-autofill:focus,
        .lp-input:-webkit-autofill:active {
          -webkit-text-fill-color: #0F172A !important;
          -webkit-box-shadow: 0 0 0 1000px #F8FAFC inset !important;
          box-shadow: 0 0 0 1000px #F8FAFC inset !important;
          caret-color: #10B981;
          transition: background-color 5000s ease-in-out 0s;
        }
        .lp-input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px #FFFFFF inset !important;
          box-shadow: 0 0 0 1000px #FFFFFF inset !important;
        }
        html.theme-light .lp-input {
          background: #F8FAFC !important;
          border: 1.5px solid #E2E8F0;
          color: #0F172A !important;
          -webkit-text-fill-color: #0F172A !important;
        }
        .lp-input:focus {
          border-color: #10B981;
          background: #FFFFFF !important;
          box-shadow: 0 0 0 4px rgba(16,185,129,0.12);
        }
        html.theme-light .lp-input:focus { background: #FFFFFF !important; }
        .lp-input::placeholder { color: transparent; }
        /* Greeting name : style premium avec accent gradient */
        .lp-greeting-name {
          background: linear-gradient(120deg, #10B981, #06B6D4);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          font-weight: 800;
          font-style: italic;
        }
        .lp-label {
          position: absolute;
          top: 22px; left: 18px;
          font-size: 14.5px;
          font-weight: 500;
          color: #94A3B8;
          pointer-events: none;
          transition: top 0.15s, font-size 0.15s, color 0.15s;
          font-family: 'Inter', system-ui, sans-serif;
        }
        html.theme-light .lp-label { color: #94A3B8; }
        .lp-input:focus + .lp-label,
        .lp-input:not(:placeholder-shown) + .lp-label {
          /* Label flottant remonte tres haut (8px → 9px) pour gap propre avec
             le texte tape — fix overcrowding passe 2 (2026-05-07). */
          top: 9px;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #10B981;
        }
        .lp-pw-eye {
          position: absolute;
          right: 12px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none;
          cursor: pointer;
          padding: 6px;
          color: #94A3B8;
          font-size: 16px;
          line-height: 1;
          border-radius: 8px;
          transition: color 0.15s, background 0.15s;
        }
        html.theme-light .lp-pw-eye { color: #94A3B8; }
        .lp-pw-eye:hover {
          color: #10B981;
          background: rgba(16,185,129,0.08);
        }

        /* ─── Error / submit / secondary ─────────────────────── */
        .lp-error {
          background: rgba(226,75,74,0.12);
          border: 1px solid rgba(226,75,74,0.5);
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 13px;
          color: #FCA5A5;
          line-height: 1.5;
          animation: lp-shake 0.3s ease-out;
        }
        html.theme-light .lp-error {
          background: #FCEBEB;
          border: 1px solid #E24B4A;
          color: #501313;
        }
        @keyframes lp-shake {
          0%, 100% { transform: translateX(0); }
          25%      { transform: translateX(-4px); }
          75%      { transform: translateX(4px); }
        }
        .lp-submit {
          width: 100%;
          background: linear-gradient(135deg, #10B981 0%, #06B6D4 50%, #8B5CF6 100%);
          color: #FFFFFF;
          border: none;
          border-radius: 14px;
          padding: 16px 16px;
          font-family: 'Sora', system-ui, sans-serif;
          font-size: 15px;
          font-weight: 600;
          letter-spacing: 0.01em;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 6px 22px rgba(16,185,129,0.28), inset 0 1px 0 rgba(255,255,255,0.18);
          transition: transform 0.18s, box-shadow 0.18s, filter 0.18s;
        }
        .lp-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 28px rgba(16,185,129,0.40), 0 4px 14px rgba(139,92,246,0.20), inset 0 1px 0 rgba(255,255,255,0.22);
          filter: brightness(1.04);
        }
        .lp-submit:disabled { opacity: 0.55; cursor: not-allowed; }

        .lp-divider-row {
          display: flex; align-items: center; gap: 10px;
          font-size: 11px;
          color: #94A3B8;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-weight: 600;
          font-family: 'Inter', system-ui, sans-serif;
        }
        html.theme-light .lp-divider-row { color: #94A3B8; }
        .lp-divider-row::before, .lp-divider-row::after {
          content: ""; flex: 1; height: 1px;
          background: #E2E8F0;
        }
        html.theme-light .lp-divider-row::before,
        html.theme-light .lp-divider-row::after {
          background: #E2E8F0;
        }
        /* Lien magique compact (1 ligne, remplace l ancien magic-btn —
           fix overcharged 2026-05-07) */
        .lp-magic-link {
          display: block;
          width: 100%;
          margin-top: 4px;
          padding: 10px 14px;
          background: transparent;
          border: 1px dashed rgba(16,185,129,0.32);
          border-radius: 12px;
          color: #10B981;
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 13px;
          font-weight: 600;
          text-align: center;
          cursor: pointer;
          transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
        }
        .lp-magic-link:hover {
          background: rgba(16,185,129,0.06);
          border-color: rgba(16,185,129,0.55);
          border-style: solid;
        }
        .lp-magic-link:focus-visible {
          outline: 2px solid #10B981;
          outline-offset: 2px;
        }
        .lp-magic-hint {
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 12px;
          color: #475569;
          line-height: 1.5;
          margin: -4px 0 6px;
          text-align: center;
        }
        html.theme-light .lp-magic-hint { color: #475569; }
        .lp-magic-btn {
          width: 100%;
          background: rgba(16,185,129,0.08);
          color: #10B981;
          border: 1.5px solid rgba(16,185,129,0.30);
          border-radius: 12px;
          padding: 13px 16px;
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: background 0.15s, border-color 0.15s, transform 0.15s;
        }
        html.theme-light .lp-magic-btn {
          background: rgba(16,185,129,0.06);
          color: #10B981;
          border-color: rgba(16,185,129,0.30);
        }
        .lp-magic-btn:hover {
          background: rgba(16,185,129,0.14);
          border-color: rgba(16,185,129,0.60);
          transform: translateY(-1px);
        }

        /* ─── PWA install + footer ──────────────────────────── */
        .lp-pwa-card {
          background: rgba(6,182,212,0.06);
          border: 1px solid rgba(6,182,212,0.20);
          border-radius: 12px;
          padding: 12px 14px;
          font-size: 12.5px;
          line-height: 1.5;
          color: #475569;
          font-family: 'Inter', system-ui, sans-serif;
        }
        html.theme-light .lp-pwa-card { color: #475569; }
        .lp-pwa-head {
          font-size: 10.5px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-weight: 700;
          color: #06B6D4;
          margin-bottom: 4px;
        }
        html.theme-light .lp-pwa-head { color: #06B6D4; }
        .lp-pwa-btn {
          margin-top: 8px;
          background: rgba(6,182,212,0.10);
          border: 1px solid rgba(6,182,212,0.30);
          color: #06B6D4;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          font-family: 'Inter', system-ui, sans-serif;
        }
        html.theme-light .lp-pwa-btn { color: #06B6D4; }
        .lp-pwa-btn:hover {
          background: rgba(6,182,212,0.20);
          border-color: rgba(6,182,212,0.50);
        }

        .lp-trust {
          margin-top: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 11px;
          color: #94A3B8;
          font-family: 'Inter', system-ui, sans-serif;
        }
        html.theme-light .lp-trust { color: #94A3B8; }

        /* ─── Bouton retour / "Pas Thomas ?" ─────────────────── */
        .lp-back {
          position: fixed;
          top: 18px; left: 18px;
          z-index: 20;
          padding: 8px 16px;
          border-radius: 999px;
          background: rgba(255,255,255,0.85);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid #E2E8F0;
          color: #475569;
          font-size: 12.5px;
          font-weight: 500;
          font-family: 'Inter', system-ui, sans-serif;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
          transition: all 0.15s;
        }
        html.theme-light .lp-back {
          background: rgba(255,255,255,0.85);
          border-color: #E2E8F0;
          color: #475569;
        }
        .lp-back:hover {
          color: #10B981;
          border-color: rgba(16,185,129,0.40);
          transform: translateX(-2px);
        }

        /* ─── Animations & reduced motion ────────────────────── */
        @keyframes lp-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .lp-blob-gold, .lp-blob-teal, .lp-blob-cool, .lp-logo,
          .lp-live-dot, .lp-greeting-emoji,
          .lp-visual-inner, .lp-form-inner,
          .lp-quote-block, .lp-live, .lp-avatar-chip { animation: none !important; }
          .lp-error { animation: none !important; }
        }

        /* ─── Mobile ─────────────────────────────────────────── */
        @media (max-width: 880px) {
          .lp-root { flex-direction: column; }
          .lp-visual {
            flex: 0 0 auto;
            min-height: 32vh;
            padding: 32px 24px 24px;
          }
          .lp-form-side {
            flex: 1;
            padding: 28px 24px 32px;
          }
          .lp-logo { width: 120px; height: 120px; margin-bottom: 8px; }
          .lp-since-pill { font-size: 10px; padding: 6px 16px; margin-bottom: 14px; }
          .lp-wordmark { font-size: 32px; gap: 8px; margin: 2px 0 4px; }
          .lp-wordmark-sub { font-size: 12.5px; margin-bottom: 16px; }
          .lp-tagline { font-size: 22px; margin-bottom: 16px; }
          .lp-quote-block { padding: 12px 14px; max-width: 320px; }
          .lp-quote-text { font-size: 12.5px; }
          .lp-greeting { font-size: 24px; }
          .lp-back { top: 12px; left: 12px; padding: 6px 12px; font-size: 11.5px; }
        }
        @media (max-width: 480px) {
          .lp-visual { min-height: 28vh; padding: 28px 20px 18px; }
          .lp-form-side { padding: 24px 20px 28px; }
          .lp-tagline { font-size: 20px; }
          .lp-blob-gold, .lp-blob-teal, .lp-blob-cool { width: 280px; height: 280px; }
        }
      `}</style>

      {/* Bouton retour / "Pas Prenom ?" */}
      {isReturning && knownFirstName ? (
        <button type="button" className="lp-back" onClick={handleNotMe}>
          ← Pas {knownFirstName} ?
        </button>
      ) : (
        <a href="/welcome" className="lp-back" aria-label="Retour à l'accueil">
          ← Accueil
        </a>
      )}

      {/* ─── Visuel gauche ──────────────────────── */}
      <div className="lp-visual" aria-hidden="true">
        <div className="lp-blob lp-blob-gold" />
        <div className="lp-blob lp-blob-teal" />
        <div className="lp-blob lp-blob-cool" />
        <div className="lp-grain" />
        <div className="lp-visual-inner">
          {/* Brand layout 2026-05-07 : pastille SINCE 2022 au-dessus, sphere
              animee, puis wordmark "La Base 360" + tagline "The wellness
              nutrition club" — match exact de l identite envoyee par Thomas. */}
          <span className="lp-since-pill">★ Since 2022 ★</span>
          <img
            src="/brand/labase360/logo-primary.svg"
            alt="La Base 360"
            className="lp-logo"
          />
          <h1 className="lp-wordmark">
            <span className="lp-wordmark-base">La Base</span>
            <span className="lp-wordmark-360">360</span>
          </h1>
          <p className="lp-wordmark-sub">The wellness nutrition club</p>
          <div className="lp-quote-block">
            <p className="lp-quote-text">{quote.emoji} « {quote.text} »</p>
            <span className="lp-quote-sign">— T.</span>
          </div>
          <div className="lp-live">
            <span className="lp-live-dot" aria-hidden="true" />
            <span className="lp-live-num">{liveCount}</span> coachs en ligne
          </div>
        </div>
      </div>

      {/* ─── Form droite ────────────────────────── */}
      <div className="lp-form-side">
        <div className="lp-form-inner">
          {/* Greeting heure-adaptatif */}
          <div>
            <h1 className="lp-greeting">
              {greeting}
              <span className="lp-greeting-emoji" aria-hidden="true">{phase.emoji}</span>
            </h1>
            {isReturning && knownFirstName ? (
              <p className="lp-greeting-hint">
                Heureux de te revoir, <strong className="lp-greeting-name">{knownFirstName}</strong> 👋
              </p>
            ) : isReturning ? (
              <p className="lp-greeting-hint">
                Heureux de te revoir <span className="lp-greeting-name">👋</span>
              </p>
            ) : (
              <p className="lp-greeting-hint">
                Identifie-toi pour ouvrir ton cockpit.
              </p>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div className="lp-field">
              <input
                id="lp-email"
                type="email"
                className="lp-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=" "
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="username"
                inputMode="email"
                spellCheck={false}
                required
              />
              <label htmlFor="lp-email" className="lp-label">Adresse email</label>
            </div>

            <div className="lp-field">
              <input
                id="lp-password"
                type={showPassword ? "text" : "password"}
                className="lp-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=" "
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
                style={{ paddingRight: 44 }}
              />
              <label htmlFor="lp-password" className="lp-label">Mot de passe</label>
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="lp-pw-eye"
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>

            {error ? <div className="lp-error">{error}</div> : null}

            <button
              type="submit"
              className="lp-submit"
              disabled={!authReady || submitting}
            >
              {submitting ? "Connexion…" : "Ouvrir mon espace"}
              {!submitting ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              ) : null}
            </button>
          </form>

          {/* Lien magique compact (1 ligne, sans paragraphe ni divider — fix
              page de login overcharged 2026-05-07) */}
          <button
            type="button"
            onClick={() => navigate("/forgot-password")}
            className="lp-magic-link"
          >
            ✨ Mot de passe oublié ? Recevoir un lien magique
          </button>

          <div className="lp-trust">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Connexion sécurisée · données chiffrées
          </div>
        </div>
      </div>
    </div>
  );
}
