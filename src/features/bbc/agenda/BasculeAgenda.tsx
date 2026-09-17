// =============================================================================
// « Agenda du club | Mon agenda » — l'interrupteur de la page Agenda standard.
//
// Fichier À PART, et léger, exprès : la page Agenda l'importe pour tout le
// monde, alors que l'agenda du club lui-même (`AgendaDuClubStandard`) se charge
// à la demande — une coach sans club ne télécharge pas un écran qu'elle ne
// verra jamais.
// =============================================================================

import type { CSSProperties } from "react";

export type ModeAgenda = "club" | "perso";
const CLE = "ls-agenda-mode";

/** Le dernier choix de la coach. Par défaut le club : c'est lui qui remplace TimeTree. */
export function lireModeAgenda(): ModeAgenda {
  try {
    return localStorage.getItem(CLE) === "perso" ? "perso" : "club";
  } catch {
    return "club";
  }
}

export function ecrireModeAgenda(m: ModeAgenda): void {
  try {
    localStorage.setItem(CLE, m);
  } catch {
    /* navigation privée : le choix ne tient que pour la visite */
  }
}

/** Aux couleurs de l'app standard (`--ls-*`), pas de BBC : il vit dans SA page. */
export function BasculeAgenda({ mode, onChange }: { mode: ModeAgenda; onChange: (m: ModeAgenda) => void }) {
  return (
    <div role="tablist" aria-label="Quel agenda" style={rail}>
      {(["club", "perso"] as ModeAgenda[]).map((m) => {
        const on = mode === m;
        return (
          <button key={m} type="button" role="tab" aria-selected={on} onClick={() => onChange(m)} style={{ ...cran, background: on ? "var(--ls-surface)" : "transparent", color: on ? "var(--ls-text)" : "var(--ls-text-muted)", boxShadow: on ? "0 1px 4px rgba(0,0,0,.12)" : "none" }}>
            {m === "club" ? "👥 Agenda du club" : "Mon agenda"}
          </button>
        );
      })}
    </div>
  );
}

const rail: CSSProperties = {
  display: "flex", gap: 4, padding: 4, borderRadius: 14, background: "var(--ls-surface2)", border: "1px solid var(--ls-border)",
};
const cran: CSSProperties = {
  flex: 1, minHeight: 44, padding: "0 12px", borderRadius: 11, border: 0, fontFamily: "inherit", fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
};
