// =============================================================================
// ClientRelanceButton — « Me rappeler de relancer » sur la fiche client.
// Ajoute le client à la liste privée coach_reminders (in-app). N'envoie RIEN
// au client (≠ planifier un RDV, qui lui déclenche l'email de confirmation).
//
// V2 (2026-07-03) : on peut fixer une DATE + HEURE de rappel. Le jour J, le
// COACH reçoit un push (edge coach-reminder-notifier) + le rappel remonte sur
// le Co-pilote. Le client, lui, ne reçoit jamais rien.
// =============================================================================

import { useState } from "react";
import type { Client } from "../../types/domain";
import { useCoachReminders } from "../../hooks/useCoachReminders";

function defaultRemind(): string {
  // Défaut : demain 10h (local), format datetime-local "YYYY-MM-DDTHH:mm".
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ClientRelanceButton({ client }: { client: Client }) {
  const { add } = useCoachReminders(false);
  const [state, setState] = useState<"idle" | "form" | "saving" | "done">("idle");
  const [when, setWhen] = useState(defaultRemind());
  const [note, setNote] = useState("");

  async function save() {
    if (state === "saving") return;
    setState("saving");
    const ok = await add({
      clientId: client.id,
      label: `${client.firstName} ${client.lastName ?? ""}`.trim(),
      note: note.trim() || null,
      // datetime-local (heure locale) → ISO UTC avec offset (règle timestamptz).
      remindAt: when ? new Date(when).toISOString() : null,
    });
    setState(ok ? "done" : "form");
  }

  if (state === "done") {
    return (
      <div style={doneBox}>
        ✓ Ajouté à « À relancer » {when ? `· ${new Date(when).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}
      </div>
    );
  }

  if (state === "idle") {
    return (
      <button type="button" onClick={() => setState("form")} style={btnStyle(false)}>
        🔔 Me rappeler de le relancer
      </button>
    );
  }

  // Formulaire date + heure + note.
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, borderRadius: 12, border: "0.5px solid var(--ls-teal)", background: "color-mix(in srgb, var(--ls-teal) 6%, var(--ls-surface))" }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, letterSpacing: "0.13em", textTransform: "uppercase", color: "var(--ls-teal)", fontWeight: 600 }}>
        🔔 Me rappeler de relancer — quand ?
      </div>
      <input
        type="datetime-local"
        value={when}
        onChange={(e) => setWhen(e.target.value)}
        style={inputStyle}
      />
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optionnel) : pourquoi le relancer…"
        style={inputStyle}
      />
      <div style={{ fontSize: 11, color: "var(--ls-text-hint)", lineHeight: 1.4 }}>
        Le jour J tu reçois une notif (Co-pilote + push app). Le client ne reçoit rien.
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={() => setState("idle")} style={{ ...btnStyle(false), width: "auto", flex: "0 0 auto", padding: "9px 14px" }}>
          Annuler
        </button>
        <button type="button" onClick={() => void save()} disabled={state === "saving"} style={{ ...btnStyle(true), flex: 1 }}>
          {state === "saving" ? "…" : "Ajouter le rappel"}
        </button>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 11px",
  borderRadius: 10,
  border: "1px solid var(--ls-border)",
  background: "var(--ls-surface2)",
  color: "var(--ls-text)",
  fontSize: 13.5,
  fontFamily: "DM Sans, sans-serif",
  outline: "none",
  boxSizing: "border-box",
};

const doneBox: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  background: "color-mix(in srgb, var(--ls-teal) 12%, var(--ls-surface))",
  border: "0.5px solid var(--ls-teal)",
  borderRadius: 10,
  color: "var(--ls-teal)",
  fontSize: 13,
  fontWeight: 700,
  fontFamily: "DM Sans, sans-serif",
  textAlign: "center",
};

function btnStyle(primary: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: "10px 14px",
    background: primary ? "var(--ls-teal)" : "var(--ls-surface)",
    border: `0.5px solid ${primary ? "var(--ls-teal)" : "var(--ls-border)"}`,
    borderRadius: 10,
    color: primary ? "var(--ls-bg)" : "var(--ls-text)",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "DM Sans, sans-serif",
  };
}
