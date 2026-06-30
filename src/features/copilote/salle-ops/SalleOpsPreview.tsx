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
import { useSalleOps, type SalleOpsView } from "./useSalleOps";
import { ACADEMY_LESSONS } from "./academyLessons";
import "./salle-ops.css";

// Vue synthétique pour l'onglet démo (référence design, sans données réelles).
const DEMO_VIEW: SalleOpsView = {
  loading: false,
  activated: false,
  steps: [
    { n: 1, label: "S'équiper", state: "done", lesson: ACADEMY_LESSONS.commande_250pv, gateKey: "commande_250pv" },
    { n: 2, label: "Trouver", state: "done", lesson: ACADEMY_LESSONS.liste_50, gateKey: "liste_50" },
    { n: 3, label: "Inviter", state: "active", lesson: ACADEMY_LESSONS.premiere_story, gateKey: "premiere_story" },
    { n: 4, label: "Présenter", state: "todo", lesson: ACADEMY_LESSONS.premier_bilan, gateKey: "premier_bilan" },
    { n: 5, label: "Relancer", state: "todo", lesson: ACADEMY_LESSONS.relancer, gateKey: null },
    { n: 6, label: "Démarrer ta recrue", state: "locked", lesson: null, gateKey: null },
    { n: 7, label: "Dupliquer", state: "locked", lesson: null, gateKey: null },
  ],
  totalSteps: 7,
  activeStepNumber: 3,
  currentLesson: ACADEMY_LESSONS.premiere_story,
  currentGateKey: "premiere_story",
  phase: "allumage",
  phaseIndex: 0,
  dayNumber: 2,
  toggle: async () => {},
};

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
      {screen === "quotidien" && <SalleOpsQuotidien view={DEMO_VIEW} />}
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
