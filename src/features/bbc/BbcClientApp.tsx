// =============================================================================
// BbcClientApp — l'app membre BBC (chantier BBC). La CARTE DE MEMBRE est réelle
// (compteur de visites via edge client-app-data + QR du token à montrer au
// coach). Évolution / cœurs = branchement lots suivants.
// Réutilise l'identité lime/noir (tokens --ls-bbc-*).
// =============================================================================

import "../../styles/bbc-tokens.css";
import { QRCode } from "../../components/ui/QRCode";

interface BbcClientAppProps {
  clientName?: string;
  coachName?: string;
  programTitle?: string;
  token?: string;
  visitsCount?: number;
}

const CARD_MAX = 10;

export function BbcClientApp({ clientName, coachName, programTitle, token, visitsCount = 0 }: BbcClientAppProps) {
  const visits = Math.max(0, visitsCount);
  const shown = Math.min(visits, CARD_MAX);
  const left = Math.max(0, CARD_MAX - visits);

  return (
    <div
      className="bbc-mode"
      style={{
        minHeight: "100vh",
        background: "var(--ls-bbc-bg)",
        color: "var(--ls-bbc-text)",
        fontFamily: "var(--ls-bbc-font-body)",
        padding: "calc(22px + env(safe-area-inset-top)) 16px calc(60px + env(safe-area-inset-bottom))",
        maxWidth: 460,
        margin: "0 auto",
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

      {/* CARTE DE MEMBRE (réelle) */}
      <div style={{ position: "relative", background: "var(--ls-bbc-s2)", border: "1px solid rgba(197,248,42,.32)", borderRadius: 24, padding: "18px 18px 20px", overflow: "hidden", marginBottom: 14 }}>
        <div style={{ position: "absolute", top: -60, right: -40, width: 200, height: 200, background: "radial-gradient(circle, rgba(197,248,42,.15), transparent 65%)" }} />
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, fontWeight: 600, letterSpacing: "0.15em", color: "var(--ls-bbc-muted)", textTransform: "uppercase" }}>
              <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--ls-bbc-lime)", boxShadow: "0 0 8px var(--ls-bbc-lime)" }} />carte de membre
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--ls-bbc-lime-text)", border: "1px solid rgba(197,248,42,.4)", padding: "4px 10px", borderRadius: 999 }}>carte · {CARD_MAX} visites</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
            <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontWeight: 800, fontSize: 56, lineHeight: 0.8, color: "var(--ls-bbc-lime-text)" }}>{visits}</span>
            <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontWeight: 500, fontSize: 22, color: "var(--ls-bbc-muted)", paddingBottom: 6 }}>/ {CARD_MAX}</span>
            <span style={{ flex: 1, textAlign: "right", fontSize: 11, color: "var(--ls-bbc-muted)", paddingBottom: 8 }}>
              {left > 0 ? `plus que ${left} visite${left > 1 ? "s" : ""}` : "carte complète 🎉"}
            </span>
          </div>
          <div style={{ display: "flex", gap: 5, marginTop: 14 }}>
            {Array.from({ length: CARD_MAX }).map((_, i) => (
              <div key={i} style={{ flex: 1, height: 8, borderRadius: 3, background: i < shown ? "var(--ls-bbc-lime)" : "var(--ls-bbc-s1)" }} />
            ))}
          </div>

          {token ? (
            <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 18, background: "#FBF7F0", borderRadius: 16, padding: 14 }}>
              <QRCode value={token} size={86} fgColor="0B0D11" bgColor="FBF7F0" />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0B0D11" }}>montre ce code au coach</div>
                <div style={{ fontSize: 12, color: "#5b6472", marginTop: 3 }}>il scanne, ta visite du jour est validée.</div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <Card title="Ton évolution" sub="poids + courbe depuis le départ" lot="Lot suivant" />
      <Card title="Tes cœurs" sub="recommande un proche · paliers 2 · 3 · 5" lot="Lot suivant" />

      <div style={{ marginTop: 16, textAlign: "center", fontSize: 11, color: "var(--ls-bbc-hint)", lineHeight: 1.5 }}>
        {programTitle ? `${programTitle} · ` : ""}app membre BBC{coachName ? ` · coach ${coachName}` : ""}
      </div>
    </div>
  );
}

function Card({ title, sub, lot }: { title: string; sub: string; lot: string }) {
  return (
    <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 20, padding: "16px", marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700 }}>{title}</div>
        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--ls-bbc-hint)", fontFamily: "var(--ls-bbc-font-mono)" }}>{lot}</span>
      </div>
      <div style={{ fontSize: 12, color: "var(--ls-bbc-muted)", marginTop: 5 }}>{sub}</div>
    </div>
  );
}
