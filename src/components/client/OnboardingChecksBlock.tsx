// Chantier Polish Vue complète + refonte bilan (2026-04-24).
// Hotfix V4 (2026-04-24) : checks cliquables directement (toggle au clic),
// plus de modale ni de bouton "Modifier". Micro-animation scale au clic.
// Persistance jsonb via AppContext.setClientOnboardingChecks.

import { useEffect, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { useToast } from "../../context/ToastContext";

type CheckKey = "telegram" | "photo_before" | "measurements";

type Checks = Record<CheckKey, boolean>;

function normalize(input: Partial<Checks> | undefined | null): Checks {
  return {
    telegram: input?.telegram ?? false,
    photo_before: input?.photo_before ?? false,
    measurements: input?.measurements ?? false,
  };
}

interface ToggleCheckProps {
  done: boolean;
  label: string;
  subDone: string;
  subTodo: string;
  onClick: () => void;
  disabled?: boolean;
}

function ToggleCheck({ done, label, subDone, subTodo, onClick, disabled }: ToggleCheckProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={done}
      aria-label={`${done ? "Décocher" : "Cocher"} ${label}`}
      style={{
        background: "transparent",
        border: 0,
        padding: "4px 6px",
        margin: 0,
        display: "flex",
        alignItems: "center",
        gap: 10,
        cursor: disabled ? "wait" : "pointer",
        transition: "transform 150ms ease, opacity 150ms",
        borderRadius: 10,
        minWidth: 150,
      }}
      onMouseDown={(e) => {
        if (!disabled) e.currentTarget.style.transform = "scale(0.95)";
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 26,
          height: 26,
          borderRadius: "50%",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: done ? "#1D9E75" : "transparent",
          border: done ? "1px solid #1D9E75" : "1.5px dashed var(--ls-border)",
          color: "#FFFFFF",
          transition: "background 150ms, border-color 150ms",
        }}
      >
        {done ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : null}
      </div>
      <div style={{ minWidth: 0, textAlign: "left" }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ls-text)" }}>{label}</div>
        <div
          style={{
            fontSize: 11,
            color: done ? "#1D9E75" : "var(--ls-text-muted)",
            fontWeight: done ? 600 : 400,
          }}
        >
          {done ? subDone : subTodo}
        </div>
      </div>
    </button>
  );
}

interface Props {
  clientId: string;
  checks: Partial<Checks> | undefined | null;
}

export function OnboardingChecksBlock({ clientId, checks }: Props) {
  const { setClientOnboardingChecks } = useAppContext();
  const { push: pushToast } = useToast();
  const [local, setLocal] = useState<Checks>(() => normalize(checks));
  const [saving, setSaving] = useState<CheckKey | null>(null);

  // Re-sync local avec la source de vérité (parent) quand elle change,
  // sauf pendant un save optimiste pour éviter le flash.
  const parentKey = `${checks?.telegram ?? false}|${checks?.photo_before ?? false}|${checks?.measurements ?? false}`;
  useEffect(() => {
    if (saving) return;
    setLocal(normalize(checks));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentKey]);

  async function toggleCheck(key: CheckKey) {
    if (saving) return;
    const previous = local;
    const next: Checks = { ...local, [key]: !local[key] };
    // Optimistic UI
    setLocal(next);
    setSaving(key);
    try {
      await setClientOnboardingChecks(clientId, next);
    } catch (e) {
      // Rollback + toast explicite
      setLocal(previous);
      const msg = e instanceof Error ? e.message : "Erreur inconnue.";
      pushToast({ tone: "error", title: "Sauvegarde impossible", message: msg });
    } finally {
      setSaving(null);
    }
  }

  return (
    <div
      style={{
        background: "var(--ls-surface)",
        border: "1px solid var(--ls-border)",
        borderRadius: 14,
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 14,
      }}
    >
      <ToggleCheck
        done={local.telegram}
        label="Telegram"
        subDone="Installé"
        subTodo="À faire"
        onClick={() => void toggleCheck("telegram")}
        disabled={saving === "telegram"}
      />
      <ToggleCheck
        done={local.photo_before}
        label="Photo avant"
        subDone="Reçue"
        subTodo="À faire"
        onClick={() => void toggleCheck("photo_before")}
        disabled={saving === "photo_before"}
      />
      <ToggleCheck
        done={local.measurements}
        label="Mensurations"
        subDone="Faites"
        subTodo="À faire"
        onClick={() => void toggleCheck("measurements")}
        disabled={saving === "measurements"}
      />
    </div>
  );
}
