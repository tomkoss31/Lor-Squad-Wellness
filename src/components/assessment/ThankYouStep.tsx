// Chantier Page remerciement post-bilan (2026-04-27).
// Composant réutilisable affiché plein écran sur la route
// /clients/:clientId/bilan-termine après "Enregistrer et terminer le bilan".
//
// Objectif commercial :
// - Célébrer le client (apogée du RDV)
// - QR code → il installe l'app immédiatement sur son téléphone
// - Partage WhatsApp / SMS / Telegram → effet viral
// - Parrainage → bouche à oreille
// - Avis Google → visibilité
//
// Respect du thème actif (clair/sombre) via var(--ls-*). Le QR reste sur
// fond blanc dans les 2 modes pour garantir scannabilité maximale. En
// mode sombre, un glow gold subtil entoure la card QR (effet wow premium).

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import "./ThankYouStep.css";

// TODO Thomas : remplacer par lien officiel Google Reviews La Base Verdun
const GOOGLE_REVIEW_URL = "https://g.page/r/REMPLACE_MOI/review";

interface Props {
  clientFirstName: string;
  appUrl: string; // URL complète /client/<token>
  coachName: string;
  onBack: () => void;
}

export function ThankYouStep({ clientFirstName, appUrl, coachName, onBack }: Props) {
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const shareMessage = `Salut ! Je viens de faire mon bilan Lor'Squad, super expérience. Si tu veux tester : ${appUrl}`;
  const referralMessage = `Hello ! Je t'invite à faire ton bilan Lor'Squad avec ${coachName} — on gagne tous les 2 une séance bilan gratuite si tu t'inscris via mon lien : ${appUrl}`;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopyFeedback("Lien copié !");
      window.setTimeout(() => setCopyFeedback(null), 2000);
    } catch {
      setCopyFeedback("Impossible de copier");
      window.setTimeout(() => setCopyFeedback(null), 2000);
    }
  };

  const handleShareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`, "_blank", "noopener,noreferrer");
  };

  const handleShareSMS = () => {
    // Ouvre l'app Messages natif iOS/Android via protocole sms:
    window.location.href = `sms:?body=${encodeURIComponent(shareMessage)}`;
  };

  const handleShareTelegram = () => {
    const url = encodeURIComponent(appUrl);
    const text = encodeURIComponent("Mon bilan Lor'Squad, ça vaut le coup !");
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, "_blank", "noopener,noreferrer");
  };

  const handleReferral = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(referralMessage)}`, "_blank", "noopener,noreferrer");
  };

  const handleGoogleReview = () => {
    window.open(GOOGLE_REVIEW_URL, "_blank", "noopener,noreferrer");
  };

  const truncatedUrl = (() => {
    try {
      const u = new URL(appUrl);
      const pathTail = u.pathname.split("/").filter(Boolean).pop() ?? "";
      const short = pathTail.length > 6 ? pathTail.slice(0, 6) + "…" : pathTail;
      return `${u.host}/client/${short}`;
    } catch {
      return appUrl.slice(0, 36) + "…";
    }
  })();

  return (
    <div className="thank-you-root">
      <div className="thank-you-container">
        {/* S1 — Header héro */}
        <header className="thank-you-header">
          <div className="thank-you-logo" aria-hidden="true">
            <span>⭐</span>
          </div>
          <h1 className="thank-you-title">
            Félicitations, {clientFirstName} ! 🎉
          </h1>
          <p className="thank-you-subtitle">Ta transformation commence maintenant</p>
          <div className="thank-you-divider" aria-hidden="true" />
        </header>

        {/* S2 — QR code */}
        <section className="thank-you-qr-section">
          <div className="thank-you-qr-card">
            <div className="thank-you-qr-svg-wrap">
              <QRCodeSVG
                value={appUrl}
                size={240}
                level="M"
                fgColor="#000000"
                bgColor="#FFFFFF"
                includeMargin={false}
              />
            </div>
            <p className="thank-you-qr-label">
              <span aria-hidden="true">📱</span> Scanne pour accéder à ton app
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleCopyUrl()}
            className="thank-you-url-button"
            title="Copier le lien dans le presse-papiers"
          >
            <span aria-hidden="true">🔗</span> {copyFeedback ?? truncatedUrl}
          </button>
        </section>

        {/* S3 — Partage multi-canal */}
        <section className="thank-you-section">
          <h2 className="thank-you-section-title">Partage avec tes proches</h2>
          <div className="thank-you-share-grid">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="thank-you-share-btn"
              aria-label="Partager sur WhatsApp"
            >
              <WhatsAppLogo />
              <span className="thank-you-share-btn-label">WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={handleShareSMS}
              className="thank-you-share-btn"
              aria-label="Partager par SMS"
            >
              <SMSIcon />
              <span className="thank-you-share-btn-label">SMS</span>
            </button>
            <button
              type="button"
              onClick={handleShareTelegram}
              className="thank-you-share-btn"
              aria-label="Partager sur Telegram"
            >
              <TelegramLogo />
              <span className="thank-you-share-btn-label">Telegram</span>
            </button>
          </div>
        </section>

        {/* S4 — Parrainage */}
        <section className="thank-you-section">
          <h2 className="thank-you-section-title">Invite un·e ami·e</h2>
          <div className="thank-you-referral">
            <h3 className="thank-you-referral-title">
              Parraine un proche et gagnez tous les 2 une séance bilan gratuite
            </h3>
            <p className="thank-you-referral-subtitle">
              Simple, rapide, et ça fait plaisir à tout le monde
            </p>
            <button
              type="button"
              onClick={handleReferral}
              className="thank-you-referral-cta"
            >
              Recommander Lor&apos;Squad à un ami →
            </button>
          </div>
        </section>

        {/* S5 — Avis Google */}
        <section className="thank-you-section">
          <h2 className="thank-you-section-title">Laisse un avis</h2>
          <button
            type="button"
            onClick={handleGoogleReview}
            className="thank-you-google-btn"
            title="Ouvrir Google Reviews"
          >
            <span className="thank-you-google-btn-stars" aria-hidden="true">
              ★★★★★
            </span>
            <span>Donner mon avis sur Google</span>
          </button>
        </section>

        {/* S6 — Retour discret */}
        <div className="thank-you-back">
          <button type="button" onClick={onBack}>
            Retour à la fiche client
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Icônes SVG inline (pas de lib externe pour rester léger)
// ═══════════════════════════════════════════════════════════════════════

function WhatsAppLogo() {
  return (
    <svg width={32} height={32} viewBox="0 0 24 24" fill="#25D366">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.693.625.712.226 1.36.194 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.304-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

function SMSIcon() {
  return (
    <svg
      width={32}
      height={32}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function TelegramLogo() {
  // Logo Telegram officiel (path en #229ED9)
  return (
    <svg width={32} height={32} viewBox="0 0 24 24" fill="#229ED9">
      <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
    </svg>
  );
}
