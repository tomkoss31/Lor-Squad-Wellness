// =============================================================================
// SalleOpsPreview — page preview provisoire /salle-ops (recette du look).
//
// Bascule entre les écrans de la Salle des Opérations (Jour 0 / Quotidien).
// Provisoire : disparaîtra quand le switch de rendu sur /co-pilote (§3) sera
// branché sur users.activated_at.
// =============================================================================

import { useState } from "react";
import { SalleDesOperations } from "./SalleDesOperations";
import { SalleOpsQuotidien } from "./SalleOpsQuotidien";
import { useSalleOps } from "./useSalleOps";
import "./salle-ops.css";

type Screen = "jour0" | "quotidien" | "live";

const TABS: { key: Screen; label: string }[] = [
  { key: "jour0", label: "Jour 0 · S'équiper" },
  { key: "quotidien", label: "Quotidien (démo)" },
  { key: "live", label: "Live · mes données" },
];

export function SalleOpsPreview() {
  const [screen, setScreen] = useState<Screen>("jour0");
  const ops = useSalleOps();

  return (
    <div style={{ background: "var(--ls-ops-bg)", minHeight: "100vh" }}>
      <div style={switcherBar}>
        {TABS.map((t) => {
          const on = screen === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setScreen(t.key)}
              style={{
                ...switchBtn,
                background: on ? "var(--ls-ops-accent)" : "transparent",
                color: on ? "var(--ls-ops-on-accent)" : "var(--ls-ops-text3)",
                borderColor: on ? "var(--ls-ops-accent)" : "var(--ls-ops-border)",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      {screen === "jour0" && <SalleDesOperations />}
      {screen === "quotidien" && <SalleOpsQuotidien />}
      {screen === "live" && <SalleOpsQuotidien view={ops} />}
    </div>
  );
}

const switcherBar: React.CSSProperties = {
  display: "flex",
  gap: 8,
  justifyContent: "center",
  padding: "calc(12px + env(safe-area-inset-top)) 16px 4px",
  background: "var(--ls-ops-bg)",
};

const switchBtn: React.CSSProperties = {
  fontFamily: "var(--ls-ops-font-mono)",
  fontSize: 12,
  letterSpacing: ".04em",
  fontWeight: 500,
  padding: "8px 14px",
  borderRadius: 999,
  border: "1px solid",
  cursor: "pointer",
};
