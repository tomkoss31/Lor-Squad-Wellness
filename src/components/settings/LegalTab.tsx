// LegalTab — Confidentialité & RGPD dans Paramètres (2026-04-30)
// Onglet accessible à tous les users (pas adminOnly), pour que distri,
// référents et admin puissent consulter mentions légales + politique
// confidentialité depuis l'app, sans encombrer le sidebar.

import { Link } from "react-router-dom";
import {
  APP_NAME_FULL,
  COMPANY_NAME,
  COMPANY_ADDRESS,
  COMPANY_DIRECTOR,
  COMPANY_EMAIL,
  HOSTING_PROVIDER,
  HOSTING_REGION,
} from "../../lib/branding";

export function LegalTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Hero info */}
      <div
        style={{
          padding: "18px 22px",
          background: "var(--ls-surface)",
          border: "0.5px solid color-mix(in srgb, var(--ls-teal) 25%, var(--ls-border))",
          borderLeft: "3px solid var(--ls-teal)",
          borderRadius: 16,
        }}
      >
        <div
          style={{
            fontSize: 10,
            letterSpacing: 1.6,
            textTransform: "uppercase",
            fontWeight: 700,
            color: "var(--ls-teal)",
            fontFamily: "DM Sans, sans-serif",
            marginBottom: 4,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span aria-hidden>🛡️</span> Tes données sont protégées
        </div>
        <h2
          style={{
            fontFamily: "Syne, serif",
            fontWeight: 800,
            fontSize: 19,
            color: "var(--ls-text)",
            margin: "0 0 8px 0",
            letterSpacing: "-0.01em",
          }}
        >
          Confidentialité & RGPD
        </h2>
        <p
          style={{
            fontSize: 13,
            color: "var(--ls-text-muted)",
            lineHeight: 1.6,
            margin: 0,
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          {APP_NAME_FULL} respecte le RGPD pour le traitement des données de santé. Hébergement européen, droits utilisateurs garantis, transparence totale.
        </p>
      </div>

      {/* Cards : Mentions légales + Politique confidentialité */}
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
        <LinkCard
          to="/legal/mentions"
          emoji="📋"
          title="Mentions légales"
          subtitle={`Éditeur, hébergeur, propriété intellectuelle`}
          color="var(--ls-gold)"
        />
        <LinkCard
          to="/legal/confidentialite"
          emoji="🔒"
          title="Politique de confidentialité"
          subtitle="Données collectées, finalités, droits, contact"
          color="var(--ls-purple)"
        />
      </div>

      {/* Info société */}
      <div
        style={{
          padding: "16px 18px",
          background: "var(--ls-surface)",
          border: "0.5px solid var(--ls-border)",
          borderRadius: 16,
        }}
      >
        <div
          style={{
            fontSize: 10,
            letterSpacing: 1.4,
            textTransform: "uppercase",
            fontWeight: 700,
            color: "var(--ls-text-muted)",
            fontFamily: "DM Sans, sans-serif",
            marginBottom: 12,
          }}
        >
          Société éditrice
        </div>
        <InfoRow label="Raison sociale" value={COMPANY_NAME} />
        <InfoRow label="Siège" value={COMPANY_ADDRESS} />
        <InfoRow label="Directeur publication" value={COMPANY_DIRECTOR} />
        <InfoRow
          label="Contact RGPD"
          value={
            <a
              href={`mailto:${COMPANY_EMAIL}`}
              style={{ color: "var(--ls-gold)", textDecoration: "none", fontWeight: 600 }}
            >
              {COMPANY_EMAIL}
            </a>
          }
        />
        <InfoRow label="Hébergement" value={`${HOSTING_PROVIDER} — ${HOSTING_REGION}`} last />
      </div>

      {/* Tes droits — résumé rapide */}
      <div
        style={{
          padding: "16px 18px",
          background: "color-mix(in srgb, var(--ls-gold) 6%, var(--ls-surface))",
          border: "0.5px solid color-mix(in srgb, var(--ls-gold) 25%, transparent)",
          borderLeft: "3px solid var(--ls-gold)",
          borderRadius: 16,
        }}
      >
        <div
          style={{
            fontSize: 10,
            letterSpacing: 1.4,
            textTransform: "uppercase",
            fontWeight: 700,
            color: "var(--ls-gold)",
            fontFamily: "DM Sans, sans-serif",
            marginBottom: 10,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span aria-hidden>⚖️</span> Tes droits RGPD
        </div>
        <ul
          style={{
            margin: 0,
            paddingLeft: 18,
            fontSize: 12.5,
            color: "var(--ls-text)",
            lineHeight: 1.7,
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          <li>
            <strong>Accès</strong> : obtenir une copie de tes données
          </li>
          <li>
            <strong>Rectification</strong> : corriger des données erronées
          </li>
          <li>
            <strong>Effacement</strong> : demander la suppression
          </li>
          <li>
            <strong>Portabilité</strong> : récupérer dans un format réutilisable
          </li>
          <li>
            <strong>Opposition / retrait</strong> : à tout moment, sans justification
          </li>
        </ul>
        <p
          style={{
            margin: "12px 0 0 0",
            fontSize: 11.5,
            color: "var(--ls-text-muted)",
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          Pour exercer ces droits, contacte{" "}
          <a
            href={`mailto:${COMPANY_EMAIL}`}
            style={{ color: "var(--ls-gold)", textDecoration: "none", fontWeight: 600 }}
          >
            {COMPANY_EMAIL}
          </a>
          .
        </p>
      </div>
    </div>
  );
}

function LinkCard({
  to,
  emoji,
  title,
  subtitle,
  color,
}: {
  to: string;
  emoji: string;
  title: string;
  subtitle: string;
  color: string;
}) {
  return (
    <Link
      to={to}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 16px",
        background: "var(--ls-surface)",
        border: "0.5px solid var(--ls-border)",
        borderLeft: `3px solid ${color}`,
        borderRadius: 14,
        textDecoration: "none",
        color: "inherit",
        transition: "transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = `0 6px 16px -8px color-mix(in srgb, ${color} 30%, transparent)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          flexShrink: 0,
          borderRadius: 12,
          background: `linear-gradient(135deg, color-mix(in srgb, ${color} 22%, var(--ls-surface2)) 0%, var(--ls-surface2) 100%)`,
          border: `0.5px solid color-mix(in srgb, ${color} 30%, transparent)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
        }}
      >
        {emoji}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "Syne, serif",
            fontWeight: 700,
            fontSize: 14.5,
            color: "var(--ls-text)",
            letterSpacing: "-0.01em",
            marginBottom: 2,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 11.5,
            color: "var(--ls-text-muted)",
            fontFamily: "DM Sans, sans-serif",
            lineHeight: 1.4,
          }}
        >
          {subtitle}
        </div>
      </div>
      <span aria-hidden style={{ fontSize: 16, color: color }}>
        →
      </span>
    </Link>
  );
}

function InfoRow({
  label,
  value,
  last,
}: {
  label: string;
  value: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "8px 0",
        borderBottom: last ? "none" : "0.5px dashed var(--ls-border)",
      }}
    >
      <div
        style={{
          fontSize: 11.5,
          color: "var(--ls-text-muted)",
          fontWeight: 600,
          minWidth: 130,
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        {label}
      </div>
      <div
        style={{
          flex: 1,
          fontSize: 12.5,
          color: "var(--ls-text)",
          fontFamily: "DM Sans, sans-serif",
          lineHeight: 1.5,
        }}
      >
        {value}
      </div>
    </div>
  );
}
