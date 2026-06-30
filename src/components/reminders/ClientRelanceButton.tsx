// =============================================================================
// ClientRelanceButton — « Me rappeler de relancer » sur la fiche client.
// Ajoute le client à la liste privée coach_reminders (in-app). N'envoie RIEN
// au client (≠ planifier un RDV, qui lui déclenche l'email de confirmation).
// =============================================================================

import { useState } from "react";
import type { Client } from "../../types/domain";
import { useCoachReminders } from "../../hooks/useCoachReminders";

export function ClientRelanceButton({ client }: { client: Client }) {
  const { add } = useCoachReminders(false); // add seulement, pas de fetch de liste
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");

  async function handle() {
    if (state !== "idle") return;
    setState("saving");
    const ok = await add({
      clientId: client.id,
      label: `${client.firstName} ${client.lastName ?? ""}`.trim(),
    });
    setState(ok ? "done" : "idle");
  }

  return (
    <button type="button" onClick={() => void handle()} style={btnStyle(state)} disabled={state !== "idle"}>
      {state === "done" ? "✓ Ajouté à « À relancer »" : "🔔 Me rappeler de le relancer"}
    </button>
  );
}

function btnStyle(state: "idle" | "saving" | "done"): React.CSSProperties {
  const done = state === "done";
  return {
    width: "100%",
    padding: "10px 14px",
    background: done
      ? "color-mix(in srgb, var(--ls-teal) 12%, var(--ls-surface))"
      : "var(--ls-surface)",
    border: `0.5px solid ${done ? "var(--ls-teal)" : "var(--ls-border)"}`,
    borderRadius: 10,
    color: done ? "var(--ls-teal)" : "var(--ls-text)",
    fontSize: 13,
    fontWeight: 700,
    cursor: state === "idle" ? "pointer" : "default",
    fontFamily: "DM Sans, sans-serif",
  };
}
