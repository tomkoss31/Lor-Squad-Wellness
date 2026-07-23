// =============================================================================
// BbcClientApp — coquille de l'app membre BBC (chantier BBC Lot 1, 2026-07-24).
//
// Ce que voit un client "EBE BBC" à la place de la PWA standard. Lot 1 = la
// charpente + placeholders. Carte de visites, évolution, cœurs = lots suivants.
// Réutilise l'identité lime/noir déjà en place (pwa2.css → tokens --ls-bbc-*).
// =============================================================================

import "../../styles/bbc-tokens.css";

interface BbcClientAppProps {
  clientName?: string;
  coachName?: string;
  programTitle?: string;
}

export function BbcClientApp({ clientName, coachName, programTitle }: BbcClientAppProps) {
  return (
    <div
      className="bbc-mode"
      style={{
        minHeight: "100vh",
        background: "var(--ls-bbc-bg)",
        color: "var(--ls-bbc-text)",
        fontFamily: "var(--ls-bbc-font-body)",
        padding: "calc(22px + env(safe-area-inset-top)) 16px calc(60px + env(safe-area-inset-bottom))",
      }}
    >
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--ls-bbc-muted)" }}>
            salut {clientName || "toi"} <span aria-hidden="true">👋</span>
          </div>
          <div style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 22, lineHeight: 1.05 }}>ton club du matin</div>
        </div>
        <span style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 16, color: "var(--ls-bbc-lime-text)" }}>BBC</span>
      </header>

      <Card title="Ta carte de membre" sub="visites + QR à scanner par ton coach" lot="Lot 3" highlight />
      <Card title="Ton évolution" sub="poids + courbe depuis le départ" lot="Lot 3" />
      <Card title="Tes cœurs" sub="recommande un proche · paliers 2 · 3 · 5" lot="Lot 2" />

      <div style={{ marginTop: 16, textAlign: "center", fontSize: 11, color: "var(--ls-bbc-hint)", lineHeight: 1.5 }}>
        {programTitle ? `${programTitle} · ` : ""}app membre BBC — coquille du Lot 1
        {coachName ? ` · coach ${coachName}` : ""}
      </div>
    </div>
  );
}

function Card({ title, sub, lot, highlight }: { title: string; sub: string; lot: string; highlight?: boolean }) {
  return (
    <div
      style={{
        background: "var(--ls-bbc-s1)",
        border: `1px solid ${highlight ? "rgba(197, 248, 42, 0.32)" : "var(--ls-bbc-line)"}`,
        borderRadius: 20,
        padding: highlight ? "20px 18px" : "16px",
        marginBottom: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontSize: highlight ? 15 : 13.5, fontWeight: 700 }}>{title}</div>
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
      <div style={{ fontSize: 12, color: "var(--ls-bbc-muted)", marginTop: 5 }}>{sub}</div>
    </div>
  );
}
