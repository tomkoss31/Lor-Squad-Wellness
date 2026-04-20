import { useEffect, useMemo, useState } from "react";
import { Button } from "../ui/Button";
import { StatusBadge } from "../ui/StatusBadge";
import { useAppContext } from "../../context/AppContext";
import {
  formatDateTime,
  normalizeDateTimeLocalInputValue,
  serializeDateTimeForStorage
} from "../../lib/calculations";
import { getClientActiveFollowUp } from "../../lib/portfolio";
import type { Client } from "../../types/domain";

interface EditScheduleModalProps {
  client: Client;
  onClose: () => void;
  onSaved: () => void;
}

const DRAFT_PREFIX = "lor-squad-wellness-edit-client-schedule-draft-v1";

export function EditScheduleModal({ client, onClose, onSaved }: EditScheduleModalProps) {
  const { followUps, updateClientSchedule } = useAppContext();

  const currentFollowUp = useMemo(
    () => getClientActiveFollowUp(client, followUps),
    [followUps, client.id]
  );

  const [nextFollowUp, setNextFollowUp] = useState(
    normalizeDateTimeLocalInputValue(currentFollowUp?.dueDate ?? client.nextFollowUp)
  );
  const [followUpType, setFollowUpType] = useState(currentFollowUp?.type ?? "Suivi terrain");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  // Restore draft
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(`${DRAFT_PREFIX}-${client.id}`);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft.clientId === client.id) {
          setNextFollowUp(draft.nextFollowUp);
          setFollowUpType(draft.followUpType);
        }
      }
    } catch { /* ignore */ }
  }, [client.id]);

  // Persist draft
  useEffect(() => {
    try {
      window.localStorage.setItem(
        `${DRAFT_PREFIX}-${client.id}`,
        JSON.stringify({ clientId: client.id, nextFollowUp, followUpType })
      );
    } catch { /* ignore */ }
  }, [client.id, nextFollowUp, followUpType]);

  async function handleSave() {
    setError("");
    setIsSaving(true);
    try {
      await updateClientSchedule(client.id, {
        nextFollowUp: serializeDateTimeForStorage(nextFollowUp),
        followUpType,
        followUpStatus: currentFollowUp?.status ?? "scheduled"
      });
      window.localStorage.removeItem(`${DRAFT_PREFIX}-${client.id}`);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de modifier ce rendez-vous.");
    } finally {
      setIsSaving(false);
    }
  }

  const followUpTypes = [
    "Suivi terrain", "Bilan complet", "Check-in rapide",
    "Body scan", "Renouvellement programme", "Autre"
  ];

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Fermer la fenêtre"
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
    >
      <div
        className="card-mount"
        style={{
          background: "var(--ls-surface)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 18, padding: 28, width: "100%", maxWidth: 480
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <div style={{ fontFamily: "Syne, sans-serif", fontSize: 17, fontWeight: 700, color: "#F0EDE8" }}>
              Modifier le rendez-vous
            </div>
            <div style={{ fontSize: 13, color: "#7A8099", marginTop: 4 }}>
              {client.firstName} {client.lastName}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <StatusBadge
              label={currentFollowUp?.status === "pending" ? "Relance" : "Planifié"}
              tone={currentFollowUp?.status === "pending" ? "amber" : "green"}
            />
            <button
              onClick={onClose}
              style={{ background: "none", border: "none", color: "#7A8099", cursor: "pointer", fontSize: 20, lineHeight: 1 }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Current value */}
        <div style={{
          background: "var(--ls-surface2)", borderRadius: 12, padding: "12px 16px", marginBottom: 20,
          display: "flex", justifyContent: "space-between", alignItems: "center"
        }}>
          <span style={{ fontSize: 11, color: "#4A5068", textTransform: "uppercase", letterSpacing: "1px" }}>Créneau actuel</span>
          <span style={{ fontSize: 13, color: "#C9A84C", fontWeight: 500 }}>
            {formatDateTime(currentFollowUp?.dueDate ?? client.nextFollowUp)}
          </span>
        </div>

        {/* Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 11, color: "#7A8099", letterSpacing: "1px", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
              Date et heure
            </label>
            <input
              type="datetime-local"
              value={nextFollowUp}
              onChange={(e) => setNextFollowUp(e.target.value)}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, color: "#7A8099", letterSpacing: "1px", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
              Type de suivi
            </label>
            <select value={followUpType} onChange={(e) => setFollowUpType(e.target.value)}>
              {followUpTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {error && (
          <div style={{
            background: "rgba(251,113,133,0.08)", border: "1px solid rgba(251,113,133,0.2)",
            borderRadius: 10, padding: "10px 14px", color: "#FB7185", fontSize: 13, marginTop: 16
          }}>
            {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Annuler
          </Button>
          <Button className="flex-[2]" onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </div>
    </div>
  );
}
