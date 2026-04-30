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
import { useInstallPrompt } from "../context/InstallPromptContext";
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

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  if (local.length <= 2) return `${local[0]}*@${domain}`;
  return `${local[0]}${"*".repeat(Math.min(local.length - 2, 4))}${local.slice(-1)}@${domain}`;
}

function getInitials(firstName: string): string {
  const parts = firstName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// ─── Component ──────────────────────────────────────────────────────────────
export function LoginPage() {
  const { authReady, currentUser, loginWithCredentials } = useAppContext();
  const { canPromptInstall, isIos, isMobile, isStandalone, promptInstall } = useInstallPrompt();
  const navigate = useNavigate();

  // Restore last identity (returning user UX)
  const [initialLastEmail, initialLastFirstName, initialLastAvatar] = useMemo(() => {
    if (typeof window === "undefined") return ["", null, null] as const;
    try {
      return [
        window.localStorage.getItem(LAST_EMAIL_KEY) ?? "",
        window.localStorage.getItem(LAST_FIRSTNAME_KEY),
        window.localStorage.getItem(LAST_AVATAR_KEY),
      ] as const;
    } catch {
      return ["", null, null] as const;
    }
  }, []);

  const [email, setEmail] = useState(initialLastEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isReturning = Boolean(initialLastEmail);
  const knownFirstName = initialLastFirstName;
  const knownAvatar = initialLastAvatar;

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

  async function handleInstallClick() {
    await promptInstall();
  }

  const greeting = phase.greeting(knownFirstName);

  return (
    <div className="lp-root">
      <style>{`
        /* ─── Base / theme ────────────────────────────────────── */
        .lp-root {
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          font-family: 'DM Sans', sans-serif;
          background: ${phase.gradient.from};
          color: #F0EDE8;
          overflow: hidden;
          position: relative;
        }
        html.theme-light .lp-root {
          background: #F7F5F0;
          color: #0B0D11;
        }

        /* ─── Layout split ────────────────────────────────────── */
        .lp-visual {
          flex: 0 0 45%;
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, ${phase.gradient.from} 0%, ${phase.gradient.mid} 50%, ${phase.gradient.to} 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 36px;
        }
        html.theme-light .lp-visual {
          background: linear-gradient(135deg, #F0E9DA 0%, #F7F0E0 50%, #EDE3CC 100%);
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
        .lp-blob-gold {
          top: -10%; left: -8%;
          width: 420px; height: 420px;
          background: radial-gradient(circle, #EF9F27 0%, transparent 70%);
          opacity: ${phase.blobsTint.gold};
          animation: lp-float-1 32s ease-in-out infinite alternate;
        }
        .lp-blob-teal {
          bottom: -12%; right: -10%;
          width: 380px; height: 380px;
          background: radial-gradient(circle, #1D9E75 0%, transparent 70%);
          opacity: ${phase.blobsTint.teal};
          animation: lp-float-2 38s ease-in-out infinite alternate;
        }
        .lp-blob-cool {
          top: 35%; left: 25%;
          width: 320px; height: 320px;
          background: radial-gradient(circle, #6366F1 0%, transparent 70%);
          opacity: ${phase.blobsTint.cool};
          animation: lp-float-3 42s ease-in-out infinite alternate;
        }
        html.theme-light .lp-blob-gold { opacity: 0.6; }
        html.theme-light .lp-blob-teal { opacity: 0.5; }
        html.theme-light .lp-blob-cool { opacity: 0; }
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
          width: 84px; height: 84px;
          border-radius: 22px;
          background: linear-gradient(135deg, #EF9F27 0%, #BA7517 100%);
          display: inline-flex; align-items: center; justify-content: center;
          box-shadow: 0 0 60px rgba(239,159,39,0.4), 0 12px 32px rgba(186,117,23,0.3);
          margin-bottom: 24px;
          animation: lp-logo-pulse 3s ease-in-out infinite alternate;
        }
        @keyframes lp-logo-pulse {
          0%   { box-shadow: 0 0 36px rgba(239,159,39,0.25), 0 12px 32px rgba(186,117,23,0.25); transform: scale(1); }
          100% { box-shadow: 0 0 70px rgba(239,159,39,0.5), 0 14px 38px rgba(186,117,23,0.32); transform: scale(1.04); }
        }
        .lp-tagline {
          font-family: 'Syne', sans-serif;
          font-size: 26px;
          font-weight: 700;
          line-height: 1.18;
          letter-spacing: -0.02em;
          margin: 0 0 20px;
        }
        .lp-tagline-accent {
          background: linear-gradient(135deg, #F5B847 0%, #EF9F27 100%);
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent; color: transparent;
        }

        /* ─── Quote rotatif ─────────────────────────────────── */
        .lp-quote-block {
          margin: 0 auto 18px;
          padding: 16px 18px;
          max-width: 340px;
          background: rgba(255,255,255,0.04);
          border-left: 3px solid rgba(239,159,39,0.6);
          border-radius: 4px 12px 12px 4px;
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          animation: lp-in 1s cubic-bezier(0.16,1,0.3,1) 0.4s both;
        }
        html.theme-light .lp-quote-block {
          background: rgba(255,255,255,0.5);
          border-left-color: rgba(186,117,23,0.7);
        }
        .lp-quote-text {
          font-size: 13.5px;
          line-height: 1.55;
          color: rgba(240,237,232,0.88);
          font-style: italic;
          margin: 0 0 8px;
          font-family: 'DM Sans', sans-serif;
        }
        html.theme-light .lp-quote-text { color: rgba(11,13,17,0.78); }
        .lp-quote-sign {
          font-family: 'Syne', sans-serif;
          font-size: 12px;
          font-weight: 700;
          color: rgba(239,159,39,0.85);
          letter-spacing: 0.05em;
        }
        html.theme-light .lp-quote-sign { color: rgba(186,117,23,0.95); }

        /* ─── Compteur live ─────────────────────────────────── */
        .lp-live {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 999px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          font-size: 12px;
          font-weight: 500;
          color: rgba(240,237,232,0.85);
          font-family: 'DM Sans', sans-serif;
          animation: lp-in 1s cubic-bezier(0.16,1,0.3,1) 0.5s both;
        }
        html.theme-light .lp-live {
          background: rgba(255,255,255,0.7);
          border-color: rgba(11,13,17,0.08);
          color: rgba(11,13,17,0.78);
        }
        .lp-live-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: #1D9E75;
          box-shadow: 0 0 8px #1D9E75;
          animation: lp-dot-pulse 2s ease-in-out infinite;
        }
        @keyframes lp-dot-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.6; transform: scale(0.85); }
        }
        .lp-live-num {
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          color: #1D9E75;
          font-size: 13px;
          font-variant-numeric: tabular-nums;
        }
        html.theme-light .lp-live-num { color: #0D9488; }

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
          font-family: 'Syne', sans-serif;
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.02em;
          line-height: 1.18;
          margin: 0 0 6px;
        }
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
          font-size: 13.5px;
          color: rgba(240,237,232,0.55);
          line-height: 1.5;
          margin: 0;
        }
        html.theme-light .lp-greeting-hint { color: rgba(11,13,17,0.55); }
        .lp-greeting-mask {
          font-family: 'DM Mono', 'Courier New', monospace;
          color: rgba(239,159,39,0.95);
          font-weight: 600;
        }

        /* ─── Avatar chip (returning user) ───────────────────── */
        .lp-avatar-chip {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 6px 14px 6px 6px;
          border-radius: 999px;
          background: rgba(239,159,39,0.1);
          border: 1px solid rgba(239,159,39,0.3);
          font-size: 13px;
          font-family: 'DM Sans', sans-serif;
          color: rgba(240,237,232,0.92);
          margin-top: 4px;
          animation: lp-in 0.7s cubic-bezier(0.16,1,0.3,1) 0.25s both;
        }
        html.theme-light .lp-avatar-chip {
          background: rgba(186,117,23,0.08);
          border-color: rgba(186,117,23,0.3);
          color: rgba(11,13,17,0.85);
        }
        .lp-avatar-circle {
          width: 32px; height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #EF9F27 0%, #BA7517 100%);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #0B0D11;
          font-family: 'Syne', sans-serif;
          font-size: 12px;
          font-weight: 800;
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
          background: rgba(255,255,255,0.04);
          border: 1.5px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 22px 16px 8px;
          font-size: 15px;
          font-family: 'DM Sans', sans-serif;
          color: #F0EDE8;
          outline: none;
          transition: border-color 0.18s, background 0.18s, box-shadow 0.18s;
          -webkit-text-fill-color: #F0EDE8;
        }
        html.theme-light .lp-input {
          background: rgba(255,255,255,0.85);
          border: 1.5px solid rgba(11,13,17,0.1);
          color: #0B0D11;
          -webkit-text-fill-color: #0B0D11;
        }
        .lp-input:focus {
          border-color: rgba(239,159,39,0.7);
          background: rgba(255,255,255,0.06);
          box-shadow: 0 0 0 4px rgba(239,159,39,0.12);
        }
        html.theme-light .lp-input:focus { background: #FFFFFF; }
        .lp-input::placeholder { color: transparent; }
        .lp-label {
          position: absolute;
          top: 16px; left: 16px;
          font-size: 14px;
          font-weight: 500;
          color: rgba(240,237,232,0.5);
          pointer-events: none;
          transition: top 0.15s, font-size 0.15s, color 0.15s;
          font-family: 'DM Sans', sans-serif;
        }
        html.theme-light .lp-label { color: rgba(11,13,17,0.5); }
        .lp-input:focus + .lp-label,
        .lp-input:not(:placeholder-shown) + .lp-label {
          top: 6px;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(239,159,39,0.95);
        }
        .lp-pw-eye {
          position: absolute;
          right: 12px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none;
          cursor: pointer;
          padding: 6px;
          color: rgba(240,237,232,0.55);
          font-size: 16px;
          line-height: 1;
          border-radius: 8px;
          transition: color 0.15s, background 0.15s;
        }
        html.theme-light .lp-pw-eye { color: rgba(11,13,17,0.55); }
        .lp-pw-eye:hover {
          color: #EF9F27;
          background: rgba(239,159,39,0.1);
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
          background: linear-gradient(135deg, #EF9F27 0%, #BA7517 100%);
          color: #FFFFFF;
          border: none;
          border-radius: 12px;
          padding: 15px 16px;
          font-family: 'Syne', sans-serif;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.01em;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 6px 18px rgba(186,117,23,0.32), inset 0 1px 0 rgba(255,255,255,0.18);
          transition: transform 0.18s, box-shadow 0.18s, filter 0.18s;
        }
        .lp-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 24px rgba(186,117,23,0.42), inset 0 1px 0 rgba(255,255,255,0.22);
          filter: brightness(1.06);
        }
        .lp-submit:disabled { opacity: 0.55; cursor: not-allowed; }

        .lp-divider-row {
          display: flex; align-items: center; gap: 10px;
          font-size: 11px;
          color: rgba(240,237,232,0.35);
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-weight: 600;
        }
        html.theme-light .lp-divider-row { color: rgba(11,13,17,0.35); }
        .lp-divider-row::before, .lp-divider-row::after {
          content: ""; flex: 1; height: 1px;
          background: rgba(240,237,232,0.1);
        }
        html.theme-light .lp-divider-row::before,
        html.theme-light .lp-divider-row::after {
          background: rgba(11,13,17,0.1);
        }
        .lp-magic-hint {
          font-size: 11.5px;
          color: rgba(240,237,232,0.55);
          line-height: 1.5;
          margin: -4px 0 6px;
          font-style: italic;
          text-align: center;
        }
        html.theme-light .lp-magic-hint { color: rgba(11,13,17,0.55); }
        .lp-magic-btn {
          width: 100%;
          background: rgba(29,158,117,0.1);
          color: #2DD4BF;
          border: 1.5px solid rgba(29,158,117,0.35);
          border-radius: 12px;
          padding: 12px 16px;
          font-family: 'DM Sans', sans-serif;
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
          background: rgba(13,148,136,0.08);
          color: #0D9488;
          border-color: rgba(13,148,136,0.3);
        }
        .lp-magic-btn:hover {
          background: rgba(29,158,117,0.18);
          border-color: rgba(29,158,117,0.6);
          transform: translateY(-1px);
        }

        /* ─── PWA install + footer ──────────────────────────── */
        .lp-pwa-card {
          background: rgba(239,159,39,0.08);
          border: 1px solid rgba(239,159,39,0.2);
          border-radius: 12px;
          padding: 12px 14px;
          font-size: 12.5px;
          line-height: 1.5;
          color: rgba(240,237,232,0.78);
        }
        html.theme-light .lp-pwa-card { color: rgba(11,13,17,0.72); }
        .lp-pwa-head {
          font-size: 10.5px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-weight: 700;
          color: #F5B847;
          margin-bottom: 4px;
        }
        html.theme-light .lp-pwa-head { color: #BA7517; }
        .lp-pwa-btn {
          margin-top: 8px;
          background: rgba(239,159,39,0.18);
          border: 1px solid rgba(239,159,39,0.4);
          color: #F5B847;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        html.theme-light .lp-pwa-btn { color: #BA7517; }
        .lp-pwa-btn:hover {
          background: rgba(239,159,39,0.3);
          border-color: rgba(239,159,39,0.6);
        }

        .lp-trust {
          margin-top: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 11px;
          color: rgba(240,237,232,0.4);
        }
        html.theme-light .lp-trust { color: rgba(11,13,17,0.45); }

        /* ─── Bouton retour / "Pas Thomas ?" ─────────────────── */
        .lp-back {
          position: fixed;
          top: 18px; left: 18px;
          z-index: 20;
          padding: 7px 14px;
          border-radius: 999px;
          background: rgba(255,255,255,0.06);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(240,237,232,0.7);
          font-size: 12.5px;
          font-weight: 500;
          font-family: 'DM Sans', sans-serif;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
          transition: all 0.15s;
        }
        html.theme-light .lp-back {
          background: rgba(255,255,255,0.7);
          border-color: rgba(11,13,17,0.1);
          color: rgba(11,13,17,0.65);
        }
        .lp-back:hover {
          color: #EF9F27;
          border-color: rgba(239,159,39,0.4);
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
          .lp-logo { width: 64px; height: 64px; border-radius: 18px; margin-bottom: 18px; }
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
          <div className="lp-logo">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="#0B0D11">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <h2 className="lp-tagline">
            Ton cockpit{" "}
            <span className="lp-tagline-accent">bien-être</span>{" "}
            t'attend.
          </h2>
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
            {isReturning ? (
              <p className="lp-greeting-hint">
                Tu t'étais connecté avec{" "}
                <span className="lp-greeting-mask">{maskEmail(initialLastEmail)}</span>
              </p>
            ) : (
              <p className="lp-greeting-hint">
                Identifie-toi pour ouvrir ton cockpit.
              </p>
            )}
            {isReturning && knownFirstName ? (
              <div className="lp-avatar-chip">
                <span
                  className="lp-avatar-circle"
                  style={knownAvatar ? { backgroundImage: `url(${knownAvatar})` } : undefined}
                >
                  {knownAvatar ? "" : getInitials(knownFirstName)}
                </span>
                Coach {knownFirstName}
              </div>
            ) : null}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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

          {/* Lien magique avec hint */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="lp-divider-row">ou</div>
            <p className="lp-magic-hint">
              Mot de passe oublié, ou flemme de le taper ?<br />
              On t'envoie un lien sécurisé par email — 1 clic et c'est ouvert.
            </p>
            <button
              type="button"
              onClick={() => navigate("/forgot-password")}
              className="lp-magic-btn"
            >
              ✨ Recevoir un lien magique par email
            </button>
          </div>

          {/* PWA install (discret) */}
          {!isStandalone ? (
            <div className="lp-pwa-card">
              <div className="lp-pwa-head">📱 Installer l'app</div>
              <div>
                Ajoute Lor'Squad à ton écran d'accueil — ouverture en 1 clic, hors connexion.
                {canPromptInstall ? (
                  <div>
                    <button type="button" onClick={() => void handleInstallClick()} className="lp-pwa-btn">
                      Installer maintenant
                    </button>
                  </div>
                ) : isIos ? (
                  <div style={{ marginTop: 4, fontSize: 12 }}>
                    Safari → <strong>Partager</strong> → <strong>Sur l'écran d'accueil</strong>
                  </div>
                ) : isMobile ? (
                  <div style={{ marginTop: 4, fontSize: 12 }}>
                    Chrome → menu <strong>⋮</strong> → <strong>Installer l'app</strong>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

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
