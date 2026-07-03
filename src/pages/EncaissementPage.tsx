// =============================================================================
// EncaissementPage — « 💳 Encaissement » (hub Mon business, 2026-06-15).
//
// Chaque distri encaisse ses clients avec SON PROPRE compte Stripe : il le crée
// lui-même, l'argent va directement chez lui, jamais sur un compte plateforme.
// Pas de Stripe Connect, pas de commission, pas d'intermédiaire (décision
// Thomas 2026-06-15). À la fin du bilan, le bouton « Je démarre » de la page
// Résultat envoie le prospect à la caisse Stripe du distri.
//
// La config vit dans coach_payment_settings (RLS own-row) via PaymentSettingsCard.
// =============================================================================

import { useNavigate } from "react-router-dom";
import { PaymentSettingsCard } from "../components/settings/PaymentSettingsCard";
import { ManualPaymentLinkCard } from "../components/settings/ManualPaymentLinkCard";

const STEPS = [
  {
    emoji: "🧾",
    title: "Tu configures ton compte (une fois)",
    desc: "Tu crées ton compte Stripe — gratuit, à ton nom — et tu colles ta clé dans l'app. 5 minutes, une seule fois.",
  },
  {
    emoji: "✅",
    title: "Le client paie à la fin du bilan",
    desc: "Sur sa page Résultat, le bouton « Je démarre » ouvre une caisse sécurisée avec le prix de son programme.",
  },
  {
    emoji: "💶",
    title: "L'argent arrive direct chez toi",
    desc: "Le paiement va sur TON compte Stripe. Tu reçois une notif « Paiement reçu » et tu le retrouves dans ton CRM.",
  },
];

export function EncaissementPage() {
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "8px 4px 60px" }}>
      <button
        type="button"
        onClick={() => navigate("/outils")}
        style={{
          background: "none",
          border: "none",
          color: "var(--ls-text-muted)",
          fontSize: 13,
          cursor: "pointer",
          padding: 0,
          marginBottom: 14,
        }}
      >
        ← Mon business
      </button>

      {/* Hero */}
      <div style={{ fontFamily: "Syne, sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", color: "var(--ls-teal)" }}>
        Vente
      </div>
      <h1 style={{ fontFamily: "Anton, sans-serif", fontWeight: 400, textTransform: "uppercase", fontSize: "clamp(26px,5vw,32px)", letterSpacing: "-0.5px", margin: "8px 0 4px", color: "var(--ls-text)" }}>
        💳 Encaissement
      </h1>
      <p style={{ color: "var(--ls-text-muted)", fontSize: 14, marginBottom: 22, fontFamily: "DM Sans, sans-serif", maxWidth: 560 }}>
        Encaisse tes clients en carte bancaire, directement à la fin du bilan.
        L&apos;argent va sur <strong style={{ color: "var(--ls-text)" }}>ton compte</strong> — c&apos;est toi
        qui gères, on ne prend rien au passage.
      </p>

      {/* Comment ça marche */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12, marginBottom: 26 }}>
        {STEPS.map((s, i) => (
          <div
            key={i}
            style={{
              background: "var(--ls-surface)",
              border: "0.5px solid var(--ls-border)",
              borderRadius: 15,
              padding: 16,
            }}
          >
            <div style={{ fontSize: 24 }}>{s.emoji}</div>
            <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 14, color: "var(--ls-text)", marginTop: 8 }}>
              {s.title}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--ls-text-muted)", marginTop: 5, lineHeight: 1.45 }}>
              {s.desc}
            </div>
          </div>
        ))}
      </div>

      {/* Config (carte autonome) */}
      <PaymentSettingsCard />

      {/* Génération de lien manuel (montant libre, hors bilan) */}
      <ManualPaymentLinkCard />

      <div style={{ fontSize: 12, color: "var(--ls-text-muted)", marginTop: 18, lineHeight: 1.5, maxWidth: 560 }}>
        💡 Stripe est gratuit à l&apos;ouverture : tu ne payes qu&apos;une petite commission Stripe par
        paiement encaissé (≈ 1,5 % + 0,25 € en Europe), prélevée par Stripe — pas par nous. Tu peux
        désactiver l&apos;encaissement à tout moment : la page Résultat repassera au message « ton coach
        t&apos;envoie le lien ».
      </div>
    </div>
  );
}
