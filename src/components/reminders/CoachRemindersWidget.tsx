// =============================================================================
// CoachRemindersWidget — « À relancer » sur le Co-pilote (2026-06-30).
//
// Liste privée in-app : qui je dois recontacter. AUCUN email/push (table
// coach_reminders, hors circuit follow_ups). Se masque s'il n'y a rien.
// =============================================================================

import { useMemo, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { useCoachReminders, type CoachReminder } from "../../hooks/useCoachReminders";

export function CoachRemindersWidget() {
  const { clients } = useAppContext();
  const { reminders, loading, add, markDone, remove } = useCoachReminders(true);
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [note, setNote] = useState("");
  const [remindOn, setRemindOn] = useState("");
  const [saving, setSaving] = useState(false);

  const clientById = useMemo(() => {
    const m = new Map<string, { name: string; phone: string }>();
    for (const c of clients ?? []) {
      m.set(c.id, { name: `${c.firstName} ${c.lastName ?? ""}`.trim(), phone: c.phone ?? "" });
    }
    return m;
  }, [clients]);

  function nameOf(r: CoachReminder): string {
    if (r.client_id && clientById.has(r.client_id)) return clientById.get(r.client_id)!.name;
    return r.label || "Contact";
  }
  function phoneOf(r: CoachReminder): string {
    if (r.client_id && clientById.has(r.client_id)) return clientById.get(r.client_id)!.phone;
    return "";
  }

  async function submitAdd() {
    if (!label.trim() && !note.trim()) return;
    setSaving(true);
    const ok = await add({ label, note, remindAt: remindOn ? new Date(remindOn).toISOString() : null });
    setSaving(false);
    if (ok) {
      setLabel("");
      setNote("");
      setRemindOn("");
      setAdding(false);
    }
  }

  // Masqué si rien à relancer ET pas en train d'ajouter (zéro bruit).
  if (loading) return null;
  if (reminders.length === 0 && !adding) {
    return (
      <button type="button" onClick={() => setAdding(true)} style={emptyAddStyle}>
        📇 + Ajouter quelqu'un à relancer
      </button>
    );
  }

  return (
    <section style={cardStyle}>
      <div style={headerRow}>
        <h2 style={titleStyle}>📇 À relancer</h2>
        <span style={countPill}>{reminders.length}</span>
      </div>
      <p style={subStyle}>Rappel privé — le contact ne reçoit rien (ni email, ni notif).</p>

      <div style={listStyle}>
        {reminders.map((r) => {
          const dueDate = r.remind_at ?? (r.remind_on ? `${r.remind_on}T09:00:00` : null);
          const due = dueDate != null && new Date(dueDate) <= new Date();
          const phone = phoneOf(r);
          return (
            <div key={r.id} style={rowStyle}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={rowTop}>
                  <span style={nameStyle}>{nameOf(r)}</span>
                  {dueDate ? (
                    <span style={due ? dueBadge : dateBadge}>
                      {due
                        ? "à relancer"
                        : new Date(dueDate).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  ) : null}
                </div>
                {r.note ? <div style={noteStyle}>{r.note}</div> : null}
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                {phone ? (
                  <a
                    href={`https://wa.me/${phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    style={writeBtn}
                  >
                    Écrire
                  </a>
                ) : null}
                <button type="button" onClick={() => void markDone(r.id)} style={doneBtn} title="Marquer fait">
                  ✓
                </button>
                <button type="button" onClick={() => void remove(r.id)} style={delBtn} title="Retirer">
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {adding ? (
        <div style={addForm}>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Nom (ex : Marie, ou un prospect)"
            style={inputStyle}
            autoFocus
          />
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optionnel) — pourquoi le relancer"
            style={inputStyle}
          />
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label style={dateLabel}>Rappelle-moi le</label>
            <input type="datetime-local" value={remindOn} onChange={(e) => setRemindOn(e.target.value)} style={dateInput} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" disabled={saving} onClick={() => void submitAdd()} style={saveBtn}>
              Ajouter
            </button>
            <button type="button" onClick={() => setAdding(false)} style={cancelBtn}>
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} style={addInlineBtn}>
          + Ajouter quelqu'un
        </button>
      )}
    </section>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  background: "var(--ls-surface)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 18,
  padding: "16px 16px 12px",
  fontFamily: "DM Sans, sans-serif",
};
const headerRow: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8 };
const titleStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: "Syne, sans-serif",
  fontSize: 16,
  fontWeight: 800,
  color: "var(--ls-text)",
};
const countPill: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "var(--ls-gold)",
  background: "color-mix(in srgb, var(--ls-gold) 14%, transparent)",
  border: "0.5px solid var(--ls-gold)",
  borderRadius: 999,
  padding: "1px 8px",
};
const subStyle: React.CSSProperties = {
  margin: "4px 0 10px",
  fontSize: 11.5,
  color: "var(--ls-text-muted)",
};
const listStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6 };
const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "9px 10px",
  background: "var(--ls-surface2)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 10,
};
const rowTop: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" };
const nameStyle: React.CSSProperties = { fontSize: 13.5, fontWeight: 700, color: "var(--ls-text)" };
const noteStyle: React.CSSProperties = { fontSize: 12, color: "var(--ls-text-muted)", marginTop: 2 };
const dueBadge: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: "var(--ls-coral)",
  background: "color-mix(in srgb, var(--ls-coral) 14%, transparent)",
  border: "0.5px solid var(--ls-coral)",
  borderRadius: 6,
  padding: "1px 6px",
};
const dateBadge: React.CSSProperties = { ...dueBadge, color: "var(--ls-text-muted)", borderColor: "var(--ls-border)", background: "transparent" };
const writeBtn: React.CSSProperties = {
  fontSize: 11.5,
  fontWeight: 700,
  color: "var(--ls-teal)",
  textDecoration: "none",
  border: "0.5px solid color-mix(in srgb, var(--ls-teal) 40%, var(--ls-border))",
  borderRadius: 8,
  padding: "5px 9px",
  background: "color-mix(in srgb, var(--ls-teal) 10%, transparent)",
};
const doneBtn: React.CSSProperties = {
  width: 30,
  border: "0.5px solid var(--ls-border)",
  borderRadius: 8,
  background: "var(--ls-surface)",
  color: "var(--ls-teal)",
  cursor: "pointer",
  fontWeight: 800,
};
const delBtn: React.CSSProperties = {
  width: 30,
  border: "0.5px solid var(--ls-border)",
  borderRadius: 8,
  background: "var(--ls-surface)",
  color: "var(--ls-text-hint)",
  cursor: "pointer",
};
const addInlineBtn: React.CSSProperties = {
  marginTop: 10,
  padding: "8px 12px",
  background: "transparent",
  border: "0.5px dashed var(--ls-border)",
  borderRadius: 10,
  color: "var(--ls-text-muted)",
  fontSize: 12.5,
  fontWeight: 700,
  cursor: "pointer",
  width: "100%",
  fontFamily: "inherit",
};
const emptyAddStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  background: "var(--ls-surface)",
  border: "0.5px dashed var(--ls-border)",
  borderRadius: 14,
  color: "var(--ls-text-muted)",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "DM Sans, sans-serif",
};
const addForm: React.CSSProperties = {
  marginTop: 10,
  display: "flex",
  flexDirection: "column",
  gap: 8,
  padding: 10,
  background: "var(--ls-surface2)",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 10,
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 11px",
  borderRadius: 10,
  border: "0.5px solid var(--ls-border)",
  background: "var(--ls-surface)",
  color: "var(--ls-text)",
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
};
const dateLabel: React.CSSProperties = { fontSize: 12, color: "var(--ls-text-muted)", fontWeight: 600 };
const dateInput: React.CSSProperties = { ...inputStyle, width: "auto", flex: 1 };
const saveBtn: React.CSSProperties = {
  flex: 1,
  padding: "9px 12px",
  background: "var(--ls-gold)",
  color: "var(--ls-bg)",
  border: "none",
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 800,
  cursor: "pointer",
  fontFamily: "inherit",
};
const cancelBtn: React.CSSProperties = {
  padding: "9px 14px",
  background: "transparent",
  border: "0.5px solid var(--ls-border)",
  borderRadius: 10,
  color: "var(--ls-text-muted)",
  fontSize: 13,
  cursor: "pointer",
  fontFamily: "inherit",
};
