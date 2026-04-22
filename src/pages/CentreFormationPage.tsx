// Chantier Refonte Navigation (2026-04-22) — placeholder.
// Fusion future de GuidePage (rendez-vous) + FollowUpGuidePage (suivi client).
// Pour l'instant : 2 cards d'accès aux pages existantes.

import { Link } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { PageHeading } from "../components/ui/PageHeading";

export function CentreFormationPage() {
  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Formation"
        title="Centre de formation"
        description="Tes repères pour le rendez-vous et pour le suivi client, au même endroit."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          to="/guide"
          style={{
            display: "block",
            padding: 24,
            borderRadius: 18,
            background: "var(--ls-surface)",
            border: "1px solid var(--ls-border)",
            textDecoration: "none",
            color: "var(--ls-text)",
            transition: "all 0.15s",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "rgba(201,168,76,0.1)",
              color: "var(--ls-gold)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <p style={{ fontFamily: "Syne, sans-serif", fontSize: 18, fontWeight: 700, margin: 0, marginBottom: 6 }}>
            Guide rendez-vous
          </p>
          <p style={{ fontSize: 13, color: "var(--ls-text-muted)", lineHeight: 1.6, margin: 0 }}>
            Les repères simples pour conduire le premier bilan et les points de suivi.
          </p>
        </Link>

        <Link
          to="/guide-suivi"
          style={{
            display: "block",
            padding: 24,
            borderRadius: 18,
            background: "var(--ls-surface)",
            border: "1px solid var(--ls-border)",
            textDecoration: "none",
            color: "var(--ls-text)",
            transition: "all 0.15s",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "rgba(45,212,191,0.1)",
              color: "var(--ls-teal)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          </div>
          <p style={{ fontFamily: "Syne, sans-serif", fontSize: 18, fontWeight: 700, margin: 0, marginBottom: 6 }}>
            Guide suivi client
          </p>
          <p style={{ fontSize: 13, color: "var(--ls-text-muted)", lineHeight: 1.6, margin: 0 }}>
            Le protocole J+1 → J+10 : messages types, objectifs, ajustements par étape.
          </p>
        </Link>
      </div>

      <Card className="space-y-3">
        <p className="eyebrow-label">À venir</p>
        <p style={{ fontSize: 14, color: "var(--ls-text-muted)", lineHeight: 1.6 }}>
          La fusion complète des 2 guides en un parcours unique est prévue — accroche,
          diagnostic, solution, programme, suivi. D'ici là, utilise les deux guides
          ci-dessus selon le contexte.
        </p>
      </Card>
    </div>
  );
}
