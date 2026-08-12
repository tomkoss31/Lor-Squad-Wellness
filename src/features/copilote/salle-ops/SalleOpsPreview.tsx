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

// Vue de démonstration — calquée sur le cas RÉEL le plus fréquent (12/08/2026).
//
// Elle montrait un profil imaginaire : étapes 1 et 2 faites, on vise la story.
// Personne n'a jamais ressemblé à ça. Le vrai cas, c'est Maria — 41 bilans,
// aucune porte déclarative cochée, et l'app qui lui disait « Étape 1 :
// S'équiper ». Depuis le chantier du 12/08 elle vise son 1er pack, et les
// trois étapes déclaratives lui sont PROPOSÉES sans la retenir.
//
// La démo montre donc ce que les gens voient vraiment, pas une vitrine.
const DEMO_VIEW: SalleOpsView = {
  loading: false,
  activated: false,
  steps: [
    { n: 1, label: "S'équiper", state: "todo", lesson: ACADEMY_LESSONS.commande_250pv, gateKey: "commande_250pv", bloquante: false },
    { n: 2, label: "Trouver", state: "todo", lesson: ACADEMY_LESSONS.liste_50, gateKey: "liste_50", bloquante: false },
    { n: 3, label: "Inviter", state: "todo", lesson: ACADEMY_LESSONS.premiere_story, gateKey: "premiere_story", bloquante: false },
    { n: 4, label: "Présenter", state: "active", lesson: ACADEMY_LESSONS.premier_pv_pack, gateKey: "premier_pv_pack", bloquante: true },
    { n: 5, label: "Relancer", state: "todo", lesson: ACADEMY_LESSONS.relancer, gateKey: "relances_3", bloquante: true },
    { n: 6, label: "Démarrer ta recrue", state: "todo", lesson: ACADEMY_LESSONS.demarrer_recrue, gateKey: null, bloquante: false },
    { n: 7, label: "Dupliquer", state: "todo", lesson: ACADEMY_LESSONS.dupliquer, gateKey: null, bloquante: false },
  ],
  totalSteps: 7,
  activeStepNumber: 4,
  currentLesson: ACADEMY_LESSONS.premier_pv_pack,
  currentGateKey: "premier_pv_pack",
  phase: "acceleration",
  phaseIndex: 1,
  dayNumber: 84,
  jalonPlanMarketing: false,
  toggle: async () => {},
  counts: {},
  bump: async () => {},
};

type Screen = "jour0" | "quotidien" | "live";

const TABS: { key: Screen; label: string }[] = [
  { key: "jour0", label: "Jour 0 · S'équiper" },
  { key: "quotidien", label: "Quotidien (démo)" },
  { key: "live", label: "Live · mes données" },
];

export function SalleOpsPreview() {
  const [screen, setScreen] = useState<Screen>("live");
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
      {screen === "quotidien" && <SalleOpsQuotidien
              view={DEMO_VIEW}
              /* Un admin n'a pas de parrain : sans ce parrain de
                 démonstration, le bloc resterait invisible à Thomas. */
              demoParrain={{ nom: "Victoria Cavalec", telephone: "0676298049" }}
            />}
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
