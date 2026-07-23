// =============================================================================
// BbcCoPilotePage — coquille du Co-pilote BBC (chantier BBC Lot 1, 2026-07-24).
//
// C'est l'ENVIRONNEMENT DÉDIÉ que voit un coach BBC à l'ouverture. Lot 1 =
// la charpente + les 4 blocs en placeholders « à venir ». La logique
// (compteur cobayes, pointage, cœurs, appels) arrive aux lots suivants.
// =============================================================================

import "../../styles/bbc-tokens.css";
import type { Club } from "../../types/domain";

interface BbcCoPilotePageProps {
  club: Club | null;
  coachName?: string;
}

export function BbcCoPilotePage({ club, coachName }: BbcCoPilotePageProps) {
  const first = (coachName ?? "").split(/\s+/)[0] || "";
  const clubName = club?.name ?? "Mon club";
  const clubCity = club?.city ?? "";

  return (
    <div
      className="bbc-mode"
      style={{
        minHeight: "100%",
        background: "var(--ls-bbc-bg)",
        color: "var(--ls-bbc-text)",
        fontFamily: "var(--ls-bbc-font-body)",
        padding: "18px 16px calc(40px + env(safe-area-inset-bottom))",
        maxWidth: 640,
        margin: "0 auto",
      }}
    >
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 26, color: "var(--ls-bbc-lime)", lineHeight: 1 }}>
            BBC
          </span>
          <span style={{ fontSize: 10.5, color: "var(--ls-bbc-hint)", letterSpacing: "0.13em", textTransform: "uppercase" }}>
            le club ouvre
          </span>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "var(--ls-bbc-teal)",
            background: "rgba(45, 212, 191, 0.12)",
            border: "1px solid rgba(45, 212, 191, 0.3)",
            padding: "5px 10px",
            borderRadius: 999,
          }}
        >
          mode coach
        </span>
      </header>

      <div style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 24, lineHeight: 1.05 }}>
        Bon matin{first ? `, ${first}` : ""}
      </div>
      <div style={{ fontSize: 12.5, color: "var(--ls-bbc-muted)", marginBottom: 18 }}>
        {clubName}
        {clubCity ? ` · ${clubCity}` : ""} · 7h–11h
      </div>

      <Row icon="📚" title="Formation BBC" sub="reprendre le chapitre" lot="Lot 5" />

      {/* Hero cobayes — placeholder */}
      <div
        style={{
          background: "var(--ls-bbc-s1)",
          border: "1px solid var(--ls-bbc-line)",
          borderRadius: 22,
          padding: "22px 18px",
          textAlign: "center",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontFamily: "var(--ls-bbc-font-mono)",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.16em",
            color: "var(--ls-bbc-muted)",
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          cobayes du jour
        </div>
        <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontWeight: 800, fontSize: 64, color: "var(--ls-bbc-lime-text)", lineHeight: 0.9 }}>
          —<span style={{ fontSize: 24, color: "var(--ls-bbc-muted)" }}> / 20</span>
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: "var(--ls-bbc-hint)" }}>
          compteur + envoi de cobaye · <b style={{ color: "var(--ls-bbc-lime-text)" }}>Lot 2</b>
        </div>
      </div>

      <Row icon="☕" title="Le club ce matin" sub="pointage des visites + alerte bilan des 10" lot="Lot 3" />
      <Row icon="❤️" title="À un cœur du palier" sub="qui relancer aujourd'hui" lot="Lot 2" />
      <Row icon="📞" title="Prochain appel" sub="inscrits + rappels" lot="Lot 4" />

      <div style={{ marginTop: 18, textAlign: "center", fontSize: 11, color: "var(--ls-bbc-hint)", lineHeight: 1.5 }}>
        Environnement BBC — coquille du Lot 1.
        <br />
        Chaque bloc se remplira aux lots suivants.
      </div>
    </div>
  );
}

function Row({ icon, title, sub, lot }: { icon: string; title: string; sub: string; lot: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: "var(--ls-bbc-s1)",
        border: "1px solid var(--ls-bbc-line)",
        borderRadius: 16,
        padding: "13px 14px",
        marginBottom: 14,
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 20 }}>
        {icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 11.5, color: "var(--ls-bbc-muted)" }}>{sub}</div>
      </div>
      <span
        style={{
          fontSize: 10,
          fontWeight: 800,
          color: "var(--ls-bbc-lime-ink)",
          background: "var(--ls-bbc-lime)",
          padding: "3px 8px",
          borderRadius: 999,
          whiteSpace: "nowrap",
        }}
      >
        {lot}
      </span>
    </div>
  );
}
